import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

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
  await redis.set(`digest:${digest.date}`, digest);

  const dates: string[] = (await redis.get<string[]>("digest:dates")) ?? [];
  if (!dates.includes(digest.date)) {
    dates.push(digest.date);
    dates.sort((a, b) => b.localeCompare(a)); // newest first
    await redis.set("digest:dates", dates);
  }
}

export async function getDigest(date: string): Promise<Digest | null> {
  return redis.get<Digest>(`digest:${date}`);
}

export async function listDigestDates(): Promise<string[]> {
  return (await redis.get<string[]>("digest:dates")) ?? [];
}
