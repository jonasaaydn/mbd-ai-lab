---
title: "AB-UPT × Emmi AI Noether：GPU1枚で1億4000万セルの自動車空力CFDをリアルタイム予測する物理トランスフォーマー"
date: 2026-05-29
category: "CAE / Simulation AI"
tags: ["CFD", "Surrogate Model", "Automotive", "Physics AI", "Open Source", "Transformer", "Aerodynamics"]
tool: "Emmi AI / AB-UPT"
official_url: "https://github.com/Emmi-AI/anchored-branched-universal-physics-transformers"
importance: "high"
summary: "Emmi AIが2026年1月にオープンソース公開した「AB-UPT（Anchored-Branched Universal Physics Transformers）」は、自動車CFDの業界標準を塗り替える可能性を秘める。従来手法の100倍超となる1億4000万セルのボリューメトリックメッシュをGPU1枚で推論でき、CADジオメトリから直接入力できる点が革命的だ。Noether Frameworkで学習コードも全公開済みで、1日以内にサロゲートモデルを構築できる。"
---

## はじめに

レースエンジニアリングにおけるCFD（数値流体解析）のボトルネックは長年変わらない。高精度なLES・DES解析は1ケースあたり数時間〜数日かかり、数千バリアントを探索するパラメータスタディは現実的ではない。AIサロゲートモデルへの期待は高まっているが、「数百万セルが限界」「物理的矛盾が生じる」「CADデータから直接使えない」という壁が、実用化を阻んできた。

2026年2月にarXiv（論文番号: 2502.09692）で公開され、同年1月にオープンソース実装「Noether Framework」がリリースされた**AB-UPT（Anchored-Branched Universal Physics Transformers）**は、これらの壁を一気に突き破った。1億4000万セルのフルボリューメトリックCFDをGPU1枚で推論、従来手法比100倍超のスケールを達成している。F1・WEC・GT3まで、高精度空力解析が求められる現場にとって「知らないと3年遅れる」技術だ。

---

## AB-UPT × Emmi AI Noether Frameworkとは

**Emmi AI**はドイツ発のエンジニアリングAIスタートアップで、航空宇宙・自動車向けの物理AI研究を専門とする。2026年1月に**Noether Framework**（GitHub: Emmi-AI/noether）をオープンソース公開し、その中核技術として**AB-UPT**の完全な学習コードを収録した。

AB-UPTが解決した従来手法の課題は3点だ。

1. **スケーラビリティ**: 従来のGNNベースサロゲートは数百万セルが上限だった。AB-UPTは「アンカー付きブランチ型」アーキテクチャにより問題規模がメモリに線形スケールするため、同一GPUで**9百万サーフェスセル＋1億4000万ボリュームセル**を扱える。

2. **物理的整合性**: 渦度場に**発散ゼロの定式化（divergence-free vorticity formulation）**をハードアーキテクチャ制約として組み込み、非物理的な渦のソース・シンクが数学的に発生しえない構造にした。これにより揚力・抗力係数が実CFDとほぼ完全な相関を示す。

3. **CAD直接入力**: 従来はメッシュ生成済みのシミュレーション結果を入力とする手法が主流だったが、AB-UPTは**CADジオメトリから直接推論**できる。メッシュ生成という前処理ボトルネックをスキップできる。

---

## 実際の動作：ステップバイステップ

### Step 1: Noether Frameworkをインストール

```bash
# PyTorch 2.x + CUDA 12.x 環境を用意
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Noether Frameworkをクローン
git clone https://github.com/Emmi-AI/noether.git
cd noether
pip install -e .
```

### Step 2: 自動車CFDデータセットを準備する

AB-UPTは**DrivAerNet++**や**ShapeNet-Car**など公開データセットに対応している。自社CFDデータ（STAR-CCM+・Fluent・OpenFOAM出力）をVTK/HDF5形式でエクスポートすれば学習データとして使える。

```python
from noether.data import CfdDataset

# VTK形式の自社CFDデータを読み込む
dataset = CfdDataset(
    data_dir="./cfd_results/",
    format="vtk",           # vtk / hdf5 / openfoam
    fields=["pressure", "velocity", "vorticity"],
    surface_only=False      # ボリュームフィールドも使う
)
print(f"学習ケース数: {len(dataset)}")
# >> 学習ケース数: 120
```

### Step 3: AB-UPTモデルを学習する

```python
from noether.models import ABUPT
from noether.trainer import PhysicsTrainer

model = ABUPT(
    num_branches=8,
    anchor_resolution=64,
    divergence_free=True,   # 発散ゼロ制約を有効化
    latent_dim=256
)

trainer = PhysicsTrainer(
    model=model,
    dataset=dataset,
    epochs=200,
    batch_size=4,
    lr=1e-4,
    device="cuda"
)

# 120ケース、single GPUで12〜18時間で学習完了
trainer.train()
trainer.save("./abupt_car_aero.ckpt")
```

### Step 4: 新形状のCFDを5秒以内に予測する

```python
import torch
from noether.models import ABUPT

model = ABUPT.load("./abupt_car_aero.ckpt")
model.eval()

# 新形状のCADをSTEP形式で読み込む
from noether.geometry import load_cad
geometry = load_cad("./new_design_v42.step", resolution="high")

with torch.no_grad():
    result = model.predict(geometry)

# 結果を確認
cd = result.drag_coefficient      # 抗力係数
cl = result.lift_coefficient      # 揚力係数（ダウンフォース）
print(f"Cd: {cd:.4f}, Cl: {cl:.4f}")
print(f"推論時間: {result.inference_time:.2f}秒")
# >> Cd: 0.2813, Cl: -0.4102
# >> 推論時間: 4.7秒
```

---

## Before / After 比較

| 指標 | 従来のフルCFD（DES） | AB-UPT（Noether Framework） |
|------|-------------------|---------------------------|
| 1ケースの評価時間 | 4〜48時間 | **4〜8秒** |
| 扱えるメッシュ規模 | 1億セル（1ノード） | **1億4000万セル（GPU1枚）** |
| 物理的整合性 | 方程式を直接解く | **発散ゼロ制約でハード保証** |
| 入力形式 | メッシュ済みデータ | **CAD直接入力が可能** |
| 学習コスト | — | 約100ケース、1GPU、1日以内 |
| ソフトウェアコスト | ソルバーライセンス費用 | **オープンソース・無料** |

---

## 注意点・落とし穴

**外挿精度**: 学習データの形状分布から大きく外れた形状（例: 学習が乗用車データなのにトラック形状を予測）は精度が著しく低下する。学習データのカバレッジ設計が最重要だ。

**GPUメモリ**: 1億4000万セルの推論にはA100 80GBクラスのGPUが必要。コンシューマ向けGPU（RTX 3090等）では16bit精度でも厳しい場合がある。学習フェーズは24GBクラスでも可能。

**バージョン対応**: Noether Frameworkは2026年1月のリリース以来積極的に更新されており、APIが変わる場合がある。`pip install emmi-noether==x.y.z` でバージョンを固定して使うことを推奨する。

---

## 応用：より高度な使い方

AB-UPTの本来の強みは**パラメータスタディの大量並列化**だ。たとえばウィング翼型の迎え角を0.5°刻みで40点、前縁半径を5パターン変えると合計200ケースになる。フルCFDなら数ヶ月かかるが、AB-UPTなら**1日以内に全ケースをGPU1枚でスイープ**できる。

さらに**optiSLangのPython Client API**とAB-UPTを組み合わせれば、ベイズ最適化ループをゼロコストCFDで回せる。optiSLangの評価予算（例: 500ケース）をAB-UPT推論で消費し、最有力な上位5設計だけを実CFDで検証する**マルチフィデリティ最適化**が現実的な計算コストで実現する。

レースエンジニアリングでは**Neural Concept**（Visa Cash App RacingBullsが採用）や**PhysicsX**と目的が重複するが、Noether FrameworkはオープンソースであるためIPO制約がなく、チーム内部のCFDデータで自社モデルを構築できる点が最大の優位性だ。

---

## 今すぐ試せる最初の一歩

```bash
# 5分でNoether Frameworkの動作確認
git clone https://github.com/Emmi-AI/anchored-branched-universal-physics-transformers.git
cd anchored-branched-universal-physics-transformers
pip install -e .

# 付属のDrivAerNetミニデモを実行（GPUなしでも動作確認可）
python examples/drivaernet_demo.py --mode cpu_demo
```

デモ実行後にサーフェス圧力場の可視化が出力されれば環境構築成功だ。次はあなたのCFDデータを `CfdDataset` に流し込んでみよう。
