import { createClient } from '@supabase/supabase-js';
import { NormalizedPaper, ResearchResult, Source } from '@archyve/shared';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Suppress client instantiation if env vars are missing
let supabase: any = null;

try {
  if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      },
    });
  } else {
    console.warn('Supabase credentials missing. Persistent DB is disabled.');
  }
} catch (e) {
  console.error('Failed to initialize Supabase client:', e);
}

export interface StoredPaperData {
  paper: NormalizedPaper;
  result: ResearchResult;
}

/**
 * Retrieve a stored paper and its research dossier by URL or DOI.
 */
export async function getStoredPaper(url: string, doi?: string | null): Promise<StoredPaperData | null> {
  if (!supabase) return null;

  try {
    // Search by DOI first (preferred), then by URL
    let query = supabase
      .from('papers')
      .select(`
        *,
        research_results (
          *,
          sources (*)
        )
      `);

    if (doi) {
      query = query.eq('doi', doi);
    } else {
      query = query.eq('url', url);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Supabase get paper error:', error);
      return null;
    }

    if (!data || !data.research_results) {
      return null;
    }

    const paperDb = data;
    const resultDb = data.research_results;

    const paper: NormalizedPaper = {
      title: paperDb.title,
      authors: paperDb.authors,
      doi: paperDb.doi,
      publisher: paperDb.publisher,
      publicationYear: paperDb.publication_year,
      venue: paperDb.venue,
      url: paperDb.url,
      abstract: paperDb.abstract,
      publisherId: paperDb.publisher_id,
      confidenceScore: paperDb.confidence_score,
    };

    const sources: Source[] = (resultDb.sources || []).map((s: any) => ({
      id: s.id || String(s.source_id),
      name: s.name,
      url: s.url,
      type: s.type,
      confidence: s.confidence,
    }));

    const result: ResearchResult = {
      summary: resultDb.summary,
      keyContributions: resultDb.key_contributions,
      readRecommendation: {
        score: resultDb.read_recommendation.score,
        explanation: resultDb.read_recommendation.explanation,
        relevanceTopics: resultDb.read_recommendation.relevanceTopics,
        difficulty: resultDb.read_recommendation.difficulty,
        estimatedReadingTime: resultDb.read_recommendation.estimatedReadingTime,
      },
      openAccess: {
        available: resultDb.open_access.available,
        sourceName: resultDb.open_access.sourceName,
        url: resultDb.open_access.url,
      },
      researchContext: resultDb.research_context,
      relatedConcepts: resultDb.related_concepts,
      relatedPapers: resultDb.related_papers || [],
      implementations: resultDb.implementations || [],
      sources: sources,
    };

    return { paper, result };
  } catch (error) {
    console.error('Supabase query exception:', error);
    return null;
  }
}

/**
 * Stores or updates a paper and its associated AI intelligence dossier.
 */
export async function storePaperResult(
  paper: NormalizedPaper,
  result: ResearchResult
): Promise<string | null> {
  if (!supabase) return null;

  try {
    // 1. Insert or update the paper record
    const paperPayload = {
      title: paper.title,
      authors: paper.authors,
      doi: paper.doi || null,
      publisher: paper.publisher,
      publication_year: paper.publicationYear || null,
      venue: paper.venue || null,
      url: paper.url,
      abstract: paper.abstract || null,
      publisher_id: paper.publisherId || null,
      confidence_score: paper.confidenceScore,
      updated_at: new Date().toISOString(),
    };

    // Upsert using URL as the unique constraint
    const { data: paperData, error: paperError } = await supabase
      .from('papers')
      .upsert(paperPayload, { onConflict: 'url' })
      .select('id')
      .single();

    if (paperError || !paperData) {
      console.error('Supabase paper store error:', paperError);
      return null;
    }

    const paperId = paperData.id;

    // 2. Insert or update the research result record
    const resultPayload = {
      paper_id: paperId,
      summary: result.summary,
      key_contributions: result.keyContributions,
      read_recommendation: result.readRecommendation,
      open_access: result.openAccess,
      research_context: result.researchContext,
      related_concepts: result.relatedConcepts,
      related_papers: result.relatedPapers,
      implementations: result.implementations,
      updated_at: new Date().toISOString(),
    };

    const { data: resultData, error: resultError } = await supabase
      .from('research_results')
      .upsert(resultPayload, { onConflict: 'paper_id' })
      .select('id')
      .single();

    if (resultError || !resultData) {
      console.error('Supabase research result store error:', resultError);
      return null;
    }

    const resultId = resultData.id;

    // 3. Re-insert source attributions
    // First, delete old sources linked to this research result
    await supabase.from('sources').delete().eq('research_result_id', resultId);

    if (result.sources && result.sources.length > 0) {
      const sourcesPayload = result.sources.map((s) => ({
        research_result_id: resultId,
        name: s.name,
        url: s.url,
        type: s.type,
        confidence: s.confidence || null,
      }));

      const { error: sourcesError } = await supabase.from('sources').insert(sourcesPayload);
      if (sourcesError) {
        console.error('Supabase sources insertion error:', sourcesError);
        return null;
      }
    }

    return paperId;
  } catch (error) {
    console.error('Supabase store transaction exception:', error);
    return null;
  }
}

/**
 * Log analytics event for requests
 */
export async function logAnalytics(
  paperId: string | null,
  triggerType: string,
  cacheHit: boolean,
  latencyMs: number
): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('analytics').insert({
      paper_id: paperId || null,
      trigger_type: triggerType,
      cache_hit: cacheHit,
      latency_ms: latencyMs,
    });
  } catch (error) {
    console.error('Analytics log exception:', error);
  }
}
