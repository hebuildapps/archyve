import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { NormalizedPaperSchema, Source } from '@archyve/shared';
import { getAdapterForUrl } from '@/lib/adapters';
import { getCacheKey, setCachedResult } from '@/lib/cache/redis';
import { storePaperResult, logAnalytics } from '@/lib/db/supabase';
import { fetchCrossrefMetadata } from '@/lib/enrichment/crossref';
import { fetchOpenAlexMetadata, findDoiByTitleAndAuthor } from '@/lib/enrichment/openalex';
import { checkUnpaywallOpenAccess, OpenAccessResult } from '@/lib/enrichment/unpaywall';
import { validateAndMergeMetadata } from '@/lib/enrichment/validation';
import { generateResearchDossier } from '@/lib/ai/pipeline';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Verify Authentication Session (Supabase Auth)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Session token missing' },
        { status: 401 }
      );
    }
    const token = authHeader.split(' ')[1];
    
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data: { user }, error: authError } = await client.auth.getUser(token);
    if (authError || !user) {
      console.error('Supabase auth error in generate route:', authError);
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or expired session' },
        { status: 401 }
      );
    }
    
    // 2. Validate API Key header
    const apiKey = req.headers.get('x-gemini-key') || req.headers.get('x-groq-key') || req.headers.get('x-ai-key');
    const provider = req.headers.get('x-ai-provider') || 'gemini';
    const model = req.headers.get('x-ai-model');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required for dossier generation. Please configure it in Settings.' },
        { status: 400 }
      );
    }
    
    // 3. Validate NormalizedPaper request body
    const body = await req.json();
    const parseResult = NormalizedPaperSchema.safeParse(body.paper);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid paper metadata payload', details: parseResult.error.format() },
        { status: 400 }
      );
    }
    
    const paper = parseResult.data;
    const adapter = getAdapterForUrl(paper.url);
    if (!adapter) {
      return NextResponse.json(
        { error: 'Unsupported paper publisher adapter' },
        { status: 400 }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendUpdate = (status: string, percentage: number, message: string, data?: any) => {
          console.log(`[STREAM UPDATE] Status: ${status} | %: ${percentage} | Msg: ${message}`);
          controller.enqueue(encoder.encode(JSON.stringify({ status, percentage, message, data }) + '\n'));
        };

        try {
          console.log('>> AI GENERATION STREAM START');
          sendUpdate('resuming', 20, 'Resuming generation pipeline...');

          // 4. Resolve identifiers
          const urlIdentifiers = adapter.parseUrl(paper.url);
          console.log('>> resolved identifiers:', JSON.stringify(urlIdentifiers));
          let doi = paper.doi || urlIdentifiers.doi;
          if (!doi && paper.title && !paper.title.startsWith('IEEE Document')) {
            console.log('>> DOI is missing, attempting findDoiByTitleAndAuthor...');
            sendUpdate('enriching', 22, 'Resolving missing paper DOI via scientific index...');
            doi = await findDoiByTitleAndAuthor(paper.title, paper.authors);
            console.log('>> Resolved DOI:', doi);
          }
          
          // 5. Research Discovery (Retrieval Phase)
          let crossrefData = null;
          let openalexData = null;
          let openAccessResult: OpenAccessResult = { available: false, sourceName: null, url: null };
          
          if (doi) {
            console.log('>> DOI available:', doi, '. Fetching bibliographic registries...');
            sendUpdate('enriching', 25, 'Querying Crossref index for bibliographic registry...');
            crossrefData = await fetchCrossrefMetadata(doi).catch((err) => { 
              console.error('>> Discovery (Crossref) failed:', err); 
              return null; 
            });
            console.log('>> Crossref fetch done.');

            sendUpdate('enriching', 45, 'Querying OpenAlex scientific graph for details...');
            openalexData = await fetchOpenAlexMetadata(doi).catch((err) => { 
              console.error('>> Discovery (OpenAlex) failed:', err); 
              return null; 
            });
            console.log('>> OpenAlex fetch done.');

            sendUpdate('enriching', 60, 'Scanning open-access repositories (Unpaywall)...');
            openAccessResult = await checkUnpaywallOpenAccess(doi).catch((err) => { 
              console.error('>> Discovery (Unpaywall) failed:', err); 
              return { available: false, sourceName: null, url: null }; 
            });
            console.log('>> Unpaywall fetch done.');
          } else {
            console.log('>> No DOI available, skipping discovery phase.');
          }
          
          // 6. Evidence Validation (Validation Phase)
          console.log('>> Running validateAndMergeMetadata...');
          sendUpdate('validating', 70, 'Running final identity verification & merge...');
          const mergedPaper = validateAndMergeMetadata(paper, crossrefData, openalexData);
          console.log('>> Validation merge complete. Confidence:', mergedPaper.confidenceScore);
          
          console.log('Resolved Paper Metadata for AI synthesis:', JSON.stringify(mergedPaper, null, 2));

          if (mergedPaper.confidenceScore < 0.5) {
            console.log('>> Confidence Score too low (<0.5). Blocking AI generation.');
            sendUpdate('error', 0, 'Could not confidently identify this paper. AI generation is blocked.');
            controller.close();
            return;
          }
          
          // 7. AI Analysis (Interpretation Phase)
          console.log('>> Starting AI Analysis...');
          sendUpdate('interpreting', 75, `Generating structured AI analysis dossier using ${provider.toUpperCase()}...`);
          const dossier = await generateResearchDossier(mergedPaper, openAccessResult, apiKey, provider, model);
          console.log('>> AI Analysis completed. Dossier summary length:', dossier.summary?.length);
          
          // 8. Attach Attributions
          console.log('>> Attaching source attributions...');
          sendUpdate('indexing', 90, 'Attaching data source attributions...');
          const sources: Source[] = [
            {
              id: 'publisher',
              name: `${adapter.name.toUpperCase()} Publisher Source`,
              url: paper.url,
              type: 'publisher',
              confidence: paper.confidenceScore,
            },
          ];
          
          if (doi) {
            if (crossrefData) {
              sources.push({
                id: 'crossref',
                name: 'Crossref Citation Database',
                url: `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
                type: 'crossref',
                confidence: 0.95,
              });
            }
            if (openalexData) {
              sources.push({
                id: 'openalex',
                name: 'OpenAlex Scientific Index',
                url: `https://api.openalex.org/works/https://doi.org/${encodeURIComponent(doi)}`,
                type: 'openalex',
                confidence: 0.9,
              });
            }
            if (openAccessResult.available && openAccessResult.url) {
              sources.push({
                id: 'unpaywall',
                name: 'Unpaywall Open Access Registry',
                url: `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}`,
                type: 'unpaywall',
                confidence: 0.98,
              });
            }
          }
          
          sources.push({
            id: 'ai_analysis',
            name: 'Archyve AI Research Engine',
            url: 'https://archyve.app/ai',
            type: 'community',
            confidence: 0.85,
          });
          
          dossier.sources = sources;
          console.log('>> Attributions attached.');
          
          // 9. Persist to L2 Database (Supabase) & L1 Cache (Redis)
          console.log('>> Persisting results...');
          sendUpdate('saving', 95, 'Persisting generated research dossier...');
          const paperId = await storePaperResult(mergedPaper, dossier);
          
          if (!paperId) {
            console.error('>> Database persistence failed. Degraded state.');
            sendUpdate('degraded', 95, 'Warning: Database persistence failed. Dossier cached in Redis only.');
          } else {
            console.log('>> Result stored in database. Paper ID:', paperId);
          }
          
          const outputData = { 
            paper: mergedPaper, 
            result: dossier,
            persistenceStatus: paperId ? 'success' : 'degraded'
          };
          
          // Cache under multiple keys to ensure page refresh can find it by URL or publisherId
          const cacheKeysToSet = new Set<string>();
          if (doi) cacheKeysToSet.add(getCacheKey(doi));
          if (urlIdentifiers.publisherId) cacheKeysToSet.add(getCacheKey(urlIdentifiers.publisherId));
          cacheKeysToSet.add(getCacheKey(paper.url));

          for (const key of cacheKeysToSet) {
            console.log('>> Setting Redis cache key:', key);
            await setCachedResult(key, outputData).catch((err) => {
              console.error(`>> Failed to set Redis cache key ${key}:`, err);
            });
          }
          console.log('>> Redis cache set.');
          
          const latencyMs = Date.now() - startTime;
          logAnalytics(paperId, 'extension', false, latencyMs).catch(console.error);
          
          console.log('>> AI Dossier Generation Complete. Sending finished status...');
          sendUpdate('completed', 100, 'Dossier successfully generated.', outputData);
          controller.close();
          console.log('>> STREAM CLOSED SUCCESS');

        } catch (streamError: any) {
          console.error('>> STREAM RUNTIME ERROR:', streamError);
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
    console.error('API /api/research/generate error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error during dossier generation' },
      { status: 500 }
    );
  }
}
