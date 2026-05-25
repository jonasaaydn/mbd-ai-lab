---
title: "仕様書を書いたら実装が自動生成される——AWSの新IDE「Kiro」がMATLAB/Simulink開発の設計工数を変える理由"
date: 2026-05-25
category: "AI Coding"
tags: ["Agentic IDE", "Spec-Driven Development", "AWS", "MATLAB", "MBD", "Claude"]
tool: "Kiro"
official_url: "https://kiro.dev"
importance: "high"
summary: "AWSが2025年11月に正式リリースした仕様駆動型AIエージェントIDE「Kiro」は、要件定義→設計→タスク分解→実装を自動でつなぐ。MATLAB/Simulinkの複雑な設計仕様をKiroのSpecとして管理すると、コード生成品質が劇的に向上する。既存のGitHub CopilotやCursorとは一線を画すアーキテクチャの全容を解説する。"
---

## はじめに

MBD開発者が毎回消費している「仕様書を読んでコードに落とす」作業——要件文書をSimulinkモデルに変換し、設計ドキュメントをMATLABスクリプトに翻訳し、テストケースを手動で洗い出す。このフローで一晩費やしたことのあるエンジニアは多いはずだ。

GitHub CopilotやCursorは「コードを書く」ことは得意だが、「何を作るか」の仕様管理には関与しない。コンテキストがない状態でコードを生成させると、要件から外れた実装が量産される。

2025年7月にAWSが発表し、同年11月に正式公開（GA）した**Kiro**は、この問題に真正面から取り組む。要件定義からコード実装まで一貫してAIが管理する「仕様駆動型開発（Spec-Driven Development）」を提唱する新しいAIエージェントIDEだ。MATLABやPythonを日常的に扱うMBDエンジニアが知らないでいると、設計工数で差がつく時代に入った。

---

## KiroとはどんなIDEか

Kiroは**VS Code（Code-OSS）をフォーク**して作られたIDEで、既存のVS Code拡張機能がほぼそのまま動作する。開発元はAWS。AIモデルはAnthropic Claude Sonnet 4が主力で、Claude Opus 4も利用可能だ。

既存のAIコーディングツールとの根本的な違いは、AIが「コード補完の提案係」ではなく「設計仕様の管理者」として機能する点にある。Kiroの動作は次の3フェーズで構成される。

1. **Requirements（要件）**: 自然言語の機能説明をEARS（Easy Approach to Requirements Syntax）記法のユーザーストーリー＋受け入れ基準に変換する
2. **Design（設計）**: 要件からアーキテクチャ・実装方針・インタフェース設計書を自動生成する
3. **Tasks（タスク）**: 設計書から実行可能なコーディングタスクを分解して順番に実装する

これらの成果物は`.kiro/specs/機能名/`以下にMarkdownで永続保存され、チーム全員が参照できる「生きた仕様書」になる。

**2025年11月GA、翌月にはAWS re:Invent 2025で「Autonomous Agent（自律エージェント）」機能をプレビュー発表**。長時間のバックグラウンドタスクを非同期で実行するモードで、大規模リファクタリングや自動テスト生成を人手なしで回せる。

---

## 実際の動作：MATLAB設計仕様の自動実装

### ステップ1：Specを生成する

Kiroのチャット欄に次のように入力するだけで仕様書が自動生成される。

```
車両縦方向ダイナミクスのMATLAB関数を作りたい。
入力：エンジントルク、ブレーキ圧、タイヤ半径、車両質量
出力：車速、加速度、スリップ率（前後輪）
タイヤモデルはPacejka Magic Formulaを使う。
```

Kiroは`.kiro/specs/longitudinal-dynamics/`以下に以下のファイルを自動生成する。

```
.kiro/specs/longitudinal-dynamics/
├── requirements.md    ← EARS記法のユーザーストーリー＋受け入れ基準
├── design.md          ← クラス図・関数インタフェース・アルゴリズム説明
└── tasks.md           ← チェックボックス形式の実装タスクリスト
```

`requirements.md`の内容例：

```markdown
# 縦方向ダイナミクス計算モジュール

## User Story 1
As a vehicle dynamics engineer,
I WANT TO compute wheel slip ratio from engine torque and brake pressure,
SO THAT I can validate Pacejka Magic Formula against measurement data.

### Acceptance Criteria
- [ ] Function accepts [Torque_Nm, BrakePressure_Pa, TireRadius_m, VehicleMass_kg] as inputs
- [ ] Returns [VehicleSpeed_mps, Acceleration_mps2, SlipRatio_front, SlipRatio_rear]
- [ ] Pacejka B, C, D, E coefficients are configurable as function parameters
- [ ] Handles division-by-zero in slip ratio calculation when vehicle speed < 0.1 m/s
- [ ] Unit tests achieve 95%+ code coverage
```

### ステップ2：Tasks化して自動実装

Kiroが`tasks.md`に列挙したタスクのうち「Task 1: Implement core tire force calculation」をクリックすると、AIが設計書を参照しながらMATLABコードを生成・保存・テスト実行まで完結させる。

```matlab
function [Fx, Fy] = pacejka_tire_force(slip_ratio, slip_angle, Fz, B, C, D, E)
% Pacejka Magic Formula 5.2 (Combined Slip)
% Longitudinal force
kappa = slip_ratio;
Fx = D * sin(C * atan(B*kappa - E*(B*kappa - atan(B*kappa))));

% Lateral force
alpha_rad = deg2rad(slip_angle);
Fy = D * sin(C * atan(B*alpha_rad - E*(B*alpha_rad - atan(B*alpha_rad))));
end
```

生成後、Kiroは自動でMATLAB Test形式のユニットテストも生成し、受け入れ基準のチェックボックスを更新する。

### ステップ3：Steering Fileで設計規約を永続化

`.kiro/steering/`以下にMarkdownで「このプロジェクトのルール」を記述しておくと、AIが毎回参照して規約に従ったコードを生成する。

```markdown
# Vehicle Dynamics Project — Coding Standards

## MATLAB Conventions
- All physical quantities must include units in variable names (e.g., speed_mps, torque_Nm)
- Use SI units throughout; conversion only at I/O boundaries
- Every function must have a corresponding test in tests/ directory
- Pacejka model version: Magic Formula 5.2 (not 6.x)

## Simulink Conventions
- Sample time: 0.001 s (1 kHz) for dynamics blocks
- Signal ranges must be defined using Simulink.Signal objects
- Code generation target: Embedded Coder (C99)
```

---

## Before / After 比較

| 作業 | Before（従来） | After（Kiro） |
|------|--------------|--------------|
| 要件定義→仕様書作成 | 人手で2〜4時間 | 自動生成、レビュー15分 |
| 仕様→実装の変換 | 人手で4〜8時間 | タスクベースで1〜2時間（AIが実装） |
| 仕様とコードの乖離 | 頻繁（仕様書が古くなる） | Specがコードと同期更新 |
| チームへの引き継ぎ | 別途ドキュメント整備が必要 | .kiroフォルダがそのままドキュメント |
| テスト生成 | 手動（受け入れ基準から再解釈） | 受け入れ基準から直接生成 |
| コンテキスト維持 | 会話を重ねても忘れる | Steering Fileで永続保持 |

---

## 実践コード例：Agent Hookを使ったCI自動化

KiroのAgent Hookは、IDE内のイベントをトリガーにして特定の処理を自動実行する。MBD開発では「MATLABスクリプトを保存したら自動でMLint（MATLAB Code Analyzer）を実行してエラーを修正」というフローが実用的だ。

`.kiro/hooks/matlab-lint-on-save.json`：

```json
{
  "name": "MATLAB Lint on Save",
  "trigger": {
    "type": "file",
    "event": "saved",
    "pattern": "**/*.m"
  },
  "action": {
    "type": "agent-prompt",
    "prompt": "The file {{file_path}} was just saved. Run MATLAB Code Analyzer (mlint) on it and fix all warnings. Pay special attention to: unused variables, missing semicolons in loops, and deprecated function calls."
  }
}
```

同様に「Simulinkモデルを変更したら自動でスペック整合チェックを実行」というHookも構成できる。

---

## 注意点・落とし穴

**コンテキストウィンドウの制約**: Specファイルが大規模になると全体をAIに渡しきれない場合がある。モジュールごとにSpecを分割し、`.kiro/specs/`以下のフォルダ構成をコンポーネント単位に保つこと。

**MATLAB拡張機能の制限**: KiroはVS Code拡張を使えるが、MathWorks公式の「MATLAB Extension for VS Code」はCode-OSS環境でのサポートが限定的な場合がある。代替として`mlint`コマンドラインツールとKiroのシェル実行Hook を組み合わせる方法が現実的だ。

**Specの過剰生成**: Kiroは要件を広く解釈して詳細なSpecを生成する傾向がある。最初のプロンプトで「この機能のみ」と明示しないと、関連機能まで自動拡張されることがある。

**プラン上限**: 無料プランは月間AIリクエスト数に制限がある。大規模なSpec一括生成やAgent Hook多用時は有料プランを検討すること。

---

## 応用：より高度な使い方

**MCP連携によるSimulinkモデル管理**: Kiroは「Kiro Powers」と呼ばれるMCPサーバーのバンドル機能を持つ。MATLAB Agentic ToolkitのMCPサーバーとKiro Powersを組み合わせると、SpecからSimulinkブロックの自動構築まで一気通貫で実行できる。

**AUTOSAR対応Specテンプレート**: dSPACEやVector等のツールチェーンを使うプロジェクトでは、AUTOSAR SWCのインタフェース仕様をEARS記法で記述するSteering Fileテンプレートを用意しておくと、コード生成品質が大幅に向上する。

**チーム開発での活用**: `.kiro/`フォルダごとGit管理することで、Specの変更履歴が追跡でき、レビューが容易になる。PR作成時にSpecの差分を一緒に提示するとレビュー工数が削減される。

---

## 今すぐ試せる最初の一歩

Kiroのダウンロードと初期設定は5分以内に完了する。

```bash
# kiro.devからインストーラをダウンロードしてインストール後：
# 1. 既存プロジェクトフォルダを開く
# 2. Ctrl+Shift+P → "Kiro: Create New Spec" を選択
# 3. 作りたい機能を日本語で説明するだけでSpec生成が始まる

# または、チャット欄に直接入力：
# "このMATLABプロジェクトのフォルダ構造を解析して、
#  Steering Fileを自動生成してください"
```

無料プランで月30リクエストまで試せる。まずはSpec生成だけ試してみて、Steering Fileのカスタマイズに1時間かけると費用対効果がつかめる。
