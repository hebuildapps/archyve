import { NormalizedPaper, ResearchResult } from '@archyve/shared';
import { OpenAccessResult } from '../enrichment/unpaywall';
import { GeminiProvider } from './providers/GeminiProvider';
import { GroqProvider } from './providers/GroqProvider';

import { fetchRelatedPapers } from '../enrichment/related';
import { searchGithubImplementations } from '../enrichment/github';

const geminiProvider = new GeminiProvider();
const groqProvider = new GroqProvider();

/**
 * Orchestrates AI Analysis by routing requests to the configured provider using the user's API Key.
 */
export async function generateResearchDossier(
  paper: NormalizedPaper,
  openAccess: OpenAccessResult,
  apiKey?: string | null,
  provider?: string | null,
  model?: string | null
): Promise<ResearchResult> {
  // If API key is missing, return a detailed mock dossier to prevent hard failures
  if (!apiKey) {
    console.warn('AI Pipeline: No client API key provided. Returning fallback mockup dossier.');
    return getMockDossier(paper, openAccess);
  }

  // 1. Research retrieval (scholarly papers & code implementations)
  console.log('>> [Pipeline] Running external retrieval for related literature and code...');
  const [relatedPapers, implementations] = await Promise.all([
    fetchRelatedPapers(paper.title, paper.doi, paper.authors).catch((err) => {
      console.error('Related papers retrieval failed:', err);
      return [];
    }),
    searchGithubImplementations(paper.title).catch((err) => {
      console.error('GitHub implementations retrieval failed:', err);
      return [];
    }),
  ]);
  console.log(`>> [Pipeline] Retrieved relatedPapers: ${relatedPapers.length}, implementations: ${implementations.length}`);

  try {
    const activeProvider = provider === 'groq' ? groqProvider : geminiProvider;
    return await activeProvider.generateResearchResult(
      paper,
      openAccess,
      apiKey,
      model || undefined,
      relatedPapers,
      implementations
    );
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
