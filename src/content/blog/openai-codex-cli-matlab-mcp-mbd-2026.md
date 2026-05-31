---
title: "OpenAI Codex CLI × MATLAB Agentic Toolkit：GPT-5.5でMBDワークフローを自律自動化する"
date: 2026-05-31
category: "AI Coding"
tags: ["OpenAI Codex", "MATLAB", "MCP", "AI Agent", "Simulink", "GPT-5.5", "CLI"]
tool: "OpenAI Codex CLI"
official_url: "https://github.com/openai/codex"
importance: "high"
summary: "OpenAIが2026年4月23日にリリースしたGPT-5.5ベースのターミナルAIエージェント『Codex CLI』がMATLAB Agentic ToolkitとMCPで連携可能になった。Claude Codeが覇権を握っていたMBD自律自動化の世界に、OpenAI製エージェントが本格参入。Simulinkモデルの自律修正・テスト生成を数時間から数分に短縮できる実践ガイドを解説する。"
---

## はじめに

「MATLABスクリプトのユニットテストを書いて」「Simulinkモデルのサンプルタイム設定を全ブロック確認して」——こうした作業を毎日繰り返しているMBDエンジニアにとって、AIエージェントの活用は急務だ。

これまでClaude Code・GitHub Copilot Agent・Cursor・Windsurf・Sourcegraph Ampなど多数のAIエージェントがMATLAB MCP Serverと接続可能になり、MBDワークフローの自動化が進んできた。そこに2026年4月23日、OpenAIの新エージェント「Codex CLI」が加わった。GPT-5.5（OpenAI初のagentic-first訓練モデル）を搭載し、1000ステップ超の連続ツール呼び出しを自律実行できる。このツールを知らずに手動作業を続けるのは、1週間あたり数十時間の損失に相当する。

## OpenAI Codex CLIとは

OpenAIが2026年4月23日にリリースしたターミナルファーストのAIコーディングエージェント。GPT-4.5以来の完全再訓練モデルであるGPT-5.5を搭載し、agentic-first設計によって数百ステップにわたる複雑なタスクを中断なく実行できる点が最大の特徴だ。

毎週400万人の開発者が利用し、Terminal-Bench 2.0ベンチマークで82.7%という高スコアを達成している。MCP（Model Context Protocol）をネイティブサポートしているため、MathWorksが2026年4月13日にリリースしたMATLAB Agentic Toolkitと即座に連携できる。

Claude CodeがAnthropicモデルに最適化されているのに対し、Codex CLIはGPT-5.5の優れた数学的推論能力とOpenAI APIのエコシステムをそのまま活用できる。価格面では、Codex Basic（無料）〜Codex Pro（月$200）の幅広いプランが用意されている。

## 実際の動作：ステップバイステップ

### Step 1：Codex CLIのインストール

Node.js 22以上が必須。macOS・LinuxはネイティブサポートされるがWindowsはWSL2経由で動作する。

```bash
# Node.js バージョン確認
node --version  # v22.0.0 以上が必要

# Codex CLIをグローバルインストール
npm install -g @openai/codex

# バージョン確認
codex --version

# OpenAI APIキーを設定
export OPENAI_API_KEY="sk-..."
```

### Step 2：MATLAB MCP ServerをCodexに登録

MATLABがR2025b以降であることと、MATLAB MCP Core Serverがインストール済みであることを確認したうえで実行する。

```bash
# MCPサーバーをCodexに追加（CLIコマンド方式）
codex mcp add matlab -- matlab-mcp-server --port 27182

# または設定ファイル（~/.codex/config.toml）に直接記載
```

```toml
# ~/.codex/config.toml
[mcp_servers.matlab]
command = "matlab-mcp-server"
args = ["--port", "27182"]
env = { MATLAB_ROOT = "/usr/local/MATLAB/R2026a" }
startup_timeout_sec = 30
```

### Step 3：MCP接続確認

```bash
# Codexセッションを開始
codex

# セッション内でMCP接続確認
/mcp
# → "matlab: connected (12 tools)" のような表示を確認
```

### Step 4：MBDタスクを自律実行

```bash
# 例1：Simulinkモデルの全ブロックを検査してバグ修正
codex "models/suspension_ctrl.slx を開いて、
サンプルタイム設定が不整合なブロックを全検出・修正し、
シミュレーション実行して結果を確認して"

# 例2：MATLABスクリプトのテスト自動生成
codex "src/vehicle_dynamics.m の関数ごとにMATLAB Testフレームワークで
ユニットテストを作成し、カバレッジ100%を達成して"

# 例3：パラメータスタディの自動化
codex "suspension_model.slx でバネ剛性 k を [10000, 15000, 20000, 25000] N/m
と変えた4ケースのシミュレーションを実行して結果をCSVに保存して"
```

## Before / After 比較

| 作業内容 | 従来（手動） | Codex CLI + MATLAB MCP |
|----------|-------------|------------------------|
| Simulinkモデルのバグ特定 | 30〜60分 | 5分（自律解析） |
| MATLABスクリプトのテスト生成 | 2〜4時間 | 20〜30分 |
| パラメータスタディ4ケース実行 | 半日 | 30分 |
| モデルのコードレビューと修正提案 | 1〜2日 | 1〜2時間 |
| CI/CDパイプライン構築 | 2〜3日 | 2〜3時間 |

これらの数字はMATLAB Agentic Toolkitが公式に示す生産性改善の実績に基づく。

## 実践コード例

以下はCodex CLIをPythonスクリプトから呼び出してSimulinkモデルのバッチ検査を行う例だ。

```python
import subprocess
import json

tasks = [
    "models/engine_ctrl.slx のアラート一覧をJSONで出力して",
    "models/suspension.slx のサブシステムごとにテスト信号を自動生成して",
    "src/calibration.m のMISRA C準拠チェックをPolyspaceで実行して結果を返して",
]

results = []
for task in tasks:
    result = subprocess.run(
        ["codex", "--quiet", "--no-interactive", task],
        capture_output=True, text=True, timeout=300
    )
    results.append({
        "task": task,
        "output": result.stdout,
        "success": result.returncode == 0
    })

with open("codex_batch_results.json", "w") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
```

バッチ実行モード（`--no-interactive`）はCI環境でのコマンド埋め込みに便利で、GitHub Actionsとの組み合わせでSimulinkの自動検査パイプラインを構築できる。

## 注意点・落とし穴

- **GPT-5.5の利用制限**：Codex Basicプランはトークン数の上限が厳しく、大規模Simulinkモデル（ブロック数1000超）の一括解析には Codex Pro（月$200）が実質必要
- **Windowsはネイティブ非対応**：WSL2経由での動作は可能だが、MATLABのGUIツールとの連携に制限が生じる場合がある
- **MATLABバージョン要件**：MATLAB MCP Core Serverが同梱されているR2026a（または別途インストール済みのR2025b以降）が前提
- **MCPサーバーのPath問題**：Codexが継承する環境変数PATHにmatlab-mcp-serverが含まれていない場合は設定ファイルに絶対パスで記載すること
- **セッションタイムアウト**：長時間の並列シミュレーションではCodexのセッションがタイムアウトする。`startup_timeout_sec = 120` に増やすと安定する

## 応用：より高度な使い方

Codex CLIの真価はMATLAB Agentic ToolkitのAgent Skillsと組み合わせたときに発揮される。MATLAB Agentic Toolkitには「Plant Model Workflow」「Test Authoring Workflow」「Requirements Generation」など7つのMBD専門スキルが含まれており、Codexはこれらを自律的に呼び出してフル設計ループを回すことができる。

```bash
# 高度な応用例：要件からSimulinkモデルまでの全自動生成
codex "requirements/aero_ctrl_spec.md を読んで、
Simulinkでエアロコントローラのモデルを設計し、
MATLAB Testでテストを書き、Polyspaceで解析し、
全ての問題が解消されるまで反復して"
```

またGitHub Actionsと連携し、mainブランチへのプッシュをトリガーにCodexがSimulinkモデルの自動検査・テストを走らせるCI/CDパイプラインを構築することも可能だ。

## 今すぐ試せる最初の一歩

```bash
# インストールと動作確認（5分以内で完了）
npm install -g @openai/codex
export OPENAI_API_KEY="your_api_key_here"
codex "Hello! MATLABのバージョンを確認して"
```

まずMCPなしの単純なコード生成から始め、MATLAB接続は動作確認後に設定する。APIキーは[OpenAI Platform](https://platform.openai.com/api-keys)から取得できる。
