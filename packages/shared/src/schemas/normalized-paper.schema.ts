import { z } from 'zod';

export const NormalizedPaperSchema = z.object({
  title: z.string(),
  authors: z.array(z.string()),
  doi: z.string().nullable().optional(),
  publisher: z.string(),
  publicationYear: z.number().nullable().optional(),
  venue: z.string().nullable().optional(),
  url: z.string().url(),
  abstract: z.string().nullable().optional(),
  publisherId: z.string().nullable().optional(),
  confidenceScore: z.number().min(0).max(1).default(1),
});

export type NormalizedPaper = z.infer<typeof NormalizedPaperSchema>;
