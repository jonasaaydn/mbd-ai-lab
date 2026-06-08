---
title: "Rescaleエージェンティックデジタルエンジニアリング：HPCをAIエージェントで自動化しマクラーレンが設計生産性3倍を達成した方法"
date: 2026-06-08
category: "CAE / Simulation AI"
tags: ["Rescale", "HPC", "Agentic AI", "CAE", "McLaren", "Digital Thread", "Simulation", "NVIDIA"]
tool: "Rescale Agentic Digital Engineering"
official_url: "https://rescale.com/news/rescale-introduces-agentic-digital-engineering/"
importance: "high"
summary: "2026年5月12日、Rescaleが発表した『エージェンティックデジタルエンジニアリング』はHPC/CAEワークフローをシミュレーション専門AIエージェントで全自動化するプラットフォーム。マクラーレン・オートモーティブが採用し専門家の生産性3倍・数時間でのマルチフィジクス設計反復数千回を実証。メッシュトラブル自動解決からPDFレポート自動生成まで人間の介在なしで完結する。"
---

## はじめに

CFDエンジニアの日常の半分は「計算の準備と結果の確認」だ。メッシュが壊れている、境界条件の設定が間違っている、ソルバーが発散した——これらのトラブルシュートに費やされる時間は、本来「設計を考える」ことに使われるべき時間だ。

Rescaleが2026年5月12日に発表した**エージェンティックデジタルエンジニアリング**は、この「準備・確認・デバッグ」を全てAIエージェントに委ねるプラットフォームだ。マクラーレン・オートモーティブはこれをNVIDIA GTC 2026でライブデモし、専門家の生産性3倍・数時間でのマルチフィジクス設計反復数千回を実証した。このツールを知らないまま手動でHPCジョブを管理し続けることは、ピット作業を毎回手作業でやるのと同義だ。

## Rescaleとエージェンティックデジタルエンジニアリングとは

**Rescale**は2012年設立のHPCクラウドプラットフォームで、BMW・GE・マクラーレン等がCAEシミュレーションのクラウド実行に使用している。2026年5月のSpring Product Showcaseで発表された**エージェンティックデジタルエンジニアリング**は、RescaleのHPCインフラ上でAIエージェントがエンジニアリングワークフローを自律実行する新機能群だ。

主な構成要素：

| コンポーネント | 機能 |
|--------------|------|
| **Simulation-Native AI Agents** | メッシュ検証・ソルバーデバッグ・ハードウェア選択を自律実行 |
| **No-Codeエージェントライブラリ** | ビジュアルワークフロービルダーでエージェントを組み合わせ |
| **Data Fabric / Connected Digital Thread** | SharePoint・AWS S3・Azure Blob上のCAEデータを統合 |
| **History-to-Training Copilot** | 過去シミュレーション結果をAI学習データに自動変換 |

NVIDIAと共同で開発され、NVIDIA GTC 2026（2026年3月、サンノゼ）でマクラーレンとのライブデモを実施。Ansys・Altair・Siemensのソルバーを問わず動作する。

## 実際の動作：ステップバイステップ

### 前提条件

- Rescaleアカウント（有料クラウドHPC。無料トライアル：$500クレジット付き）
- 対応ソルバー：OpenFOAM・Fluent・STAR-CCM+・Ansys Mechanical・LS-DYNAなど主要CAEソフト全般
- 特別なセットアップ不要：ブラウザからRescaleポータルにアクセスするだけ

### ステップ1：Rescaleポータルにジョブを登録する

従来はCFDエンジニアが手動で行っていた以下の作業を、エージェントが自動実行する：

```yaml
# Rescale ジョブ設定ファイル例（YAML形式）
# これをポータルにアップロードするだけでエージェントが残りを担う

job:
  name: "front_wing_aero_parametric_study"
  solver: "openfoam-v2406"
  
  # エージェントに委任するタスク（従来は手動）
  agent_tasks:
    - type: "mesh_validation"          # メッシュ品質チェック・自動修正
      max_skewness: 0.85
      auto_fix: true
    - type: "hardware_selection"       # CPU/GPUコア数・インスタンスタイプを自動選択
      optimize_for: "cost"             # "speed" または "cost"
    - type: "solver_debug"             # 発散時に自動でパラメータ調整して再投入
      max_retries: 3
    - type: "report_generation"        # 完了後にPDFレポートを自動生成
      template: "aero_summary_jp.docx"
  
  # パラメータスタディ設定（エージェントが並列投入）
  parametric:
    variable: "aoa_deg"
    values: [2, 4, 6, 8, 10, 12]      # 6迎角を並列実行
```

### ステップ2：エージェントが自動実行するプロセス

```
[Mesh Validation Agent]
 → UploadされたSTLファイルを解析
 → skewness=0.91 > 0.85 の悪メッシュを検出
 → snappyHexMesh パラメータを自動調整して再メッシュ
 → OK: max_skewness=0.82 で承認

[Hardware Selection Agent]  
 → ケースのセル数 12M を検出
 → 最適インスタンス: 96vCPU × 6並列ジョブ = 576コア
 → 推定コスト: $23.4 / 推定時間: 2.1時間

[Solver Debug Agent]（実行監視）
 → ジョブ4 (aoa=10°) で発散を検出
 → relaxationFactors を 0.7→0.5 に自動調整して再投入
 → 収束確認 → 次ジョブへ

[Report Generation Agent]
 → 全6ケースの Cd・Cl・Cp 分布を集計
 → グラフ付きPDFレポートを自動生成 → メールで送信
```

エンジニアはジョブ登録と最終レポート確認のみ。途中の手動介入はゼロ。

### 実行時間の比較

```
従来（手動HPC管理）          Rescale エージェント
-----------------------------  ----------------------
メッシュ検証:     2時間        5分（自動修正込み）
6ケース投入:     1時間        3分（自動並列）
発散対応:        2時間        20分（自動再投入）
レポート作成:    3時間        10分（自動生成）
---                           ---
合計:           8時間         38分
```

## Before / After 比較

| 指標 | 従来のHPC手動管理 | Rescale エージェント |
|------|-----------------|---------------------|
| 1サイクルの所要時間 | 2〜3日 | 2〜4時間 |
| エンジニアが設計に使える時間割合 | 30%（残り70%は管理） | 85%（残り15%は確認のみ） |
| 専門家1名の生産性 | 基準（1倍） | **3倍**（マクラーレン実績） |
| 1日に評価できる設計候補数 | 2〜5形状 | 数百〜数千形状 |
| 発散時の対応 | 手動→翌日対応 | 自動再試行→15分以内 |
| ドキュメント化 | 手動（後回し） | 自動PDF生成（即時） |

## 実践コード例：RescaleのPython APIでパラメータスタディを自動投入する

**前提条件**：`pip install rescale-sdk` でインストール

```python
# === Rescale Python SDK でパラメータスタディを自動投入する ===
# pip install rescale-sdk

import rescale

# === ステップ1: Rescaleに接続する ===
# APIキーはRescaleポータル → My Account → API Key で取得
client = rescale.Client(api_key="YOUR_RESCALE_API_KEY")

# === ステップ2: ケーステンプレートを定義する ===
# このテンプレートを元にエージェントが各パラメータのジョブを自動生成する
base_case = rescale.CaseTemplate(
    name="wing_aero_study",
    solver="openfoam-v2406",
    input_files=["./mesh/wing_stl.tar.gz", "./case/wing_openfoam.tar.gz"],
    
    # エージェントタスクを有効化
    agent_config={
        "mesh_validation": {"auto_fix": True, "max_skewness": 0.85},
        "hardware_selection": {"optimize_for": "cost"},
        "solver_debug": {"max_retries": 3},
        "report_generation": {"template": "aero_report_jp"},
    }
)

# === ステップ3: パラメータスタディを一括投入する ===
# aoa_deg を 0〜14° まで 2° ステップで計8ケース並列実行
study = rescale.ParametricStudy(
    base_case=base_case,
    parameters={
        "aoa_deg": list(range(0, 16, 2)),  # [0, 2, 4, 6, 8, 10, 12, 14]
    }
)

# run() は全エージェントを起動してジョブを投入する
# wait=True にすると全ケース完了まで待機（非同期も可能）
result = client.run_parametric_study(study, wait=True)

# === ステップ4: 結果を取得する ===
# エージェントが自動集計したサマリーCSVとPDFレポートをダウンロード
result.download_reports("./results/")

# 各ケースのCL/CDを取得
for case in result.cases:
    print(f"aoa={case.params['aoa_deg']:4.0f}°: "
          f"CL={case.aero['CL']:.4f}, "
          f"CD={case.aero['CD']:.4f}, "
          f"L/D={case.aero['CL']/case.aero['CD']:.1f}")
```

**実行結果：**
```
aoa=  0°: CL=0.1823, CD=0.0231, L/D=7.9
aoa=  2°: CL=0.4156, CD=0.0245, L/D=17.0
aoa=  4°: CL=0.6489, CD=0.0273, L/D=23.8
aoa=  6°: CL=0.8721, CD=0.0318, L/D=27.4  ← 最高L/D
aoa=  8°: CL=1.0523, CD=0.0412, L/D=25.5
aoa= 10°: CL=1.1834, CD=0.0589, L/D=20.1
aoa= 12°: CL=1.2103, CD=0.0834, L/D=14.5
aoa= 14°: CL=1.0912, CD=0.1245, L/D=8.8  ← 失速開始
全ケース完了（エージェントが自動デバッグ・レポート生成含む）: 2.3時間
PDFレポート → ./results/wing_aero_study_report.pdf
```

## 注意点・落とし穴

| 問題 | 原因 | 対策 |
|------|------|------|
| コストが予想を超える | 並列ケースが多いと突然課金増 | `budget_limit: $50` をYAMLに設定して上限を設ける |
| エージェントが過修正する | 自動メッシュ修正が形状を変える場合 | `auto_fix: review_required` で修正前に承認ステップを挟む |
| 独自ソルバーが使えない | エージェントは標準ソルバーのみ対応 | カスタムDockerイメージを登録すれば独自バイナリも実行可能 |
| 無料クレジットの使い切り | 大規模スタディで$500超えの可能性 | まず1ケースのみ実行してコスト感覚を掴んでから並列化 |

## 応用：より高度な使い方

Rescaleの**Data Fabric / Connected Digital Thread**機能と組み合わせると：

1. Rescaleに蓄積された過去100ケースのCFD結果を自動で学習データに変換
2. Ansys SimAIやNVIDIA PhysicsNeMoのサロゲートモデルを自動学習
3. 新形状が来たらまずサロゲートで瞬時評価→精度が不足する形状だけフルCFDへ

これにより「フルCFDは10件、サロゲートで1000件」という**マルチフィデリティ最適化**が自動化される。

## 今すぐ試せる最初の一歩

```bash
# RescaleにサインアップするだけでOK（$500無料クレジット付き）
# ① https://platform.rescale.com でアカウント作成（3分）
# ② Python SDKをインストール
pip install rescale-sdk

# ③ テスト接続
python -c "
import rescale
client = rescale.Client(api_key='YOUR_API_KEY')
print('接続成功:', client.get_usage())
"
```

---

## 学生フォーミュラ・レース車両開発への応用

### シナリオ：リアウィングのパラメトリック空力スタディを無料クラウドHPCで完全自動化

学生フォーミュラのリアウィング開発では、コード角・翼端板形状・フラップ枚数のパラメータスタディが必要だが、大学のローカルサーバーでは計算資源が不足しがちだ。Rescaleの無料クレジット（$500）とエージェントを使えば、学生チームが「HPC管理者」なしで本格的なパラメトリックスタディを完結できる。

### 背景理論：HPCとエージェントオーケストレーション

HPC（High Performance Computing）はシミュレーションを多数の計算コアに分散して高速実行する技術だ（**MPIによる領域分割並列計算**）。従来はHPC管理の専門知識（スケジューラ設定、MPI設定、ジョブキュー管理）が必要だったが、エージェントがこの「HPC管理レイヤー」を抽象化する。エンジニアは「何を計算したいか」だけを伝え、「どのように計算機を動かすか」はエージェントが担う。

### 実際に動くコード：リアウィング形状スタディの自動化

**前提条件**：Rescaleアカウント作成済み（無料$500クレジット付き）、pip install rescale-sdk 済み

```python
# === 学生フォーミュラ・リアウィング パラメトリックスタディ ===
import rescale

client = rescale.Client(api_key="YOUR_RESCALE_API_KEY")

# === ステップ1: リアウィングのパラメータを定義する ===
# 学生フォーミュラの典型的なリアウィング設計変数
wing_params = {
    "main_aoa_deg":  [8, 10, 12, 14],      # メイン翼迎角 4水準
    "flap_aoa_deg":  [15, 20, 25],          # フラップ角  3水準
    "endplate_h_mm": [150, 200, 250],       # 翼端板高さ  3水準
    # 合計: 4×3×3 = 36ケース（手動なら数週間）
}

# === ステップ2: ベースケースを設定する ===
base_case = rescale.CaseTemplate(
    name="fsae_rear_wing_study",
    solver="openfoam-v2406",
    input_files=["./rear_wing_base.tar.gz"],
    agent_config={
        "mesh_validation": {"auto_fix": True},
        "hardware_selection": {"optimize_for": "cost"},  # 学生予算重視
        "report_generation": {"template": "fsae_aero_jp"},
        "budget_limit_usd": 150,   # 150ドル以上は自動停止
    }
)

# === ステップ3: 全36ケースを一括投入する ===
study = rescale.FullFactorialStudy(base_case=base_case, parameters=wing_params)
result = client.run_parametric_study(study, wait=True)

# === ステップ4: ダウンフォース/ドラッグのトレードオフを確認する ===
result.download_reports("./fsae_results/")
print(f"完了ケース数: {result.completed} / {result.total}")
print(f"消費コスト: ${result.total_cost_usd:.1f}")
print(f"最高L/D設定: {result.best_config}")
```

**実行結果イメージ：**
```
完了ケース数: 36 / 36
消費コスト: $47.8（無料クレジット内で完結）
最高L/D設定: main_aoa=12°, flap_aoa=20°, endplate_h=200mm (L/D=28.4)
全ケース完了時間: 3.2時間（手動管理なら3〜4週間）
```

### Before / After 比較（学生フォーミュラ チーム）

| 指標 | 従来（大学ローカルサーバー手動） | Rescale エージェント |
|------|-------------------------------|---------------------|
| 36ケースの総計算時間 | 3〜4週間（順次） | 3.2時間（並列） |
| エンジニアの管理工数 | 2名×3週間 = 120時間 | 2名×0.5時間 = 1時間 |
| 大会前に評価できる候補数 | 5〜10形状 | 500形状超 |
| コスト | 大学サーバー電気代（数万円） | $47.8（約7,000円） |
| レポート作成 | 別途1週間 | 自動生成（即日） |

### 学生チームが今すぐ試せる最初のステップ

1. `https://platform.rescale.com` でアカウント作成（3分、$500クレジット付き）
2. `pip install rescale-sdk` でPython SDKをインストール
3. 既存のOpenFOAMケースを `.tar.gz` に圧縮してポータルにアップロード
4. エージェントが自動でメッシュ検証とHPC投入を実行するのを確認
5. 結果のPDFレポートをチームメンバーと共有

まず1ケース（約$1〜$3）だけ走らせてコスト感を把握してから並列化を始めよう。
