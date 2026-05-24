---
title: "F1チームが実証したAWS×MLでCFDスループット3倍を達成する設計最適化の手法"
date: 2026-05-24
category: "Race Engineering Use Cases"
tags: ["AWS", "Formula 1", "CFD", "Design of Experiments", "サロゲートモデル"]
tool: "Amazon SageMaker"
official_url: "https://aws.amazon.com/blogs/machine-learning/optimize-f1-aerodynamic-geometries-via-design-of-experiments-and-machine-learning/"
importance: "high"
summary: "Formula 1チームがAWS Professional ServicesとのML駆動DoE連携で、CFDシミュレーションのスループット3倍・ターンアラウンド50%短縮を達成した手法を徹底解説。FerrariはAmazon SageMakerで最大60%のCFD高速化を実現。同じガウス過程回帰×Active Learningの手法をMBDのパラメータスタディに応用できるPythonコード付き。"
---

## はじめに

「CFDを回したいが、1回の計算に数千コア時間かかるため設計候補を10種類しか検証できない」——レース車両開発でこの制約に直面したことはないだろうか。2026年のF1レギュレーション大改定を前に、各チームは空力開発のリソース制限（ATR）と戦いながら設計品質を上げる必要がある。答えを出したのがF1とAWSの共同ワークフローだ。ML駆動のDesign of Experiments（DoE）を実装することで、同じコンピューティング予算でCFDスループットを**3倍**、ターンアラウンドタイムを**50%短縮**した。この手法はレース開発だけでなく、MBDのシステム同定や制御パラメータチューニングにも直接応用できる。

## AWS × Formula 1 MLワークフローとは

Formula 1は2022年頃からAWS Professional Servicesと協力し、空力開発用のMLパイプラインを構築してきた。中核となるのは以下3要素だ。

1. **MLベースのDoE**: 従来のフルファクトリアル設計に代わり、LHS（ラテン超方格法）で少数のCFD計算結果をサンプリングし、ガウス過程回帰（GPR）サロゲートモデルを構築する。
2. **Amazon SageMakerによるオーケストレーション**: データ前処理・モデルトレーニング・予測APIの提供をSageMakerが一元管理。FerrariはこれによりCFD計算を最大60%高速化した。
3. **Active Learningループ**: サロゲートモデルの予測不確実性が高い設計点を優先してCFDに投入し、最小計算数で最大の知識を獲得するフィードバックループを形成する。

2026年のF1規制改定では空力コンセプトをゼロから再設計する必要があり、RedBull、Mercedes、Ferrari、McLarenはいずれもクラウドベースのCFDパイプラインを中心的な競争力と位置づけている。

## 実際の動作：ステップバイステップ

### ① パラメータ空間の定義とLHSサンプリング

リアウィングを例に取ると、コード長・スパン・キャンバーなど5個のパラメータを定義し、ラテン超方格法で初期サンプルを生成する。

```python
import numpy as np
from scipy.stats.qmc import LatinHypercube

# パラメータ定義: [chord, span, camber, AoA, flap_angle]
param_bounds = {
    'chord':      (0.8,  1.2),   # m
    'span':       (0.9,  1.5),   # m
    'camber':     (0.03, 0.08),  # fraction
    'aoa':        (5.0,  15.0),  # degrees
    'flap_angle': (10.0, 30.0),  # degrees
}

# ラテン超方格法で初期50サンプルを生成
sampler = LatinHypercube(d=len(param_bounds), seed=42)
samples_unit = sampler.random(n=50)

bounds = np.array(list(param_bounds.values()))
X_init = bounds[:, 0] + samples_unit * (bounds[:, 1] - bounds[:, 0])
print(f"初期CFD評価数: {X_init.shape[0]} 点")
```

### ② GPRサロゲートモデルの構築

CFD結果（ダウンフォース係数 CL、ドラッグ係数 CD）を目的変数としてGPRを学習する。

```python
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import Matern

# GPRサロゲートモデル（Maternカーネル使用）
kernel = Matern(length_scale=1.0, nu=2.5)
gpr = GaussianProcessRegressor(
    kernel=kernel,
    n_restarts_optimizer=10,
    normalize_y=True
)

# X_cfd: 評価済みパラメータ, y_cl: CFD算出CL値
gpr.fit(X_cfd, y_cl)

# 新設計点の予測（予測値 + 不確実性）
y_pred, y_std = gpr.predict(X_candidates, return_std=True)
print(f"予測精度 R²: {gpr.score(X_cfd, y_cl):.4f}")
```

### ③ Active LearningでCFD計算点を最適選択

```python
from scipy.stats import norm

def expected_improvement(y_pred, y_std, y_best, xi=0.01):
    """Expected Improvement 獲得関数"""
    z = (y_pred - y_best - xi) / (y_std + 1e-9)
    return (y_pred - y_best - xi) * norm.cdf(z) + y_std * norm.pdf(z)

# 次にCFDで評価すべき最有望点を特定
ei = expected_improvement(y_pred, y_std, y_cl.max())
next_idx = np.argmax(ei)
print(f"次のCFD評価推奨点: パラメータ = {X_candidates[next_idx]}")
```

## Before / After 比較

| 項目 | 従来（フルファクトリアルDoE） | ML×DoEワークフロー |
|------|------------------------------|-------------------|
| CFD評価数（同一予算） | 30〜50ケース | 150〜200ケース（3〜4倍）|
| ターンアラウンド時間 | 1サイクル: 4〜6週 | 2〜3週（約50%短縮）|
| 最適解の品質 | 局所最適に留まりやすい | 大域的な設計空間を網羅 |
| エンジニアのパラメータ選定工数 | 約80時間/月 | 約20時間/月（自動化）|

FerrariがAWSで達成した「CFD 60%高速化」は、このGPRサロゲートにSageMakerのスポットインスタンス並列化を組み合わせた結果だ。

## 実践コード例

MBDのパラメータスタディ（例: 制御ゲイン最適化）に応用した完全パイプライン：

```python
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import Matern, WhiteKernel
from sklearn.preprocessing import StandardScaler
from scipy.stats import norm
import numpy as np

class MBDParameterSurrogate:
    """MBDシステムのパラメータスタディ用サロゲートモデル"""

    def __init__(self):
        kernel = Matern(nu=2.5) + WhiteKernel(noise_level=1e-5)
        self.gpr = GaussianProcessRegressor(
            kernel=kernel,
            alpha=1e-6,
            n_restarts_optimizer=5,
            normalize_y=True
        )
        self.scaler = StandardScaler()

    def fit(self, X: np.ndarray, y: np.ndarray):
        X_scaled = self.scaler.fit_transform(X)
        self.gpr.fit(X_scaled, y)
        return self

    def predict(self, X: np.ndarray):
        X_scaled = self.scaler.transform(X)
        return self.gpr.predict(X_scaled, return_std=True)

    def suggest_next_point(self, X_candidates: np.ndarray) -> int:
        """EIに基づく次の評価点インデックスを返す"""
        y_pred, y_std = self.predict(X_candidates)
        y_best = self.gpr.y_train_.max()
        z = (y_pred - y_best) / (y_std + 1e-9)
        ei = (y_pred - y_best) * norm.cdf(z) + y_std * norm.pdf(z)
        return int(np.argmax(ei))

# 使用例: 車両ダイナミクスモデルのPIDゲインスタディ
# X_existing_runs: 既存シミュレーション結果のパラメータ行列
# y_lap_time: 対応するラップタイム（最小化目標）
surrogate = MBDParameterSurrogate()
surrogate.fit(X_existing_runs, -y_lap_time)  # 最大化のため符号反転
next_idx = surrogate.suggest_next_point(X_new_candidates)
print(f"次に試すべきゲイン設定: {X_new_candidates[next_idx]}")
```

## 注意点・落とし穴

- **GPRのスケーラビリティ限界**: 学習データが1000点を超えるとGPRの計算コスト（O(n³)）が急増する。その場合はSparse GPやBayesian Neural Networkへの移行を検討する。
- **サロゲートの適用範囲**: サロゲートモデルは訓練データ範囲内の補間は高精度だが、外挿には信頼性が低い。`y_std`（不確実性）が訓練データ標準偏差の2倍を超える領域は必ずCFDで再検証すること。
- **SageMakerコスト管理**: スポットインスタンスを使わないと、集中的な学習フェーズで予想外のコストが発生する。`ml.g4dn.xlarge`スポットインスタンスはオンデマンド比で最大70%コスト削減が可能。
- **DoE初期点数**: LHSサンプル数が少なすぎると（パラメータ数の3倍未満が目安）、GPRが適切に収束しない。5パラメータなら最低15〜20点のCFD評価が必要。

## 応用：より高度な使い方

AWS上のDoE×MLパイプラインは、Simulinkモデルの自動キャリブレーションに応用できる。S-Function経由でシミュレーション結果をPythonに渡し、SageMaker上のサロゲートモデルに自動フィードバックするループを組むと、手動調整に数日かかっていたパラメータ最適化が数時間で完了する。

さらに、MathWorksのMATLAB MCP Core Serverと組み合わせることで、「このパラメータをMBDモデルで最適化して」と自然言語で指示するだけで、DoEサンプリング→Simulink実行→GPR学習→次点提案のサイクルが自律的に回るエージェントが構築できる。2026年以降のMBDエンジニアリングでは、こうした「AIが設計空間を能動的に探索する」ワークフローが標準になるだろう。

## 今すぐ試せる最初の一歩

```bash
# Pythonサロゲートモデル環境のセットアップ（5分）
pip install numpy scipy scikit-learn pandas matplotlib

# Jupyter Notebookで上記コードを試す
jupyter notebook
```

3〜5個のパラメータと10〜20点の既存シミュレーション結果があれば、今日からサロゲートモデルの構築を始められる。[AWS公式ブログ](https://aws.amazon.com/blogs/machine-learning/optimize-f1-aerodynamic-geometries-via-design-of-experiments-and-machine-learning/)には完全なリファレンス実装も公開されている。
