import { PublisherAdapter } from './PublisherAdapter';
import { NormalizedPaper } from '@archyve/shared';
import { extractAcademicMetaTags } from '../utils/metaExtractor';
import { ncbiClient, NCBIRawRecord } from '../ncbi';

export class PubMedAdapter implements PublisherAdapter {
  name = 'pubmed';

  /**
   * Supports:
   * - pubmed.ncbi.nlm.nih.gov/<pmid>
   * - ncbi.nlm.nih.gov/pubmed/<pmid>
   * - pmc.ncbi.nlm.nih.gov/articles/PMC<id>
   * - ncbi.nlm.nih.gov/pmc/articles/PMC<id>
   */
  supports(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const host = parsedUrl.hostname.toLowerCase();

      if (host === 'pubmed.ncbi.nlm.nih.gov' || host === 'pmc.ncbi.nlm.nih.gov') {
        return true;
      }

      if (host.endsWith('ncbi.nlm.nih.gov')) {
        const path = parsedUrl.pathname.toLowerCase();
        return path.includes('/pubmed') || path.includes('/pmc');
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Extracts PMID or PMCID as publisherId, and any immediate DOI if determinable.
   */
  parseUrl(url: string): { publisherId: string | null; doi: string | null } {
    try {
      const parsedUrl = new URL(url);
      const host = parsedUrl.hostname.toLowerCase();
      const path = parsedUrl.pathname;

      // 1. PMC URLs: /articles/PMC13305826 or /pmc/articles/PMC13305826
      const pmcMatch = path.match(/\/(?:articles|pmc\/articles)\/(PMC\d+|\d+)/i);
      if (pmcMatch) {
        const rawId = pmcMatch[1];
        const pmcid = rawId.toUpperCase().startsWith('PMC') ? rawId.toUpperCase() : `PMC${rawId}`;
        return {
          publisherId: pmcid,
          doi: null,
        };
      }

      // 2. PubMed URLs: pubmed.ncbi.nlm.nih.gov/42492356 or /pubmed/42492356
      const pubmedMatch = path.match(/\/(?:pubmed\/)?(\d+)/i);
      if (pubmedMatch) {
        return {
          publisherId: pubmedMatch[1],
          doi: null,
        };
      }

      return { publisherId: null, doi: null };
    } catch {
      return { publisherId: null, doi: null };
    }
  }

  /**
   * Normalizes an NCBIRawRecord to NormalizedPaper.
   */
  private normalizeNCBIRecord(record: NCBIRawRecord, fallbackUrl: string): NormalizedPaper {
    const authors = record.authors.length > 0
      ? record.authors.map((a) => a.name)
      : ['Unknown Author'];

    const canonicalUrl = record.pmid
      ? `https://pubmed.ncbi.nlm.nih.gov/${record.pmid}/`
      : record.pmcid
        ? `https://pmc.ncbi.nlm.nih.gov/articles/${record.pmcid}/`
        : fallbackUrl;

    const isPMC = Boolean(record.isPMCArticle || (record.pmcid && !record.pmid));
    const publisherName = isPMC ? 'PubMed Central' : 'PubMed';

    return {
      title: record.title,
      authors,
      doi: record.doi || null,
      publisher: publisherName,
      publicationYear: record.publicationYear || null,
      venue: record.journal || (isPMC ? 'PubMed Central' : 'PubMed'),
      url: canonicalUrl,
      abstract: record.abstract || null,
      publisherId: record.pmid || record.pmcid || null,
      confidenceScore: 0.95, // Direct NCBI API record is authoritative
    };

  }

  /**
   * Fetches metadata for PubMed or PMC record using NCBIClient, with HTML meta tags fallback.
   */
  async fetchMetadata(
    url: string,
    onProgress?: (status: string, percentage: number) => void
  ): Promise<NormalizedPaper | null> {
    if (!this.supports(url)) return null;

    const { publisherId } = this.parseUrl(url);
    if (!publisherId) return null;

    const isPMC = publisherId.toUpperCase().startsWith('PMC');

    try {
      onProgress?.(
        isPMC ? 'Contacting NCBI E-utilities for PMC record...' : 'Contacting NCBI E-utilities for PubMed record...',
        5
      );

      let record: NCBIRawRecord | null = null;

      if (isPMC) {
        record = await ncbiClient.fetchPMCRecord(publisherId);
      } else {
        record = await ncbiClient.fetchPubMedRecord(publisherId);
        // If PMCID was not in the record, try resolving PMC full text availability
        if (record && !record.pmcid) {
          const pmcid = await ncbiClient.getPMCIdForPMID(publisherId);
          if (pmcid) record.pmcid = pmcid;
        }
      }

      if (record && record.title) {
        onProgress?.('Successfully retrieved and parsed NCBI record.', 15);
        return this.normalizeNCBIRecord(record, url);
      }
    } catch (apiError) {
      console.warn('NCBI E-utilities API fetch failed, attempting page scraping fallback:', apiError);
    }

    // Fallback: Scrape HTML academic meta tags from the NCBI page
    try {
      onProgress?.('E-utilities unavailable, attempting page metadata scrape...', 10);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`NCBI page fetch failed: ${response.statusText}`);
      }

      const html = await response.text();
      const meta = extractAcademicMetaTags(html);

      const publisherName = isPMC ? 'PubMed Central' : 'PubMed';

      return {
        title: meta.title || `NCBI Record ${publisherId}`,
        authors: meta.authors.length > 0 ? meta.authors : ['Unknown Author'],
        doi: meta.doi || null,
        publisher: publisherName,
        publicationYear: meta.publicationYear || null,
        venue: meta.venue || publisherName,
        url,
        abstract: meta.abstract || null,
        publisherId,
        confidenceScore: meta.title && meta.authors.length > 0 ? 0.8 : 0.4,
      };
    } catch (scrapeError) {
      console.error('NCBI fallback scrape failed:', scrapeError);
      return {
        title: `NCBI Record ${publisherId}`,
        authors: ['Unknown Author'],
        doi: null,
        publisher: isPMC ? 'PubMed Central' : 'PubMed',
        publicationYear: null,
        venue: null,
        url,
        abstract: null,
        publisherId,
        confidenceScore: 0.1,
      };

    }
  }
}
