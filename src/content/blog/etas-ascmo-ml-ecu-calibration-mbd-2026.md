---
title: "ETAS ASCMOのML機能でECUキャリブレーション工数を60%削減——DoE×機械学習でパワートレイン最適化を自動化する実践手順"
date: 2026-05-27
category: "MBD / Simulink"
tags: ["ETAS", "ASCMO", "キャリブレーション", "機械学習", "ECU", "DoE", "パワートレイン"]
tool: "ETAS ASCMO"
importance: "high"
summary: "INCA 5万ユーザーの多くがまだ知らないASCMO——Gaussian Process回帰で少ない計測点から精密なECUキャリブレーションマップを自動生成し、Subaruが実証した60%工数削減を再現する。FMU出力でSimulinkにも直結できる実践的なワークフローを解説。"
---

## はじめに

MBDエンジニアが最も時間を費やす作業のひとつが、ECUキャリブレーションだ。エンジンや電動パワートレインのマップを手作業で埋めるには、テストベンチで何百もの測定点を回す必要がある——従来のグリッドスキャン型DoEでは100点以上の計測が当たり前だった。「今週中にキャリブレーションを終わらせろ」という指示を受けて冷や汗をかいた経験があるなら、**ETAS ASCMOは必ず知っておくべきツール**だ。

INCATool（INCA）と同じETASエコシステムにありながら、ASCMO（Advanced Simulation for Calibration, Modelling and Optimisation）を知らずに使い続けているエンジニアは珍しくない。従来の1/3以下の計測点で高精度モデルを構築できる事実を知れば、次のプロジェクトから作業スタイルが根本から変わるはずだ。

## ETAS ASCMOとは

ETAS ASCMOは、ETASが提供するAI・機械学習基盤のデータ駆動型キャリブレーション・最適化プラットフォームだ。Bosch Groupのグループ企業であるETASが開発しており、2018年ごろから自動車メーカーへの普及が加速した。Subaru、Continental、複数のレーシングチームを含む世界中の開発現場が採用している。

既存ツールとの最大の違いは、**ガウス過程回帰（GPR：Gaussian Process Regression）を核とした機械学習エンジン**を搭載している点だ。測定データの不確実性を定量化しながら補間するため、少ない実測点でも信頼区間付きの予測マップを生成できる。多項式フィッティングや手動チューニングとは次元の異なるアプローチだ。

ASCMO製品ラインは主に3種類ある。

- **ASCMO-STATIC**：点火時期・燃料噴射量など定常系エンジンマップの最適化
- **ASCMO-DYNAMIC**：過渡特性・ドライブサイクルを含む動的モデリング
- **ASCMO-ODCM**：オンラインDoE——測定中にMLでリスクゾーンを自動回避しながら効率的に探索

## 実際の動作：ステップバイステップ

### ステップ1：INCA計測データの取り込み

テストベンチでINCAを使って計測データを取得する。ASCMOが要求する最低計測点数はDoEアルゴリズムが自動計算するが、従来の空間充填型DoEと比べて**通常40〜60%少ない点数で収束**する。

### ステップ2：ASCMOでGPRモデルを学習

ASCMO GUIで計測データをインポートし、「学習開始」を実行すると、GPRが自動的に収束するまで反復する。標準的な8入力・2出力のエンジンマップモデルで**約3〜10分**（CPUコア数依存）。

```python
# ASCMO Python APIでモデルを呼び出す基本サンプル
import ascmo_api

# 学習済みモデルをロード
model = ascmo_api.load_model("engine_torque_model.ascm")

# 新しい動作点を予測（RPM=3000, lambda=1.0, 点火角=10deg）
inputs = {"n_rpm": 3000, "lambda": 1.0, "ign_angle": 10.0}
result = model.predict(inputs)

print(f"予測トルク: {result['torque_Nm']:.1f} Nm")
print(f"95%信頼区間: ±{result['uncertainty']:.2f} Nm")
# → 予測トルク: 187.4 Nm  信頼区間: ±2.1 Nm
```

### ステップ3：多目的最適化の実行

NOx規制値やノッキング限界などの制約条件を満たしながら、トルクと燃費のPareto最適解を自動探索する。

```python
# 多目的最適化の設定（NSGA-IIアルゴリズム使用）
optimization_config = {
    "objectives": [
        {"name": "torque_Nm",              "direction": "maximize"},
        {"name": "fuel_consumption_g_kWh", "direction": "minimize"}
    ],
    "constraints": [
        {"name": "nox_ppm",         "max": 200},
        {"name": "knock_indicator", "max": 0.5}
    ],
    "algorithm": "NSGA-II",
    "n_iterations": 500
}

result = model.optimize(optimization_config)

# INCA形式（A2L）でキャリブレーションマップとして出力
result.export_calibration_map("optimal_ignition_map.a2l")
print(f"Pareto解の数: {len(result.pareto_front)}")
```

最適化後のマップはそのままINCAに読み込み、ECUに書き込める。

## Before / After 比較

| 項目 | 従来のグリッドDoE | ASCMO MLアプローチ |
|------|:---:|:---:|
| 必要計測点数 | 120〜200点 | 40〜70点 |
| テストベンチ占有時間 | 5〜8日 | 1.5〜3日 |
| キャリブレーター作業時間 | 約40時間 | 約15時間 |
| モデル精度（R²） | 0.85〜0.90 | 0.94〜0.98 |
| 多目的最適化 | 手動・経験依存 | 自動Pareto探索 |
| 不確実性の定量化 | 不可 | 95%信頼区間付き |

SubaruはASCMO-DYNAMICを用いたドライブサイクル最適化で、従来手法と比べてキャリブレーション工数を**60%削減**したとETASが事例として公表している。

## 実践コード例：FMU出力→Simulink組み込み

ASCMOで作成したモデルはFMU（Functional Mock-up Unit）形式でエクスポートでき、Simulinkに直接インポート可能だ。

```python
# ASCMOエクスポートFMUをPython(fmpy)で評価するサンプル
# pip install fmpy
from fmpy import simulate_fmu
import numpy as np

fmu_path = "engine_dynamic_model.fmu"

# 時系列入力（ドライブサイクル相当）
time = np.arange(0, 10, 0.01)
rpm_input = 2000 + 800 * np.sin(2 * np.pi * 0.3 * time)

result = simulate_fmu(
    fmu_path,
    start_time=0.0,
    stop_time=10.0,
    input=[("n_rpm", time, rpm_input)]
)

print(f"平均予測トルク: {np.mean(result['torque_Nm']):.1f} Nm")
```

SimulinkのFMIブロックにこのFMUを読み込めば、HILシミュレーションや制御則設計のフィードフォワード項としてそのまま利用できる。

## 注意点・落とし穴

- **ライセンス体系**: ASCMO-STATIC・DYNAMIC・ODCMはそれぞれ別ライセンス。小規模チームには費用面で敷居がある場合もある。ETASに30日評価版を申し込める。
- **データ品質が命**: GPRはノイズに敏感だ。センサキャリブレーションが不十分な測定データでは信頼区間が異常に広くなり、最適化結果も不安定になる。
- **外挿の危険性**: 学習範囲外の動作点では不確実性が急増する。ASCMOが「uncertainty: HIGH」と警告するゾーンに最適化解が入った場合は必ず実測で確認すること。
- **必要バージョン**: Python API（ascmo_api）が提供されるのはASCMO 4.0以降。それ以前はGUI操作のみとなる。

## 応用：より高度な使い方

ASCMOの真価は**複数ツールとの連携**にある。GT-SUITEの1D熱管理シミュレーションとASCMOを組み合わせると、電動パワートレインの熱−電力相互依存性を精緻にモデル化できる。また、ASCMO-ODCMはオンラインで計測しながらリスクゾーンを避けるため、**試作エンジンを壊さずにキャリブレーションを完了**させるレース開発での活用が特に注目されている。さらに、SimulinkのReinforcement Learning Toolboxと組み合わせて、ASCMOモデルを報酬関数として使う強化学習ベースの適応キャリブレーションも研究が進んでいる。

## 今すぐ試せる最初の一歩

ETASの公式サイト（etas.com）でASCMO評価版をリクエストし、Python APIとデモデータセットを入手しよう。

```bash
# ライセンス認証後、ASCMO Python APIをインストール
pip install etas-ascmo-api

# デモエンジンデータでモデル学習を確認（5分で完了）
python -c "import ascmo_api; ascmo_api.run_demo('engine_static_demo')"
```

INCATool（INCA）と並行して使い始めるだけでよい。次のキャリブレーションプロジェクトで試してみれば、「なぜもっと早く使わなかったのか」と思うはずだ。
