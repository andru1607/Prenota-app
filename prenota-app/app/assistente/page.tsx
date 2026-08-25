"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageCircleQuestion, AlertCircle, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";

interface ChatLog {
  id: string;
  question: string;
  reply: string;
  answered: boolean;
  action_url: string | null;
  created_at: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupByFrequency(logs: ChatLog[]): { question: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const log of logs) {
    const key = log.question.trim().toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([question, count]) => ({ question, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export default function AssistentePage() {
  const router = useRouter();
  const [logs, setLogs] = useState<ChatLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unanswered">("all");

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/support-chat");
        if (!res.ok) throw new Error("Errore nel caricamento");
        const { logs: data } = await res.json();
        setLogs(data ?? []);
      } catch (err) {
        console.error(err);
        setError("Non sono riuscito a caricare le domande.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const unansweredCount = logs.filter((l) => !l.answered).length;
  const frequent = useMemo(() => groupByFrequency(logs), [logs]);
  const visibleLogs = filter === "unanswered" ? logs.filter((l) => !l.answered) : logs;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => router.push("/impostazioni")}
          className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-bg-subtle"
          aria-label="Indietro"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-ink">Assistente</h1>
          <p className="text-xs text-ink-muted">Cosa chiede lo staff, per migliorare le risposte</p>
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-status-dangerBg p-3 text-sm text-status-danger">{error}</p>
      )}

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={MessageCircleQuestion}
          title="Nessuna domanda ancora"
          description="Quando lo staff usa l'assistente in basso a destra, le domande compariranno qui."
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-black/5 bg-white p-3 text-center">
              <p className="num-tabular text-2xl font-bold text-ink">{logs.length}</p>
              <p className="text-xs text-ink-muted">Domande totali</p>
            </div>
            <div className="rounded-xl border border-black/5 bg-white p-3 text-center">
              <p className="num-tabular text-2xl font-bold text-status-danger">{unansweredCount}</p>
              <p className="text-xs text-ink-muted">Senza risposta certa</p>
            </div>
          </div>

          {frequent.length > 0 && (
            <div className="mb-4 rounded-xl border border-black/5 bg-white p-4">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink">
                <TrendingUp size={15} />
                Le più ripetute
              </p>
              <div className="space-y-1.5">
                {frequent.map((f) => (
                  <div key={f.question} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-ink-muted">{f.question}</span>
                    <span className="shrink-0 rounded-full bg-bg-subtle px-2 py-0.5 text-xs font-medium text-ink">
                      ×{f.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-3 flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                filter === "all" ? "bg-primary text-white" : "border border-black/10 text-ink-muted"
              }`}
            >
              Tutte
            </button>
            <button
              onClick={() => setFilter("unanswered")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                filter === "unanswered"
                  ? "bg-status-danger text-white"
                  : "border border-black/10 text-ink-muted"
              }`}
            >
              Senza risposta certa
            </button>
          </div>

          {visibleLogs.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">
              Nessuna domanda in questa categoria.
            </p>
          ) : (
            <div className="space-y-2">
              {visibleLogs.map((log) => (
                <div key={log.id} className="rounded-xl border border-black/5 bg-white p-3">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-ink">{log.question}</p>
                    {!log.answered && (
                      <span className="shrink-0" title="Il bot non ha risposto con certezza">
                        <AlertCircle size={15} className="text-status-danger" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted">{log.reply}</p>
                  <p className="mt-1.5 text-[11px] text-ink-muted">{formatDate(log.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
