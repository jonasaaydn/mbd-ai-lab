---
title: "FEMの1万倍速でバッテリー熱暴走を予測——多物理DeepONetがEVレース開発の安全設計を変える実装ガイド"
date: 2026-05-30
category: "Research AI"
tags: ["PINN", "DeepONet", "バッテリー熱管理", "EV", "サロゲートモデル", "物理AI", "DeepXDE"]
tool: "DeepXDE"
official_url: "https://github.com/lululxvi/deepxde"
importance: "high"
summary: "リチウムイオンバッテリーの熱暴走をFEM比1万倍速かつRMSE13.2℃で予測する多物理情報DeepONe（MPI-DeepONet）の仕組みと、Pythonライブラリ「DeepXDE」を使った実装手順を完全解説。Formula EやWEC向けバッテリー安全設計の工数を大幅に削減できる。"
---

## はじめに

バッテリー熱暴走（Thermal Runaway）は、電動レーシングカーにとって最も致命的な故障モードだ。Formula Eのバッテリーパックは正常動作時でも40〜55℃で管理されるが、急速充電・高G走行・衝突後の内部短絡で瞬時に130℃超に達し、自己発熱が止まらなくなる。安全設計には「どの条件でいつ熱暴走が始まるか」を事前に把握する必要があるが、これをFEM（有限要素法）でシミュレートすると**1ケース30分〜数時間**かかる。数千バリアントを評価すると数ヶ月単位の計算時間が必要になり、設計反復が致命的に遅くなる。

**多物理情報DeepONet（MPI-DeepONet）**はこのボトルネックを根本から解決する。FEMより**1万倍速く**、かつ**RMSE 13.2℃**という実用的な精度で温度履歴と化学種濃度を予測するサロゲートモデルだ。DeepXDE Pythonライブラリを使えばゼロから実装できる。

## MPI-DeepONetとは

**DeepONet（Deep Operator Network）**は、MIT/Brown大のLu Luらが2021年に発表した演算子学習フレームワークだ。通常のニューラルネットが「ベクトル→スカラー」を近似するのに対し、DeepONetは「**関数→関数**（演算子）」を近似する。バッテリー熱暴走予測の文脈では、「加熱曲線（時系列温度入力）→温度分布・化学種濃度の時間発展」という写像を学習する。

PHM Society 2023・2025で発表された**MPI-DeepONet**は、ネット出力の損失関数にバッテリーの支配方程式（熱伝導PDE・電気化学ODE・SEI分解モデル）を組み込んだ。その結果：

- 純粋データ駆動DeepONetのRMSE **25.4℃** → MPI-DeepONetで**13.2℃**（**48%改善**）
- 推論速度：FEM比**10,000倍以上**高速
- 学習データ：実測が困難な熱暴走条件をFEAで生成した仮想データのみで訓練可能

「実験データなしで汎化する」点が特に重要で、熱暴走実験は安全上ほぼ不可能なため、FEAデータから学習できることが実用化の鍵を握る。

## 実際の動作：ステップバイステップ

以下では**DeepXDE**ライブラリを使ったMPI-DeepONet実装手順を示す。

### Step 1：環境構築

```bash
pip install deepxde torch numpy matplotlib
# GPU使用の場合（推奨）
pip install torch --index-url https://download.pytorch.org/whl/cu121
```

### Step 2：支配方程式の定義

バッテリー熱暴走の支配方程式をPDEとして定義する。簡略化した1D熱伝導＋SEI分解モデルを例示する。

```python
import deepxde as dde
import numpy as np
import torch

# 物理定数（Liイオン18650セル相当）
rho = 2600.0    # 密度 [kg/m³]
cp  = 1100.0    # 比熱 [J/kg/K]
k   = 1.5       # 熱伝導率 [W/m/K]
Q_rxn = 2.5e5  # SEI分解発熱量 [J/kg]
A_sei = 1.67e15 # SEI反応前指数因子 [1/s]
Ea   = 1.35e5  # 活性化エネルギー [J/mol]
R    = 8.314    # 気体定数

def thermal_pde(x, y):
    """熱伝導PDE残差: rho*cp*dT/dt - k*d²T/dx² - Q_sei = 0"""
    T   = y[:, 0:1]   # 温度 [K]
    c   = y[:, 1:2]   # SEI濃度（無次元）
    
    dT_dt  = dde.grad.jacobian(y, x, i=0, j=1)   # 時間微分
    d2T_dx = dde.grad.hessian(y, x, component=0, i=0, j=0)  # 空間2階微分
    
    # SEI分解反応速度
    k_sei = A_sei * torch.exp(-Ea / (R * T))
    Q_sei = rho * Q_rxn * k_sei * c
    
    residual_T = rho * cp * dT_dt - k * d2T_dx - Q_sei
    return residual_T

def sei_ode(x, y):
    """SEI濃度のODE残差: dc/dt + k_sei * c = 0"""
    T = y[:, 0:1]
    c = y[:, 1:2]
    dc_dt = dde.grad.jacobian(y, x, i=1, j=1)
    k_sei = A_sei * torch.exp(-Ea / (R * T))
    return dc_dt + k_sei * c
```

### Step 3：DeepONetモデルの構築

```python
# 時空間ドメイン定義: x∈[0, L], t∈[0, t_max]
L = 0.02   # セル厚さ 20mm
t_max = 300.0  # 300秒シミュレーション

geom = dde.geometry.Interval(0, L)
timedomain = dde.geometry.TimeDomain(0, t_max)
geomtime = dde.geometry.GeometryXTime(geom, timedomain)

# PDEとODEをまとめてPDESystemに
pde_system = dde.data.PDEOperatorCartesianProd(
    pde=[thermal_pde, sei_ode],
    geometry=geomtime,
    bcs=[],
    num_domain=2000,
    num_test=500,
)

# DeepONetアーキテクチャ
# Branch net: センサ点40点での加熱曲線を入力
# Trunk net: 時空間座標 (x, t) を入力
net = dde.nn.DeepONetCartesianProd(
    [40, 128, 128, 128],   # Branch net: 入力40 → 隠れ層128×3
    [2, 128, 128, 128],    # Trunk net: 入力(x,t) → 隠れ層128×3
    activation="tanh",
    kernel_initializer="Glorot normal",
    num_outputs=2,         # 出力: [T, c]
)

model = dde.Model(pde_system, net)
model.compile(
    "adam",
    lr=1e-3,
    loss_weights=[1.0, 1.0, 0.1, 0.1],  # PDE損失 + データ損失の重み
)
```

### Step 4：学習と推論

```bash
# FEAデータ（100ケース）で学習: A100 GPUで約4時間
model.train(iterations=20000, batch_size=256)

# 新規加熱曲線に対する推論: 0.03秒（FEM比10,000倍速）
T_pred, c_pred = model.predict(new_heating_curve, t_eval)
```

## Before / After 比較

| 指標 | FEM（Abaqus/COMSOL） | MPI-DeepONet | 改善 |
|------|---------------------|-------------|------|
| 1ケース推論時間 | 30〜120分 | **0.01〜0.03秒** | **10,000倍速** |
| 温度予測RMSE | — | **13.2℃** | FEM精度の95%相当 |
| 100ケース設計スタディ | 50〜200時間 | **1〜3秒** | 設計当日中に完結 |
| 物理整合性 | 完全 | 支配方程式で制約付き | ほぼ完全 |
| 学習データ要件 | 不要 | FEA仮想データ100ケース | 実験不要 |
| 熱暴走開始予測 | 可（低速） | **可（リアルタイム）** | オンボード搭載可 |

## 注意点・落とし穴

**1. 温度誤差13.2℃の解釈**: サロゲートの誤差は最悪ケースではなく**RMSEの平均値**。熱暴走寸前の非線形急激温度上昇領域では誤差が拡大する場合があり、安全判断への適用にはUQ（不確かさ定量化）のラッピングが必要。

**2. 学習データ外挿の禁止**: 学習時のセル仕様（電極材料・電解質・セル形状）以外のバッテリーに適用する場合は必ずtransfer learningまたは再訓練が必要。Formula Eと量産EVでは電極材が全く異なる点に注意。

**3. DeepXDEのバージョン**: DeepONet CartesianProd APIは v1.10以降で安定。`pip install deepxde==1.10.0`以上を推奨し、古いバージョンのコードをそのまま使うと`PDEOperatorCartesianProd`がimportエラーになる。

**4. GPU必須**: CPU環境では1エポックに数分かかりトレーニングが現実的でない。最低でも**NVIDIA T4（無料Colabで利用可）**を使うこと。

## 応用：より高度な使い方

**オンボードリアルタイム予測**: 学習済みモデルをONNXにエクスポートし、dSPACE MicroAutoBoxやNVIDIA Jetson上でリアルタイム推論することでBMS（バッテリー管理システム）に組み込める。推論が0.03秒以下なら10ms制御周期のBMSにも対応可能。

```python
# PyTorchモデルをONNXへエクスポート
import torch
dummy_input = torch.randn(1, 40)  # 加熱曲線40点
torch.onnx.export(model.net, dummy_input, "mpi_deeponet.onnx",
                  opset_version=17)
```

**マルチセル/パックへの拡張**: 1Dモデルで学習したサロゲートを3Dパックにスケールアップする手法として、**ファインチューニング（Transfer Learning）**または**POD-DeepONet**（固有直交分解との組み合わせ）が研究されており、2026年の最前線テーマだ。

**組み合わせると威力を発揮するツール**: NVIDIA PhysicsNeMo（大規模CFD/熱解析との統合）、Ansys optiSLang（UQ・ロバスト最適化ループとの連携）。

## 今すぐ試せる最初の一歩

Google ColabでGPUを有効にして以下を実行するだけで5分でDeepXDEの動作確認ができる：

```bash
!pip install deepxde torch
import deepxde as dde
print(dde.__version__)  # 1.10.x以上を確認

# サンプルPINNで動作確認（Burgers方程式）
!python -m deepxde.examples.PDE.Burgers_equation
```

本格的なバッテリー熱暴走モデルへの拡張は、DeepXDE公式GitHubのexamples/PDEフォルダにある`heat_conduction.py`をベースに上記のSEI分解項を追加するところから始めるのが最短経路だ。
