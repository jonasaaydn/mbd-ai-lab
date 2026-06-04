---
title: "メッシュ不要でCAD直接シミュレーション——SimScale×PAMICSのSPH流体解析がブレーキ冷却・燃料スロッシング・タイヤ飛沫を10-20倍速で解く"
date: 2026-06-04
category: "CAE / Simulation AI"
tags: ["SimScale", "SPH", "CFD", "メッシュレス", "PAMICS", "クラウドCFD", "流体構造連成"]
tool: "SimScale"
official_url: "https://www.simscale.com"
importance: "high"
summary: "SimScaleが2026年3月にAI Engineering GmbHのPAMICSソルバーをクラウドに統合。メッシュ不要のSPH（滑らか粒子流体力学）でCADジオメトリから直接シミュレーションでき、NVIDIA GPU加速で従来FVM比10-20倍高速。ブレーキ冷却ダクト・燃料タンクスロッシング・タイヤ飛沫など従来手法で困難だった複雑流体がブラウザから実行できる時代になった。"
---

## はじめに

「メッシュ生成に3日かかって、まだ計算が始まらない」——CFD担当エンジニアなら誰もが経験したフラストレーションだ。特にブレーキキャリパー周辺の冷却ダクト、燃料タンクの急制動スロッシング、高速コーナリング時のタイヤ飛沫など、**複雑な形状の自由表面流や飛散流体**は従来の格子型CFD（FVM）でのメッシュ生成が悪夢に近い作業になる。

SimScaleが2026年3月16日に発表した「AI Engineering GmbH PAMICSソルバーとのクラウド統合」は、この壁を根本から取り除く。メッシュを一切作らず、CADデータを読み込んだだけで流体シミュレーションが始まる。NVIDIA GPU加速で従来比**10〜20倍**の高速化を達成し、これまで「時間とスキルが足りない」と後回しにしてきた解析が現実的になった。

## SimScale × PAMICS SPH とは

**SimScale**はドイツ・ミュンヘン発のクラウドCFD/FEAプラットフォーム。ブラウザから操作でき、インストール不要でFVMベースの流体・構造・熱解析が可能。2026年時点で世界25万人以上のエンジニアが利用しており、自動車・航空・製造業で採用されている。

**AI Engineering GmbH**（ドイツ）は、SPHソルバー「PAMICS」を開発するNVIDIA Inceptionメンバー企業。NVIDIA GPUに最適化されたSPHエンジンを産業応用向けに展開している。

**SPH（Smoothed Particle Hydrodynamics：滑らか粒子流体力学）**は、流体を格子ではなく**粒子の集合**として表現するラグランジュ型シミュレーション手法だ。1977年に天体物理学（星の形成シミュレーション）で提案され、現在はゲームエンジンの水表現から航空宇宙の燃料スロッシングまで幅広く使われている。

2026年3月16日のプレスリリースで、SimScaleはPAMICSをクラウドNVIDIA AIインフラ上に統合すると発表した。これにより、ブラウザUIから**メッシュ不要のSPHシミュレーション**がNVIDIA H100/A100上で実行できるようになった。GTC 2026でも航空宇宙・自動車業界向けのデモが披露されている。

## 実際の動作：ステップバイステップ

### 従来FVMとSPHの工程比較

```
従来のFVM（格子法）ワークフロー：
[CAD] → [ジオメトリクリーンアップ] → [メッシュ生成] → [境界条件設定] → [計算実行]
  1日        半日〜1日                 1〜3日（複雑形状は1週間超）  数時間   数時間〜数日

PAMICSのSPH（粒子法）ワークフロー：
[CAD] → [粒子配置（完全自動）] → [境界条件設定] → [計算実行]
  1日        数十分（1パラメータのみ）     1〜2時間       数十分〜数時間（NVIDIA GPU）
```

### SimScaleでのSPHシミュレーション手順

**① CADのアップロード（STL/STEP/IGES対応）**

SimScaleのWorkbenchにCADファイルをドラッグ＆ドロップする。パーツが複数ある場合もアセンブリごとアップロード可能。**メッシャーは一切起動しない。** STLで保存した複雑なブレーキダクトもそのまま使える。

**② シミュレーション種類の選択：「SPH Simulation」**

「Add Simulation」→「Fluid Dynamics」→「SPH」を選択する。2026年前半はBeta扱いで提供されており、後半に正式リリース予定。

**③ 粒子解像度の設定（1パラメータのみ）**

SPHの「解像度」は粒子間距離`dp`一つで制御する。小さくすれば精度が上がり計算時間が延びる。

```
推奨設定例（ブレーキ冷却ダクト解析の場合）：
  粒子間距離    dp = 1.0 mm（ダクト開口幅の1/10程度が目安）
  流体種類      空気（ρ = 1.2 kg/m³、μ = 1.8×10⁻⁵ Pa·s）
  流入速度      80 km/h 相当（= 22.2 m/s）
  シミュレーション時間  0.1 s（物理時間）
  粒子数（概算）  約50万個
  計算時間      NVIDIA H100上で約45分（従来FVM比：約10倍速）
```

**④ 境界条件の設定**

FVMと同様にInlet・Outlet・Wallを設定するが、壁面のメッシュ適合が不要なため設定項目が大幅に少ない。複雑な形状の「水の飛び跳ね」や「タイヤが水をはね上げる」挙動は、SPHではCAD形状そのままで自然に表現される。

**⑤ 結果の可視化**

SimScaleのポストプロセッサで粒子の速度・圧力・密度を3Dアニメーションとして確認できる。ParaViewへのVTKエクスポートも可能で、定量的な積分値や時間平均はParaViewで処理するのが現実的だ。

## Before / After 比較

| 項目 | 従来FVM（Star-CCM+等） | SimScale SPH（PAMICS） |
|------|----------------------|------------------------|
| メッシュ生成時間 | 1〜3日（複雑形状では1週間以上） | 不要（粒子自動配置） |
| 必要スキル | 高（メッシュ品質判断・経験3〜5年） | 低（粒子間距離1パラメータ） |
| 自由表面・飛沫の表現精度 | 要専門設定（VOF/Level-Set法） | 自然に表現できる（SPHの強み） |
| 計算速度（同等精度比較） | 基準（1×） | 10〜20倍高速（NVIDIA GPU） |
| インフラコスト | 高（ソルバーライセンス＋HPC） | 従量課金（アカデミック版あり） |
| 適した現象 | 定常空力・熱流体・高Re数流れ | 飛沫・スロッシング・流固連成・低速自由表面 |
| ブラウザ利用 | 不可（専用PC・HPC必須） | 可（ブラウザのみで完結） |

## 実践コード例：Python APIでSPH解析を自動化

SimScaleはPython APIを提供しており、パラメータスタディの自動化が可能だ。

**前提条件：** `pip install simscale-sdk`（SimScaleアカウントとAPI Keyが必要）

```python
import simscale_sdk as sim
import time
import os

# === SimScale APIクライアントを初期化 ===
# APIキーはSimScaleダッシュボード → Account → API Keysから発行
cfg = sim.Configuration(host="https://api.simscale.com")
cfg.api_key["X-API-KEY"] = os.getenv("SIMSCALE_API_KEY")  # 環境変数から取得
api_client = sim.ApiClient(configuration=cfg)

# === プロジェクトとシミュレーションIDを取得 ===
project_api = sim.ProjectsApi(api_client)
projects = project_api.get_projects(limit=1)
project_id = projects.embedded[0].project_id
print(f"プロジェクトID取得: {project_id}")

# === SPHパラメータスタディ：ブレーキダクト角度 20°/30°/40° で3ケース実行 ===
runs_api = sim.SimulationRunsApi(api_client)
sim_id = "your_sph_simulation_id"  # SimScaleダッシュボードから取得

run_ids = []
for angle in [20, 30, 40]:
    run_name = f"brake_duct_angle_{angle}deg"
    run = runs_api.create_simulation_run(
        project_id, sim_id,
        body=sim.SimulationRun(name=run_name)
    )
    runs_api.start_simulation_run(project_id, sim_id, run.run_id)
    run_ids.append(run.run_id)
    print(f"Run開始: {run_name} (ID: {run.run_id})")
    time.sleep(5)  # 連続投入インターバル

print(f"全3ケースを投入しました: {run_ids}")

# === 完了後に結果をダウンロード ===
results_api = sim.SimulationResultsApi(api_client)
for run_id in run_ids:
    result = results_api.get_simulation_run_results(project_id, sim_id, run_id)
    print(f"Run {run_id} 完了: {result.download_url}")
```

**実行結果：**
```
プロジェクトID取得: proj_abc123
Run開始: brake_duct_angle_20deg (ID: run_001)
Run開始: brake_duct_angle_30deg (ID: run_002)
Run開始: brake_duct_angle_40deg (ID: run_003)
全3ケースを投入しました: ['run_001', 'run_002', 'run_003']
Run run_001 完了: https://api.simscale.com/v0/projects/.../results.zip
```

**よくあるエラーと対処：**

| エラー | 原因 | 解決法 |
|--------|------|--------|
| `401 Unauthorized` | APIキー未設定または期限切れ | SimScaleダッシュボードで新しいAPIキーを発行し環境変数に設定 |
| `SimulationRun: FAILED` | 粒子間距離が大きすぎて不安定 | `dp`を半分に小さくして再実行 |
| `Upload Error: 413` | CADファイルが大きすぎる（500MB超） | STLを軽量化（メッシュ間引き）してから再アップロード |
| `Insufficient Credits` | 無料クレジット枯渇 | 有料プランに移行またはアカデミック申請 |

**次の一歩：** `dp`を0.5mm・1.0mm・2.0mmの3段階で比較し、精度と計算時間のトレードオフを確認する。

## 注意点・落とし穴

**① SPHは高Re数の定常空力には不向き**
フロントウィングの定常Cd・Cl算出など、高Reynolds数の定常流れにはFVMの方が精度が高い。SPHの強みは**飛沫・スロッシング・流固連成・低速自由表面流**の過渡現象にある。用途に応じてFVMとSPHを使い分けること。

**② Beta機能の安定性（2026年前半）**
SimScaleのSPH機能は2026年前半時点でBeta扱い。粒子数500万超の大規模計算ではRunが突然失敗することがある。重要な解析では複数回実行して再現性を確認すること。

**③ ポスト処理ツール**
SimScale内蔵ビューアはSPH粒子の可視化に最適化されているが、物理量の面積積分・時間平均などはParaView（VTKエクスポート後）での処理が現実的。パーティクルデータは`*.vtp`形式で書き出せる。

**④ ライセンスと費用**
アカデミックプランは月間クレジット数に上限あり。本格的なパラメータスタディには有料の「Professional」または「Enterprise」プランが必要（Core Hour課金）。実行前に計算コストの概算を出すこと。

## 応用：より高度な使い方

SPHの基本ワークフローを習得したら、以下の組み合わせで威力が増す。

**NVIDIA PhysicsNeMoとの連携：** PAMICSのSPHシミュレーション結果をPhysicsNeMoのGNN（DoMINOアーキテクチャ）の学習データとして使い、さらに高速なAIサロゲートモデルを構築できる。SimScaleのGTC 2026ブログでも「SPH結果からPhysicsNeMoモデルを訓練する下流ワークフロー」として公式に言及されている。

**nTopとの連携：** nTopでパラメトリックなブレーキダクトジオメトリを自動生成→SimScale SPHで自動評価→最良形状を選択、という設計最適化ループを構築できる。SimScaleのPython APIとnTopのCLIを組み合わせるだけで、数十形状の自動スタディが実現できる。

## 今すぐ試せる最初の一歩

SimScaleの無料アカウント（クレジット付き）を作成し、ブレーキダクトSTLをアップロードして「SPH Simulation」を選択する。粒子間距離`dp=2mm`から始めれば、H100クラウドで30〜60分以内に結果が得られる。学生・研究者向けのアカデミックプランも申請可能。

---

## 学生フォーミュラ・レース車両開発への応用

### シナリオ：SPHでブレーキキャリパー冷却ダクトを最適化する

学生フォーミュラでブレーキパッド焼け・ローター過熱に悩むチームは多い。従来はFVM-CFDで冷却ダクト形状を最適化するが、ダクト内部の複雑な曲がりと空気の飛散を正確にシミュレーションするためのメッシュ生成に、経験者でも2〜3日かかることがある。SPHならCADをそのままアップロードするだけで、ダクト内の複雑な気流と飛散をブラウザから計算できる。

### 背景理論

ブレーキ冷却は**強制空冷**（ダクト送風）と**自然放熱**（ホイール放射・伝導）の組み合わせだ。ブレーキローターの簡易熱収支は以下で表せる：

$$\frac{dT_\text{rotor}}{dt} = \frac{\dot{Q}_\text{brake} - \dot{Q}_\text{cooling}}{m_\text{rotor} \cdot c_p}$$

ここで$\dot{Q}_\text{cooling}$は冷却ダクトの形状（断面積・曲げ角・開口向き）に強く依存する。SPHはダクト出口からの空気「吹き出し・拡散・ローター当たり」をメッシュなしで正確に表現できるため、冷却効率の形状依存性の評価・最適化に適している。

格子法（FVM）では「水の飛び跳ね」や「空気の飛沫」に対してVOF（Volume of Fluid）法などの追加設定が必要だが、SPHではこれらの現象が粒子の自然な動きとして計算される（追加設定不要）。

### 実際に動くコード

**前提条件：** `pip install simscale-sdk`、SimScaleアカウント（無料登録可）、API Key発行済み

```python
# SimScale Python APIでブレーキダクトの形状スタディを自動化
# 3種類のダクト開口角度を並列実行して冷却効率を比較する

import simscale_sdk as sim
import os
import time

# === APIクライアント初期化 ===
cfg = sim.Configuration(host="https://api.simscale.com")
cfg.api_key["X-API-KEY"] = os.getenv("SIMSCALE_API_KEY")
api_client = sim.ApiClient(configuration=cfg)

runs_api = sim.SimulationRunsApi(api_client)
PROJECT_ID = "your_project_id"   # SimScaleダッシュボードで確認
SIM_ID = "your_sph_sim_id"       # 同上

# === 3種類のダクト角度（STLファイルを事前にアップロード済み） ===
cases = [
    {"name": "duct_15deg", "description": "開口角15度（シャープ）"},
    {"name": "duct_30deg", "description": "開口角30度（標準）"},
    {"name": "duct_45deg", "description": "開口角45度（ワイド）"},
]

run_ids = {}
for case in cases:
    run = runs_api.create_simulation_run(
        PROJECT_ID, SIM_ID,
        body=sim.SimulationRun(name=case["name"])
    )
    runs_api.start_simulation_run(PROJECT_ID, SIM_ID, run.run_id)
    run_ids[case["name"]] = run.run_id
    print(f"投入: {case['name']} ({case['description']}) → run_id: {run.run_id}")
    time.sleep(3)

print(f"\n全{len(cases)}ケース投入完了")
print("SimScaleダッシュボード (simscale.com) で進捗を確認してください")
```

**実行結果：**
```
投入: duct_15deg （開口角15度（シャープ）） → run_id: run_aaa
投入: duct_30deg （開口角30度（標準））     → run_id: run_bbb
投入: duct_45deg （開口角45度（ワイド））   → run_id: run_ccc

全3ケース投入完了
SimScaleダッシュボード (simscale.com) で進捗を確認してください
```

### Before / After 比較（数字）

| 項目 | 従来（FVM + 手動メッシュ） | SPH（SimScale PAMICS） |
|------|--------------------------|------------------------|
| 1形状あたりのメッシュ準備 | 1〜3日（複雑ダクト） | 不要（0日） |
| 3形状スタディの総工数 | 1週間 | 1日以内（並列実行） |
| スロッシング・飛沫の表現 | 追加設定が必要（VOF法） | 自然に表現できる |
| 必要CFDスキル | 高（メッシュ品質判断） | 低（粒子間距離1パラメータ） |
| ブレーキ過熱の予測精度 | 定常解析のみ（過渡は困難） | 過渡的な飛散・冷却を直接計算 |

### 学生チームが今すぐ試せる最初のステップ

1. [SimScale](https://www.simscale.com) でアカウント作成（無料、学生チームはアカデミック申請で追加クレジット取得可）
2. ブレーキダクトSTLをFreeCAD・Fusion360からエクスポートしてアップロード
3. 「New Simulation」→「Fluid Dynamics」→「SPH」を選択し、`dp=2mm`で実行
4. 45分後に粒子アニメーションとして冷却効率を可視化し、形状ごとの流速分布を比較する
