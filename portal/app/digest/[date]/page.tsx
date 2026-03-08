import { notFound } from "next/navigation";
import Link from "next/link";
import { getDigest, type Article } from "@/lib/storage";

export const revalidate = 60;

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function CategoryPills({ categories }: { categories: string[] }) {
  if (!categories.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {categories.map((c) => (
        <span key={c} className="text-xs bg-indigo-50 text-indigo-700 rounded-full px-2.5 py-0.5 font-semibold uppercase tracking-wide">
          {c}
        </span>
      ))}
    </div>
  );
}

function SourceLabel({ sender, subject }: { sender: string; subject?: string }) {
  return (
    <p className="text-xs text-gray-400 font-medium mb-1 truncate">
      {sender}{subject ? ` · ${subject}` : ""}
    </p>
  );
}

function HeroArticle({ article }: { article: Article }) {
  return (
    <div className="grid md:grid-cols-5 gap-6 py-6 border-b border-gray-200">
      {/* Left: headline + summary */}
      <div className="md:col-span-3">
        <SourceLabel sender={article.sender} subject={article.subject} />
        <CategoryPills categories={article.categories} />
        <h2 className="text-3xl font-bold leading-tight mb-3 text-gray-900">
          {article.title || article.sender}
        </h2>
        <p className="text-gray-700 leading-relaxed text-base">
          {article.summary || article.key_points.join(" ")}
        </p>
        {article.action_items.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5">Action Items</p>
            <ul className="space-y-1">
              {article.action_items.map((a, i) => (
                <li key={i} className="text-sm text-amber-900 flex gap-2">
                  <span className="shrink-0">&bull;</span><span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {article.dates_deadlines.length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">Dates &amp; Deadlines</p>
            <ul className="space-y-1">
              {article.dates_deadlines.map((d, i) => (
                <li key={i} className="text-sm text-blue-900 flex gap-2">
                  <span className="shrink-0">&bull;</span><span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {/* Right: key points panel */}
      <div className="md:col-span-2 bg-gray-50 rounded-xl p-5 border border-gray-100 self-start">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Key Points</p>
        <ul className="space-y-2.5">
          {article.key_points.map((pt, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-700 leading-snug">
              <span className="text-indigo-500 shrink-0 font-bold mt-0.5">&bull;</span>
              <span>{pt}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ArticleCard({ article }: { article: Article }) {
  const snippet = article.summary
    ? article.summary.slice(0, 160) + (article.summary.length > 160 ? "…" : "")
    : article.key_points.slice(0, 2).join(" ");

  return (
    <div className="border-t border-gray-200 pt-4">
      <SourceLabel sender={article.sender} subject={article.subject} />
      <CategoryPills categories={article.categories} />
      <h3 className="text-base font-bold leading-snug text-gray-900 mb-2">
        {article.title || article.sender}
      </h3>
      <p className="text-sm text-gray-600 leading-relaxed mb-3">{snippet}</p>
      {article.key_points.length > 0 && (
        <ul className="space-y-1">
          {article.key_points.slice(0, 3).map((pt, i) => (
            <li key={i} className="flex gap-1.5 text-xs text-gray-500">
              <span className="text-indigo-400 shrink-0">&bull;</span><span>{pt}</span>
            </li>
          ))}
        </ul>
      )}
      {article.action_items.length > 0 && (
        <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Action Items</p>
          <ul className="space-y-0.5">
            {article.action_items.map((a, i) => (
              <li key={i} className="text-xs text-amber-900 flex gap-1.5">
                <span className="shrink-0">&bull;</span><span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default async function DigestPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const digest = await getDigest(date);
  if (!digest) notFound();

  const [hero, second, third, ...rest] = digest.articles;

  return (
    <div>
      <div className="mb-4">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
          &larr; All digests
        </Link>
      </div>

      {/* Masthead */}
      <div className="border-b-4 border-gray-900 pb-3 mb-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">
          Daily Newsletter Digest
        </p>
        <h1 className="text-4xl font-bold text-gray-900">{formatDate(digest.date)}</h1>
        <p className="text-xs text-gray-400 mt-1">
          {digest.articles.length} article{digest.articles.length !== 1 ? "s" : ""} &middot; Published{" "}
          {new Date(digest.published_at).toLocaleString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {digest.articles.length === 0 ? (
        <p className="text-gray-400 py-12 text-center">No articles in this digest.</p>
      ) : (
        <>
          {/* Hero article — full width or 3-col NYT layout */}
          {hero && !second && <HeroArticle article={hero} />}

          {/* NYT 3-column layout when 2+ articles */}
          {hero && second && (
            <div className="grid md:grid-cols-12 gap-0 divide-x divide-gray-200 py-4 border-b border-gray-200 mb-6">
              {/* Left col: article 2 (and 3 if exists) */}
              <div className="md:col-span-3 pr-5 space-y-6">
                <ArticleCard article={second} />
                {third && <ArticleCard article={third} />}
              </div>

              {/* Center: hero article */}
              <div className="md:col-span-6 px-6 border-t-0">
                <SourceLabel sender={hero.sender} subject={hero.subject} />
                <CategoryPills categories={hero.categories} />
                <h2 className="text-3xl font-bold leading-tight mb-3 text-gray-900">
                  {hero.title || hero.sender}
                </h2>
                <p className="text-gray-700 leading-relaxed text-base mb-4">
                  {hero.summary || hero.key_points.join(" ")}
                </p>
                {hero.key_points.length > 0 && (
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Key Points</p>
                    <ul className="space-y-1.5">
                      {hero.key_points.map((pt, i) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-600">
                          <span className="text-indigo-400 shrink-0">&bull;</span><span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {hero.action_items.length > 0 && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5">Action Items</p>
                    <ul className="space-y-1">
                      {hero.action_items.map((a, i) => (
                        <li key={i} className="text-sm text-amber-900 flex gap-2">
                          <span className="shrink-0">&bull;</span><span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Right col: articles 4 & 5 if exist, else key points */}
              <div className="md:col-span-3 pl-5 space-y-6">
                {rest.length > 0 ? (
                  rest.slice(0, 2).map((article, i) => (
                    <ArticleCard key={i} article={article} />
                  ))
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">From {hero.sender}</p>
                    <ul className="space-y-2">
                      {hero.key_points.slice(0, 4).map((pt, i) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-600">
                          <span className="text-indigo-400 shrink-0">&bull;</span><span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Remaining articles below in 3-col grid */}
          {rest.length > 2 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {rest.slice(2).map((article, i) => (
                <ArticleCard key={i} article={article} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
