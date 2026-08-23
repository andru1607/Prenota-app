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

  const { data, error } = await supabase
    .from("staff")
    .select("role, restaurants(id, name, logo_url)")
    .eq("auth_user_id", user.id);

  if (error) {
    console.error("Errore lettura ristoranti:", error);
    return NextResponse.json({ error: "Impossibile leggere i ristoranti." }, { status: 500 });
  }

  const restaurants = (data ?? [])
    .filter((row: any) => row.restaurants)
    .map((row: any) => ({
      id: row.restaurants.id,
      name: row.restaurants.name,
      logoUrl: row.restaurants.logo_url,
      role: row.role,
    }));

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
    const { name } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Il nome del ristorante è obbligatorio." }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: restaurant, error: restaurantError } = await admin
      .from("restaurants")
      .insert({ name: name.trim() })
      .select()
      .single();

    if (restaurantError || !restaurant) {
      console.error("Errore creazione ristorante:", restaurantError);
      return NextResponse.json({ error: "Impossibile creare il ristorante." }, { status: 500 });
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
