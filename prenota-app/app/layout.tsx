import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata: Metadata = {
  title: "Prenota — Gestione Prenotazioni",
  description: "App per la gestione delle prenotazioni del ristorante",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>
        <div className="flex min-h-screen">
          {/* Sidebar: visibile solo da tablet/desktop in su */}
          <Sidebar />

          <main className="flex-1 pb-20 md:pb-0">{children}</main>
        </div>

        {/* Bottom nav: visibile solo su mobile */}
        <BottomNav />
      </body>
    </html>
  );
}
