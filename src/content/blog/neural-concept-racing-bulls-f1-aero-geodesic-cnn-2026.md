---
title: "0.1秒で空力予測——Racing Bulls×Neural ConceptのAIが2026年F1規則変更前に数千バリアントを探索する方法"
date: 2026-05-23
category: "Race Engineering Use Cases"
tags: ["Neural Concept", "F1 2026", "空力設計", "Geodesic CNN", "CFDサロゲート", "VCARB", "Racing Bulls"]
tool: "Neural Concept Shape (NCS)"
official_url: "https://www.neuralconcept.com"
importance: "high"
summary: "Racing Bulls（VCARB）F1チームがNeural ConceptのジオデシックCNNを採用し、CFD1回数時間の計算を0.1秒に短縮。2026年の大幅技術規則変更に向けて1週間で5,000件超のデザインバリアントを探索できるようになった。F1チームの約4割がすでにこの技術を活用しており、空力設計の競争構造が変わっている。"
---

## はじめに

F1チームの空力エンジニアは2026年規則変更に向け、深刻なジレンマに直面していた。アンダーボディ・フロントウィング・サイドポッドにわたる大幅な規制改定でパッケージを一新しなければならないのに、従来のCFDシミュレーションは1バリアントあたり4〜8時間。1週間の計算枠で試せるデザインは数十件が限界——競合チームが「より多くのバリアントを試した」というだけで数ポイントの競争力差が生じる世界では、これは致命的なボトルネックだ。

2025年6月、Racing Bulls（Visa Cash App Racing Bulls / VCARB）はNeural Conceptとのパートナーシップを発表した。**CFD計算数時間を0.1秒に短縮する**AIプラットフォームだ。すでにF1全10チームのうち約4チームがこの技術を採用しており、2026年規制対応の開発スピードに直接影響を与えている。

## Neural Concept Shape（NCS）とは

Neural Concept社はスイスのAI工学スタートアップ（2018年設立）。創業チームは連続体力学と機械学習の研究者で構成されており、CFD・構造解析の代理モデル（サロゲートモデル）を専門とする。

**Neural Concept Shape（NCS）**は、3D形状の空力性能をリアルタイムで予測するAIプラットフォームだ。独自の**ジオデシック畳み込みニューラルネットワーク（Geodesic CNN）**を採用しており、3Dメッシュの幾何学的構造を直接処理できる点が他のサロゲートモデルとの決定的な違いだ。

既存ツールとの違い：
- **商用CFD（Fluent, StarCCM+, OpenFOAM）**：物理方程式を数値的に解く。精度は高いが1ケースに数時間〜数十時間
- **従来のANNサロゲート**：入力特徴量を手動抽出する必要があり、形状変化への汎化が難しい
- **Neural Concept NCS**：3Dメッシュを直接入力し、幾何学情報を保持したまま特徴抽出。新デザインを**0.1秒以内**で予測

## 実際の動作：ステップバイステップ

NCSをF1空力設計フローに組み込む手順：

**ステップ1：学習データの準備**

過去のCFDシミュレーション結果（数百〜数千ケース）をSTLファイルと圧力場・速度場データとして整理してエクスポートする。

**ステップ2：Geodesic CNNのトレーニング**

NCSプラットフォームにデータをアップロードし、トレーニングを実行。完了後、各形状バリアントの空力係数（$C_L$, $C_D$）を0.1秒以内に予測するサロゲートモデルが生成される。

**ステップ3：デザインスペースの高速探索**

```python
# Neural Concept NCS API（概念コード）
import neuralconcept as nc
import numpy as np

# 学習済みモデルをロード（フロントウィング）
model = nc.AeroModel.load('front_wing_ncs_model')

# 単一バリアントの予測（< 0.1秒）
design    = nc.Geometry.from_stl('front_wing_v042.stl')
prediction = model.predict(design)
print(f"Cd: {prediction.Cd:.4f}  Cl: {prediction.Cl:.4f}  "
      f"Confidence: {prediction.confidence:.1%}")

# 5,000バリアントをパラメトリックスイープで一括評価
variants = nc.BatchGeometry.from_parametric_sweep(
    base_stl='front_wing_base.stl',
    params={
        'flap_angle':      np.linspace(5, 25, 50),   # フラップ角度 [deg]
        'chord_length':    np.linspace(220, 300, 20), # コード長 [mm]
        'endplate_height': np.linspace(60, 120, 5),  # エンドプレート高さ [mm]
    }
)
results = model.predict_batch(variants)  # 5,000件を約8分で完了

# パレートフロント（Cl/Cd最良）の上位20件を選出
top20 = results.pareto_front(objectives=['maximize_Cl', 'minimize_Cd'])[:20]
print(f"Top design - Cl/Cd: {top20[0].Cl_Cd_ratio:.3f}")
```

**ステップ4：上位バリアントの詳細CFD検証**

AIが選定した上位10〜20件のみフルCFDを実行し、最終設計を決定する。

## Before / After 比較

| 項目 | 従来CFDのみ | Neural Concept NCS導入後 |
|------|-----------|------------------------|
| 予測時間（1バリアント） | 4〜8時間（HPCクラスタ使用） | 0.1秒 |
| 1週間で探索できるバリアント数 | 20〜50件 | 5,000件以上 |
| デザインスペースカバー率 | 〜1% | 30〜50%（推定） |
| 詳細CFD実行回数 | 全バリアント | 上位10〜20件のみ |
| HPCコスト比 | 100%（基準） | 約5〜10%（最終検証のみ） |
| 設計サイクル頻度 | 月1〜2回 | 週次で複数サイクル可能 |

2026年の規則変更では、アンダーボディ形状の大幅な変更が義務付けられており、1シーズンかけて最適解を探索する余裕はない。この差が直接的な競技力の差に繋がる。

## 実践コード例

### デザインパラメータの感度解析

どのパラメータが空力性能に最も影響するかをNCSで高速に特定できる：

```python
import neuralconcept as nc
import numpy as np

model = nc.AeroModel.load('front_wing_v3')
sensitivity = nc.SensitivityAnalysis(model)

params = {
    'main_element_incidence': np.linspace(-3, 5, 50),   # メイン迎角 [deg]
    'flap1_chord':            np.linspace(180, 240, 30), # フラップ1コード [mm]
    'endplate_height':        np.linspace(60, 120, 30),  # エンドプレート高 [mm]
    'gurney_flap_height':     np.linspace(0, 8, 20),    # ガーニーフラップ [mm]
}

result = sensitivity.compute(params, target='Cl_Cd_ratio')

# 重要度ランキングを出力
for param, importance in sorted(
    result.feature_importance.items(), key=lambda x: -x[1]
):
    bar = '█' * int(importance * 30)
    print(f"{param:35s}: {bar} {importance:.3f}")

# 出力例：
# main_element_incidence             : ██████████████████ 0.542
# endplate_height                    : ████████ 0.287
# flap1_chord                        : █████ 0.171
```

このスクリプトで数分以内に設計パラメータの優先順位が判明し、以降の詳細CFDをどこに集中すべきかが明確になる。

## 注意点・落とし穴

**学習データ範囲外の形状に注意**：Geodesic CNNはトレーニングデータの形状範囲外のデザインに対して予測精度が大幅に低下する。全く異なるコンセプトのフロントウィング（例：X字型→U字型への変更）を評価したい場合は、対応する追加トレーニングデータが必要。既存の学習済みモデルを過信しないこと。

**FIA CFD規制との関係**：FIA技術規則は風洞走行時間とCFD計算トークンに上限を設けているが、NCSのような機械学習サロゲートはこの規制対象外と現在は解釈されている。ただし2027年以降の規則改定でこのグレーゾーンが明確化される可能性があり、動向を注視が必要。

**STLメッシュ品質の要件**：低品質なSTLメッシュ（自己交差ポリゴン、穴あきサーフェス）ではジオデシック畳み込みが不安定になる。最低でも20,000ポリゴン以上の均一なウォータータイトメッシュを準備すること。

## 応用：より高度な使い方

**FSI（流体構造連成）の高速評価**：Neural ConceptはCFDのほか構造解析（FEA）サロゲートにも対応している。空力荷重によるカーボンウィングの変形→空力性能変化というFSIサイクルをAIが数秒で評価でき、コンプライアントウィングの最適化に威力を発揮する。

**強化学習との組み合わせ**：NCSサロゲートをシミュレーション環境として、強化学習エージェントに最適形状を自律探索させるアプローチが研究されている。数万ステップの形状最適化もNCSなら数時間で完了する。

**マルチパーツ最適化**：フロントウィングだけでなく、フロア・リアウィング・ボディワーク全体を同時に考慮したマルチパートモデルにNCSを適用し、総合的な空力バランスの最適化（ダウンフォース配分、ドラッグ削減）を実現できる。

## 今すぐ試せる最初の一歩

Neural ConceptはCFDデータを50ケース以上保有するチームや企業向けに評価用のトライアルを提供している。以下を準備して問い合わせるだけで、2週間でサロゲートモデルの評価が開始できる：

```
必要なデータ：
- STLファイル × 50件以上（形状バリアント）
- 対応するCFD結果（Cd, Cl 値、または圧力場データ）

問い合わせ先：neuralconcept.com
```
