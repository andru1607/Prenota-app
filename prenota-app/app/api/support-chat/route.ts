import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantId } from "@/lib/restaurant";
import { requireAdmin } from "@/lib/auth";
import { askSupportChat, type SupportChatMessage } from "@/lib/supportChat";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  try {
    const { message, history } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Messaggio obbligatorio." }, { status: 400 });
    }

    const result = await askSupportChat(message, (history ?? []) as SupportChatMessage[]);

    try {
      const restaurantId = await getRestaurantId(supabase);
      await supabase.from("support_chat_logs").insert({
        restaurant_id: restaurantId,
        question: message,
        reply: result.reply,
        answered: result.answered,
        action_url: result.action?.url ?? null,
      });
    } catch (logErr) {
      console.error("Errore registrazione domanda assistente:", logErr);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Errore chat supporto:", err);
    return NextResponse.json(
      { reply: "Non sono riuscito a rispondere in questo momento. Riprova tra poco.", action: null, answered: false },
      { status: 200 }
    );
  }
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  if (!(await requireAdmin(supabase))) {
    return NextResponse.json({ error: "Solo un amministratore può vedere questa pagina." }, { status: 403 });
  }

  try {
    const restaurantId = await getRestaurantId(supabase);
    const { data, error } = await supabase
      .from("support_chat_logs")
      .select("id, question, reply, answered, action_url, created_at")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    return NextResponse.json({ logs: data ?? [] });
  } catch (err) {
    console.error("Errore lettura domande assistente:", err);
    return NextResponse.json({ error: "Impossibile leggere le domande." }, { status: 500 });
  }
}
