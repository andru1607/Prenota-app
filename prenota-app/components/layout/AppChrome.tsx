"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { SupportChatWidget } from "@/components/ui/SupportChatWidget";

const PUBLIC_PREFIXES = ["/richiesta", "/prenotazione", "/login", "/signup", "/auth/confirm"];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-x-hidden pb-20 md:pb-0">
        {children}
        <BottomNav />
        <SupportChatWidget />
      </main>
    </div>
  );
}
