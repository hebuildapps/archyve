import { PublisherAdapter } from './PublisherAdapter';
import { NormalizedPaper } from '@archyve/shared';
import { extractAcademicMetaTags } from '../utils/metaExtractor';
import { scrapeIEEEWithBrightData, normalizeIEEE } from './brightdata';

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

  async resolveIeeeFromRestApi(publisherId: string, url: string): Promise<NormalizedPaper | null> {
    const restUrl = `https://ieeexplore.ieee.org/rest/document/${publisherId}/abstract`;
    try {
      const res = await fetch(restUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Referer': 'https://ieeexplore.ieee.org/',
        }
      });
      if (res.ok) {
        const data = await res.json();
        const title = data.title || '';
        const authors = Array.isArray(data.authors) ? data.authors.map((a: any) => a.name) : [];
        return {
          title: title || `IEEE Document ${publisherId}`,
          authors: authors.length > 0 ? authors : ['Unknown Author'],
          doi: data.doi || null,
          publisher: data.publisher || 'IEEE',
          publicationYear: typeof data.publicationYear === 'number' 
            ? data.publicationYear 
            : (data.publicationYear ? parseInt(data.publicationYear) : null),
          venue: data.publicationTitle || null,
          url: url,
          abstract: data.abstract || null,
          publisherId: publisherId,
          confidenceScore: title && authors.length > 0 ? 0.9 : 0.4,
        };
      }
    } catch (error) {
      console.error('Error in IEEEAdapter REST lookup:', error);
    }
    return null;
  }

  async fetchMetadata(
    url: string,
    onProgress?: (status: string, percentage: number) => void
  ): Promise<NormalizedPaper | null> {
    if (!this.supports(url)) return null;

    const { publisherId } = this.parseUrl(url);
    if (!publisherId) return null;

    // 1. Try scraping with Bright Data
    try {
      const paper = await scrapeIEEEWithBrightData(url, onProgress);
      if (paper && paper.title && !paper.title.startsWith('IEEE Document') && paper.authors.length > 0 && paper.authors[0] !== 'Unknown Author') {
        return paper;
      }
      
      console.warn('Bright Data returned partial metadata, attempting IEEE REST lookup...');
    } catch (err) {
      console.error('Bright Data scraping failed, attempting IEEE REST lookup:', err);
    }

    // 2. Try the WAF-free internal REST lookup
    try {
      onProgress?.('Attempting identifier-based REST lookup...', 12);
      const restPaper = await this.resolveIeeeFromRestApi(publisherId, url);
      if (restPaper && restPaper.title && !restPaper.title.startsWith('IEEE Document') && restPaper.authors[0] !== 'Unknown Author') {
        return restPaper;
      }
    } catch (restErr) {
      console.error('IEEE REST lookup failed, falling back to direct scrape:', restErr);
    }

    // 3. Fallback to direct HTTP scraping of the IEEE Explore page
    onProgress?.('Bright Data partial/failed, trying direct scrape fallback...', 16);
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
        confidenceScore: title && meta.authors.length > 0 ? 0.9 : 0.4,
      };
    } catch (error) {
      console.error('Error in IEEEAdapter fallback direct scrape:', error);
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
