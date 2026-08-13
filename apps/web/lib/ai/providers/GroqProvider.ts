import { AIProvider } from './AIProvider';
import { NormalizedPaper, ResearchResult, ResearchResultSchema } from '@archyve/shared';
import { OpenAccessResult } from '../../enrichment/unpaywall';

export class GroqProvider implements AIProvider {
  name = 'groq';

  async generateResearchResult(
    paper: NormalizedPaper,
    openAccess: OpenAccessResult,
    apiKey: string,
    model?: string,
    relatedPapers: any[] = [],
    implementations: any[] = []
  ): Promise<ResearchResult> {
    const targetModel = model || process.env.AI_MODEL || 'llama-3.3-70b-versatile';
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    // Format retrieved records as context
    const relatedPapersContext = relatedPapers.length > 0
      ? relatedPapers.map((p, i) => `[Paper #${i + 1}]
Title: ${p.title}
Authors: ${p.authors.join(', ')}
URL: ${p.url || 'N/A'}
DOI: ${p.doi || 'N/A'}`).join('\n\n')
      : 'NO RELATED PAPERS FOUND.';

    const implementationsContext = implementations.length > 0
      ? implementations.map((impl, i) => `[Repo #${i + 1}]
Name: ${impl.name}
URL: ${impl.url}
Type: ${impl.type}
Stars: ${impl.stars}`).join('\n\n')
      : 'NO CODE IMPLEMENTATIONS FOUND.';
 
    const systemPrompt = `You are a premium scientific research intelligence system.
You MUST analyze the provided academic paper metadata and return a structured research dossier strictly in JSON format.
The JSON output must exactly match this structure:
{
  "summary": "A concise, editorial explanation of the paper's core premise, methodology, and outcome.",
  "keyContributions": ["contribution 1", "contribution 2"],
  "readRecommendation": {
    "score": 4.5,
    "explanation": "A short, persuasive argument for why or why not a researcher should invest time reading this paper.",
    "relevanceTopics": ["topic 1", "topic 2"],
    "difficulty": "beginner" | "intermediate" | "advanced",
    "estimatedReadingTime": "15-20 min"
  },
  "researchContext": "Explains where this paper fits into its broader scientific domain and literature.",
  "relatedConcepts": ["concept 1", "concept 2"],
  "relatedPapers": [
    {
      "title": "Related paper title",
      "authors": ["author 1", "author 2"],
      "url": "URL",
      "relationship": "Foundational precursor / Alternative approach / etc."
    }
  ],
  "implementations": [
    {
      "name": "Implementation name",
      "url": "https://...",
      "type": "github" | "official" | "dataset" | "other",
      "stars": 120
    }
  ]
}

---
CRITICAL PROVENANCE AND CLAIM SAFETY RULES:
1. Do NOT present AI inference or synthesis as direct statements from the authors. Use qualifying language when interpreting (e.g., "The abstract indicates...", "Based on the text, the authors propose...").
2. Do NOT invent or guess any facts, publication years, DOIs, authors, or quantitative results (e.g., specific measurement metrics or decibels) that are not directly supported by the target paper metadata and abstract.
3. For 'relatedPapers', you MUST only select from the list under VERIFIED RELATED LITERATURE below. For each, preserve their title/authors exactly, and describe their relationship to our main paper. Do not invent any new papers or URLs. If 'NO RELATED PAPERS FOUND' is indicated, return an empty array [].
4. For 'implementations', you MUST only select from the list under VERIFIED CODE IMPLEMENTATIONS/REPOSITORIES below. Do not invent any new repositories or URLs. If 'NO CODE IMPLEMENTATIONS FOUND' is indicated, return an empty array [].`;
 
    const userPrompt = `Analyze this academic paper metadata and generate the dossier:
 
Title: ${paper.title}
Authors: ${paper.authors.join(', ')}
Publisher: ${paper.publisher}
Publication Year: ${paper.publicationYear || 'N/A'}
Venue: ${paper.venue || 'N/A'}
Abstract: ${paper.abstract || 'N/A'}

---
VERIFIED RELATED LITERATURE:
${relatedPapersContext}

---
VERIFIED CODE IMPLEMENTATIONS/REPOSITORIES:
${implementationsContext}
 
Return the output matching the requested JSON structure strictly. Do not include markdown wraps like \`\`\`json.`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText} (${response.status})`);
    }

    const resJson = await response.json();
    const textOutput = resJson.choices?.[0]?.message?.content;

    if (!textOutput) {
      throw new Error('Empty output from Groq API');
    }

    const parsedData = JSON.parse(textOutput);

    // Sanitize outputs
    const verifiedRelated: any[] = [];
    if (Array.isArray(parsedData.relatedPapers) && relatedPapers.length > 0) {
      for (const p of parsedData.relatedPapers) {
        const match = relatedPapers.find(
          (ref) => ref.title.toLowerCase().replace(/[^a-z0-9]/g, '') === p.title.toLowerCase().replace(/[^a-z0-9]/g, '')
        );
        if (match) {
          verifiedRelated.push({
            title: match.title,
            authors: match.authors,
            url: match.url || p.url || '',
            relationship: p.relationship || 'Related literature reference',
          });
        }
      }
    }

    const verifiedImpls: any[] = [];
    if (Array.isArray(parsedData.implementations) && implementations.length > 0) {
      for (const impl of parsedData.implementations) {
        const match = implementations.find(
          (ref) => ref.url.toLowerCase().trim() === impl.url.toLowerCase().trim()
        );
        if (match) {
          verifiedImpls.push({
            name: match.name,
            url: match.url,
            type: match.type,
            stars: match.stars,
          });
        }
      }
    }

    parsedData.relatedPapers = verifiedRelated;
    parsedData.implementations = verifiedImpls;

    // Merge in the open access details and an empty sources array
    const fullResult = {
      ...parsedData,
      openAccess: {
        available: openAccess.available,
        sourceName: openAccess.sourceName || null,
        url: openAccess.url || null,
      },
      sources: [],
    };

    // Strict validation using the Zod schema
    return ResearchResultSchema.parse(fullResult);
  }
}
