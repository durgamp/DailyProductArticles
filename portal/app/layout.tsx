import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Newsletter Digest",
  description: "Daily summaries of your newsletter subscriptions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <a href="/" className="text-xl font-bold text-indigo-600 hover:text-indigo-700">
              Newsletter Digest
            </a>
            <span className="text-sm text-gray-500">Powered by Claude</span>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
