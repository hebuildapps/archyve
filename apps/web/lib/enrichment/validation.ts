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

  // For IEEE papers, validate that DOIs end with or contain the IEEE document ID
  const isIEEE = adapterPaper.url.includes('ieeexplore.ieee.org') || adapterPaper.publisher?.toLowerCase() === 'ieee';
  const docId = adapterPaper.publisherId;

  const validateIeeeDoi = (doiToCheck?: string | null): boolean => {
    if (!doiToCheck || !docId) return false;
    const cleanDoi = doiToCheck.toLowerCase().trim().replace(/\/$/, '');
    return cleanDoi.endsWith(docId.toLowerCase());
  };

  const checkAuthorsOverlap = (a1: string[], a2: string[]): boolean => {
    if (a1.includes('Unknown Author') || a2.includes('Unknown Author') || a1.length === 0 || a2.length === 0) {
      return true;
    }
    const cleanName = (n: string) => n.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    const set1 = new Set(a1.map(cleanName));
    const set2 = new Set(a2.map(cleanName));
    for (const a of set1) {
      if (set2.has(a)) return true;
    }
    const getLastName = (n: string) => {
      const parts = n.toLowerCase().split(/\s+/);
      return parts[parts.length - 1] || '';
    };
    const lastSet1 = new Set(a1.map(getLastName).filter(l => l.length > 2));
    const lastSet2 = new Set(a2.map(getLastName).filter(l => l.length > 2));
    for (const l of lastSet1) {
      if (lastSet2.has(l)) return true;
    }
    return false;
  };

  const checkPublisher = (pub?: string | null): boolean => {
    if (!pub) return true;
    const p = pub.toLowerCase();
    return p.includes('ieee') || p.includes('institute of electrical') || p.includes('microwave') || p.includes('wireless');
  };

  let crossrefMatch = false;
  let openalexMatch = false;

  if (crossref && crossref.title) {
    if (isIEEE && docId) {
      const doiMatch = validateIeeeDoi(crossref.doi);
      const titleMatch = adapterPaper.title.startsWith('IEEE Document') || getTitleSimilarity(adapterPaper.title, crossref.title) > 0.5;
      const authorsMatch = checkAuthorsOverlap(adapterPaper.authors, crossref.authors || []);
      const pubMatch = checkPublisher(crossref.publisher);
      crossrefMatch = doiMatch && titleMatch && authorsMatch && pubMatch;
    } else {
      crossrefMatch = getTitleSimilarity(adapterPaper.title, crossref.title) > 0.5;
    }
  }

  if (openalex && openalex.title) {
    if (isIEEE && docId) {
      const doiMatch = validateIeeeDoi(openalex.doi);
      const titleMatch = adapterPaper.title.startsWith('IEEE Document') || getTitleSimilarity(adapterPaper.title, openalex.title) > 0.5;
      const authorsMatch = checkAuthorsOverlap(adapterPaper.authors, openalex.authors || []);
      const pubMatch = checkPublisher(openalex.publisher);
      openalexMatch = doiMatch && titleMatch && authorsMatch && pubMatch;
    } else {
      openalexMatch = getTitleSimilarity(adapterPaper.title, openalex.title) > 0.5;
    }
  }

  // If both APIs returned matches but they disagree on the identity (different DOIs)
  if (crossrefMatch && openalexMatch && crossref?.doi && openalex?.doi) {
    const cleanCr = crossref.doi.toLowerCase().trim().replace(/\/$/, '');
    const cleanOa = openalex.doi.toLowerCase().trim().replace(/\/$/, '');
    if (cleanCr !== cleanOa) {
      console.warn('Enrichment mismatch: Crossref and OpenAlex resolved to different DOIs.');
      merged.confidenceScore = 0.0;
      return merged;
    }
  }

  if (crossrefMatch) {
    apiMatch = crossref;
    source = 'crossref';
  } else if (openalexMatch) {
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
    console.warn(`Source validation warning: low similarity or validation mismatch for "${adapterPaper.title}"`);
    const isThin = adapterPaper.title.startsWith('IEEE Document') || 
                   adapterPaper.authors.includes('Unknown Author') || 
                   isIEEE;
    if (isThin) {
      merged.confidenceScore = 0.0; // Block AI synthesis
    } else {
      merged.confidenceScore = Math.min(merged.confidenceScore, 0.4); // Downgrade confidence
    }
  }

  return merged;
}
