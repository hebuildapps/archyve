import type { Metadata } from "next";
import { Lexend, Lora, Geist_Mono, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://archyve.xyz"),
  title: "Archyve: AI Research Dossier",
  description: "AI-powered research intelligence layer for everyone.",
  openGraph: {
    title: "Archyve: AI Research Dossier",
    description: "AI-powered research intelligence layer for everyone.",
    url: "https://archyve.xyz",
    siteName: "Archyve",
    images: [
      {
        url: "/archyve-og-image2.png",
        width: 1200,
        height: 630,
        alt: "Archyve - AI Research Dossier",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Archyve: AI Research Dossier",
    description: "AI-powered research intelligence layer for everyone.",
    images: ["/archyve-og-image2.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${lexend.variable} ${lora.variable} ${geistMono.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans transition-colors duration-200">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
