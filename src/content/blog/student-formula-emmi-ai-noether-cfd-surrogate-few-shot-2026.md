---
title: "【学生フォーミュラ実践】オープンソースAB-UPT「Noether」で空力CFDサロゲートを80ケースから構築する"
date: 2026-06-30
category: "Race Engineering Use Cases"
tags: ["学生フォーミュラ", "Emmi AI", "Noether", "物理AIサロゲート", "CFD空力最適化"]
tool: "Emmi AI / Noether Framework"
official_url: "https://github.com/Emmi-AI/noether"
importance: "high"
summary: "学生フォーミュラチームがオープンソース物理AI「Noether（AB-UPT）」を使い、80ケース程度のOpenFOAMデータから高精度の空力サロゲートモデルを構築してGPU1枚でフルフィールド予測する方法を解説します。"
---

## この記事を読む前に

本記事では、ドイツのEmmi AIが2026年1月に公開したオープンソース物理AIフレームワーク「Noether」（[GitHub: Emmi-AI/noether](https://github.com/Emmi-AI/noether)）を使った学生フォーミュラ向けCFDサロゲート構築を解説します。まず「CFDサロゲートモデルとは何か」を理解するために[AB-UPT / Noether：100倍スケールの自動車CFDサロゲート入門](/blog/ab-upt-emmi-noether-cfd-surrogate-automotive-2026)をご確認ください。

## 学生フォーミュラ・レース車両開発への応用

### シナリオ：シーズン終盤のCFDリソース枯渇を一発打開する

大会3週間前、フロントウィングの最終確認CFDを回したいが、学校クラスタは他チームで埋まっている。手持ちにあるのはこの1年で蓄積した80ケースのOpenFOAM結果だけ。「このデータでフルフィールドサロゲート（表面圧力分布を丸ごと予測するモデル）を今夜中に構築し、明日の朝に1,000バリアントをスクリーニングして設計を確定したい」——毎シーズンこうした状況に追い詰められるチームは多いはずです。

Noether（AB-UPT: Anchored-Branched Universal Physics Transformers、[arXiv:2502.09692](https://arxiv.org/abs/2502.09692)）はまさにこのケース向けに設計されています。Emmi AI（ドイツ）がMITライセンスで公開しており、GPU1枚・100ケース未満で高精度の空力サロゲートが構築できます。

### 背景理論：AB-UPTが「少量データでも壊れない」理由

従来のGNN（グラフニューラルネットワーク）ベースのCFDサロゲート（MeshGraphNetなど）は、数百〜数千ケースの訓練データを必要とします。Noetherが少量データで機能する理由は2つです。

**Anchored Attention（固定アテンション）**：ランダムなメッシュ節点間でなく「固定アンカー点」（CAD上の特定位置）を中心にトランスフォーマーのアテンション計算を行います。形状が変化してもアンカー点の位置が安定しているため、少量サンプルでも一貫した特徴抽出が可能です。

**ゼロ発散制約（Divergence-Free Condition）**：非圧縮流れの連続の式（∇·u = 0、流体の質量保存則）を損失関数にハード制約として組み込みます。物理的に不可能な速度場が生成されなくなるため、少量データでも物理的に整合した予測が得られます。DrivAerML公開ベンチマーク（100ケース評価）でCd RMSE ±0.012を達成しています。

### 実装：ステップバイステップ

**前提条件**
- Python 3.10+、PyTorch 2.2+、CUDA 12.0+（VRAM 16GB推奨）
- Ubuntu 22.04（またはWSL2）
- OpenFOAM v2312出力（VTU形式）、最低50ケース推奨（今回は80ケース）

```bash
# === ステップ0: Noetherのインストール（約5分）===
git clone https://github.com/Emmi-AI/noether
cd noether
pip install -e ".[dev]"  # PyTorch・torch-geometricなどの依存を一括インストール
```

```python
# === ステップ1: OpenFOAMデータをNoether形式に変換 ===
# VTUファイル群から表面メッシュ + 物理量（圧力・速度）を読み込む

from noether.data import CFDSurfaceDataset
from pathlib import Path

# 80ケースのVTUファイルが入ったディレクトリを指定
data_root = Path("openfoam_cases/")

dataset = CFDSurfaceDataset(
    root=data_root,
    pattern="wing_*_surface.vtu",     # 表面メッシュVTUファイルの命名パターン
    fields=["p", "U"],                # 圧力 p と速度ベクトル U を使用
    normalize=True,                    # 入力を [-1, 1] に正規化（学習安定化のため）
    n_anchor=256                       # アンカー点数（多いほど精度↑・速度↓）
)

# 訓練70ケース / 検証10ケースに分割
train_ds, val_ds = dataset.split(train_fraction=0.875)
print(f"訓練: {len(train_ds)}ケース / 検証: {len(val_ds)}ケース")
```

```python
# === ステップ2: AB-UPTモデルの定義と訓練（GPU1枚・約4〜6時間）===
from noether.models import ABUPT
from noether.training import Trainer

# AB-UPTモデルを初期化（論文デフォルト設定）
model = ABUPT(
    hidden_dim=256,         # 隠れ層の次元数
    num_heads=8,            # マルチヘッドアテンション数
    num_layers=6,           # トランスフォーマー層数
    output_fields=["p"],    # 出力：表面圧力のみ予測
    divergence_free=True    # ゼロ発散制約を有効化（物理整合性を保証）
)

# 訓練設定
trainer = Trainer(
    model=model,
    train_dataset=train_ds,
    val_dataset=val_ds,
    learning_rate=2e-4,      # AdamWオプティマイザの学習率
    batch_size=4,            # VRAM 16GBに合わせたバッチサイズ
    max_epochs=100,
    checkpoint_dir="checkpoints/wing_surrogate/"
)

trainer.fit()  # 訓練開始（進捗バーとバリデーション損失が表示される）
```

```python
# === ステップ3: 新形状の高速スクリーニング（1,000バリアントを5分で）===
# 訓練済みモデルで新設計の表面圧力場を推論する

from noether.inference import Predictor

# 訓練済みモデルを読み込む
predictor = Predictor.from_checkpoint("checkpoints/wing_surrogate/best.ckpt")

results = []
for i in range(1000):
    stl_path = f"design_variants/wing_v{i:04d}.stl"   # バリアントSTLファイル
    prediction = predictor.predict(stl_path)            # サロゲート推論（0.3秒/形状）

    # 圧力場を積分してダウンフォース係数CLを計算
    Cl = predictor.integrate_pressure(
        prediction["p"],
        axis="lift",
        reference_area=0.5   # フロントウィング参照面積 [m²]
    )
    results.append({"variant": i, "Cl": Cl})

# 最もダウンフォースが大きい設計を抽出
best = max(results, key=lambda x: abs(x["Cl"]))
print(f"最適設計: バリアント#{best['variant']:04d}, Cl = {best['Cl']:.4f}")
print(f"1,000バリアント評価時間: {1000 * 0.3 / 60:.1f} 分")
```

**実行結果（例）**
```
訓練: 70ケース / 検証: 10ケース
Epoch  10/100 | Train Loss: 0.02341 | Val Loss: 0.02891
Epoch  50/100 | Train Loss: 0.00512 | Val Loss: 0.00763
Epoch 100/100 | Train Loss: 0.00189 | Val Loss: 0.00312
最適設計: バリアント#0427, Cl = -1.4823
1,000バリアント評価時間: 5.0 分
```

### Before / After（実数値で比較）

| 項目 | OpenFOAM単独 | Noether AB-UPT使用後 |
|------|-------------|---------------------|
| 80ケースの計算時間 | 320時間（4時間×80件） | 変わらず（訓練データは必要） |
| 追加1,000バリアント評価 | 4,000時間（現実不可能） | 5分 |
| 最終候補決定までの期間 | 2〜3ヶ月 | 3日（訓練1日+スクリーニング即日） |
| Cd/Cl予測誤差（RMSE） | —（正確値） | ±0.012（DrivAerML 100件検証） |
| 導入コスト | 0円 | 0円（MITライセンス） |

数字の根拠：[arXiv:2502.09692](https://arxiv.org/abs/2502.09692)「AB-UPT: Universal Physics Transformers for Scalable and Accurate Aerodynamic Surrogate Modeling」（Emmi AI, 2026）およびGitHub公開ベンチマーク（DrivAerML 100ケース評価）より。

### 学生チームが今すぐ試せる最初のステップ

1. `git clone https://github.com/Emmi-AI/noether && pip install -e .` を実行（5分）
2. `notebooks/quick_start.ipynb` をJupyterで開く
3. リポジトリ内のサンプルデータ（DrivAerML公開データセット10ケース）で訓練を試す
4. 自チームのCFDデータが10件以上あれば `CFDSurfaceDataset` の `root` を自フォルダに変更して本番運用へ

## よくあるエラーと対処

| エラー | 原因 | 対処 |
|--------|------|------|
| `CUDA out of memory` | バッチサイズが大きすぎる | `batch_size=2` または `batch_size=1` に下げる |
| `ValueError: n_anchor too large` | アンカー点数がメッシュ節点数を超えている | `n_anchor=128` に下げる |
| `NaN in loss` | 圧力場の正規化がうまくいっていない | `normalize=True` を確認、外れ値ケースを除外する |
| `FileNotFoundError: wing_*_surface.vtu` | ファイル命名パターンが一致していない | `ls openfoam_cases/` で実際のファイル名を確認しpatternを調整 |
| 訓練が収束しない | 学習率が高すぎる | `learning_rate=1e-4` に下げる |

## 今週の学生チームへの宿題

今週末、`git clone https://github.com/Emmi-AI/noether` を実行してリポジトリ内の `notebooks/quick_start.ipynb` を動かしてください。自チームのCFDデータがなくても、GitHubのサンプルデータ（DrivAerML公開データセット）でサロゲート訓練から推論までの全ワークフローを体験できます。
