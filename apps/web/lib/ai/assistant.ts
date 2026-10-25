import { DossierContextData } from '../aws/bedrock';

export interface BYOKModel {
  id: string;
  name: string;
  shortName: string;
  provider: 'gemini' | 'groq';
  contextWindow: string;
  speed: string;
  description: string;
  supportsMedia: boolean;
}

export const BYOK_MODELS: BYOKModel[] = [
  // Google Gemini (Multimodal / Vision Enabled)
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    shortName: 'Gemini 2.5 Flash',
    provider: 'gemini',
    contextWindow: '1M tokens',
    speed: '~250 tokens/s',
    description: 'Fast, multimodal model with deep technical reasoning & image support.',
    supportsMedia: true,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    shortName: 'Gemini 2.5 Pro',
    provider: 'gemini',
    contextWindow: '2M tokens',
    speed: '~140 tokens/s',
    description: 'Advanced reasoning model for complex academic synthesis & figures.',
    supportsMedia: true,
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    shortName: 'Gemini 3.5 Flash',
    provider: 'gemini',
    contextWindow: '1M tokens',
    speed: '~280 tokens/s',
    description: 'High-throughput multimodal scientific research intelligence.',
    supportsMedia: true,
  },

  // Groq (Ultra-Fast Open Foundation Weights)
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT OSS 120B (Groq)',
    shortName: 'GPT OSS 120B',
    provider: 'groq',
    contextWindow: '131k tokens',
    speed: '~1200 tokens/s',
    description: 'Ultra-fast open reasoning model hosted on Groq LPU.',
    supportsMedia: false,
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'GPT OSS 20B (Groq)',
    shortName: 'GPT OSS 20B',
    provider: 'groq',
    contextWindow: '131k tokens',
    speed: '~1400 tokens/s',
    description: 'Lightweight high-speed reasoning model on Groq.',
    supportsMedia: false,
  },
  {
    id: 'qwen/qwen3.8-27b',
    name: 'Qwen 3.8 27B (Groq)',
    shortName: 'Qwen 3.8 27B',
    provider: 'groq',
    contextWindow: '128k tokens',
    speed: '~1100 tokens/s',
    description: 'Multilingual and technical open foundation model on Groq.',
    supportsMedia: false,
  },
];

export const DEFAULT_BYOK_MODEL = 'gemini-2.5-flash';

export function getModelById(modelId: string): BYOKModel {
  return BYOK_MODELS.find((m) => m.id === modelId) || BYOK_MODELS[0];
}

export function buildAssistantSystemPrompt(dossier?: DossierContextData): string {
  if (!dossier) {
    return 'You are Archyve Assistant, an expert academic research copilot powered by BYOK inference.';
  }

  const { paper, result } = dossier;

  const sections: string[] = [
    'You are Archyve Assistant, an academic research intelligence copilot powered by researcher BYOK inference.',
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
 * Formats conversation history into OpenAI-compatible message objects (for Groq / OpenAI compatible APIs)
 */
export function formatOpenAIMessages(
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

/**
 * Formats conversation history into Gemini-compatible contents format with multimodal inlineData
 */
export async function formatGeminiContents(
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
): Promise<Array<{ role: 'user' | 'model'; parts: Array<any> }>> {
  const contents: Array<{ role: 'user' | 'model'; parts: Array<any> }> = [];

  // Inject system prompt into first turn
  let isFirstUserTurn = true;

  for (const msg of clientMessages) {
    let text = msg.content || '';

    if (msg.role === 'user' && msg.quotedContext) {
      text = `> [Researcher highlighted excerpt from dossier]:\n> "${msg.quotedContext}"\n\n${text}`;
    }

    if (msg.role === 'user' && isFirstUserTurn) {
      text = `${systemPrompt}\n\nResearcher: ${text}`;
      isFirstUserTurn = false;
    }

    const parts: any[] = [];

    // Attach multimodal inline image data for Gemini if present
    if (msg.role === 'user' && msg.image?.url) {
      const imgUrl = msg.image.url;
      try {
        if (imgUrl.startsWith('data:')) {
          const match = imgUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            parts.push({
              inlineData: {
                mimeType: match[1],
                data: match[2],
              },
            });
          }
        } else {
          // Fetch hosted S3/R2 image and convert to base64
          const res = await fetch(imgUrl);
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            const mimeType =
              res.headers.get('content-type') ||
              (msg.image.name?.endsWith('.png') ? 'image/png' : 'image/jpeg');
            parts.push({
              inlineData: {
                mimeType,
                data: base64,
              },
            });
          }
        }
      } catch (imgErr) {
        console.warn('Failed to resolve image attachment for Gemini multimodal:', imgErr);
        text = `[Attached image: ${msg.image.name || 'image'}]\n${text}`;
      }
    }

    parts.push({ text: text.trim() || '(empty message)' });

    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts,
    });
  }

  return contents;
}
