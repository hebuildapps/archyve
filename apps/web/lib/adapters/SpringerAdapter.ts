import { PublisherAdapter } from './PublisherAdapter';
import { NormalizedPaper } from '@archyve/shared';
import { extractAcademicMetaTags } from '../utils/metaExtractor';

export class SpringerAdapter implements PublisherAdapter {
  name = 'springer';

  supports(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname.includes('link.springer.com');
    } catch {
      return false;
    }
  }

  parseUrl(url: string): { publisherId: string | null; doi: string | null } {
    try {
      const parsedUrl = new URL(url);
      const doiMatch = parsedUrl.pathname.match(/\/(article|chapter|referenceworkentry)\/([^?#]+)/);
      if (doiMatch) {
        const doi = doiMatch[2];
        return {
          publisherId: doi.replace(/\//g, '_'),
          doi: doi,
        };
      }
      return { publisherId: null, doi: null };
    } catch {
      return { publisherId: null, doi: null };
    }
  }

  async fetchMetadata(
    url: string,
    onProgress?: (status: string, percentage: number) => void
  ): Promise<NormalizedPaper | null> {
    if (!this.supports(url)) return null;

    const { doi, publisherId } = this.parseUrl(url);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Springer page: ${response.statusText}`);
      }

      const html = await response.text();
      const meta = extractAcademicMetaTags(html);

      return {
        title: meta.title || `Springer Document`,
        authors: meta.authors.length > 0 ? meta.authors : ['Unknown Author'],
        doi: meta.doi || doi || null,
        publisher: meta.publisher || 'Springer',
        publicationYear: meta.publicationYear || null,
        venue: meta.venue || null,
        url: url,
        abstract: meta.abstract || null,
        publisherId: publisherId,
        confidenceScore: meta.title && meta.authors.length > 0 ? 0.9 : 0.5,
      };
    } catch (error) {
      console.error('Error in SpringerAdapter:', error);
      return {
        title: `Springer Document`,
        authors: ['Unknown Author'],
        doi: doi || null,
        publisher: 'Springer',
        publicationYear: null,
        venue: null,
        url: url,
        abstract: null,
        publisherId: publisherId,
        confidenceScore: doi ? 0.3 : 0.1,
      };
    }
  }
}
