---
title: "シミュレーションデータ不要：BeyondMathの「生成物理エンジン」がF1空力設計を1000倍高速化する仕組み"
date: 2026-06-01
category: "CAE / Simulation AI"
tags: ["BeyondMath", "Physics AI", "CFD", "F1", "Digital Wind Tunnel", "Aerodynamics", "Generative Physics"]
tool: "BeyondMath"
official_url: "https://beyondmath.com"
importance: "high"
summary: "BeyondMathは既存CFDデータを学習するサロゲートモデルではなく、Navier-Stokes方程式などの物理法則そのものを学習した世界初の『生成物理エンジン』だ。F1チームの空力設計で従来CFDの最大1000倍速を実現し、6ヶ月に試せる設計バリアントが20件から100万件に跳ね上がる。2026年2月に$18.5M調達・NVIDIAとのパートナーシップも発表。"
---

## はじめに

F1の空力エンジニアが直面する最大の制約は「CFDの遅さ」だ。フルCFD解析1ケースには数時間〜数十時間を要し、FIAのコスト上限規制も重なってシーズン中に試せる設計変更は現実的に数十件程度に限られる。Neural Concept・PhysicsX・Emmi AI Noetherといったサロゲートモデルツールがこの問題を「大量のCFDデータをAIに学習させる」アプローチで解決してきた一方、BeyondMathは根本的に異なる問いを立てた——「既存のCFDシミュレーションデータを1件も持っていない全く新しい形状でも、即座に物理解析できるAIを作れるか？」その答えが「生成物理エンジン（Generative Physics Engine）」だ。2026年2月に$18.5Mの調達を完了し、すでにF1チームが本番活用している。

## BeyondMathとは

BeyondMathは2022年設立の英国ケンブリッジ発スタートアップ。創業者チームはインペリアル・カレッジ・ロンドンと英国国防省（MoD）での物理シミュレーション研究を背景に持つ。

2026年2月、Cambridge Innovation Capital主導、UP.Partners・Insight Partners・InMotion Ventures参加の$18.5Mシードラウンドを完了（累計$20.35M）。NVIDIAおよびAWSとのパートナーシップも同時に発表され、2026年中にヘッドカウントを2倍に拡大してヨーロッパ・米国・日本への展開を加速する方針だ。

**他のCAE AIとの根本的な違い：**

| ツール | 学習データ | 必要な事前投資 | 新形状への対応 |
|--------|-----------|----------------|----------------|
| Neural Concept | 既存CFD数百〜数千ケース | 高（事前CFD実行費用） | データが必要 |
| PhysicsX / Emmi AI Noether | 既存CFD約100ケース | 中（少量CFD実行） | データが必要 |
| Ansys SimAI | 既存CFD 10〜20ケース | 低〜中 | 近傍形状のみ |
| **BeyondMath** | **物理法則そのもの（Navier-Stokes等）** | **不要（ゼロから使用可）** | **任意形状に対応** |

従来のサロゲートモデルは「既存シミュレーション結果をAIが記憶した補間モデル」だ。BeyondMathは「物理方程式の解き方そのものをAIが学習した第一原理モデル」であり、アーキテクチャの設計思想からして別物だ。

## 実際の動作：ステップバイステップ

BeyondMathの「デジタル風洞（Digital Wind Tunnel）」がF1チームの設計フローにどう組み込まれるかを示す。

**前提条件：** BeyondMathのエンタープライズアクセス（beyondmath.comからデモ申請）、3Dジオメトリデータ（STL・STEP形式）

### ステップ1：3Dジオメトリをアップロードして解析する

```python
# === BeyondMath API（概念コード：実際のSDKは契約後に提供） ===
# pip install beyondmath-sdk

import beyondmath as bm
import os

# === ステップ1: クライアントを初期化する ===
# APIキーは環境変数から読み込む（コードに直書き厳禁）
client = bm.Client(api_key=os.environ["BEYONDMATH_API_KEY"])

# === ステップ2: 解析したい3Dジオメトリをアップロードする ===
# STL形式でCADからエクスポートしたファイルを使用
# ※既存のCFDシミュレーションデータは一切不要
geometry = client.upload_geometry(
    file_path="front_wing_variant_042.stl",
    geometry_type="external_aero"  # 外部空力解析モード
)
print(f"ジオメトリID: {geometry.id}")

# === ステップ3: 空力解析条件を設定する ===
analysis = client.create_analysis(
    geometry_id=geometry.id,
    conditions={
        "velocity_ms": 70.0,        # 70 m/s ≒ 252 km/h（中速コーナー想定）
        "angle_of_attack_deg": 2.5, # 迎角
        "air_temp_celsius": 28.0,   # 気温（サーキット環境）
        "pressure_pa": 101325       # 標準大気圧
    },
    outputs=["downforce_N", "drag_N", "pressure_field", "velocity_field"]
)

# === ステップ4: 結果を取得する（数分以内） ===
result = client.run_analysis(analysis.id)
print(f"ダウンフォース: {result.downforce_N:.1f} N")
print(f"ドラッグ: {result.drag_N:.1f} N")
print(f"L/D比: {result.downforce_N / result.drag_N:.3f}")
```

**実行すると以下が表示されます（例）：**
```
ジオメトリID: geo_fw042_abc123
ダウンフォース: 3847.2 N
ドラッグ: 612.4 N
L/D比: 6.282
```

従来の同等フルCFD解析に要する時間：12〜24時間。BeyondMathでの同等解析：**2〜5分**。

### ステップ2：100バリアントの一括パラメータスタディを実行する

```python
# === 複数バリアントの一括解析（バッチAPI） ===
# フロントウイングのフラップ角度を変えながら空力特性を探索する

import numpy as np

# 評価するバリアントを生成する
variants = []
for angle_deg in np.arange(0, 10, 0.5):   # フラップ角 0°〜10°を20点
    for velocity_ms in [60, 70, 80]:        # 3速度条件 × 20点 = 60ケース
        variants.append({
            "geometry_id": geometry.id,
            "conditions": {
                "velocity_ms": float(velocity_ms),
                "flap_angle_deg": float(angle_deg),
                "air_temp_celsius": 28.0
            }
        })

# 60ケースを一括送信する
# 従来（フルCFD）: 60 × 12時間 = 720時間 ≒ 30日
# BeyondMath: 60 × 3分 = 約3時間
batch = client.run_batch(variants)

# 最良のL/D比を持つ設定を探す
best = max(batch.results, key=lambda r: r.downforce_N / r.drag_N)
print(f"最適設定: フラップ角 {best.params['flap_angle_deg']:.1f}°, "
      f"速度 {best.params['velocity_ms']:.0f} m/s, "
      f"L/D = {best.downforce_N / best.drag_N:.3f}")
```

**出力例：**
```
最適設定: フラップ角 4.0°, 速度 70 m/s, L/D = 6.731
```

次の一歩：この設定でフルCFD解析を1ケース実行し、BeyondMathの予測を検証する。

## Before / After 比較

| 指標 | 従来の方法（フルCFD） | BeyondMath使用後 |
|------|---------------------|-----------------|
| 1ケースの解析時間 | 12〜24時間 | 2〜5分 |
| 速度向上比 | 基準 | **最大1000倍** |
| 6ヶ月で試せる設計変更数 | 約20件 | **約100万件** |
| 必要な事前CFDデータ | 不要（初期から使用可） | **不要** |
| エンジニア1人のパラメータスタディ | 5〜10ケース/月 | 1000ケース/日 |
| HPC費用 | 数百〜数千万円/年 | クラウドAPI従量制 |

F1チームでの実績：空力バリアントの評価数を従来比で数百倍に増加させ、2026年新技術規則（アクティブエアロ・電動化比率拡大）への対応設計最適化期間を大幅短縮。

## 注意点・落とし穴

**精度の独立検証が必要：** BeyondMathは一般的な外部空力条件（迎角・マッハ数が一般的な範囲）では高精度だが、複雑な気流剥離・境界層遷移・超音速領域では精度が低下する可能性がある。最終的な設計決定を下す前には必ず数ケースのフルCFDまたは実風洞試験で独立検証を行うこと。

**エンタープライズ契約が必要：** 2026年6月時点では個人向けセルフサービスプランは提供されていない。利用にはbeyondmath.comからのデモ申請と商業契約が必要。無料デモは受け付けている。

**対応物理領域の制限：** 現時点では外部空力（車体・翼型・ボディ形状）が主なユースケース。エンジン内部流れ・燃焼・構造連成（FSI）は対応範囲外または限定的。熱流体については開発中とされる。

**ジオメトリ形式：** STLおよびSTEP形式のみ対応（2026年6月時点）。ANSA・HyperMesh等のメッシングを経由したCFD用メッシュファイルを直接入力することはできない。

## 応用：より高度な使い方

**ベイズ最適化との統合：** BeyondMathの高速レスポンス（数分/ケース）はベイズ最適化エンジン（Ansys optiSLang、HEEDS等）との組み合わせで真価を発揮する。1ケースが数分で返ってくることで最適化イテレーションを数百回回せるようになり、真のグローバル最適解を探索できる。

**optiSLang連携ワークフロー（概念）：**
```python
# optiSLang Python APIからBeyondMath推論を呼び出す疑似コード
def objective_function(params):
    # BeyondMathでL/D比を計算する（数分で返る）
    result = bm_client.run_analysis(
        geometry_id=parametric_geometry(params),
        conditions={"velocity_ms": 70.0}
    )
    return -result.downforce_N / result.drag_N  # 最大化（符号反転）

# optiSLangのベイズ最適化器がこの関数を繰り返し呼び出す
# 従来: 1ケース12時間 → 実質的に不可能
# BeyondMath: 1ケース3分 → 500ケース = 約25時間で最適解探索完了
```

**リアルタイムセットアップ支援：** 各サーキットの実測気象データ（温度・湿度・気圧）をリアルタイム入力し、空力設定の即時評価を行う「レースウィーク中の設計変更スクリーニング」への応用も現実的な視野に入ってきている。

## 今すぐ試せる最初の一歩

```bash
# 1. デモリクエストを送る（無料、数日以内に連絡あり）
#    beyondmath.com の「Request Demo」フォームを使用
#    既存CADデータ（STL）を1つ準備しておくとデモがスムーズ

# 2. STLファイルをエクスポートする（CATIA/SolidWorksから）
# File → Export → STL → Resolution: Fine（高精度）
# ファイルサイズ目安: 5〜50MB

# 3. デモセッションで空力解析スピードを体感する
#    → contact@beyondmath.com でも受け付けている
```

まず自分たちが持っている最も典型的な形状（フロントウイング・サイドポッド等）をSTL出力し、デモで実際にBeyondMathに投げてみることが最速の理解への道だ。
