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

export const CATEGORY_COLORS: Record<string, { from: string; to: string; label: string }> = {
  'AI Coding':                   { from: '#1e3a8a', to: '#312e81', label: 'AI CODE' },
  'MBD / Simulink':              { from: '#4c1d95', to: '#1e3a8a', label: 'MBD' },
  'CAE / Simulation AI':         { from: '#064e3b', to: '#0c4a6e', label: 'CAE' },
  'Research AI':                 { from: '#78350f', to: '#7c2d12', label: 'RESEARCH' },
  'Race Engineering Use Cases':  { from: '#7f1d1d', to: '#0f172a', label: 'RACE ENG' },
  'Weekly AI Update':            { from: '#134e4a', to: '#164e63', label: 'UPDATE' },
  'Tool Comparison':             { from: '#1e293b', to: '#334155', label: 'VS' },
};

export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'AI Coding': 'AIを活用したコーディング支援ツールの活用事例・レビュー',
  'MBD / Simulink': 'モデルベース開発・Simulink関連のAI活用情報',
  'CAE / Simulation AI': 'CAE・シミュレーション領域のAI活用・サロゲートモデル',
  'Research AI': 'AI研究・論文・技術動向の解説',
  'Race Engineering Use Cases': 'レース車両開発エンジニアリングへのAI応用事例',
  'Weekly AI Update': '週次AIツール更新情報まとめ',
  'Tool Comparison': 'AIツールの比較・評価',
};
