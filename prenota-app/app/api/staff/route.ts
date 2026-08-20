import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRestaurantId } from "@/lib/restaurant";

export async function GET() {
  const supabase = createClient();

  try {
    const restaurantId = await getRestaurantId(supabase);
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("staff")
      .select("id, full_name, email, role, auth_user_id")
      .eq("restaurant_id", restaurantId)
      .order("full_name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ staff: data });
  } catch (err) {
    console.error("Errore lettura team:", err);
    return NextResponse.json({ error: "Impossibile leggere il team." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
    }

    const restaurantId = await getRestaurantId(supabase);

    const { data: requesterStaff } = await supabase
      .from("staff")
      .select("role")
      .eq("auth_user_id", user.id)
      .eq("restaurant_id", restaurantId)
      .single();

    if (requesterStaff?.role !== "admin") {
      return NextResponse.json(
        { error: "Solo un amministratore può aggiungere collaboratori." },
        { status: 403 }
      );
    }

    const { fullName, email, password, role } = await req.json();

    if (!fullName?.trim() || !email?.trim() || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Compila nome, email e una password di almeno 6 caratteri." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
    });

    if (createError || !newUser?.user) {
      console.error("Errore creazione utente collaboratore:", createError);
      return NextResponse.json(
        { error: createError?.message || "Impossibile creare l'account." },
        { status: 500 }
      );
    }

    const { error: staffError } = await admin.from("staff").insert({
      auth_user_id: newUser.user.id,
      restaurant_id: restaurantId,
      full_name: fullName.trim(),
      email: email.trim().toLowerCase(),
      role: role === "admin" ? "admin" : "staff",
    });

    if (staffError) {
      console.error("Errore creazione riga staff:", staffError);
      await admin.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json({ error: "Impossibile completare la creazione." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Errore creazione collaboratore:", err);
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const staffRowId = req.nextUrl.searchParams.get("id");

  if (!staffRowId) {
    return NextResponse.json({ error: "Parametro 'id' obbligatorio." }, { status: 400 });
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
    }

    const restaurantId = await getRestaurantId(supabase);

    const { data: requesterStaff } = await supabase
      .from("staff")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .eq("restaurant_id", restaurantId)
      .single();

    if (requesterStaff?.role !== "admin") {
      return NextResponse.json(
        { error: "Solo un amministratore può rimuovere collaboratori." },
        { status: 403 }
      );
    }

    if (requesterStaff.id === staffRowId) {
      return NextResponse.json({ error: "Non puoi rimuovere te stesso." }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: targetStaff } = await admin
      .from("staff")
      .select("id, restaurant_id")
      .eq("id", staffRowId)
      .single();

    if (!targetStaff || targetStaff.restaurant_id !== restaurantId) {
      return NextResponse.json({ error: "Collaboratore non trovato." }, { status: 404 });
    }

    const { error } = await admin.from("staff").delete().eq("id", staffRowId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Errore rimozione collaboratore:", err);
    return NextResponse.json({ error: "Impossibile rimuovere il collaboratore." }, { status: 500 });
  }
}
