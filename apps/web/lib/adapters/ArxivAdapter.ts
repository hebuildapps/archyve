import { PublisherAdapter } from './PublisherAdapter';
import { NormalizedPaper } from '@archyve/shared';
import { extractAcademicMetaTags } from '../utils/metaExtractor';

export class ArxivAdapter implements PublisherAdapter {
  name = 'arxiv';

  supports(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname.includes('arxiv.org');
    } catch {
      return false;
    }
  }

  parseUrl(url: string): { publisherId: string | null; doi: string | null } {
    try {
      const parsedUrl = new URL(url);
      // Handles modern IDs (1706.03762, 1706.03762v7, /pdf/1706.03762.pdf) and classic IDs (math/0001001, math.PR/0001001)
      const idMatch = parsedUrl.pathname.match(/\/(abs|pdf)\/(?:([a-z\-]+(?:\.[a-z\-]+)?\/\d{7})|(\d{4}\.\d{4,5}))(?:v\d+)?(?:\.pdf)?$/i);
      if (idMatch) {
        const arxivId = idMatch[2] || idMatch[3];
        return {
          publisherId: arxivId,
          doi: `10.48550/arXiv.${arxivId}`, // arXiv DOI prefix
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

    const { publisherId, doi } = this.parseUrl(url);
    if (!publisherId) return null;

    try {
      // Fetch metadata from official arXiv API (returns XML)
      const apiUrl = `https://export.arxiv.org/api/query?id_list=${publisherId}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`arXiv API error: ${response.statusText}`);
      }

      const xml = await response.text();

      // Locate the <entry>...</entry> block to avoid matching top-level <feed><title>
      const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/);
      const entryXml = entryMatch ? entryMatch[1] : xml;

      const titleMatch = entryXml.match(/<title>([\s\S]*?)<\/title>/);
      const summaryMatch = entryXml.match(/<summary>([\s\S]*?)<\/summary>/);
      const publishedMatch = entryXml.match(/<published>([\s\S]*?)<\/published>/);
      const doiMatch = entryXml.match(/<arxiv:doi[^>]*>([\s\S]*?)<\/arxiv:doi>/);

      // Collect all authors within the entry
      const authorList: string[] = [];
      const authorRegex = /<author>([\s\S]*?)<\/author>/g;
      let authorBlock;
      while ((authorBlock = authorRegex.exec(entryXml)) !== null) {
        const nameMatch = authorBlock[1].match(/<name>([\s\S]*?)<\/name>/);
        if (nameMatch) {
          authorList.push(nameMatch[1].trim());
        }
      }

      // Format title (remove double spaces/newlines)
      const title = titleMatch 
        ? titleMatch[1].replace(/\s+/g, ' ').trim() 
        : `arXiv Paper ${publisherId}`;
      const abstract = summaryMatch 
        ? summaryMatch[1].replace(/\s+/g, ' ').trim() 
        : null;

      // Extract year
      let publicationYear: number | null = null;
      if (publishedMatch) {
        const dateStr = publishedMatch[1].trim();
        const yearMatch = dateStr.match(/\b\d{4}\b/);
        if (yearMatch) {
          publicationYear = parseInt(yearMatch[0], 10);
        }
      }

      return {
        title,
        authors: authorList.length > 0 ? authorList : ['Unknown Author'],
        doi: doiMatch ? doiMatch[1].trim() : doi,
        publisher: 'arXiv',
        publicationYear,
        venue: 'arXiv e-prints',
        url: `https://arxiv.org/abs/${publisherId}`,
        abstract,
        publisherId,
        confidenceScore: 0.95, // API response is authoritative
      };
    } catch (error) {
      console.error('Error in ArxivAdapter:', error);
      // Fallback to meta tags scraper
      try {
        const response = await fetch(url);
        const html = await response.text();
        const meta = extractAcademicMetaTags(html);

        return {
          title: meta.title || `arXiv Paper ${publisherId}`,
          authors: meta.authors.length > 0 ? meta.authors : ['Unknown Author'],
          doi: meta.doi || doi,
          publisher: 'arXiv',
          publicationYear: meta.publicationYear || null,
          venue: 'arXiv e-prints',
          url,
          abstract: meta.abstract || null,
          publisherId,
          confidenceScore: 0.6,
        };
      } catch {
        return {
          title: `arXiv Paper ${publisherId}`,
          authors: ['Unknown Author'],
          doi: doi,
          publisher: 'arXiv',
          publicationYear: null,
          venue: 'arXiv e-prints',
          url,
          abstract: null,
          publisherId,
          confidenceScore: 0.15,
        };
      }
    }
  }
}
