import { NormalizedPaper, ResearchResult } from '@archyve/shared';
import { OpenAccessResult } from '../../enrichment/unpaywall';

export interface AIProvider {
  name: string;
  generateResearchResult(
    paper: NormalizedPaper,
    openAccess: OpenAccessResult,
    apiKey: string,
    model?: string
  ): Promise<ResearchResult>;
}
