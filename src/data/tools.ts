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
      'MATLABに統合されたAIアシスタント。自然言語によるMATLABコード生成・説明・デバッグを支援する。R2025aで正式搭載、R2026aではテスト自動生成（MATLAB Test連携）とPolyspace Copilotによる組込みソフトウェアコード解析にも対応。2026年4月にはMATLAB Agentic Toolkitが公式リリースされ、Claude Code・GitHub Copilot・Gemini CLIなどのAIエージェントがMCPを介してMATLABを直接実行・制御できるようになった。',
    official_url: 'https://www.mathworks.com/products/matlab-agentic-toolkit.html',
    use_cases: ['MATLABコード生成', 'エラー解説', '関数説明', 'テスト自動生成', 'Polyspace静的解析支援', 'AIエージェントによる自律実行'],
    mbd_relevance: 'high',
    tags: ['MATLAB', 'MBD', 'Coding', 'MCP', 'Agentic AI'],
  },
  {
    name: 'Simulink Copilot',
    developer: 'MathWorks',
    category: 'MBD / Simulink',
    description:
      'R2026aで正式製品化されたSimulinkのAIアシスタント。モデルの説明・エラー解析・設計ガイダンス・規格準拠チェックを自動化。2026年4月にはSimulink Agentic Toolkitが公式リリースされMCPを通じてClaude CodeなどのAIエージェントがSimulinkモデルをブロック単位で自律構築・編集・テストできるようになった。6つのMCPツールと7つのMBDスキルを搭載。',
    official_url: 'https://www.mathworks.com/products/simulink-agentic-toolkit.html',
    use_cases: ['Simulinkブロック生成', 'モデルデバッグ支援', '規格準拠自動チェック', 'テストケース生成', 'AIエージェントによる自律モデル構築'],
    mbd_relevance: 'high',
    tags: ['Simulink', 'MBD', 'Model Generation', 'MCP', 'Agentic AI'],
  },
  {
    name: 'Ansys SimAI',
    developer: 'Ansys',
    category: 'CAE / Simulation AI',
    description:
      'CAEシミュレーション結果をAIで高速予測するツール。2026 R1でSimAI Premium（クラウドSaaS、15TB超データセット対応）とSimAI Pro（ローカルGPU・デスクトップ版、ML専門知識不要）の2層構成に刷新。optiSLangとの直結コネクタにより、データ生成→AIモデル訓練→最適化探索を単一ワークフローで完結できる。',
    official_url: 'https://www.ansys.com/products/ai/simai',
    use_cases: ['空力特性の高速予測', 'NVHサロゲートモデル', '設計最適化ループ自動化', '計算時間の大幅短縮'],
    mbd_relevance: 'high',
    tags: ['CAE', 'Surrogate Model', 'CFD', 'FEA', 'optiSLang'],
  },
  {
    name: 'NVIDIA PhysicsNeMo',
    developer: 'NVIDIA',
    category: 'CAE / Simulation AI',
    description:
      'NVIDIAのオープンソース物理AI深層学習フレームワーク。v2.0（2026年3月）でモジュール型PyTorch-nativeアーキテクチャに大幅刷新。DGLバックエンドをPyTorch Geometricに統一しコンポーザビリティを強化。DoMINO NIMマイクロサービスは航空宇宙・自動車各社が採用し従来シミュレーション比最大500倍の高速化を実現。Siemensとの提携でIndustrial AI OS統合も進む。',
    official_url: 'https://github.com/NVIDIA/physicsnemo',
    use_cases: ['PINNによるCFD高速化', '熱流体サロゲートモデル', '乱流モデリング', 'DoMINO NIMによる高速推論', '設計最適化ループ加速'],
    mbd_relevance: 'high',
    tags: ['PINN', 'Physics AI', 'CFD', 'Open Source', 'GPU', 'PyTorch Geometric'],
  },
  {
    name: 'Neural Concept',
    developer: 'Neural Concept SA',
    category: 'CAE / Simulation AI',
    description:
      'スイス発のエンジニアリングAIプラットフォーム。CFD/FEAシミュレーション結果をもとにGNNで形状最適化・設計変数探索を高速化する。2025年12月にGoldman Sachs主導で1億ドルのシリーズCを調達（累計1.5億ドル超）。Visa Cash App RacingBullsとの2026年F1レギュレーション対応パートナーシップを締結、数千の設計バリアントをAIデジタルツインで評価。2026年前半には生成AIを活用したジオメトリ生成機能もリリース予定。GM・GE Vernova・Safran・ルノーグループ等50社超が採用。',
    official_url: 'https://www.neuralconcept.com',
    use_cases: ['空力形状のAI高速予測', '設計パラメータスタディ自動化', 'CFDサロゲートモデル構築', '生成AIによる新形状提案', 'F1デジタルツイン評価'],
    mbd_relevance: 'high',
    tags: ['Aerodynamics', 'Surrogate Model', 'GNN', 'CAE', 'F1', 'Design Optimization', 'Generative AI'],
  },
  {
    name: 'Foam-Agent',
    developer: 'RPI CSML Lab',
    category: 'CAE / Simulation AI',
    description:
      'OpenFOAMベースのCFDシミュレーションを自然言語プロンプトから全自動化するマルチエージェントフレームワーク。NeurIPS 2025 ML4PS Workshop採択。Foam-Agent 2.0（arXiv 2509.18178v2）でコンポーザビリティと前後処理自動化を強化。Claude 3.5 Sonnetで成功率88.2%を達成し（MetaOpenFOAM比+32.7pt）、メッシュ生成からParaView可視化まで全工程を自動実行。CFDLLMBenchベンチマーク論文も2026年に公開。',
    official_url: 'https://github.com/csml-rpi/Foam-Agent',
    use_cases: ['OpenFOAM自動セットアップ', '空力形状パラメータスタディ', 'CFDケース量産', '乱流解析自動化', 'ParaView自動可視化'],
    mbd_relevance: 'high',
    tags: ['CFD', 'OpenFOAM', 'Multi-Agent', 'Automation', 'Open Source', 'Benchmark'],
  },
  {
    name: 'Flexcompute AutoInsight',
    developer: 'Flexcompute',
    category: 'CAE / Simulation AI',
    description:
      'MITスピンアウトのFlexcomputeが2026年3月にリリースした物理情報型AIプラットフォーム。既存CFDデータ（STAR-CCM+・Fluent・Flow360等）を10〜20ケースの少量サンプルから学習し、ジオメトリ変更時の抗力・ダウンフォースをリアルタイムに予測する。フルCFDを回す前に数千バリアントを高速スクリーニングできる。Northrop Grummanとの宇宙ミッションシミュレーション100倍高速化事例あり。',
    official_url: 'https://www.flexcompute.com/autoinsight/',
    use_cases: ['少量CFDデータからのサロゲート構築', '空力バリアントのリアルタイムスクリーニング', '設計初期フェーズの形状探索', '既存ソルバーデータ活用'],
    mbd_relevance: 'high',
    tags: ['CFD', 'Surrogate Model', 'Aerodynamics', 'Real-time', 'Few-shot Learning'],
  },
  {
    name: 'Ansys GeomAI',
    developer: 'Ansys',
    category: 'CAE / Simulation AI',
    description:
      'Ansys 2026 R1（2026年3月）でリリースされた生成AIジオメトリツール。参照CAD・シミュレーションデータセットから学習し、設計制約を満たしながら新たなジオメトリコンセプトを生成する。optiSLangと統合することで潜在空間上での設計最適化ループを実現。従来の形状パラメトリック変更を超え、「デザインランゲージ」を保持した新形状を自動提案する。',
    official_url: 'https://www.ansys.com/products/ai/geomai',
    use_cases: ['コンセプト設計ジオメトリ生成', '設計制約を満たす新形状提案', 'optiSLang連携最適化', '設計初期探索の高速化'],
    mbd_relevance: 'high',
    tags: ['Generative AI', 'CAD', 'Design Optimization', 'CAE', 'optiSLang'],
  },
  {
    name: 'PhysicsX',
    developer: 'PhysicsX Ltd.',
    category: 'CAE / Simulation AI',
    description:
      '英国発の物理AIスタートアップ。NVIDIA NVenturesの追加出資を含む累計1.55億ドルを調達。20万超のジオメトリ・物理シミュレーションで訓練した「LGM-Aero（Large Geometry Model）」と2万件超の車両CFDデータセット「PXNetCar」でLargePhysicsModel（LPM）を構築。航空弾性シミュレーション向け世界初LPM「Ai.rplane」を無償デモ公開。2026年3月にはCoreWeaveクラウドで一般提供開始。NVIDIA GTC 2026では物理AI向けオープン標準策定を発表。',
    official_url: 'https://www.physicsx.ai',
    use_cases: ['自動車空力サロゲートモデル', 'ブレーキ冷却最適化', '航空弾性予測（Ai.rplane）', '形状設計スタディ高速化', 'CoreWeaveクラウドでの推論'],
    mbd_relevance: 'high',
    tags: ['Large Physics Model', 'CFD', 'Surrogate Model', 'Automotive', 'Aerodynamics', 'NVIDIA', 'LGM'],
  },
  {
    name: 'nTop',
    developer: 'nTop Inc.',
    category: 'CAE / Simulation AI',
    description:
      '米国発のジェネラティブデザインプラットフォーム。GPU加速の暗黙的ジオメトリモデリング（Implicit Modeling）で、数百のパラメトリック形状バリアントを数秒で生成。2025年3月にLuminary CloudおよびNVIDIA PhysicsNeMoと統合し、「ジオメトリ生成→GPU並列CFD/FEA→物理AIサロゲート訓練」を1日で完結する「物理AI統合設計パイプライン」を実現。従来数週間〜数ヶ月かかっていた設計最適化が数時間に短縮される。NASA・SpaceX・GE Aerospaceを含む450社超が採用。',
    official_url: 'https://www.ntop.com',
    use_cases: ['トポロジー最適化', 'ラティス/ジャイロイド構造生成', '軽量化設計', 'AI物理サロゲート連携', '空力形状最適化'],
    mbd_relevance: 'high',
    tags: ['Topology Optimization', 'Generative Design', 'CAD', 'Lightweighting', 'Physics AI', 'GPU'],
  },
  {
    name: 'Amazon Q Developer',
    developer: 'Amazon Web Services',
    category: 'AI Coding',
    description:
      'AWSのAIコーディングアシスタント。2025年5月にAUTOSAR/SDV（ソフトウェア定義車両）向けの公式ブログを公開し、自動車組込みソフトウェア開発への適用例を実証。インラインコードコメントからAUTOSAR SWC（ソフトウェアコンポーネント）のC/C++コードおよびARXML設定ファイルを自動生成。VS Code・JetBrainsに統合されワークスペースのコンテキストを理解した上でAUTOSAR準拠コードを生成・リファクタリング・デバッグする。SWE-Bench Verifiedで66%を達成（2025年4月）。',
    official_url: 'https://aws.amazon.com/q/developer/',
    use_cases: ['AUTOSAR SWCコード生成', 'ARXML設定ファイル自動生成', '組込みC/C++リファクタリング', 'SDV開発支援', 'コードレビュー自動化'],
    mbd_relevance: 'medium',
    tags: ['AUTOSAR', 'SDV', 'Coding', 'IDE', 'AWS', 'Embedded C'],
  },
  {
    name: 'Collimator AI',
    developer: 'Collimator Inc.',
    category: 'AI Coding',
    description:
      'クラウドネイティブなモデルベース制御設計プラットフォーム。PythonでSimulinkライクなブロック線図を定義し、MPC・LQR・PIコントローラ設計とシミュレーションをブラウザ上で完結させる。PyTorch/ONNXモデルを制御ブロックとして直接挿入できるため、強化学習ポリシーのSIL検証まで同一フレームワーク内で完結。フリープランあり、プロプランは月$49。',
    official_url: 'https://www.collimator.ai',
    use_cases: ['アクティブサスペンションMPC設計', 'パワートレイン制御則の検証', 'RL制御ポリシーのSIL検証', 'クラウド並列パラメータスタディ', 'FMU連携シミュレーション'],
    mbd_relevance: 'medium',
    tags: ['MPC', 'Control Design', 'Python', 'Cloud MBD', 'Neural Network Control', 'FMU'],
  },
  {
    name: 'Simcenter STAR-CCM+',
    developer: 'Siemens Digital Industries Software',
    category: 'CAE / Simulation AI',
    description:
      'SiemensのフラッグシップCFD/マルチフィジクスソルバー。2026年2月リリースの2602バージョンでDesign Manager統合の幾何深層学習（GDL）サロゲートを搭載。わずか20〜40ケースのCFDデータからメッシュ節点単位の圧力場・剪断応力場フルフィールド予測モデルを自動構築し、新形状を5秒以内に評価できる。レガシーシミュレーションデータの再利用・GPU並列学習・Python Client APIにも対応。',
    official_url: 'https://plm.sw.siemens.com/en-US/simcenter/fluids-thermal-simulation/star-ccm/',
    use_cases: ['空力フルフィールドサロゲートモデル', '設計探索1000点をDOE40ケースで実現', 'NVH・熱流体マルチフィジクス解析', '過去CFDデータの転移学習活用', 'optiSLang連携ベイズ最適化'],
    mbd_relevance: 'high',
    tags: ['CFD', 'GDL', 'Surrogate Model', 'Aerodynamics', 'Siemens', 'Design Manager', 'Multi-fidelity'],
  },
  {
    name: 'Monolith AI',
    developer: 'Monolith AI (CoreWeave傘下)',
    category: 'CAE / Simulation AI',
    description:
      'インペリアル・カレッジ・ロンドン発のノーコードMLプラットフォーム。2025年10月にGPUクラウド大手CoreWeaveが買収。テスト/シミュレーションデータをアップロードするだけでCNN/GNNベースのサロゲートモデルを自動構築する。BMW・Nissan・Honeywell・WECハイパーカーチームが採用。クラッシュ性能予測・空力解析・NVH・バッテリー熱解析などに対応し、物理試験の大幅削減（80%超の事例あり）を実現。2026年ロードマップではモデル品質の自動監視・信頼区間・サインオフ可能なトレーサビリティ機能を追加予定。',
    official_url: 'https://www.monolithai.com',
    use_cases: ['クラッシュ性能サロゲートモデル', '空力特性予測', 'NVH解析', '試験計画最適化', 'バッテリー熱挙動予測'],
    mbd_relevance: 'high',
    tags: ['No-Code ML', 'Surrogate Model', 'Crash', 'NVH', 'Aerodynamics', 'CoreWeave', 'Test Reduction'],
  },
  {
    name: 'Ansys optiSLang',
    developer: 'Ansys (Synopsys傘下)',
    category: 'CAE / Simulation AI',
    description:
      'Ansysの設計最適化・不確かさ定量化（UQ）プラットフォーム。2026 R1（2026年3月）でSimAIネイティブ統合を実現し、DoEケース生成→GPU並列シミュレーション→AIサロゲート訓練→最適化探索を単一ワークフロー内で完結できるようになった。新たなDLS（減衰最小二乗法）キャリブレーションアルゴリズムにより実測ダイノデータへのノイズ耐性フィッティングが改善。Rocky・FreeFlow・LS-OPTの新ソルバー接続も追加。Python APIのモジュール化によりHPC・クラウド展開が容易化。',
    official_url: 'https://www.ansys.com/products/optislang',
    use_cases: ['空力形状多目的最適化', 'パワートレインキャリブレーション', 'ロバスト設計最適化（RDO）', '不確かさ定量化（UQ）', 'SimAI連携サロゲート最適化'],
    mbd_relevance: 'high',
    tags: ['Design Optimization', 'Surrogate Model', 'UQ', 'SimAI', 'Python', 'CAE', 'optiSLang'],
  },
  {
    name: 'Saphira AI',
    developer: 'Saphira AI',
    category: 'AI Coding',
    description:
      '2025年登場のSaaS型ISO/SAE 21434 TARA（脅威分析・リスクアセスメント）自動化プラットフォーム。高レベルのアーキテクチャ図を入力するだけでISO 21434準拠のLevel-2 TARAを自動生成し、工数を約70%削減。複数ECUにまたがるシステム横断的な脅威シナリオ生成・STRIDE適用・攻撃パス分析・サイバーセキュリティ要件生成を全自動化する。2026年2月には車載半導体向けISO 21434対応を公開。FEVのTARA CopilotやDefenseWeaver（arXiv 2504.18083）と並ぶ次世代車載サイバーセキュリティAIの代表格。',
    official_url: 'https://saphira.ai',
    use_cases: ['ISO 21434 TARA自動生成', '脅威シナリオ・攻撃パス分析', 'サイバーセキュリティ要件生成', 'AUTOSAR SecOC設計支援', '複数ECUシステムの横断的脅威分析'],
    mbd_relevance: 'medium',
    tags: ['ISO 21434', 'TARA', 'Cybersecurity', 'Automotive', 'AUTOSAR', 'LLM'],
  },
  {
    name: 'Sourcegraph Amp',
    developer: 'Sourcegraph',
    category: 'AI Coding',
    description:
      'Sourcegraphが提供する無料AIコーディングエージェント。VS Code・Cursor・Windsurf・JetBrains・CLIに対応し、MCP（Model Context Protocol）をビルトインサポート。2026年以降、MATLAB MCP ServerおよびSimulink Agentic Toolkitと正式に連携し、Simulinkモデルの参照モデル分割・加速器モード化・テストケース自動生成などのMBDワークフローを自律実行できる。Claude Code・GitHub Copilot Agentと同等のMBDスキルセットを完全無料（広告サポート）で利用できる点が最大の特徴。',
    official_url: 'https://ampcode.com',
    use_cases: ['Simulinkモデル参照モデル分割', '加速器モード自動最適化', 'MATLABスクリプト自動リファクタリング', 'テストケース自動生成', 'コードグラフ活用の依存関係解析'],
    mbd_relevance: 'high',
    tags: ['AI Agent', 'MCP', 'Simulink', 'MATLAB', 'Free', 'Refactoring', 'Coding'],
  },
  {
    name: 'Emmi AI / Noether Framework',
    developer: 'Emmi AI',
    category: 'CAE / Simulation AI',
    description:
      'ドイツ発エンジニアリングAIスタートアップEmmi AIが2026年1月にオープンソース公開したPhysics AI深層学習フレームワーク。中核技術「AB-UPT（Anchored-Branched Universal Physics Transformers）」はGPU1枚で9百万サーフェス＋1億4000万ボリュームセルの自動車CFDを推論し、従来手法比100倍超のスケールを達成。発散ゼロ渦度定式化で物理的整合性をハード保証し、CADジオメトリから直接推論できる。学習は約100ケース・1GPU・1日以内で完了。arXiv 2502.09692で発表、GitHub: Emmi-AI/noetherで全コード公開済み。',
    official_url: 'https://github.com/Emmi-AI/noether',
    use_cases: ['自動車空力CFDサロゲートモデル構築', 'CAD直接入力による形状評価', 'GPU1枚での100点超パラメータスタディ', '発散ゼロ物理制約付き推論', 'optiSLang連携マルチフィデリティ最適化'],
    mbd_relevance: 'high',
    tags: ['CFD', 'Surrogate Model', 'Physics AI', 'Open Source', 'Transformer', 'Automotive', 'Aerodynamics'],
  },
];
