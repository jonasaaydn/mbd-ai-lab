// 学生フォーミュラ記事を「開発テーマ」別に自動分類するための定義。
// 記事の title / slug / tags にキーワードが含まれるかで判定する（上から順に最初に一致したテーマに振り分け）。
// 新しい記事が増えても、このマッピングに沿って自動でガイドに反映される。

export interface StudentTheme {
  key: string;
  label: string;       // セクション見出し
  phase: string;       // 開発フェーズ（設計/シミュレーション/テスト/改善 など）
  description: string;  // このテーマでAIが何を解決するか（学生向け一言）
  keywords: string[];   // タイトル等に含まれていれば該当
}

// 判定はこの配列の上から順（最初に一致したテーマに振り分け）。
// 「コードレビュー系」が「制御(Simulink)」に吸われないよう、汎用テーマより専門テーマを上に置く。
export const STUDENT_THEMES: StudentTheme[] = [
  {
    key: 'aero-cfd',
    label: '空力・CFD',
    phase: '設計・シミュレーション',
    description: 'ウィングやディフューザーの流体解析。AIサロゲートで数時間のCFDを数分〜数秒に短縮します。',
    keywords: ['CFD', '空力', 'ウィング', 'ディフューザー', 'エアロ', '揚力', 'ダウンフォース', 'aero', 'FNO', '流れ場', 'PhysicsAI', 'DoMINO', 'PhysicsNeMo', 'STAR-CCM', 'PyFluent', 'Foam', 'DrivAer'],
  },
  {
    key: 'structure-fem',
    label: '構造・FEM・軽量化',
    phase: '設計・最適化',
    description: 'アップライトやギアボックスの応力解析・トポロジー最適化。少ないFEAデータで軽量化を狙います。',
    keywords: ['アップライト', 'トポロジー', 'FEA', 'FEM', '軽量化', 'ギアボックス', '応力', 'ハードポイント', 'ジオメトリ', 'HyperWorks', 'optiSLang', 'HEEDS', 'Mechanical'],
  },
  {
    key: 'codequality',
    label: '開発環境・コード品質・CI',
    phase: '開発プロセス',
    description: 'MATLAB/Simulinkコードのレビュー・テスト自動生成・CI構築でチーム開発を効率化します。',
    keywords: ['レビュー', 'リファクタリング', 'SILテスト', 'SIL', 'CAPL', 'GitHub Actions', '波及', 'Amazon Q', 'Augment', 'Sourcegraph'],
  },
  {
    key: 'thermal-ev',
    label: '熱・EV・パワートレイン',
    phase: 'シミュレーション',
    description: 'バッテリー・ブレーキ・モーターの熱解析。PINNやメタモデルでリアルタイム予測します。',
    keywords: ['バッテリー', '熱', '冷却', '温度', 'EV', 'パワートレイン', 'AmeSim', 'DeepXDE', 'COMSOL'],
  },
  {
    key: 'engine',
    label: 'エンジン・ECU',
    phase: 'キャリブレーション',
    description: '吸気チューニング・点火マップ・キャリブレーションをAIで最小計測点から作成します。',
    keywords: ['エンジン', '点火', '吸気', 'キャリブレーション', 'ASCMO', 'GT-SUITE', 'ignition'],
  },
  {
    key: 'tire',
    label: 'タイヤ・車両同定',
    phase: 'モデル同定',
    description: '走行データからPacejkaタイヤ係数や運動方程式を自動同定します。',
    keywords: ['Pacejka', 'Deep Dynamics', 'SINDy', '係数を自動同定', 'タイヤ係数'],
  },
  {
    key: 'data-telemetry',
    label: '走行データ解析・テレメトリ',
    phase: 'テスト後の解析',
    description: 'テスト走行のCSV・ログをAIが自動解析し、改善点レポートを生成します。',
    keywords: ['テレメトリ', '走行データ', 'ラップ', 'ログ', '解析レポート', '異常検知', 'CSV', 'DuckDB', 'telemetry', 'Jules', '夜間', '並列'],
  },
  {
    key: 'control-mbd',
    label: '制御・MBD・Simulink',
    phase: 'モデル開発',
    description: 'トラクション・ヨーレート・回生ブレーキ等の制御則設計とSimulinkモデル構築をAIが支援します。',
    keywords: ['制御', 'トラクション', 'ヨー', 'MPC', 'Simulink', '車両ダイナミクス', '回生', 'FMU', 'Copilot', 'Agentic Toolkit', 'SimuGen', 'Collimator', 'ECU'],
  },
  {
    key: 'research',
    label: '研究・情報収集・知識管理',
    phase: 'リサーチ',
    description: '論文サーベイ・知識ベース構築・セットアップ最適化など、開発の土台づくりをAIで加速します。',
    keywords: ['論文', 'サーベイ', '知識ベース', 'Research', 'NotebookLM', 'セットアップ', '実験管理', 'MLflow', 'Elicit', 'Perplexity', 'Monolith'],
  },
];

const FALLBACK_THEME: StudentTheme = {
  key: 'other',
  label: 'その他の実践例',
  phase: '',
  description: 'さまざまなAIツールの学生フォーミュラ応用例。',
  keywords: [],
};

/** 記事1件をテーマに分類する（最初に一致したテーマ。なければ その他）。 */
export function classifyStudentArticle(haystack: string): StudentTheme {
  const text = haystack.toLowerCase();
  for (const theme of STUDENT_THEMES) {
    if (theme.keywords.some((kw) => text.includes(kw.toLowerCase()))) {
      return theme;
    }
  }
  return FALLBACK_THEME;
}

export const ALL_THEMES_WITH_FALLBACK = [...STUDENT_THEMES, FALLBACK_THEME];
