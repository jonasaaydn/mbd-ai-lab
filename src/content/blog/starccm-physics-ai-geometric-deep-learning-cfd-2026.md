---
title: "CFDメッシュを触らずに空力場を予測——Siemens STAR-CCM+ 2602の幾何深層学習（GDL）が設計最適化を変える"
date: 2026-05-25
category: "CAE / Simulation AI"
tags: ["CFD", "Geometric Deep Learning", "Surrogate Model", "STAR-CCM+", "Siemens", "Aerodynamics"]
tool: "Simcenter STAR-CCM+"
official_url: "https://plm.sw.siemens.com/en-US/simcenter/fluids-thermal-simulation/star-ccm/"
importance: "high"
summary: "2026年2月リリースのSTAR-CCM+ 2602は、既存シミュレーション結果からGDLモデルを訓練してCFD場の瞬時予測を実現する「Simcenter Physics AI」を搭載した。従来のRSM（応答面モデル）と異なり、圧力・速度場をフィールドレベルで予測できる。設計変更1件あたり数時間かかっていた空力CFDが、サロゲート呼び出しに置き換えられることで数秒になる実装方法を解説する。"
---

## はじめに

レース車両の空力設計でCFDを1パラメータセット回すのに2〜8時間かかる——これは今も変わっていない。Design of Experimentsで50点のDoEを走らせれば1週間以上が消える。年間予算が限られるLMP2チームやGT3プログラムでは、風洞時間とCFDクレジットの両方を節約しなければならない状況が続いている。

既存のサロゲートモデル（RSM）は設計変数→スカラー出力（Cd、Cl等）を予測できるが、「どこの形状をなぜ変えるべきか」という知見は与えてくれない。圧力分布・速度ベクトル場が見えなければ、エアロエンジニアはブラックボックスのスコアに振り回されるだけだ。

**Siemens Simcenter STAR-CCM+ 2602（2026年2月リリース）** は、この問題を「Simcenter Physics AI」と呼ばれる幾何深層学習（Geometric Deep Learning, GDL）で正面突破する。既存CFDケースの圧力・速度場から直接GDLモデルを訓練し、新しい形状変更に対してフィールドレベルの予測を提供する。メッシュの再生成すら不要だ。

---

## Simcenter Physics AIとGDLとは

**Simcenter STAR-CCM+** はSiemens Digitalが開発・販売するCFD/熱流体シミュレーションソルバーで、F1・NASCAR・LMDhなどトップカテゴリの空力開発や、自動車・航空宇宙のOEMが採用している業界標準ツールの一つだ。

**幾何深層学習（GDL）**は点群・メッシュ構造のまま機械学習モデルを訓練する手法で、形状情報を特徴ベクトルに変換する際の情報損失を最小化できる。STAR-CCM+ 2602では、Design Managerで蓄積したDoEケースの**シミュレーションメッシュ＋物理量場（圧力、速度、せん断応力等）をそのままGDLモデルの訓練データ**として活用する。

従来のRSMとの違いを明確にしておく。

| 機能 | 従来のRSM（応答面） | Simcenter Physics AI（GDL） |
|------|------------------|---------------------------|
| 出力タイプ | スカラー（Cd、Cl、温度等） | フィールド（圧力場・速度場・温度分布） |
| 空間解像度 | 設計変数→単一数値 | 全メッシュ点→各点の物理量 |
| 訓練データ | DoE結果のCSV/表形式 | シミュレーション場そのもの |
| 形状変更への対応 | パラメータ範囲内のみ | 形状の位相が同じなら外挿も可能 |
| 可視化 | グラフ・等高線図 | STAR-CCM+内の通常CFDと同等 |
| 推論時間 | ミリ秒 | 秒〜十数秒（GPU推論） |

2026 R1では**GPU加速ソルバー（VOF・多相流対応）** も同時強化されており、新規CFD実行コスト自体も下がっている。

---

## 実際の動作：フロントウイング最適化のワークフロー

### ステップ1：DoEケースを蓄積する（従来と同じ）

Design Managerで形状パラメータのDoEを設計する。例として、フロントウイングの以下3パラメータを振る。

- 主翼迎角（AoA）: 2〜12°、5点
- フラップコード比: 0.25〜0.40、4点
- エンドプレート高さ: 50〜120 mm、4点

合計80ケースのフル factorial または Latin Hypercube サンプリングでCFDを実行。STAR-CCM+ 2602では各ケースのメッシュ・場データが自動でDesign Manager DBに格納される。

### ステップ2：GDLモデルを訓練する

Design Manager UIから「Physics AI Model Training」を起動する。訓練に必要な設定は3項目だけだ。

```
訓練データ: 上記80ケースの結果一式（自動検出）
予測ターゲット: 壁面静圧（Wall Pressure）、摩擦力係数（Cf）
検証割合: 20%（ホールドアウト）
```

80ケース相当のGDLモデルの訓練は典型的なワークステーション（NVIDIA RTX 4080以上）で2〜4時間。訓練後は`.simphysicsai`モデルファイルとしてエクスポートされる。

### ステップ3：新形状を即時予測する

GDLモデルが完成した後は、新しい形状バリアントに対してCFDを回さずに圧力場を予測できる。

Java マクロ（STAR-CCM+の標準スクリプト言語）での呼び出し例：

```java
// PhysicsAI推論マクロ（STAR-CCM+ 2602 以降）
Simulation sim = getActiveSimulation();
PhysicsAIManager paiMgr = sim.get(PhysicsAIManager.class);

// 訓練済みGDLモデルをロード
PhysicsAIModel model = paiMgr.loadModel("/path/to/front_wing.simphysicsai");

// 新形状（STLインポート済みのリージョン）を指定
Region region = sim.getRegionManager().getRegion("FrontWing_v2");

// 推論実行（圧力・摩擦力分布を予測）
PhysicsAIPrediction prediction = model.predict(region);
ScalarFieldFunction pressure = prediction.getFieldFunction("WallPressure");

// 通常のCFD結果と同様に可視化・後処理可能
sim.getSceneManager().getScene("AeroPressure").applyFieldFunction(pressure);
```

推論時間は形状複雑度にもよるが、**典型的な車両外装モデルで10〜30秒**。CFDの数時間と比べると3〜4桁の短縮だ。

---

## Before / After 比較：フロントウイング最適化コスト

| フェーズ | Before（CFDのみ） | After（Physics AI活用） |
|---------|-----------------|----------------------|
| 初期DoE（80ケース） | 200〜400 CPU時間 | 同じ（初回のみ必要） |
| GDL訓練 | — | 2〜4時間（1回）|
| 追加バリアント（100件）の評価 | 250〜500 CPU時間 | 約30分（GPU推論）|
| 結果の可視化 | 通常後処理 | 圧力場・速度場を含む完全可視化 |
| 設計変更ターンアラウンド | 数時間〜1日 | 数十秒 |
| エンジニアが「なぜ」を理解できるか | Cd/Cl数値のみ | 圧力分布の視覚確認で可能 |

フィールド予測の特長として、エアロエンジニアが「圧力こぶができている理由」を視覚的に確認しながら次のバリアントを設計できる。スカラー最適化にありがちな「最適値は出たが物理的に意味不明」という状況を避けられる。

---

## 実践コード例：Python＋STAR-CCM+ バッチ自動化

STAR-CCM+はJava Macro以外に、外部Pythonスクリプトから`starccm+`コマンドをシェル呼び出しして自動化できる。以下はDoE→訓練→推論の一連をPythonバッチで回す骨格だ。

```python
import subprocess
import pathlib
import json

STARCCM_BIN = "/opt/Siemens/STAR-CCM+2602/star/bin/starccm+"
SIM_FILE    = "/work/front_wing_base.sim"
MACRO_TRAIN = "/work/macros/train_physicsai.java"
MACRO_PRED  = "/work/macros/predict_variants.java"
VARIANTS    = pathlib.Path("/work/variants/").glob("*.stl")

# 1. Physics AI モデル訓練（DoEケース蓄積後）
subprocess.run([
    STARCCM_BIN, "-batch", MACRO_TRAIN,
    "-simfile", SIM_FILE,
    "-np", "8",  # CPUコア数
    "-gpu",      # GPU推論有効
], check=True)

# 2. 新形状バリアントを一括推論
results = {}
for stl in sorted(VARIANTS):
    proc = subprocess.run([
        STARCCM_BIN, "-batch", MACRO_PRED,
        "-simfile", SIM_FILE,
        "-arg", f"VARIANT_STL={stl}",
    ], capture_output=True, text=True, check=True)
    # 出力からCd/Clを抽出（マクロ内でCSV出力する設定推奨）
    for line in proc.stdout.splitlines():
        if line.startswith("RESULT:"):
            key, cd, cl = line.split(",")[1:4]
            results[str(stl.stem)] = {"Cd": float(cd), "Cl": float(cl)}

# 3. 結果をJSONで保存
with open("/work/results/surrogate_predictions.json", "w") as f:
    json.dump(results, f, indent=2)

print(f"完了: {len(results)} バリアントを評価")
```

---

## 注意点・落とし穴

**訓練データ数の最低ライン**: GDLモデルの精度は訓練ケース数に大きく依存する。経験則として**最低30ケース、推奨50ケース以上**。パラメータ次元が高い場合（5変数以上）はその分だけケース数を増やす必要がある。

**形状の位相制約**: GDLは「同位相の形状変形」に強い一方、接続トポロジーが変わる大幅な設計変更（例：ウイング段数を2→3枚に変更）には対応できない。そのような変更には新たにDoEとモデル訓練が必要だ。

**ライセンス要件**: Physics AI機能はSTAR-CCM+ 2602以降かつ「Simcenter Physics AI」アドオンライセンスが必要。既存のSTAR-CCM+ライセンスだけでは使用不可。Siemens担当者に確認すること。

**GPU推論の環境**: GDLモデルの推論にはNVIDIA CUDAが必要。AMD GPUはサポートされていない（2026年5月時点）。

---

## 応用：より高度な使い方

**optiSLangとの統合**: STAR-CCM+ 2602はoptiSLangと直結コネクタで接続できる。Physics AIサロゲートをoptiSLangの最適化ループ（AMOP法、ARSM法等）に組み込むと、GDL推論→多目的最適化→次の候補点CFD実行→再訓練というアクティブラーニングループを自動化できる。

**TransientモデルへのGDL適用**: 2602では定常CFDが主なターゲットだが、Siemensのロードマップでは非定常（タイムステップ単位）の場予測対応が予定されている。ダウンフォースの動的変動予測やウォータースプラッシュ予測への適用が将来的に可能になる見込みだ。

**Neural Concept・PhysicsXとの役割分担**: 同じGNN/GDL系ツールとして、Neural Concept（F1専用SaaS）やPhysicsX（LPMベース）と比較されることがある。STAR-CCM+ GDLの強みは「既存のSTAR-CCM+ワークフローにシームレスに統合できる」点。専用プラットフォームへの乗り換えコストなしに、手持ちのDoEデータを即サロゲート化できる。

---

## 今すぐ試せる最初の一歩

STAR-CCM+ライセンスを保有するチームは、まず既存のDoEケースがDesign Managerに格納されているか確認する。20ケース以上あれば即座にGDL訓練を試せる。

```bash
# STAR-CCM+ 2602のバッチでPhysics AI訓練を起動（最小構成）
starccm+ -batch -rsh ssh \
  -np 4 \
  train_physicsai_minimal.java \
  -simfile existing_doe_study.sim

# train_physicsai_minimal.java の核心部分：
# PhysicsAIManager paiMgr = sim.get(PhysicsAIManager.class);
# paiMgr.trainModel("WallPressure", 0.8);  // 80%訓練/20%検証
# paiMgr.saveModel("/output/model.simphysicsai");
```

ライセンスのない場合は**Siemens Xcelerator 30日トライアル**から申請できる。すでに手持ちのDoEケース（STL＋CFD結果）があれば、訓練から最初の推論まで半日以内に完走できる。
