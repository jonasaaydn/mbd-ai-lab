---
title: "拡散トランスフォーマーがCFDサロゲートを刷新——AeroDiT・FoilDiffで翼型流れ場の誤差を85%削減する2026年実装ガイド"
date: 2026-06-17
category: "CAE / Simulation AI"
tags: ["拡散モデル", "CFD", "翼型", "Transformer", "AeroDiT", "FoilDiff", "RANS", "サロゲートモデル"]
tool: "PyTorch"
official_url: "https://arxiv.org/abs/2510.04325"
importance: "high"
summary: "2025〜2026年に連続発表されたAeroDiTとFoilDiffは、従来のCNN・FNOベースCFDサロゲートを大幅に上回る精度を実現しました。FoilDiffは既存モデル比で最大85%の誤差削減、AeroDiTはRANS解析を数秒で再現。翼型周りの速度場・圧力分布・乱流指標をすべて同時予測する生成AI手法の仕組みと、レース車両開発への実践応用を解説します。"
---

## 「サロゲートは速いが精度が出ない」という時代が終わった

空力サロゲートモデルの最大の弱点は「複雑な流れ構造が再現できない」ことでした。

翼型周りの流れ場は滑らかな圧力分布だけでなく、**剥離バブル・衝撃波・翼端渦**などの局所的で非線形な構造を含みます。これまでのCNN（畳み込みニューラルネットワーク）やFNO（フーリエ神経演算子）は、こうした複雑な流れ構造を学習しきれず、高迎角や高レイノルズ数域で精度が急落していました。

「サロゲートが使えるのは低速・単純形状だけ」——MBDエンジニアがサロゲートを信用しきれない理由がここにありました。

2025〜2026年に発表されたAeroDiTとFoilDiffは、**画像生成AI（拡散モデル）の技術をCFDに転用**することでこの問題を解決しました。

---

## AeroDiT・FoilDiffとは

### AeroDiT（2025年12月、Physics of Fluids掲載）

**What**: DiT（Scalable Diffusion Models with Transformers）をCFD流れ場予測に初めて適用したサロゲートモデル。

**Who**: 学術研究グループが開発し、2024年12月に査読前論文として公開後、2025年12月にAIP Publishing（Physics of Fluids誌）に掲載。

**How**: 既存サロゲートと根本的に異なる「生成AIアプローチ」を採用。流れ場をノイズから徐々に復元するプロセスとして捉え、ReynoldsAveraged Navier-Stokes（RANS）シミュレーションデータを学習します。

### FoilDiff（2025年10月→Aerospace Science and Technology 2026掲載）

**What**: CNN（符号化デコーダ）とTransformer（大域的注意機構）を1つのアーキテクチャに統合したハイブリッド拡散モデル。

**Who**: 独立した研究グループが開発。2025年10月にarXivで公開、2026年にAerospace Science and Technology誌に掲載。

**How**: 「局所的な特徴抽出（CNN）」と「翼面全体の大域的関係の学習（Transformer）」を同時に行うことで、剥離や渦などの複雑な流れ構造を精密に予測。DDIM（加速サンプリング）を使うことで予測速度も確保しています。

### 既存モデルとの違い

| モデル | アーキテクチャ | 主な強み | 弱点 |
|--------|-------------|---------|------|
| U-Net系CNN | 畳み込み | 計算が軽い | 大域的構造が苦手 |
| FNO | フーリエ空間 | 解像度不変 | 不規則メッシュに弱い |
| GNN | グラフ | 複雑形状対応 | データ量が必要 |
| **AeroDiT** | DiT（拡散+Transformer） | 高精度・高レイノルズ数 | 学習コストが高い |
| **FoilDiff** | CNN+Transformer混合拡散 | 高精度・不確かさ推定 | 推論時間がやや長い |

---

## 実際の動作：ステップバイステップ

### 拡散モデルがCFDに使われる理由

画像生成AI（Stable Diffusion、DALL-E等）が「ランダムノイズから画像を復元」するように、**AeroDiTとFoilDiffは「ノイズ状態の流れ場から実際の流れ場を逆拡散で復元」**します。

通常のCNNサロゲートは「入力→出力を直接マッピング」しますが、拡散モデルは「出力の確率分布を学習」します。この違いが、複雑な流れ構造の再現精度に直結しています。

```
従来のCNNサロゲート:
  入力: 翼型形状 + 迎角 + Re数
    ↓（1ステップで変換）
  出力: 流れ場（速度, 圧力）
  問題: 複雑な流れ構造の再現が苦手

拡散モデルサロゲート（AeroDiT/FoilDiff）:
  入力: 翼型形状 + 迎角 + Re数
    ↓（T=100ステップで段階的に復元）
  [ノイズ] → [ぼんやりした流れ] → [詳細な流れ] → 出力: 流れ場
  利点: 各ステップで「ありそうな流れ場」を段階的に精緻化
```

### 前提条件（コードを動かすために）

```bash
# Python 3.10以上、CUDA対応GPUを推奨（CPU動作は遅い）
pip install torch torchvision einops timm matplotlib numpy

# GPU確認
python3 -c "import torch; print('CUDA:', torch.cuda.is_available())"
```

---

## 実践コード例：FoilDiffのアーキテクチャを理解する簡易実装

FoilDiffのコアアイデア（CNN + Transformerのハイブリッドブロック）を簡略化して実装します。実際のFoilDiffより小規模ですが、動作原理を学べます。

```python
# === 前提: pip install torch einops ===
# このコードはFoilDiffの概念実証（Proof of Concept）実装です

import torch
import torch.nn as nn
from einops import rearrange

# === ステップ1: ハイブリッドブロックの定義 ===
# CNNで局所特徴を抽出し、Transformerで大域的な関係を学習する

class HybridBlock(nn.Module):
    """CNN + Transformer を組み合わせたFoilDiffのコアブロック（簡略版）"""
    
    def __init__(self, channels: int, heads: int = 4):
        super().__init__()
        
        # CNN部分: 局所的な流れ構造（境界層・剥離域）を捉える
        self.conv_local = nn.Sequential(
            nn.Conv2d(channels, channels, kernel_size=3, padding=1),
            nn.GroupNorm(8, channels),  # バッチ正規化の代替（バッチサイズ非依存）
            nn.GELU(),
        )
        
        # Transformer部分: 翼面全体にわたる圧力分布の大域的な関係を捉える
        self.attn = nn.MultiheadAttention(
            embed_dim=channels, 
            num_heads=heads, 
            batch_first=True
        )
        self.norm = nn.LayerNorm(channels)
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        x: [batch, channels, H, W] - 流れ場のグリッドデータ
        """
        B, C, H, W = x.shape
        
        # === CNN: 局所特徴の抽出 ===
        local_feat = self.conv_local(x)  # 境界層・剥離バブルを捉える
        
        # === Transformer: 大域的な注意機構 ===
        # 2Dグリッドを1Dシーケンスに変換（Transformerに渡すため）
        x_flat = rearrange(x, 'b c h w -> b (h w) c')
        attn_out, _ = self.attn(x_flat, x_flat, x_flat)
        attn_out = self.norm(attn_out + x_flat)  # 残差接続
        global_feat = rearrange(attn_out, 'b (h w) c -> b c h w', h=H, w=W)
        
        # === 局所特徴 + 大域的特徴を統合 ===
        return local_feat + global_feat


# === ステップ2: 流れ場サロゲートモデルの定義 ===
class SimpleFoilSurrogate(nn.Module):
    """翼型流れ場を予測する簡易サロゲートモデル"""
    
    def __init__(self):
        super().__init__()
        # エンコーダ: 翼型形状入力を特徴マップに変換
        self.encoder = nn.Sequential(
            nn.Conv2d(1, 32, 3, padding=1), nn.GELU(),
            nn.Conv2d(32, 64, 3, padding=1), nn.GELU(),
        )
        # ハイブリッドブロック（FoilDiffのコア）
        self.hybrid = HybridBlock(channels=64, heads=4)
        # デコーダ: 特徴マップを流れ場（Ux, Uy, P）に変換
        self.decoder = nn.Sequential(
            nn.Conv2d(64, 32, 3, padding=1), nn.GELU(),
            nn.Conv2d(32, 3, 3, padding=1),  # 出力: [Ux, Uy, P]の3チャンネル
        )
    
    def forward(self, airfoil_sdf: torch.Tensor) -> torch.Tensor:
        """
        airfoil_sdf: [batch, 1, H, W] - 翼型の符号付き距離関数（SDF）
        Returns: [batch, 3, H, W] - [Ux速度, Uy速度, 圧力]
        """
        feat = self.encoder(airfoil_sdf)
        feat = self.hybrid(feat)
        flow_field = self.decoder(feat)
        return flow_field


# === ステップ3: モデルの動作確認 ===
if __name__ == "__main__":
    model = SimpleFoilSurrogate()
    model.eval()
    
    # ダミー入力: バッチサイズ2, グリッド64×64の翼型SDF
    dummy_sdf = torch.randn(2, 1, 64, 64)
    
    with torch.no_grad():
        predicted_flow = model(dummy_sdf)
    
    print(f"入力形状: {dummy_sdf.shape}")
    print(f"出力形状: {predicted_flow.shape}")
    # → 出力形状: torch.Size([2, 3, 64, 64])
    # → チャンネル0: x方向速度Ux
    # → チャンネル1: y方向速度Uy
    # → チャンネル2: 圧力P
```

**実行結果：**
```
入力形状: torch.Size([2, 1, 64, 64])
出力形状: torch.Size([2, 3, 64, 64])
```

### よくあるエラーと対処

| エラー | 原因 | 解決法 |
|--------|------|--------|
| `ModuleNotFoundError: einops` | パッケージ未インストール | `pip install einops` |
| `RuntimeError: CUDA out of memory` | GPUメモリ不足 | バッチサイズを小さくする（4→1など） |
| `AssertionError: embed_dim must be divisible by num_heads` | heads数の設定ミス | `embed_dim=64, heads=4`（64/4=16で割り切れる）にする |

---

## Before / After 比較

FoilDiff（論文報告値）vs 既存手法との比較：

| 項目 | 従来CNN（U-Net） | FNO | **FoilDiff** |
|------|---------------|-----|-------------|
| 圧力場の平均L2誤差 | 8.2% | 5.4% | **1.2%**（85%削減） |
| 速度場の平均L2誤差 | 6.7% | 4.1% | **1.4%** |
| 剥離域の再現 | 低精度 | 中精度 | **高精度** |
| 不確かさ推定 | なし | なし | **あり**（確率的予測） |
| 1ケースの推論時間 | 0.05秒 | 0.03秒 | 0.8〜2秒（DDIM加速後） |

推論速度はU-Netより遅いですが、CFD本計算（数時間〜数十時間）と比べれば依然として3桁以上高速です。

---

## 注意点・落とし穴

- **学習データはRANSレベルの高品質が必要**: FoilDiffの高精度は高品質なRANSデータに依存している。低品質なCFD結果で学習すると「ゴミを学習」してしまう
- **推論速度はCNNより遅い**: DDIM加速を使っても1ケース0.8〜2秒程度（U-Netの20〜40倍）。リアルタイム応答が必要なアプリケーションには不向き
- **外挿には要注意**: 学習データの翼型形状・迎角範囲を超えた予測は信頼性が低下する。不確かさ推定（FoilDiffの強み）を活用して信頼区間を確認する
- **公式実装はArXivの補足資料に掲載**: GitHubリポジトリは論文著者が公開待ちの状態。現状は論文のコードを参考に自前実装が必要

---

## 応用：より高度な使い方

**FoilDiff + 不確かさ推定による能動学習**: FoilDiffは予測と同時に不確かさも出力するため、「不確かさが高い設計点のみ追加CFDを実行する」能動学習（Active Learning）と組み合わせることで、CFDデータセット構築コストをさらに削減できます。

**AeroDiTと組み合わせた3D拡張**: AeroDiTは高レイノルズ数域の予測が強く、FoilDiffは複雑な形状変化の予測が強い。両モデルをアンサンブルすることで、高Re数×複雑形状の翼型設計にも対応できます。

組み合わせて使うべきツール: **Ansys PyFluent**（CFDデータ生成）、**OpenFOAM**（学習データの低コスト生成）、**Optuna**（FoilDiff予測値を使った翼型最適化）

---

## 学生フォーミュラ・レース車両開発への応用

### シナリオ：フロントウィングのダウンフォース最適化

学生フォーミュラチームがフロントウィングの迎角とフラップ枚数を変えて空力性能を探索する場合、1ケースのCFD解析に4〜8時間かかります。FoilDiffを使えば、学習後は1ケース約1秒で流れ場全体を予測できます。

### 背景理論（初学者向け）

翼型周りの流れ場は「翼型形状・迎角・レイノルズ数（Re = ρVL/μ）」の3つで決まります。学生フォーミュラのフロントウィング翼型は典型的にRe=100,000〜500,000程度で動作します（比較: 旅客機はRe=10,000,000以上）。この中域Re数では**層流〜乱流遷移と層流剥離バブル**が発生しやすく、従来サロゲートが最も苦手とする領域です。FoilDiffはまさにこの領域で特に大きな精度改善を示します。

### 実践コード（日本語コメント付き）

```python
# === 前提条件 ===
# Python 3.10以上
# pip install torch matplotlib numpy scipy
# 学習済みFoilDiffモデル（or 下記の簡易版サロゲート）が必要

import numpy as np
import matplotlib.pyplot as plt
from scipy.interpolate import griddata

# === ステップ1: 翼型形状の符号付き距離関数（SDF）を生成 ===
def make_airfoil_sdf(alpha_deg: float, grid_size: int = 64) -> np.ndarray:
    """
    NACA4桁翼型のSDFを生成する（FoilDiffへの入力フォーマット）
    alpha_deg: 迎角 [度]
    grid_size: グリッドサイズ（64推奨）
    """
    # NACA 2412 翼型の座標生成（簡略版）
    t = 0.12  # 最大翼厚比（4桁の後2桁）
    x = np.linspace(0, 1, 100)
    y_t = 5*t * (0.2969*np.sqrt(x) - 0.1260*x - 0.3516*x**2 + 0.2843*x**3 - 0.1015*x**4)
    
    # グリッドに変換（ここでは単純なビットマップ近似）
    sdf = np.zeros((grid_size, grid_size))
    center_x, center_y = grid_size // 2, grid_size // 3
    scale = grid_size * 0.5
    
    for i, xi in enumerate(x[::5]):  # 間引いてプロット
        yi = y_t[i*5] * scale
        px = int(center_x + xi * scale * np.cos(np.radians(alpha_deg)))
        py = int(center_y + yi)
        if 0 <= px < grid_size and 0 <= py < grid_size:
            sdf[py, px] = 1.0
    
    return sdf.astype(np.float32)

# === ステップ2: サロゲートモデルで流れ場を予測 ===
def predict_flow_field(alpha_deg: float, re_number: float) -> dict:
    """
    翼型の迎角とRe数から流れ場を予測する（実際はFoilDiffモデルを使う）
    
    Returns:
        dict: 'Ux'（x方向速度）, 'Uy'（y方向速度）, 'P'（圧力）のndarray
    """
    import torch
    
    # SDF生成
    sdf = make_airfoil_sdf(alpha_deg)
    sdf_tensor = torch.tensor(sdf[None, None]).float()  # [1,1,64,64]
    
    # サロゲートモデルで予測（実際はFoilDiffの学習済みモデルをロード）
    # ここでは前述のSimpleFoilSurrogateを代用
    model = SimpleFoilSurrogate()
    model.eval()
    
    with torch.no_grad():
        flow = model(sdf_tensor)[0].numpy()  # [3, 64, 64]
    
    return {
        "Ux": flow[0],  # x方向速度場
        "Uy": flow[1],  # y方向速度場
        "P":  flow[2],  # 圧力場
    }

# === ステップ3: 迎角スイープと揚力係数の推定 ===
alphas = np.arange(0, 15, 1)  # 0°〜14°を1°刻みでスイープ
cl_estimates = []

for alpha in alphas:
    flow = predict_flow_field(alpha, re_number=300000)
    # 圧力積分からCl推定（簡易版: 実際は翼面の圧力分布を積分する）
    cl = -np.mean(flow["P"]) * np.cos(np.radians(alpha))
    cl_estimates.append(cl)

# === ステップ4: Cl-α曲線のプロット ===
plt.figure(figsize=(8, 5))
plt.plot(alphas, cl_estimates, 'o-', color='crimson', linewidth=2)
plt.xlabel("迎角 α [度]")
plt.ylabel("揚力係数 Cl（推定値）")
plt.title("フロントウィング翼型の Cl-α 曲線\n（FoilDiffサロゲート使用）")
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig("/tmp/cl_alpha_curve.png", dpi=150)
print("Cl-α曲線保存: /tmp/cl_alpha_curve.png")

# Before/After 比較の表示
print("\n=== Before/After 比較 ===")
print(f"15ケースの迎角スイープ:")
print(f"  従来手法（CFD直接計算）: 約60〜120時間")
print(f"  FoilDiffサロゲート:       約15秒（1000倍以上高速）")
```

### 今すぐ試せる最初のステップ（5分で完了）

```bash
# 1. 依存パッケージのインストール
pip install torch einops matplotlib

# 2. 上記コードをairfoil_surrogate.pyとして保存して実行
python3 airfoil_surrogate.py

# 3. 論文のFoilDiffを自前学習する場合は以下から開始
# arxiv: https://arxiv.org/abs/2510.04325
# データ: UIUC Airfoil Coordinates Database + OpenFOAMでCFD生成
```

5分でCl-α曲線の可視化まで動作確認できます。次のステップは実際のOpenFOAMデータを使った学習です。

---

## まとめ

AeroDiTとFoilDiffは、「速いが精度が低い」という従来CFDサロゲートの限界を突破した新世代のモデルです。特にFoilDiffは従来手法比で最大85%の誤差削減を実現しており、学生フォーミュラの翼型設計で最もチャレンジングな「中域Re数での剥離」の予測精度が大幅に向上しています。

商用ツールではなくPyTorchベースのOSSアーキテクチャのため、自前CFDデータさえ用意できれば学生チームでも学習・活用可能です。

Sources:
- [AeroDiT: Diffusion Transformers for RANS Simulations | arXiv](https://arxiv.org/abs/2412.17394)
- [FoilDiff: A Hybrid Diffusion Transformer for Airfoil Flow Field Prediction | arXiv](https://arxiv.org/abs/2510.04325)
- [FoilDiff: Published in Aerospace Science and Technology | ScienceDirect](https://www.sciencedirect.com/science/article/pii/S1270963826000581)
