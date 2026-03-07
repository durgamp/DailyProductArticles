import { Redis } from "@upstash/redis";

function getRedis(): Redis | null {
  // Vercel Redis integration uses KV_REST_API_URL / KV_REST_API_TOKEN
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export interface Article {
  sender: string;
  email_count: number;
  categories: string[];
  key_points: string[];
  action_items: string[];
  dates_deadlines: string[];
  summary_markdown: string;
}

export interface Digest {
  date: string;
  published_at: string;
  articles: Article[];
}

export async function saveDigest(digest: Digest): Promise<void> {
  const redis = getRedis();
  if (!redis) throw new Error("Redis not configured");

  await redis.set(`digest:${digest.date}`, digest);

  const dates: string[] = (await redis.get<string[]>("digest:dates")) ?? [];
  if (!dates.includes(digest.date)) {
    dates.push(digest.date);
    dates.sort((a, b) => b.localeCompare(a));
    await redis.set("digest:dates", dates);
  }
}

export async function getDigest(date: string): Promise<Digest | null> {
  const redis = getRedis();
  if (!redis) return null;
  return redis.get<Digest>(`digest:${date}`);
}

export async function listDigestDates(): Promise<string[]> {
  const redis = getRedis();
  if (!redis) return [];
  return (await redis.get<string[]>("digest:dates")) ?? [];
}
