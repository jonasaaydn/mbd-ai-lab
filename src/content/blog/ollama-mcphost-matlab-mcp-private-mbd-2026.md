---
title: "「秘密保持だからクラウドAIは使えない」を解決する——OllamaとMCPHostでMATLAB MCP Serverをローカルに繋ぐ完全プライベートMBD AIエージェント構築手順"
date: 2026-05-30
category: "AI Coding"
tags: ["Ollama", "MCPHost", "MATLAB MCP", "ローカルLLM", "プライベートAI", "Qwen3"]
tool: "Ollama"
official_url: "https://ollama.com"
importance: "high"
summary: "GitHub CopilotやCursorはクラウドにコードを送るため、NDA厳守の自動車・モータースポーツ開発では導入できないチームが多い。OllamaでQwen3 14Bをローカル実行し、MCPHostを経由してMATLAB MCP Core Serverと接続すれば、APIコスト0円・データ送信ゼロの完全プライベートMBD AIエージェントが実現する。その具体的な構築手順と実用コードを解説する。"
---

## はじめに

「ChatGPTにSimulinkのコードを貼ってデバッグするな」——モータースポーツや自動車開発の現場でよく聞く話だ。車両制御ロジック、エンジンマップ、空力最適化パラメータといった設計情報は企業秘密であり、クラウドのLLMサービスに送信すること自体がNDA違反になりうる。しかし一方で、AIコーディング支援なしでMATLAB/Simulinkの開発効率を上げたいニーズは切実だ。この矛盾を解消する方法が、**Ollama + MCPHost × MATLAB MCP Core Server**の完全ローカル構成だ。MathWorksが2026年1月に公開した公式MCPサーバーと、オープンソースのローカルLLMランタイムを組み合わせることで、インターネット接続なし・APIコスト0円のMBD AIエージェントが実現する。

## Ollama + MCPHostとは

**Ollama**はMeta（LLaMA）・Alibaba（Qwen）・Google（Gemma）などが公開した重みを使い、ローカルマシンでLLMを実行するオープンソースランタイムだ。Mac/Windows/Linuxに対応し、`ollama pull qwen3:14b`の1コマンドでモデルが動く。

**MATLAB MCP Core Server**はMathWorksが2026年1月に公開した公式サーバーで、AIエージェントにMATLABコードの生成・実行・デバッグ能力を与える。当初はClaude CodeやGemini CLIとの接続を前提としていたが、MCP標準に準拠しているため、任意のMCPクライアントから利用できる。

**MCPHost**はGo製のCLIブリッジで、OllamaのLLMとMCPサーバー群を接続する。単一バイナリで依存関係がなく、設定ファイルにサーバーパスを書くだけで動作する。2026年4月時点でQwen3・Llama 3.3・Gemma 4のツール呼び出しに対応しており、Qwen3 14Bは多くのMCPシナリオでGPT-4o miniに匹敵する精度を示している。

### 既存AIツールとの違い

| ツール | データ送信先 | 月額コスト | NDA適合性 |
|--------|------------|-----------|----------|
| GitHub Copilot | GitHubサーバー | $10〜 | 社内ポリシー次第 |
| Cursor / Windsurf | Anthropic/OpenAI | $20〜 | 社内ポリシー次第 |
| Claude Code | Anthropicサーバー | 従量課金 | 社内ポリシー次第 |
| **Ollama + MCPHost** | **なし（完全ローカル）** | **0円** | **✓ 問題なし** |

## 実際の動作：ステップバイステップ

### Step 1: Ollamaのインストールとモデル取得

```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# ツール呼び出し精度が高い推奨モデルをダウンロード（約8.5GB）
ollama pull qwen3:14b

# 動作確認
ollama run qwen3:14b "Hello. Can you use tools?"
```

> **モデル選定の基準**: 7B以下では関数呼び出しの精度が不安定。Qwen3 14B（VRAM約10GB）が最小実用ラインで、MacBook Pro M3 Max / Nvidia RTX 4090環境で快適に動作する。

### Step 2: MATLAB MCP Core Serverのセットアップ

```bash
# 要件: MATLAB R2024b以降, Node.js 18以上
git clone https://github.com/matlab/matlab-mcp-core-server
cd matlab-mcp-core-server
npm install && npm run build
```

### Step 3: MCPHostのインストール

```bash
# Goがインストール済みの場合
go install github.com/mark3labs/mcphost@latest

# または GitHubリリースページからバイナリ取得
# https://github.com/mark3labs/mcphost/releases
```

### Step 4: 設定ファイルで連結

```json
// ~/.mcphost.json
{
  "model": "ollama:qwen3:14b",
  "mcpServers": {
    "matlab": {
      "command": "node",
      "args": ["/home/user/matlab-mcp-core-server/dist/index.js"],
      "env": {
        "MATLAB_EXECUTABLE": "/usr/local/MATLAB/R2026a/bin/matlab"
      }
    }
  }
}
```

### Step 5: 実行——タイヤモデルの計算

```bash
mcphost "Pacejka Magic Formula（B=10, C=1.9, D=0.85, E=0.6）の横力特性を
スリップ角-12度〜12度でプロットするMATLABスクリプトを書いて実行してください。
縦軸は正規化横力Fy/Fz、X軸はスリップ角[deg]でグラフを出力してください。"
```

MCPHostがQwen3 14Bに問いかけ → LLMがMATLAB MCPの`run_matlab_code`ツールを呼び出す → MATLABが実行してグラフを出力。すべてローカル完結。

## Before / After 比較

| 項目 | クラウドAI（Cursor等） | Ollama + MCPHost |
|------|----------------------|-----------------|
| 設計データの送信先 | クラウドサーバー | なし（完全ローカル） |
| 月額コスト | $20〜$200 | 0円 |
| NDA・秘密保持 | 社内ポリシー次第 | 問題なし |
| MATLABコード生成精度 | ◎（GPT-4o / Claude） | ○（Qwen3 14B相当） |
| オフライン動作 | ✗ | ✓ |
| カスタムモデル利用 | ✗ | ✓ |

## 実践コード例：PythonからOllamaとMATLABを連携

```python
import ollama
import subprocess

# ツール定義（MATLAB実行ツール）
tools = [{
    'type': 'function',
    'function': {
        'name': 'run_matlab',
        'description': 'MATLABコードを実行して結果を返す',
        'parameters': {
            'type': 'object',
            'properties': {
                'code': {'type': 'string', 'description': 'MATLABコード'}
            },
            'required': ['code']
        }
    }
}]

response = ollama.chat(
    model='qwen3:14b',
    messages=[{
        'role': 'user',
        'content': ('fminconを使い、制約条件x1+x2<=10のもとで'
                    '(x1-3)^2+(x2-4)^2を最小化するMATLABコードを書いて実行せよ')
    }],
    tools=tools
)

# ツール呼び出しが発生した場合に実行
if response['message'].get('tool_calls'):
    for tc in response['message']['tool_calls']:
        code = tc['function']['arguments']['code']
        result = subprocess.run(
            ['matlab', '-batch', code],
            capture_output=True, text=True
        )
        print(result.stdout)
```

## 注意点・落とし穴

**RTX 3060（12GB VRAM）以下では14Bモデルが厳しい**: INT4量子化版（`ollama pull qwen3:14b-instruct-q4_K_M`）なら約8.5GBで動作するが、ツール呼び出し精度が若干低下する。

**MCPHostのマルチターン会話は一部不安定**: 2026年5月時点で、状態を保持しながら複数のMATLABコードを連続実行するシナリオは不安定なケースがある。シングルプロンプト実行が最も安定する。

**SimulinkへのアクセスはSimulink Agentic Toolkitが必要**: MATLAB MCP Core Serverだけではモデル操作不可。`github.com/matlab/simulink-agentic-toolkit`のMCPサーバーも`.mcphost.json`に追記することで対応できる。

## 応用：より高度な使い方

チームのオンプレGPUサーバー（A100等）にOllamaを立てて`OLLAMA_HOST=http://gpu-server:11434`で接続すれば、チーム全員が同じローカルLLMを共有できる。さらにMATLAB MCP・Simulink MCP・社内データベースMCPを組み合わせれば、テスト自動化・モデル生成・解析レポート生成を統合した社内専用エンジニアリングエージェントが実現する。クラウドAI製品のアップデートに振り回されず、自社の要件に合わせたシステムを維持できる点が大きな強みだ。

## 今すぐ試せる最初の一歩

```bash
# 3ステップで最小動作確認（MATLABなしでまず試せる）
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen3:14b
go install github.com/mark3labs/mcphost@latest

# MATLABなしで動作確認
mcphost --model ollama:qwen3:14b "車両縦ダイナミクスの1自由度モデルをMATLABコードで書いて"
# → MATLAB MCP Serverを追加すれば即日実行まで完結
```
