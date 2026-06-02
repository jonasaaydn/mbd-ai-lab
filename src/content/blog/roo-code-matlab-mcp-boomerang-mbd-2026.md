---
title: "RooCodeとMATLAB MCPサーバーを繋ぐ——Boomerangオーケストレーターが複雑なMBD作業を複数AIエージェントで自律分担する新ワークフロー"
date: 2026-06-02
category: "AI Coding"
tags: ["Roo Code", "MATLAB MCP", "Boomerang", "MBDエンジニア", "AIエージェント", "VS Code"]
tool: "Roo Code"
official_url: "https://github.com/RooCodeInc/Roo-Code"
importance: "high"
summary: "Cursor・Windsurf・Claude Codeとは異なる第4の選択肢「Roo Code」がMATLAB MCPサーバーとの接続で独自の強みを発揮する。Boomerang機能により「Simulinkモデルを設計してテストして文書化する」という複雑なMBD作業を複数の特化型AIエージェントが自律分担——その15分セットアップ手順と実際の動作を解説する。"
---

## はじめに

SimulinkモデルをAIエージェントで自動生成する記事はこのブログにも多い。しかし「1本のモデルを設計→テスト→コードレビュー→ドキュメント化」という4段階の複合タスクを、AIが自律的に役割分担しながら完結させるツールはまだ少ない。

Claude Code・Cursor・Windsurfはすでに MATLAB MCP と連携できる。しかしそれらはすべて「一人のAIが全部やる」モデルだ。Roo Code の **Boomerang オーケストレーター** は発想が根本的に異なる——「指揮者AIが複数の専門家AIを束ねる」マルチエージェントアーキテクチャを VS Code 上で実現する。このツールを知らなければ、複雑なMBD作業の自動化において大きな機会損失になっている可能性がある。

---

## Roo Code とは

**Roo Code**（旧名 Roo-Cline）は、オープンソースの VS Code 拡張機能として2024年末に登場したAIコーディングエージェントだ。人気ツール「Cline」をフォークし、Roo Code Inc. がマルチエージェント・オーケストレーション機能を加えた派生版である。2026年6月時点の最新版（v3.16）では以下の独自機能が実装されている：

| 機能 | 概要 |
|------|------|
| **Boomerangタスク（Orchestratorモード）** | 複雑タスクを複数の専門AIに分割して委任・回収する指揮者AI |
| **Memory Bank** | `memory-bank/` ディレクトリでセッション横断の文脈を管理 |
| **カスタムモード** | Code・Architect・Debug・Orchestratorを目的別に切替 |
| **MCP対応** | `.roo/mcp.json` または `mcp_settings.json` で任意のMCPサーバーを接続 |
| **マルチLLM** | Claude・GPT-4o・Gemini・DeepSeek・Ollamaをモード別に選択可能 |

Claude Code が「ターミナル専用」であるのに対し、Roo Code は **VS Code の GUI 上で** 同等のエージェント機能を提供する。特に「Simulink環境をブラウザやターミナルと同じウィンドウで操作しながらAIと対話したい」MBDエンジニアに最適なポジションを持つ。

---

## 実際の動作：ステップバイステップ

**前提条件：**
- VS Code 1.90 以降
- MATLAB R2021a 以降（PATH 設定済み）
- Node.js 18 以降（`node --version` で確認）

### ステップ1：Roo Code のインストール

VS Code マーケットプレースで **「Roo-Code」** を検索してインストールするか、CLI で実行する：

```bash
code --install-extension RooVeterinaryInc.roo-cline
```

インストール後、左サイドバーに 🪃 アイコンが追加される。

### ステップ2：MATLAB MCP Core Server のダウンロードと設定

MathWorks 公式の MATLAB MCP Core Server をセットアップする。

```bash
# === ステップA: GitHubリリースページから最新バイナリを取得 ===
# https://github.com/matlab/matlab-mcp-core-server/releases
# Linux版の例:
wget https://github.com/matlab/matlab-mcp-core-server/releases/latest/download/matlab-mcp-core-server-linux-amd64

# === ステップB: 実行権限を付与して PATH に配置 ===
chmod +x matlab-mcp-core-server-linux-amd64
sudo mv matlab-mcp-core-server-linux-amd64 /usr/local/bin/matlab-mcp-core-server

# === ステップC: MATLABインストールパスを指定してセットアップ ===
# R2026a の場合（インストール先は環境に合わせて変更）
matlab-mcp-core-server --setup-matlab --matlab-root=/usr/local/MATLAB/R2026a
```

**実行結果の例：**
```
MATLAB MCP Core Server v1.3.0
Setup complete: MATLAB R2026a at /usr/local/MATLAB/R2026a
5 tools registered:
  - detect_matlab_toolboxes
  - check_matlab_code
  - evaluate_matlab_code
  - run_matlab_file
  - run_matlab_test_file
```

### ステップ3：Roo Code に MATLAB MCP を登録

プロジェクトルートに `.roo/mcp.json` を作成する（チーム共有可能）：

```json
{
  "mcpServers": {
    "matlab": {
      "command": "matlab-mcp-core-server",
      "args": [],
      "env": {
        "MATLAB_LOG_LEVEL": "warn"
      }
    }
  }
}
```

グローバルに設定したい場合は `~/.roo/mcp_settings.json` に同様の内容を書く。

VS Code を再起動すると、Roo Code の MCP パネルに「matlab」サーバーが **緑色で接続済み** と表示される。

---

## Before / After 比較

| 項目 | AI導入前（手作業） | Roo Code + MATLAB MCP 導入後 |
|------|---------|---------|
| モデル設計→テスト→文書化 | 3〜4時間 | Boomerangが自律分担で約45分 |
| セッション中断後の文脈復元 | ゼロから説明し直し | Memory Bankが自動補完 |
| 複数サブシステムの並列設計 | 逐次実行のみ | OrchestratorがCode×複数を並列委任 |
| MATLABコードのバグ検出 | 手動デバッグ | `check_matlab_code` で静的解析即実行 |
| 使用LLMの柔軟性 | ツール固定 | タスク種別でモデルを切替可能 |

---

## 実践コード例：Boomerang で Simulink 設計タスクを分割する

Roo Code が起動し MATLAB MCP に接続済みの状態で、**Orchestratorモード（🪃）** に切り替えて以下を送る：

```
次の複合タスクをサブタスクに分割して実行してください。

目標：車両縦加速度制御のSimulinkモデルを作成し、
      MATLABユニットテストを書いて、コードカバレッジ90%以上を確認する。

使用環境：MATLAB R2026a、Control System Toolbox、Simulink Test

Memory Bankにプロジェクト概要を記録してから開始すること。
```

Roo Code はタスクを以下のように自律分割して実行する：

```
[Orchestrator] タスクを4つのサブタスクに分解
  サブタスク1 → [Architect] 設計仕様・ブロック構成の決定
  サブタスク2 → [Code]      Simulinkモデル + セットアップスクリプトの生成
  サブタスク3 → [Code]      MATLABテストファイルの生成・実行
  サブタスク4 → [Debug]     カバレッジ90%未満の場合にテストケースを補完

[Architect] 仕様確定: PID + Antiwindup、Ts=0.01s、
           入力=目標加速度(m/s²)、出力=スロットル開度(0-1)
[Code] detect_matlab_toolboxes → Control System Toolbox R2026a ✓
[Code] Simulinkモデル 'LonCtrl_v1.slx' を生成中...
[Code] evaluate_matlab_code → モデルシミュレーション実行
       結果: 定常偏差 < 0.02 m/s², 整定時間 0.8s ✓
[Code] テストファイル 'LonCtrl_test.m' を生成中...
[Debug] run_matlab_test_file → 全テスト合格、Coverage: 94.3% ✓
[Orchestrator] 全サブタスク完了。memory-bank/progress.md を更新済み。
```

各サブエージェントが完了結果を Orchestrator に「ブーメラン」のように返し、次のサブタスクへ進む仕組みだ。Context が分離されているため、Debug エージェントが肥大化したログを抱えてもアーキテクト情報に影響しない。

---

## 注意点・落とし穴

**① Orchestratorモードは MCP ツールを直接呼べない**
Orchestrator は調整役に特化しており、ファイル読み書き・コマンド実行・MCP ツール呼び出しは行わない。実際の作業は Code・Debug サブエージェントが担う。これは意図的な設計で、コンテキスト汚染を防ぐためだ。

**② Memory Bank は自動生成されない**
最初のセッションで「memory-bank/ディレクトリを初期化して」と明示的に指示する必要がある。一度作成すれば以降のセッションで自動更新される。

**③ MATLAB MCP サーバーは同時接続1プロセス**
複数の VS Code ウィンドウで Roo Code を起動すると MATLAB インスタンスが競合する。1プロジェクト1ウィンドウを厳守すること。

**④ Boomerang は API コールが増加する**
Boomerang は複数のエージェント起動で API コールが増える。Claude Sonnet 4.6 使用時、上記の4段階タスクで $0.8〜$2.0 のコストが発生する。軽量タスクには Code モード単独の利用を推奨。

---

## 応用：より高度な使い方

**RooFlow（拡張 Memory Bank）との組み合わせ** が最も効果的だ。RooFlow は各 Roo モード（Architect・Code・Debug）に専用のコンテキストファイルを割り当て、サブエージェント間で知識を継承させる。Simulink の複数サブシステム設計で「設計ルール」や「MATLAB コーディング規約」を全エージェントで共有したい場合に威力を発揮する。

また **モード別 LLM 切り替え** も強力だ。Architect モードには推論力の高い Claude Opus 4.8 を、Code モードには DeepSeek-V3（低コスト）を、Debug モードには o3-mini を割り当てることで、品質とコストの最適バランスを実現できる。

---

## 今すぐ試せる最初の一歩

```bash
# 1. VS Code に Roo Code をインストール
code --install-extension RooVeterinaryInc.roo-cline

# 2. プロジェクトの .roo/mcp.json を作成
mkdir -p .roo
echo '{"mcpServers":{"matlab":{"command":"matlab-mcp-core-server"}}}' > .roo/mcp.json
```

VS Code を再起動し、🪃 ボタン → Orchestratorモード → 「MATLABで簡単な正弦波を計算して結果を表示するスクリプトを作成・実行してください」と送れば、5分以内に Boomerang の動作を体験できる。
