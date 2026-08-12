import { NormalizedPaper } from '@archyve/shared';

export interface PublisherAdapter {
  /**
   * Unique name of the publisher (e.g., 'ieee', 'springer', 'elsevier', 'jstor', 'arxiv')
   */
  name: string;

  /**
   * Check if this adapter can handle the given URL.
   */
  supports(url: string): boolean;

  /**
   * Extract obvious identifiers (like publisherId or DOI) from the URL path.
   */
  parseUrl(url: string): { publisherId: string | null; doi: string | null };

  /**
   * Fetch and construct a NormalizedPaper representation.
   * Can perform HTTP requests to fetch page headers/meta tag contents,
   * or call public APIs (like Crossref or OpenAlex or Publisher public APIs).
   */
  fetchMetadata(
    url: string,
    onProgress?: (status: string, percentage: number) => void
  ): Promise<NormalizedPaper | null>;
}
