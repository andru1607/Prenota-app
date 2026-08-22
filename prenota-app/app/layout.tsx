import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { ThemeLoader } from "@/components/ThemeLoader";
import { ToastProvider } from "@/components/ui/ToastProvider";

export const metadata: Metadata = {
  title: "Prenota — Gestione Prenotazioni",
  description: "App per la gestione delle prenotazioni del ristorante",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Prenota",
  },
};

export const viewport: Viewport = {
  themeColor: "#4F46E5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>
        <ThemeLoader />
        <ToastProvider>
          <div className="flex min-h-screen">
            <Sidebar />

            <main className="flex-1 pb-20 md:pb-0">{children}</main>
          </div>

          <BottomNav />
        </ToastProvider>
      </body>
    </html>
  );
}
