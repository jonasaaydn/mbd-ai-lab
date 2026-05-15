export interface Tool {
  name: string;
  developer: string;
  category: string;
  description: string;
  official_url: string;
  use_cases: string[];
  mbd_relevance: 'high' | 'medium' | 'low';
  tags: string[];
}

export const tools: Tool[] = [
  {
    name: 'Claude',
    developer: 'Anthropic',
    category: 'LLM / Assistant',
    description:
      'Anthropicの最先端AIアシスタント。長文理解、コード生成、技術文書の要約・翻訳に優れ、複雑な工学的問題の思考整理にも活用できる。',
    official_url: 'https://claude.ai',
    use_cases: ['技術ドキュメント生成', 'コードレビュー', '要件定義の整理', '走行データの解釈補助'],
    mbd_relevance: 'high',
    tags: ['LLM', 'Assistant', 'Coding'],
  },
  {
    name: 'Claude Code',
    developer: 'Anthropic',
    category: 'AI Coding Agent',
    description:
      'ターミナルベースのAIコーディングエージェント。ファイル操作・スクリプト自動化・リファクタリングを自律的に実行。MATLABスクリプトやPythonデータ解析の自動化に活用できる。',
    official_url: 'https://claude.ai/code',
    use_cases: ['MATLABスクリプト自動化', 'テスト生成', 'ドキュメント作成', 'データ解析パイプライン構築'],
    mbd_relevance: 'high',
    tags: ['Coding Agent', 'Automation', 'CLI'],
  },
  {
    name: 'ChatGPT',
    developer: 'OpenAI',
    category: 'LLM / Assistant',
    description:
      'OpenAIの汎用AIアシスタント。GPT-4oによる画像・音声・テキストのマルチモーダル処理が可能。幅広いユースケースに対応する。',
    official_url: 'https://chatgpt.com',
    use_cases: ['技術質問', '文書作成', '画像からの図面解析', 'プレゼン資料作成'],
    mbd_relevance: 'medium',
    tags: ['LLM', 'Multimodal', 'Assistant'],
  },
  {
    name: 'GitHub Copilot',
    developer: 'GitHub / Microsoft',
    category: 'AI Coding',
    description:
      'IDEに統合されたAIコーディングアシスタント。リアルタイムのコード補完とChat機能でMATLAB/Pythonスクリプト開発を加速する。',
    official_url: 'https://github.com/features/copilot',
    use_cases: ['コード補完', 'テスト自動生成', 'コメント生成', 'バグ修正支援'],
    mbd_relevance: 'medium',
    tags: ['Coding', 'IDE', 'Autocomplete'],
  },
  {
    name: 'Gemini',
    developer: 'Google DeepMind',
    category: 'LLM / Assistant',
    description:
      'Googleの大規模マルチモーダルAI。長大なコンテキストウィンドウ（最大100万トークン）を持ち、大量のデータや文書を一括処理できる。',
    official_url: 'https://gemini.google.com',
    use_cases: ['大量ログ解析', '長文仕様書の要約', 'Googleサービス連携', 'コード生成'],
    mbd_relevance: 'medium',
    tags: ['LLM', 'Multimodal', 'Long Context'],
  },
  {
    name: 'MATLAB Copilot',
    developer: 'MathWorks',
    category: 'MBD / Simulink',
    description:
      'MATLABに統合されたAIアシスタント。自然言語によるMATLABコード生成・説明・デバッグを支援する。MATLAB R2024b以降に搭載。',
    official_url: 'https://www.mathworks.com/products/matlab.html',
    use_cases: ['MATLABコード生成', 'エラー解説', '関数説明', 'スクリプト最適化'],
    mbd_relevance: 'high',
    tags: ['MATLAB', 'MBD', 'Coding'],
  },
  {
    name: 'Simulink Copilot',
    developer: 'MathWorks',
    category: 'MBD / Simulink',
    description:
      'Simulinkモデル開発を支援するAIアシスタント。ブロック線図の自動生成・最適化提案・モデル説明生成を自然言語で実行できる。',
    official_url: 'https://www.mathworks.com/products/simulink.html',
    use_cases: ['Simulinkブロック生成', 'モデルデバッグ支援', 'パラメータ最適化提案', 'テストケース生成'],
    mbd_relevance: 'high',
    tags: ['Simulink', 'MBD', 'Model Generation'],
  },
  {
    name: 'Ansys SimAI',
    developer: 'Ansys',
    category: 'CAE / Simulation AI',
    description:
      'CAEシミュレーション結果をAIで高速予測するツール。物理シミュレーションの代替モデル（サロゲートモデル）をクラウドベースで構築できる。2026 R1からSimAI ProとSimAI Premiumの2層構成に刷新された。',
    official_url: 'https://www.ansys.com/products/ai/simai',
    use_cases: ['空力特性の高速予測', 'NVHサロゲートモデル', '設計最適化', '計算時間の大幅短縮'],
    mbd_relevance: 'high',
    tags: ['CAE', 'Surrogate Model', 'CFD', 'FEA'],
  },
  {
    name: 'NVIDIA PhysicsNeMo',
    developer: 'NVIDIA',
    category: 'CAE / Simulation AI',
    description:
      'NVIDIAのオープンソース物理AI深層学習フレームワーク。PINN・ニューラルオペレータ・GNNをGPUスケールで実行でき、CFD/FEMのサロゲートモデル構築を加速する。',
    official_url: 'https://github.com/NVIDIA/physicsnemo',
    use_cases: ['PINNによるCFD高速化', '熱流体サロゲートモデル', '乱流モデリング', '設計最適化ループ加速'],
    mbd_relevance: 'high',
    tags: ['PINN', 'Physics AI', 'CFD', 'Open Source', 'GPU'],
  },
  {
    name: 'Foam-Agent',
    developer: 'RPI CSML Lab',
    category: 'CAE / Simulation AI',
    description:
      'OpenFOAMベースのCFDシミュレーションを自然言語プロンプトから全自動化するマルチエージェントフレームワーク。NeurIPS 2025採択。Claude 3.5 Sonnetで成功率88.2%を達成し、メッシュ生成からParaView可視化まで全工程を自動実行する。',
    official_url: 'https://github.com/csml-rpi/Foam-Agent',
    use_cases: ['OpenFOAM自動セットアップ', '空力形状パラメータスタディ', 'CFDケース量産', '乱流解析自動化'],
    mbd_relevance: 'high',
    tags: ['CFD', 'OpenFOAM', 'Multi-Agent', 'Automation', 'Open Source'],
  },
];
