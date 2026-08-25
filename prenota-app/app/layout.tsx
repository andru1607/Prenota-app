import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { AppChrome } from "@/components/layout/AppChrome";
import { ThemeLoader } from "@/components/ThemeLoader";
import { ToastProvider } from "@/components/ui/ToastProvider";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

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
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className={manrope.variable}>
      <body>
        <ThemeLoader />
        <ToastProvider>
          <AppChrome>{children}</AppChrome>
        </ToastProvider>
      </body>
    </html>
  );
}
