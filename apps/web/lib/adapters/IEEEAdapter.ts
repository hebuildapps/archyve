import { PublisherAdapter } from './PublisherAdapter';
import { NormalizedPaper } from '@archyve/shared';
import { extractAcademicMetaTags } from '../utils/metaExtractor';

export class IEEEAdapter implements PublisherAdapter {
  name = 'ieee';

  supports(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname.includes('ieeexplore.ieee.org') && parsedUrl.pathname.includes('/document/');
    } catch {
      return false;
    }
  }

  parseUrl(url: string): { publisherId: string | null; doi: string | null } {
    try {
      const parsedUrl = new URL(url);
      const docMatch = parsedUrl.pathname.match(/\/document\/(\d+)/);
      return {
        publisherId: docMatch ? docMatch[1] : null,
        doi: null, // IEEE URLs do not contain the DOI directly in the path
      };
    } catch {
      return { publisherId: null, doi: null };
    }
  }

  async fetchMetadata(url: string): Promise<NormalizedPaper | null> {
    if (!this.supports(url)) return null;

    const { publisherId } = this.parseUrl(url);
    if (!publisherId) return null;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch IEEE page: ${response.statusText}`);
      }

      const html = await response.text();
      const meta = extractAcademicMetaTags(html);

      let title = meta.title;
      if (!title) {
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) {
          title = titleMatch[1].replace(' - IEEE Xplore Document', '').trim();
        }
      }

      return {
        title: title || `IEEE Document ${publisherId}`,
        authors: meta.authors.length > 0 ? meta.authors : ['Unknown Author'],
        doi: meta.doi || null,
        publisher: meta.publisher || 'IEEE',
        publicationYear: meta.publicationYear || null,
        venue: meta.venue || null,
        url: url,
        abstract: meta.abstract || null,
        publisherId: publisherId,
        confidenceScore: title && meta.authors.length > 0 ? 0.9 : 0.5,
      };
    } catch (error) {
      console.error('Error in IEEEAdapter:', error);
      return {
        title: `IEEE Document ${publisherId}`,
        authors: ['Unknown Author'],
        doi: null,
        publisher: 'IEEE',
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
