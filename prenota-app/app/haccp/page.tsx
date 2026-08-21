"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  X,
  Check,
  Thermometer,
  SprayCan,
  AlertTriangle,
} from "lucide-react";
import { getMyRole } from "@/lib/roles";

interface HaccpPoint {
  id: string;
  name: string;
  target_min: number | null;
  target_max: number | null;
}

interface HaccpReading {
  id: string;
  point_id: string;
  value: number;
  recorded_at: string;
}

interface CleaningTask {
  id: string;
  name: string;
  frequency: "daily" | "weekly";
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "adesso";
  if (minutes < 60) return `${minutes} min fa`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "ora" : "ore"} fa`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "giorno" : "giorni"} fa`;
}

export default function HaccpPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [points, setPoints] = useState<HaccpPoint[]>([]);
  const [latestReadings, setLatestReadings] = useState<Map<string, HaccpReading>>(new Map());
  const [showPointForm, setShowPointForm] = useState(false);
  const [pointName, setPointName] = useState("");
  const [pointMin, setPointMin] = useState("");
  const [pointMax, setPointMax] = useState("");
  const [recordingPointId, setRecordingPointId] = useState<string | null>(null);
  const [recordingValue, setRecordingValue] = useState("");

  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [lastCleaningLogs, setLastCleaningLogs] = useState<Map<string, string>>(new Map());
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [taskFrequency, setTaskFrequency] = useState<"daily" | "weekly">("daily");

  const load = useCallback(async () => {
    setError(null);
    try {
      const [pointsRes, readingsRes, tasksRes, logsRes] = await Promise.all([
        fetch("/api/haccp/points"),
        fetch("/api/haccp/readings?latest=true"),
        fetch("/api/haccp/tasks"),
        fetch("/api/haccp/cleaning-logs"),
      ]);

      if (pointsRes.ok) {
        const { points: p } = await pointsRes.json();
        setPoints(p ?? []);
      }
      if (readingsRes.ok) {
        const { readings } = await readingsRes.json();
        const map = new Map<string, HaccpReading>();
        for (const r of readings ?? []) {
          if (!map.has(r.point_id)) map.set(r.point_id, r);
        }
        setLatestReadings(map);
      }
      if (tasksRes.ok) {
        const { tasks: t } = await tasksRes.json();
        setTasks(t ?? []);
      }
      if (logsRes.ok) {
        const { logs } = await logsRes.json();
        const map = new Map<string, string>();
        for (const l of logs ?? []) {
          if (!map.has(l.task_id)) map.set(l.task_id, l.done_at);
        }
        setLastCleaningLogs(map);
      }
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a caricare i dati.");
    }
  }, []);

  useEffect(() => {
    load();
    getMyRole().then((role) => setIsAdmin(role === "admin"));
  }, [load]);

  async function handleAddPoint() {
    if (!pointName.trim()) return;
    try {
      const res = await fetch("/api/haccp/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: pointName.trim(), targetMin: pointMin, targetMax: pointMax }),
      });
      if (!res.ok) throw new Error("Errore creazione");
      setPointName("");
      setPointMin("");
      setPointMax("");
      setShowPointForm(false);
      load();
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a creare il punto di controllo.");
    }
  }

  async function handleDeletePoint(id: string) {
    if (!confirm("Eliminare questo punto di controllo?")) return;
    try {
      await fetch(`/api/haccp/points?id=${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleRecordReading(pointId: string) {
    if (!recordingValue) return;
    try {
      const res = await fetch("/api/haccp/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pointId, value: recordingValue }),
      });
      if (!res.ok) throw new Error("Errore registrazione");
      setRecordingPointId(null);
      setRecordingValue("");
      load();
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a registrare la lettura.");
    }
  }

  async function handleAddTask() {
    if (!taskName.trim()) return;
    try {
      const res = await fetch("/api/haccp/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: taskName.trim(), frequency: taskFrequency }),
      });
      if (!res.ok) throw new Error("Errore creazione");
      setTaskName("");
      setTaskFrequency("daily");
      setShowTaskForm(false);
      load();
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a creare l'attività.");
    }
  }

  async function handleDeleteTask(id: string) {
    if (!confirm("Eliminare questa attività?")) return;
    try {
      await fetch(`/api/haccp/tasks?id=${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleMarkDone(taskId: string) {
    try {
      await fetch("/api/haccp/cleaning-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      load();
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a registrare.");
    }
  }

  function isOutOfRange(point: HaccpPoint, value: number): boolean {
    if (point.target_min !== null && value < point.target_min) return true;
    if (point.target_max !== null && value > point.target_max) return true;
    return false;
  }

  function isTaskOverdue(task: CleaningTask): boolean {
    const lastDone = lastCleaningLogs.get(task.id);
    if (!lastDone) return true;
    const diffHours = (Date.now() - new Date(lastDone).getTime()) / 36e5;
    return task.frequency === "daily" ? diffHours > 24 : diffHours > 24 * 7;
  }

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
        <h1 className="text-lg font-semibold text-ink">Registro HACCP</h1>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-status-dangerBg p-3 text-sm text-status-danger">{error}</p>
      )}

      <div className="mb-4 rounded-xl border border-black/5 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
            <Thermometer size={16} />
            Temperature
          </p>
          {isAdmin && (
            <button
              onClick={() => setShowPointForm((v) => !v)}
              className="touch-target flex items-center gap-1 text-xs font-medium text-primary"
            >
              <Plus size={14} />
              Aggiungi
            </button>
          )}
        </div>

        {showPointForm && (
          <div className="mb-3 rounded-lg bg-bg-subtle p-3">
            <div className="space-y-2">
              <input
                value={pointName}
                onChange={(e) => setPointName(e.target.value)}
                placeholder="Es. Frigo cucina"
                autoFocus
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={pointMin}
                  onChange={(e) => setPointMin(e.target.value)}
                  placeholder="Min °C"
                  type="number"
                  className="num-tabular rounded-lg border border-black/10 px-3 py-2 text-sm"
                />
                <input
                  value={pointMax}
                  onChange={(e) => setPointMax(e.target.value)}
                  placeholder="Max °C"
                  type="number"
                  className="num-tabular rounded-lg border border-black/10 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              onClick={handleAddPoint}
              className="touch-target mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2 text-sm font-medium text-white"
            >
              <Check size={16} />
              Salva
            </button>
          </div>
        )}

        {points.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-muted">
            Nessun punto di controllo ancora.
          </p>
        ) : (
          <div className="space-y-1.5">
            {points.map((point) => {
              const reading = latestReadings.get(point.id);
              const outOfRange = reading ? isOutOfRange(point, reading.value) : false;
              return (
                <div key={point.id} className="rounded-lg bg-bg-subtle p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{point.name}</p>
                      {reading ? (
                        <p
                          className={`num-tabular flex items-center gap-1 text-xs ${
                            outOfRange ? "font-medium text-status-danger" : "text-ink-muted"
                          }`}
                        >
                          {outOfRange && <AlertTriangle size={11} />}
                          {reading.value}°C · {timeAgo(reading.recorded_at)}
                        </p>
                      ) : (
                        <p className="text-xs text-ink-muted">Nessuna lettura ancora</p>
                      )}
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeletePoint(point.id)}
                        className="touch-target grid shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-status-dangerBg hover:text-status-danger"
                        aria-label="Elimina"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  {recordingPointId === point.id ? (
                    <div className="mt-2 flex gap-2">
                      <input
                        value={recordingValue}
                        onChange={(e) => setRecordingValue(e.target.value)}
                        placeholder="°C"
                        type="number"
                        step="0.1"
                        autoFocus
                        className="num-tabular flex-1 rounded-lg border border-black/10 px-2 py-1.5 text-sm"
                      />
                      <button
                        onClick={() => handleRecordReading(point.id)}
                        className="touch-target rounded-lg bg-primary px-3 text-white"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => setRecordingPointId(null)}
                        className="touch-target rounded-lg border border-black/10 px-3 text-ink-muted"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setRecordingPointId(point.id);
                        setRecordingValue("");
                      }}
                      className="touch-target mt-2 w-full rounded-lg border border-black/10 py-1.5 text-xs font-medium text-primary"
                    >
                      Registra lettura
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-black/5 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
            <SprayCan size={16} />
            Pulizie
          </p>
          {isAdmin && (
            <button
              onClick={() => setShowTaskForm((v) => !v)}
              className="touch-target flex items-center gap-1 text-xs font-medium text-primary"
            >
              <Plus size={14} />
              Aggiungi
            </button>
          )}
        </div>

        {showTaskForm && (
          <div className="mb-3 rounded-lg bg-bg-subtle p-3">
            <input
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="Es. Sanificazione banco"
              autoFocus
              className="mb-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setTaskFrequency("daily")}
                className={`touch-target flex-1 rounded-lg text-xs font-medium ${
                  taskFrequency === "daily"
                    ? "bg-primary text-white"
                    : "border border-black/10 text-ink-muted"
                }`}
              >
                Giornaliera
              </button>
              <button
                onClick={() => setTaskFrequency("weekly")}
                className={`touch-target flex-1 rounded-lg text-xs font-medium ${
                  taskFrequency === "weekly"
                    ? "bg-primary text-white"
                    : "border border-black/10 text-ink-muted"
                }`}
              >
                Settimanale
              </button>
            </div>
            <button
              onClick={handleAddTask}
              className="touch-target mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2 text-sm font-medium text-white"
            >
              <Check size={16} />
              Salva
            </button>
          </div>
        )}

        {tasks.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-muted">Nessuna attività ancora.</p>
        ) : (
          <div className="space-y-1.5">
            {tasks.map((task) => {
              const lastDone = lastCleaningLogs.get(task.id);
              const overdue = isTaskOverdue(task);
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-bg-subtle p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-ink">{task.name}</p>
                      <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-ink-muted">
                        {task.frequency === "daily" ? "Giornaliera" : "Settimanale"}
                      </span>
                    </div>
                    <p
                      className={`text-xs ${
                        overdue ? "font-medium text-status-danger" : "text-ink-muted"
                      }`}
                    >
                      {lastDone ? `Ultima volta: ${timeAgo(lastDone)}` : "Mai fatta"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => handleMarkDone(task.id)}
                      className="touch-target rounded-lg bg-status-free px-3 py-1.5 text-xs font-medium text-white"
                    >
                      Fatto
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-status-dangerBg hover:text-status-danger"
                        aria-label="Elimina"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
