import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
    return NextResponse.json(result);
  } catch (err) {
    console.error("Errore chat supporto:", err);
    return NextResponse.json(
      { reply: "Non sono riuscito a rispondere in questo momento. Riprova tra poco.", action: null },
      { status: 200 }
    );
  }
}
