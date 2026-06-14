// サイト全体の設定（SEO・計測まわり）
export const SITE = {
  origin: 'https://jonasaaydn.github.io',
  base: '/mbd-ai-lab',
  title: 'MBD×AI Lab',
  description:
    'レース車両開発エンジニア・学生フォーミュラチーム向け AI ツール情報ブログ。MBD・Simulink・CAE・走行データ解析に役立つ最新 AI 情報を発信。',

  // ── Google Analytics 4 ──
  // 測定ID（例: 'G-XXXXXXXXXX'）を入れると自動で計測タグが有効になる。
  // 空文字のあいだは一切タグを出力しない（プライバシー・パフォーマンスに影響なし）。
  gaMeasurementId: '',

  // ── Google Search Console 所有権確認 ──
  // 「HTMLタグ」方式で表示される content="..." の値だけをここに貼る。
  // 例: 'abcD1234...' （空文字なら何も出力しない）
  googleSiteVerification: '',
} as const;
