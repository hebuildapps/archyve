import { PublisherAdapter } from './PublisherAdapter';
import { NormalizedPaper } from '@archyve/shared';
import { extractAcademicMetaTags } from '../utils/metaExtractor';

export class JSTORAdapter implements PublisherAdapter {
  name = 'jstor';

  supports(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname.includes('jstor.org') && parsedUrl.pathname.includes('/stable/');
    } catch {
      return false;
    }
  }

  parseUrl(url: string): { publisherId: string | null; doi: string | null } {
    try {
      const parsedUrl = new URL(url);
      const stableMatch = parsedUrl.pathname.match(/\/stable\/([a-zA-Z0-9.\/_:-]+)/);
      if (stableMatch) {
        const stableId = stableMatch[1];
        // JSTOR DOIs are usually formed as 10.2307/stableId if stableId matches a pattern,
        // but we'll parse it out of meta tags or defaults
        return {
          publisherId: stableId,
          doi: stableId.startsWith('10.') ? stableId : null,
        };
      }
      return { publisherId: null, doi: null };
    } catch {
      return { publisherId: null, doi: null };
    }
  }

  async fetchMetadata(url: string): Promise<NormalizedPaper | null> {
    if (!this.supports(url)) return null;

    const { publisherId, doi } = this.parseUrl(url);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch JSTOR page: ${response.statusText}`);
      }

      const html = await response.text();
      const meta = extractAcademicMetaTags(html);

      return {
        title: meta.title || `JSTOR Document`,
        authors: meta.authors.length > 0 ? meta.authors : ['Unknown Author'],
        doi: meta.doi || doi || null,
        publisher: meta.publisher || 'JSTOR',
        publicationYear: meta.publicationYear || null,
        venue: meta.venue || null,
        url: url,
        abstract: meta.abstract || null,
        publisherId: publisherId,
        confidenceScore: meta.title && meta.authors.length > 0 ? 0.9 : 0.5,
      };
    } catch (error) {
      console.error('Error in JSTORAdapter:', error);
      return {
        title: `JSTOR Document`,
        authors: ['Unknown Author'],
        doi: doi || null,
        publisher: 'JSTOR',
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
