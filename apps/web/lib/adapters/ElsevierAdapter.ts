import { PublisherAdapter } from './PublisherAdapter';
import { NormalizedPaper } from '@archyve/shared';
import { extractAcademicMetaTags } from '../utils/metaExtractor';

export class ElsevierAdapter implements PublisherAdapter {
  name = 'elsevier';

  supports(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname.includes('sciencedirect.com');
    } catch {
      return false;
    }
  }

  parseUrl(url: string): { publisherId: string | null; doi: string | null } {
    try {
      const parsedUrl = new URL(url);
      const piiMatch = parsedUrl.pathname.match(/\/science\/article\/pii\/([A-Za-z0-9]+)/);
      return {
        publisherId: piiMatch ? piiMatch[1] : null,
        doi: null, // PII is different from DOI, though ScienceDirect contains metadata tags with DOI
      };
    } catch {
      return { publisherId: null, doi: null };
    }
  }

  async fetchMetadata(url: string): Promise<NormalizedPaper | null> {
    if (!this.supports(url)) return null;

    const { publisherId } = this.parseUrl(url);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Elsevier page: ${response.statusText}`);
      }

      const html = await response.text();
      const meta = extractAcademicMetaTags(html);

      return {
        title: meta.title || `Elsevier Document`,
        authors: meta.authors.length > 0 ? meta.authors : ['Unknown Author'],
        doi: meta.doi || null,
        publisher: meta.publisher || 'Elsevier',
        publicationYear: meta.publicationYear || null,
        venue: meta.venue || null,
        url: url,
        abstract: meta.abstract || null,
        publisherId: publisherId,
        confidenceScore: meta.title && meta.authors.length > 0 ? 0.9 : 0.5,
      };
    } catch (error) {
      console.error('Error in ElsevierAdapter:', error);
      return {
        title: `Elsevier Document`,
        authors: ['Unknown Author'],
        doi: null,
        publisher: 'Elsevier',
        publicationYear: null,
        venue: null,
        url: url,
        abstract: null,
        publisherId: publisherId,
        confidenceScore: 0.1,
      };
    }
  }
}
