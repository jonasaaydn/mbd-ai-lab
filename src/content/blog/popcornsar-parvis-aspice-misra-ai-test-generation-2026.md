---
title: "ASPICE V字モデルを3〜4倍速にする——PopcornSAR PARVISがテストケース自動生成・MISRA準拠を全自動化してMBD品質工数を激変させる理由"
date: 2026-05-30
category: "AI Coding"
tags: ["ASPICE", "MISRA", "テスト自動生成", "ISO 26262", "AI Coding", "AUTOSAR", "V字モデル"]
tool: "PopcornSAR PARVIS"
official_url: "https://autosar.io/en"
importance: "high"
summary: "ASPICE V字モデルの要件分析・コーディング・テスト生成を単一AIツールで自動化。MISRA-C準拠率を40%→94%に、テストカバレッジを86.4%に引き上げ、成果物作成を3〜4倍高速化したPopcornSAR PARVISの全容と実装手順を解説する。"
---

## はじめに

「要件からテストケースを起こすのに2週間かかった」「MISRA準拠チェックでレビューが毎回差し戻される」——自動車組み込みソフトウェア開発者なら誰もが一度は直面する壁だ。ASPICE CL2認定を取るためだけに、ドキュメント作成・トレーサビリティ確保・テストケース設計で担当者が何ヶ月も費やすプロジェクトは珍しくない。

このボトルネックを根本から解消するAIツールが**PopcornSAR PARVIS**だ。要件分析→コーディング→テスト生成というV字モデルの3工程を単一データフローで自動化し、実プロジェクトで**工数3〜4倍削減**を実証している。ASPICE 4.0対応・ISO 26262対応・MISRA C準拠を同一プラットフォームで担えるツールは現時点でほぼ唯一であり、知らないままでいると半年分の競争優位を失う。

## PopcornSAR PARVISとは

**PopcornSAR**は韓国発の自動車ソフトウェアスペシャリスト企業で、AUTOSAR Classic/Adaptive対応ツールチェーン開発で実績を持つ。同社の主力AIプロダクト**PARVIS**（PARtially Automated Verification and Implementation System）は2024年末〜2025年にかけてクローズドβを経て市場投入されたSaaS型プラットフォーム。

従来のAI活用が「CopilotでコードをサジェストするだけのツールA」と「テスト管理ツールB」に分断されていたのに対し、PARVISは要件→コード→テストをひとつのデータグラフとして管理し、変更が生じた際のトレーサビリティ更新を自動で追従させる点が根本的に異なる。ASPICE 4.0のSYS/SWEプロセスに対応した成果物テンプレートを内蔵しており、外部レビューアが直接受け入れられるフォーマットで出力する。

## 実際の動作：ステップバイステップ

PARVISは3つのモジュールで構成される。

### PARVIS-Spec：要件分析の自動化

高レベルのシステム要件テキストをインポートすると、AIがシステム要件→ソフトウェア要件→ハードウェア要件の階層に分解し、トレーサビリティマトリクスを自動生成する。

```text
入力（例）:
"ブレーキバイワイヤシステムは、ブレーキペダル踏力10N〜150Nの範囲において
油圧ライン圧力を0〜160barで±2%以内の精度で制御しなければならない"

自動生成された成果物（一部）:
SYS-REQ-001: 制御範囲 10N〜150N（ブレーキペダル踏力）
SYS-REQ-002: 油圧出力 0〜160bar
SYS-REQ-003: 精度 ±2%（定常状態誤差）
SW-REQ-001 [→SYS-REQ-001]: ペダル踏力センサ入力A/D分解能 ≥10bit
SW-REQ-002 [→SYS-REQ-003]: 制御周期 ≤2ms（応答性保証）
```

各要件にはASPICE SYS.2/SWE.1準拠の成果物属性（ID・タイプ・ASIL・トレース元）が自動付与され、Jira/Polarion/DOORS形式でエクスポートできる。

### PARVIS-Coder：MISRA-C準拠の自動修正

既存のC/C++コードをアップロードすると、PARVIS-CoderがMISRA C 2012ルールセットに照らして違反箇所を検出し、自動修正コードを提案する。

```c
/* 修正前（MISRA違反: Rule 14.4 — 非ブール値の条件式） */
int flag = get_sensor_status();
if (flag) {  /* 違反: flagはbool型でない */
    activate_brake();
}

/* PARVIS-Coder 修正後 */
bool flag = (get_sensor_status() != 0);
if (flag) {
    activate_brake();
}
```

実績では**MISRA-C準拠率を40%から94%に改善**。残り6%は手動判断が必要なfalse positiveに近い項目で、ワンクリックで「コメントによる逸脱記録」も自動生成される。

### PARVIS-Verify：テストケースの自動生成

PARVIS-Specで生成した要件を元に、PARVIS-Verifyがテストシナリオを自動展開する。境界値分析・同値分割・デシジョンテーブルを組み合わせた網羅的なテストケースを生成し、GoogleTest / GTest / Unityフォーマットで出力する。

```c
/* 自動生成テストケース（例）*/
TEST(BrakeControl, NominalRange) {
    /* SYS-REQ-001, SW-REQ-001 カバー */
    EXPECT_NEAR(brake_pressure(10.0f),  0.0f,  3.2f);   /* 最小踏力 */
    EXPECT_NEAR(brake_pressure(80.0f),  80.0f, 1.6f);   /* 中間値 */
    EXPECT_NEAR(brake_pressure(150.0f), 160.0f, 3.2f);  /* 最大踏力 */
}

TEST(BrakeControl, BoundaryValues) {
    /* 境界条件: 9.9N（範囲外）, 10.0N（境界内） */
    EXPECT_EQ(brake_pressure(9.9f), SENSOR_OUT_OF_RANGE);
    EXPECT_GE(brake_pressure(10.0f), 0.0f);
}
```

実プロジェクトでは**247テストケースを自動生成し、合格率100%・テストカバレッジ86.4%**を達成している。

## Before / After 比較

| 指標 | 導入前（手動） | PARVIS导入後 | 改善率 |
|------|--------------|-------------|--------|
| 要件定義・トレーサビリティ作成 | 3〜5日 | 4〜8時間 | **3〜4倍速** |
| MISRA-C準拠率 | 40% | 94% | **+54pt** |
| テストケース作成（200件規模） | 10〜15日 | 1〜2日 | **5〜10倍速** |
| テストカバレッジ（行カバレッジ） | ~60%（手動） | 86.4%（自動） | **+26pt** |
| ASPICE外部審査準備工数 | 2〜4週間 | 3〜5日 | **3〜4倍速** |
| 変更時トレーサビリティ更新 | 手動・数日 | 自動・即時 | **∞倍速** |

## 実践コード例

PARVISのCLI APIを使ってCI/CDパイプラインに組み込む例（GitLab CI）：

```yaml
# .gitlab-ci.yml
stages:
  - analyze
  - generate_tests
  - verify

parvis_spec:
  stage: analyze
  script:
    - pip install parvis-cli
    - parvis spec analyze \
        --input requirements/system_req.docx \
        --output artifacts/sw_requirements.json \
        --standard ASPICE_4.0 \
        --asil B
  artifacts:
    paths:
      - artifacts/sw_requirements.json

parvis_verify:
  stage: generate_tests
  script:
    - parvis verify generate \
        --requirements artifacts/sw_requirements.json \
        --source src/ \
        --framework gtest \
        --output tests/generated/ \
        --coverage-target 85
  artifacts:
    paths:
      - tests/generated/

parvis_coder:
  stage: verify
  script:
    - parvis coder check \
        --source src/ \
        --standard MISRA_C_2012 \
        --auto-fix \
        --report artifacts/misra_report.html
  artifacts:
    paths:
      - artifacts/misra_report.html
```

このパイプラインをmainブランチへのPushトリガーに設定すると、要件変更から自動テスト再生成・MISRA再チェックまでが完全自動化される。

## 注意点・落とし穴

**ライセンスとプラン**: PARVISはSaaS型で、ソースコードを外部サーバーにアップロードする形式。車載ソフトのIP（知的財産）保護が厳格な企業では、**オンプレミス/プライベートクラウド版の利用可否を事前確認**が必須。プラン詳細は公式サイト（autosar.io）で要問合せ。

**MISRA自動修正の限界**: Rule 1.x（複数文脈）や外部ライブラリ由来の違反は自動修正の対象外。自動修正後も**静的解析ツール（Polyspace, PC-lint）との併用**を推奨する。

**テストケースの品質**: 自動生成テストは境界値・同値分割に偏りがちで、システム統合特有のレース条件・割込みタイミング系のシナリオは手動補完が必要。

**ASPICE外部審査との整合**: PARVIS出力はASPICE成果物の「ベースライン」として使え、アセッサーが受け入れた実績があるが、プロセス固有の運用エビデンス（会議録・レビュー記録）は別途収集が必要。

## 応用：より高度な使い方

要件→テストの単純ループを超えた使い方として注目されているのが、**変更影響分析の自動化**だ。要件を1行変更すると、PARVISがその変更に影響を受けるすべてのソフトウェア要件・テストケース・コードモジュールをグラフ上で特定し、「変更影響レポート」を出力する。従来はシニアエンジニアが1〜2日かけて実施していた作業が数分で完了する。

組み合わせると威力を発揮するツール：
- **dSPACE TargetLink**: PARVISで生成したテストをHIL環境へ自動展開
- **MATLAB Agentic Toolkit**: PARVIS-Verifyが生成したテストコードをMATLABから実行し結果フィードバック
- **GitHub Actions / GitLab CI**: 上記のCI/CD統合でプッシュのたびに品質チェック完結

## 今すぐ試せる最初の一歩

公式サイト（autosar.io）の「Request Demo」から無償トライアルを申し込める。まず**PARVIS-Coderのみ**を既存プロジェクトのCファイルに適用し、MISRA違反レポートを生成してみるのが最もリスクの低い第一歩だ。

```bash
pip install parvis-cli
parvis coder check --source ./src --standard MISRA_C_2012 --report misra_report.html
# ブラウザでmisra_report.htmlを開き、違反件数と自動修正提案を確認
```
