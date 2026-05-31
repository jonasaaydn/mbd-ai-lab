---
title: "Siemens Simcenter PhysicsAI：STAR-CCM+幾何深層学習でCFDを1000倍高速化する最新AIサロゲートの実践ガイド"
date: 2026-05-31
category: "CAE / Simulation AI"
tags: ["Simcenter PhysicsAI", "STAR-CCM+", "Surrogate Model", "CFD", "Siemens", "Geometric Deep Learning", "Aerodynamics"]
tool: "Simcenter PhysicsAI"
official_url: "https://news.siemens.com/en-us/siemens-simcenter-physicsai/"
importance: "high"
summary: "Siemensが2026年5月28日に発表した『Simcenter PhysicsAI』は、STAR-CCM+の幾何深層学習（GDL）をスタンドアロンAIサロゲートとして解放し、1000倍のCFD高速化を実現する。フルCFDを20〜50ケース実行するだけでトランスフォーマーベースのサロゲートモデルが自動構築され、以降の設計探索は新形状STLを入力するだけで5秒以内に完了する。既存のAnsys SimAIやPhysicsXとの差別化ポイントも含めて詳述する。"
---

## はじめに

レース車両の空力開発で1日に評価できる設計バリアントは何点だろうか。フルCFDを回すと1ケースあたり4〜8時間かかるため、現実的には3〜5点が限界だ。Wind Tunnel Test（WTT）は週1〜2回のスロットしか取れない。この制約の中で、ライバルチームは数千点のバリアントをAIで事前スクリーニングし、最終候補だけを高精度CFDで検証するワークフローに切り替えている。

このゲームを変えるツールがSiemensから2026年5月28日に登場した。「Simcenter PhysicsAI」は、STAR-CCM+ 2602（2026年2月リリース）の幾何深層学習（GDL）サロゲート技術をSIMULATIONツールのアドオンとして独立させ、STAR-CCM+を所有しているすべてのチームが即座に利用できるようにした製品だ。

## Simcenter PhysicsAIとは

Siemens Digital Industries Softwareが2026年5月28日に正式発表したSimcenter STAR-CCM+のAIアドオン製品。既存のSTAR-CCM+ 2602に組み込まれていた幾何深層学習（GDL）サロゲート機能を、より汎用的な形で提供する。

**核心技術**はジオメトリデータに特化したトランスフォーマーニューラルネットワーク（Transformer NN）だ。形状の局所的特徴（曲率・面積・法線方向）をグラフ構造で表現し、メッシュ節点ごとの圧力・剪断応力場をフルフィールドで予測できる。

従来のサロゲートモデル（Ansys SimAI Pro、NVIDIA DoMINO、Monolith AI等）との主な違いは以下の3点だ：
1. STAR-CCM+のシミュレーション環境と完全統合されており、データ準備〜学習〜推論〜後処理が単一ワークフロー内で完結
2. CFDベースラインが20〜50ケースという**極小データセット**から学習可能（他製品は通常100〜200ケースを要求）
3. 学習〜推論の全工程でSTAR-CCM+のUIを離れる必要がない

## 実際の動作：ステップバイステップ

### Step 1：ベースラインCFDデータの準備

STAR-CCM+でDOE（Design of Experiments）ケースを20〜50点実行する。形状パラメータを変動させた各ケースの圧力場・速度場・剪断応力場の結果がPhysicsAIの学習データになる。

```bash
# STAR-CCM+でDOEバッチ実行（コマンドライン例）
starccm+ -batch run_doe_cases.java \
  -define PARAM_SWEEP="[0.85:0.05:1.15]" \
  -podkey "${STARCCM_POD_KEY}" \
  -np 32
```

### Step 2：AIサロゲートモデルの学習

STAR-CCM+のPhysicsAI学習ウィザードを起動し、DOEケースのシミュレーション結果フォルダを指定する。GPU1枚で2〜6時間（50ケース・標準メッシュの場合）で学習が完了する。

学習中に自動で以下が実行される：
- 形状特徴量のグラフ化（メッシュ節点→グラフノード変換）
- Transformer NNのファインチューニング
- 訓練データ・検証データの分割（80:20）と過学習防止
- 精度メトリクス（R², RMSE）の自動計算と報告

### Step 3：新形状の高速評価

学習済みモデルをロードし、評価したい新形状（STLまたはParasolid）を読み込む。推論は5秒以内に完了する。

```python
# Python Client API経由での推論（概念コード）
from starccm_physicsai import PhysicsAIModel

# 学習済みモデルのロード
model = PhysicsAIModel.load("./aero_surrogate_aero_v1.pxai")

# バッチ推論：1000形状を並列評価
design_variants = [f"./variants/design_{i:04d}.stl" for i in range(1000)]
results = model.batch_predict(design_variants, n_workers=8)

# 結果をDataFrameに変換
import pandas as pd
df = pd.DataFrame([{
    "design_id": i,
    "Cd": r.drag_coefficient,
    "Cl": r.lift_coefficient,
    "Cp_surface_max": r.surface_pressure_max,
    "wall_time_ms": r.wall_time_ms
} for i, r in enumerate(results)])

# Pareto最適解の抽出（Cd最小 × Cl最大化）
pareto = df[(df.Cd < df.Cd.quantile(0.1)) & (df.Cl > df.Cl.quantile(0.9))]
print(f"Pareto candidates: {len(pareto)} designs from {len(df)} variants")
```

### Step 4：精度確認とフルCFD実施

Pareto最適候補（通常5〜10点）についてSTAR-CCM+のフルCFDで精度確認する。PhysicsAI予測との乖離が±3%以内であれば設計確定とする。

## Before / After 比較

| 評価指標 | 従来（フルCFDのみ） | Simcenter PhysicsAI活用後 |
|----------|-------------------|---------------------------|
| 1バリアント評価時間 | 4〜8時間（HPC 32コア） | < 5秒（ラップトップGPU） |
| 1日の評価可能設計数 | 3〜5点 | 数千点 |
| 設計探索コスト（HPC時間） | 1000点×6h = 6000コア時間 | DOE 40点×6h + 推論1000点×5秒 |
| 最終候補の選定精度 | 全数CFDによる最適解 | PhysicsAI事前絞込で同等の最適解 |
| チーム間のデータ共有 | バラバラなファイル管理 | Simcenter X Advancedで統合管理 |

PhysicsAI活用後の設計探索コストは従来の約1/50〜1/100になる。

## 実践コード例

以下はSimcenter PhysicsAIとSimcenter HEEDSを組み合わせ、ベイズ最適化ループを自動化するPythonスクリプトの骨格だ。

```python
from starccm_physicsai import PhysicsAIModel
from simcenter_heeds import HEEDSOptimizer, ObjectiveFunction

# PhysicsAIサロゲートを目的関数として定義
model = PhysicsAIModel.load("./surrogate_v1.pxai")

def aero_objective(params: dict) -> dict:
    """HEEDSから呼ばれる目的関数：Cd最小化 + Cl制約"""
    stl_path = generate_geometry(params)   # CADパラメータ→STL生成
    result = model.predict(stl_path)
    return {
        "Cd": result.drag_coefficient,      # 最小化
        "Cl": result.lift_coefficient,      # ≥ -0.3 の制約
        "valid": result.confidence > 0.85   # 信頼度フィルタ
    }

# HEEDSベイズ最適化の設定
optimizer = HEEDSOptimizer(
    objective=ObjectiveFunction(aero_objective),
    n_initial=20,       # 初期DOEサンプル数
    n_iterations=200,   # ベイズ最適化反復数
    n_workers=4         # 並列評価数
)

best_design = optimizer.run()
print(f"Best Cd: {best_design['Cd']:.4f} at params: {best_design['params']}")
```

## 注意点・落とし穴

- **STAR-CCM+ライセンスが前提**：PhysicsAIはSTAR-CCM+のアドオンとして提供されており、STAR-CCM+本体のライセンスなしには動作しない
- **外挿精度への過信は禁物**：学習済みのジオメトリ空間から大きく外れた形状（例：フロントウイング形状が学習データと全く異なる）では精度が大幅に低下する。信頼度スコア（confidence）が0.85未満の予測は必ず高精度CFDで検証すること
- **学習データの質が決定的**：DOEケースに形状的に偏りがあると（例：ライドハイトのみ変動させた場合）サロゲートの汎化性が落ちる。ラテン超方格法（LHS）でパラメータを均等にサンプリングすること
- **外部CADフォーマット制限**：現時点（2026年5月）ではSTLとParasolidに対応。CATIA V5・NX直接読み込みは2026年後半のアップデートで対応予定

## 応用：より高度な使い方

次のステップとして、Simcenter PhysicsAIをSynopsys Ansys optiSLangと連携させた**多目的最適化（Cd最小化 × ダウンフォース最大化 × 後流安定性）**が有力なユースケースだ。

また、Simcenter X Advancedのクラウドプラットフォーム上では、PhysicsAIサロゲートの共同管理・バージョン管理・チーム間共有が可能になる。F1・WECなどのエンジニアリングチームが設計フェーズ別にサロゲートをライブラリ化し、新シーズン開発開始時に前年のデータから高精度サロゲートを即座に再構築するワークフローの実例も公開されている。

## 今すぐ試せる最初の一歩

STAR-CCM+を所有しているチームは、今すぐPhysicsAIのアドオン評価版を申請できる。

```
1. https://www.siemens.com/en-us/products/simcenter/simcenter-x/ から
   Simcenter X Advanced の評価版をリクエスト（PhysicsAIが含まれる）

2. 付属のチュートリアル「Ahmed Body Aero Surrogate」で
   10ケースのCFDデータからサロゲートを構築し、100バリアントを推論する

3. 5秒/バリアントの速度を自分で体感する
```

既存のSTAR-CCM+ライセンスを持っているなら、評価版の申請は無料でできる。
