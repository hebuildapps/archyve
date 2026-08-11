import { AIProvider } from './AIProvider';
import { NormalizedPaper, ResearchResult, ResearchResultSchema } from '@archyve/shared';
import { OpenAccessResult } from '../../enrichment/unpaywall';

export class GroqProvider implements AIProvider {
  name = 'groq';

  async generateResearchResult(
    paper: NormalizedPaper,
    openAccess: OpenAccessResult,
    apiKey: string,
    model?: string
  ): Promise<ResearchResult> {
    const targetModel = model || process.env.AI_MODEL || 'llama-3.3-70b-versatile';
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const systemPrompt = `You are a premium scientific research intelligence system.
You MUST analyze the provided academic paper metadata and return a structured research dossier strictly in JSON format.
The JSON output must exactly match this structure:
{
  "summary": "A concise, editorial explanation of the paper's core premise, methodology, and outcome.",
  "keyContributions": ["contribution 1", "contribution 2"],
  "readRecommendation": {
    "score": 4.5, // Assessment score from 1.0 to 5.0
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
      "url": "optional URL or omit/null",
      "relationship": "Foundational precursor / Alternative approach / etc."
    }
  ],
  "implementations": [
    {
      "name": "Implementation name",
      "url": "https://...",
      "type": "github" | "official" | "dataset" | "other",
      "stars": 120 // optional number or null
    }
  ]
}`;

    const userPrompt = `Analyze this academic paper metadata and generate the dossier:

Title: ${paper.title}
Authors: ${paper.authors.join(', ')}
Publisher: ${paper.publisher}
Publication Year: ${paper.publicationYear || 'N/A'}
Venue: ${paper.venue || 'N/A'}
Abstract: ${paper.abstract || 'N/A'}

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
