import { z } from 'zod';

export const SourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  type: z.enum(['publisher', 'crossref', 'openalex', 'arxiv', 'unpaywall', 'github', 'community']),
  confidence: z.number().min(0).max(1).optional(),
});

export type Source = z.infer<typeof SourceSchema>;
