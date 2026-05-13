export const CATEGORIES = [
  'AI Coding',
  'MBD / Simulink',
  'CAE / Simulation AI',
  'Research AI',
  'Race Engineering Use Cases',
  'Weekly AI Update',
  'Tool Comparison',
] as const;

export type Category = (typeof CATEGORIES)[number];

export function categoryToSlug(category: string): string {
  return category
    .toLowerCase()
    .replace(/\s*\/\s*/g, '-')
    .replace(/\s+/g, '-');
}

export function slugToCategory(slug: string): string {
  return CATEGORIES.find((c) => categoryToSlug(c) === slug) ?? slug;
}

export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'AI Coding': 'AIを活用したコーディング支援ツールの活用事例・レビュー',
  'MBD / Simulink': 'モデルベース開発・Simulink関連のAI活用情報',
  'CAE / Simulation AI': 'CAE・シミュレーション領域のAI活用・サロゲートモデル',
  'Research AI': 'AI研究・論文・技術動向の解説',
  'Race Engineering Use Cases': 'レース車両開発エンジニアリングへのAI応用事例',
  'Weekly AI Update': '週次AIツール更新情報まとめ',
  'Tool Comparison': 'AIツールの比較・評価',
};
