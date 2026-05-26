---
title: "わずか30ケースから全流れ場を瞬時予測——Simcenter STAR-CCM+ 2602の幾何深層学習で変わる空力設計探索"
date: 2026-05-26
category: "CAE / Simulation AI"
tags: ["STAR-CCM+", "幾何深層学習", "GDL", "CFDサロゲート", "空力設計", "Siemens Simcenter"]
tool: "Simcenter STAR-CCM+"
official_url: "https://plm.sw.siemens.com/en-US/simcenter/fluids-thermal-simulation/star-ccm/"
importance: "high"
summary: "Siemens Simcenter STAR-CCM+ 2602に搭載された幾何深層学習（GDL）は、30ケース程度のCFDから圧力場・剪断応力場のフルフィールド予測モデルを自動構築する。スカラー値しか出せなかった従来サロゲートと異なり、GDLはメッシュ節点ごとの流れ場を瞬時に出力。設計探索の計算ケース数を96%削減し、空力設計サイクルを2〜3倍に加速する。"
---

## はじめに

空力開発の現場では「いかに多くの形状バリアントを評価できるか」が競争力の源泉だ。しかし現実には、1ケースのフルCFD計算に4〜24時間かかり、週に走れるケース数は数十件が上限。レギュレーション変更への対応や初期コンセプト探索で数百〜数千バリアントが必要になる局面では、この制約が決定的な足かせになる。

従来のMLサロゲートモデルは「抗力係数Cd」「ダウンフォース係数Cl」などのスカラー量しか予測できなかった。これでは「なぜその空力性能になるのか」の流れ場情報が失われ、設計者が物理的判断を下せない。悪いどころか、サロゲートが「なんとなく良い」解を提示しても、その根拠を検証できないというリスクまで生じる。

2026年2月リリースの**Simcenter STAR-CCM+ 2602**は、この問題をゲームチェンジャー的な方法で解決する。**幾何深層学習（Geometric Deep Learning、GDL）**——メッシュ上の圧力場・剪断応力場のフルフィールドを丸ごと予測するサロゲートモデルを、わずか30ケース程度のCFDデータから自動構築する機能だ。学習したモデルは新形状を5秒以内に予測し、圧力コンターをリアルタイムで可視化できる。

## 幾何深層学習（GDL）とは

GDLはグラフニューラルネットワーク（GNN）の一種で、ポリゴンメッシュを「グラフ」として直接扱う。各メッシュノードが「自分の形状パラメータと隣接ノードの状態」を文脈として学習し、新しい形状に対して節点ごとの物理量（圧力、速度、壁面剪断応力）を推定する。

従来手法との本質的な違いはここにある：

| 手法 | 出力形式 | 最低学習ケース数 | 推論時間 | 流れ場の物理根拠 |
|------|----------|-----------------|----------|----------------|
| 多項式/RBF近似 | スカラー | 10〜30 | <1秒 | なし |
| ガウス過程回帰 | スカラー | 20〜50 | <1秒 | なし |
| MLP/DNNサロゲート | スカラー | 50〜200 | <1秒 | なし |
| **GDL（STAR-CCM+ 2602）** | **フルフィールド（メッシュ全節点）** | **20〜40** | **<5秒** | **圧力・剪断応力場で完全可視化** |

「20〜40ケースの少量データ」と「フルフィールド出力」の組み合わせがGDLの真価だ。Siemensの発表によれば、設計探索1000点を評価する場合にフルCFD比で必要な計算コストを96%削減した事例がある。

## 実際の動作：レース用フロントウイング形状探索

ここでは、フロントウイングの翼型迎角（AoA）と翼弦長スケールの2パラメータ空力探索を例に、STAR-CCM+ 2602のGDLワークフロー全体を解説する。

### Step 1: Design ManagerでDOEを設定

STAR-CCM+ Design Managerを開き、以下を設定する：
- **設計変数**：翼型迎角 (-5°〜+15°)、翼弦長スケール (0.85〜1.15)
- **応答量**：Cd、Cl（グローバル）＋**表面圧力場全節点**（GDL学習用）
- **実験計画法**：Optimal Latin Hypercube、40点

### Step 2: DOEバッチ実行（Java マクロ）

```java
// STAR-CCM+ Java マクロ: DOE全ケース自動実行
import star.common.*;
import star.designmanager.*;

public class RunDOESweep extends StarMacro {
    public void execute() {
        Simulation sim = getActiveSimulation();

        DesignStudy study = (DesignStudy)
            sim.get(DesignStudyManager.class)
               .getObject("FrontWing_DOE");

        // 並列設定（4コア × 10ジョブ同時実行）
        study.setMaxParallelJobs(10);
        study.setNumberOfCores(4);

        // 40ケースを一括起動
        study.runAll();

        sim.println("DOE完了: "
            + study.getNumberOfCompletedDesigns() + " / "
            + study.getNumberOfDesigns() + " ケース");
    }
}
```

コマンドラインから実行：

```bash
starccm+ -batch -np 4 -power \
  -macroFilename RunDOESweep.java \
  FrontWing_base.sim
```

### Step 3: GDLサロゲートのトレーニング

DOE完了後、Design ManagerのAI Surrogateタブからモデルを設定し学習を起動する。

```java
// GDL学習設定・実行マクロ
import star.common.*;
import star.designmanager.*;
import star.ml.*;

public class TrainGDLSurrogate extends StarMacro {
    public void execute() {
        Simulation sim = getActiveSimulation();

        DesignStudy study = (DesignStudy)
            sim.get(DesignStudyManager.class)
               .getObject("FrontWing_DOE");

        // GDLサロゲートを作成
        GeometricDeepLearningSurrogate gdl =
            (GeometricDeepLearningSurrogate)
            study.get(SurrogateManager.class)
                 .createSurrogate(
                     SurrogateType.GEOMETRIC_DEEP_LEARNING,
                     "FrontWing_GDL_v1"
                 );

        // 学習対象フィールドを指定
        gdl.addSurfaceField("Pressure");
        gdl.addSurfaceField("WallShearStress");
        gdl.addGlobalResponse("Cd");
        gdl.addGlobalResponse("Cl");

        // 学習/検証データ分割（80/20）
        gdl.setTrainValidationSplit(0.8);

        // 学習実行（GPU環境で約15〜30分）
        gdl.train();

        double r2_p  = gdl.getValidationMetric("Pressure",  "R2");
        double r2_cd = gdl.getValidationMetric("Cd", "R2");
        sim.println("Pressure R² = " + String.format("%.4f", r2_p));
        sim.println("Cd R²       = " + String.format("%.4f", r2_cd));
        // 典型値: Pressure R² ≈ 0.9980, Cd R² ≈ 0.9960
    }
}
```

### Step 4: 新形状の瞬時評価（推論）

```java
// 新設計点をGDLで即時評価
public class EvaluateWithGDL extends StarMacro {
    public void execute() {
        Simulation sim = getActiveSimulation();

        GeometricDeepLearningSurrogate gdl =
            (GeometricDeepLearningSurrogate)
            sim.get(DesignStudyManager.class)
               .getObject("FrontWing_DOE")
               .get(SurrogateManager.class)
               .getObject("FrontWing_GDL_v1");

        // 評価したい設計点（AoA=8.5°, chord_scale=1.05）
        double[] newDesign = {8.5, 1.05};

        // 推論実行（<5秒）
        SurrogateEvalResult result = gdl.evaluate(newDesign);

        sim.println("予測 Cd = " + result.getGlobalResponse("Cd"));
        sim.println("予測 Cl = " + result.getGlobalResponse("Cl"));
        // result.getSurfaceField("Pressure") で全節点の圧力分布も取得可能
    }
}
```

## Before / After 比較

| 項目 | 従来（フルCFD） | GDLサロゲート利用後 | 削減率 |
|------|----------------|---------------------|--------|
| 設計探索1000点の所要時間 | 4,000〜24,000時間 | DOE40ケース（160〜960時間）+推論数分 | **約10〜25倍速** |
| 必要なCFD計算ケース数（1000点探索） | 1,000ケース | **40ケース（DOE）** | **96%削減** |
| フル流れ場（圧力・速度）の取得 | 全ケースCFD必須 | **推論で即時取得** | — |
| HPC計算コスト（1探索サイクル） | 200〜1,000万円規模 | **8〜50万円**（DOE40ケース相当） | **約90%削減** |
| 設計コンセプト→最終候補 | 3〜6週間 | **1〜2週間** | 約60%短縮 |

## 実践コード例：PythonからGDLを制御してPareto最前線を抽出

STAR-CCM+ 2602からはPython Clientライブラリ経由でサロゲートを操作できる。CI/CDパイプラインやJupyterNotebookと直接統合できる。

```python
# STAR-CCM+ Python Client API（STAR-CCM+ 2602以降）
import starccm_client as sc
import numpy as np
import pandas as pd

# HPCサーバー上のSTAR-CCM+に接続
client = sc.StarCCMClient(host="hpc-node01", port=1999)
client.connect()

sim = client.open_simulation("FrontWing_base.sim")
gdl = sim.get_surrogate("FrontWing_GDL_v1")

# 1,000点を一括評価（数分で完了）
rng = np.random.default_rng(42)
design_points = rng.uniform(
    low=[-5.0, 0.85],
    high=[15.0, 1.15],
    size=(1000, 2)
)

records = []
for dp in design_points:
    r = gdl.evaluate(dp.tolist())
    records.append({
        "AoA": dp[0], "chord_scale": dp[1],
        "Cd":  r.global_responses["Cd"],
        "Cl":  r.global_responses["Cl"],
    })

df = pd.DataFrame(records)

# Pareto最前線の抽出（Cd最小化 × Cl絶対値最大化）
df["neg_Cl"] = -df["Cl"].abs()
is_dominated = lambda row: (
    (df["Cd"] <= row["Cd"]) & (df["neg_Cl"] <= row["neg_Cl"])
).sum() > 1
df["dominated"] = df.apply(is_dominated, axis=1)
pareto = df[~df["dominated"]].sort_values("Cd")

print(f"パレート最適点: {len(pareto)} 点 / 1000点中")
print(pareto[["AoA", "chord_scale", "Cd", "Cl"]].head(5).to_string(index=False))

client.disconnect()
```

## 注意点・落とし穴

**メッシュトポロジーの一貫性**：GDLはメッシュのグラフ構造ごと学習するため、DOE全ケースで同一の節点数・接続関係を維持する必要がある。形状変形にはSTAR-CCM+のモーフィングメッシュ（Morphing Mesh）またはRBF補間変形を必ず使うこと。パラメトリックCADとの直接連携では節点番号が変わりやすく、GDL学習失敗の最大原因になる。

**外挿の限界**：DOEの設計変数範囲を大きく超えた外挿では精度が急落する。想定範囲外の形状を評価したい場合は、追加CFDケースで再学習（継続学習）が必要。

**GPU要件**：GDL学習にはNVIDIA GPU（CUDA 12.x対応）が推奨。CPUのみでは学習時間が10〜50倍に延びる（推論はCPUでも<5秒を維持）。

**ライセンス**：GDL機能はSTAR-CCM+ 2602以降かつDesign Managerアドオンライセンスが必要。既存ユーザーはMathWorks/Siemensの営業経由で追加ライセンスを確認すること。

## 応用：より高度な使い方

**レガシーデータの再利用**：STAR-CCM+ 2602のGDLは、過去の異なるプロジェクトのシミュレーション結果からも学習できる。3〜4年前の旧規格CFDデータを新規格形状のGDL事前学習（transfer learning）に使い、DOE追加コストを最小化できる。チームの過去データが眠っているなら、その資産が今すぐ再利用できる。

**多忠実度（Multi-fidelity）GDL**：RANSデータでGDLを学習し、少数のLES/DESmケースで残差補正モデルを追加学習する手法により、LES相当の精度をRANSコストで実現する研究が2026年に複数発表されている。精度と速度の最前線にある手法だ。

**optiSLangとの最適化ループ**：GDLをAnsys optiSLangの感度解析・ベイズ最適化アルゴリズムと接続すると、「GDL予測→最適化候補抽出→重要点のCFD検証」を高速反復できる。この「AI探索+物理検証」のループが、1週間で収束する設計最適化を可能にする。

## 今すぐ試せる最初の一歩

STAR-CCM+ 2602をインストール済みであれば、以下の手順で公式GDLチュートリアルを5分で開始できる：

```
Help → Tutorial Examples → 
  "Geometric Deep Learning Surrogate – Ahmed Body"
```

付属の20ケースDOEデータを使い「Train GDL」を実行するだけで、Cd・Cl予測モデルの学習が完了する。その後、形状パラメータスライダーを操作すると圧力コンターがリアルタイムで変化するデモが確認でき、GDLの「フル流れ場がリアルタイムで動く」体験が5分以内に実感できる。
