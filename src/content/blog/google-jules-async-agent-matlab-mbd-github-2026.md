---
title: "GitHubのIssueに「jules」を割り当てるだけでMATLABコードが非同期修正される——Google Julesをレース車両MBDワークフローに組み込む実践ガイド2026"
date: 2026-06-05
category: "AI Coding"
tags: ["Google Jules", "Gemini 3 Pro", "非同期エージェント", "GitHub", "MATLAB", "CI/CD自動化"]
tool: "Google Jules"
official_url: "https://jules.google/"
importance: "high"
summary: "Google LabsのJulesはGemini 3 Pro搭載の非同期AIコーディングエージェント。GitHubのIssueに「jules」ラベルを付けるだけでクラウドVMが自律実行してプルリクエストを作成する。パブリックベータで無料——MBDエンジニアがSimulinkシミュレーション実行中に並列でコード修正を依頼できる新ワークフローを完全解説する。"
---

## はじめに

Simulinkモデルのシミュレーションを走らせながら、画面の前で手持ち無沙汰になっていないだろうか。MBDエンジニアには「待ち時間」が多い——計算が回っている間、テストコードの修正やレガシーMATLABスクリプトのリファクタリングを並行してこなせれば、効率は倍になる。だが、CursorやWindsurfは「あなたが画面の前にいる」前提の同期型ツールだ。**Google Julesはその発想を根本から変える**：タスクを割り当てたら画面を閉じて別の作業に移っていい。GitHub Copilot Coding AgentやDevinと同じエージェント型だが、価格とGitHub統合の手軽さでは一線を画す——そして2026年現在、パブリックベータ期間中は無料だ。

## Google Julesとは

Google Jules（jules.google）はGoogle LabsがGemini 3 Proをバックエンドに2026年にパブリックベータ公開した**完全非同期AIコーディングエージェント**だ。最大の特徴は三点ある。

**① GitHub-ネイティブ統合**: 新しいIssueに`jules`ラベルを付けるだけで起動する。追加のCLIやIDEプラグインは一切不要。

**② 実行前に計画を提示**: Julesは作業を開始する前に「このファイルのこの部分をこう変更する」という計画をIssueコメントに投稿する。承認ボタンを押すまで実行されないため、予期しない変更を避けられる。

**③ CI失敗時の自動リトライ**: 作成したPRのCIパイプラインが落ちた場合、Julesが自動でエラーを検知・分析・修正を再プッシュする。

既存ツールとの比較:

| ツール | 動作スタイル | GitHub統合 | 料金（2026年6月） |
|--------|-------------|-----------|-----------------|
| Cursor / Windsurf | 同期（常時監視型） | なし | $20/月〜 |
| GitHub Copilot Coding Agent | 非同期 | PR起点 | $10/月〜 |
| Devin（Cognition） | 同期/非同期 | あり | $500/月〜 |
| Sourcegraph Amp | 同期 | なし | 無料〜 |
| **Google Jules** | **完全非同期** | **Issue起点** | **無料（ベータ）** |

Julesはどんな言語にも対応できる（「言語非依存」と公式が明記）が、PythonとTypeScriptが最も実績が多い。MATLABやC++は`jules.json`でセットアップスクリプトを指定することで動作させられる。

## 実際の動作：ステップバイステップ

### Step 1: リポジトリにJulesをインストール

GitHub Marketplaceでインストールするだけ（所要1分）:

```
https://github.com/marketplace/google-jules
```

インストール後、対象リポジトリの **Settings → GitHub Apps → Jules** で有効化する。

### Step 2: Issueを書いてjulesラベルを付ける

```markdown
# CANデータ読み込み関数のバグ修正

## 問題
`src/utils/can_data_parser.m` がファイルサイズ10MB超のログで
`Index exceeds matrix dimensions` エラーを出す。

## 再現手順
1. `data/testrun_20260530.csv`（12MB）を入力として使用
2. `can_data_parser('data/testrun_20260530.csv')` を実行
3. エラーが発生する

## 期待する動作
任意サイズのCSVを正しく処理できること。
バッファサイズを動的に確保する実装に修正すること。

## 対象ファイル
`src/utils/can_data_parser.m`
`tests/test_can_data_parser.m`（修正後にテストも追加）
```

Issueに `jules` ラベルを付けてSubmitすると、数分以内にJulesが反応する。

### Step 3: Julesが実行計画を提示

```
## Jules の作業計画

1. `can_data_parser.m` を読み込み、行列サイズ処理の箇所を特定
2. 事前割り当てを動的確保（`zeros` → `[]` + `end+1` 方式）に変更
3. `test_can_data_parser.m` に10MB超ファイルのテストケースを追加
4. 全テストを実行して GREEN を確認
5. PR を作成

承認しますか？  👍 Approve  ✏️ Modify
```

「👍 Approve」をクリックしてSimulinkシミュレーションの結果待ちに戻る。

### Step 4: PRが届く（15〜30分後）

```
Jules から PR: fix(parser): 大容量CSVの動的バッファ確保に変更

変更内容:
- can_data_parser.m: preallocate_buffer() を動的確保に修正
- test_can_data_parser.m: 12MBファイルテストを追加
- テスト結果: 15/15 PASS ✅
- CI: green ✅
```

## Before / After 比較

| 項目 | Jules導入前 | Jules導入後 |
|------|------------|------------|
| バグ修正1件にかかるエンジニア拘束時間 | 1〜3時間（調査から修正・テストまで自分で） | 5分（Issue記述）＋確認15分 |
| テストコード追加 | 修正と別タスクで後回しになりがち | Julesが修正と同時に自動生成 |
| 複数バグの並列対応 | 不可（直列のみ） | 最大15タスク同時並列（Proプラン） |
| CIが落ちた時の対応 | 自分でログを読んで再修正 | Jules が自動検知・再修正 |
| 月額コスト | — | 無料（ベータ）/ Pro: 料金未定 |

## 実践コード例：MBD向けIssueテンプレート集

以下は学習コストなしで今日から使えるJules用Issueテンプレートだ。

**前提条件:** MATLAB R2024b以降のコードが入ったGitHubプライベートリポジトリ、Jules インストール済み。

### テンプレートA：ユニットテスト自動生成

```markdown
# [Jules] suspension_kinematics.m のユニットテストを生成

## タスク
`src/models/suspension_kinematics.m` 内の以下の関数に対し、
MATLAB Unit Test クラスを作成してほしい：
- `calc_camber_angle(steering_angle, suspension_travel)`
- `calc_toe_angle(steering_angle, suspension_travel)`

## テスト要件
- `matlab.unittest.TestCase` を継承したクラスで作成
- 正常値テスト（ステア±30deg, サスペンション±50mm）
- 境界値テスト（ゼロ入力、最大値）
- 保存先: `tests/test_suspension_kinematics.m`
```

JulesがPRで返してくる出力例:

```matlab
% tests/test_suspension_kinematics.m（Jules自動生成）
classdef test_suspension_kinematics < matlab.unittest.TestCase

    methods (TestMethodSetup)
        function setup(~)
            % テスト前にsrc/modelsをパスに追加
            addpath(fullfile(fileparts(mfilename('fullpath')), '../src/models'));
        end
    end

    methods (Test)
        function testCamberNominal(testCase)
            % ステア0・サスペンション中立でキャンバー角が定義範囲内であることを確認
            actual = calc_camber_angle(0, 0);
            testCase.verifyGreaterThanOrEqual(actual, -3.0);
            testCase.verifyLessThanOrEqual(actual, 3.0);
        end

        function testCamberBoundaryMaxSteer(testCase)
            % ステア最大値でNaNやInfが出ないことを確認（ジンバルロック防止）
            actual = calc_camber_angle(30, 0);
            testCase.verifyNotNaN(actual);
            testCase.verifyNotInf(actual);
        end

        function testToeNominal(testCase)
            % ニュートラル位置でトー角が±0.5deg以内であることを確認
            actual = calc_toe_angle(0, 0);
            testCase.verifyEqual(actual, 0, 'AbsTol', 0.5);
        end
    end
end
```

実行すると（`runtests('test_suspension_kinematics')`）：
```
Running test_suspension_kinematics
...
Done test_suspension_kinematics
All 3 tests passed.
```

**よくあるエラーと対処:**

| エラー | 原因 | 解決法 |
|--------|------|--------|
| `Undefined function` エラー | Issueにファイルパスが未記載 | Issue本文に対象ファイルの絶対パスを明記 |
| Jules がタイムアウト | リポジトリが大きく解析に時間がかかる | 対象ファイルとテスト保存先を明確に指定する |
| CI失敗ループ（Jules が3回リトライ後に停止） | テスト仕様自体に矛盾がある | Issue の「期待する動作」を具体的な数値で記述し直す |

次のステップ: テストが通ったら `matlab-actions/run-tests` を使いGitHub ActionsのCIに組み込みましょう。

## 注意点・落とし穴

- **Simulink（.slxバイナリ）は操作不可**: JulesはテキストベースのMATLABスクリプト・Mファイルのみが対象。Simulinkモデルの改変はできない。
- **プライベートリポジトリを必ず使うこと**: 機密ECUコードや車両データをパブリックリポジトリに上げてJulesに渡すことは、情報漏洩リスクになる。社内のセキュリティポリシーを事前確認する。
- **MATLAB公式サポートは記載なし**: Jules は言語非依存だが、MATLABへの特化機能はない。MATLABのパス設定や依存関係は`jules.json`のセットアップスクリプトで手動指定が必要。
- **ベータ終了後は有料化予定**: Googleは正式リリース後に課金開始を予告している。使い込む前にコスト試算を行うこと。

## 応用：より高度な使い方

JulesとGitHub ActionsのMATLABテスト（`matlab-actions/run-tests`）を組み合わせると、**テスト失敗→Julesが自動修正→CI再実行→マージ**という完全自律パイプラインが作れる。

さらに`jules.json`にリポジトリ固有のセットアップを書くことで、MATLAB Add-On Toolboxのインストールやパス設定を自動化できる:

```json
{
  "setup": "matlab -nodisplay -r \"addpath(genpath('src')); exit\"",
  "test_command": "matlab -nodisplay -r \"results=runtests('tests'); exit(any([results.Failed]))\"",
  "max_retries": 3
}
```

## 学生フォーミュラ・レース車両開発への応用

学生フォーミュラチームはメンバー全員がMATLABの熟練者とは限らず、テスト走行後のバグ修正やコードメンテナンスが後回しになりがちだ。Julesはこの問題を解決する。

**具体的なシナリオ：走行会当日のテレメトリ解析スクリプト修正**

走行会で記録した100HzサンプリングのCANデータを読み込むMATLABスクリプトが、特定の走行条件でエラーを出している。しかし、当日はチーム全員が車両整備と次の走行準備に追われている。

このとき、**Issueを5分で書いて`jules`ラベルを付けて車両に向かう**。30分後、走行の合間にスマートフォンでPR通知を確認し、修正内容に問題がなければApprove→マージする。

**背景理論（学生でも分かる言葉で）：**
非同期エージェントの価値は「マルチタスキング」にある。人間が深く集中できる作業は一度に一つだが、AIエージェントは複数のコード修正タスクを並列実行できる。Jules（Proプランで最大15タスク並列）なら、1人のエンジニアが15個の異なるバグを同時に依頼できる——シミュレーション計算中、走行待機中、会議中でも関係なく。

**実際に動くIssue例（今すぐ試せる）:**

```markdown
# [Jules] テレメトリローダーの速度フィルタバグ修正

## バグ
`telemetry/speed_filter.m` の lowpass_filter() が
fs=200Hz で fc=50Hz のローパスフィルタのはずなのに
出力に高周波ノイズが残っている

## 期待する動作
MATLAB の butter(4, fc/(fs/2), 'low') + filtfilt() で
正しいバタワースフィルタを実装すること

## 対象ファイル
telemetry/speed_filter.m
```

**Before / After（数字で）:**

| 指標 | Jules導入前 | Jules導入後 |
|------|------------|------------|
| テスト走行後のデバッグ待ち時間 | 平均2時間（帰宅後に対応） | 30分（走行中にJulesが並列実行） |
| テストコードカバレッジ | 約20%（人手不足で後回し） | 60〜70%（Julesが修正と同時生成） |
| 1イベントでのバグ修正件数 | 3〜5件（エンジニア1人が直列で対応） | 10〜15件（Jules複数タスク並列） |

**学生チームが今すぐ試せる最初のステップ：**
1. GitHubプライベートリポジトリにMATLABコードをpush
2. `https://github.com/marketplace/google-jules` でインストール（無料）
3. 既知バグをIssueに書いて`jules`ラベルを付けてSubmitする

## 今すぐ試せる最初の一歩

```bash
# Jules のインストールはブラウザのみで完結（コマンドライン不要）
# 1. https://jules.google/ にアクセス
# 2. "Sign in with Google" → GitHub連携
# 3. 対象リポジトリを選択してインストール
# 4. GitHubのIssueに "jules" ラベルを付けてタスクを送信
```

Jules公式ドキュメント: https://jules.google/docs/
