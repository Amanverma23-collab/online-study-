import type { Metadata, Viewport } from "next";
import { Rajdhani, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Officers Saga - Online NDA & CDS Test Platform",
  description: "India's #1 NDA & CDS Test Platform - Officers Saga Online Exams & Detailed Analysis Portal.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Officers Saga",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#C9A84C",
  width: "device-width",
  initialScale: 1,
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${rajdhani.variable} ${inter.variable} ${jetbrainsMono.variable} font-body antialiased bg-[#F5F3EC]`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
