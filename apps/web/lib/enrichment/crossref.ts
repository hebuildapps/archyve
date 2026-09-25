import { NormalizedPaper } from '@archyve/shared';

/**
 * Fetch paper metadata from Crossref by DOI.
 */
export async function fetchCrossrefMetadata(doi: string): Promise<Partial<NormalizedPaper> | null> {
  const cleanDoi = doi.trim();
  const url = `https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ArchyveResearchAgent/2.0 (mailto:hello@archyve.app)',
      },
    });

    if (!response.ok) {
      console.warn(`Crossref API responded with status ${response.status} for DOI ${cleanDoi}`);
      return null;
    }

    const json = await response.json();
    const item = json.message;
    if (!item) return null;

    // Extract title and combine subtitle if present (e.g. JAMA / Science papers)
    const rawTitle = Array.isArray(item.title) ? item.title[0] : item.title || null;
    const rawSubtitle = Array.isArray(item.subtitle) && item.subtitle.length > 0 ? item.subtitle[0] : null;
    const title = rawTitle && rawSubtitle ? `${rawTitle}: ${rawSubtitle}` : rawTitle;


    // Extract authors
    const authors: string[] = [];
    if (Array.isArray(item.author)) {
      for (const author of item.author) {
        const name = author.given && author.family 
          ? `${author.given} ${author.family}` 
          : author.name || author.family || '';
        if (name) authors.push(name.trim());
      }
    }

    // Extract publication year
    let publicationYear: number | null = null;
    const dateParts = item['published-print']?.['date-parts'] || item['published-online']?.['date-parts'] || item.created?.['date-parts'];
    if (dateParts && dateParts[0] && dateParts[0][0]) {
      publicationYear = parseInt(dateParts[0][0], 10);
    }

    // Extract venue (container-title is an array)
    const venue = Array.isArray(item['container-title']) 
      ? item['container-title'][0] 
      : item['container-title'] || null;

    return {
      title: title || undefined,
      authors: authors.length > 0 ? authors : undefined,
      doi: cleanDoi,
      publisher: item.publisher || undefined,
      publicationYear,
      venue,
      abstract: item.abstract || undefined,
    };
  } catch (error) {
    console.error(`Crossref lookup failed for DOI ${cleanDoi}:`, error);
    return null;
  }
}
