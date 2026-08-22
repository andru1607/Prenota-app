import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-bg-subtle text-ink-muted">
        <Icon size={22} />
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && (
        <p className="mt-1 max-w-[240px] text-xs text-ink-muted">{description}</p>
      )}
    </div>
  );
}
