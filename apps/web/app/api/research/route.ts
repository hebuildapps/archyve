import { NextRequest, NextResponse } from 'next/server';
import { PaperRequestSchema } from '@archyve/shared';
import { getAdapterForUrl } from '@/lib/adapters';
import {
  getCacheKey,
  getCachedResult,
  setCachedResult,
} from '@/lib/cache/redis';
import { getStoredPaper, logAnalytics } from '@/lib/db/supabase';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await req.json();
    
    // 1. Validate request payload against Zod schema
    const parseResult = PaperRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request format', details: parseResult.error.format() },
        { status: 400 }
      );
    }
    
    const requestData = parseResult.data;
    const { url, trigger } = requestData;
    
    // 2. Resolve publisher adapter
    const adapter = getAdapterForUrl(url);
    if (!adapter) {
      return NextResponse.json(
        { error: 'Unsupported publisher or domain' },
        { status: 404 }
      );
    }
    
    // 3. Extract identifiers
    const urlIdentifiers = adapter.parseUrl(url);
    const identifierKey = urlIdentifiers.doi || urlIdentifiers.publisherId || url;
    const cacheKey = getCacheKey(identifierKey);
    
    // 4. L1 Cache Lookup (Upstash Redis)
    const cachedDossier = await getCachedResult(cacheKey);
    if (cachedDossier) {
      const latencyMs = Date.now() - startTime;
      logAnalytics(null, trigger, true, latencyMs).catch(console.error);
      return NextResponse.json(cachedDossier); // Returns completed { paper, result }
    }
    
    // 5. L2 Cache Lookup (Supabase Database)
    const dbRecord = await getStoredPaper(url, urlIdentifiers.doi);
    if (dbRecord) {
      // Repopulate L1 Redis cache asynchronously
      setCachedResult(cacheKey, dbRecord).catch(console.error);
      
      const latencyMs = Date.now() - startTime;
      logAnalytics(null, trigger, true, latencyMs).catch(console.error);
      
      return NextResponse.json(dbRecord); // Returns completed { paper, result }
    }
    
    // 6. Cache Miss: Perform initial publisher scrape (20% Checkpoint)
    // Runs the deterministic publisher page crawler to parse identifiers/metadata
    const adapterPaper = await adapter.fetchMetadata(url);
    if (!adapterPaper) {
      return NextResponse.json(
        { error: `Failed to scrape paper metadata using publisher adapter: ${adapter.name}` },
        { status: 422 }
      );
    }
    
    // Returns the scraped paper details indicating it is new (not in corpus)
    return NextResponse.json({
      paper: adapterPaper,
      isNew: true,
    });

  } catch (error) {
    console.error('API /api/research error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error during paper lookup' },
      { status: 500 }
    );
  }
}
