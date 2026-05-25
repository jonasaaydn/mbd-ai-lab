---
title: "最少セッションでレース車両セットアップを決める：Bayesian OptimizationとPythonの実践ガイド"
date: 2026-05-25
category: "Race Engineering Use Cases"
tags: ["Bayesian Optimization", "scikit-optimize", "Python", "セットアップ最適化", "レースエンジニアリング", "ガウス過程回帰"]
tool: "scikit-optimize"
official_url: "https://scikit-optimize.github.io/stable/"
importance: "high"
summary: "ウィングアングル・サスペンション・ブレーキバランスの最適化に従来15セッション必要だったが、ベイズ最適化を使えば5〜6セッションで同等の結果が得られる。ガウス過程回帰を使った実用的なPythonコードと、レース車両への適用例を解説する。"
---

## はじめに

テスト日は1日しかない。フロントウィング角度、リアウィング角度、フロントスプリングレート、リアスプリングレート、ブレーキバランスの5パラメータを試したいが、全組み合わせを試せるはずもない。従来のエンジニアは経験とカンで「まずここ」と試行箇所を決めてきたが、この判断をデータドリブンで自動化するのが**ベイズ最適化（Bayesian Optimization）**だ。

ベイズ最適化はGoogle DeepMindがAlphaGoの超参数探索にも採用した手法で、「次に試すべき点を賢く選ぶ」ことが得意。ランダム探索より圧倒的に少ない試行回数で最適値に到達できる。F3やGT3規格のレースカーセットアップに適用した場合、従来15セッション必要な5次元探索を5〜6セッションで完了できる。このガイドでは、コピペして使えるPythonコードを中心に実践的な使い方を解説する。

## ベイズ最適化（scikit-optimize）とは

**scikit-optimize**（skopt）はscikit-learnのエコシステムで動くベイズ最適化ライブラリ。ガウス過程回帰（GPR: Gaussian Process Regression）を使って「これまでの試行結果から学習し、次に最もタイム改善が期待できる点」を算出する獲得関数（EI: Expected Improvement）を実装している。

既存の最適化手法との比較：

| 手法 | 5パラメータ×10点 = 10万点の探索 | 特徴 |
|------|---------|---------|
| グリッドサーチ | 100,000 回 | 網羅的だが現実的に不可能 |
| ランダムサーチ | 30〜50 回でも見逃しリスク大 | 運次第、再現性なし |
| **ベイズ最適化** | **10〜15 回で実用的な最適解** | 学習しながら賢く探索 |

## 実際の動作：ステップバイステップ

### Step 1: インストール

```bash
pip install scikit-optimize matplotlib pandas numpy
```

### Step 2: セットアップ問題の定式化

```python
from skopt.space import Real
from skopt import gp_minimize
import numpy as np

# セットアップパラメータの探索範囲（F3カー想定）
search_space = [
    Real(0.0,  15.0, name='front_wing_angle_deg'),  # フロントウィング 0〜15°
    Real(3.0,  20.0, name='rear_wing_angle_deg'),   # リアウィング 3〜20°
    Real(30.0, 80.0, name='front_spring_nm'),       # フロントスプリング 30〜80 N/mm
    Real(40.0,100.0, name='rear_spring_nm'),        # リアスプリング 40〜100 N/mm
    Real(52.0, 62.0, name='brake_balance_pct'),     # ブレーキバランス 52〜62%
]
```

### Step 3: 目的関数の実装

目的関数はラップタイムを返す関数。実際にはラップタイムシミュレーター（MATLAB Vehicle Dynamics Toolbox、OptimumLap、独自のPythonラップシムなど）や実走行結果を入力する。

```python
import subprocess
import json

def lap_time_objective(params):
    """
    セットアップパラメータを受け取り、ラップタイム（秒）を返す。
    gp_minimize は最小化問題を解くため、タイムをそのまま返す（小さいほど速い）。
    """
    front_wing, rear_wing, f_spring, r_spring, brake_bal = params

    # ラップシミュレーターへのインターフェース（例）
    config = {
        "front_wing_angle": front_wing,
        "rear_wing_angle":  rear_wing,
        "front_spring_rate": f_spring,
        "rear_spring_rate":  r_spring,
        "brake_balance":     brake_bal,
        "track":             "suzuka",
        "tire_compound":     "soft"
    }

    # 実際のシミュレーター呼び出し（ツールに合わせて変更）
    result = subprocess.run(
        ["python3", "lap_sim.py", "--config", json.dumps(config)],
        capture_output=True, text=True
    )
    lap_time = float(result.stdout.strip())
    return lap_time
```

### Step 4: ベイズ最適化の実行

```python
result = gp_minimize(
    func=lap_time_objective,
    dimensions=search_space,
    n_calls=15,          # 総試行回数（実走行なら15セッション）
    n_initial_points=5,  # 最初はランダムに5点探索（GPRモデルの土台を作る）
    acq_func='EI',       # 獲得関数: Expected Improvement
    random_state=42,
    verbose=True
)

# 結果表示
best_params = dict(zip([d.name for d in search_space], result.x))
print(f"最適ラップタイム: {result.fun:.3f} 秒")
print(f"最適セットアップ:")
for k, v in best_params.items():
    print(f"  {k}: {v:.2f}")
```

実行例（架空のラップシム使用）：
```
Iteration No: 1 started. Evaluating function at random point.
Iteration No: 2 started. Evaluating function at random point.
...
Iteration No: 6 started. Evaluating function at EI-optimal point.
...
最適ラップタイム: 92.847 秒
最適セットアップ:
  front_wing_angle_deg: 8.23
  rear_wing_angle_deg:  14.71
  front_spring_nm:      52.40
  rear_spring_nm:       67.15
  brake_balance_pct:    57.30
```

## Before / After 比較

| 項目 | 従来のアプローチ | ベイズ最適化 |
|------|---------|---------|
| セットアップ探索セッション数 | 15〜20 セッション | 5〜7 セッション |
| エンジニアの経験依存度 | 非常に高い（勘が全て） | 低い（データが次の一手を誘導） |
| 局所解リスク | 高い（経験則の盲点がある） | 低い（EI が探索と活用をバランス） |
| 結果の説明可能性 | 暗黙知 | GPR モデルで感度マップを可視化可能 |
| 新コースへの適用 | ゼロからやり直し | 類似コースデータで初期モデルに転移可能 |

実際の試算例：5パラメータ探索を従来手法（経験ベースのグリッド）では2テスト日（約18セッション）かかっていたものが、ベイズ最適化では1テスト日（6セッション）で0.3秒/lapの改善セットアップを発見。

## 実践コード例：結果の可視化と感度分析

```python
from skopt.plots import plot_convergence, plot_objective
import matplotlib.pyplot as plt
import pandas as pd

# 1. 収束曲線：何セッション目でどこまで改善したか
fig, ax = plt.subplots(figsize=(8, 4))
plot_convergence(result, ax=ax)
ax.set_title("Lap Time Improvement over Optimization Sessions")
ax.set_xlabel("Number of Calls (Sessions)")
ax.set_ylabel("Best Lap Time [s]")
plt.tight_layout()
plt.savefig("convergence.png", dpi=150)

# 2. 感度マップ：どのパラメータがラップタイムに最も効くか
fig, axes = plot_objective(result, n_points=20, size=3)
plt.suptitle("Setup Parameter Sensitivity Map", y=1.02)
plt.tight_layout()
plt.savefig("sensitivity_map.png", dpi=150)

# 3. 全試行履歴をCSVで保存
history = pd.DataFrame(
    result.x_iters,
    columns=[d.name for d in search_space]
)
history['lap_time_s'] = result.func_vals
history.to_csv("optimization_history.csv", index=False)

# 上位5件のセットアップを表示
print(history.sort_values('lap_time_s').head(5).to_string(index=False))
```

感度マップを見ると、どのパラメータがタイムに効いているかが一目でわかる。例えばリアウィング角度の感度が高く前スプリングの感度が低い場合、次のテストではリアウィングを優先的に探索する判断ができる。

## 注意点・落とし穴

**目的関数のノイズ処理**: 実走行データはドライバー差・路面温度・タイヤの進化などでノイズが乗る。`gp_minimize` の `noise` パラメータを設定しないとGPRが過学習し、誤った「最適点」を提案する。ラップタイムの標準偏差（通常 0.1〜0.3 秒）を参考に `noise="gaussian"` または `noise=0.09` （0.3秒の分散）のように設定する。

```python
result = gp_minimize(
    func=lap_time_objective,
    dimensions=search_space,
    n_calls=15,
    n_initial_points=5,
    acq_func='EI',
    noise=0.09,  # ラップタイムノイズの分散（秒²）
    random_state=42,
)
```

**パラメータの相関**: フロントとリアウィング角度はダウンフォースバランスとして強い相関がある。独立変数として扱うとGPRが「物理的に無効な組み合わせ」を提案することがある。目的関数内でバランス制約違反時にペナルティを加えることで対処する。

**初期点の選び方**: 最初の5点はランダム探索なので、初期値が悪いとGPRモデルの精度が低い。経験的に「良い領域」がわかっている場合は `x0` パラメータで初期セットアップを与えると収束が早まる。

## 応用：より高度な使い方

**多目的最適化**: ラップタイムとタイヤ摩耗を同時に最適化（パレート最適化）するには `skopt` の代わりに **Optuna** の NSGA-II アルゴリズムが有効。「タイムは落とさずにタイヤ摩耗を15%削減できるセットアップ」を自動探索できる。

**転移学習**: 過去複数コースでの最適化履歴をGPRの事前分布として利用する「メタ学習アプローチ」を使えば、新コースでの初期探索が大幅に効率化される。同じ車両規格（F3など）なら過去データが強力なスターティングポイントになる。

**MATLAB連携**: Simulinkの車両ダイナミクスモデルをMATLAB Engine API経由でPythonから呼び出し、`lap_time_objective` の内部でSimulinkシミュレーションを実行する構成にすると、高精度モデルとベイズ最適化を統合したパイプラインが完成する（前記事「Python MATLAB Engine API + LangChain」と組み合わせ）。

## 今すぐ試せる最初の一歩

```bash
# scikit-optimizeのインストール
pip install scikit-optimize matplotlib pandas

# 動作確認（シンプルな1次元ベイズ最適化）
python3 -c "
from skopt import gp_minimize
result = gp_minimize(
    lambda x: (x[0] - 2.5)**2,  # 最小値が x=2.5 にある放物線
    [(-5.0, 10.0)],
    n_calls=10,
    random_state=42
)
print(f'最適値: x={result.x[0]:.3f}, f(x)={result.fun:.4f}')
# 出力例: 最適値: x=2.498, f(x)=0.0000
"
```

この1次元の動作確認から始め、次のステップは自分のラップシミュレーター（または実走行データを返す関数）を `lap_time_objective` に差し込むことだ。シミュレーターが用意できていない場合は、まず OptimumLap や OpenLAP（オープンソースのラップシミュレーター）との接続から試してみよう。
