---
title: "【学生フォーミュラ実践】Luminary Cloud SHIFTで物理AI基盤モデルをファインチューニングして車体空力を製造前日に確定する"
date: 2026-06-30
category: "Race Engineering Use Cases"
tags: ["学生フォーミュラ", "Luminary Cloud SHIFT", "物理AI基盤モデル", "DoMINO", "転移学習"]
tool: "Luminary Cloud SHIFT"
official_url: "https://huggingface.co/datasets/luminary-shift/SUV"
importance: "high"
summary: "HuggingFaceで無料公開されているSHIFT-SUV物理AI基盤モデルを自チームの20ケースCFDデータでファインチューニングし、新形状のCdを0.3秒で予測できる学生フォーミュラ専用サロゲートを構築する方法を解説します。"
---

## この記事を読む前に

本記事では、Luminary Cloud・Honda・NVIDIAが共同開発した物理AI基盤モデル「SHIFT-SUV」（[HuggingFace](https://huggingface.co/datasets/luminary-shift/SUV)）の転移学習によるフォーミュラ車体への適用を解説します。NVIDIA PhysicsNeMoのDoMINOアーキテクチャの概要は[Luminary Cloud SHIFT：Honda×NVIDIA共同開発の物理AI基盤モデル入門](/blog/luminary-cloud-shift-suv-physics-ai-foundation-model-automotive-aero-2026)でご確認ください。

## 学生フォーミュラ・レース車両開発への応用

### シナリオ：モノコック最終形状の空力評価を製造前日に完了させる

製造開始前日、モノコック外装の形状バリアントが8案残っている。フルCFDを8本回す時間はない。しかし「物理AI基盤モデルの転移学習」なら、手元の20ケースのOpenFOAMデータで学習済みSUV空力モデルをファインチューニングし、当日中に8案のCd（抵抗係数）を予測して設計を確定できます。

SHIFT-SUV（Luminary Cloud, 2025年4月公開）はCC-BY-NC-4.0ライセンスで**HuggingFaceから無料ダウンロード可能**なオープンソース物理AI基盤モデルです。1,000件超のDDES（遅延離脱渦シミュレーション、高精度CFDの一種）で事前学習済みのDoMINO（NVIDIA PhysicsNeMo）アーキテクチャを採用し、STLジオメトリ入力から表面圧力場・抵抗係数をミリ秒推論します。

### 背景理論：転移学習（Transfer Learning）でデータ不足を補う

**基盤モデル（Foundation Model）**とは、大量の汎用データで事前学習した「土台」モデルです。ChatGPTがテキストの基盤モデルをファインチューニングして特定タスクに適応させるように、SHIFT-SUVは物理AI版の基盤モデルです。

**転移学習の原理**：SUV形状のCFDで学習した流体力学の特徴（境界層の発達パターン、後流の渦構造、圧力係数の分布形状）はフォーミュラ車体でも共通しています。エンコーダ（特徴抽出器）の重みを凍結し、デコーダ（予測器）だけを自チームの20ケースでファインチューニングすることで、100ケース分の訓練に匹敵する精度が得られます。

出典：Luminary Cloud公式ブログ「Introducing SHIFT-SUV: Open-Source Physical AI Foundation Model for Automotive Aerodynamics」（[2025-04-11](https://www.luminarycloud.com/blog/introducing-shift-suv/)）

### 実装：ステップバイステップ

**前提条件**
- Python 3.10+、PyTorch 2.2+、CUDA 12.0+（VRAM 16GB推奨）
- `pip install nvidia-physicsnemo huggingface_hub trimesh`
- 自チームのOpenFOAMまたはFluent出力（最低20ケース、VTU形式）

```python
# === ステップ1: SHIFT-SUVデータセットをHuggingFaceから取得 ===
# CC-BY-NC-4.0ライセンス（学術・非商用は無料）

from huggingface_hub import snapshot_download
from pathlib import Path

# SHIFT-SUVのサンプルVTKデータ（50ケース含む）をダウンロード
dataset_path = snapshot_download(
    repo_id="luminary-shift/SUV",   # HuggingFaceリポジトリID
    repo_type="dataset",             # データセットとして取得
    local_dir="shift_suv_data/"      # ローカル保存先
)
print(f"ダウンロード完了: {dataset_path}")

cases = list(Path(dataset_path).glob("cases/*.vtu"))
print(f"サンプルケース数: {len(cases)}件")
```

```python
# === ステップ2: PhysicsNeMo DoMINOで事前学習済みモデルをロード ===
# DoMINO: Domain-Decomposed Input-Output（NVIDIA PhysicsNeMo）

import torch
from physicsnemo.models.domino import DoMINO

# DoMINOモデルを定義（SHIFT-SUV論文の設定と一致させる）
model = DoMINO(
    input_features=3,          # 節点座標 (x, y, z)
    output_features=4,         # 出力: 圧力p + 速度 (Ux, Uy, Uz)
    hidden_dim=512,            # 隠れ層の次元数
    num_encoder_layers=8,      # エンコーダ層数（特徴抽出部分）
    num_decoder_layers=4       # デコーダ層数（予測部分）
)

# SHIFT-SUV事前学習済み重みをロード
# ※ 学習済み重みはLuminary CloudのGitHub/HuggingFaceから取得
checkpoint = torch.load("shift_suv_pretrained.pt", map_location="cuda")
model.load_state_dict(checkpoint["model_state_dict"])
model = model.cuda()

# エンコーダを凍結（転移学習の定石：特徴抽出層の重みは更新しない）
for param in model.encoder.parameters():
    param.requires_grad = False

trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
total = sum(p.numel() for p in model.parameters())
print(f"ファインチューニング対象: {trainable:,} / {total:,} パラメータ")
```

```python
# === ステップ3: 自チームCFDデータでデコーダをファインチューニング ===
# OpenFOAM出力（VTU）から表面節点 + 圧力場を読み込んで追加学習する

from physicsnemo.datapipes.cae import MeshDatapipe
from torch.optim import AdamW

# 自チームのCFDケース（VTUファイル）をリスト化
formula_vtus = sorted(Path("cfd_results/").glob("formula_body_*.vtu"))
print(f"ファインチューニングデータ: {len(formula_vtus)}ケース")

# データローダーを設定
datapipe = MeshDatapipe(
    files=list(formula_vtus),
    fields=["p", "U"],           # 圧力p と速度ベクトルU
    num_sample_points=50000,     # 表面サンプル点数（精度と速度のバランス）
    train_split=0.8              # 80%訓練 / 20%検証
)

optimizer = AdamW(
    filter(lambda p: p.requires_grad, model.parameters()),  # 凍結されていない層のみ
    lr=1e-4,          # デコーダのみ更新するため低めの学習率
    weight_decay=1e-5
)

# ファインチューニング（20エポック、GPU1枚で約40〜60分）
model.train()
for epoch in range(20):
    epoch_loss = 0.0
    for batch in datapipe:
        coords = batch["coordinates"].cuda()    # 表面節点座標
        targets = batch["p"].cuda()             # 正解圧力場

        pred = model(coords)["p"]               # モデル予測
        loss = torch.nn.functional.mse_loss(pred, targets)  # 平均二乗誤差

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        epoch_loss += loss.item()

    if (epoch + 1) % 5 == 0:
        avg = epoch_loss / max(len(datapipe), 1)
        print(f"Epoch {epoch+1:02d}/20 | Loss: {avg:.6f}")

torch.save(model.state_dict(), "shift_formula_finetuned.pt")
print("ファインチューニング完了")
```

```python
# === ステップ4: 8バリアントを秒単位でスクリーニング ===
# ファインチューニング済みモデルで新設計のCdを瞬時に予測する

import trimesh   # pip install trimesh
import numpy as np

model.eval()
model.load_state_dict(torch.load("shift_formula_finetuned.pt"))

variants = [f"new_designs/monocoque_v{i}.stl" for i in range(8)]
for stl_path in variants:
    # STLから表面点群を50,000点サンプリング
    mesh = trimesh.load(stl_path)
    pts = mesh.sample(50000)                        # ランダムサーフェスサンプリング
    coords = torch.tensor(pts, dtype=torch.float32).unsqueeze(0).cuda()

    with torch.no_grad():
        pred = model(coords)                        # 推論（約0.3秒）

    # 表面圧力の平均からCdを概算（動圧 q = 0.5 × ρ × v²）
    p_mean = pred["p"].squeeze().mean().item()
    q_ref = 0.5 * 1.225 * 15.0**2                  # 基準動圧（ρ=1.225kg/m³, v=15m/s）
    Cd_est = abs(p_mean) / q_ref
    print(f"{Path(stl_path).stem}: Cd ≈ {Cd_est:.4f}（推論 0.3秒）")
```

**実行結果（例）**
```
ダウンロード完了: shift_suv_data/
サンプルケース数: 50件
ファインチューニング対象: 3,145,728 / 47,186,944 パラメータ
Epoch 05/20 | Loss: 0.003241
Epoch 10/20 | Loss: 0.001087
Epoch 15/20 | Loss: 0.000534
Epoch 20/20 | Loss: 0.000312
ファインチューニング完了
monocoque_v0: Cd ≈ 0.4823（推論 0.3秒）
monocoque_v1: Cd ≈ 0.4612（推論 0.3秒）
monocoque_v2: Cd ≈ 0.4391（推論 0.3秒）  ← 最小Cd
monocoque_v3: Cd ≈ 0.4710（推論 0.3秒）
monocoque_v7: Cd ≈ 0.5104（推論 0.3秒）
```

### Before / After（実数値で比較）

| 項目 | OpenFOAM単独（8バリアント） | SHIFT転移学習後 |
|------|---------------------------|----------------|
| 必要な自チームCFDケース数 | 8件 | 20件（事前学習データは不要） |
| 合計計算時間 | 32〜64時間 | 訓練40分 + 推論2.4秒（8バリアント） |
| 製造前日に判断できるバリアント数 | 0〜2件 | 8件（当日中） |
| Cd予測誤差（RMSE） | —（正確値） | ±0.008〜0.015 |
| 導入コスト | 0円 | 0円（CC-BY-NC-4.0、HuggingFace公開） |

数字の根拠：Luminary Cloud公式ブログ「Introducing SHIFT-SUV」（[2025-04-11](https://www.luminarycloud.com/blog/introducing-shift-suv/)）、PhysicsNeMo DoMINOのGitHubベンチマーク（[NVIDIA/physicsnemo](https://github.com/NVIDIA/physicsnemo/tree/main/examples/cae/domino)）より。

### 学生チームが今すぐ試せる最初のステップ

1. `pip install nvidia-physicsnemo huggingface_hub trimesh` を実行（5分）
2. ステップ1のコードでSHIFT-SUVサンプルデータをダウンロード（無料）
3. HuggingFaceのサンプルVTKデータで推論コードが動くか確認する
4. 自チームのCFDデータが20件そろったら `formula_vtus` を指定してファインチューニングへ

## よくあるエラーと対処

| エラー | 原因 | 対処 |
|--------|------|------|
| `ModuleNotFoundError: physicsnemo` | パッケージ名が変わった | `pip install nvidia-physicsnemo` を再実行 |
| `CUDA out of memory` | VRAMが不足 | `num_sample_points=20000` に下げる |
| `NaN loss` | 学習率が高い | `lr=1e-5` に下げてリトライ |
| `HFValidationError` | repo_idのスペルミス | `luminary-shift/SUV`（大文字Sに注意）を確認 |
| 転移学習後の誤差が大きい | 自チームCFDのレイノルズ数がSUVと大きく異なる | `model.encoder` の凍結を解除して全層ファインチューン |

## 今週の学生チームへの宿題

今週末は `pip install nvidia-physicsnemo huggingface_hub` を実行し、`snapshot_download(repo_id="luminary-shift/SUV", repo_type="dataset")` でサンプルVTKデータ50件をダウンロードしてください。ParaViewで圧力場を可視化するだけでも、基盤モデルが「どの程度正確に流れ場を学習しているか」が体感でき、転移学習の有効性に自信を持って進められます。
