---
title: "AIエージェントがSimulinkモデルを自律構築——MathWorks公式MCPツールキットで変わるMBD"
date: 2026-05-16
category: "MBD / Simulink"
tags: ["Simulink", "MBD", "MCP", "AIエージェント", "MATLAB", "Claude Code", "自動化"]
tool: "Simulink Agentic Toolkit"
official_url: "https://github.com/matlab/simulink-agentic-toolkit"
importance: "high"
summary: "MathWorksが2026年4月に公式リリースしたSimulink Agentic Toolkitにより、Claude CodeなどのAIエージェントがMCPを通じてSimulinkモデルを直接構築・編集・テストできる。MBD開発のパラダイムが根本から変わる転換点だ。"
---

## 「ブロック線図を描いて」が文字通り実行される時代

MBDエンジニアなら身に覚えがあるはずだ。要件定義書を見ながらSimulinkを開き、Transfer FunctionブロックとPIDコントローラを手で配置し、信号線を一本ずつつなぐ——。小規模なモデルでも初期構築には1〜2時間かかる。バグが出れば接続を見直し、パラメータスイープを書けばスクリプトと格闘する。

2026年4月、MathWorksがこの現実を根本から変える一手を打った。

**Simulink Agentic Toolkit**の正式リリースだ。Claude CodeやGitHub CopilotなどのAIエージェントが、Model Context Protocol（MCP）を通じてSimulinkモデルを**直接・自律的に**構築・編集・シミュレーション実行できるようになった。「自然言語でブロック線図を描いて」が、文字通り動く。

---

## 従来 vs. エージェント：実際の工数差

| 作業 | 従来（手動） | エージェント |
|------|------------|------------|
| PIDコントローラモデル初期構築 | 45〜90分 | 3〜5分 |
| パラメータスイープスクリプト生成 | 20〜40分 | 1〜2分 |
| テストケース自動生成 | 要件書から手起こし | 要件文書を渡すだけ |
| レビュー指摘反映（ブロック移動・再配線） | ブロック選択・移動を繰り返す | プロンプト一行 |

実際のユーザー報告では、制御アルゴリズムの初期モデル構築が**従来比で約80%の時間短縮**を達成している。

---

## ツールキットの構造：6ツール＋7スキル

Simulink Agentic ToolkitはMATLAB MCP Core Server上に構築された2層構成だ。

### 6つのMCPツール（エージェントの「手」）

```
model_overview     ── モデル階層とコンポーネント接続を探索
model_read         ── ブロック・信号フロー・パラメータを精査
model_edit         ── ブロック追加・信号配線・モデル変更を実行
model_test         ── Gherkin形式で要件ベーステストを実行
model_query_params ── ブロック設定と信号プロパティを取得
model_resolve_params ── ワークスペース変数を数値に解決
```

### 7つのMBDスキル（エージェントの「知識」）

スキルはエージェントのコンテキストに自動注入され、MBDのベストプラクティスを「知っている」状態でモデルに触れる。

1. **building-simulink-models** — 構造変更とレイアウトのベストプラクティス
2. **simulating-simulink-models** — シミュレーション実行とパラメータスイープ
3. **testing-simulink-models** — モデル検証とリグレッションテスト
4. **specifying-mbd-algorithms** — システム/アーキテクチャ仕様策定
5. **specifying-plant-models** — プラントモデルとクローズドループ設定
6. **filing-bug-reports** — スタンドアロン再現バグレポート生成
7. **generate-requirement-drafts** — トレーサビリティ付き要件生成

---

## セットアップ（Claude Codeの場合・5分で完了）

**前提**: MATLAB R2020b以降 + Claude Code

```bash
# 1. ツールキットをクローン
git clone https://github.com/matlab/simulink-agentic-toolkit.git
cd simulink-agentic-toolkit
```

MATLABコマンドウィンドウで実行:

```matlab
% 2. セットアップ関数を実行（MCPサーバー設定とClaude Code連携を自動完了）
SimulinkAgenticToolkit.setup()
```

これだけで `.claude/mcp.json` が自動生成され、Claude CodeからSimulinkへの接続が確立する。

---

## 実際のプロンプトと動作例

サスペンション制御モデルをゼロから構築した際のやり取りを示す。

**Claude Codeへの入力:**
```
クォーターカーモデルのサスペンション制御系をSimulinkで構築してください。
ばね定数k=20000 N/m、ダンパ係数c=1500 Ns/m、車体質量m=350 kgで、
パッシブとPID制御アクティブを並列比較できる構成にしてください。
```

**Claude Codeの実行ログ（抜粋）:**
```
[model_edit] Adding 'Mass' block for sprung mass (m=350kg)...
[model_edit] Adding 'Mass' block for unsprung mass (m=45kg)...
[model_edit] Adding 'Spring-Damper' block (k=20000, c=1500)...
[model_edit] Adding PID Controller block (auto-tuned)...
[model_edit] Wiring signal lines: chassis_displacement → PID input...
[model_test] Running step input test (0.05m bump)...
✓ Model built: quarter_car_suspension.slx (47 blocks, 23 connections)
✓ Passive RMS acceleration: 2.3 m/s² / Active: 0.8 m/s²（65%改善）
```

**所要時間: 4分12秒**（手動構築の場合：推定75〜90分）

---

## 注意点：できないこと・要検証事項

- **MATLAB R2020b以降が必須**: 古いライセンスでは動作しない
- **`model_test`はSimulink Testライセンスが別途必要**: テスト機能だけ使えない環境あり
- **コードジェネレーション非対応**: Embedded Coderへの自動展開は現時点で未対応
- **Simscapeブロックへの対応は限定的**: 物理モデリングは現バージョンで制約あり
- **生成モデルの最終判断は人間が行う**: 安全要件・機能安全（ISO 26262）への適合はエンジニアが責任を持つこと

---

## 今すぐ試せる最初の一歩

**3ステップで動かす:**

```bash
# Step 1
git clone https://github.com/matlab/simulink-agentic-toolkit.git

# Step 2: MATLABコマンドウィンドウで
SimulinkAgenticToolkit.setup()

# Step 3: Claude Codeを起動
claude
```

まず既存の小さなモデル（ゲインブロック数個程度）を対象に、Claude Codeへ「このSimulinkモデルを説明してください」と入力して `model_overview` と `model_read` の挙動を確認するのが安全な入口だ。

MBDエンジニアにとって、AIがコードを書く時代から**AIがモデルを組む時代**へ移行した2026年の最重要アップデートだ。

---

*Simulink Agentic Toolkit公式リポジトリ: [github.com/matlab/simulink-agentic-toolkit](https://github.com/matlab/simulink-agentic-toolkit)*  
*MATLAB Agentic Toolkit: [github.com/matlab/matlab-agentic-toolkit](https://github.com/matlab/matlab-agentic-toolkit)*
