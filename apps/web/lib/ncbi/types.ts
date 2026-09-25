/**
 * Configuration for NCBI E-utilities API requests.
 */
export interface NCBIConfig {
  baseUrl: string;
  tool: string;
  email: string;
  apiKey?: string;
  maxRequestsPerSecond: number;
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

export const defaultNCBIConfig: NCBIConfig = {
  baseUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
  tool: process.env.NCBI_TOOL_NAME || 'archyve',
  email: process.env.NCBI_EMAIL || 'salunkheheramb@gmail.com',
  apiKey: process.env.NCBI_API_KEY || undefined,
  // Official NCBI limits: 3 req/sec without API key, 10 req/sec with API key
  maxRequestsPerSecond: process.env.NCBI_API_KEY ? 9 : 3,
  timeoutMs: 12000,
  maxRetries: 3,
  retryDelayMs: 600,
};


export interface NCBIAuthor {
  name: string;
  foreName?: string;
  lastName?: string;
  initials?: string;
  affiliation?: string;
}

export interface NCBIRawRecord {
  pmid: string;
  pmcid?: string | null;
  doi?: string | null;
  title: string;
  abstract?: string | null;
  authors: NCBIAuthor[];
  journal?: string | null;
  publicationYear?: number | null;
  publicationTypes: string[];
  meshTerms: string[];
  keywords: string[];
  articleIds: { type: string; value: string }[];
  isPMCArticle?: boolean;
}
