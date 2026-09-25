import { NCBIConfig, NCBIRawRecord, defaultNCBIConfig } from './types';
import { parsePubMedXml, parsePMCXml } from './parser';

export class NCBIClient {
  private config: NCBIConfig;
  private lastRequestTime = 0;

  constructor(config?: Partial<NCBIConfig>) {
    this.config = { ...defaultNCBIConfig, ...config };
  }

  /**
   * Rate limiting throttle according to NCBI usage guidelines.
   */
  private async throttle(): Promise<void> {
    const minIntervalMs = 1000 / this.config.maxRequestsPerSecond;
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < minIntervalMs) {
      await new Promise((resolve) => setTimeout(resolve, minIntervalMs - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Build complete NCBI E-utilities URL with standard parameters.
   */
  private buildUrl(endpoint: string, params: Record<string, string>): string {
    const url = new URL(`${this.config.baseUrl}/${endpoint}.fcgi`);
    url.searchParams.set('tool', this.config.tool);
    url.searchParams.set('email', this.config.email);
    if (this.config.apiKey) {
      url.searchParams.set('api_key', this.config.apiKey);
    }
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  /**
   * Resilient HTTP fetcher with exponential backoff and timeout.
   */
  private async fetchWithRetry(url: string): Promise<string> {
    let attempts = 0;
    let delay = this.config.retryDelayMs;

    while (attempts < this.config.maxRetries) {
      attempts++;
      await this.throttle();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': `${this.config.tool}/1.0 (${this.config.email})`,
          },
        });

        clearTimeout(timeoutId);

        if (response.status === 429) {
          // Rate limited by NCBI: back off longer
          await new Promise((resolve) => setTimeout(resolve, delay * 2));
          delay *= 2;
          continue;
        }

        if (!response.ok) {
          throw new Error(`NCBI HTTP Error: ${response.status} ${response.statusText}`);
        }

        return await response.text();
      } catch (err: any) {
        if (attempts >= this.config.maxRetries) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 1.5;
      }
    }

    throw new Error(`Failed to fetch from NCBI after ${this.config.maxRetries} attempts`);
  }

  /**
   * ESearch: Find IDs matching a search term in a database.
   */
  async search(db: 'pubmed' | 'pmc', term: string, retmax = 5): Promise<string[]> {
    const url = this.buildUrl('esearch', {
      db,
      term,
      retmax: retmax.toString(),
      retmode: 'json',
    });

    const body = await this.fetchWithRetry(url);
    try {
      const data = JSON.parse(body);
      return data?.esearchresult?.idlist || [];
    } catch {
      return [];
    }
  }

  /**
   * ESummary: Retrieve document summary JSON for a specific ID.
   */
  async getSummary(db: 'pubmed' | 'pmc', id: string): Promise<any> {
    const cleanId = id.replace(/^PMC/i, '');
    const url = this.buildUrl('esummary', {
      db,
      id: cleanId,
      retmode: 'json',
    });

    const body = await this.fetchWithRetry(url);
    try {
      const data = JSON.parse(body);
      return data?.result?.[cleanId] || null;
    } catch {
      return null;
    }
  }

  /**
   * EFetch PubMed: Retrieve complete structured record for a PMID as NCBIRawRecord.
   */
  async fetchPubMedRecord(pmid: string): Promise<NCBIRawRecord | null> {
    const cleanPmid = pmid.trim();
    if (!/^\d+$/.test(cleanPmid)) {
      return null;
    }

    const url = this.buildUrl('efetch', {
      db: 'pubmed',
      id: cleanPmid,
      retmode: 'xml',
    });

    const xml = await this.fetchWithRetry(url);
    return parsePubMedXml(xml);
  }

  /**
   * EFetch PMC: Retrieve PMC record for a PMCID (e.g. PMC13305826 or 13305826).
   */
  async fetchPMCRecord(pmcId: string): Promise<NCBIRawRecord | null> {
    const numericPmcId = pmcId.replace(/^PMC/i, '').trim();
    if (!/^\d+$/.test(numericPmcId)) {
      return null;
    }

    // 1. Fetch from PMC XML
    const url = this.buildUrl('efetch', {
      db: 'pmc',
      id: numericPmcId,
      retmode: 'xml',
    });

    try {
      const xml = await this.fetchWithRetry(url);
      const parsedPMC = parsePMCXml(xml, pmcId);

      // If PMC record has a PMID, fetch the richer PubMed record for MeSH terms, clean author affiliations, etc.
      if (parsedPMC && parsedPMC.pmid) {
        try {
          const pubmedRecord = await this.fetchPubMedRecord(parsedPMC.pmid);
          if (pubmedRecord) {
            // Merge PMC identifier into the PubMed record
            pubmedRecord.pmcid = parsedPMC.pmcid || `PMC${numericPmcId}`;
            pubmedRecord.isPMCArticle = true;
            // If abstract was richer in PMC, keep it
            if (!pubmedRecord.abstract && parsedPMC.abstract) {
              pubmedRecord.abstract = parsedPMC.abstract;
            }
            return pubmedRecord;
          }

        } catch (pubmedErr) {
          console.warn(`Could not fetch corresponding PubMed record for PMID ${parsedPMC.pmid}:`, pubmedErr);
        }
      }

      return parsedPMC;
    } catch (err) {
      console.error(`Error fetching PMC record for ${pmcId}:`, err);
      // Fallback: try ESummary
      const summary = await this.getSummary('pmc', numericPmcId);
      if (summary && !summary.error) {
        const articleids = summary.articleids || [];
        const pmidObj = articleids.find((a: any) => a.idtype === 'pmid');
        const doiObj = articleids.find((a: any) => a.idtype === 'doi');

        if (pmidObj && pmidObj.value) {
          const pmidRecord = await this.fetchPubMedRecord(pmidObj.value);
          if (pmidRecord) {
            pmidRecord.pmcid = `PMC${numericPmcId}`;
            return pmidRecord;
          }
        }

        const authors = (summary.authors || []).map((a: any) => ({ name: a.name }));
        return {
          pmid: pmidObj?.value || '',
          pmcid: `PMC${numericPmcId}`,
          doi: doiObj?.value || null,
          title: summary.title || `PMC Paper PMC${numericPmcId}`,
          abstract: null,
          authors: authors.length > 0 ? authors : [{ name: 'Unknown Author' }],
          journal: summary.fulljournalname || summary.source || null,
          publicationYear: summary.pubdate ? parseInt(summary.pubdate.match(/\b\d{4}\b/)?.[0] || '0', 10) || null : null,
          publicationTypes: ['Journal Article'],
          meshTerms: [],
          keywords: [],
          articleIds: articleids.map((a: any) => ({ type: a.idtype, value: a.value })),
          isPMCArticle: true,
        };
      }
      return null;
    }
  }

  /**
   * ELink: Given a PMID, check if full text is available in PMC and resolve PMCID.
   */
  async getPMCIdForPMID(pmid: string): Promise<string | null> {
    const url = this.buildUrl('elink', {
      dbfrom: 'pubmed',
      db: 'pmc',
      id: pmid,
      retmode: 'json',
    });

    try {
      const body = await this.fetchWithRetry(url);
      const data = JSON.parse(body);
      const linksets = data?.linksets?.[0]?.linksetdbs || [];
      for (const ls of linksets) {
        if (ls.linkname === 'pubmed_pmc' && ls.links?.length > 0) {
          return `PMC${ls.links[0]}`;
        }
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const ncbiClient = new NCBIClient();
