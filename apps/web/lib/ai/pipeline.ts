import { NormalizedPaper, ResearchResult } from '@archyve/shared';
import { OpenAccessResult } from '../enrichment/unpaywall';
import { GeminiProvider } from './providers/GeminiProvider';

const geminiProvider = new GeminiProvider();

/**
 * Orchestrates AI Analysis by routing requests to the configured provider using the user's API Key.
 */
export async function generateResearchDossier(
  paper: NormalizedPaper,
  openAccess: OpenAccessResult,
  apiKey?: string | null
): Promise<ResearchResult> {
  // If API key is missing, return a detailed mock dossier to prevent hard failures
  if (!apiKey) {
    console.warn('AI Pipeline: No client API key provided. Returning fallback mockup dossier.');
    return getMockDossier(paper, openAccess);
  }

  try {
    return await geminiProvider.generateResearchResult(paper, openAccess, apiKey);
  } catch (error) {
    console.error('AI Provider analysis failed:', error);
    // Fall back to a gracefully constructed mock dossier
    return getMockDossier(paper, openAccess);
  }
}

/**
 * Graceful fallback to avoid app crashes when keys are missing or API fails.
 */
function getMockDossier(paper: NormalizedPaper, openAccess: OpenAccessResult): ResearchResult {
  return {
    summary: `[DEMO SUMMARY] The paper titled "${paper.title}" presents research in the field of academic publishing. The authors outline key methods to analyze literature databases and present structured insights for researchers.`,
    keyContributions: [
      'Introduces a baseline framework to categorize research papers automatically.',
      'Demonstrates metadata verification flows using cross-source validation APIs.',
      'Proposes design guidelines for presenting research intelligence without paywall bypasses.',
    ],
    readRecommendation: {
      score: 4.2,
      explanation: 'Highly relevant if you are investigating metadata scraping, academic discovery layers, or Next.js workspaces.',
      relevanceTopics: ['Academic Search', 'Metadata Mining', 'Next.js Workspaces'],
      difficulty: 'intermediate',
      estimatedReadingTime: '12-15 min',
    },
    openAccess: {
      available: openAccess.available,
      sourceName: openAccess.sourceName || (openAccess.available ? 'arXiv' : null),
      url: openAccess.url || null,
    },
    researchContext: 'Positioned in the broader literature of information extraction, bridging the gap between raw PDF documents and developer-focused search pipelines.',
    relatedConcepts: ['Metadata Extraction', 'Citation Graph', 'Natural Language Processing'],
    relatedPapers: [
      {
        title: 'Attention Is All You Need',
        authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar'],
        relationship: 'Foundational framework for Transformer-based summaries.',
      },
    ],
    implementations: [
      {
        name: 'archyve/archyve-v2',
        url: 'https://github.com/archyve/archyve-v2',
        type: 'github',
        stars: 120,
      },
    ],
    sources: [],
  };
}
