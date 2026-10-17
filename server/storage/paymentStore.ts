import { Redis } from "@upstash/redis";

export const UNPAID_RETENTION_SECONDS = 30 * 24 * 60 * 60;
let client: Redis | undefined;
let clientConfig = "";

export function cleanEnvString(val: string | undefined | null): string {
  if (!val) return "";
  let cleaned = String(val).trim();
  while (
    (cleaned.startsWith('"') && cleaned.endsWith('"') && cleaned.length >= 2) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'") && cleaned.length >= 2)
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

export function getRedisConfig(): { url: string; token: string } | null {
  const rawUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const rawToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  let url = cleanEnvString(rawUrl).replace(/\/+$/, "");
  const token = cleanEnvString(rawToken);

  if (!url || !token) return null;
  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    if (url.includes(".upstash.io")) {
      url = `https://${url}`;
    } else {
      console.warn("[STORAGE] UPSTASH_REDIS_REST_URL must start with https:// or http://. Found:", url);
      return null;
    }
  }
  return { url, token };
}

export function isDurableStorageConfigured(): boolean {
  return getRedisConfig() !== null;
}

export function paymentStore(): Redis {
  const config = getRedisConfig();
  if (!config) throw new Error("PAYMENT_STORAGE_NOT_CONFIGURED");
  const { url, token } = config;
  if (!client || clientConfig !== `${url}:${token}`) {
    client = new Redis({
      url,
      token,
      retry: { retries: 1 },
      signal: () => AbortSignal.timeout(10000),
    });
    clientConfig = `${url}:${token}`;
  }
  return client;
}

export const reportKey = (reportId: string) => `sl:v1:report:${reportId}`;
export const orderKey = (orderId: string) => `sl:v1:order:${orderId}`;
export const orderIndexKey = (environment: string, reportId: string) => `sl:v1:order-for:${environment}:${reportId}`;
export const paymentKey = (environment: string, paymentId: string) => `sl:v1:payment:${environment}:${paymentId}`;
