---
title: "Claude Fable 5停止が示すリスク：日本のMBDエンジニアが今すぐ実践するOpus 4.8移行と耐障害ワークフロー設計"
date: 2026-06-18
category: "AI Coding"
tags: ["Claude Code", "Claude Fable 5", "Claude Opus 4.8", "AI Agent", "Workflow Design", "輸出規制"]
tool: "Claude Code"
official_url: "https://claude.ai/code"
importance: "high"
summary: "2026年6月9日公開のClaude Fable 5（1Mトークン・128k出力・数日間自律エージェント）は3日後の6月12日に米輸出規制指令で全世界停止。日本人MBDエンジニアへの影響を整理し、Claude Code + Opus 4.8への即時移行手順とモデル障害に強いワークフロー設計パターンを実働コードで解説する。"
---

## はじめに

2026年6月9日、AnthropicはClaude Fable 5をリリースした。1Mトークンコンテキスト、128kトークン出力、数日間の自律エージェント動作——「5万行のMATLABプロジェクト全体を1セッションで読み込んで一括リファクタリングする」を現実にするスペックだった。

しかしわずか3日後の6月12日、米政府の輸出規制指令によりアクセスは全世界で停止された。

外国国籍者（Foreign National）に該当する日本のエンジニアは全員、現在Fable 5を使えない。この停止は単なるサービス障害ではない——特定のモデルに強く依存したワークフローが持つ、根本的な脆弱性を可視化した出来事だ。

---

## Claude Fable 5とは何だったのか

AnthropicがFable 5を「最も要求の厳しい推論と長期的なエージェント作業のために設計された」と位置づけた理由は、現行モデルとの仕様差が示している。

### 現行モデルとの比較

| 項目 | Fable 5 | Opus 4.8 | Sonnet 4.6 |
|------|---------|----------|------------|
| モデルID | `claude-fable-5` | `claude-opus-4-8` | `claude-sonnet-4-6` |
| コンテキスト | **1Mトークン** | 200k | 200k |
| 最大出力 | **128kトークン** | 32k | 8k |
| 入力料金（/1Mトークン） | $10 | $15 | $3 |
| 出力料金（/1Mトークン） | $50 | $75 | $15 |
| 自律継続時間 | **数日間** | 数時間 | 数十分 |
| 日本からのアクセス | **不可**（2026年6月現在） | 可 | 可 |

1Mトークンという数字をMBD的に読み直すと：日本語コメント付きMATLABファイル（1ファイル平均500行）なら**約400ファイル分**を1度に読み込める。Stripeが報告したFable 5の実績は「5,000万行Rubyコードの一括マイグレーションをチーム2ヶ月分の作業を1日で完了」だ。

### Adaptive Thinking：Opus 4.8との決定的な違い

Fable 5最大の新機能は「Adaptive Thinking」だ。従来の`thinking.budget_tokens`の代わりに`effort`パラメータ（0.0〜1.0）で思考深度を制御する。生の思考テキストは返さず、`summarized`か`omitted`のみ。

```python
# === Fable 5（復旧後）のAPI呼び出し例 ===
# 前提: pip install anthropic
import anthropic
import os

client = anthropic.Anthropic()  # ANTHROPIC_API_KEY環境変数から自動読込

# effortパラメータで思考深度を制御（0.0=最小コスト, 1.0=最大精度）
response = client.messages.create(
    model="claude-fable-5",   # Fable 5のモデルID
    max_tokens=16384,
    effort=0.8,               # MBD設計レビューには0.7〜1.0を推奨
    messages=[{
        "role": "user",
        "content": "src/matlab/suspension/ 配下の全MATLABファイルを読んで、ISO 26262観点でのリスクを列挙してください"
    }]
)
print(response.content[0].text)  # .content[0].text で本文を取得
```

上のコードをそのまま実行すると、現在は以下のエラーが返る：
```
anthropic.APIStatusError: {'stop_reason': 'refusal', 
  'classifier': 'export_control', 'message': 'Access denied'}
```

これが現状だ。

---

## 停止の経緯と日本への影響

### 何が起きたか

6月12日、米政府はAnthropicに「外国国籍者へのFable 5/Mythos 5アクセスを遮断せよ」という輸出規制指令を発した。政府の主張は「特定コードベースを読み込ませ脆弱性を修正させる機能が安全保障上の懸念」というものだ。

Anthropicは「非常に限定的で普遍的ではないジェイルブレイクに対して過剰な措置だ」と公式に反論しつつも、コンプライアンス上の理由で全世界停止を選択した。外国国籍者とUS市民をリアルタイムに識別できないためだ。

### 日本のエンジニアへの直接的な影響

- **完全ブロック**：日本国籍のエンジニアはFable 5/Mythos 5を使用不可
- **他モデルへの影響なし**：Opus 4.8、Sonnet 4.6、Haiku 4.5は引き続き正常稼働
- **復旧タイムライン不明**：Anthropicは協議中と発表しているが具体的な見通しは未発表

---

## 今すぐ実践：Opus 4.8移行の4ステップ

### ステップ1：Claude Codeを最新版に更新してモデルを確認

```bash
# 現在のバージョン確認（2.1.170以上が最新対応版）
claude --version

# 最新バージョンへ更新
npm install -g @anthropic-ai/claude-code@latest

# Claude Code内でOpus 4.8に切り替え
/model claude-opus-4-8
```

### ステップ2：CLAUDE.mdを200kトークン制限向けに改訂

Fable 5の1Mトークンを前提にしたCLAUDE.mdはOpus 4.8では機能しない。コンテキストを節約する指示を追加する。

```markdown
# CLAUDE.md（Opus 4.8対応版）

## コンテキスト管理ルール（重要）
- 1セッションで読むファイルは最大15ファイルまで
- `tests/` ディレクトリは指示があるまで読まない
- 100行超の関数は先頭コメント+シグネチャのみ読む
- 今日のスコープ: suspension/ モジュールのリファクタのみ

## 分割戦略
大規模作業は以下の単位に分割して複数セッションで実行：
- Day 1: models/ のリファクタ
- Day 2: tests/ の更新
- Day 3: docs/ の生成
```

### ステップ3：モデル名を環境変数で管理（復旧後に1行変更するだけ）

```python
# === モデル非依存のMBD解析スクリプト ===
# 前提: pip install anthropic
import anthropic
import os

# CLAUDE_MODEL環境変数でモデルを切り替え（未設定ならOpus 4.8）
MODEL = os.getenv("CLAUDE_MODEL", "claude-opus-4-8")

client = anthropic.Anthropic()

def analyze_matlab_file(filepath: str) -> str:
    """MATLABファイルを解析してレポートを生成する"""
    with open(filepath, 'r', encoding='utf-8') as f:
        code = f.read()
    
    response = client.messages.create(
        model=MODEL,     # 環境変数から注入（Fable 5復旧後は1行変更だけ）
        max_tokens=4096,
        messages=[{
            "role": "user",
            "content": f"以下のMATLABコードの問題点と改善案を日本語で報告してください:\n\n```matlab\n{code}\n```"
        }]
    )
    return response.content[0].text  # 返答の本文

# 実行例
report = analyze_matlab_file("src/matlab/suspension_model.m")
print(report)
```

**実行結果の例：**
```
MATLABコード解析レポート: suspension_model.m

【問題点】
1. 変数命名: 'k1', 'b2' など非記述的な変数名が8箇所
2. マジックナンバー: 0.0025 → 定数 SPRING_RATE_N_PER_MM で定義推奨
3. コメント不足: 60行目の行列計算に説明なし

【改善案】
1. k1 → spring_front_rate, b2 → damper_rear_coeff に改名
...
```

Fable 5復旧後は以下の1行変更だけで切り替えられる：
```bash
export CLAUDE_MODEL=claude-fable-5
```

### ステップ4：大規模作業はマルチエージェント分割で対処

Fable 5の1Mトークンが使えない間は、AWS Strands AgentsでOpus 4.8を並列起動して実質的なコンテキストを拡大する。

```python
# AWS Strands Agentsによる並列MBDタスク（概念コード）
# 前提: pip install strands-agents

import strands

# サスペンション担当エージェント（Opus 4.8 × 200kトークン）
agent_suspension = strands.Agent(
    model="claude-opus-4-8",
    instructions="src/matlab/suspension/ のMATLABコードをリファクタリングせよ"
)

# 制御システム担当エージェント（Opus 4.8 × 200kトークン）
agent_control = strands.Agent(
    model="claude-opus-4-8",
    instructions="src/matlab/control/ のSimulinkテストケースを生成せよ"
)

# 並列実行 → 実質400kトークンのコンテキストを使用
results = strands.parallel([agent_suspension, agent_control])
```

---

## Before / After 比較

| 作業内容 | Fable 5使用時 | Opus 4.8（現在の代替） |
|----------|---------------|------------------------|
| 大規模リファクタ（5万行） | 1セッションで完結 | 5〜10セッションに分割 |
| 設計書＋コードの一括分析 | 全文同時読込 | 段階的読込+サマリー接続 |
| 入力コスト（100kトークン） | $1.0 | $1.5 |
| 自律実行時間 | 数日間（要監視なし） | 数時間（定期チェック要） |
| 日本からのアクセス | **停止中** | **利用可** |

---

## 注意点・落とし穴

**1. Claude Code 2.1.170にアップデートしてもFable 5は使えない**
モデル自体が停止中なので、`/model claude-fable-5`を指定してもAPIレベルでエラーが返る。Opus 4.8またはSonnet 4.6を指定すること。

**2. `effort`パラメータはFable 5固有**
Opus 4.8で`effort`を渡しても無効だ。Opus 4.8でextended thinkingを有効にしたい場合は旧構文を使う：
```python
thinking={"type": "enabled", "budget_tokens": 10000}
```

**3. Task Budgets（ベータ）もFable 5専用**
`task-budgets-2026-03-13`ヘッダーはFable 5/Mythos 5専用機能だ。Opus 4.8には適用できない。

**4. Fable 5の復旧タイムラインは不明**
Anthropicは「協議中」と発表しているが、日本を含む外国国籍者への完全復旧には政府との合意が必要だ。楽観的に見ても数週間〜数ヶ月はかかると見るべきだ。

---

## 応用：RAGでOpus 4.8の実質的なコンテキストを拡大

DuckDB + ベクトル検索を組み合わせると、200kトークン制限内でも数百万トークン規模のコードベースを「必要な部分だけ」参照できる。

```python
# DuckDB + ベクトル検索でコードをインデックス化する（概念コード）
import duckdb

conn = duckdb.connect("codebase.db")
conn.execute("INSTALL vss; LOAD vss;")

# 関連ファイルのみをOpus 4.8に渡す
def get_relevant_code(query: str, top_k: int = 5) -> str:
    # クエリに関連するコードチャンクをベクトル検索
    results = conn.execute("""
        SELECT code_chunk, filename
        FROM code_embeddings
        ORDER BY array_cosine_similarity(embedding, $1::FLOAT[1536])
        LIMIT ?
    """, [get_embedding(query), top_k]).fetchall()
    return "\n\n".join([f"--- {r[1]} ---\n{r[0]}" for r in results])
```

これにより「全コードの中から今の質問に関係する部分だけ」をOpus 4.8に渡せる。

---

## 学生フォーミュラ・レース車両開発への応用

**シナリオ：代替わり時の引継ぎコードレビューをOpus 4.8で全自動化する**

学生フォーミュラチームでは毎年4〜5月に代替わりが発生し、前年度のMATLABコードを引き継ぐ。Fable 5（1Mトークン）では「プロジェクト全体を一括読み込んで包括的なレビューレポートを生成」が可能だったが、Opus 4.8（200kトークン）でも以下のアプローチで完全自動化できる。

**前提条件：** Python 3.10以上、pip install anthropic

```python
# === 学生フォーミュラMATLAB引継ぎレビュー自動化スクリプト ===
import anthropic
import os
from pathlib import Path

MODEL = os.getenv("CLAUDE_MODEL", "claude-opus-4-8")
client = anthropic.Anthropic()

def batch_review_matlab(directory: str, batch_size: int = 5) -> dict:
    """MATLABディレクトリを5ファイルずつレビューする"""
    matlab_files = list(Path(directory).glob("**/*.m"))
    reviews = {}
    
    # 5ファイルずつバッチ処理（約40kトークン/バッチ）
    for i in range(0, len(matlab_files), batch_size):
        batch = matlab_files[i:i+batch_size]
        
        # バッチ内の全ファイルを結合
        combined = ""
        for f in batch:
            combined += f"=== {f.name} ===\n{f.read_text(encoding='utf-8')}\n\n"
        
        response = client.messages.create(
            model=MODEL,
            max_tokens=2048,
            messages=[{"role": "user", "content":
                f"以下のMATLABファイルを引継ぎ観点でレビューして、"
                f"各ファイルの用途・注意点・改善箇所を箇条書きで答えてください:\n\n{combined}"
            }]
        )
        
        # 次期開発者向けレポートに保存
        for f in batch:
            reviews[f.name] = response.content[0].text
    
    return reviews

# 実行：サスペンション制御コードを一括レビュー
results = batch_review_matlab("./matlab/suspension_control/")
for filename, review in results.items():
    print(f"\n[{filename}]\n{review}")
```

**Before / After：**
| | Fable 5（停止中） | Opus 4.8（現在） |
|--|------------------|-----------------|
| 100ファイル処理 | 1セッション・30分 | 20バッチ・約2時間（自動） |
| コスト（推定） | $3〜$5 | $2〜$4 |
| 人間の介在 | 最初と最後のみ | なし（バッチ自動化） |

Fable 5復旧後に`CLAUDE_MODEL=claude-fable-5`に変更するだけで、同じスクリプトが30分のシングルセッションで実行できるようになる。

---

## 今すぐ試せる最初の一歩

```bash
# ① Claude Codeを最新版に更新
npm install -g @anthropic-ai/claude-code@latest

# ② Opus 4.8で動作確認
claude "/model claude-opus-4-8 && echo 'Hello, which model?'"

# ③ Fable 5復旧後の切り替えはこれだけ
# export CLAUDE_MODEL=claude-fable-5
```

モデルは変わる——ワークフローを残す設計が今の最重要課題だ。
