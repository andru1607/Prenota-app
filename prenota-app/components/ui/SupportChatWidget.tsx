"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageCircleQuestion, X, Send, Loader2, ArrowRight, Mail } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  action?: { label: string; url: string } | null;
}

const SUGGESTED_QUESTIONS = [
  "Come aggiungo una prenotazione a mano?",
  "Come apro una comanda per un tavolo?",
  "Dove stampo il QR per i clienti?",
  "Come segno un cliente come non presentato?",
  "Come cambio i giorni di chiusura?",
];

export function SupportChatWidget() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  async function sendMessage(text: string) {
    const question = text.trim();
    if (!question || isSending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const body = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: body.reply, action: body.action ?? null },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Non sono riuscito a rispondere. Riprova tra poco.", action: null },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function handleActionTap(url: string) {
    setIsOpen(false);
    router.push(url);
  }

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-primary text-white shadow-lg md:bottom-6 md:right-6"
          aria-label="Apri assistente"
        >
          <MessageCircleQuestion size={22} />
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 md:items-center">
          <div className="flex h-[85vh] w-full max-w-md flex-col rounded-t-2xl bg-white md:h-[70vh] md:rounded-2xl">
            <div className="flex items-center justify-between border-b border-black/5 p-4">
              <div>
                <p className="text-sm font-semibold text-ink">Assistente Prenota</p>
                <p className="text-xs text-ink-muted">Chiedimi come si fa qualcosa nell'app</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="touch-target grid place-items-center rounded-lg text-ink-muted"
                aria-label="Chiudi"
              >
                <X size={20} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="space-y-2">
                  <p className="mb-2 text-xs font-medium uppercase text-ink-muted">
                    Domande frequenti
                  </p>
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="touch-target block w-full rounded-xl border border-black/10 px-3 py-2.5 text-left text-sm text-ink"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-white"
                        : "bg-bg-subtle text-ink"
                    }`}
                  >
                    <p>{m.content}</p>
                    {m.action && (
                      <button
                        onClick={() => handleActionTap(m.action!.url)}
                        className="mt-2 flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-primary"
                      >
                        {m.action.label}
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-bg-subtle px-3.5 py-2.5">
                    <Loader2 size={16} className="animate-spin text-ink-muted" />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-black/5 p-3">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage(input);
                  }}
                  placeholder="Scrivi una domanda..."
                  className="flex-1 rounded-xl border border-black/10 px-3 py-2.5 text-sm"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isSending}
                  className="touch-target grid place-items-center rounded-xl bg-primary text-white disabled:opacity-40"
                  aria-label="Invia"
                >
                  <Send size={18} />
                </button>
              </div>
              <a
                href="mailto:alexandrut04@gmail.com?subject=Aiuto%20con%20Prenota"
                className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-ink-muted"
              >
                <Mail size={13} />
                Scrivi al supporto
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
