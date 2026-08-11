import { NormalizedPaper } from '@archyve/shared';

/**
 * Calculates string overlap similarity (Jaccard-like index on word sets)
 */
export function getTitleSimilarity(t1: string, t2: string): number {
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
 * Validates external API metadata against scraped publisher adapter data.
 * Merges trusted fields and computes a final confidence score.
 */
export function validateAndMergeMetadata(
  adapterPaper: NormalizedPaper,
  crossref: Partial<NormalizedPaper> | null,
  openalex: Partial<NormalizedPaper> | null
): NormalizedPaper {
  // Start with the publisher's adapter data as baseline
  const merged: NormalizedPaper = { ...adapterPaper };
  let apiMatch: Partial<NormalizedPaper> | null = null;
  let source = 'scraped';

  // Determine which API to trust if available
  if (crossref && crossref.title && getTitleSimilarity(adapterPaper.title, crossref.title) > 0.5) {
    apiMatch = crossref;
    source = 'crossref';
  } else if (openalex && openalex.title && getTitleSimilarity(adapterPaper.title, openalex.title) > 0.5) {
    apiMatch = openalex;
    source = 'openalex';
  }

  if (apiMatch) {
    // Enrich details
    merged.title = apiMatch.title || merged.title;
    merged.authors = apiMatch.authors || merged.authors;
    merged.doi = apiMatch.doi || merged.doi;
    merged.publicationYear = apiMatch.publicationYear || merged.publicationYear;
    merged.venue = apiMatch.venue || merged.venue;
    
    // Abstract enrichment (trust richer abstracts if adapter abstract is thin)
    if (apiMatch.abstract && (!merged.abstract || merged.abstract.length < apiMatch.abstract.length)) {
      merged.abstract = apiMatch.abstract;
    }

    // Set high confidence since we verified across independent databases
    merged.confidenceScore = 0.95;
  } else {
    // No API matched successfully, or similarity was too low (flagged as potentially mismatched)
    console.warn(`Source validation warning: low similarity between adapter scraped metadata and APIs for "${adapterPaper.title}"`);
    merged.confidenceScore = Math.min(merged.confidenceScore, 0.4); // Downgrade confidence
  }

  return merged;
}
