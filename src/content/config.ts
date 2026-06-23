import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    category: z.string(),
    tags: z.array(z.string()),
    tool: z.string().optional(),
    // 自動記事ルーティンが URL の無い記事に official_url: "" を出力するため、
    // 空文字列・空白のみは「未指定(undefined)」として扱い、ビルドが落ちないようにする。
    // 値がある場合のみ URL 形式を検証する。
    official_url: z.preprocess(
      (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
      z.string().url().optional()
    ),
    importance: z.enum(['high', 'medium', 'low']),
    summary: z.string(),
  }),
});

export const collections = { blog };
