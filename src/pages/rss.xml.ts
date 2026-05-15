import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('blog');
  const sorted = posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: 'MBD×AI Lab',
    description: 'レース車両MBDエンジニア向けAIツール情報ブログ。MATLAB・Simulink・CAE・走行データ解析に役立つAI最新情報を発信。',
    site: context.site!,
    items: sorted.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.summary,
      link: `/mbd-ai-lab/blog/${post.slug}/`,
      categories: [post.data.category, ...(post.data.tags ?? [])],
    })),
    customData: '<language>ja</language>',
  });
}
