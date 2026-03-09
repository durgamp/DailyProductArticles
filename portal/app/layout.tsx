import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Daily Digest",
  description: "Daily AI-powered summaries of your newsletter subscriptions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="bg-[#f9f7f4] text-gray-900 min-h-screen font-sans">

        {/* Top utility bar */}
        <div className="bg-gray-900 text-gray-400 text-xs py-1.5 px-6">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <span>{today}</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Powered by Claude AI
            </span>
          </div>
        </div>

        {/* Masthead */}
        <header className="bg-white border-b border-gray-900">
          <div className="max-w-6xl mx-auto px-6 py-5 text-center">
            <a href="/" className="inline-block group">
              <h1 className="font-playfair text-5xl font-bold tracking-tight text-gray-900 group-hover:text-gray-700 transition-colors">
                The Daily Digest
              </h1>
              <p className="text-xs text-gray-400 tracking-widest uppercase mt-1">
                AI-curated newsletter intelligence
              </p>
            </a>
          </div>
          <div className="border-t-2 border-gray-900" />
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>

        <footer className="border-t border-gray-200 mt-16 py-8 text-center text-xs text-gray-400">
          <p>The Daily Digest &mdash; Summarized by Claude AI &middot; Delivered daily</p>
        </footer>

      </body>
    </html>
  );
}
