---
title: "SHIFT-SUV：Honda×NVIDIA共同開発の自動車空力物理AI基盤モデルを無料で試す方法"
date: 2026-06-03
category: "CAE / Simulation AI"
tags: ["Luminary Cloud", "SHIFT-SUV", "物理AI基盤モデル", "空力解析", "DoMINO", "CFD", "オープンソース", "NVIDIA PhysicsNeMo"]
tool: "Luminary Cloud SHIFT-SUV"
official_url: "https://huggingface.co/datasets/luminary-shift/SUV"
importance: "high"
summary: "Luminary CloudがHondaとNVIDIAと共同開発した「SHIFT-SUV」は、SUV空力解析向けの世界初オープンソース物理AI基盤モデル。高精度DDES CFDシミュレーション1,000件超で事前学習済み。DoMINOアーキテクチャを使いSTLジオメトリから抗力・揚力係数・圧力場をミリ秒推論する。HuggingFace（CC-BY-NC-4.0）で無料公開中。25,000件へのデータ拡張も進行中。"
---

## はじめに

自動車の空力設計では、「形状を少し変えたらCdがどう変わるか」を確認するたびにフルCFD（計算流体力学）を回す必要があり、DDES相当の高精度シミュレーション1ケースに数時間〜丸一日かかるのが現実だ。1000バリアントを評価しようとすれば、スパコンを使っても数週間以上かかる計算になる。この「形状変更のたびに重いCFDを回す」ループを知らないままでいると、競合他社がAI推論で同じ評価を数ミリ秒で終わらせている中、設計初期フェーズの形状探索だけで貴重な開発期間を浪費し続けることになる。

---

## SHIFT-SUV とは

**SHIFT-SUV**は、クラウドCFDプラットフォーム「Luminary Cloud」が2025年4月にHondaとNVIDIAと共同で発表した、自動車外部空力解析向けの世界初オープンソース物理AI基盤モデルだ。

- **開発元**: Luminary Cloud（米国スタートアップ、元CFD研究者チームが設立）
- **共同開発**: Honda（設計バリアション指導）・NVIDIA（PhysicsNeMo/GPU提供）
- **ベースジオメトリ**: AeroSUV（FKFS〈シュトゥットガルト自動車工学研究所〉開発のオープンSUVモデル）
- **公開形式**: データセット＋学習済みモデルをCC-BY-NC-4.0でHuggingFaceに全公開

既存のAnsys SimAIやPhysicsXと異なる最大の特徴は「完全オープンソース」であることだ。企業が独自のCFDデータで再学習（ファインチューニング）して社内専用モデルを育てることができる。まずSHIFT-SUVで素早くプロトタイプを検証し、精度が不足なら自社データを追加して精度向上する、という段階的な活用が可能になっている。

---

## 実際の動作：ゼロから推論まで

### データセットの構造

SHIFT-SUVデータセットはHuggingFaceに公開されており、1ケースあたり以下のデータが含まれる：

- **入力**: AeroSUVパラメトリックジオメトリ（STL形式）
- **出力**: 
  - 係数: Cd（抵抗係数）・Cl（揚力係数）・Cs（横力係数）
  - フルフィールド: 車体表面の圧力場・せん断応力場（節点ごとの数値）
- **シミュレーション手法**: DDES（Detached Eddy Simulation）＋高精度CFDソルバー
- **流動条件**: 複数の速度・後流条件を包含

リリース時点でサンプル99件、フルデータセット約1,000件。2025年末までに25,000件まで拡張予定（Hondaが設計バリエーション仕様を提供）。

### ステップ1：データセットのダウンロード

```bash
# === 前提条件: git-lfs のインストール ===
# Ubuntu/Debian の場合
sudo apt install git-lfs
git lfs install

# === サンプルデータセット（99件、まず試すならこれ）===
git clone https://huggingface.co/datasets/luminary-shift/SUV-sample
ls SUV-sample/
# geometry/  → STLファイル群
# results/   → Cdなどスカラー値のCSV
# fields/    → 圧力場・せん断応力場（VTKまたはHDF5形式）

# === フルデータセット（1,000+件）===
# 構造だけ先にクローン（大きいLFSファイルはスキップ）
GIT_LFS_SKIP_SMUDGE=1 git clone https://huggingface.co/datasets/luminary-shift/SUV
cd SUV
# 必要なファイルだけ選択ダウンロード
git lfs pull --include="geometry/variant_001.stl,results/coefficients.csv"
```

### ステップ2：PhysicsNeMoのインストール

```bash
# === NVIDIA PhysicsNeMo のインストール（CUDA 12.x環境推奨）===
pip install nvidia-physicsnemo

# PhysicsNeMo DoMINO モジュールの確認
python -c "from physicsnemo.models.domino import DoMINO; print('DoMINO OK')"
```

### ステップ3：学習済みモデルで推論

```python
# === SHIFT-SUVモデルで空力係数を予測するサンプルコード ===
import torch
import numpy as np

# === ステップ1: DoMINOモデルをロードする ===
# HuggingFaceから学習済みウェイトを自動ダウンロード
from physicsnemo.models.domino import DoMINO
model = DoMINO.from_pretrained("luminary-shift/shift-suv-v1")
model.eval()

# === ステップ2: STLジオメトリを読み込んでサーフェスメッシュを構築する ===
# trimesh でSTLを点群化し、DoMINOの入力形式（节点座標＋法線）に変換
import trimesh
mesh  = trimesh.load("my_suv_geometry.stl")
verts = torch.tensor(mesh.vertices, dtype=torch.float32).unsqueeze(0)  # [1, N, 3]
norms = torch.tensor(mesh.vertex_normals, dtype=torch.float32).unsqueeze(0)

# === ステップ3: 推論実行（GPU不要、CPU動作も可） ===
with torch.no_grad():
    preds = model({"vertices": verts, "normals": norms})

# === ステップ4: 結果を表示する ===
print(f"Cd（抵抗係数）: {preds['Cd'].item():.4f}")
print(f"Cl（揚力係数）: {preds['Cl'].item():.4f}")

# 表面圧力場（節点単位の分布）も取得可能
pressure_field = preds['surface_pressure']  # shape: [1, N]
print(f"表面圧力場: {pressure_field.shape} → N節点分の圧力分布")
```

**実行結果の例（出力）**:
```
Cd（抵抗係数）: 0.3124
Cl（揚力係数）: -0.0871
表面圧力場: torch.Size([1, 52840]) → 52840節点分の圧力分布
```

---

## Before / After 比較

| 項目 | 従来のCFD（DDES） | SHIFT-SUV推論 |
|------|-------------------|---------------|
| 形状1バリアントの評価時間 | 4〜24時間 | **〜1秒** |
| 1,000バリアントの評価 | 数週間＋スパコン費用 | **〜17分（GPU1枚）** |
| 必要な専門知識 | メッシュ生成・乱流モデル設定・HPC | Pythonとtrimeshの基本操作 |
| 係数精度（Cd） | 高精度（実験比±2%以内） | 学習データ範囲内で±5%程度 |
| フルフィールド圧力分布 | ✅ 取得可能 | ✅ 取得可能（節点単位） |
| ライセンス・費用 | 有償ソルバー＋HPC費用 | **CC-BY-NC-4.0で無料** |
| 形状の外挿精度 | ✅ 任意形状 | ⚠️ 学習データ範囲内で高精度（範囲外は要注意） |

---

## 実践コード例：100バリアントのパラメータスタディを1時間で完走

```python
# === 100形状バリアントを一括評価するパラメータスタディ ===
import torch
import trimesh
import pandas as pd
from pathlib import Path
from physicsnemo.models.domino import DoMINO

# === モデルをロードしてGPUに乗せる ===
device = "cuda" if torch.cuda.is_available() else "cpu"
model  = DoMINO.from_pretrained("luminary-shift/shift-suv-v1").to(device)
model.eval()

results = []
stl_files = sorted(Path("geometry/").glob("variant_*.stl"))

for stl_path in stl_files:
    # STLを読み込んで入力テンソルを構築
    mesh  = trimesh.load(str(stl_path))
    verts = torch.tensor(mesh.vertices,       dtype=torch.float32).unsqueeze(0).to(device)
    norms = torch.tensor(mesh.vertex_normals, dtype=torch.float32).unsqueeze(0).to(device)

    with torch.no_grad():
        preds = model({"vertices": verts, "normals": norms})

    results.append({
        "variant": stl_path.stem,
        "Cd":      preds["Cd"].item(),
        "Cl":      preds["Cl"].item(),
    })
    print(f"{stl_path.stem}: Cd={preds['Cd'].item():.4f}, Cl={preds['Cl'].item():.4f}")

# 結果をCSVに保存してExcelで確認
df = pd.DataFrame(results)
df.to_csv("aero_study_results.csv", index=False)
print(f"\n最小Cd: {df['Cd'].min():.4f} ({df.loc[df['Cd'].idxmin(), 'variant']})")
print(f"完了: {len(results)}バリアントを評価")
```

---

## 注意点・落とし穴

**1. 学習データ範囲外の形状には注意**  
SHIFT-SUVはAeroSUVパラメトリックモデルの派生形状で学習されている。スポーツカーやトラックなど形状が大幅に異なる車種に対しては精度が大きく低下する可能性がある。社内の実際の車種形状で活用する場合は、自社CFDデータによるファインチューニングが推奨される。

**2. 流動条件の固定**  
公開モデルはDDES・標準大気圧・特定の速度範囲で学習されている。風洞条件変更（ローリングロード、バイパスなど）での使用には再学習が必要。

**3. CC-BY-NC-4.0 ライセンス**  
非商用利用（研究・プロトタイプ）には無料で使えるが、商業製品への組込みには別途Luminary Cloud社との契約が必要。

---

## 応用：より高度な使い方

**nTop + Luminary Cloud + PhysicsNeMo の三位一体パイプライン**  
nTopのパラメトリックジオメトリ生成でSUVバリアントを自動生成→LuminaryのGPU CFDで高精度データを追加生成→SHIFT-SUVをファインチューニングするパイプラインを組めば、社内専用の超高精度サロゲートモデルが数日で構築できる。LuminaryとnTopはNVIDIA PhysicsNeMoとの正式連携を2025年3月に発表しており、ツール間の連携ワークフローが整備されている。

**レーシングカーへの応用**  
AeroSUVはロードカー向けだが、同じアーキテクチャでF1/GTカーのCFDデータセットを構築してDoMINOで学習すれば、競技車両向けの類似モデルを作れる。Neural ConceptやPhysicsXが提供しているのと同様のワークフローをオープンソースで自前構築できる点は、コスト観点でも大きな優位性だ。

---

## 今すぐ試せる最初の一歩

```bash
# サンプルデータセットのダウンロード（99件、約2GB）
pip install git-lfs trimesh torch nvidia-physicsnemo pandas
git lfs install
git clone https://huggingface.co/datasets/luminary-shift/SUV-sample

# サンプル1件を推論してCdを確認
python -c "
from physicsnemo.models.domino import DoMINO
import trimesh, torch
model = DoMINO.from_pretrained('luminary-shift/shift-suv-v1')
mesh  = trimesh.load('SUV-sample/geometry/variant_001.stl')
verts = torch.tensor(mesh.vertices, dtype=torch.float32).unsqueeze(0)
norms = torch.tensor(mesh.vertex_normals, dtype=torch.float32).unsqueeze(0)
with torch.no_grad():
    preds = model({'vertices': verts, 'normals': norms})
print(f'Cd = {preds[\"Cd\"].item():.4f}')
"
```

---

## まとめ

SHIFT-SUVは「CFDを民主化する」という観点で画期的なリリースだ。従来は大手OEMやレーシングチームしかアクセスできなかった高精度空力解析を、オープンソース・無料・数ミリ秒推論で誰でも試せるようになった。Honda設計チームが提供した実用的な形状バリエーションとNVIDIA PhysicsNeMoの最新DoMINOアーキテクチャの組合せは、他の類似ツールと比べて「実車に近い使い方ができる基盤モデル」として際立っている。まずサンプル99件をダウンロードし、自前のSTLジオメトリでCdを出力するところから始めよう。5分もあれば最初の推論まで到達できる。
