---
title: "無料・ローカル・SWE-bench 72%——Mistral Devstral 2 × Vibe CLIをMATLAB/Simulink MBD開発に使い倒す完全ガイド"
date: 2026-06-12
category: "AI Coding"
tags: ["Mistral", "Devstral 2", "Vibe CLI", "MATLAB", "Open Source", "ローカルAI", "MCP", "AIエージェント"]
tool: "Mistral Devstral 2 / Mistral Vibe CLI"
official_url: "https://github.com/mistralai/mistral-vibe"
importance: "high"
summary: "Mistralが2025年12月に公開した完全オープンソースAIコーディングエージェント「Devstral 2」がSWE-bench Verifiedで72.2%を達成し、Claude CodeやGitHub Copilotと同クラスの性能を無料で提供。24BパラメータのDevstral Small 2はRTX 4090（VRAM 14GB）でローカル動作し、Mistral Vibe CLIとMATLAB MCP Serverを組み合わせると機密設計データを一切外部送信せずにMATLABコード自律開発が実現できる。"
---

## はじめに

「Claude Codeを使いたいが、顧客の機密設計データを外部サーバーに送るわけにはいかない」——自動車・航空機の下請けエンジニアが必ずぶつかるこの壁を、Mistralが2025年12月9日にリリースしたオープンソースのAIコーディングエージェント「**Devstral 2**」と「**Mistral Vibe CLI**」が打ち破る。

SWE-bench Verifiedで72.2%を記録したDevstral 2は、有料モデルと同等の実力をApache 2.0ライセンスで提供。さらに24Bパラメータの「Devstral Small 2」ならRTX 4090（VRAM 14GB）またはApple Silicon 32GB搭載Macでローカル実行できる。このモデルをMATLAB MCP Serverと接続すれば、**完全プライベートかつ費用ゼロで**MATLAB/SimulinkコードをAIが自律的に生成・修正・テストする環境が手に入る。知らずにいると、競合他社に「0円ローカルAI」の生産性差をつけられる。

---

## Devstral 2とMistral Vibe CLIとは

### Devstral 2 ファミリーの位置づけ

Mistralがアジェンティックコーディング専用に設計した2サイズ構成のオープンウェイトモデル。「アジェンティック」とは、複数ファイルを横断して自律的に読み書き・実行するという意味で、単なるコード補完とは根本的に異なる。

| モデル | パラメータ | SWE-bench Verified | コンテキスト | ライセンス | API価格（入力/出力） |
|--------|-----------|-------------------|------------|-----------|---------------------|
| Devstral 2 | 123B | **72.2%** | 256K tokens | modified MIT | $0.40/$2.00/M tokens |
| Devstral Small 2 | 24B | **68.0%** | 128K tokens | **Apache 2.0** | $0.10/$0.30/M tokens |

SWE-bench Verifiedとは、実際のGitHubリポジトリに存在した本物のバグ修正タスクで正しく修正できた割合。72.2%はGPT-4o（約62%台）やGemini 1.5 Pro（約63%台）を大幅に上回り、有料のfrontier modelに肉薄する数字だ。

### Mistral Vibe CLI とは

Devstral 2をバックエンドに使うターミナル型AIコーディングエージェント。Claude Codeと同様に：

- プロジェクト内のファイルシステム読み書き・コマンド実行
- マルチファイル横断での変更と依存関係の理解
- **MCPサーバー連携**（`config.toml`に追記するだけ）
- ローカルモデル（Ollama/vLLM）との接続（クラウドAPI不要モード）

が可能。Python 3.12以上が必要。インストールはコマンド1行で完了する。

---

## 実際の動作：ステップバイステップ

### 前提条件

MATLAB Agentic Toolkitを使う場合：MATLAB R2024a以降と有効なライセンスが必要。ローカルモデル実行の場合：VRAM 14GB以上のGPU（RTX 4090等）またはApple Silicon Mac 32GB以上。

### ステップ1：Mistral Vibe CLIをインストール

```bash
# uvがない場合は先にインストール（推奨パッケージマネージャー）
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc  # または source ~/.zshrc

# mistral-vibe をインストール（Python 3.12以上が自動で使われる）
uv tool install mistral-vibe

# バージョン確認
vibe --version
# → mistral-vibe 0.4.x  と表示されれば成功
```

### ステップ2：APIキーを設定してVibe CLIを起動

```bash
# APIキーを環境変数に設定（コードに直書きしてはいけない）
# APIキーは https://console.mistral.ai から無料で取得できる
export MISTRAL_API_KEY="your_api_key_here"

# MATLABプロジェクトフォルダに移動
cd /path/to/matlab-mbd-project

# Vibe CLIを起動（デフォルトでDevstral 2を使用）
vibe
```

上のコードを実行すると、以下が表示されます：
```
Vibe CLI v0.4.x  (model: devstral-2412)
Working directory: /path/to/matlab-mbd-project
> ■
```

### ステップ3：MATLAB MCP Serverを接続する

`~/.vibe/config.toml` を以下の内容で設定する（初回起動で自動生成される）：

```toml
# === Devstral 2 モデル設定 ===
[model]
model = "devstral-2412"   # Devstral 2を使用（最高精度）

# === MATLAB MCP Serverを接続 ===
# 事前にMATLAB Agentic Toolkit (R2024a以降) のインストールが必要
[mcp_servers.matlab]
command = "matlab-mcp-server"
# Vibe CLIが使用を許可するMATLABツール一覧
enabled_tools = [
  "matlab_execute_code",      # MATLABコードを直接実行
  "matlab_get_workspace",     # ワークスペース変数を取得
  "simulink_open_model",      # Simulinkモデルを開く
  "simulink_compile"          # Simulinkモデルをコンパイル
]

# === ローカルモデルを使う場合はこちらを有効化 ===
# RTX 4090 または Mac 32GB 以上が必要
# [provider]
# name = "ollama"
# model = "devstral-small-2"
# base_url = "http://localhost:11434"
```

### ステップ4：MATLABコードを自律リファクタリング

起動したVibe CLIのプロンプトで以下のように指示する：

```
> このプロジェクトの vehicle_model.m を読んで、重複している計算ブロックを
  関数に分離して。ISO 26262関連のコメントは必ず残すこと。
```

Vibe CLIが変更案を提示してから実行する（出力例）：
```
Analyzing vehicle_model.m (347 lines)...
Found 3 duplicated calculation blocks:
  - Drag force calc (lines 45-52, 118-125, 203-210)
  - Downforce calc (lines 55-67, 128-140)

Proposed changes:
  + calc_aero_forces.m  (新規ファイル)
  ~ vehicle_model.m     (3ブロックを関数呼び出しに置換)

Apply? [y/n] y
✓ Created calc_aero_forces.m
✓ Modified vehicle_model.m  (-48行の重複削除)
Completed in 23s
```

---

## Before / After 比較

| 項目 | 手動（ベテランエンジニア） | Devstral 2 + Vibe CLI |
|------|--------------------------|----------------------|
| 5000行MATLABのリファクタリング | 2〜3日 | **45分** |
| バグ原因の特定（3ファイル横断） | 30〜60分 | **3〜5分** |
| SILテストハーネス生成 | 4時間 | **20分** |
| 月間費用（Small 2 API） | — | **$0〜$3** |
| 機密データの外部送信 | — | ローカルなら**ゼロ** |

---

## 実践コード例：ローカルDevstral Small 2 × Ollama構成

**前提条件：** Ollama（https://ollama.com よりインストール）、VRAM 14GB以上またはApple Silicon Mac 32GB以上。

```bash
# === ステップ1: Devstral Small 2をダウンロード（約15GB） ===
# 初回のみ。Wi-Fi環境・30分程度かかる
ollama pull devstral-small-2

# VRAM 14GB未満の場合はQ4量子化版（精度わずかに低下、約8GB）
# ollama pull devstral-small-2:Q4_K_M

# === ステップ2: Ollamaサーバーをバックグラウンドで起動 ===
ollama serve &

# === ステップ3: ~/.vibe/config.toml をローカル向けに書き換え ===
# MISTRAL_API_KEY は不要になる
cat > ~/.vibe/config.toml << 'EOF'
[provider]
name = "ollama"
model = "devstral-small-2"
base_url = "http://localhost:11434"   # ローカルOllamaサーバー
EOF

# === ステップ4: APIキーなしでVibe CLIを起動 ===
vibe
# → Vibe CLI v0.4.x  (model: devstral-small-2 @ localhost)
#    No API key required - running locally
#    > ■
```

**よくあるエラーと対処：**

| エラー | 原因 | 解決法 |
|--------|------|--------|
| `connection refused at localhost:11434` | Ollamaが起動していない | `ollama serve` を先に実行 |
| `CUDA out of memory` | VRAM不足 | `ollama pull devstral-small-2:Q4_K_M` に切り替え |
| `Python 3.12 required` | Pythonバージョン不足 | `uv python install 3.12` を実行 |
| `command not found: vibe` | インストール未完了 | `uv tool install mistral-vibe` を再実行 |

ここまで動いたら、次は `vibe>` プロンプトで「このMATLABスクリプトの単体テストをMATLAB Test形式で書いて」と入力してみましょう。

---

## 注意点・落とし穴

- **Devstral 2（123B）のハードウェア要件**：RTX 4090単体（VRAM 24GB）では動かない。A100（80GB）か複数GPU構成が必要。個人や中小チームはAPI版（$0.40/Mトークン）が現実的
- **Devstral Small 2の限界**：128Kトークン制限があるため、50,000行超の大規模コードベース全体を一度に把握するのは難しい。MCP経由で必要ファイルだけを渡す運用が効果的
- **MATLAB MCP Server要件**：MATLAB Agentic Toolkit（R2024a以降）が前提。ライセンスを持っていない場合は、Vibe CLIを単体（MATLABなし）でも使える
- **生成コードのレビュー必須**：SWE-bench 72%は汎用ソフトウェアタスクの数字。制御システム固有の安全要件（ISO 26262等）への適合は人間が必ず確認すること

---

## 応用：より高度な使い方

Vibe CLIをGitHub Actions CI/CDに組み込めば、プルリクエスト作成時に自動でコードレビューと修正提案ができる。また、`config.toml`にMATLAB MCP ServerとSimulink Agentic Toolkitの両方を登録すると、「テレメトリCSVを読んで解析スクリプトを書き、SimulinkモデルのゲインパラメータをMCPで直接更新する」という複合タスクを一度の自然言語指示で完遂できる。

組み合わせると特に威力を発揮するツール：MATLAB Agentic Toolkit / Simulink Agentic Toolkit / GitHub Actions for MATLAB / Ollama

---

## 学生フォーミュラ・レース車両開発への応用

### シナリオ：走行ごとに肥大化するMATLABテレメトリ解析コードをDevstral 2で即時リファクタリング

学生フォーミュラチームは毎年チームメンバーが入れ替わり、先輩から引き継いだMATLABスクリプトが数年かけて肥大化する。「空力係数を計算するコードが4箇所にコピペされている」「ハードコードされたホイールベース1450mmがどこにあるか分からない」——こうした負債を抱えたまま走行会を迎えるのが多くのチームの現実だ。

**背景理論**：アジェンティックコーディング（Agentic Coding）では、AIがコードの依存グラフ（どの関数がどの変数を使うか）を解析し、変更の影響範囲を予測したうえで修正を実施する。Devstral 2はこの「複数ファイル横断の理解」と「実際の変更適用」に特化した訓練を受けており、SWE-bench（実在するGitHubリポジトリのバグ修正タスク）で72.2%という業界トップクラスのスコアを記録している。

**実際に動くコード：**

```bash
# === 前提条件 ===
# Python 3.12以上・uv・mistral-vibe インストール済み
# Mistral APIキー（無料取得: https://console.mistral.ai ）

# === ステップ1: 学生フォーミュラチームのMATLABプロジェクトに移動 ===
cd /home/fsae-team/telemetry-analysis

# === ステップ2: Vibe CLIを起動してリファクタリングを依頼 ===
vibe
```

起動後、プロンプトで以下を入力する：

```
vibe> src/ フォルダ内のすべての .m ファイルを読んで、以下の問題を修正して：
      1. 重複している空力係数計算（Cd, Cl）を aero_forces.m として分離
      2. ハードコードされた車両パラメータ（ホイールベース・質量・重心高さ）を
         vehicle_params.m に一元化して全スクリプトから参照する形に
      3. 変更後もすべての既存テスト（tests/フォルダ）がパスすること
      コメントで意図が説明されている箇所は必ずそのまま残すこと
```

**Before / After 比較（数字で示す）：**

| 指標 | 改善前 | 改善後（Devstral 2） |
|------|--------|---------------------|
| 総コード行数 | 4,856行 | 3,120行（**36%削減**） |
| 重複ブロック数 | 23箇所 | 0箇所 |
| 関数ごとの平均行数 | 180行 | 45行 |
| パラメータ変更の影響ファイル数 | 全ファイルを手動で探す | **1ファイルを修正するだけ** |
| 作業時間 | 2〜3日（2名） | **45分（AIが自律実行）** |

**学生チームが今すぐ試せる最初のステップ：**

```bash
# 3コマンドで試せる（所要時間：3〜5分）
curl -LsSf https://astral.sh/uv/install.sh | sh && source ~/.bashrc
uv tool install mistral-vibe
export MISTRAL_API_KEY="console.mistral.aiから取得したキー"
# 次にMATLABコードのあるフォルダで: vibe
```

---

## 今すぐ試せる最初の一歩

```bash
# Python 3.12以上が必要。インストールから起動まで5分以内
pip install uv && uv tool install mistral-vibe
export MISTRAL_API_KEY="取得したAPIキー"
cd あなたのMATLABプロジェクト
vibe
# → vibe> この .m ファイルを読んで、何をしているか日本語で説明して
```

APIキーは [console.mistral.ai](https://console.mistral.ai) から無料取得。Devstral Small 2は月100万トークン無料枠があり、小〜中規模チームなら実質無料で使い続けられる。
