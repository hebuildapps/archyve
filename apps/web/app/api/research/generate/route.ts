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

    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) {
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
    
    // 4. Resolve identifiers
    const urlIdentifiers = adapter.parseUrl(paper.url);
    let doi = paper.doi || urlIdentifiers.doi;
    if (!doi && paper.title) {
      // Discover DOI fallback on OpenAlex
      doi = await findDoiByTitleAndAuthor(paper.title, paper.authors);
    }
    
    // 5. Research Discovery (Retrieval Phase)
    let crossrefData = null;
    let openalexData = null;
    let openAccessResult: OpenAccessResult = { available: false, sourceName: null, url: null };
    
    if (doi) {
      const [cr, oa, oaResult] = await Promise.all([
        fetchCrossrefMetadata(doi).catch((err) => { console.error('Discovery (Crossref) failed:', err); return null; }),
        fetchOpenAlexMetadata(doi).catch((err) => { console.error('Discovery (OpenAlex) failed:', err); return null; }),
        checkUnpaywallOpenAccess(doi).catch((err) => { console.error('Discovery (Unpaywall) failed:', err); return { available: false, sourceName: null, url: null }; }),
      ]);
      crossrefData = cr;
      openalexData = oa;
      openAccessResult = oaResult;
    }
    
    // 6. Evidence Validation (Validation Phase)
    const mergedPaper = validateAndMergeMetadata(paper, crossrefData, openalexData);
    
    // 7. AI Analysis (Interpretation Phase)
    const dossier = await generateResearchDossier(mergedPaper, openAccessResult, apiKey, provider, model);
    
    // 8. Attach Attributions
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
    
    // 9. Persist to L2 Database (Supabase) & L1 Cache (Redis)
    const paperId = await storePaperResult(mergedPaper, dossier);
    
    const outputData = { paper: mergedPaper, result: dossier };
    const identifierKey = doi || urlIdentifiers.publisherId || paper.url;
    const cacheKey = getCacheKey(identifierKey);
    
    await setCachedResult(cacheKey, outputData);
    
    const latencyMs = Date.now() - startTime;
    // Log analytics (authenticated trigger)
    logAnalytics(paperId, 'extension', false, latencyMs).catch(console.error);
    
    return NextResponse.json(outputData);
    
  } catch (error) {
    console.error('API /api/research/generate error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error during dossier generation' },
      { status: 500 }
    );
  }
}
