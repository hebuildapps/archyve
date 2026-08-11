import { z } from 'zod';
import { SourceSchema } from './source.schema';

export const ResearchResultSchema = z.object({
  summary: z.string(),
  keyContributions: z.array(z.string()),
  readRecommendation: z.object({
    score: z.number().min(1).max(5),
    explanation: z.string(),
    relevanceTopics: z.array(z.string()),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    estimatedReadingTime: z.string(),
  }),
  openAccess: z.object({
    available: z.boolean(),
    sourceName: z.string().nullable().optional(),
    url: z.string().url().nullable().optional(),
  }),
  researchContext: z.string(),
  relatedConcepts: z.array(z.string()),
  relatedPapers: z.array(
    z.object({
      title: z.string(),
      authors: z.array(z.string()),
      url: z.string().url().optional(),
      relationship: z.string().optional(),
    })
  ).default([]),
  implementations: z.array(
    z.object({
      name: z.string(),
      url: z.string().url(),
      type: z.enum(['github', 'official', 'dataset', 'other']),
      stars: z.number().nullable().optional(),
    })
  ).default([]),
  sources: z.array(SourceSchema).default([]),
});

export type ResearchResult = z.infer<typeof ResearchResultSchema>;
