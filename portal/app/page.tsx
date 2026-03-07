import Link from "next/link";
import { listDigestDates, getDigest } from "@/lib/storage";

export const revalidate = 60; // revalidate every 60 seconds

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function allCategories(articles: { categories: string[] }[]) {
  const seen = new Set<string>();
  return articles.flatMap((a) => a.categories).filter((c) => {
    if (seen.has(c)) return false;
    seen.add(c);
    return true;
  });
}

export default async function HomePage() {
  const dates = await listDigestDates();
  const digests = await Promise.all(dates.slice(0, 20).map((d) => getDigest(d)));
  const valid = digests.filter(Boolean);

  if (valid.length === 0) {
    return (
      <div className="text-center py-24 text-gray-400">
        <p className="text-2xl font-semibold mb-2">No digests yet</p>
        <p className="text-sm">Digests will appear here after the first run.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">All Digests</h1>
      <div className="space-y-4">
        {valid.map((digest) => {
          const cats = allCategories(digest!.articles);
          return (
            <Link key={digest!.date} href={`/digest/${digest!.date}`}>
              <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-gray-800">{formatDate(digest!.date)}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {digest!.articles.length} source{digest!.articles.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(digest!.published_at).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {cats.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {cats.map((c) => (
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
            </Link>
          );
        })}
      </div>
    </div>
  );
}
