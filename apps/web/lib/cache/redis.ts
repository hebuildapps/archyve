import { Redis } from '@upstash/redis';
import { NormalizedPaper, ResearchResult } from '@archyve/shared';

// Initialize Upstash Redis client
let redis: Redis | null = null;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } else {
    console.warn('Upstash Redis environment variables are missing. Cache disabled.');
  }
} catch (e) {
  console.error('Failed to initialize Upstash Redis client:', e);
}

const CACHE_TTL = 60 * 60 * 24 * 7; // 7 days in seconds

export interface CachedPaperData {
  paper: NormalizedPaper;
  result: ResearchResult;
}

/**
 * Normalizes DOIs or publisher IDs to use as safe cache keys
 */
export function getCacheKey(identifier: string): string {
  const normalized = identifier
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, '_');
  return `paper:${normalized}`;
}

export async function getCachedResult(key: string): Promise<CachedPaperData | null> {
  if (!redis) return null;
  try {
    const cached = await redis.get<CachedPaperData>(key);
    return cached || null;
  } catch (error) {
    console.error('Redis cache get error:', error);
    return null;
  }
}

export async function setCachedResult(key: string, data: CachedPaperData): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, data, { ex: CACHE_TTL });
  } catch (error) {
    console.error('Redis cache set error:', error);
  }
}

/**
 * Aquires a lock for processing a paper.
 * Returns true if the lock was acquired, false if it is already locked by someone else.
 */
export async function acquireProcessingLock(key: string): Promise<boolean> {
  if (!redis) return true; // Fail-open if Redis is not configured
  const lockKey = `lock:${key}`;
  try {
    // Set lock key with 60 second expiration, only if it doesn't already exist
    const acquired = await redis.set(lockKey, 'processing', {
      nx: true,
      ex: 60,
    });
    return acquired === 'OK';
  } catch (error) {
    console.error('Redis lock acquire error:', error);
    return true; // Fail-open
  }
}

/**
 * Releases a processing lock
 */
export async function releaseProcessingLock(key: string): Promise<void> {
  if (!redis) return;
  const lockKey = `lock:${key}`;
  try {
    await redis.del(lockKey);
  } catch (error) {
    console.error('Redis lock release error:', error);
  }
}

/**
 * Polls the cache waiting for another concurrent request to finish processing.
 * Useful for request deduplication.
 */
export async function waitForProcessingResult(
  key: string,
  maxAttempts = 10,
  intervalMs = 2000
): Promise<CachedPaperData | null> {
  if (!redis) return null;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Wait first
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    
    // Check if the result is now in the cache
    const result = await getCachedResult(key);
    if (result) return result;
    
    // Check if the lock is gone (processing failed/aborted)
    const lockKey = `lock:${key}`;
    const isLocked = await redis.exists(lockKey);
    if (!isLocked) {
      // Lock was released but no cache was written; break early to retry
      break;
    }
  }
  
  return null;
}
