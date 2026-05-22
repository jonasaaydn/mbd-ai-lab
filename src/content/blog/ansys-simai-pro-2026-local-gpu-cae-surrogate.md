---
title: "クラウド不要・ML知識不要——Ansys SimAI Pro 2026でローカルGPUからCAEサロゲートモデルを作る実践手順"
date: 2026-05-22
category: "CAE / Simulation AI"
tags: ["Ansys SimAI", "Surrogate Model", "CFD", "FEA", "Local GPU", "PySimAI"]
tool: "Ansys SimAI Pro"
official_url: "https://www.ansys.com/products/ai/simai"
importance: "high"
summary: "Ansys 2026 R1で登場したSimAI Proは、クラウド不要・ML専門知識不要でワークステーションGPU上にCAEサロゲートモデルを構築できる新製品だ。既存のFluent/STAR-CCM+結果を入力に、未知形状の表面圧力・せん断応力をリアルタイム予測。PySimAI APIで自動化パイプラインも組める。本記事では導入からPython連携まで一気通貫で解説する。"
---

## はじめに

「シミュレーションエンジニアとして、空力設計の初期フェーズで数十のジオメトリ変更候補をスクリーニングしたい。しかし一形状あたりCFDを回すと数時間かかる。サロゲートモデルを使えば速くなるのは知っているが、MLの知識がなく、クラウドにデータを上げることもセキュリティ上難しい」——このジレンマを抱えているエンジニアに、Ansys SimAI Proは今すぐ使える答えを持ってきた。

Ansys 2026 R1（2026年3月リリース）で登場したSimAI Proは、**ローカルワークステーションのGPU上で動くデスクトップ型AIサロゲートモデルビルダー**だ。既存の計算結果を食わせれば、ML専門知識ゼロで「設計変数→物理場予測」モデルを自力で構築できる。設計スクリーニングの所要時間を1/10以下に圧縮した事例が複数報告されている。

---

## Ansys SimAI Pro 2026とは

### 製品の立ち位置

Ansys 2026 R1でSimAIポートフォリオは2層に再編された：

- **SimAI Premium SaaS**（旧SimAI）：クラウド対応、15TB超のデータセット処理、3次元フィールド予測対応。大規模開発チーム向け。
- **SimAI Pro**（新製品）：**ローカルGPUで動作**、表面フィールド予測特化、ML専門知識不要。個人エンジニア・中小チーム向け。

SimAI Proの開発思想は「既存のシミュレーションエンジニアがMLエンジニアになることなくAIサロゲートを使える」こと。対応ソルバーはFluent、STAR-CCM+、OpenFOAM、ABAQUSなど主要なCAEツール全般。

### 誰が作ったか

Ansysは長年CAEソフトウェアのリーダー企業。2023年にSynopsysに買収された後も製品ラインは継続開発中。SimAIの原型は2021年頃から研究・開発され、2024年頃から実用製品として提供開始。2026 R1でのProエディション分割は、大企業以外のエンジニアへの門戸を広げる戦略的な一手だ。

---

## 実際の動作：ステップバイステップ

### Step 1：前提環境の確認

```
必要スペック（SimAI Pro 2026 R1）:
- OS: Windows 10/11 または Linux (Ubuntu 20.04以上)
- GPU: NVIDIA RTX 3070以上推奨（8GB VRAM以上）
- RAM: 32GB以上推奨
- Python: 3.10〜3.12
- 既存CFD結果（Fluent .cas/.dat、STAR-CCM+ .sim など）
```

GPUなしでも動作するが、学習時間が大幅に延びる（GPU有：20〜60分 → GPU無：数時間）。

### Step 2：SimAI Proのインストール

Ansys Customer PortalからSimAI Pro 2026 R1インストーラーをダウンロードし実行する。インストール完了後、Ansys Licenseサーバーへの接続を設定するだけでGUIが起動する。

### Step 3：学習データの準備

SimAI ProはFluent結果ファイル（.cas + .dat）を直接読み込める。最低でも**20〜50ケース**のCFD結果を用意する。各ケースは異なる設計変数（例：前翼角度、冷却ダクト開口面積）で計算したものであること。

```
推奨データ構成例：
dataset/
  case_001/  → aero_alpha3.cas + aero_alpha3.dat  （迎角3°）
  case_002/  → aero_alpha5.cas + aero_alpha5.dat  （迎角5°）
  ...
  case_040/  → aero_alpha25.cas + aero_alpha25.dat（迎角25°）
```

### Step 4：GUIでモデル構築

SimAI ProのGUI上で：
1. **データセットフォルダ**を指定
2. **予測対象の物理量**を選択（例：表面圧力係数Cp、壁面せん断応力τ）
3. **入力変数**を定義（例：迎角α、レイノルズ数Re）
4. 「Train Model」ボタンをクリック

学習中はGPU使用率・Loss曲線がリアルタイム表示される。完了すると未知形状への予測が即座に可能になる。

---

## Before / After 比較

| 指標 | 従来のCFDフルランのみ | SimAI Proサロゲート併用 |
|---|---|---|
| 1ケースの計算時間 | 2〜8時間（CPU 32コア） | **約0.2秒**（予測フェーズ） |
| 50バリアントのスクリーニング | 100〜400時間 | 学習20〜60分 + 予測10秒 |
| 必要ML知識 | — | **ゼロ**（GUI操作のみ） |
| クラウド接続 | 不要 | **不要**（完全ローカル） |
| データセキュリティ | 社内完結 | **社内完結** |
| 予測精度（表面Cp） | — | 誤差±5%以内（50ケース学習時目安） |
| ライセンス | Fluent/STAR-CCM+ | SimAI Pro追加（Ansys製品ライセンスに追加） |

---

## 実践コード例

SimAI ProはPython API（PySimAI）でも操作できる。以下は「未知のフロントウィング形状に対して表面圧力を予測する」例だ：

```python
import ansys.simai.core as simai
import numpy as np

# SimAI Proローカルサーバーに接続
client = simai.from_config(
    url="http://localhost:8000",  # SimAI Pro ローカルエンドポイント
    organization="my_org"
)

# 既存の学習済みモデルを取得
workspace = client.workspaces.get(name="front_wing_aero_2026")
model = workspace.current_model

# 新しいジオメトリファイルをアップロード
geometry = workspace.geometries.upload(
    file="new_wing_variant_07.stl",
    name="variant_07"
)

# 境界条件を指定して予測を実行
prediction = geometry.run_prediction(
    boundary_conditions={
        "velocity_inlet": 50.0,   # m/s (レース速度 180km/h相当)
        "aoa": 12.5,              # 迎角 [deg]
    }
)

# 表面圧力係数を取得
surface_data = prediction.surface_evol.get()
cp_values = surface_data["pressure_coefficient"]

print(f"最小Cp: {np.min(cp_values):.4f}")
print(f"最大Cp: {np.max(cp_values):.4f}")
print(f"推定ダウンフォース係数: {-np.mean(cp_values):.4f}")

# 全50バリアントをバッチ予測（並列実行）
variants = workspace.geometries.list()
selection = simai.selections.select(variants[:50], [{"aoa": a} for a in range(0, 25)])
predictions = selection.run_predictions()
print(f"{len(predictions)}ケースの予測完了")
```

PySimAIはpip経由でインストールできる（`pip install ansys-simai-core`）。

---

## 注意点・落とし穴

**SimAI Proの予測は「表面フィールド」のみ**：2026 R1時点では表面の物理量（圧力、せん断応力）の予測に特化しており、体積フィールド（内部流れの3D分布）には非対応。体積フィールドが必要な場合はSimAI Premium SaaSへのアップグレードが必要。

**学習データの多様性が精度を決める**：20ケース以下の学習では精度が不安定になりやすい。設計変数の範囲を均等にサンプリング（ラテン超方格法など）することを推奨。補間範囲を超えた外挿予測は精度が著しく低下する。

**ライセンスの確認**：SimAI ProはAnsys製品ポートフォリオへの追加ライセンスとして提供される。既存のFluentライセンスと別途契約が必要な場合があるため、販売代理店へ確認を。

---

## 応用：より高度な使い方

### optiSLangとの連携で設計最適化ループを自動化

SimAI ProとAnsys optiSLangを組み合わせると、「サロゲートモデル予測→最適化アルゴリズム→次の実験点選択→CFD実行→追加学習」という能動学習ループを自動化できる。設計変数空間の探索効率が大幅に向上し、最終的なCFD実行回数を70%以上削減した事例もある。

### モデル限界を超えたらPremiumに移行

SimAI Proで構築したデータセットはSimAI Premium SaaSにそのまま持ち込める。プロジェクトが拡大して3Dフィールド予測や15TB超のデータセットが必要になった場合も、データの再処理なしに移行できる設計になっている。

---

## 今すぐ試せる最初の一歩

```bash
# PySimAIをインストール（SimAI Proローカルサーバー対応版）
pip install ansys-simai-core

# 接続確認
python -c "import ansys.simai.core as simai; print(simai.__version__)"

# → SimAI Pro GUIを起動してローカルサーバーをONにしてから
#   上記の実践コード例を実行してみよう
```

まず手元の既存CFD結果（20ケース以上）をフォルダにまとめることから始めよう。データさえあれば、最初のサロゲートモデルは今日中に完成する。
