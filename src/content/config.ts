import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    category: z.string(),
    tags: z.array(z.string()),
    tool: z.string().optional(),
    official_url: z.string().url().optional(),
    importance: z.enum(['high', 'medium', 'low']),
    summary: z.string(),
  }),
});

export const collections = { blog };
