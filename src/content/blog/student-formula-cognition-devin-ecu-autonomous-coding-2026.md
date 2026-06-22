---
title: "【学生フォーミュラ実践】Devinで車両制御ECUソフトの夜間自律リファクタリングとテスト生成を実現する"
date: 2026-06-22
category: "Race Engineering Use Cases"
tags: ["学生フォーミュラ", "Devin", "ECU", "自律エージェント", "テスト自動生成", "リファクタリング", "Python"]
tool: "Devin"
official_url: "https://devin.ai"
importance: "high"
summary: "学生フォーミュラチームがDevinを使うと、ECU制御ソフトのリファクタリング・単体テスト生成・PR作成を就寝中に自律実行できます。通常5〜7日かかるテスト整備作業が1夜（8時間）で完了し、カバレッジが20%から80%以上に跳ね上がります。"
---

## この記事を読む前に

本ブログの「[自律AIエンジニア「Devin」がF1開発を変える](/blog/cognition-devin-aston-martin-f1-autonomous-coding-2026)」でDevinのアーキテクチャとAston Martin F1での活用事例（8ヶ月の工数を8日で完了）を紹介しました。この記事ではその仕組みを**学生フォーミュラのECU制御ソフト開発**に応用します。

---

## 学生フォーミュラにおける課題

学生フォーミュラのECU（エンジン制御ユニット）ソフトウェアは、チームが年をまたいで継ぎ足し開発した「技術的負債の塊」になりがちだ。現実を数字で示そう。

- **単体テストカバレッジ：平均20〜30%**（信頼性指標の業界標準水準の半分以下）
- スロットルマップや牽引力制御コードのリファクタリング後のテスト追加：**1件あたり1〜2日**
- 「テストを書こう」と言っても誰もやらない根本原因：**3日後の走行テストの準備で手が回らない**
- テストがないまま走行 → 予期しない挙動 → 原因調査に数時間、という悪循環

Devinはこのループを「就寝中に断ち切る」。朝起きたら整備済みのPRが届いているという状況を実現する。

---

## Devinを使った解決アプローチ

Devinの「非同期自律実行（Asynchronous Autonomous Execution）」は、GitHubリポジトリとタスク仕様を渡すと、**人間が離席している間に**コードを読み・テストを書き・CIを通し・PRを作る。

背景の技術を理解しよう。Devinは内部に**コードエディタ・ターミナル・Webブラウザ**を統合した隔離サンドボックス環境を持ち、pytestが失敗すればエラーログを読んで自己修正するフィードバックループを持つ。**動的再計画（Dynamic Replanning）**機能により、テストが落ちてもデバッグしながら再実行を繰り返す。人間がやることは翌朝PRのレビューと承認（30分）だけだ。

従来のコーディング支援ツール（GitHub Copilotなど）との決定的な違いは、Devinは「人間が画面の前にいなくても動き続ける」点にある。

---

## 実装：ステップバイステップ

**前提条件**

| 必要なもの | バージョン | 入手先 |
|-----------|-----------|--------|
| Devinアカウント | Team Plan以上 | app.devin.ai |
| cognition-sdk (Python) | 最新版 | `pip install cognition-sdk` |
| ECUコードのGitHubリポジトリ | — | チームのGitHub |
| GitHub App連携 | — | app.devin.ai → Settings → GitHub |

```bash
# === ステップ1: Devin Python SDKをインストールする ===
pip install cognition-sdk   # Devin公式SDKをインストール

# === ステップ2: APIキーを環境変数に設定する ===
# (app.devin.ai → API Keys でキーを発行)
export COGNITION_API_KEY="ck-xxxxxxxxxxxxxxxxxxxx"
```

走行テスト前夜（5分で設定完了）に以下のスクリプトを実行する：

```python
# === student_formula_devin_test_gen.py ===
import cognition

# === ステップ1: Devinクライアントを初期化する ===
# APIキーは環境変数 COGNITION_API_KEY から自動読み込みされる
client = cognition.Cognition()

# === ステップ2: タスクの詳細を定義する ===
# チームのリポジトリURLに書き換えること
REPO_URL = "https://github.com/your-team/formula-ecu-software"

task_description = """
以下の作業を自律実行してください。

【対象】formula-ecu-software/src/controllers/ 以下の制御ファイル
【作業1】スロットルマップ計算 throttle_map.py のリファクタリング
  - 200行超の関数を30行以下の小関数に分割する
  - マジックナンバーをすべて定数化する
    例: 0.85 → THROTTLE_SLIP_RATIO_LIMIT
【作業2】pytest 単体テストを新規作成する
  - tests/test_throttle_map.py を新規作成すること
  - 正常系（スロットル開度 0〜100%）、境界値（-1%、101%）、
    異常系（None入力・型エラー）を網羅すること
  - テストカバレッジ 80% 以上を達成すること
【作業3】GitHub PRを作成する
  - ブランチ名: feat/ecu-test-coverage-throttle
  - PRタイトル: 「ECU: スロットルマップのテストカバレッジを20%→80%に向上」
  - PRの説明に Before/After のカバレッジ数値を記載すること

制約:
  - 既存の CI（.github/workflows/test.yml）が全ジョブpassすること
  - 関数の外部インターフェース（引数・戻り値の型）を変えないこと
  - 日本語コメントを維持すること
"""

# === ステップ3: タスクを投入する（非同期・即座に返る）===
task = client.tasks.create(
    title="ECUスロットルマップ リファクタリング＆テスト自動生成",
    description=task_description,
    repo_url=REPO_URL,
    branch="feat/ecu-test-coverage-throttle",
)

print(f"タスク投入完了。ID: {task.id}")
print("Devinが自律実行を開始しました。翌朝PRを確認してください。")
print(f"進捗確認URL: https://app.devin.ai/tasks/{task.id}")
# ここでスクリプトを終了してOK。Devinはバックグラウンドで動き続ける


# ===== 翌朝、コーヒーを飲みながら以下を実行する =====
def check_result(task_id: str):
    """完了したタスクのPR URLを取得する"""
    t = client.tasks.get(task_id)
    if t.status == "completed":
        print(f"完了！PR URL: {t.pull_request_url}")
    elif t.status == "failed":
        print(f"失敗。ログで原因確認: https://app.devin.ai/tasks/{task_id}")
    else:
        print(f"まだ実行中: {t.status}")

# 使い方: check_result("task-sf-20260622-001")
```

このスクリプトを投入すると以下が出力されます：

```
タスク投入完了。ID: task-sf-20260622-001
Devinが自律実行を開始しました。翌朝PRを確認してください。
進捗確認URL: https://app.devin.ai/tasks/task-sf-20260622-001

--- 翌朝 8:20 に check_result() を実行した場合 ---
完了！PR URL: https://github.com/your-team/formula-ecu-software/pull/47
```

GitHubのPRを開くと、リファクタリング済みのコード・新規テストファイル・CIグリーンのバッジ・Before/Afterのカバレッジ比較表が揃った状態で届いている。

---

## Before / After（実数値で比較）

| 項目 | Devinなし（手動） | Devin使用後 |
|------|---------------------|--------------|
| テストカバレッジ | 20〜30% | **80%以上** |
| テスト整備にかかる時間 | 5〜7日 | **8時間（就寝中に完了）** |
| エンジニアの直接作業時間 | 延べ20〜35時間 | **PRレビュー30分のみ** |
| リファクタリング後のCI確認 | 翌日を待つ | **PRにCI結果が添付済み** |
| 1スプリントで整備できるモジュール数 | 1〜2件 | **5〜8件** |

---

## よくあるエラーと対処

| エラー | 原因 | 解決法 |
|--------|------|--------|
| `GitHub App not installed` | DevinがリポジトリにアクセスできないGitHub App未連携 | app.devin.ai → Settings → GitHub Integrationから連携 |
| `Task stuck in pending` | 同時実行タスク上限（Planによる制限） | 前のタスクが完了してから再投入、またはPlanをアップグレード |
| `CI failed: ModuleNotFoundError` | 依存ライブラリがrequirements.txtに未記載 | `requirements.txt`または`pyproject.toml`をリポジトリルートに追加 |
| `cognition not found` | SDKの古いバージョン名 | `pip install cognition-sdk --upgrade` |
| `Task failed: no test files found` | testsディレクトリが存在しない | リポジトリに空の `tests/__init__.py` を先にコミットしておく |

---

## 学生フォーミュラ・レース車両開発への応用

ECU制御ソフトのテスト整備は、単なるコード品質の問題ではない。**走行安全性に直結する**。スロットルマップのバグがテストなしで本番に入れば、次の走行テストでスロットルが意図しない動作をする可能性がある。

学生フォーミュラチームが抱える本質的な制約は「人数が少ない（多くて10名程度）×タスクが多い×締め切りが常に目前」だ。Devinはこの制約を「夜間稼働」で解決する。

**具体的な活用シナリオ：**
1. **設計審査1週間前**：牽引力制御（TCS）コードのリファクタリングタスクをDevinに投入 → 翌朝PRが届く → メンバーが翌日を設計作業に使える
2. **走行テスト前夜**：「前回テストで見つかったスロットル急開時の挙動不具合のデバッグ」タスクをDevinに投入 → 朝6時にPRが届く → 9時の走行開始に間に合う
3. **引き継ぎ期（代替わり）**：旧コードへのコメント追加・ドキュメント生成タスクをDevinに大量投入 → 次年度メンバーが読めるコードベースが完成する

**Before：** 代替わりのたびに消えるコード知識、次年度メンバーが1ヶ月かけて読解  
**After：** Devinが就寝中にコメント・README・テストを追加し、引き継ぎコストが大幅削減

---

## 今週の学生チームへの宿題

今夜の走行データ整理が終わったら、以下のコマンド1行を実行してみてください：

```bash
python student_formula_devin_test_gen.py
```

翌朝のミーティングでPRのリンクをチームに共有するだけで、「ずっと後回しだったECUテスト整備」が完了しています。まず1つのモジュールで試すだけで、Devinの実力が実感できます。
