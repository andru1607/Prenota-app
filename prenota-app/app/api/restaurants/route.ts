import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const { data: staffRows, error: staffError } = await supabase
    .from("staff")
    .select("role, restaurant_id")
    .eq("auth_user_id", user.id);

  if (staffError) {
    console.error("Errore lettura staff:", staffError);
    return NextResponse.json({ error: "Impossibile leggere i ristoranti." }, { status: 500 });
  }

  if (!staffRows || staffRows.length === 0) {
    return NextResponse.json({ restaurants: [] });
  }

  const restaurantIds = staffRows.map((r) => r.restaurant_id);
  const { data: restaurantRows, error: restaurantsError } = await supabase
    .from("restaurants")
    .select("id, name, logo_url, business_type")
    .in("id", restaurantIds);

  if (restaurantsError) {
    console.error("Errore lettura ristoranti:", restaurantsError);
    return NextResponse.json({ error: "Impossibile leggere i ristoranti." }, { status: 500 });
  }

  const restaurants = staffRows
    .map((staffRow) => {
      const restaurant = (restaurantRows ?? []).find((r) => r.id === staffRow.restaurant_id);
      if (!restaurant) return null;
      return {
        id: restaurant.id,
        name: restaurant.name,
        logoUrl: restaurant.logo_url,
        role: staffRow.role,
        businessType: restaurant.business_type ?? "ristorante",
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return NextResponse.json({ restaurants });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  try {
    const { name, businessType } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Il nome del locale è obbligatorio." }, { status: 400 });
    }

    const type = businessType === "bar" ? "bar" : "ristorante";

    const admin = createAdminClient();

    const { data: restaurant, error: restaurantError } = await admin
      .from("restaurants")
      .insert({ name: name.trim(), business_type: type })
      .select()
      .single();

    if (restaurantError || !restaurant) {
      console.error("Errore creazione ristorante:", restaurantError);
      return NextResponse.json({ error: "Impossibile creare il locale." }, { status: 500 });
    }

    const { data: existingStaff } = await admin
      .from("staff")
      .select("full_name")
      .eq("auth_user_id", user.id)
      .limit(1)
      .maybeSingle();

    const { error: staffError } = await admin.from("staff").insert({
      auth_user_id: user.id,
      full_name: existingStaff?.full_name ?? "Titolare",
      role: "admin",
      restaurant_id: restaurant.id,
      email: user.email,
    });

    if (staffError) {
      console.error("Errore collegamento staff:", staffError);
      await admin.from("restaurants").delete().eq("id", restaurant.id);
      return NextResponse.json({ error: "Impossibile completare la creazione." }, { status: 500 });
    }

    return NextResponse.json({ restaurant });
  } catch (err) {
    console.error("Errore creazione ristorante:", err);
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
}
