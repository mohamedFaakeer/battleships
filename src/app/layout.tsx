import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Battleships",
    template: "%s | Battleships",
  },
  description: "A strategic naval combat game — sink your opponent's fleet before they sink yours.",
  keywords: ["battleships", "strategy", "naval", "game"],
  authors: [{ name: "Battleships Team" }],
  // PWA-ready meta
  applicationName: "Battleships",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Battleships",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,      // prevent accidental zoom on game grid
  themeColor: "#0c4a6e",
};

import { BackgroundMusic } from "@/components/game/BackgroundMusic";
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans`}
      >
        <BackgroundMusic />
        {children}
      </body>
    </html>
  );
}
