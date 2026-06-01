---
title: "GitHubのIssueに『julesラベル』を貼るだけ：Google Julesが車載ソフト開発のタスク消化を非同期自動化する"
date: 2026-06-01
category: "AI Coding"
tags: ["Google Jules", "AI Agent", "GitHub", "Autonomous Coding", "Automotive", "Python", "Gemini 2.0"]
tool: "Google Jules"
official_url: "https://jules.google"
importance: "high"
summary: "GoogleのJulesは、GitHubのIssueに『julesラベル』を付けるだけでリポジトリを自動クローン→コード実装→テスト実行→PR作成まで非同期で完結する自律AIコーディングエージェント。Gemini 2.0搭載でパブリックベータ無料。AUTOSAR C++・Pythonテストスクリプトへの適用手順を実動コード付きで徹底解説。"
---

## はじめに

MBDエンジニアのGitHubリポジトリには「積み残したIssue」が溜まりやすい。テストを追加しなければならないMATLABスクリプト、リファクタリングが必要な古いデータ解析ルーティン、コメントのないAUTOSAR C++関数群——これらは誰かが手を動かさないと永久にIssueのまま残り続ける。特にレース現場では「コードを書く人」と「走行データを解析する人」が同一人物であることが多く、コード品質向上への時間確保は後回しになりがちだ。もしIssueに1つラベルを付けるだけで、AIが夜中のうちに実装してPRを開いておいてくれるとしたら？それを実現したのがGoogleの自律AIコーディングエージェント「Jules」だ。GitHub Copilot・Cursor・Claude CodeがIDEへの常駐を前提とするのに対し、Julesはエンジニアが**その場にいない間**に作業を完了させる。

## Google Julesとは

Julesは2025年末に限定ベータを開始し、2026年にパブリックベータへ移行したGoogleの非同期AIコーディングエージェントだ。Google Labsが開発し、Gemini 2.0 Flash（高速実行タスク）とGemini 2.0 Pro（複雑な推論タスク）を組み合わせて動作する。

既存のAIコーディングツールとの根本的な違いは**非同期性**にある。GitHub CopilotやClaude CodeはエンジニアとのリアルタイムなIDEセッションを前提とするが、JulesはGitHubのワークフローに直接統合されており、エンジニアはIssueを書いてラベルを付けるだけでよい。Julesは以下を**完全自律・非同期**で実行する：

1. リポジトリをクラウドサンドボックスにクローン
2. 実装計画（プランニング）をIssueにコメント
3. コードを変更・テストを実行・失敗したら自己修正
4. レビュー可能なPRを自動オープン

エンジニアが確認するのはPRの中身だけ。コードを書く時間はゼロだ。公開されたJules APIによりSlack・Jira・Linear・GitHub Actionsとの連携も可能で、CI/CDパイプラインへの完全統合も実現している。

## 実際の動作：ステップバイステップ

**前提条件：** GitHubアカウント + `jules.google` へのサインアップ（無料）+ GitHubリポジトリとの連携設定（OAuth）

### ステップ1：GitHubでIssueを作成し「jules」ラベルを付ける

```markdown
# Issue: レース走行ログパーサーにユニットテストを追加する

## やってほしいこと
`src/telemetry/lap_parser.py` の `parse_sector_times()` 関数に
pytest形式のユニットテストを追加してほしい。

テストデータは `tests/fixtures/sample_lap.csv` を使うこと。
正常系3ケース・異常系（空データ・欠損列）2ケースを網羅すること。
```

上記IssueにGitHubの「jules」ラベルを付けると、Julesが自動で起動する。

### ステップ2：JulesがPlanningコメントを投稿する（約2〜3分後）

```
[Jules] 実装計画:
1. lap_parser.py の parse_sector_times() を読み込んで仕様を理解する
2. 正常系: 通常の3セクター完走ラップ / タイムスタンプ精度確認 / 複数ラップ連続処理
3. 異常系: 空CSVファイル→ValueError / sector_timeカラム欠損→KeyError
4. tests/test_lap_parser.py を新規作成
5. pytest --cov=src/telemetry で全テスト合格を確認してからPRを開く
```

### ステップ3：実装完了後にPRが自動オープンする（約5〜15分後）

JulesはPRの説明に実装の判断根拠・差分サマリー・テスト実行ログを添付する。

**実行結果の例（PRコメントより）:**
```
テスト結果: 5/5 passed (0.34s)
カバレッジ: src/telemetry/lap_parser.py → 87%（+31%）
変更ファイル: tests/test_lap_parser.py（新規・72行）
```

エンジニアはPRを承認・マージするだけ。1行もコードを書かずにバックログが1件消化される。

## Before / After 比較

| 項目 | 従来（手作業） | Jules使用後 |
|------|----------------|-------------|
| タスク着手までの時間 | 次のスプリントまで待機（1〜2週間） | Issue作成後5〜15分 |
| エンジニアの実装工数 | 30〜90分/件 | 0分（PRレビューのみ） |
| テストカバレッジ向上 | 後回しになりやすい | 自動的に向上 |
| 深夜・週末のバックログ消化 | 不可能 | 非同期で自動実行 |
| CI/CD統合 | 別途スクリプト作成が必要 | Jules APIで即日統合 |

## 実践コード例：Jules APIを使ったCI/CD統合

Jules APIを使えば、GitHub ActionsやCIパイプラインから直接Julesにタスクを割り当てられる。例えば静的解析でエラーが検出されたら自動的にJulesに修正依頼を送るワークフローが構築できる。

**前提条件：** `jules.google` でアカウント取得 + APIキー発行 + `pip install requests`

```python
# === Jules APIでタスクを送信するスクリプト ===
# 使い方: python assign_jules.py --issue 42 --repo "your-org/your-repo"

import requests
import os
import argparse

# === ステップ1: Jules APIの設定 ===
# APIキーは環境変数から読み込む（コードに直書き厳禁）
JULES_API_KEY = os.environ["JULES_API_KEY"]

headers = {
    "Authorization": f"Bearer {JULES_API_KEY}",
    "Content-Type": "application/json"
}

def assign_to_jules(repo: str, issue_number: int, instructions: str):
    # === ステップ2: タスクを送信する ===
    payload = {
        "repo": repo,
        "issue_number": issue_number,
        "instructions": instructions
    }
    response = requests.post(
        "https://api.jules.google/v1/tasks",
        json=payload,
        headers=headers
    )
    result = response.json()

    # === ステップ3: タスクIDと進捗URLを表示する ===
    if "task_id" in result:
        print(f"タスク作成成功: ID={result['task_id']}")
        print(f"進捗確認: https://jules.google/tasks/{result['task_id']}")
    else:
        print(f"エラー: {result.get('error', 'unknown')}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--issue", type=int, required=True)
    parser.add_argument("--repo", required=True)
    args = parser.parse_args()

    assign_to_jules(
        repo=args.repo,
        issue_number=args.issue,
        instructions="pytestでユニットテストを追加し、カバレッジ80%以上を達成してPRを開いてください"
    )
```

**実行コマンド:**
```bash
JULES_API_KEY=your_key python assign_jules.py --issue 42 --repo "myteam/racing-telemetry"
```

**出力:**
```
タスク作成成功: ID=task_abc123xyz
進捗確認: https://jules.google/tasks/task_abc123xyz
```

**よくあるエラーと対処:**

| エラー | 原因 | 解決法 |
|--------|------|--------|
| `401 Unauthorized` | APIキー未設定・無効 | 環境変数 `JULES_API_KEY` を正しく設定する |
| `404 Not Found` | リポジトリへのアクセス権限なし | Jules側でGitHub連携を再設定する |
| `429 Too Many Requests` | ベータ期間中の利用制限に到達 | 1日あたりの上限を超えた、翌日に再試行 |

## 注意点・落とし穴

**MATLABの直接実行には制限あり：** JulesのクラウドサンドボックスにはMATLABライセンスがないため、`.m`ファイルや`.slx`（Simulinkモデル）を**実行**することはできない。ただしMATLABスクリプトの構文チェック・リファクタリング・コメント追加・Pythonラッパー生成は問題なく実行できる。MATLABコードのテストにはSIL環境との組み合わせが必要だ。

**対象コードの向き・不向き：** PythonデータパイプラインやAUTOSAR C++コードへのテスト追加・ドキュメント生成は非常に得意。複雑なシステムレベルのリファクタリングや、実行環境依存が強いコードへの変更は不得意。

**セキュリティ：** Julesはサンドボックスで動作するため、APIキーやCANデータベースのシークレットはリポジトリに含めてはならない。GitHub Secretsを経由する設計を必ず維持すること。

**料金：** パブリックベータ中は無料（利用制限あり）。ベータ終了後は有料化予定（価格未発表）。

## 応用：より高度な使い方

**MISRA違反の自動修正ループ：** PolyspaceやPC-lintで検出されたMISRA違反を、CI失敗時にJulesへ自動転送して修正PRを作らせるワークフローが構築できる。「静的解析→Jules修正→再解析」を人間なしで回せる。

**GitHub ActionsでのIssue自動生成＋Jules割り当て：** テストカバレッジが閾値を下回った場合に自動でGitHub Issueを生成し、julesラベルを付けてそのまま対応依頼する一連の自動化が、GitHub ActionsとJules APIの組み合わせで実現できる。

他にもJira・Slack・Linear連携の公式サンプルが `developers.google.com/jules/api` に掲載されており、既存のチケット管理システムとの統合が容易だ。

## 今すぐ試せる最初の一歩

```bash
# 1. jules.google でサインアップ（無料、GitHubアカウントで即時登録）
# 2. 自分のリポジトリに「jules」ラベルを作成する
gh label create jules --color 4285F4 --description "Google Jules AI agent task"
# 3. 積み残しのIssueにラベルを付けるだけ → 5〜15分でPRが届く
```

まずは「テストを追加してほしい」「コメントを書いてほしい」という軽いタスクから試すと感触を掴みやすい。
