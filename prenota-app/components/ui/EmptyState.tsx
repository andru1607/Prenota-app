import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-full border border-[#3A2C22] bg-[#251C17] text-[#A69686]">
        <Icon size={22} />
      </div>
      <p className="text-sm font-medium text-[#F0E9E0]">{title}</p>
      {description && (
        <p className="mt-1 max-w-[240px] text-xs text-[#A69686]">{description}</p>
      )}
    </div>
  );
}
