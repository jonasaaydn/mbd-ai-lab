#!/usr/bin/env node
/**
 * MBD×AI Lab — 自動記事生成スクリプト
 * 毎日 GitHub Actions から呼ばれ、Claude API で新記事を生成して
 * src/content/blog/ に書き出す。
 */
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = path.join(__dirname, '..', 'src', 'content', 'blog');

const CATEGORIES = [
  'AI Coding',
  'MBD / Simulink',
  'CAE / Simulation AI',
  'Research AI',
  'Race Engineering Use Cases',
  'Weekly AI Update',
  'Tool Comparison',
];

function getExistingArticles() {
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, f), 'utf-8');
      const title = raw.match(/^title:\s*"(.+)"/m)?.[1] ?? f;
      const tool = raw.match(/^tool:\s*"(.+)"/m)?.[1] ?? '';
      const category = raw.match(/^category:\s*"(.+)"/m)?.[1] ?? '';
      return { title, tool, category };
    });
}

function buildMarkdown(data) {
  const { slug: _slug, title, date, category, tags, tool, official_url, importance, summary, content } = data;
  const lines = [
    '---',
    `title: "${title}"`,
    `date: ${date}`,
    `category: "${category}"`,
    `tags: [${tags.map((t) => `"${t}"`).join(', ')}]`,
  ];
  if (tool) lines.push(`tool: "${tool}"`);
  if (official_url) lines.push(`official_url: "${official_url}"`);
  lines.push(`importance: "${importance}"`, `summary: "${summary}"`, '---', '', content.trim(), '');
  return lines.join('\n');
}

function parseJson(text) {
  // ```json ... ``` ブロックがある場合も対応
  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  return JSON.parse(fenced ? fenced[1] : text.trim());
}

async function main() {
  const client = new Anthropic();

  const existing = getExistingArticles();
  const today = new Date().toISOString().split('T')[0];
  const existingList = existing
    .map((a) => `- "${a.title}" (カテゴリ: ${a.category}${a.tool ? ', ツール: ' + a.tool : ''})`)
    .join('\n');

  const systemPrompt = `あなたはレース車両MBD（モデルベース開発）エンジニア向けAIツール情報ブログの専門ライターです。
MATLAB/Simulinkを日常的に使う自動車・レース車両開発エンジニアが対象読者です。
技術的に正確で、実務に即した具体例のある記事を書いてください。
必ず有効なJSONのみで回答してください（コードブロック・説明文は不要）。`;

  const userPrompt = `すでに公開済みの記事：
${existingList}

【重複しない新しいトピック】でMBDエンジニアに有益な記事を1本書いてください。

以下のJSONフォーマットで返してください：
{
  "slug": "英数字とハイフンのみ（例: matlab-github-copilot-2026）",
  "title": "記事タイトル（日本語、魅力的に）",
  "date": "${today}",
  "category": "${CATEGORIES.join(' / ')} のいずれか完全一致",
  "tags": ["タグ1","タグ2","タグ3","タグ4","タグ5"],
  "tool": "対象ツール名（なければ省略）",
  "official_url": "実在する公式URL（不確かなら省略）",
  "importance": "high | medium | low",
  "summary": "1〜2文の概要",
  "content": "記事本文（Markdown、見出し・コード例・具体的手順を含む、2000〜3000文字程度）"
}

注意：
- categoryは上記リストから完全一致で1つ選ぶ
- official_urlは実在が確実なもののみ記載（不明なら省略）
- contentには実際に使えるコードスニペットや手順を必ず含める
- すでに書いたトピックと内容が重複しないこと`;

  console.log('Claude API を呼び出し中...');

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const responseText =
    message.content[0]?.type === 'text' ? message.content[0].text : '';

  if (!responseText) {
    throw new Error('Claude からの応答が空です');
  }

  const data = parseJson(responseText);

  // バリデーション
  const required = ['slug', 'title', 'date', 'category', 'tags', 'importance', 'summary', 'content'];
  for (const key of required) {
    if (!data[key]) throw new Error(`必須フィールドが欠けています: ${key}`);
  }
  if (!CATEGORIES.includes(data.category)) {
    // 近いカテゴリに自動補正
    const matched = CATEGORIES.find((c) =>
      c.toLowerCase().includes(data.category.toLowerCase().split(' ')[0])
    );
    if (matched) {
      console.warn(`カテゴリを補正: "${data.category}" → "${matched}"`);
      data.category = matched;
    } else {
      throw new Error(`無効なカテゴリ: ${data.category}`);
    }
  }

  const filename = `${data.slug}.md`;
  const filepath = path.join(BLOG_DIR, filename);

  if (fs.existsSync(filepath)) {
    // 同名ファイルが存在する場合は日付サフィックスを付ける
    const alt = `${data.slug}-${Date.now()}.md`;
    console.warn(`ファイルが存在するためリネーム: ${filename} → ${alt}`);
    data.slug = `${data.slug}-${Date.now()}`;
  }

  const markdown = buildMarkdown(data);
  fs.writeFileSync(filepath, markdown, 'utf-8');

  console.log(`✅ 記事を生成しました: ${filename}`);
  console.log(`   タイトル: ${data.title}`);
  console.log(`   カテゴリ: ${data.category}`);

  // GitHub Actions 出力変数
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `filename=${filename}\ntitle=${data.title}\n`);
  }
}

main().catch((err) => {
  console.error('エラー:', err.message);
  process.exit(1);
});
