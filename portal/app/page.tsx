import Link from "next/link";
import { listDigestDates, getDigest, type Digest } from "@/lib/storage";

export const revalidate = 60;

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatShortDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function isToday(iso: string) {
  return iso === new Date().toISOString().slice(0, 10);
}

function allCategories(digest: Digest) {
  const seen = new Set<string>();
  return digest.articles
    .flatMap((a) => a.categories)
    .filter((c) => { if (seen.has(c)) return false; seen.add(c); return true; });
}

export default async function HomePage() {
  const dates = await listDigestDates();
  const digests = await Promise.all(dates.slice(0, 30).map((d) => getDigest(d)));
  const valid = digests.filter(Boolean) as Digest[];

  if (valid.length === 0) {
    return (
      <div className="text-center py-24 text-gray-400">
        <p className="text-2xl font-semibold mb-2">No digests yet</p>
        <p className="text-sm">Digests will appear here after the first run.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-8">
      {/* Date sidebar */}
      <aside className="hidden lg:block w-44 shrink-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Archives
        </p>
        <ul className="space-y-1">
          {valid.map((d) => (
            <li key={d.date}>
              <a
                href={`#${d.date}`}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors py-0.5"
              >
                {isToday(d.date) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                )}
                <span className={isToday(d.date) ? "font-semibold text-indigo-600" : ""}>
                  {formatShortDate(d.date)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main timeline */}
      <div className="flex-1 min-w-0">
        <h1 className="text-3xl font-bold mb-8">Newsletter Digest</h1>
        <div className="space-y-12">
          {valid.map((digest) => {
            const cats = allCategories(digest);
            return (
              <section key={digest.date} id={digest.date}>
                {/* Date header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-gray-900">
                      {formatDate(digest.date)}
                    </span>
                    <span className="text-xs text-gray-400 mt-0.5">
                      {digest.articles.length} source{digest.articles.length !== 1 ? "s" : ""} &middot; published{" "}
                      {new Date(digest.published_at).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {isToday(digest.date) && (
                    <span className="text-xs bg-indigo-600 text-white rounded-full px-2.5 py-0.5 font-medium">
                      Today
                    </span>
                  )}
                </div>

                {/* Category pills */}
                {cats.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
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

                {/* Article cards */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {digest.articles.map((article) => (
                    <Link
                      key={article.sender}
                      href={`/digest/${digest.date}`}
                      className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-400 hover:shadow-sm transition-all"
                    >
                      <p className="text-sm font-semibold text-gray-800 truncate mb-1">
                        {article.sender}
                      </p>
                      <p className="text-xs text-gray-400 mb-2">
                        {article.email_count} email{article.email_count !== 1 ? "s" : ""}
                      </p>
                      {article.key_points.length > 0 && (
                        <ul className="text-xs text-gray-600 space-y-1">
                          {article.key_points.slice(0, 2).map((pt, i) => (
                            <li key={i} className="flex gap-1.5 line-clamp-2">
                              <span className="text-indigo-400 shrink-0">&#x2022;</span>
                              <span>{pt}</span>
                            </li>
                          ))}
                          {article.key_points.length > 2 && (
                            <li className="text-indigo-500 font-medium">
                              +{article.key_points.length - 2} more
                            </li>
                          )}
                        </ul>
                      )}
                    </Link>
                  ))}
                </div>

                <div className="mt-3">
                  <Link
                    href={`/digest/${digest.date}`}
                    className="text-sm text-indigo-600 hover:underline font-medium"
                  >
                    View full digest &rarr;
                  </Link>
                </div>

                <div className="mt-10 border-t border-gray-100" />
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
