import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getDigest } from "@/lib/storage";

export const revalidate = 60;

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function DigestPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const digest = await getDigest(date);
  if (!digest) notFound();

  return (
    <div>
      <div className="mb-6">
        <Link href="/" className="text-sm text-indigo-600 hover:underline">
          &larr; All digests
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-1">{formatDate(digest.date)}</h1>
      <p className="text-sm text-gray-400 mb-8">
        Published {new Date(digest.published_at).toLocaleString("en-US")}
      </p>

      {digest.articles.length === 0 ? (
        <p className="text-gray-500">No articles in this digest.</p>
      ) : (
        <div className="space-y-10">
          {digest.articles.map((article) => (
            <div
              key={article.sender}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 break-all">
                    {article.sender}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {article.email_count} email{article.email_count !== 1 ? "s" : ""} processed
                  </p>
                </div>
                {article.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {article.categories.map((c) => (
                      <span
                        key={c}
                        className="text-xs bg-indigo-50 text-indigo-700 rounded-full px-2.5 py-0.5 font-medium"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="prose prose-sm max-w-none text-gray-700">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {article.summary_markdown}
                </ReactMarkdown>
              </div>

              {article.action_items.length > 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5">
                    Action Items
                  </p>
                  <ul className="text-sm text-amber-900 space-y-1">
                    {article.action_items.map((a, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="shrink-0">&#x2022;</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {article.dates_deadlines.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                    Dates &amp; Deadlines
                  </p>
                  <ul className="text-sm text-blue-900 space-y-1">
                    {article.dates_deadlines.map((d, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="shrink-0">&#x2022;</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
