---
title: "Ansys optiSLang 2026 R1のSimAI統合——DoE→AI学習→最適化を単一ワークフローで完結する設計新戦略"
date: 2026-05-27
category: "CAE / Simulation AI"
tags: ["Ansys", "optiSLang", "SimAI", "Design Optimization", "Surrogate Model", "CAE", "Motorsport"]
tool: "Ansys optiSLang"
official_url: "https://www.ansys.com/blog/ansys-2026-r1-whats-new-ansys-optislang-software"
importance: "high"
summary: "2026年3月にリリースされたAnsys 2026 R1（Synopsys傘下）のoptiSLangは、SimAIをネイティブ統合し、設計変数生成→GPU並列シミュレーション→AIサロゲート訓練→最適化探索を単一ワークフロー内で完結できるようになった。加えてDLS（減衰最小二乗法）による信号マッチングキャリブレーションと新ソルバー接続で、レース開発・パワートレイン最適化の作業効率が大幅に変わる。"
---

## はじめに

「シミュレーションは回せる。でも設計空間を探索しきれない」——これはMBD・CAEエンジニアが最もよく直面する壁だ。DoE（実験計画法）で50〜100ケースのCFDを流し、全ケースの完了を待って初めてサロゲートモデルを構築し、最適化ソルバーに渡す。このプロセスは複数のツールをまたぎ、手作業でのデータ受け渡しが繰り返される。1回のイタレーションで1〜2週間を要することも珍しくない。

2026年3月11日、Synopsys傘下となって初のメジャーリリース「Ansys 2026 R1」が公開された。その中でoptiSLangに搭載された**SimAIネイティブ統合**は、このボトルネックを根本的に解消する機能だ。DoEケース生成から始まり、AIサロゲート訓練、最適化探索まで——これまで3〜4ツールにまたがっていたワークフローが、単一のoptiSLangスタジオ内で一気通貫に実行できるようになった。

## Ansys optiSLang 2026 R1とは

optiSLangはAnsysの設計最適化・不確かさ定量化（UQ）プラットフォームで、CFD・FEA・1Dシミュレーション等あらゆるソルバーの結果を入力としてメタモデルを構築し、ベイズ最適化・感度分析・ロバスト設計最適化を行う。レース開発では空力形状最適化、サスペンションジオメトリ調整、パワートレインキャリブレーション等に活用されてきた。

2026 R1の最大の変化点は、**AIサロゲートモデル生成をSimAI（Ansys純正のクラウドAI）と直結**し、従来のメタモデリング（RBF・多項式等）に加えて大規模深層学習ベースのサロゲートが選択肢に加わったことだ。これはSynopsysによる買収後、初めて両社の技術が本格融合した成果でもある。

## 実際の動作：ステップバイステップ

### 旧ワークフロー（〜2025年）

```
1. optiSLangでDoEケース生成（Latin Hypercube等）
2. CSVをCFDソルバー（STAR-CCM+等）に手作業入力
3. 全ケース完了後、結果をCSVで手動エクスポート
4. optiSLangにCSVをインポートしてRBFメタモデル構築
5. 最適化ソルバーを起動
→ 最低2〜3週間、ファイル受け渡し5〜8回
```

### 新ワークフロー（Ansys 2026 R1）

```
1. optiSLangでDoEケース生成（自動）
2. SimAIソルバーノードに自動接続 → GPU並列実行
3. 結果をリアルタイムでoptiSLangにフィードバック
4. SimAI深層学習サロゲートを自動訓練（1日以内）
5. optiSLang最適化ループに直結して探索開始
→ 同じ品質の最適化が1週間以内に完了可能
```

**SimAIソルバーノード**の追加により、optiSLangのGUI内からSimAIのクラウド計算を直接起動できる。ファイルの手動移動が不要になり、200点超の設計バリアントを1日で学習したサロゲートをそのまま最適化エンジンにフィードするパイプラインが組める。

### DLS（減衰最小二乗法）キャリブレーション機能

もう一つの主要新機能が**DLS（Damped Least Squares）法**だ。エンジンダイノ測定値・センサートレース・実走行データ等、ノイズを含む実測信号へのモデルフィッティングを大幅に改善する。

```python
# optiSLang Python API でDLSキャリブレーションを設定する例
import py_optiSLang as osl

project = osl.Project("powertrain_calibration.opf")

# パラメータ定義（キャリブレーション対象）
params = {
    "Kp_torque": (0.8, 1.2),    # トルク制御ゲイン
    "Ti_fuel":   (0.05, 0.20),   # 燃料噴射時定数
    "Lambda_ref": (0.95, 1.05),  # 空燃比目標値
}

# DLSキャリブレーション設定
calibration = project.add_calibration(
    method="DLS",
    target_signals=["torque_meas", "lambda_meas", "boost_press_meas"],
    simulation_signals=["torque_sim", "lambda_sim", "boost_press_sim"],
    damping_factor=0.1,  # ノイズ耐性を調整
    max_iterations=50
)

project.run()
print(calibration.get_results())
# → 最適キャリブレーションパラメータと残差信号を出力
```

旧来のOCO（One-Click Optimizer）では単純な最小二乗法しかなく、ダイノデータのノイズや外乱で収束が不安定になるケースが多かった。DLS法の追加でこの問題が改善された。

## Before / After 比較

| 項目 | 旧来の手順（〜2025年） | optiSLang 2026 R1 |
|-----|---------------------|-------------------|
| DoE→AIサロゲート構築 | 3〜5ツール間をCSVで往復 | optiSLang内で完結 |
| サロゲート品質 | RBF・多項式（小規模向き） | SimAI深層学習（大規模対応） |
| 最適化サイクル全体 | 2〜4週間 | 1週間以内（目標） |
| 実測信号キャリブレーション | 最小二乗法（ノイズに脆弱） | DLS法（ノイズ耐性あり） |
| Rocky/FreeFlow/LS-OPT連携 | 手動スクリプト | ネイティブソルバーノード |
| Python自動化 | 限定的API | モジュール化・HPC対応強化 |

## 実践コード例：PythonでoptiSLang + SimAI最適化を起動

```python
import py_optiSLang as osl

# プロジェクト起動
project = osl.Project()

# 設計変数定義（空力形状パラメータ例）
design_vars = {
    "front_wing_angle": (3.0, 15.0),    # 度
    "rear_wing_chord":  (0.180, 0.260),  # m
    "diffuser_height":  (0.050, 0.120),  # m
}
project.add_parametric_system(design_vars)

# SimAIソルバーノードの接続（2026 R1新機能）
simai_node = project.add_solver_node("SimAI")
simai_node.set_model("aerodynamics_suv_v3")  # 訓練済みモデルID
simai_node.set_outputs(["Cd", "Cl", "Cl_front", "Cl_rear"])

# DoE設定（Latin Hypercube、80ケース）
doe = project.add_doe(method="LHS", samples=80)

# AIサロゲート訓練（SimAI自動トリガー）
surrogate = project.add_surrogate(
    type="SimAI_DNN",
    training_data=doe.results,
    auto_train=True
)

# NLPQL多目的最適化
optimizer = project.add_optimizer(
    method="NLPQL",
    objectives={"Cd": "minimize", "Cl": "maximize"},
    constraints={"Cl_front/Cl_rear": (0.45, 0.55)},  # バランス制約
    surrogate=surrogate
)

project.run()
optimizer.export_pareto_front("aero_pareto_2026.csv")
```

## 注意点・落とし穴

**SimAI訓練には十分なDoEサンプルが必要**: SimAI深層学習サロゲートは従来のRBFより多くの訓練点を要求する。CFD 1ケースが高コストな場合は最初にRBFサロゲートで感度分析を行い、重要パラメータを絞ってからSimAI訓練に移行するのが現実的だ。

**DLS減衰係数の調整が必要**: damping_factorの設定が不適切だと過減衰になり最適解に収束しないケースがある。まず0.1でテストし、収束グラフを確認してから本番実行を推奨する。

**Synopsys統合による製品変化**: 2026 R1はSynopsys傘下初のリリースのため、ライセンス体系・サポート体制が一部変更されている。既存Ansysライセンスとの互換性を必ずSalesチームに確認すること。

## 応用：より高度な使い方

optiSLang 2026 R1の最も先進的な活用は、**SimAI + optiSLang + ADAS/車両安全の不確かさ定量化（UQ）の連携**だ。設計パラメータの製造ばらつきやセンサーノイズを確率変数として扱い、モンテカルロ法でロバスト性を評価するワークフローがSimAIサロゲートで高速化できる。F1・WECではエアロパーツの公差内最適化（Robust Design Optimization）に直接応用できる。また、**Rocky（DEM）ソルバー接続の追加**により、ブレーキダスト・冷却空気の粒子シミュレーションとの統合最適化も実現した。

## 今すぐ試せる最初の一歩

```bash
# Ansys 2026 R1 のoptiSLang試用はAnsys公式サイトから
# Python APIは pip install py_optiSLang で利用可能（Ansysライセンス要）
# まずは公式ブログのSimAI統合デモ動画を確認:
# https://www.ansys.com/blog/ansys-2026-r1-whats-new-ansys-optislang-software
```
