---
title: "150件のLS-DYNAクラッシュFEAで学習したMeshGraphNetが車体変形をミリ秒で予測——NVIDIA PhysicsNeMoで始めるクラッシュサロゲートモデル実装ガイド"
date: 2026-05-29
category: "CAE / Simulation AI"
tags: ["NVIDIA", "PhysicsNeMo", "LS-DYNA", "MeshGraphNet", "クラッシュシミュレーション", "グラフニューラルネット"]
tool: "NVIDIA PhysicsNeMo"
official_url: "https://developer.nvidia.com/physicsnemo"
importance: "high"
summary: "General MotorsがHPCで生成した150件のLS-DYNAクラッシュ解析結果を使い、MeshGraphNetとTransolverで車体全体の衝突変形を数ミリ秒で予測するサロゲートモデルをNVIDIA PhysicsNeMoで構築する方法を解説。AltairのromAIとは異なるメッシュ深層学習アプローチで、設計探索フェーズの計算コストを劇的に削減する。"
---

## はじめに

クラッシュ解析は自動車開発において最も計算コストが高いシミュレーションの一つだ。LS-DYNAを使った車体全体（Body-in-White, BIW）のフロントクラッシュ解析は、GMのような大規模HPCクラスタで数時間から数十時間かかる。設計探索で100バリアントを比較するだけで、数百時間の計算時間と莫大なHPCコストが発生する。

このボトルネックを解決するために、NVIDIA PhysicsNeMoフレームワークを使ったMLサロゲートモデルが登場した。2025年10月に発表された研究（General Motors×NVIDIA）では、150件のLS-DYNAシミュレーション結果を学習した深層学習モデルが、**一度学習すれば新しいバリアントの変形予測をミリ秒〜秒単位で完了**することを実証した。この手法を知らなければ、クラッシュ性能の設計探索で数百時間の計算待ちを続けることになる。

## NVIDIA PhysicsNeMoとは

NVIDIA PhysicsNeMoは物理シミュレーション向けの機械学習フレームワークで、NVIDIAが開発・オープンソースで提供している（以前のNVIDIA Modulusから派生）。主要な特徴は以下のとおりだ：

- **メッシュ対応の深層学習**：FEM/FVMメッシュに直接作用するGraph Neural NetworkやTransformerをサポート
- **物理インフォームド学習**：PIINNも含む多様な学習戦略
- **PyTorchベース**：既存のMLパイプラインとの統合が容易
- **CUDA最適化**：NVIDIA GPUで最大限の性能を引き出す設計

2025年末にリリースされたPhysicsNeMo 25.11には、構造力学向けのクラッシュシミュレーション用サンプルが公式に追加された。これがGM×NVIDIAの共同研究と連動している。

Altair HyperWorksのromAIがSimulink/Altair環境に閉じた統合ツールであるのに対し、PhysicsNeMoは**Pythonのオープンフレームワーク**として任意のFEAコード（LS-DYNA、Abaqus、Nastranなど）の出力データから学習できる点が最大の違いだ。

## 実際の動作：ステップバイステップ

### データ：150件のLS-DYNAフロントクラッシュBIW

GM研究では以下の条件でデータを生成した：
- **解析コード**：LS-DYNA（GMのHPCクラスタで実行）
- **解析内容**：フロントクラッシュ、120ミリ秒のシミュレーション
- **形状**：BIW（車体骨格）、200以上のコンポーネント、うち38コンポーネントは板厚を変動パラメータとして設定
- **データ数**：150件のFEAシミュレーション

### モデルアーキテクチャ

2種類のアーキテクチャを比較した：

**MeshGraphNet（メッシュグラフネット）**：
メッシュを有向グラフに変換し、ノード（メッシュ節点）とエッジ（要素辺）間でメッセージパッシングを繰り返す。FEAメッシュへの適用が自然で、空力解析でも広く使われている実績があるGNNアーキテクチャだ。

**Transolver（トランスソルバー）**：
物理を意識したアテンションメカニズムを持つTransformerアーキテクチャ。大規模メッシュに対して計算複雑度を線形に保つ設計が特徴。

### 時間発展の3戦略

クラッシュは120ミリ秒の動的過程なので、時系列予測が必要になる：

1. **Time-Conditional**：時刻 $t$ を条件として各ステップを独立予測
2. **Autoregressive (AR)**：前ステップの予測を次ステップの入力に使う逐次予測
3. **Stability-Enhanced AR (AR-RT)**：自己回帰ループの誤差蓄積を抑制する安定化版

研究結果では**Transolver + AR-RT（安定化自己回帰）が最高性能**を示した。特に大変形が生じるクラッシュ末期の時空間変形をより正確に捉えた。

### インストールと環境構築

```bash
# NVIDIA PhysicsNeMo のインストール（PyTorch + CUDA必須）
pip install nvidia-physicsnemo

# または開発版をソースからインストール
git clone https://github.com/NVIDIA/physicsnemo.git
cd physicsnemo
pip install -e .
```

必要環境：
- Python 3.10以降
- PyTorch 2.0以降（CUDA 11.8+）
- NVIDIA GPU（推奨：A100またはH100）

## Before / After 比較

| 項目 | LS-DYNA FEA直接実行 | PhysicsNeMo ML サロゲート |
|------|---------|---------|
| 1バリアントの解析時間 | 数時間〜10時間以上 | 数ミリ秒〜数秒（学習後） |
| 100バリアント探索 | 1000時間以上 | 約10分 |
| 必要HPCリソース | GMクラスタ級 | デスクワーク用GPU1台でも推論可 |
| 精度 | 真値（参照標準） | 全体変形トレンドを合理的な忠実度で再現 |
| 初期投資（学習） | — | 150件のFEA生成 + GPU学習（数時間〜） |

精度面では「全体的な変形トレンドを合理的な忠実度で捉える」レベルと研究は評価している。設計探索の**スクリーニングフェーズ**では十分な精度であり、有望候補を絞り込んだあとで高精度FEAを実行するという2段階アプローチが現実的だ。

## 実践コード例

```python
# PhysicsNeMoでMeshGraphNetを使ったクラッシュサロゲートの最小構成例
import torch
from physicsnemo.models.mesh_reduced.mesh_graph_net import MeshGraphNet

# モデル定義
model = MeshGraphNet(
    input_dim_nodes=6,    # 各節点の入力特徴（座標XYZ + 速度XYZ）
    input_dim_edges=3,    # エッジ特徴（相対距離）
    output_dim=3,         # 予測変位（ΔX, ΔY, ΔZ）
    processor_size=128,   # メッセージパッシングの隠れ次元
    num_layers_node_processor=2,
    num_layers_edge_processor=2,
    num_layers_output=2,
)

# 推論（学習済みモデルで新しいBIWバリアントを予測）
model.load_state_dict(torch.load("crash_surrogate_weights.pth"))
model.eval()

with torch.no_grad():
    # graph: PyTorch Geometricのグラフオブジェクト（FEAメッシュを変換）
    predicted_displacement = model(graph)
    # → 150ms クラッシュ全体の変形場を秒単位で取得

print(f"予測完了: {predicted_displacement.shape}")
# → torch.Size([節点数, 3])  ← 各節点の最終変位（X,Y,Z）
```

## 注意点・落とし穴

**150件という学習データの少なさ**：従来のMLでは少ないように見えるが、各FEAは120msにわたる時系列で数千〜数万ステップのデータを持つため、実質的なデータ量は大きい。ただし設計空間（板厚パラメータの範囲など）の端点までカバーするよう、DoEで設計点を均等に配置する必要がある。

**大変形への対応**：クラッシュ末期の大変形・材料破断はMLサロゲートが最も苦手とする領域だ。Transolver-AR-RTでも誤差は大変形領域で増加する。精度が要求される部品（Aピラー、サイドシルなど）は最終的にFEAで確認すること。

**GPUメモリ**：BIW全体のFEAメッシュは節点数が数十万〜数百万に達する。MeshGraphNetの学習では40GB超のGPUメモリが必要になる場合がある。推論はより少ないメモリで実行可能。

**LS-DYNAからPhysicsNeMoへのデータ変換**：LS-DYNAの出力（d3plot形式）をPyTorch Geometricのグラフに変換する前処理パイプラインは自前で実装する必要がある。`dynareadout`や`lasso-python`などのOSSライブラリが変換に役立つ。

## 応用：より高度な使い方

- **Transferable Crashworthiness**：板厚だけでなく材料グレードや接合点座標も変動パラメータに加えることで、より広い設計空間をカバーしたサロゲートに拡張できる。
- **FMU化してSimulinkと統合**：学習済みPhysicsNeMoモデルをONNXに変換し、C-code wrapperを通じてSimulink/FMUとして組み込むと、車両システムシミュレーションの一部として衝突荷重をリアルタイム供給できる。
- **CarCrashNet（2026年）との組み合わせ**：2026年5月に発表されたCarCrashNetデータセット（arxiv: 2605.07098）は大規模な公開クラッシュFEAデータセットで、自社HPCを持たないチームでもPhysicsNeMoのベンチマークが可能だ。

## 今すぐ試せる最初の一歩

```bash
# PhysicsNeMo インストール
pip install nvidia-physicsnemo

# 公式クラッシュサンプルのclone
git clone https://github.com/NVIDIA/physicsnemo.git
cd physicsnemo/examples/structural_mechanics/crash

# サンプルデータ（少量）でMeshGraphNetのトレーニングを実行
python train_meshgraphnet.py --epochs 10 --batch_size 1
```

まずは公式サンプルの小さいデータセットで動作確認する。自社のLS-DYNAデータとの接続は、d3plotファイルをPyGグラフに変換するコードを5〜10行書くだけで橋渡しできる。
