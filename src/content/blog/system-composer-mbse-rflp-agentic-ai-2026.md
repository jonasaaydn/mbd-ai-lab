---
title: "System Composer×AIエージェントでMBSE要件設計を全自動化——RFLPワークフローをClaude Codeに丸投げする実践ガイド"
date: 2026-05-27
category: "MBD / Simulink"
tags: ["MBSE", "System Composer", "Requirements Toolbox", "Agentic AI", "RFLP"]
tool: "Simulink Agentic Toolkit"
official_url: "https://github.com/matlab/simulink-agentic-toolkit"
importance: "high"
summary: "MathWorksが2026年4月に公開した「MBSEとアジェンティックAI」ワークフローを徹底解剖。System Composer＋Requirements ToolboxのAPI群をClaude Codeが操作し、自然言語の要件記述から機能・論理・物理の4層アーキテクチャをRFLPフレームワークで自動生成。従来2〜3日かかっていた初期アーキテクチャ立案が対話1時間に短縮された事例を紹介する。"
---

## はじめに

「要件定義書をもらったのに、System Composerのアーキテクチャ図に起こすだけで丸一日消えた」——そんな経験を持つMBDエンジニアは少なくないはずだ。要件の取り込み、機能ブロックの定義、インターフェース設定、トレーサビリティリンクの張り付け……これらの手作業は、実際の設計思考に使えるはずの時間を奪い続けてきた。

MathWorksが2026年4月26日に公開したブログ記事「Model-Based Systems Engineering and Agentic AI」は、この問題に正面から取り組む内容だ。Simulink Agentic ToolkitをSystem Composer・Requirements ToolboxのAPIと連携させ、Claude Codeが会話形式でRFLP（Requirements / Functional / Logical / Physical）アーキテクチャを自動構築するワークフローが実証された。これを知らないままでいると、競合チームに1〜2ヶ月分の設計スピードで差をつけられる可能性がある。

## Simulink Agentic ToolkitのMBSEスキルとは

Simulink Agentic Toolkitは2026年4月にMathWorksがGitHubで公開したオープンソースのエージェントスキル集だ（`github.com/matlab/simulink-agentic-toolkit`）。Simulinkモデルの読み書きや実行をAIエージェントが行うための**6つのMCPツール**と、MBDベストプラクティスをカプセル化した**7つのエージェントスキル**で構成される。

2026年4月のアップデートでRequirements ToolboxおよびSystem Composer向けのAPIスキルが追加され、以下の操作がClaude Codeから直接実行できるようになった。

| スキル | 具体的な操作 |
|--------|-------------|
| requirements_create | Requirement Setの新規作成・要件テキストの登録 |
| architecture_compose | System Composerでコンポーネント・ポート・接続を生成 |
| traceability_link | 要件↔アーキテクチャ要素のリンクを自動設定 |
| rflp_scaffold | RFLP 4層をプロジェクトテンプレートから一括展開 |

対話モードで動くため、エンジニアは「何を作るか」を自然言語で伝えるだけでよく、「どう作るか」のAPI呼び出しはすべてAIが担当する。

## 実際の動作：ステップバイステップ

### 前提環境

- MATLAB R2026a + System Composer + Requirements Toolbox（ライセンス必須）
- Simulink Agentic Toolkit（GitHubからクローン、npm install）
- Claude Code CLIまたはIDE拡張（VS Code / JetBrains）

### Step 1：MCPサーバーを起動する

```bash
# Simulink Agentic Toolkitをクローン＆起動
git clone https://github.com/matlab/simulink-agentic-toolkit
cd simulink-agentic-toolkit
npm install && npm start -- --port 3001
```

Claude Codeの `settings.json` に以下を追記してMCPサーバーを登録する。

```json
{
  "mcpServers": {
    "simulink": {
      "type": "http",
      "url": "http://localhost:3001"
    }
  }
}
```

### Step 2：Claude Codeに自然言語でプロジェクトを依頼する

```
You: 電動レーシングカーのモータートルク制御ECU向けMBSEプロジェクトを
     作成してほしい。ステークホルダー要件は次の3つ。
     1. 最大モータートルク 450Nm をドライバー指令から200ms以内に出力
     2. バッテリー残量15%以下で自動的に回生強化モードへ切り替え
     3. CAN通信断線を検出してから50ms以内にセーフティシャットダウン

Claude Code: Requirement Setを3件登録し、機能アーキテクチャのドラフトを
             提案します...
             [slreq.new('ECU_Requirements') 実行中]
             [System Composer で機能分解中: TorqueControl / EnergyMgmt / SafetyMonitor]
             [トレーサビリティリンクを3件設定中]
             完了しました。RFLP 4層のドラフトをご確認ください。
```

### Step 3：生成されたRFLPアーキテクチャを確認する

AIが自動生成する4層の構造は次のとおりだ。

```
Requirements（要件層）
  └─ SR-001: Max Torque 450Nm @ 200ms
  └─ SR-002: BMS 15% → 回生強化モード
  └─ SR-003: CAN断線 → Shutdown @ 50ms

Functional（機能層）
  └─ TorqueControl Function
  └─ EnergyManagement Function
  └─ SafetyMonitor Function

Logical（論理層）
  └─ TorqueController  [SW Component]
  └─ BMSInterface      [SW Component]
  └─ CANSupervisor     [SW Component]

Physical（物理層）
  └─ ECU_PowerUnit    [Hardware Node]
  └─ BMS_ECU         [Hardware Node]
  └─ CAN_Gateway     [Hardware Node]
```

要件SR-001は自動的にTorqueControl Function → TorqueController → ECU_PowerUnitまでのトレーサビリティリンクが設定される。要件カバレッジ分析レポートはワンクリックで生成可能な状態になる。

## Before / After 比較

| 項目 | 従来の手作業 | AIエージェント利用後 |
|------|-------------|-------------------|
| 要件取り込み（3件） | 2〜4時間 | 約5分（自然言語入力のみ） |
| 機能アーキテクチャ作成 | 4〜8時間 | 約15分（対話で修正） |
| トレーサビリティ設定 | 3〜5時間 | 自動（100%カバレッジ） |
| 初期ドラフト合計 | **2〜3日** | **約1時間** |

MathWorksブログでは「エンジニアは提案内容のレビューと承認に集中できる」と述べている。AIが叩き台を生成することで、設計品質の議論や検証作業に時間を振り向けられるようになる。

## 実践コード例：Requirements Toolbox APIを直接呼ぶ

Claude Codeが裏側で実行しているMATLABコードの例を示す。このコードは独立して実行することもできる。

```matlab
% Requirements Toolbox API で Requirement Set を作成
rs = slreq.new('ECU_Requirements');

% ステークホルダー要件を登録（3件）
r1 = rs.add();
r1.Summary     = 'Max Torque 450Nm at 200ms';
r1.Description = 'ECU shall output max motor torque of 450Nm within 200ms of driver command.';

r2 = rs.add();
r2.Summary     = 'BMS Low-SOC Regen Mode';
r2.Description = 'ECU shall switch to regenerative braking priority mode when SOC <= 15%.';

r3 = rs.add();
r3.Summary     = 'CAN Loss Safety Shutdown';
r3.Description = 'ECU shall trigger safety shutdown within 50ms of CAN communication loss.';

% System Composer でアーキテクチャモデルを開いて要件をリンク
arch  = systemcomposer.loadModel('ECU_Architecture');
comp1 = arch.Architecture.addComponent('TorqueController');
comp2 = arch.Architecture.addComponent('BMSInterface');
comp3 = arch.Architecture.addComponent('CANSupervisor');

slreq.createLink(r1, comp1);
slreq.createLink(r2, comp2);
slreq.createLink(r3, comp3);

% 要件カバレッジレポートをPDFで出力
slreq.report(rs, 'ReportFormat', 'pdf', 'OpenReport', false);
disp('Requirements traceability report generated.');
```

実行後、Requirements Editorにトレーサビリティマトリクスが表示され、3要件すべてのカバレッジが100%になっていることを確認できる。

## 注意点・落とし穴

**R2026a以降が必須**：MBSEスキルはR2026aで追加されたRequirements Toolbox v4.3以降のAPIに依存している。R2025b以前では `slreq.createLink()` の引数仕様が異なり、自動リンク機能が正常動作しない。

**物理層は手動確認が必要**：AIが提案するPhysical層のハードウェアノード割り当ては機能からの推論で生成されるため、実際のECUメモリ・CPU負荷との整合は別途確認すること。物理層だけはハードウェアスペックと照合してから承認する運用が推奨される。

**DOORS双方向連携は未対応**：IBM DOORSからRequirements Toolboxへのインポートはサポートされているが、AIスキルが生成した要件をDOORSへエクスポートする双方向連携は2026年5月時点では未対応。既存DOORSプロジェクトとの統合には変換スクリプトを別途用意する必要がある。

## 応用：より高度な使い方

RFLPドラフト生成に慣れたら、**SysML v2との統合**を次のステップに検討したい。MathWorksは2026年4月30日のブログ「Why MBSE Still Breaks at the Seams and How SysML v2 Could Help」でSystem ComposerとSysML v2の相互運用戦略を示しており、AIエージェントがSysML図とRFLPモデルを相互変換するワークフローが近く実用化される見通しだ。

また、AUTOSARとの組み合わせも強力だ。`systemcomposer.importModel('target.arxml')` でARXMLをインポートした後、AIエージェントに「要件リンクを補完して」と依頼すれば、既存のAUTOSAR設計に要件カバレッジ分析を後付けで追加できる。レガシー設計の品質可視化に即効性がある。

## 今すぐ試せる最初の一歩

Simulink Agentic ToolkitをインストールしてMCPサーバーを起動するだけでよい。

```bash
git clone https://github.com/matlab/simulink-agentic-toolkit
cd simulink-agentic-toolkit
npm install && npm start
```

Claude Codeで「新しいMBSEプロジェクトを作成して、要件を3つ登録し、System Composerで機能アーキテクチャを提案して」と入力するだけで、5分後には動くRFLPドラフトが手元に届く。
