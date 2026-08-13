import { AIProvider } from './AIProvider';
import { NormalizedPaper, ResearchResult, ResearchResultSchema } from '@archyve/shared';
import { OpenAccessResult } from '../../enrichment/unpaywall';

// Google Gemini response schema matching Zod ResearchResult exactly
const geminiResponseSchema = {
  type: "OBJECT",
  properties: {
    summary: {
      type: "STRING",
      description: "A concise, editorial explanation of the paper's core premise, methodology, and outcome."
    },
    keyContributions: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "List of the most significant novel contributions made by the paper."
    },
    readRecommendation: {
      type: "OBJECT",
      properties: {
        score: {
          type: "NUMBER",
          description: "An assessment score from 1.0 (least relevant) to 5.0 (highly recommended/foundational)."
        },
        explanation: {
          type: "STRING",
          description: "A short, persuasive argument for why or why not a researcher should invest time reading this paper."
        },
        relevanceTopics: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Specific technical domains or keywords where this paper is highly relevant (e.g. Transformers, NLP, attention mechanisms)."
        },
        difficulty: {
          type: "STRING",
          enum: ["beginner", "intermediate", "advanced"],
          description: "Technical reading difficulty assessment."
        },
        estimatedReadingTime: {
          type: "STRING",
          description: "Approximate reading time estimate (e.g. '15-20 min')."
        }
      },
      required: ["score", "explanation", "relevanceTopics", "difficulty", "estimatedReadingTime"]
    },
    researchContext: {
      type: "STRING",
      description: "Explains where this paper fits into its broader scientific domain and literature."
    },
    relatedConcepts: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "List of related academic concepts or theories relevant to understanding this paper."
    },
    relatedPapers: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          authors: { type: "ARRAY", items: { type: "STRING" } },
          url: { type: "STRING", description: "URL to learn more if known, or omit." },
          relationship: { type: "STRING", description: "Brief relationship description (e.g. 'Foundational precursor', 'Alternative approach')." }
        },
        required: ["title", "authors"]
      },
      description: "List of highly related papers in the domain."
    },
    implementations: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          url: { type: "STRING" },
          type: { type: "STRING", enum: ["github", "official", "dataset", "other"] },
          stars: { type: "INTEGER" }
        },
        required: ["name", "url", "type"]
      },
      description: "Code implementations or official datasets related to the paper (such as GitHub links)."
    }
  },
  required: [
    "summary",
    "keyContributions",
    "readRecommendation",
    "researchContext",
    "relatedConcepts",
    "relatedPapers",
    "implementations"
  ]
};

export class GeminiProvider implements AIProvider {
  name = 'gemini';

  async generateResearchResult(
    paper: NormalizedPaper,
    openAccess: OpenAccessResult,
    apiKey: string,
    model?: string,
    relatedPapers: any[] = [],
    implementations: any[] = []
  ): Promise<ResearchResult> {
    const targetModel = model || process.env.AI_MODEL || 'gemini-3.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

    // Format retrieved records as context
    const relatedPapersContext = relatedPapers.length > 0
      ? relatedPapers.map((p, i) => `[Paper #${i + 1}]
Title: ${p.title}
Authors: ${p.authors.join(', ')}
URL: ${p.url || 'N/A'}
DOI: ${p.doi || 'N/A'}
Publication Year: ${p.publicationYear || 'N/A'}
Venue: ${p.venue || 'N/A'}`).join('\n\n')
      : 'NO RELATED PAPERS FOUND.';

    const implementationsContext = implementations.length > 0
      ? implementations.map((impl, i) => `[Repo #${i + 1}]
Name: ${impl.name}
URL: ${impl.url}
Type: ${impl.type}
Stars: ${impl.stars}`).join('\n\n')
      : 'NO CODE IMPLEMENTATIONS FOUND.';

    const prompt = `You are a premium scientific research intelligence system.
Analyze this academic paper metadata and generate a structured research dossier:

Title: ${paper.title}
Authors: ${paper.authors.join(', ')}
Publisher: ${paper.publisher}
Publication Year: ${paper.publicationYear || 'N/A'}
Venue: ${paper.venue || 'N/A'}
Abstract: ${paper.abstract || 'N/A'}

---
RETRIEVED CONTEXT (Only select from these lists. DO NOT invent or hallucinate other entries):

VERIFIED RELATED LITERATURE:
${relatedPapersContext}

VERIFIED CODE IMPLEMENTATIONS/REPOSITORIES:
${implementationsContext}

---
CRITICAL INSTRUCTIONS FOR RETRIEVED CONTEXT:
1. For 'relatedPapers' in the JSON schema, you MUST only use papers listed under 'VERIFIED RELATED LITERATURE' above. Do not invent any new papers or URLs. If 'NO RELATED PAPERS FOUND' is indicated, you MUST return an empty array [].
2. For 'implementations' in the JSON schema, you MUST only use repositories listed under 'VERIFIED CODE IMPLEMENTATIONS/REPOSITORIES' above. Do not invent any new repositories or URLs. If 'NO CODE IMPLEMENTATIONS FOUND' is indicated, you MUST return an empty array [].
3. Analyze the paper's contents objectively. Help researchers evaluate whether it is worth reading.
4. Return the output matching the requested schema structure strictly.`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: geminiResponseSchema,
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText} (${response.status})`);
    }

    const resJson = await response.json();
    const textOutput = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textOutput) {
      throw new Error('Empty output from Gemini API');
    }

    const parsedData = JSON.parse(textOutput);

    // Post-generation validation layer: filter out any candidates not matching verified retrieval results
    const verifiedRelated: any[] = [];
    if (Array.isArray(parsedData.relatedPapers) && relatedPapers.length > 0) {
      for (const p of parsedData.relatedPapers) {
        // Find match by title similarity
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
        // Find match by URL
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
