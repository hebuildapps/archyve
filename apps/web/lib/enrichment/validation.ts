import { NormalizedPaper } from '@archyve/shared';

/**
 * Normalizes scholarly titles across publishers and metadata registries (Crossref, OpenAlex, IEEE)
 * by stripping MathML/XML tags, normalizing TeX/LaTeX formulas (e.g. \mu, \hbox, \text),
 * standardizing Greek/micro unicode symbols, and decoding HTML entities.
 */
export function normalizeScholarlyTitle(title?: string | null): string {
  if (!title) return '';
  return title
    // 1. Decode common HTML entities
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&mu;/gi, 'μ')
    .replace(/&#956;/gi, 'μ')
    // 2. Strip XML/MathML/HTML tags like <formula ...>, <tex ...>, </tex>, </formula>, <i>, <sup>, etc.
    .replace(/<[^>]+>/g, ' ')
    // 3. Normalize LaTeX formulas e.g. $\mu{\hbox {m}}$, \mu m, \mu
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\\mu/g, 'μ')
    .replace(/\\hbox\s*\{([^}]*)\}/g, '$1')
    .replace(/\\text\s*\{([^}]*)\}/g, '$1')
    .replace(/[{}]/g, '')
    .replace(/\\/g, ' ')
    // 4. Normalize micro signs (micro sign \u00B5 -> greek small letter mu \u03BC)
    .replace(/\u00B5/g, 'μ')
    // 5. Replace various dash/hyphen representations with standard hyphen
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-')
    // 6. Condense whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates string overlap similarity (Jaccard-like index on word sets) with scholarly title normalization.
 */
export function getTitleSimilarity(t1: string, t2: string): number {
  const norm1 = normalizeScholarlyTitle(t1);
  const norm2 = normalizeScholarlyTitle(t2);

  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\sμ]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 1);

  const w1 = new Set(clean(norm1));
  const w2 = new Set(clean(norm2));

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

  // For IEEE papers, validate that DOIs match the adapter DOI or end with the IEEE document ID
  const isIEEE = adapterPaper.url.includes('ieeexplore.ieee.org') || adapterPaper.publisher?.toLowerCase() === 'ieee';
  const docId = adapterPaper.publisherId;
  const adapterDoi = adapterPaper.doi;

  const validateIeeeDoi = (doiToCheck?: string | null): boolean => {
    if (!doiToCheck) return false;
    const cleanDoi = doiToCheck.toLowerCase().trim().replace(/\/$/, '');
    
    // 1. Direct exact match with adapter DOI if known
    if (adapterDoi) {
      const cleanAdapterDoi = adapterDoi.toLowerCase().trim().replace(/\/$/, '');
      if (cleanDoi === cleanAdapterDoi) return true;
    }
    
    // 2. IEEE conference/early-access style DOIs ending with document ID (e.g. 10.1109/ICASSP.2021.9413901)
    if (docId && cleanDoi.endsWith(docId.toLowerCase())) {
      return true;
    }

    return false;
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

  const cleanAdapterDoi = adapterDoi ? adapterDoi.toLowerCase().trim().replace(/\/$/, '') : null;

  if (crossref && crossref.title) {
    if (isIEEE && (docId || adapterDoi)) {
      const doiMatch = validateIeeeDoi(crossref.doi);
      const titleMatch = adapterPaper.title.startsWith('IEEE Document') || getTitleSimilarity(adapterPaper.title, crossref.title) > 0.5;
      const authorsMatch = checkAuthorsOverlap(adapterPaper.authors, crossref.authors || []);
      const pubMatch = checkPublisher(crossref.publisher);
      crossrefMatch = doiMatch && titleMatch && authorsMatch && pubMatch;
    } else if (cleanAdapterDoi && crossref.doi && crossref.doi.toLowerCase().trim().replace(/\/$/, '') === cleanAdapterDoi) {
      // Direct DOI match: confirm title similarity or containment
      const sim = getTitleSimilarity(adapterPaper.title, crossref.title);
      crossrefMatch = sim > 0.35 || checkAuthorsOverlap(adapterPaper.authors, crossref.authors || []);
    } else {
      crossrefMatch = getTitleSimilarity(adapterPaper.title, crossref.title) > 0.5;
    }
  }

  if (openalex && openalex.title) {
    if (isIEEE && (docId || adapterDoi)) {
      const doiMatch = validateIeeeDoi(openalex.doi);
      const titleMatch = adapterPaper.title.startsWith('IEEE Document') || getTitleSimilarity(adapterPaper.title, openalex.title) > 0.5;
      const authorsMatch = checkAuthorsOverlap(adapterPaper.authors, openalex.authors || []);
      const pubMatch = checkPublisher(openalex.publisher);
      openalexMatch = doiMatch && titleMatch && authorsMatch && pubMatch;
    } else if (cleanAdapterDoi && openalex.doi && openalex.doi.toLowerCase().trim().replace(/\/$/, '') === cleanAdapterDoi) {
      // Direct DOI match: confirm title similarity or containment
      const sim = getTitleSimilarity(adapterPaper.title, openalex.title);
      openalexMatch = sim > 0.35 || checkAuthorsOverlap(adapterPaper.authors, openalex.authors || []);
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
    // Enrich details with clean normalized title if API provided one
    merged.title = normalizeScholarlyTitle(apiMatch.title) || merged.title;
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
