import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
  Message,
  ContentBlock,
  ImageFormat,
} from '@aws-sdk/client-bedrock-runtime';

export interface DossierContextData {
  paper?: {
    title?: string;
    authors?: string[];
    publisher?: string;
    publicationYear?: number;
    venue?: string;
    doi?: string;
    url?: string;
    abstract?: string;
  };
  result?: {
    summary?: string;
    readRecommendation?: {
      score?: number;
      explanation?: string;
      relevanceTopics?: string[];
      difficulty?: string;
      estimatedReadingTime?: string;
    };
    openAccess?: {
      available?: boolean;
      sourceName?: string;
      url?: string;
    };
    keyContributions?: string[];
    researchContext?: string;
    relatedConcepts?: string[];
    relatedPapers?: Array<{
      title: string;
      authors?: string[];
      publicationYear?: number;
      venue?: string;
      citationCount?: number;
      url?: string;
      doi?: string;
    }>;
    implementations?: Array<{
      title: string;
      repoUrl: string;
      stars?: number;
      language?: string;
      isOfficial?: boolean;
    }>;
    sources?: Array<{
      name: string;
      url: string;
      type?: string;
      verified?: boolean;
    }>;
  };
}

export function isAwsConfigured(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  );
}

export function getBedrockModelId(): string {
  // Default to Anthropic Claude 3 Haiku on AWS Bedrock (multimodal, fast, economical)
  // Can also be set to amazon.nova-lite-v1:0, amazon.titan-text-express-v1, etc.
  return process.env.AWS_BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0';
}

export function getBedrockClient(): BedrockRuntimeClient {
  const region = process.env.AWS_REGION || 'us-east-1';
  const credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  } = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  };

  if (process.env.AWS_SESSION_TOKEN) {
    credentials.sessionToken = process.env.AWS_SESSION_TOKEN;
  }

  return new BedrockRuntimeClient({
    region,
    credentials,
  });
}

/**
 * Serializes the full dossier content into a comprehensive markdown system prompt
 * so that the Bedrock model has 100% background access to all paper text, contributions,
 * open access links, GitHub repos, and citations.
 */
export function buildDossierSystemPrompt(dossier?: DossierContextData): string {
  if (!dossier) {
    return 'You are Archyve Assistant, an expert academic research copilot. ';
  }

  const { paper, result } = dossier;

  const sections: string[] = [
    'You are Archyve Assistant, an intelligent academic research copilot.',
    'You have direct, background access to the entire research dossier currently opened by the researcher.',
    'Carefully cross-reference the dossier information, literature citations, open-access repositories, and code implementations below when answering.',
    '',
    '### Guidelines for Responses:',
    '1. Format with clean, rich Markdown (headers, bullet points, numbered lists, blockquotes, code snippets).',
    '2. Use proper typographic em-dashes (—) instead of double hyphens (--).',
    '3. When referencing external links, papers, or code repositories, format them as clean markdown links: `[Anchor Text](URL)`.',
    '4. When answering questions referring to prior turns in our conversation, maintain continuous sequence and cross-reference previous discussions accurately.',
    '5. If the researcher attaches an image (e.g., figure, chart, formula, diagram from the paper), analyze it deeply in relation to the paper methodology.',
    '6. If the user highlighted a specific quote from the paper, pay special attention to analyzing that exact excerpt.',
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
 * Formats user and assistant message turns for AWS Bedrock Converse API.
 * Ensures alternating roles, attaches image blocks if provided, and injects quoted text.
 */
export function formatBedrockMessages(
  clientMessages: Array<{
    role: 'user' | 'assistant';
    content: string;
    quotedContext?: string;
    image?: {
      base64?: string;
      type?: string;
      s3Url?: string;
    };
  }>
): Message[] {
  const bedrockMessages: Message[] = [];

  for (let i = 0; i < clientMessages.length; i++) {
    const msg = clientMessages[i];
    const contentBlocks: ContentBlock[] = [];

    // If message includes an image, add it as a multimodal image block in Bedrock Converse
    if (msg.role === 'user' && msg.image?.base64) {
      try {
        const rawBase64 = msg.image.base64.replace(/^data:image\/[a-z]+;base64,/, '');
        const buffer = Buffer.from(rawBase64, 'base64');
        const format: ImageFormat = msg.image.type?.includes('png') ? 'png' : 'jpeg';

        contentBlocks.push({
          image: {
            format,
            source: {
              bytes: new Uint8Array(buffer),
            },
          },
        });
      } catch (e) {
        console.warn('Failed to parse base64 image for Bedrock:', e);
      }
    }

    // Build the text block
    let text = msg.content || '';
    if (msg.role === 'user' && msg.quotedContext) {
      text = `> [Researcher highlighted excerpt from dossier]:\n> "${msg.quotedContext}"\n\n${text}`;
    }

    if (text.trim()) {
      contentBlocks.push({ text: text.trim() });
    } else if (contentBlocks.length === 0) {
      contentBlocks.push({ text: '(empty message)' });
    }

    // Bedrock requires alternating roles. If same role repeats, merge with previous
    const previous = bedrockMessages[bedrockMessages.length - 1];
    if (previous && previous.role === msg.role) {
      if (previous.content) {
        previous.content.push(...contentBlocks);
      }
    } else {
      bedrockMessages.push({
        role: msg.role,
        content: contentBlocks,
      });
    }
  }

  // Bedrock Converse requires first message to have role 'user'
  if (bedrockMessages.length > 0 && bedrockMessages[0].role !== 'user') {
    bedrockMessages.unshift({
      role: 'user',
      content: [{ text: 'Hello assistant' }],
    });
  }

  return bedrockMessages;
}
