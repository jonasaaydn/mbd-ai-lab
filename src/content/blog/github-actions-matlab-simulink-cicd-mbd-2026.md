---
title: "GitHubにpushするたびSimulinkモデルが自動検証される——GitHub Actions × MATLAB CI/CDパイプラインを30分で構築する実践手順"
date: 2026-05-28
category: "AI Coding"
tags: ["GitHub Actions", "MATLAB", "Simulink", "CI/CD", "MBD", "自動テスト", "Polyspace"]
tool: "GitHub Actions for MATLAB"
official_url: "https://github.com/matlab-actions"
importance: "high"
summary: "MBDチームの『コード変更→手動テスト→バグ発見→手直し』の無駄サイクルを断ち切る方法がある。GitHub ActionsのMATLAB公式アクションを使えば、Simulinkモデルの単体テスト・カバレッジ計測・Polyspace静的解析を全自動化できる。YAMLファイル1本で実現する完全解説と、コピペで動く実践コードを本記事にまとめた。"
---

## はじめに

「先週マージしたSimulinkモデル、テストブランチで動かなくなっていた」——MBD現場で繰り返されるこの悪夢は、pushのたびに自動でモデル検証が走るCI/CDパイプラインで防げる。しかし現実には「MATLABライセンスをどうするか」「Simulinkモデルをコマンドラインからどう実行するか」という壁が立ちはだかり、多くのチームが依然として手動テストに甘んじている。

MathWorksが提供する公式GitHub Actionsセット（`matlab-actions` v3）を使えば、この壁は30分で乗り越えられる。MATLAB R2022b以降のプロジェクトであれば、Simulink Testの自動実行・カバレッジレポート生成・Polyspace Bug Finderの静的解析をYAMLファイル1本で完結できる。「自動化の設定に何週間もかかる」という思い込みは、もはや過去のものだ。

## GitHub Actions for MATLABとは

`matlab-actions`はMathWorksが公式にメンテナンスするGitHub Actions用拡張セットで、2024年にv3がリリースされ、Linux・Windows・macOSのランナー全環境に対応した。

| アクション名 | 役割 |
|------------|------|
| `setup-matlab@v3` | ランナーへのMATLABインストール（R2021a以降） |
| `run-tests@v3` | MATLABユニットテスト・Simulink Testの自動実行 |
| `run-build@v3` | MATLAB Build Toolによるタスクパイプライン（R2022b以降） |
| `run-command@v3` | 任意のMATLABスクリプト・関数を実行 |

Jenkins・GitLab CIとの最大の違いは、MathWorksが直接サポートしている点と、GitHub-hostedランナー上でライセンスサーバーへの接続なしで動作できる点にある。セルフホストランナーを使う場合は社内ライセンスサーバーへの接続が必要だが、クラウド環境では追加設定ゼロで動き始める。

## 実際の動作：ステップバイステップ

### Step 1: ワークフローYAMLを作成する

リポジトリに `.github/workflows/matlab-ci.yml` を以下の内容で作成する。

```yaml
name: MATLAB/Simulink CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up MATLAB R2026a
        uses: matlab-actions/setup-matlab@v3
        with:
          release: R2026a
          products: >
            Simulink
            Simulink_Test
            Simulink_Coverage
            Polyspace_Bug_Finder

      - name: Run Simulink Tests
        uses: matlab-actions/run-tests@v3
        with:
          source-folder: src
          test-results-junit: test-results/results.xml
          code-coverage-cobertura: coverage/code-coverage.xml
          model-coverage-cobertura: coverage/model-coverage.xml

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: |
            test-results/
            coverage/
```

### Step 2: Simulink Testハーネスをコマンドラインから実行できるよう準備する

プロジェクトルートに `run_all_tests.m` を作成し、Simulink Testマネージャーをスクリプトで制御できるようにする。

```matlab
sltest.testmanager.clear();
sltest.testmanager.load('tests/VehicleControlTest.mldatx');
results = sltest.testmanager.run();
% テスト失敗時にCIを失敗扱いにする
failCount = sum([results.Outcome] ~= sltest.testmanager.TestOutcome.Pass);
if failCount > 0
    error('%d件のテストが失敗しました', failCount);
end
```

### Step 3: PRを作成するとChecksが自動起動する

`git push` または PRを作成すると、GitHubのActionsタブにジョブが現れ、テスト結果がChecks画面に表示される。失敗した場合はマージボタンが赤くなり、チームへの通知メールが自動送信される。

## Before / After 比較

| 項目 | CI/CD導入前 | CI/CD導入後 |
|------|------------|------------|
| テスト実施頻度 | リリース前1〜2回 | push・PR毎に自動 |
| バグ発見タイミング | マージ後数日〜1週間 | push後30分以内 |
| カバレッジ確認 | 手動・月次 | 毎PRでレポート自動生成 |
| Polyspace静的解析 | 省略されがち | 毎回強制実行 |
| テストエビデンス収集 | Excelに手動記録 | JUnit XML・Coberturaで自動保存 |

テスト漏れによる手直し工数は1件あたり平均2〜3時間と言われる。週5件のPRが走るチームでは、週10〜15時間の削減に直結する。

## 実践コード例

カバレッジ付きでSimulinkモデルを自動テストするMATLABスクリプト（コピペで動く）：

```matlab
% CI環境向けSimulinkテスト実行スクリプト
import matlab.unittest.TestSuite;
import matlab.unittest.TestRunner;
import matlab.unittest.plugins.CodeCoveragePlugin;
import matlab.unittest.plugins.XMLPlugin;
import matlab.unittest.plugins.codecoverage.CoberturaFormat;

suite = TestSuite.fromFolder('tests', 'IncludingSubfolders', true);
runner = TestRunner.withTextOutput;

% カバレッジプラグイン設定
covFile = 'coverage/code-coverage.xml';
runner.addPlugin(CodeCoveragePlugin.forFolder('src', ...
    'Producing', CoberturaFormat(covFile)));

% JUnit XML出力プラグイン
xmlFile = 'test-results/results.xml';
runner.addPlugin(XMLPlugin.producingJUnitFormat(xmlFile));

results = runner.run(suite);
% 失敗があればCI失敗 (exit code 1)
assertSuccess(results);
```

## 注意点・落とし穴

**ライセンスコスト**: GitHub-hostedランナーではMathWorksが時間課金ライセンスを提供する。Simulink・Simulink Testを含む場合、1回のCIジョブで数百円〜数千円のライセンス費用が発生する場合があるため、事前に料金体系を確認すること。

**バージョン固定の重要性**: `setup-matlab@v3` で `release: R2026a` と明記しないと、MATLABバージョン変更時に既存テストが予告なく壊れる。

**Simulinkモデルのパス問題**: Windows/Linuxでパス区切り文字が異なる。Simulinkモデル内のデータファイル参照は `fullfile()` を使って記述すること。

**実行時間の肥大化**: Simulinkシミュレーションが含まれる場合、1スイートで5〜30分かかることがある。`strategy: matrix` でジョブを並列化するか、差分テスト（変更されたモデルのみ実行）を検討する。

## 応用：より高度な使い方

基本パイプラインが動いたら、以下の発展的な統合が可能になる：

**Process Advisor統合**: `CI/CD Automation for Simulink Check` パッケージを使い、モデルアドバイザー・MISRA-C準拠チェック・要件トレーサビリティ確認をYAMLから一括起動できる。ローカルでProcess Advisorを使って事前確認（プリクオリファイ）してからpushすることで、CIの失敗率を大幅に下げられる。

**アーティファクト管理**: JFrog ArtifactoryやAmazon S3を使い、Simulinkモデル・生成Cコード・テストレポートをバージョン管理済みでアーカイブする。不具合が出たときに「どのバージョンのモデルで生成したコードか」を即座に追跡できる。

**GitHub Copilot Coding Agent連携**: CIが落ちたIssueをCopilotに割り当てると、AIが自動でMATLABコードを修正してPRを作成し、CIがグリーンになるまで反復してくれる（詳細は[関連記事](./github-copilot-coding-agent-matlab-mbd-2026.md)）。

## 今すぐ試せる最初の一歩

既存のMATLABリポジトリに以下の2ファイルを追加してpushするだけでCIが動き始める：

```bash
# ワークフローディレクトリを作成
mkdir -p .github/workflows

# 最小構成のYAMLを作成
cat > .github/workflows/matlab-ci.yml << 'EOF'
name: MATLAB CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: matlab-actions/setup-matlab@v3
        with:
          release: R2026a
      - uses: matlab-actions/run-tests@v3
EOF

git add .github/workflows/matlab-ci.yml
git commit -m "ci: GitHub Actions for MATLAB/Simulink"
git push
```

pushした瞬間から、GitHubリポジトリの「Actions」タブにテスト結果が表示される。まず最小構成で動かし、その後Simulink Testやカバレッジ測定を段階的に追加するのが最短ルートだ。
