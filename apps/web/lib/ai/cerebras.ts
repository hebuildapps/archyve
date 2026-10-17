import { DossierContextData } from '../aws/bedrock';

export interface CerebrasModel {
  id: string;
  name: string;
  shortName: string;
  parameters: string;
  contextWindow: string;
  speed: string;
  description: string;
}

export const CEREBRAS_MODELS: CerebrasModel[] = [
  {
    id: 'gpt-oss-120b',
    name: 'OpenAI GPT OSS',
    shortName: 'GPT OSS 120B',
    parameters: '120 billion',
    contextWindow: '65k / 131k',
    speed: '~3000 tokens/s',
    description: 'High-reasoning open-weights model running on Cerebras Wafer-Scale Engine.',
  },
  {
    id: 'qwen-3.8-27b',
    name: 'Qwen 3.8 27B',
    shortName: 'Qwen 3.8 27B',
    parameters: '27 billion',
    contextWindow: '64k / 128k',
    speed: '~1850 tokens/s',
    description: 'Fast, state-of-the-art multilingual and technical reasoning model.',
  },
  {
    id: 'llama-3.3-70b',
    name: 'Llama 3.3 70B',
    shortName: 'Llama 3.3 70B',
    parameters: '70 billion',
    contextWindow: '128k',
    speed: '~2000 tokens/s',
    description: 'Flagship open foundation model with massive context capacity.',
  },
  {
    id: 'llama3.1-8b',
    name: 'Llama 3.1 8B',
    shortName: 'Llama 3.1 8B',
    parameters: '8 billion',
    contextWindow: '128k',
    speed: '~1800 tokens/s',
    description: 'Compact, ultra-low latency model for instantaneous responses.',
  },
];

export const DEFAULT_CEREBRAS_MODEL = 'gpt-oss-120b';

export function isCerebrasConfigured(): boolean {
  return Boolean(process.env.CEREBRAS_API_KEY);
}

export function buildCerebrasSystemPrompt(dossier?: DossierContextData): string {
  if (!dossier) {
    return 'You are Archyve Assistant, an expert academic research copilot powered by Cerebras Wafer-Scale Engine.';
  }

  const { paper, result } = dossier;

  const sections: string[] = [
    'You are Archyve Assistant, an ultra-fast academic research intelligence copilot powered by Cerebras inference.',
    'You have direct, continuous background access to the entire research dossier opened by the researcher.',
    'Carefully cross-reference the paper metadata, literature citations, open-access preprint links, and code implementations below when answering.',
    '',
    '### Response Guidelines:',
    '1. Format with clean, rich Markdown (headers, bullet points, numbered lists, blockquotes, code snippets).',
    '2. Use proper typographic em-dashes (—) instead of double hyphens (--).',
    '3. When referencing external links, papers, or code repositories, format them as clean markdown links: `[Anchor Text](URL)`.',
    '4. When answering follow-up questions, maintain continuous sequence and cross-reference previous turns accurately.',
    '5. If the researcher attaches an image or highlights a specific quote from the paper, prioritize analyzing that exact excerpt.',
    '',
    '--- DOSSIER BACKGROUND DATA START ---',
  ];

  if (paper) {
    sections.push('## Research Paper Metadata');
    if (paper.title) sections.push(`- **Title:** ${paper.title}`);
    if (paper.authors && paper.authors.length > 0) sections.push(`- **Authors:** ${paper.authors.join(', ')}`);
    if (paper.publicationYear) sections.push(`- **Publication Year:** ${paper.publicationYear}`);
    if (paper.publisher) sections.push(`- **Publisher:** ${paper.publisher}`);
    if (paper.venue) sections.push(`- **Venue / Journal / Conference:** ${paper.venue}`);
    if (paper.doi) sections.push(`- **DOI:** https://doi.org/${paper.doi}`);
    if (paper.url) sections.push(`- **Canonical URL:** ${paper.url}`);
    if (paper.abstract) sections.push(`\n**Abstract:**\n${paper.abstract}\n`);
  }

  if (result) {
    if (result.summary) {
      sections.push('## Executive Research Summary');
      sections.push(result.summary);
      sections.push('');
    }

    if (result.readRecommendation) {
      const rec = result.readRecommendation;
      sections.push('## "Should I Read This Paper?" Recommendation');
      if (rec.score !== undefined) sections.push(`- **Recommendation Score:** ${rec.score}/10`);
      if (rec.difficulty) sections.push(`- **Reading Difficulty:** ${rec.difficulty}`);
      if (rec.estimatedReadingTime) sections.push(`- **Estimated Reading Time:** ${rec.estimatedReadingTime}`);
      if (rec.explanation) sections.push(`- **Editorial Analysis:** ${rec.explanation}`);
      if (rec.relevanceTopics && rec.relevanceTopics.length > 0) {
        sections.push(`- **Relevance Topics:** ${rec.relevanceTopics.join(', ')}`);
      }
      sections.push('');
    }

    if (result.openAccess) {
      sections.push('## Open Access Legal Availability');
      sections.push(`- **Open Access Available:** ${result.openAccess.available ? 'YES' : 'NO'}`);
      if (result.openAccess.sourceName) sections.push(`- **Repository Source:** ${result.openAccess.sourceName}`);
      if (result.openAccess.url) sections.push(`- **PDF Download URL:** ${result.openAccess.url}`);
      sections.push('');
    }

    if (result.keyContributions && result.keyContributions.length > 0) {
      sections.push('## Key Scientific Contributions');
      result.keyContributions.forEach((contrib, i) => {
        sections.push(`${i + 1}. ${contrib}`);
      });
      sections.push('');
    }

    if (result.researchContext) {
      sections.push('## Broader Research Context');
      sections.push(result.researchContext);
      sections.push('');
    }

    if (result.relatedConcepts && result.relatedConcepts.length > 0) {
      sections.push(`## Key Concepts & Taxonomy: ${result.relatedConcepts.join(', ')}`);
      sections.push('');
    }

    if (result.relatedPapers && result.relatedPapers.length > 0) {
      sections.push('## Related Literature & Prior Work');
      result.relatedPapers.forEach((p) => {
        const titleLink = p.url ? `[${p.title}](${p.url})` : p.title;
        const authorsStr = p.authors && p.authors.length > 0 ? ` by ${p.authors.join(', ')}` : '';
        const yearStr = p.publicationYear ? ` (${p.publicationYear})` : '';
        const venueStr = p.venue ? ` in ${p.venue}` : '';
        const citations = p.citationCount !== undefined ? ` [Citations: ${p.citationCount}]` : '';
        sections.push(`- ${titleLink}${authorsStr}${yearStr}${venueStr}${citations}`);
      });
      sections.push('');
    }

    if (result.implementations && result.implementations.length > 0) {
      sections.push('## Open-Source Code Implementations');
      result.implementations.forEach((impl) => {
        const repoLink = `[${impl.title}](${impl.repoUrl})`;
        const stars = impl.stars !== undefined ? ` [★ ${impl.stars}]` : '';
        const lang = impl.language ? ` (${impl.language})` : '';
        const official = impl.isOfficial ? ' [Official]' : '';
        sections.push(`- ${repoLink}${official}${stars}${lang}`);
      });
      sections.push('');
    }

    if (result.sources && result.sources.length > 0) {
      sections.push('## Verified Sources & Data Citations');
      result.sources.forEach((s) => {
        const verified = s.verified ? ' [Verified]' : '';
        sections.push(`- [${s.name}](${s.url}) (${s.type || 'Academic Provider'})${verified}`);
      });
      sections.push('');
    }
  }

  sections.push('--- DOSSIER BACKGROUND DATA END ---');

  return sections.join('\n');
}

/**
 * Formats conversation history into OpenAI-compatible message objects for Cerebras API
 */
export function formatCerebrasMessages(
  systemPrompt: string,
  clientMessages: Array<{
    role: 'user' | 'assistant';
    content: string;
    quotedContext?: string;
    image?: {
      url?: string;
      name?: string;
    };
  }>
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  for (const msg of clientMessages) {
    let content = msg.content || '';

    if (msg.role === 'user' && msg.quotedContext) {
      content = `> [Researcher highlighted excerpt from dossier]:\n> "${msg.quotedContext}"\n\n${content}`;
    }

    if (msg.role === 'user' && msg.image?.url) {
      content = `[Attached image: ${msg.image.name || 'image'}]\n${content}`;
    }

    messages.push({
      role: msg.role,
      content: content.trim() || '(empty message)',
    });
  }

  return messages;
}
