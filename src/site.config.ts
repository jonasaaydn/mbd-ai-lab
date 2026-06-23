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
  gaMeasurementId: 'G-BEC8KPCN74',

  // ── Google Search Console 所有権確認 ──
  // 「HTMLタグ」方式で表示される content="..." の値だけをここに貼る。
  // 例: 'abcD1234...' （空文字なら何も出力しない）
  googleSiteVerification: 'MB0fOZd-Tv_QOs64LLhOXMLfu1Ci4zZuxeJgV0UY8g8',

  // ── 収益化（空文字のあいだは該当する導線を一切表示しない）──
  // note のプロフィール / マガジン URL（例: 'https://note.com/xxxx'）。
  // 設定すると全記事の末尾とサイドバーに note 誘導 CTA が出る。
  noteUrl: '',

  // Amazon アソシエイトのストアフロント / おすすめリスト URL（例: 'https://www.amazon.co.jp/shop/xxxx'）。
  // 設定すると全記事末尾に「おすすめの技術書」ブロック（広告表記つき）が出る。
  amazonStorefrontUrl: '',

  // 相談・コンサルの問い合わせ先 URL（フォーム/メール等）。将来用。空なら非表示。
  contactUrl: '',
} as const;
