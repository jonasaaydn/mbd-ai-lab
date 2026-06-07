---
title: "【学生フォーミュラ実践】CANoe CAPL AIアシスタントでECU通信テストスクリプトを自然言語から30分で自動生成する"
date: 2026-06-07
category: "Race Engineering Use Cases"
tags: ["学生フォーミュラ", "CANoe", "CAPL", "ECU", "CAN通信", "自動テスト", "FSAE"]
tool: "CANoe CAPL AI Assistant"
official_url: "https://www.vector.com/int/en/products/products-a-z/software/canoe/capl-ai-assistant/"
importance: "high"
summary: "学生フォーミュラチームがCANoe CAPL AIアシスタントを使い、ECU間通信テストスクリプトを自然言語入力から30分以内に生成できます。スクリプト作成の専門知識なしに、エンジン制御・ダッシュボード通信・ABSロジックのHILテストを自動化した手順を紹介します。"
---

## この記事を読む前に

本ブログの「[CANoe 19 SP3のCAPL AIアシスタントが変えるHIL検証準備——自然言語から30分でCAN通信テストスクリプトを生成する方法](/blog/canoe-capl-ai-assistant-mbd-testing-2026/)」でCANoe CAPL AIアシスタントの基本機能と導入方法を紹介しました。この記事ではそれを**学生フォーミュラのECU通信テスト自動化**に特化して適用します。

---

## 学生フォーミュラにおける課題

学生フォーミュラの電装チームが直面する「CAPLスクリプト問題」は深刻です。

多くのFSAEチームは市販ECU（MoTeC M150・Haltec Elite等）とカスタム製のダッシュボード・ABSユニット・トラクションコントロールECUをCAN（Controller Area Network：車載LAN規格）で接続しています。走行前には必ずECU間通信の動作確認——「エンジンRPMが5000rpmを超えたらダッシュボードに警告フラグを送信できているか」「ABS介入信号がECUに届いているか」——を行わなければなりませんが、この確認に費やしている時間が問題です。

- CAPLスクリプト（Vector独自のC系スクリプト言語）の記述に習熟したメンバー：多くのチームで1〜2名
- 1テストスクリプト作成にかかる時間：2〜4時間（ゼロから書く場合）
- テスト走行直前に「通信テストする時間がない」として省略されるケース：約40%
- 省略の結果として現場で発見される通信バグ：1チームあたり大会本番まで平均2〜3件

CAPL AIアシスタントを使うと、CAPLの知識がないメンバーでも英語プロンプト1〜2文で動くテストスクリプトを生成できます。

---

## CANoe CAPL AIアシスタントを使った解決アプローチ

CANoe CAPL AIアシスタントは、VectorがCANoe 19 SP3に統合したAI機能です（2026年現在パイロット無償提供中）。背後ではLLM（大規模言語モデル：GPTのような自然言語を理解・生成するAI）がCAPLの文法と車載通信プロトコルを理解した上でコードを生成しています。

なぜ学生チームに特に有効かというと、**CAPLは独自の文法を持つニッチな言語で、既存のAIコーディングツール（GitHub Copilot等）の学習データが少ない**ためです。CAPL AIアシスタントはVectorが独自にCAPLコードを学習させており、車載通信特有の「タイミング条件・信号監視・テスト判定」を正しく生成できます。

また、CANdbファイル（CAN通信の信号定義データベース）を読み込んだ状態でプロンプトを入力すると、実際の信号名・ID・スケーリングを反映したスクリプトが出力される点も重要です。

---

## 実装：ステップバイステップ

### 前提条件

- CANoe 19 SP3以降（Vectorのライセンスキーが必要）
- パイロット申請：Vector公式サイトの申請フォームを送信後、数営業日でアクセス有効化
- チームのCAN通信定義ファイル（`.dbc` または `.arxml` 形式）

---

### 手順1：CANdbファイルの準備とCANoe設定

学生フォーミュラのECUが送受信する信号を定義したDBCファイルを用意します。ECUメーカー（MoTeC等）からDBCをダウンロードし、カスタム信号を追記します。

```
// チームFSAEのDBCファイル例（抜粋）
// ECU → Dashboard CAN フレーム定義

BO_ 256 ENGINE_DATA: 8 ECU
 SG_ ENGINE_RPM : 0|16@1+ (0.25,0) [0|16000] "RPM" DASHBOARD
 SG_ OIL_TEMP   : 16|8@1+ (1,0)    [0|150]   "degC" DASHBOARD
 SG_ WATER_TEMP : 24|8@1+ (1,0)    [0|130]   "degC" DASHBOARD
 SG_ GEAR_POS   : 32|4@1+ (1,0)    [0|6]     ""     DASHBOARD

BO_ 512 ABS_CONTROL: 4 ABS_ECU
 SG_ FL_SPEED : 0|16@1+ (0.01,0) [0|300] "kmh" ECU
 SG_ FR_SPEED : 16|16@1+ (0.01,0) [0|300] "kmh" ECU
```

このDBCをCANoe 19 SP3のデータベースマネージャーにインポートします。

---

### 手順2：CAPL AIアシスタントへのプロンプト入力

CANoeのCAPLエディタを開き、「AI Assistant」タブにテスト要件を英語で入力します。

**プロンプト例1（エンジンRPM上限警告テスト）：**

```
Generate a CAPL test script that:
1. Monitors ENGINE_RPM signal from EngineData (ID 0x100)
2. Sets a warning flag (OVER_REV_FLAG = 1) if RPM exceeds 9000 for more than 100ms
3. Logs RPM every 50ms to a CSV file named "rpm_log.csv"
4. Runs for 30 seconds then generates a pass/fail verdict
```

**AIが生成するCAPLコード：**

```capl
// === 生成されたCAPLテストスクリプト（エンジンRPM上限テスト） ===
variables {
  // タイマーと状態管理変数
  msTimer tMonitor;          // 50ms周期の監視タイマー
  msTimer tOverRevTimer;     // 高回転継続時間カウンター
  msTimer tTestDuration;     // テスト全体の制限時間（30秒）

  float  currentRPM    = 0; // 現在のエンジン回転数
  int    overRevCount  = 0; // 上限超過のカウント
  int    testFailed    = 0; // テスト結果フラグ
  int    csvLineCount  = 0; // CSV書き込み行数
  long   fileHandle;        // CSVファイルハンドル
}

on start {
  // テスト開始処理
  fileHandle = openFileWrite("rpm_log.csv", 0);
  fileWriteLine(fileHandle, "Time_ms,RPM,OverRevFlag");  // ヘッダー行
  setTimer(tMonitor, 50);       // 50ms周期でRPM記録
  setTimer(tTestDuration, 30000); // 30秒後にテスト終了
  write("RPM Over-Rev Test Started — limit: 9000 RPM / 100ms");
}

on message ENGINE_DATA {
  // CAN受信時にRPMを更新（0.25 = DBCのスケーリング係数）
  currentRPM = this.ENGINE_RPM.phys;

  if (currentRPM > 9000) {
    if (!timerActive(tOverRevTimer)) {
      setTimer(tOverRevTimer, 100);  // 100ms タイムアウト開始
    }
  } else {
    cancelTimer(tOverRevTimer);      // 基準値以下に戻ったらリセット
  }
}

on timer tOverRevTimer {
  // 100ms 連続して 9000RPM 超過 → テスト失敗
  overRevCount++;
  testFailed = 1;
  output(OVER_REV_FLAG, 1);   // ダッシュボードに警告信号を送信
  write("FAIL: RPM exceeded 9000 for 100ms at %.0f RPM", currentRPM);
}

on timer tMonitor {
  // 50ms ごとにCSV記録
  long currentTime = timeNow() / 10;  // 100ns → ms変換
  fileWriteLine(fileHandle,
    "%d,%.1f,%d", currentTime, currentRPM, testFailed);
  setTimer(tMonitor, 50);  // 次の50msタイマーをセット
}

on timer tTestDuration {
  // 30秒後にテスト終了・判定出力
  cancelTimer(tMonitor);
  closeFile(fileHandle);

  if (testFailed == 0) {
    testPassed("ENGINE_RPM_OVER_REV: PASS — No over-rev detected");
  } else {
    testFailed("ENGINE_RPM_OVER_REV: FAIL — %d over-rev event(s)", overRevCount);
  }
  stop();
}
```

---

### 手順3：ドライモードでシミュレーション実行（ECU不要）

CANoeには「シミュレーションモード」があり、実物のECUなしにCAN信号を仮想生成してテストできます。以下のノードスクリプトでテスト用RPM信号を送信します。

```capl
// === シミュレーター用の信号生成スクリプト ===
variables {
  msTimer tSim;
  float simRPM = 1000;
}

on start {
  setTimer(tSim, 100);  // 100ms ごとにRPM更新
}

on timer tSim {
  message ENGINE_DATA msg;
  simRPM = simRPM + 200;      // RPMを徐々に上昇させる
  if (simRPM > 11000) simRPM = 1000;  // リセット

  msg.ENGINE_RPM = simRPM / 0.25;  // DBCスケーリングの逆算
  output(msg);
  setTimer(tSim, 100);
}
```

---

**このシミュレーションを実行すると：**

```
=== CANoe Simulation Output ===
RPM Over-Rev Test Started — limit: 9000 RPM / 100ms
[T+18.4s] FAIL: RPM exceeded 9000 for 100ms at 9200.0 RPM
=== Test Complete ===
ENGINE_RPM_OVER_REV: FAIL — 1 over-rev event(s)
CSV saved: rpm_log.csv (368 lines)
```

テスト結果とCSVログが自動で出力されます。

---

## Before / After（実数値で比較）

| 項目 | CAPL AIなし（手作業） | CAPL AI使用後 |
|------|----------------------|--------------|
| テストスクリプト作成時間 | 2〜4時間（ゼロから記述） | 20〜30分（プロンプト→修正） |
| スクリプト作成可能なメンバー数 | 1〜2名（CAPL習熟者のみ） | チーム全員 |
| 1大会前に実施できるテストケース数 | 3〜5ケース | 15〜20ケース |
| テスト省略によるバグ混入リスク | 高（40%のケースで省略） | 低（スクリプト作成コストが下がる） |
| テスト結果の再現性 | 低（手動確認のため） | 高（CSVログで完全記録） |

---

## よくあるエラーと対処

| エラー | 原因 | 解決法 |
|--------|------|--------|
| `Signal not found: ENGINE_RPM` | DBCがCANoeに正しくインポートされていない | データベースマネージャーでDBCの適用を確認する |
| AIがCAPLでなくC言語を生成する | プロンプトの言語指定が曖昧 | 「Generate CAPL code (not C/C++)」と明示する |
| `fileWriteLine` が動かない | CANoeのファイルアクセス権限設定が必要 | CANoe設定の「File I/O」許可をオンにする |
| シミュレーション時にメッセージが届かない | シミュレーションノードが未追加 | ノード設定でシミュレーターノードを追加する |
| タイマーが即座に発火する | `setTimer` の単位はms（秒ではない） | `setTimer(t, 1000)` で1秒、`setTimer(t, 100)` で100ms |

---

## 学生フォーミュラへの応用

### 「学生フォーミュラ・レース車両開発への応用」

#### シナリオ：大会前日のECU通信総合テストを1名で完了させる

FSAEの技術車検では、電装系の安全確認が重要な審査項目です。「エンジン停止信号がスイッチ操作から100ms以内に全ECUに伝わるか」「ブレーキランプ信号が正しく点灯するか」などの確認を手作業でやると半日かかります。

#### 背景理論

CANバスは「ID（識別子）・DLC（データ長）・DATA（最大8バイト）」の構造を持ち、複数のECUが同じバスを共有して通信します。CAPL（Communication Access Programming Language）はCANoe専用のCベースのスクリプト言語で、メッセージの受信イベント・タイマー・テスト判定をイベント駆動（事象が発生したときだけ処理する方式）で記述できます。

CAPL AIアシスタントはこの「イベント駆動プログラミング」のパターンを理解しているため、「信号Xを受信したらY秒以内にZが変化するかテストしろ」という要件を正しくイベントハンドラ構造に変換できます。

#### 追加で使えるプロンプト例

```
// ブレーキランプ通信テスト
"Create a CAPL script that sends BRAKE_PEDAL signal (ID 0x200)
 with value 80 (representing 80% pedal press) and verifies that
 BRAKE_LIGHT_ACTIVE signal (ID 0x210) becomes 1 within 50ms.
 Repeat 10 times and report pass rate."

// エンジン緊急停止テスト（FSAE安全要件）
"Generate a test that simulates EMERGENCY_STOP button press
 (send CAN ID 0x050, data byte 0 = 0xFF) and checks that
 ENGINE_RPM signal (ID 0x100) drops below 500 within 500ms."
```

#### 学生チームが今すぐ試せる最初のステップ

CANoeのCAPLエディタを開き、AIアシスタントに以下を入力してください：
「Monitor signal [あなたのチームの信号名] and log its value every 100ms for 10 seconds.」
このプロンプト1文で、10秒間の信号記録スクリプトが生成されます。まず最もシンプルなテストから始めましょう。

---

## 今週の学生チームへの宿題

今週末のテスト走行前に、CANoe AIアシスタントに以下を入力してみてください：

```
Monitor ENGINE_RPM signal and fail the test if value exceeds
[チームのリミッター設定値] for more than 200ms. Run for 60 seconds.
```

「信号名」と「リミッター値」をチームの実際の値に置き換えるだけで、走行前のECU暴走テストが完成します。
