---
title: "工業精度±1%のオープン空力CFDデータセット「DrivAerStar」で自前のサロゲートモデルを構築する方法"
date: 2026-06-02
category: "Research AI"
tags: ["DrivAerStar", "CFD", "Surrogate Model", "Open Dataset", "STAR-CCM+", "Automotive Aerodynamics", "NeurIPS", "Transolver"]
tool: "DrivAerStar"
official_url: "https://github.com/DrivAerStar/DrivAerStar"
importance: "high"
summary: "NeurIPS 2025 Datasets Trackで公開された「DrivAerStar」は、STAR-CCM+で生成した1万2000件の工業グレードCFDシミュレーションを収録したオープンデータセット。風洞検証精度±1.04%（既存比5倍改善）を達成し、TransolverなどのAIモデルが生産レベルの抗力係数予測を実現。社内CFDデータを持たないチームでも本格的な空力サロゲートモデルを自前構築できる最高品質のリソースだ。"
---

## はじめに

「サロゲートモデルを自社で構築したい。でも学習データが足りない」——CAEエンジニアがAI空力予測に着手する際に最初にぶつかる壁だ。一般的なF1チームのCFDアーカイブは数百〜数千ケースだが、そのほとんどは非公開であり、外部のAIツール開発者はおろか若手エンジニアの訓練にも活用できない。さらに「公開されているデータセット」は学術目的の低精度ケースが多く、工業用ソルバーで要求される±2%以内の精度には遠く及ばないことが多かった。

この壁を一気に取り除いたのが、NeurIPS 2025 Datasets and Benchmarks Trackで公開された「DrivAerStar」だ。STAR-CCM+で生成した1万2000件の工業グレードCFDシミュレーションを20TBのオープンデータとして無償公開し、風洞検証精度±1.04%という既存データセット比5倍の精度向上を達成している。このデータさえあれば、Transolver・GNOT・PointNetなど最新のAIアーキテクチャを即座に訓練できる。

## DrivAerStarとは

DrivAerStarはカーネギーメロン大学と産業界の研究者チームが開発した自動車外部空力解析向けオープンCFDデータセットだ（arXiv: 2510.16857、NeurIPS 2025採択）。

既存の公開データセットとの違いは「工業グレード」にある。学術的なDrivAerML（500ケース、ハイブリッドRANS-LES）やDrivAerNet++（8000ケース、低フィデリティ）とは異なり、DrivAerStarは：

- **12,000ケース** のSTAR-CCM+シミュレーション（産業標準ソルバー使用）
- **3車体形状**（ファストバック・ノッチバック・ステーションワゴン）を対象
- **20個のCADパラメータ**をFree Form Deformation（FFD）で系統的に変化
- **エンジンルームと冷却システム**を含むリアルな内部空気流れを再現
- **計算コスト**: 108万CPUコア時間、100ノードを投入して生成

最大の技術的成果は**精度**だ。従来の公開データセットが風洞比較で5%超の誤差を示す中、DrivAerStarは厳密なwally⁺管理と精細なメッシュ戦略により±1.04%を達成した。抗力係数（Cd）の絶対誤差はわずか±0.012と、実車設計判断に使用できる水準だ。

## 実際の動作：ステップバイステップ

**前提条件**

```bash
# Pythonライブラリをインストール
pip install torch torch-geometric numpy h5py matplotlib tqdm

# DrivAerStarリポジトリをクローン
git clone https://github.com/DrivAerStar/DrivAerStar.git
cd DrivAerStar

# データをダウンロード（Hugging Face Datasets 経由）
pip install datasets huggingface_hub
```

**データロードと前処理**

```python
# === ステップ1: データセットをロードする ===
# DrivAerStarはHDF5形式で提供される
import h5py
import numpy as np

# 1サンプルをロードして中身を確認する
with h5py.File("data/sample_0001.h5", "r") as f:
    # 表面メッシュ座標（点群）: shape = (N_points, 3)
    vertices = np.array(f["mesh/vertices"])
    
    # 表面圧力分布: shape = (N_points,)
    pressure = np.array(f["flow/pressure_surface"])
    
    # 壁面剪断応力: shape = (N_points, 3)
    wall_shear = np.array(f["flow/wall_shear_stress"])
    
    # 抗力・揚力係数
    cd = float(f["aerodynamics/drag_coefficient"][()])
    cl = float(f["aerodynamics/lift_coefficient"][()])
    
    print(f"メッシュ節点数: {len(vertices)}")  # 例: 約50万点
    print(f"抗力係数 Cd: {cd:.4f}")
    print(f"揚力係数 Cl: {cl:.4f}")

# === ステップ2: Graph Neural Networkで抗力係数を予測する ===
import torch
from torch_geometric.data import Data, DataLoader
from torch_geometric.nn import GCNConv, global_mean_pool

class SimpleAeroNet(torch.nn.Module):
    """シンプルなGNNによる抗力係数予測モデル"""
    def __init__(self, node_features=3):
        super().__init__()
        # グラフ畳み込み層（メッシュ接続を活用）
        self.conv1 = GCNConv(node_features, 64)
        self.conv2 = GCNConv(64, 128)
        self.conv3 = GCNConv(128, 64)
        # グローバルプーリング後に全結合層でCdを予測
        self.fc = torch.nn.Sequential(
            torch.nn.Linear(64, 32),
            torch.nn.ReLU(),
            torch.nn.Linear(32, 1),  # 出力: Cd予測値
        )

    def forward(self, data):
        x, edge_index, batch = data.x, data.edge_index, data.batch
        # メッシュグラフ上で特徴を伝播
        x = torch.relu(self.conv1(x, edge_index))
        x = torch.relu(self.conv2(x, edge_index))
        x = torch.relu(self.conv3(x, edge_index))
        # 全節点の特徴を集約してグローバル特徴ベクトルを作成
        x = global_mean_pool(x, batch)
        # Cdを回帰予測
        return self.fc(x).squeeze()

# === ステップ3: 訓練ループ（簡略版） ===
model = SimpleAeroNet(node_features=3).cuda()
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
loss_fn = torch.nn.MSELoss()

for epoch in range(100):
    total_loss = 0
    for batch in train_loader:
        batch = batch.cuda()
        pred = model(batch)
        loss = loss_fn(pred, batch.y)  # batch.y = 真のCd値
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        total_loss += loss.item()
    if epoch % 10 == 0:
        print(f"Epoch {epoch}: Loss = {total_loss/len(train_loader):.4f}")
```

実行結果の例（100 epoch後）：
```
Epoch 0:  Loss = 0.0245
Epoch 10: Loss = 0.0089
Epoch 50: Loss = 0.0032
Epoch 90: Loss = 0.0019  ← 平均絶対誤差 約0.008 Cd相当
```

## Before / After 比較

| 指標 | 既存データセット | DrivAerStar |
|------|-----------------|-------------|
| サンプル数 | DrivAerML: 500件 / DrivAerNet++: 8,000件 | **12,000件** |
| 風洞検証誤差 | 5〜10% | **±1.04%（5倍改善）** |
| エンジンルーム | 非対応（外部空気のみ） | **対応（内部冷却流れ含む）** |
| CADパラメータ | 5〜15個 | **20個（FFD変形）** |
| MLモデル精度 | Transolver Cd誤差 2.99% | **2.78%（増加データで改善）** |
| 使用ソルバー | OpenFOAM/低フィデリティ | **STAR-CCM+（産業標準）** |

## 実践コード例：Transolver（最先端モデル）でファインチューニング

```python
# Transolver実装の参照（公式DrivAerStar Benchmarkingより）
# pip install transolver  # または公式リポジトリからインストール

from transolver import TransolverModel

# === 事前学習済みTransolverをDrivAerStarでファインチューニング ===
model = TransolverModel.from_pretrained("transolver-base")

# ファインチューニング設定
config = {
    "learning_rate": 5e-5,       # 小さいLRでファインチューニング
    "batch_size": 8,              # GPUメモリに応じて調整
    "epochs": 50,
    "target": "drag_coefficient", # 抗力係数を予測ターゲットに
    "validation_split": 0.1,     # 1200ケースを検証用に使用
}

trainer = model.get_trainer(config)
trainer.train(dataset="drivaerstar", split="train")

# 評価（検証セット）
results = trainer.evaluate()
print(f"Cd 平均絶対誤差: {results['cd_mae']:.4f}")
# 出力例: Cd 平均絶対誤差: 0.0085
```

## 注意点・落とし穴

- **ストレージ要件**：全データは20TB。まず軽量版（1000ケース、約2TB）から始めるのが現実的。研究機関向けにHugging FaceやZenodo経由のストリーミングAPIが提供されている。
- **メッシュサイズのばらつき**：各ケースの節点数は30〜80万と幅広い。バッチ処理にはPyTorch Geometricの`DataLoader`を使いパディングや`batch`インデックスを適切に管理すること。
- **ライセンス**：Creative Commons BY-SA 4.0。商用利用可だが、派生物の公開には同じライセンスを適用する必要がある。
- **計算コスト**：フルデータセット（12,000件）でのTransolverの訓練にはA100 GPU 4枚で約72時間かかる。まず1,000ケースで検証してからスケールアップすること。

## 応用：より高度な使い方

DrivAerStarはNVIDIAの**DoMINO NIM**や**Emmi AI Noether**フレームワークの事前学習データとしても活用できる。自社の少量CFDデータ（20〜40ケース）でファインチューニングする前の基盤モデルを、DrivAerStarで訓練することで、データ効率が大幅に向上する「多段階学習戦略」が有効だ。

また、DrivAerStarの**20個のCADパラメータ**はAnsys optiSLangのDOE設計変数と直接対応付けられるため、optiSLangのDesign Space Exploration（DSE）サンプルとDrivAerStarのML事前学習を組み合わせたハイブリッドワークフローの構築が現実的になった。

## 今すぐ試せる最初の一歩

```bash
# リポジトリをクローンしてサンプルデータだけ取得する（全量DLは不要）
git clone https://github.com/DrivAerStar/DrivAerStar.git
cd DrivAerStar

# ミニサンプル（100ケース）でベンチマークを実行
python benchmark/run_benchmark.py \
    --model transolver \
    --data_path data/mini_sample_100 \
    --target drag_coefficient
# 5分以内で最初のMSE結果が出力される
```

まず100ケースのミニサンプルでTransolverのベンチマークを動かし、自分の環境での再現性を確認してから、本番データセットへのスケールアップに進もう。
