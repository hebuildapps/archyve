import { NextRequest, NextResponse } from 'next/server';
import { PaperRequestSchema } from '@archyve/shared';
import { getAdapterForUrl } from '@/lib/adapters';
import {
  getCacheKey,
  getCachedResult,
  setCachedResult,
} from '@/lib/cache/redis';
import { getStoredPaper, logAnalytics } from '@/lib/db/supabase';
import { fetchCrossrefMetadata } from '@/lib/enrichment/crossref';
import { fetchOpenAlexMetadata, findDoiByTitleAndAuthor } from '@/lib/enrichment/openalex';
import { checkUnpaywallOpenAccess } from '@/lib/enrichment/unpaywall';
import { validateAndMergeMetadata } from '@/lib/enrichment/validation';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await req.json();
    const parseResult = PaperRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request format', details: parseResult.error.format() },
        { status: 400 }
      );
    }
    
    const requestData = parseResult.data;
    const { url, trigger } = requestData;
    
    const adapter = getAdapterForUrl(url);
    if (!adapter) {
      return NextResponse.json(
        { error: 'Unsupported publisher or domain' },
        { status: 404 }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendUpdate = (status: string, percentage: number, message: string, data?: any) => {
          controller.enqueue(encoder.encode(JSON.stringify({ status, percentage, message, data }) + '\n'));
        };

        try {
          // 1. Resolve identifiers
          const urlIdentifiers = adapter.parseUrl(url);
          const identifierKey = urlIdentifiers.doi || urlIdentifiers.publisherId || url;
          const cacheKey = getCacheKey(identifierKey);
          
          sendUpdate('cache', 2, 'Checking cache & database persistence...');

          // 2. L1 Cache Lookup (Upstash Redis)
          const cachedDossier = await getCachedResult(cacheKey);
          if (cachedDossier) {
            const latencyMs = Date.now() - startTime;
            logAnalytics(null, trigger, true, latencyMs).catch(console.error);
            sendUpdate('completed', 100, 'Loaded from cache.', cachedDossier);
            controller.close();
            return;
          }
          
          // 3. L2 Cache Lookup (Supabase Database)
          const dbRecord = await getStoredPaper(url, urlIdentifiers.doi);
          if (dbRecord) {
            setCachedResult(cacheKey, dbRecord).catch(console.error);
            const latencyMs = Date.now() - startTime;
            logAnalytics(null, trigger, true, latencyMs).catch(console.error);
            sendUpdate('completed', 100, 'Loaded from database.', dbRecord);
            controller.close();
            return;
          }

          // 4. Scrape publisher metadata (0% - 15%)
          sendUpdate('scraping', 5, `Contacting ${adapter.name.toUpperCase()} publisher scraper...`);
          
          const adapterPaper = await adapter.fetchMetadata(url, (statusText, percentOffset) => {
            // Keep scraper percentage between 5% and 15%
            const mappedPercent = 5 + Math.round((percentOffset / 100) * 10);
            sendUpdate('scraping', mappedPercent, statusText);
          });

          if (!adapterPaper) {
            sendUpdate('error', 0, `Failed to scrape paper metadata using adapter: ${adapter.name}`);
            controller.close();
            return;
          }

          // 5. Query Crossref/OpenAlex/Unpaywall for identity validation before 20% checkpoint
          sendUpdate('enriching', 15, 'Querying discovery sources for identity validation...');
          let doi = adapterPaper.doi || urlIdentifiers.doi;
          if (!doi && adapterPaper.title && !adapterPaper.title.startsWith('IEEE Document')) {
            doi = await findDoiByTitleAndAuthor(adapterPaper.title, adapterPaper.authors);
          }

          let crossrefData = null;
          let openalexData = null;
          if (doi) {
            const [cr, oa] = await Promise.all([
              fetchCrossrefMetadata(doi).catch(() => null),
              fetchOpenAlexMetadata(doi).catch(() => null),
            ]);
            crossrefData = cr;
            openalexData = oa;
          }

          sendUpdate('validating', 18, 'Validating resolved paper identity...');
          const validatedPaper = validateAndMergeMetadata(adapterPaper, crossrefData, openalexData);

          if (validatedPaper.confidenceScore < 0.5) {
            sendUpdate('error', 0, 'Could not confidently validate paper identity.');
            controller.close();
            return;
          }

          // 6. Reach 20% checkpoint
          sendUpdate('checkpoint', 20, 'Paper identity confidently validated. Checkpoint reached.', {
            paper: validatedPaper,
            isNew: true,
          });
          controller.close();

        } catch (streamError: any) {
          sendUpdate('error', 0, streamError.message || 'Stream processing error');
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (error) {
    console.error('API /api/research error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error during paper lookup' },
      { status: 500 }
    );
  }
}
