import { NormalizedPaper } from '@archyve/shared';
import { fetchOpenAlexMetadata } from './openalex';

export interface RelatedPaperResult {
  title: string;
  authors: string[];
  url?: string;
  doi?: string;
  publicationYear?: number;
  venue?: string;
  publisher?: string;
}

/**
 * Calculates title Jaccard keyword similarity
 */
function getTitleSimilarity(t1: string, t2: string): number {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2);

  const w1 = new Set(clean(t1));
  const w2 = new Set(clean(t2));

  if (w1.size === 0 || w2.size === 0) return 0;

  const intersection = new Set([...w1].filter((x) => w2.has(x)));
  const union = new Set([...w1, ...w2]);

  return intersection.size / union.size;
}

/**
 * Fetches related papers from OpenAlex using related_works references or title similarity fallback.
 */
export async function fetchRelatedPapers(
  title: string,
  doi?: string | null,
  authors?: string[]
): Promise<RelatedPaperResult[]> {
  const headers = { 'User-Agent': 'ArchyveResearchAgent/2.0 (mailto:hello@archyve.app)' };
  let candidateWorks: any[] = [];

  // Try fetching via OpenAlex related_works IDs
  if (doi) {
    try {
      const cleanDoi = doi.trim();
      const url = `https://api.openalex.org/works/https://doi.org/${encodeURIComponent(cleanDoi)}`;
      const response = await fetch(url, { headers });

      if (response.ok) {
        const item = await response.json();
        const relatedWorksUrls: string[] = item.related_works || [];
        
        if (relatedWorksUrls.length > 0) {
          // Take first 5 related works
          const ids = relatedWorksUrls
            .slice(0, 5)
            .map(id => id.replace('https://openalex.org/', ''))
            .filter(Boolean);

          if (ids.length > 0) {
            const batchUrl = `https://api.openalex.org/works?filter=openalex:${ids.join('|')}`;
            const batchRes = await fetch(batchUrl, { headers });
            if (batchRes.ok) {
              const batchData = await batchRes.json();
              if (batchData.results && Array.isArray(batchData.results)) {
                candidateWorks = batchData.results;
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching OpenAlex related works:', err);
    }
  }

  // Fallback: title search on OpenAlex
  if (candidateWorks.length === 0 && title && !title.startsWith('IEEE Document')) {
    try {
      const query = encodeURIComponent(title.toLowerCase().replace(/[^a-z0-9\s]/g, ''));
      const url = `https://api.openalex.org/works?filter=title.search:${query}&per_page=5`;
      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json();
        if (data.results && Array.isArray(data.results)) {
          candidateWorks = data.results;
        }
      }
    } catch (err) {
      console.error('Error fallback searching related works:', err);
    }
  }

  const validated: RelatedPaperResult[] = [];
  const cleanTargetTitle = title.toLowerCase().trim();

  // Validate candidates
  for (const item of candidateWorks) {
    const candidateTitle = item.title;
    if (!candidateTitle) continue;

    // Check similarity: must NOT be the exact same paper (similarity should not be 1.0)
    // but should have some domain overlap (similarity > 0.05)
    const similarity = getTitleSimilarity(cleanTargetTitle, candidateTitle.toLowerCase().trim());
    if (similarity > 0.9) {
      // It is the same paper (duplicate), reject
      continue;
    }

    // Extract authors
    const candidateAuthors: string[] = [];
    if (Array.isArray(item.authorships)) {
      for (const authorship of item.authorships) {
        const authorName = authorship.author?.display_name;
        if (authorName) candidateAuthors.push(authorName.trim());
      }
    }

    if (candidateAuthors.length === 0) {
      // Must have authors
      continue;
    }

    // Extract DOI/URL
    const candidateDoi = item.doi ? item.doi.replace('https://doi.org/', '') : null;
    const candidateUrl = item.doi || item.ids?.wikipedia || null;

    if (!candidateUrl) {
      // Must have authoritative URL
      continue;
    }

    const publicationYear = item.publication_year ? parseInt(item.publication_year, 10) : undefined;
    const venue = item.primary_location?.source?.display_name || undefined;
    const publisher = item.primary_location?.source?.host_organization_name || undefined;

    validated.push({
      title: candidateTitle,
      authors: candidateAuthors,
      url: candidateUrl,
      doi: candidateDoi || undefined,
      publicationYear,
      venue,
      publisher,
    });
  }

  return validated;
}
