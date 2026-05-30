---
title: "AWS Kiro IDEが変えるC++組み込み開発——仕様書を書くだけでMISRA対応コードが自動生成される「スペック駆動開発」実践ガイド"
date: 2026-05-30
category: "AI Coding"
tags: ["AWS Kiro", "組み込みC++", "スペック駆動開発", "エージェントIDE", "自動テスト生成"]
tool: "AWS Kiro"
official_url: "https://kiro.dev"
importance: "high"
summary: "2026年5月に新規登録終了したAmazon Q Developerの後継として登場したAWS Kiro IDEは、自然言語の要件からEARS記法の仕様書を自動生成し、そこからコード・テスト・ドキュメントを一括作成するスペック駆動開発を実現する。C/C++組み込み開発でもAgent HooksとMCPサーバーを組み合わせることでMISRA違反の自動検出や単体テスト自動更新が実現でき、Cursorの「ノリ書き」とは一線を画す工学的アプローチが評価されている。"
---

## はじめに

「AIがコードを書いてくれるのは嬉しいが、仕様との整合性がどんどん取れなくなる」——これはCursorやGitHub Copilotを使い始めた組み込みエンジニアが口をそろえて言う悩みだ。AIに任せれば任せるほど、コードは増えるが要件ドキュメントとの乖離が広がり、レビューに余計な時間がかかる。

AWSが2025年後半にリリースした**「Kiro」**は、この問題に正面から向き合ったアジェンティックIDEだ。2026年5月15日をもって新規登録が終了したAmazon Q Developerの後継として位置づけられており、既存ユーザーも2027年4月30日以降はKiroへの移行が推奨されている。

Kiroを知らないまま組み込み開発を続けると、仕様管理とコード生成が永遠に分離したまま。AUTOSARやMISRAが求める「要件トレーサビリティ」をAIで自動的に維持できるこのツールを、今すぐ理解しておく価値がある。

## AWS Kiro IDEとは

KiroはAWSが開発したアジェンティックIDEで、Amazon BedrockのClaude Sonnet/Opus（推論用）とAmazon Nova（コード生成用）を基盤として動作する。単なるコード補完ツールではなく、**スペック駆動開発（Spec-Driven Development）**を核心に据えた設計が特徴だ。

「ノリでコードを書く（vibe coding）」に対するアンチテーゼとして設計されており、Amazon re:Invent 2025で正式発表されてから急速に採用が広がっている。

| 項目 | Kiro | Cursor | GitHub Copilot |
|------|------|--------|---------------|
| 開発元 | AWS (Amazon) | Anysphere | GitHub |
| 動作基盤 | Claude + Nova via Bedrock | GPT-4o / Claude | GPT-4o / Claude |
| 最大の特徴 | スペック駆動 | チャット駆動 | エディタ補完 |
| Agent Hooks | ネイティブ対応 | 非対応 | 非対応 |
| 料金 | 無料50回/月・Pro $19/月 | Free / $20/月 | $10〜$19/月 |
| C++組み込み対応 | ○（MISRA hook可） | △ | △ |

## 実際の動作：スペック駆動開発のステップバイステップ

Kiroのフル機能を使うには「Spec Mode」を選ぶ。チャット欄に実装したい機能を自然言語で記述するだけで、以下の3ファイルが自動生成される。

```
.kiro/specs/can-frame-parser/
├── requirements.md   # EARS記法の要件一覧（自動生成）
├── design.md         # アーキテクチャ・インターフェース設計（自動生成）
└── tasks.md          # 実装タスクのチェックリスト（自動生成）
```

### EARS記法で生成される requirements.md の例

```
WHEN the CAN bus receives a frame with ID 0x100
THE SYSTEM SHALL parse the payload into a CANFrame struct
WHERE payload length is exactly 8 bytes

WHEN the payload length is not 8 bytes
THE SYSTEM SHALL return ParseResult::kInvalidLength
```

EARS（Easy Approach to Requirements Syntax）は航空・自動車向け要件記述の標準記法だ。ISO 26262のワークプロダクトとしてそのまま使えるレベルの構造化されたテキストが、自然言語入力から数秒で生成される。

要件が承認されると、Kiroはdesign.mdに構造体定義とAPIインターフェースを、tasks.mdに実装ステップ一覧を自動生成する。エンジニアは各タスクの「Run」ボタンを押すだけで、要件と整合したC++コードが生成される。

### Agent Hooksで自動化する

`.kiro/hooks/`ディレクトリにJSON設定を置くことで、ファイル保存・作成・削除時に自動でAIエージェントが動作する仕組みがAgent Hooksだ。GitHub Actionsのローカル版と理解するとわかりやすい。

```json
// .kiro/hooks/misra-lint-on-save.json
{
  "name": "misra-lint-on-save",
  "event": "file-saved",
  "filePattern": "src/**/*.cpp",
  "prompt": "このC++ファイルのMISRA-C++ 2023違反を検出し、違反箇所・ルール番号・修正案を列挙してください。Rule 0-1-2（使用されない変数）、Rule 5-2-6（明示的でないキャスト）を重点確認すること。"
}
```

このhookをチームリポジトリにコミットして共有すれば、全員のPCで同じ品質ゲートが自動で実行される。

## Before / After 比較

| 作業 | 従来（人手） | Kiro導入後 |
|------|------------|-----------|
| 要件→コード変換 | 仕様書を見ながら手作業で2〜4時間 | EARS仕様書から自動生成 15〜30分 |
| 単体テスト作成 | 1関数あたり20〜40分 | file-created hookで自動生成 3〜5分 |
| MISRA確認 | 手動レビュー＋ツール実行で1時間 | 保存のたびに自動チェック（0分） |
| ドキュメント更新 | コード変更後に手動（忘れがち） | ARXMLやAPIヘッダ変更→自動更新 |

特に「コードを追加するたびにドキュメントが古くなる」問題は、save hookによって実質的に解消される。要件管理とコード管理が初めて同期する。

## 実践コード例

以下はKiroのAgent Hookを使って、C++ファイル作成時に自動でGoogleTestスタブを生成し、ARXMLファイル保存時にSWCドキュメントを自動更新する設定例だ。

```json
// .kiro/hooks/generate-test-stub.json
{
  "name": "generate-unit-test-on-create",
  "event": "file-created",
  "filePattern": "src/**/*.cpp",
  "prompt": "新しく作成されたC++ソースファイルに対し、GoogleTestフレームワークを使った単体テストのスタブをtests/ディレクトリに生成してください。public関数それぞれに正常系と異常系を1ケースずつ含めること。"
}
```

```json
// .kiro/hooks/autosar-swc-doc.json
{
  "name": "update-swc-doc-on-save",
  "event": "file-saved",
  "filePattern": "**/*.arxml",
  "prompt": "変更されたARXMLファイルの差分を確認し、SWCポートと内部動作の変更点をdocs/README_SWC.mdに日本語で追記してください。追記形式は## YYYY-MM-DD 変更内容 の見出しを使うこと。"
}
```

Hookの設定はJSON手書きでも、Kiroの画面上で自然言語を入力して自動生成させることもできる。チームで`.kiro/`ディレクトリをgit管理に含めれば、プロジェクトのAI自動化ルールが全員に即時共有される。

## 注意点・落とし穴

- **MATLAB・Simulinkは非対応**：KiroはMATLABファイル（.m、.slx）を直接解釈できない。MATLAB MCP Serverとの組み合わせは設定上可能だが、2026年5月時点では公式サポートはない
- **Spec Modeは高コスト**：Spec Mode 1回の操作はVibe Mode 5回分のクレジットを消費する（$0.20 vs $0.04）。短い修正にはVibe Modeを使い分けること
- **クラウド推論のみ**：Bedrock経由のクラウド推論専用で、ローカルLLM実行には非対応。社内ネットワークポリシーでクラウドAPIが制限されている組織では事前に確認が必要
- **純粋C言語はやや苦手**：C++は高品質だが、MISRA-C 2012の純粋C（組み込みRTOS等）ではコード生成精度が低下する傾向がある

## 応用：より高度な使い方

KiroはMCP（Model Context Protocol）にネイティブ対応しており、外部サーバーと連携することで真価を発揮する。

- **JIRAチケット→自動spec生成**：JIRA MCPサーバーと接続し、チケット番号を指定するだけでKiroがタスク内容を読み込んで仕様書を自動生成する
- **dSPACE ModelDeskとの連携**：bashフック（shellコマンドフック）でModelDesk CLIを呼び出し、Simulinkモデル変更後に自動でHILビルドを開始する運用が可能
- **GitHub Actionsとのブリッジ**：`.kiro/hooks/`のagentが生成したファイルをそのままGit stageしてCIをトリガーする自動化パイプラインを構築できる

## 今すぐ試せる最初の一歩

Kiro CLIは以下のコマンドで5分以内にセットアップ可能だ。

```bash
# macOS / Linux インストール
curl -sSL https://kiro.dev/install.sh | bash

# 初回認証（Kiroアカウントは無料作成可）
kiro auth login

# 既存プロジェクトの初期化
cd your-project && kiro init
```

`kiro init`を実行すると`.kiro/`ディレクトリが作成され、最初のspecを作成するウィザードが起動する。Vibe Modeなら無料枠50回/月の範囲内で即座に試せる。まず既存のC++関数1つに対してspecを生成させてみると、仕組みが直感的に理解できる。
