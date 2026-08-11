import { z } from 'zod';

export const PaperRequestSchema = z.object({
  url: z.string().url(),
  source: z.enum(['ieee', 'springer', 'elsevier', 'jstor', 'arxiv', 'unknown']),
  trigger: z.enum(['icon', 'context_menu', 'shortcut', 'url_prepend']),
  timestamp: z.string().datetime(),
});

export type PaperRequest = z.infer<typeof PaperRequestSchema>;
