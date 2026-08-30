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
          className="fixed bottom-20 right-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-b from-[#C17F45] to-[#A6683A] text-[#1A1310] shadow-[0_0_18px_rgba(227,168,87,0.35)] md:bottom-6 md:right-6"
          aria-label="Apri assistente"
        >
          <MessageCircleQuestion size={22} />
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center">
          <div className="flex h-[85vh] w-full max-w-md flex-col rounded-t-2xl border border-[#3A2C22] bg-[#251C17] md:h-[70vh] md:rounded-2xl">
            <div className="flex items-center justify-between border-b border-[#3A2C22] p-4">
              <div>
                <p className="text-sm font-semibold text-[#F0E9E0]">Assistente Prenota</p>
                <p className="text-xs text-[#A69686]">Chiedimi come si fa qualcosa nell'app</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="touch-target grid place-items-center rounded-lg text-[#A69686]"
                aria-label="Chiudi"
              >
                <X size={20} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="space-y-2">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#A69686]">
                    Domande frequenti
                  </p>
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="touch-target block w-full rounded-xl border border-[#3A2C22] bg-[#1A1310] px-3 py-2.5 text-left text-sm text-[#F0E9E0]"
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
                        ? "bg-gradient-to-b from-[#C17F45] to-[#A6683A] text-[#1A1310]"
                        : "bg-[#1A1310] text-[#F0E9E0]"
                    }`}
                  >
                    <p>{m.content}</p>
                    {m.action && (
                      <button
                        onClick={() => handleActionTap(m.action!.url)}
                        className="mt-2 flex items-center gap-1 rounded-lg border border-[#3A2C22] bg-[#251C17] px-2.5 py-1.5 text-xs font-medium text-[#C17F45]"
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
                  <div className="rounded-2xl bg-[#1A1310] px-3.5 py-2.5">
                    <Loader2 size={16} className="animate-spin text-[#A69686]" />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[#3A2C22] p-3">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage(input);
                  }}
                  placeholder="Scrivi una domanda..."
                  className="flex-1 rounded-xl border border-[#3A2C22] bg-[#1A1310] px-3 py-2.5 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isSending}
                  className="touch-target grid place-items-center rounded-xl bg-gradient-to-b from-[#C17F45] to-[#A6683A] text-[#1A1310] disabled:opacity-40"
                  aria-label="Invia"
                >
                  <Send size={18} />
                </button>
              </div>
              <a
                href="mailto:alexandrut04@gmail.com?subject=Aiuto%20con%20Prenota"
                className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-[#A69686]"
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
