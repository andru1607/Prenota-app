import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { email, password, fullName, restaurantName, website, businessType } =
      await req.json();

    if (website) {
      return NextResponse.json({ success: true });
    }

    if (!email || !password || !restaurantName) {
      return NextResponse.json({ error: "Compila tutti i campi obbligatori." }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "La password deve avere almeno 6 caratteri." },
        { status: 400 }
      );
    }

    const type = businessType === "bar" ? "bar" : "ristorante";

    const supabase = createAdminClient();

    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });

    if (userError || !userData.user) {
      console.error("Errore creazione utente:", userError);
      const message = userError?.message?.toLowerCase().includes("already")
        ? "Esiste già un account con questa email."
        : "Impossibile creare l'account.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .insert({ name: restaurantName, business_type: type })
      .select()
      .single();

    if (restaurantError || !restaurant) {
      console.error("Errore creazione ristorante:", restaurantError);
      await supabase.auth.admin.deleteUser(userData.user.id);
      return NextResponse.json({ error: "Impossibile creare il ristorante." }, { status: 500 });
    }

    const { error: staffError } = await supabase.from("staff").insert({
      auth_user_id: userData.user.id,
      full_name: fullName || "Titolare",
      role: "admin",
      restaurant_id: restaurant.id,
    });

    if (staffError) {
      console.error("Errore collegamento staff:", staffError);
      await supabase.auth.admin.deleteUser(userData.user.id);
      return NextResponse.json({ error: "Impossibile completare la registrazione." }, { status: 500 });
    }

    const origin = req.headers.get("origin") || req.nextUrl.origin;
    const publicClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: resendError } = await publicClient.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${origin}/auth/confirm` },
    });

    if (resendError) {
      console.error("Errore invio email di conferma:", resendError);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Errore registrazione:", err);
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
}
