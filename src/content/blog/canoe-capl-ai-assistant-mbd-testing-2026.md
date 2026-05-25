---
title: "CANoe 19 SP3のCAPL AIアシスタントが変えるHIL検証準備——自然言語から30分でCAN通信テストスクリプトを生成する方法"
date: 2026-05-25
category: "MBD / Simulink"
tags: ["Vector", "CANoe", "CAPL", "AIアシスタント", "HIL", "車載通信", "自動テスト"]
tool: "CANoe CAPL AI Assistant"
official_url: "https://www.vector.com/int/en/products/products-a-z/software/canoe/capl-ai-assistant/"
importance: "high"
summary: "VectorがCANoe 19 SP3でCAPL AIアシスタントをベータ公開。CAN/LIN/FlexRayテストスクリプトを自然言語から自動生成・最適化・レビューできる業界初のAI機能だ。MBD検証フローで「スクリプト作成」がボトルネックになっているなら、今すぐパイロット申請を検討すべき理由がある。"
---

## はじめに

ECUのHIL/SIL検証でCAPLスクリプトをゼロから書く作業は、MBDエンジニアにとって長年のボトルネックだ。CAN/LIN/FlexRayのデータベースを読み込み、メッセージ構造を把握し、タイミング条件とテスト判定ロジックを組み上げる——実際の検証内容より準備だけで2〜4時間かかるケースは珍しくない。しかもCAPLに精通したエンジニアが限られているため、チームの生産性が一人の専門家に依存してしまうという問題が生じやすい。

VectorはこのボトルネックをAIで解消する第一歩として、CANoe 19 SP3で**CAPL AIアシスタント**をベータ公開した。知らないままでは確実に競合に遅れを取る機能だ。

## CAPL AIアシスタントとは

**CAPL AIアシスタント**は、VectorがCANoe 19 SP3およびvTESTstudio 10 SP3向けに統合したAI機能で、2026年現在パイロット（ベータ）フェーズで無償提供されている。

- **提供元**: Vector Informatik GmbH（Stuttgart、ドイツ）
- **対応バージョン**: CANoe 19 SP3 以降 / vTESTstudio 10 SP3 以降
- **ライセンス条件**: 有効なメンテナンス契約またはサブスクリプションライセンス
- **参加料金**: パイロット期間中は無償
- **操作言語**: 英語（中国本土は対象外）
- **動作環境**: インターネット接続必須

従来のCAPLエディタが持つシンタックスハイライト・補完機能とは根本的に異なり、**スクリプト全体の自動生成・既存コードのリファクタリング・バグ箇所の指摘**まで対応する点が最大の特徴だ。CAPLの知識がないエンジニアでも初日から動くスクリプトを出力できるとVectorは説明している。創業30周年（1996年CANoe初版）の節目に打ち出した、開発生産性の新提案だ。

## 実際の動作：ステップバイステップ

### Step 1: パイロット申請（5分）

公式ページからパイロット申請フォームを送信する。CANoe 19 SP3のライセンスキーと保守契約の確認後、数営業日以内にアクセスが有効化される。

### Step 2: CANoeでAIプロンプトを入力

CANoe 19 SP3のCAPLエディタを開くと、サイドパネルに「AI Assistant」タブが新設されている。テキストボックスに英語で指示を入力する。

```
プロンプト例:
"Generate a CAPL test script that monitors engine RPM signal
 (EngineSpeed, ID 0x100) and fails if it exceeds 8000 RPM
 for more than 200ms within a 10-second measurement window."
```

### Step 3: 生成されたCAPLを確認

AIが数秒で出力するスクリプト例：

```capl
variables {
  msTimer tWindow;
  long    overCount  = 0;
  int     testFailed = 0;
}

on start {
  setTimer(tWindow, 10000);  // 10秒ウィンドウ開始
}

on message EngineSpeed {        // 0x100
  if (this.RPM > 8000) {
    overCount++;
    if (overCount >= 20) {      // 10ms周期×20回 = 200ms超過
      testFailed = 1;
      testStepFail("RPM > 8000 for over 200ms: %.0f rpm", this.RPM);
    }
  } else {
    overCount = 0;              // 正常に戻ったらカウントリセット
  }
}

on timer tWindow {
  if (!testFailed)
    testStepPass("RPM within 8000 rpm limit over 10s window");
}
```

### Step 4: 追加指示で反復改善

「変数名をスネークケースに統一して」「LINシグナルも同様に監視するコードを追加して」などの自然言語指示を送ると、AIが差分更新を提案する。確定後はCANoeのテストモジュールにドラッグ＆ドロップして即実行できる。

## Before / After 比較

| 項目 | CAPL AI導入前 | CAPL AI導入後 |
|------|-------------|-------------|
| スクリプト初稿作成時間 | 2〜4時間（CAPL経験者） | 15〜30分 |
| 新規メンバーの習得期間 | 1〜2週間 | 数日 |
| スクリプトレビュー工数 | 1〜2時間/本 | AI自動指摘で大幅短縮 |
| テスト網羅性チェック | 手動チェックリスト | AI提案で抜け漏れ検出 |

## 実践コード例：バッテリー電圧範囲診断テスト

モータースポーツや電動車両開発でよく使う「電圧範囲検証」のCAPLスクリプト。AIに「バッテリー電圧シグナルが正常範囲12.0〜14.4Vを5秒間維持するか確認せよ」と指示すると以下の雛形が得られる：

```capl
/*
 * バッテリー電圧範囲診断テスト
 * Signal: BattVoltage (ID 0x200, 正常範囲 12.0〜14.4 V)
 */
testcase TC_BattVoltage_NominalRange() {
  float v_min = 12.0;
  float v_max = 14.4;

  // 5秒間の正常範囲内維持を確認
  TestWaitForSignalInRange("BattVoltage", v_min, v_max, 5000);

  if ($BattVoltage >= v_min && $BattVoltage <= v_max) {
    TestStepPass("BattVoltage in range: %.2fV", $BattVoltage);
  } else {
    TestStepFail("BattVoltage out of range: %.2fV", $BattVoltage);
  }
}
```

AIが出力した初稿にシグナル名と閾値を当てはめるだけで完成する。コピー＆ペースト後、CANoeで即実行できる。

## 注意点・落とし穴

- **オフライン環境では使用不可**: AIの推論処理はVector側サーバー経由で実行される。開発環境のセキュリティポリシーでインターネット接続が制限されている場合、利用できない点を事前確認すること
- **CANoe 19 SP3以降が必須**: CANoe 17〜18系ユーザーはバージョンアップが前提となる。年間ライセンスの更新タイミングを事前に確認しておくこと
- **英語プロンプト専用**: 現状は英語入力のみ対応。日本語プロンプトは正確に解釈されない場合がある
- **ベータ期間のサービス可用性は無保証**: 本番プロジェクトのクリティカルパスに組み込む前にスタンドアロン環境でリスク評価を行うこと

## 応用：より高度な使い方

CAPL AIが出力したスクリプトは**vTESTstudio 10 SP3**に取り込むと、テストシーケンスのGUI管理・HTMLレポート自動生成・テスト仕様書との紐付けまで一気通貫で構築できる。

さらに、dSPACE AutomationDeskやGitHub Actions CIとの連携で**プルリクエスト毎のCANoe自動テスト**を組むと、MBDコード変更のリグレッション検出がリアルタイム化する。当ブログで既報の「dSPACE×VSCode×GitHub Copilot SIL自動化」事例と組み合わせることで、開発→検証のループをほぼ無人で回す構成が現実的になってきた。

## 今すぐ試せる最初の一歩

パイロット申請はVectorの公式ページから無償で行える。CANoe 19 SP3の保守契約があれば5分で申請が完了する。

```
# パイロット申請ページ
# 必要条件: CANoe 19 SP3 または vTESTstudio 10 SP3 + 有効な保守契約
https://www.vector.com/int/en/products/products-a-z/software/canoe/capl-ai-assistant/
```
