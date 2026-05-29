---
title: "無料AIエージェント「Sourcegraph Amp」でSimulinkモデルを自律リファクタリングする方法"
date: 2026-05-29
category: "MBD / Simulink"
tags: ["Simulink", "MBD", "AI Agent", "MCP", "Refactoring", "Sourcegraph Amp"]
tool: "Sourcegraph Amp"
official_url: "https://sourcegraph.com/amp"
importance: "high"
summary: "Claude CodeやGemini CLIと並ぶ無料AIエージェント「Sourcegraph Amp」がSimulink Agentic Toolkitに対応。参照モデル分割・加速モードへの自動リファクタリングなど、MBDベストプラクティスを7つのAIスキルとして搭載。課金ゼロでSimulinkを自律操作できるようになった今、使わない手はない。"
---

## はじめに

「Claude Codeは使い始めたが、月額費用が気になる」「Gemini CLIはGoogleアカウントが必要で社内申請が面倒」——そんな声をレースチームやMBDエンジニアからよく聞く。

そこで注目したいのが**Sourcegraph Amp**だ。完全無料で提供されるAIコーディングエージェントで、2026年3月以降、MATLAB MCP ServerおよびSimulink Agentic Toolkitと正式に組み合わせて使える状態になっている。Claude CodeやGitHub Copilot Agent、Gemini CLIと同じMCP（Model Context Protocol）経由でSimulinkモデルを直接読み書きでき、MBDベストプラクティスを体現した7つのAIスキルがバンドルされている。

「無料ならどうせ性能が低い」と思うなら読み続けてほしい。AmpはMathWorksの公式ブログでSimulinkモデルのリファクタリング実証に使われており、その結果はプロダクション品質に達している。

---

## Sourcegraph Ampとは

Sourcegraph Ampは、コード検索・インテリジェンスプラットフォームで知られる**Sourcegraph社**が2025年末に公開したAIコーディングエージェントだ。VS Code・Cursor・Windsurf向け拡張機能およびCLIとして配布されており、2026年5月時点でも**完全無料**で使える（アカウント登録のみ必要）。

Claude Code（Anthropic）やGitHub Copilot Agent（Microsoft）と異なる点は、Sourcegraphが長年培ってきた**グローバルコードグラフ**とセマンティック検索エンジンをバックエンドに持つことだ。大規模リポジトリ内の依存関係を正確に把握した上でリファクタリング計画を立てるため、コンテキスト窓が切れる問題が起きにくい。

MATLAB/Simulinkへの接続は**MATLAB MCP Server**（MathWorks公式）と**Simulink Agentic Toolkit**（GitHub: matlab/simulink-agentic-toolkit）を経由する。Simulink Agentic ToolkitはClaude Code・GitHub Copilot・Cursor・OpenAI Codex・Gemini CLI・**Sourcegraph Amp**の6エージェントをサポートすると明記しており、Ampは正式サポートエージェントのひとつだ。

---

## 実際の動作：Simulinkモデルをステップバイステップでリファクタリング

MathWorksの公式ブログ（2026年3月26日付）では、Ampを使ってSimulinkモデルを「参照モデル分割＋加速器モード」にリファクタリングする実証例が紹介された。以下にその手順を再現する。

### Step 1: MATLAB MCP Serverを起動する

```bash
# Node.js 18以上が必要
npx @mathworks/matlab-mcp-server@latest
```

起動すると `localhost:3000` でMCPサーバーが立ち上がり、AmpからMATLABの実行・ファイル操作・Simulinkコマンド発行が可能になる。

### Step 2: Simulink Agentic ToolkitをAmpに読み込む

```bash
# Amp CLIを使う場合
amp --skills github:matlab/simulink-agentic-toolkit
```

VS Code上でAmpを使う場合は、`.amp/settings.json` にスキルURLを追記するだけでよい：

```json
{
  "skills": [
    "github:matlab/simulink-agentic-toolkit"
  ]
}
```

### Step 3: 自然言語でリファクタリングを依頼する

Ampのチャット欄に以下を入力する：

```
このSimulinkモデル (vehicle_dynamics.slx) の
コントローラサブシステムを参照モデルに分割し、
加速器モードで動作するよう最適化してください。
ISO 26262 ASIL-B準拠の信号名命名規則を維持すること。
```

Ampは自動的に以下を実行する：
1. モデルを開いてサブシステム構造をスキャン
2. `extract_subsystem_to_referenced_model` コマンドを発行して分割
3. `set_param` でシミュレーションモードを `accelerator` に設定
4. 変更後のモデルを保存してシミュレーション結果を検証

### Step 4: 差分をレビューしてコミット

Ampが出力するdiffを確認し、問題なければ通常通りgit commitする。Simulinkのバイナリ差分はMATLAB MLX形式で出力されるため、`compare_mdl` コマンドで人間が読める形式のレポートも自動生成される。

---

## Before / After 比較

| 項目 | リファクタリング前 | リファクタリング後（Amp使用） |
|------|------------------|--------------------------|
| 作業時間 | 手作業で2〜4時間 | Amp自動で約8分 |
| 参照モデル分割 | 手動でサブシステム切り出し | 自動抽出・命名 |
| シミュレーション速度 | 毎回フルコンパイル | 加速器モードで事前コンパイル済み |
| 命名規則チェック | 目視で確認 | スキルが自動検証 |
| コスト | — | 完全無料 |

加速器モード化により、パラメータを変えて繰り返す**パラメータスタディ**では初期化時間がほぼゼロになる。タイヤモデルや制御ゲインを100点スイープする場合、シミュレーション総時間が**30〜60%短縮**されるケースが報告されている。

---

## 実践コード例：Ampに渡すMATLABリファクタリングスクリプト

Ampが内部的に生成・実行するMATLABコードの例を示す。手動で実行しても同じ効果が得られる：

```matlab
% Simulinkモデルを開く
modelName = 'vehicle_dynamics';
load_system(modelName);

% サブシステムを参照モデルに変換
subsysPath = [modelName '/ControllerSubsystem'];
Simulink.SubSystem.convertToModelReference(...
    subsysPath, ...
    'NewModelName', 'ControllerRef', ...
    'ReplaceWithModelref', true);

% 参照モデルの加速器モード設定
refModel = 'ControllerRef';
set_param(refModel, 'SimulationMode', 'Accelerator');

% 変更を保存
save_system(modelName);
save_system(refModel);

% シミュレーションで動作検証
simOut = sim(modelName, 'StopTime', '10');
disp('リファクタリング完了。シミュレーション成功。');
```

---

## 注意点・落とし穴

**バージョン依存**: MATLAB MCP ServerはR2025b以降が必要。R2024a以前では接続できない。

**参照モデルの制約**: `Atomic Subsystem` 設定がオフのサブシステムは参照モデルへの変換に失敗する。事前に `SubSystemType` を確認すること。

**Amp無料プランの制約**: 2026年5月時点では無制限に使えるが、Sourcegraphが将来有料プランに移行する可能性はある。重要なワークフローは複数エージェントで代替できるよう設計しておく。

**Polyspace Agentic Toolkit連携**: Ampは現時点でPolyspace Agentic Toolkitとも接続可能だが、静的解析レポートの自動生成は実験的機能であり、本番ワークフローへの適用前に十分検証すること。

---

## 応用：より高度な使い方

基本的なリファクタリングを習得したら、次のステップとして**テスト自動生成**に挑戦したい。Simulink Agentic Toolkitの「テスト著述スキル」を使うと、Ampが既存モデルのI/O仕様からSimulink Testのテストケースを自動生成する。

さらに、**GitHub Actions + MATLAB CI**（`github-actions-matlab-simulink-cicd-mbd-2026.md`参照）と組み合わせると、Ampがリファクタリングした差分をプッシュした際に自動でCI/CDが走り、モデル変更の安全性を継続的に検証できる体制が完成する。

Claude Codeが得意な「複数ファイルにまたがる複雑な依存関係把握」に対し、Ampは「大規模リポジトリ全体のコードグラフ分析」が強みだ。チームのリポジトリ規模と予算に応じてエージェントを選び分けると効果的だ。

---

## 今すぐ試せる最初の一歩

```bash
# Amp CLIをインストール（無料）
npm install -g @sourcegraph/amp

# MATLAB MCP Serverを起動
npx @mathworks/matlab-mcp-server@latest

# Simulinkスキルを読み込んでチャット開始
amp --skills github:matlab/simulink-agentic-toolkit
```

インストールから最初のSimulinkモデル操作まで5分以内に完了する。まずは小規模なサブシステム（50ブロック以下）で試してみよう。
