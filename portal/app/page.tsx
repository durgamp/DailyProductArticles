import Link from "next/link";
import Image from "next/image";
import { listDigestDates, getDigest, type Digest, type Article } from "@/lib/storage";

export const revalidate = 60;

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function formatShortDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isToday(iso: string) {
  return iso === new Date().toISOString().slice(0, 10);
}

function readTime(text: string) {
  return `${Math.max(1, Math.round((text || "").split(/\s+/).length / 200))} min`;
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  "AI":            "from-violet-700 to-indigo-900",
  "System Design": "from-blue-700 to-cyan-900",
  "Finance":       "from-emerald-700 to-green-900",
  "Productivity":  "from-amber-600 to-orange-900",
  "Product":       "from-rose-600 to-pink-900",
  "Tech":          "from-sky-600 to-blue-900",
};

function gradientFor(categories: string[]) {
  for (const c of categories) {
    for (const [key, val] of Object.entries(CATEGORY_GRADIENTS)) {
      if (c.toLowerCase().includes(key.toLowerCase())) return val;
    }
  }
  return "from-gray-700 to-gray-900";
}

function ArticleThumb({ article, className = "" }: { article: Article; className?: string }) {
  if (article.image_url) {
    return (
      <div className={`relative overflow-hidden rounded-lg bg-gray-200 ${className}`}>
        <Image src={article.image_url} alt={article.title || ""} fill className="object-cover" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
    );
  }
  const grad = gradientFor(article.categories);
  return (
    <div className={`rounded-lg bg-gradient-to-br ${grad} flex items-center justify-center ${className}`}>
      <span className="text-white/20 font-playfair text-4xl font-bold select-none">
        {(article.title || article.sender).charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

function HeroCard({ article, date }: { article: Article; date: string }) {
  return (
    <Link href={`/digest/${date}`} className="group block">
      <div className="relative h-64 w-full overflow-hidden rounded-xl mb-4">
        {article.image_url ? (
          <>
            <Image src={article.image_url} alt={article.title || ""} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              {article.categories.slice(0, 1).map(c => (
                <span key={c} className="text-xs font-bold uppercase tracking-widest bg-white text-gray-900 rounded px-2 py-0.5 mr-2">{c}</span>
              ))}
            </div>
          </>
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradientFor(article.categories)} flex items-end p-4`}>
            {article.categories.slice(0, 1).map(c => (
              <span key={c} className="text-xs font-bold uppercase tracking-widest bg-white/20 text-white rounded px-2 py-0.5">{c}</span>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-1">{article.sender}</p>
      <h3 className="font-playfair text-2xl font-bold text-gray-900 leading-snug mb-2 group-hover:text-indigo-700 transition-colors">
        {article.title || article.subject || article.sender}
      </h3>
      <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
        {article.summary || article.key_points.slice(0, 2).join(" ")}
      </p>
      <p className="text-xs text-gray-400 mt-2 uppercase tracking-wide">{readTime(article.summary || "")} read</p>
    </Link>
  );
}

function SideCard({ article, date }: { article: Article; date: string }) {
  return (
    <Link href={`/digest/${date}`} className="group flex gap-3 py-3 border-b border-gray-200 last:border-0 hover:bg-white rounded-lg px-2 transition-colors">
      <ArticleThumb article={article} className="w-16 h-16 shrink-0" />
      <div className="flex-1 min-w-0">
        {article.categories.slice(0, 1).map(c => (
          <span key={c} className="text-xs font-bold uppercase tracking-widest text-indigo-600">{c}</span>
        ))}
        <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 mt-0.5 group-hover:text-indigo-700 transition-colors">
          {article.title || article.subject || article.sender}
        </p>
        <p className="text-xs text-gray-400 mt-1">{readTime(article.summary || "")} read</p>
      </div>
    </Link>
  );
}

function DigestSection({ digest }: { digest: Digest }) {
  const [hero, second, third, fourth, ...rest] = digest.articles;

  return (
    <section className="mb-14">
      {/* Section date header */}
      <div className="flex items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-playfair text-2xl font-bold text-gray-900">{formatDate(digest.date)}</h2>
            {isToday(digest.date) && (
              <span className="text-xs bg-red-600 text-white font-bold uppercase tracking-widest rounded px-2 py-0.5">Live</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {digest.articles.length} article{digest.articles.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex-1 h-px bg-gray-200" />
        <Link href={`/digest/${digest.date}`} className="text-xs font-semibold uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors whitespace-nowrap">
          View All &rarr;
        </Link>
      </div>

      {/* NYT 3-col layout */}
      {hero && (
        <div className="grid md:grid-cols-12 gap-6">
          {/* Left column */}
          <div className="md:col-span-3 space-y-0 border-r border-gray-200 pr-5">
            {second && <SideCard article={second} date={digest.date} />}
            {third && <SideCard article={third} date={digest.date} />}
            {!second && !third && (
              <p className="text-sm text-gray-400 italic">Only one article today.</p>
            )}
          </div>

          {/* Center — hero */}
          <div className="md:col-span-6 border-r border-gray-200 pr-5">
            <HeroCard article={hero} date={digest.date} />
          </div>

          {/* Right column */}
          <div className="md:col-span-3 space-y-0">
            {fourth && <SideCard article={fourth} date={digest.date} />}
            {rest.slice(0, 1).map((a, i) => (
              <SideCard key={i} article={a} date={digest.date} />
            ))}
            {!fourth && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Key Points</p>
                <ul className="space-y-2">
                  {hero.key_points.slice(0, 4).map((pt, i) => (
                    <li key={i} className="flex gap-2 text-xs text-gray-600 leading-snug">
                      <span className="shrink-0 w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[9px] flex items-center justify-center font-bold mt-0.5">{i + 1}</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default async function HomePage() {
  const dates = await listDigestDates();
  const digests = await Promise.all(dates.slice(0, 30).map((d) => getDigest(d)));
  const valid = digests.filter(Boolean) as Digest[];

  if (valid.length === 0) {
    return (
      <div className="text-center py-32">
        <p className="font-playfair text-4xl font-bold text-gray-300 mb-3">No digests yet</p>
        <p className="text-sm text-gray-400">Digests will appear here after the first run.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-8">
      {/* Archives sidebar */}
      <aside className="hidden xl:block w-36 shrink-0">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Archives</p>
        <ul className="space-y-1">
          {valid.map((d) => (
            <li key={d.date}>
              <Link
                href={`/digest/${d.date}`}
                className={`flex items-center gap-2 text-sm py-0.5 transition-colors ${isToday(d.date) ? "text-red-600 font-bold" : "text-gray-500 hover:text-gray-900"}`}
              >
                {isToday(d.date) && <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />}
                {formatShortDate(d.date)}
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {valid.map((digest) => (
          <DigestSection key={digest.date} digest={digest} />
        ))}
      </div>
    </div>
  );
}
