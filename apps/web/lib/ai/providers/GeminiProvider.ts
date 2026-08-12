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
    model?: string
  ): Promise<ResearchResult> {
    const targetModel = model || process.env.AI_MODEL || 'gemini-3.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

    const prompt = `You are a premium scientific research intelligence system.
Analyze this academic paper metadata and generate a structured research dossier:

Title: ${paper.title}
Authors: ${paper.authors.join(', ')}
Publisher: ${paper.publisher}
Publication Year: ${paper.publicationYear || 'N/A'}
Venue: ${paper.venue || 'N/A'}
Abstract: ${paper.abstract || 'N/A'}

Analyze the paper's contents objectively. Help researchers evaluate whether it is worth reading.
Return the output matching the requested schema structure strictly.`;

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
