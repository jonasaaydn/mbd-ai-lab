---
title: "81件のFEAデータでギア歯面応力をリアルタイム予測——Simcenter HEEDS 2604のGPU加速ニューラルネットが変える駆動系設計最適化"
date: 2026-05-28
category: "CAE / Simulation AI"
tags: ["Simcenter", "HEEDS", "Surrogate Model", "Gear", "FEA", "Neural Network", "Powertrain", "ONNX", "GPU"]
tool: "Simcenter HEEDS"
official_url: "https://plm.sw.siemens.com/en-US/simcenter/integration-solutions/heeds/"
importance: "high"
summary: "1回の非線形FEA（歯車接触解析）に数時間かかっていたギア歯面応力解析が、わずか81件のシミュレーションデータで学習したAIサロゲートモデルで瞬時予測できるようになった。Simcenter HEEDS 2604の新しいGPU加速ニューラルネットビルダーはONNX形式でエクスポートされ最適化ループへのワンクリック統合が可能。数週間かかっていた駆動系設計探索が1日以内に完結する実証事例が出た。"
---

## はじめに

「ギアの歯面応力解析、1 ケースで 4 時間かかるんですよ。50 通りの設計変数探索なら 1 週間……」

パワートレイン設計者なら誰もが経験する壁だ。非線形有限要素解析（NLFEA）による歯車接触解析は精度が高い一方、計算コストが膨大。設計パラメータ（歯数・モジュール・転位係数・歯幅など）を組み合わせた多目的最適化を正攻法でやると、1 プロジェクトで数ヶ月の計算時間が必要になる。

Siemens が 2026 年に公開した手法と Simcenter HEEDS 2604 の新機能はこの問題を根本から解決する。**わずか 81 件の NLFEA データ**から学習した Transformer ベースの AI サロゲートが、新しいギア形状の歯面応力分布を「数時間」から「ミリ秒単位」で予測できるようになった。知らないまま次期 EV 駆動ユニットの設計フェーズに入ると、競合他社に数ヶ月単位で遅れをとる。

---

## Simcenter HEEDS 2604 とは

**Simcenter HEEDS**（Siemens Digital Industries Software）は、多目的設計最適化・設計探索・不確かさ定量化（UQ）のプラットフォームだ。Simcenter 3D、Nastran、STAR-CCM+、Fluent などの主要 CAE ソルバーと自動接続し、DOE（実験計画法）→ サロゲートモデル学習 → 最適化探索のワークフローを GUI または Python API で自動化する。

2026 年 4 月リリースの **HEEDS 2604** での最大の変更点は「Neural Network Builder の全面刷新」だ：

- **GPU 加速学習**：従来 CPU のみだったニューラルネットの学習が GPU に対応し、学習時間が大幅短縮
- **ONNX 形式エクスポート**：訓練済みモデルを標準 ONNX 形式で出力し、最適化ループへワンクリックで組み込める
- **Early Stopping 自動化**：過学習を自動検知してトレーニングを停止し、汎化性能を確保
- **Simcenter HEEDS Connect 2604**：STAR-CCM+・Fluent・Nastran などとの接続コネクタも同時更新

---

## 実際の動作：ステップバイステップ

### 対象ケース：遊星歯車の歯面接触応力最適化

EV 駆動ユニットのリダクションギアを想定。設計変数は 4 つ：

| 変数 | 探索範囲 |
|------|---------|
| 歯数 z | 20〜40 |
| モジュール m（mm） | 1.5〜3.0 |
| ねじれ角 β（°） | 10〜25 |
| 歯幅 b（mm） | 20〜50 |

### Step 1：Simcenter HEEDS で DOE を設定してデータ生成

```python
# Simcenter HEEDS Python API での DOE 設定例
import heeds

study = heeds.Study("gear_stress_doe")

# 設計変数を登録
study.add_variable("tooth_count", lower=20, upper=40, type="integer")
study.add_variable("module", lower=1.5, upper=3.0)
study.add_variable("helix_angle", lower=10, upper=25)
study.add_variable("face_width", lower=20, upper=50)

# Simcenter Nastran コネクタを登録（NLFEA ソルバー）
nastran = heeds.connectors.SimcenterNastran(
    template="gear_contact_template.bdf",
    outputs=["max_contact_stress", "bending_stress", "transmission_error"]
)
study.add_connector(nastran)

# Level-3 全因子 DOE = 4^3 = 81 ケース
doe = heeds.doe.FullFactorial(levels=3)
study.set_doe(doe)
study.run(parallel_jobs=8)   # HPC で並列実行
```

81 件の NLFEA 実行で取得するデータ：各設計に対するメッシュ節点単位の**歯面接触応力分布フルフィールド**。

### Step 2：Neural Network Builder で AI サロゲートを構築

HEEDS 2604 の GUI または Python で Neural Network Builder を起動：

```python
# Neural Network Builder（HEEDS 2604 新機能）
nn_builder = heeds.NeuralNetworkBuilder(study)

# モデルタイプ：Transformer ベースのオペレータ学習モデル
nn_builder.set_architecture("transformer_operator")
nn_builder.set_inputs(["tooth_count", "module", "helix_angle", "face_width",
                        "surface_geometry", "contact_forces"])
nn_builder.set_outputs(["contact_stress_field"])   # フルフィールド出力

# 学習設定
nn_builder.enable_gpu_training(device="cuda:0")
nn_builder.enable_early_stopping(patience=50)

# データ分割：64 訓練 / 17 テスト（Siemens 実証と同構成）
nn_builder.train(train_ratio=0.79)
nn_builder.evaluate()   # テストセットで誤差確認

# ONNX エクスポート（最適化ループ組み込み用）
nn_builder.export_onnx("gear_stress_surrogate.onnx")
```

### Step 3：サロゲートで多目的最適化を実行

ONNX に変換されたサロゲートを HEEDS の最適化エンジンに接続：

```python
# サロゲートベース最適化
opt_study = heeds.OptimizationStudy("gear_opt_surrogate")

# NLFEA の代わりにサロゲートを使用（計算速度：数時間 → ミリ秒）
surrogate_connector = heeds.connectors.OnnxSurrogate("gear_stress_surrogate.onnx")
opt_study.add_connector(surrogate_connector)

# 多目的最適化：接触応力最小化 & 伝達誤差最小化 & 歯幅最小化
opt_study.add_objective("minimize", "max_contact_stress")
opt_study.add_objective("minimize", "transmission_error")
opt_study.add_objective("minimize", "face_width")

# SHERPA アルゴリズムで 5000 点探索（NLFEA なら 2 年以上かかる量）
opt_study.set_algorithm("SHERPA", evaluations=5000)
opt_study.run()

# パレートフロントの可視化
opt_study.plot_pareto_front()
```

---

## Before / After 比較

| 指標 | 従来手法（NLFEA フル実行） | AI サロゲート活用後 |
|------|--------------------------|------------------|
| 1ケースの解析時間 | 2〜4時間（NLFEA接触解析） | ＜10ミリ秒（サロゲート推論） |
| 設計探索数（1週間） | 約40〜50点 | 5000点以上 |
| DOEデータ必要数 | 全点フル実行 | 81点で学習後は不要 |
| パレートフロント生成 | 数週間〜1ヶ月 | 数分〜1時間 |
| エンジニア介在 | 毎回ソルバー設定が必要 | 初回DOEのみ |
| 精度 | 高精度（物理ベース） | NLFEA との誤差2〜5%以内（Siemens 実証値） |

---

## 注意点・落とし穴

**学習ドメイン外の設計には使えない**
サロゲートが信頼できる範囲は訓練した設計変数の範囲内だけだ。DOE の範囲を外れた新しい設計（例：極端に大きい転位係数）では予測精度が急落する。設計探索範囲を事前に慎重に定義し、外挿域での使用は避けること。

**フルフィールド出力はメモリを大量消費する**
節点単位の応力フィールド（数万〜数十万節点）を出力するサロゲートは、ロード時に GPU メモリを多く使う。ONNX エクスポート後の推論に必要な GPU VRAM は最低 8GB 以上を想定すること。

**ライセンス構成に注意**
Simcenter HEEDS は Simcenter Nastran・Simcenter 3D とは別ライセンスが必要。HEEDS 2604 の Neural Network Builder は HEEDS POST モジュールに含まれるが、単体 HEEDS ライセンスとは別オプションになる場合がある。MathWorks の GT-SUITE 等と比較した場合は総コストで判断すること。

---

## 応用：AI サロゲートをマルチフィジクス最適化に拡張する

今回の歯面応力サロゲートを出発点に、以下の複合最適化が可能になる：

**NVH + 接触応力の同時最適化**
Simcenter 3D Motion と Nastran の解析結果をそれぞれサロゲート化し、HEEDS で多目的最適化。齒形最適化と噪音低減を同時に達成した事例が Siemens から報告されている。

**Digital Twin との統合**
ONNX エクスポートにより、学習済みサロゲートを Simcenter Digital Twin フレームワークや Python/C++ アプリケーションに埋め込み可能。実車テレメトリとリアルタイムで突き合わせる「オンライン摩耗予測」への発展も見えてきた。

Hyundai Motor Group の事例では、Simcenter HEEDS によるサロゲート活用で**サブシステムのパラメータ最適化時間を 1 週間から 15 分に短縮**した実績がある。

---

## 今すぐ試せる最初の一歩

```python
# pip install simcenter-heeds-python（要 Siemens ライセンス）
import heeds

# 既存 DOE 結果（CSV）からサロゲートを5分で構築するお試し手順
study = heeds.Study.load_from_csv("existing_doe_results.csv")
nn = heeds.NeuralNetworkBuilder(study)
nn.enable_gpu_training()
nn.train()
nn.export_onnx("quick_surrogate.onnx")
print(f"サロゲート精度（テストセット）: R² = {nn.evaluate()['r2']:.4f}")
```

Simcenter HEEDS のトライアルライセンスは Siemens の公式ページから申請できる（14 日間無料）。まず手持ちの DOE 結果データをインポートし、Neural Network Builder で学習してみることを勧める。精度指標（R²・RMSE）を確認してから本格導入の判断ができる。
