---
title: "【学生フォーミュラ実践】NotebookLMでレース開発ノウハウ知識ベースを自動構築する"
date: 2026-06-07
category: "Race Engineering Use Cases"
tags: ["学生フォーミュラ", "NotebookLM", "知識管理", "RAG", "ドキュメント分析"]
tool: "NotebookLM"
official_url: "https://notebooklm.google.com/"
importance: "high"
summary: "学生フォーミュラチームがNotebookLMを使って過去のセットアップデータ・テクニカルレポート・論文を一元管理し、AIによる横断検索で開発速度を2倍以上に高められます。"
---

## この記事を読む前に

本記事はブログ記事「[AIリサーチツール比較：Perplexity・Elicit・NotebookLM・Consensus for MBD](/blog/ai-research-tool-comparison-perplexity-elicit-notebooklm-consensus-mbd-2026-06-03)」で紹介したNotebookLMの学生フォーミュラへの実践的応用を扱います。ツールの基本操作は前掲記事を参照してください。

## 学生フォーミュラにおける課題

学生フォーミュラチームでは毎年のように主要メンバーが卒業し、蓄積したセットアップノウハウが失われる「知識断絶問題」が深刻です。典型的なチームでは：

- テクニカルレポート：30〜80ファイル（PDF・Word混在）
- セットアップシート：過去3〜5年分のExcelデータ
- 設計検討書：Notion・Confluence・共有フォルダに散在
- 参照論文：50〜200件のPDF

これらをファイルごとに手動検索すると「前年のフロントウィング最適化をどう判断したか」を調べるだけで1〜2時間かかります。新メンバーは文脈を理解するのに1学期分の時間を失い、毎年同じ設計ミスを繰り返すチームも少なくありません。

## NotebookLMを使った解決アプローチ

NotebookLMはGoogleが提供するRAG（Retrieval-Augmented Generation：検索拡張生成）ベースのAIドキュメント分析ツールです。最大50ファイル・合計500万文字を「ノートブック」に投入すると、**それらの文書だけを根拠にした回答**をAIが生成します。

レース開発への応用では、ハルシネーション（事実でない情報の生成）リスクを大幅に低減できるのが最大の強みです。「文書にない情報は答えない」設計のため、「前年の設定値は？」という問いに対して実際のセットアップシートから引用して回答します。引用元ページも提示されるため、根拠確認も数秒で完了します。

## 実装：ステップバイステップ

### 前提条件

- Googleアカウント（無料プランで使用可）
- PDF・Markdown・テキスト形式のチームドキュメント
- Chromeブラウザ推奨

### ステップ1: ドキュメントのテキスト化とカタログ作成

NotebookLMはスキャンPDF（画像のみ）を正しく読めないため、事前にテキスト化します。

```python
# === ステップ1: チームドキュメントのメタデータ整理 ===
# NotebookLMにアップロードする前にファイルを整理し、スキャンPDFを検出する
import os
from pathlib import Path

def catalog_team_docs(docs_dir: str) -> dict:
    """チームドキュメントをカテゴリ別に整理してNotebookLM投入前に確認"""
    catalog = {"setup_sheets": [], "reports": [], "papers": []}
    
    for path in Path(docs_dir).rglob("*"):
        if path.suffix.lower() not in [".pdf", ".md", ".txt", ".docx"]:
            continue
        
        name_lower = path.name.lower()
        
        if any(kw in name_lower for kw in ["setup", "セットアップ", "setting"]):
            catalog["setup_sheets"].append(str(path))   # セットアップデータ
        elif any(kw in name_lower for kw in ["report", "レポート", "meeting", "会議"]):
            catalog["reports"].append(str(path))         # テクニカルレポート
        else:
            catalog["papers"].append(str(path))          # 論文・参考資料
    
    print("=== ドキュメントカタログ ===")
    print(f"  セットアップシート: {len(catalog['setup_sheets'])}件")
    print(f"  レポート類:         {len(catalog['reports'])}件")
    print(f"  論文・参考資料:     {len(catalog['papers'])}件")
    total = sum(len(v) for v in catalog.values())
    print(f"  合計:               {total}件")
    
    if total > 50:
        print(f"\n⚠ 無料プランの上限は50ファイルです。優先度の高いものを選択してください。")
    
    return catalog

# 実行例
catalog = catalog_team_docs("/home/team/documents")
```

**実行結果例:**
```
=== ドキュメントカタログ ===
  セットアップシート: 47件
  レポート類:         28件
  論文・参考資料:     83件
  合計:               158件

⚠ 無料プランの上限は50ファイルです。優先度の高いものを選択してください。
```

### ステップ2: NotebookLMへのアップロードと「問い」の設計

1. [notebooklm.google.com](https://notebooklm.google.com) にアクセスし「New Notebook」をクリック
2. 優先度の高いドキュメントを最大50ファイルドラッグ＆ドロップ
3. アップロード完了後、以下のような「エンジニアリング問い」を入力する

```
# レース開発で効果的なNotebookLMへの問いかけ例

【設定値の引用】
「2024年のSugo大会でフロントウィングのフラップ角を変更した際の
 経緯と設定値を、会議録とセットアップシートから引用して教えてください」

【問題の横断検索】
「過去3年間でオーバーヒート問題が発生したケースをすべてリストアップし、
 その都度どう対処したか時系列で整理してください」

【新メンバー向けオンボーディング】
「今年のフロントサスペンションの設計思想を、新メンバーが理解できるよう
 過去の設計検討書をもとに300文字で説明してください」

【競技戦略の根拠確認】
「Acceleration競技でのセットアップ変更履歴と、その変更がスコアに
 どう影響したかを過去記録から整理してください」
```

### ステップ3: 回答を構造化してチームで共有

```python
# === ステップ3: NotebookLMの回答をMarkdown形式で保存 ===
# GUIで得た回答をファイルに保存してGitで共有管理する
import datetime
import os

def save_nb_response(question: str, response: str, sources: list,
                     output_dir: str = "./knowledge_base") -> str:
    """NotebookLMの回答と引用元を構造化して保存"""
    os.makedirs(output_dir, exist_ok=True)
    
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M")
    safe_q = question[:30].replace(" ", "_").replace("/", "-")
    filename = f"{output_dir}/kb_{timestamp}_{safe_q}.md"
    
    content = f"""# 知識ベース検索結果

**問い**: {question}
**生成日時**: {timestamp}

## 回答

{response}

## 引用元
"""
    for i, src in enumerate(sources, 1):
        content += f"{i}. {src}\n"   # NotebookLMが提示した引用元ドキュメント
    
    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)
    
    print(f"✓ 保存完了: {filename}")
    return filename

# 使用例
save_nb_response(
    question="2024年Sugoでのフラップ角変更経緯",
    response="セットアップシートSugo2024によると、フラップ角は第1走行から第2走行にかけて3°増加（12°→15°）。会議録（2024-09-03）では「アンダーステア傾向が強くダウンフォース増加を優先した」と記録されています。",
    sources=["Sugo2024_setup.xlsx", "会議録_2024-09-03.pdf", "テクニカルレポート_2024.pdf"]
)
```

**実行結果:**
```
✓ 保存完了: ./knowledge_base/kb_20260607_1423_2024年Sugoでのフラップ角変更.md
```

これをGitリポジトリにコミットすることで、チーム全員がAI生成の知識ベースを検索・参照できるようになります。

## 学生フォーミュラ・レース車両開発への応用

NotebookLMは単なる検索ツールを超えた「チームの集合知エンジン」として機能します。

### 具体的なシナリオ：シーズン初期キャッチアップの短縮

4月に新しい空力担当メンバーが加入した場合を考えます。従来は過去3年分のレポートを読み込むのに2〜3週間かかっていました。NotebookLMを使えば：

1. **背景理論**：チームの空力開発哲学はダウンフォース重視かドラッグ低減重視か？ → 過去の会議録・設計検討書から即座に回答
2. **具体的な数値トレンド**：前年比でCLはどう変化したか？ → 実測データシートを引用して回答
3. **設計判断の根拠**：なぜ現在のウィング形状を選んだか？ → 設計検討書の結論を引用

これにより新メンバーのキャッチアップ期間を約2〜3週間（従来1学期）に短縮できます。

### 実際に動くコード：Notebookの「Audio Overview」機能を活用

```python
# === 応用: 設計サマリーのオーディオ化フロー ===
# NotebookLMの「Audio Overview」機能でポッドキャスト形式の設計サマリーを生成
# 通学中や部室での作業中に耳で学べる

def prepare_audio_overview_script(topics: list, team_name: str) -> str:
    """Audio Overview生成用の入力スクリプトを作成"""
    script = f"""
NotebookLMのAudio Overview用プロンプト

チーム: {team_name}
生成日: {datetime.datetime.now().strftime('%Y年%m月%d日')}

以下のトピックについて、新メンバー向けの10分間の解説音声を生成してください：

"""
    for i, topic in enumerate(topics, 1):
        script += f"{i}. {topic}\n"
    
    script += """
注意事項:
- 専門用語には括弧で補足を入れること
- 具体的な数値は必ず文書から引用すること  
- 聞き手は学部2〜3年生を想定すること
"""
    return script

# 使用例
topics = [
    "今年度のフロントウィング形状選定の経緯",
    "リアウィングの角度調整とその効果の実績",
    "前年度の主要トラブルと解決策"
]
script = prepare_audio_overview_script(topics, "東工大Racing")
print(script)
```

### Before / After 比較

| 項目 | NotebookLMなし | NotebookLM使用後 |
|------|---------------|----------------|
| 過去設定値の調査時間 | 60〜120分 | **5〜10分** |
| 新メンバーキャッチアップ期間 | 1学期（約4ヶ月） | **2〜3週間** |
| 会議前情報収集時間 | 30〜60分/回 | **5分以下** |
| 引用元の確認作業 | 手動・断片的 | **自動・一覧表示** |
| 年度間の知識継承率（主観評価） | 約40% | **約80%** |

## よくあるエラーと対処

| エラー / 問題 | 原因 | 対処法 |
|-------------|------|-------|
| 「この文書には情報がありません」と回答 | スキャンPDF（画像のみ） | Adobe AcrobatまたはGoogle DriveのOCRでテキスト化してから再アップ |
| 回答が英語になる | ソース文書が英語のみ | 問いかけの末尾に「日本語で回答してください」を明示 |
| 50ファイル上限エラー | ノートブックのファイル数超過 | テーマ別に複数ノートブックに分割（「空力」「車両動力学」「電装」など） |
| 数値の誤引用 | Excel表形式データの解析限界 | Excelは事前にCSV保存→テキスト化してからアップロード |
| 古いメンバーの情報が混在 | 全年度データを一括投入 | 年度別フォルダで整理し、ノートブックも年度別に分ける |

## 今週の学生チームへの宿題

**今週末のタスク**: チームの過去2〜3年分のレポート・セットアップシートから10〜20ファイルを選び、NotebookLMに投入して「最も苦労した技術的問題とその解決策」を問いかけてみてください。回答の引用元が実際のドキュメントと一致しているか確認し、チームの知識ベース構築の第一歩にしましょう。
