import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getDigest, type Article } from "@/lib/storage";

export const revalidate = 60;

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function readTime(text: string) {
  const words = (text || "").split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  "AI":             "from-violet-700 to-indigo-900",
  "System Design":  "from-blue-700 to-cyan-900",
  "Finance":        "from-emerald-700 to-green-900",
  "Productivity":   "from-amber-600 to-orange-900",
  "Product":        "from-rose-600 to-pink-900",
  "Tech":           "from-sky-600 to-blue-900",
};

function gradientFor(categories: string[]) {
  for (const c of categories) {
    for (const [key, val] of Object.entries(CATEGORY_GRADIENTS)) {
      if (c.toLowerCase().includes(key.toLowerCase())) return val;
    }
  }
  return "from-gray-700 to-gray-900";
}

function CategoryPills({ categories }: { categories: string[] }) {
  if (!categories.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {categories.map((c) => (
        <span key={c} className="text-xs font-semibold uppercase tracking-widest bg-gray-900 text-white rounded px-2 py-0.5">
          {c}
        </span>
      ))}
    </div>
  );
}

function ArticleBanner({ article, tall = false }: { article: Article; tall?: boolean }) {
  const h = tall ? "h-72" : "h-44";
  if (article.image_url) {
    return (
      <div className={`relative w-full ${h} overflow-hidden rounded-t-xl bg-gray-200`}>
        <Image src={article.image_url} alt={article.title || ""} fill className="object-cover" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>
    );
  }
  const grad = gradientFor(article.categories);
  return (
    <div className={`relative w-full ${h} rounded-t-xl bg-gradient-to-br ${grad} flex items-end p-4`}>
      <span className="text-white/30 font-playfair text-6xl font-bold leading-none select-none">
        {(article.title || article.sender).charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

function KeyPointsPanel({ points }: { points: string[] }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Key Takeaways</p>
      <ol className="space-y-3">
        {points.map((pt, i) => (
          <li key={i} className="flex gap-3 text-sm text-gray-700 leading-snug">
            <span className="shrink-0 w-5 h-5 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center font-bold mt-0.5">
              {i + 1}
            </span>
            <span>{pt}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ActionBlock({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-3">Action Items</p>
      <ul className="space-y-2">
        {items.map((a, i) => (
          <li key={i} className="flex gap-2 text-sm text-amber-900">
            <span className="shrink-0 mt-0.5">&#x2713;</span><span>{a}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DeadlineBlock({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-blue-700 mb-3">Dates &amp; Deadlines</p>
      <ul className="space-y-1.5">
        {items.map((d, i) => (
          <li key={i} className="flex gap-2 text-sm text-blue-900">
            <span className="shrink-0">&#x1F4C5;</span><span>{d}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HeroArticle({ article }: { article: Article }) {
  return (
    <div className="grid md:grid-cols-5 gap-8 py-8 border-b-2 border-gray-900 mb-8">
      <div className="md:col-span-3">
        <p className="text-xs text-gray-400 font-medium mb-1">{article.sender}</p>
        <CategoryPills categories={article.categories} />
        <h2 className="font-playfair text-4xl font-bold leading-tight text-gray-900 mb-4">
          {article.title || article.subject || article.sender}
        </h2>
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">
          {readTime(article.summary || "")}
        </p>
        <p className="text-gray-700 leading-relaxed text-base mb-4">
          {article.summary}
        </p>
        <ActionBlock items={article.action_items} />
        <DeadlineBlock items={article.dates_deadlines} />
      </div>
      <div className="md:col-span-2 space-y-4">
        <ArticleBanner article={article} tall />
        <KeyPointsPanel points={article.key_points} />
      </div>
    </div>
  );
}

function SecondaryCard({ article }: { article: Article }) {
  const snippet = (article.summary || "").slice(0, 180) + ((article.summary || "").length > 180 ? "…" : "");
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <ArticleBanner article={article} />
      <div className="p-5">
        <p className="text-xs text-gray-400 mb-1">{article.sender}</p>
        <CategoryPills categories={article.categories} />
        <h3 className="font-playfair text-lg font-bold leading-snug text-gray-900 mb-2">
          {article.title || article.subject || article.sender}
        </h3>
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{readTime(article.summary || "")}</p>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">{snippet}</p>
        {article.key_points.length > 0 && (
          <div className="border-t border-gray-100 pt-3 space-y-1.5">
            {article.key_points.slice(0, 4).map((pt, i) => (
              <div key={i} className="flex gap-2 text-xs text-gray-600">
                <span className="shrink-0 w-4 h-4 rounded-full bg-gray-100 text-gray-500 text-[10px] flex items-center justify-center font-bold">{i + 1}</span>
                <span className="leading-snug">{pt}</span>
              </div>
            ))}
          </div>
        )}
        <ActionBlock items={article.action_items} />
        <DeadlineBlock items={article.dates_deadlines} />
      </div>
    </div>
  );
}

export default async function DigestPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const digest = await getDigest(date);
  if (!digest) notFound();

  const [hero, ...rest] = digest.articles;

  return (
    <div>
      <div className="mb-6">
        <Link href="/" className="text-xs font-semibold uppercase tracking-widest text-gray-400 hover:text-gray-700 transition-colors">
          &larr; All Digests
        </Link>
      </div>

      {/* Date header */}
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Daily Newsletter Digest</p>
        <h1 className="font-playfair text-3xl font-bold text-gray-900">{formatDate(digest.date)}</h1>
        <p className="text-xs text-gray-400 mt-1">
          {digest.articles.length} article{digest.articles.length !== 1 ? "s" : ""} &middot; Published {new Date(digest.published_at).toLocaleString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {digest.articles.length === 0 ? (
        <p className="text-gray-400 py-20 text-center font-playfair text-xl">No articles in this digest.</p>
      ) : (
        <>
          {hero && <HeroArticle article={hero} />}

          {rest.length > 0 && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-gray-200" />
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">More Stories</p>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map((article, i) => (
                  <SecondaryCard key={i} article={article} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
