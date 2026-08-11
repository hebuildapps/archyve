import { NormalizedPaper } from '@archyve/shared';

/**
 * Fetch paper metadata from OpenAlex by DOI.
 */
export async function fetchOpenAlexMetadata(doi: string): Promise<Partial<NormalizedPaper> | null> {
  const cleanDoi = doi.trim();
  // OpenAlex works URL format for DOIs
  const url = `https://api.openalex.org/works/https://doi.org/${encodeURIComponent(cleanDoi)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ArchyveResearchAgent/2.0 (mailto:hello@archyve.app)',
      },
    });

    if (!response.ok) {
      console.warn(`OpenAlex API responded with status ${response.status} for DOI ${cleanDoi}`);
      return null;
    }

    const item = await response.json();

    const title = item.title;
    
    // Extract authors
    const authors: string[] = [];
    if (Array.isArray(item.authorships)) {
      for (const authorship of item.authorships) {
        const authorName = authorship.author?.display_name;
        if (authorName) authors.push(authorName.trim());
      }
    }

    // Extract publication year
    const publicationYear = item.publication_year ? parseInt(item.publication_year, 10) : null;

    // Extract venue
    const venue = item.primary_location?.source?.display_name || null;

    return {
      title: title || undefined,
      authors: authors.length > 0 ? authors : undefined,
      doi: cleanDoi,
      publisher: item.primary_location?.source?.host_organization_name || undefined,
      publicationYear,
      venue,
      abstract: item.abstract || undefined, // Note: OpenAlex abstracts might be stored as an inverted index, so this is a partial helper
    };
  } catch (error) {
    console.error(`OpenAlex lookup failed for DOI ${cleanDoi}:`, error);
    return null;
  }
}

/**
 * Discovery fallback: Search OpenAlex by title + author to find a matching DOI.
 */
export async function findDoiByTitleAndAuthor(title: string, authors?: string[]): Promise<string | null> {
  // Query format for search
  const authorQuery = authors && authors.length > 0 ? `+${authors[0]}` : '';
  const query = encodeURIComponent(`${title}${authorQuery}`);
  const url = `https://api.openalex.org/works?filter=title.search:${query}&per_page=3`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ArchyveResearchAgent/2.0 (mailto:hello@archyve.app)',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.results || data.results.length === 0) return null;

    // Look at top result
    const topResult = data.results[0];
    
    // Simple verification check: check if title similarity is high
    const resultTitle = (topResult.title || '').toLowerCase();
    const inputTitle = title.toLowerCase();
    
    // A primitive overlap score: check if keywords exist
    const inputKeywords = inputTitle.split(/\s+/).filter(w => w.length > 3);
    const matches = inputKeywords.filter(k => resultTitle.includes(k));
    const overlapRatio = matches.length / inputKeywords.length;

    if (overlapRatio > 0.6 && topResult.doi) {
      // Strip DOI URL prefix to return clean DOI string e.g., "10.1109/..."
      return topResult.doi.replace('https://doi.org/', '');
    }

    return null;
  } catch (error) {
    console.error('OpenAlex reverse DOI search failed:', error);
    return null;
  }
}
