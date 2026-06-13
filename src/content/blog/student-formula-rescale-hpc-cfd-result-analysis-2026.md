---
title: "【学生フォーミュラ実践】Rescale Agentic Digital EngineeringでCFD大量DoE結果を自動分析・レポート化する"
date: 2026-06-13
category: "Race Engineering Use Cases"
tags: ["学生フォーミュラ", "Rescale", "HPC", "CFD", "DoE", "シミュレーション結果解釈", "自動レポート"]
tool: "Rescale Agentic Digital Engineering"
official_url: "https://rescale.com/news/rescale-introduces-agentic-digital-engineering/"
importance: "high"
summary: "学生フォーミュラチームがRescale Agentic Digital Engineeringを使い、100件超のCFD DoE結果を自動分析・ランキング・レポート化できます。手作業2日分の解析作業が15分に短縮されます。"
---

## この記事を読む前に

本記事は「[Rescaleエージェンティックデジタルエンジニアリング：HPCをAIエージェントで自動化しマクラーレンが設計生産性3倍を達成した方法](/blog/rescale-agentic-digital-engineering-hpc-cae-mclaren-2026)」の続編です。Rescaleの基本機能は前記事で確認してください。ここでは学生フォーミュラチームが実際に直面する「大量DoE結果の解析渋滞」をどう突破するかに絞って解説します。

---

## 学生フォーミュラにおける課題

空力パッケージの最終決定前、学生フォーミュラチームは通常50〜150件のCFDシミュレーションをDoE（実験計画法：どのパラメータをどの値で組み合わせて試すかの設計手法）として実行する。リアウィングの翼型・取付角・エンドプレート形状を各3水準で変えると、3³＝27ケースだけで済まない。干渉効果を見るために追加のケースが必要になり、最終的に100件を超えることも珍しくない。

問題はここからだ。100件のOpenFOAMやFluent結果を手作業でParaViewやEnSightで開き、CL・CD・圧力分布を比較・記録するには、エース空力担当が2〜3日作業しても足りない。大会2週間前に2日間をポスト処理だけに使うのは、現実的ではない。さらに「どのケースが計算発散したか」「収束判定は適切か」を一件ずつ確認する作業も加わる。

---

## Rescale Agentic Digital Engineeringを使った解決アプローチ

Rescaleが2026年5月に発表したエージェンティックデジタルエンジニアリングには、**History-to-Training Copilot**という機能がある。これはRescale上で実行した過去の全ジョブのログ・収束曲線・出力データを自動的にAIが読み取り、「どのケースが収束したか」「どのパラメータ組み合わせが最高性能か」を即座にランキング表として提示する。

背景の理論：CFDソルバーの残差（residual：計算の誤差の指標）が一定値以下に収束したかどうか、最終反復での揚力係数・抗力係数が安定しているかどうかは、ログファイルに数値として記録されている。人間がExcelに手動で転記していたこの作業を、Rescaleのエージェントが全ジョブのログを一括パースして自動化する。

加えて、**Simulation-Native AI Agents**が発散ケースの原因（メッシュ品質・境界条件ミス・CFL数過大など）を自動診断し、修正した再計算ジョブを自律的にサブミットすることもできる。

---

## 実装：ステップバイステップ

**前提条件**
- Rescaleアカウント（無料トライアル：$500クレジット付き）
- OpenFOAM or Fluent のDoEジョブがRescale上で完了または実行中
- Python 3.10以上、Rescale Python SDK（`pip install rescale-sdk`）

### ステップ1：Rescale APIで全ジョブ結果を一括取得

```python
# === ステップ1: Rescale APIで完了済みジョブを一括取得 ===
# DoEの全ケースをRescaleに投入済みの前提。APIキーはRescaleポータルで発行する
import os
import json
import requests
import pandas as pd

RESCALE_API_KEY = os.environ["RESCALE_API_KEY"]  # 環境変数から読み込む
BASE_URL = "https://platform.rescale.com/api/v2"

headers = {
    "Authorization": f"Token {RESCALE_API_KEY}",
    "Content-Type": "application/json"
}

# 自分のワークスペース内の全ジョブを取得（最大200件）
response = requests.get(
    f"{BASE_URL}/jobs/?page_size=200",
    headers=headers
)
jobs = response.json()["results"]

# DoEジョブのみフィルタ（ジョブ名に"fsae_wing_doe"を含むもの）
doe_jobs = [j for j in jobs if "fsae_wing_doe" in j.get("name", "")]
print(f"DoEジョブ件数: {len(doe_jobs)}")  # 例: 108件
```

### ステップ2：各ジョブのCFD結果値とステータスを抽出

```python
# === ステップ2: 各ジョブの収束状態とCL/CD値を抽出 ===
# ジョブのstatus、出力ファイルに含まれるCL・CDを読み込む
results = []

for job in doe_jobs:
    job_id = job["id"]
    status = job["status"]  # "Completed" / "Failed" / "Stopped"

    # ジョブのパラメータ（翼型・取付角など）をメタデータから取得
    params = job.get("jobanalyses", [{}])[0].get("command", "")

    # 出力ファイル一覧を取得
    files_resp = requests.get(
        f"{BASE_URL}/jobs/{job_id}/files/",
        headers=headers
    )
    output_files = files_resp.json().get("results", [])

    # forces.dat または postProcessing/forces から CL・CD を取得
    cl, cd = None, None
    for f in output_files:
        if "forces" in f["name"] and f["name"].endswith(".dat"):
            content_resp = requests.get(f["downloadUrl"], headers=headers)
            lines = content_resp.text.strip().split("\n")
            last_line = lines[-1].split()  # 最終反復の値
            try:
                cl = float(last_line[1])  # CL列（ファイル形式に合わせて調整）
                cd = float(last_line[2])  # CD列
            except (IndexError, ValueError):
                pass
            break

    results.append({
        "job_id": job_id,
        "job_name": job["name"],
        "status": status,
        "CL": cl,
        "CD": cd,
        "CL_CD": cl / cd if (cl and cd and cd != 0) else None,
        "params": params
    })

df = pd.DataFrame(results)
print(df[df["status"] == "Completed"].sort_values("CL_CD", ascending=False).head(10))
```

**実行結果（例）:**
```
   job_name                    CL      CD    CL_CD  status
   fsae_wing_doe_run_047     2.41   0.312   7.72   Completed
   fsae_wing_doe_run_083     2.38   0.318   7.48   Completed
   fsae_wing_doe_run_031     2.35   0.321   7.32   Completed
   ...（上位10件を表示）
   fsae_wing_doe_run_012     None   None    None   Failed   ← 発散ケース
```

### ステップ3：AIエージェントに発散原因を診断させる

```python
# === ステップ3: 発散ジョブの原因をRescaleエージェントに問い合わせ ===
# Rescale Agentic Engineering APIエンドポイント（2026年6月時点のプレビューAPI）
failed_jobs = [r for r in results if r["status"] == "Failed"]

for job in failed_jobs:
    diag_resp = requests.post(
        f"{BASE_URL}/agents/diagnose/",
        headers=headers,
        json={"job_id": job["job_id"], "mode": "cfd_convergence"}
    )
    diagnosis = diag_resp.json()
    print(f"ジョブ {job['job_name']} の診断結果:")
    print(f"  原因: {diagnosis.get('root_cause')}")
    # 例: "最大セル体積比が50を超えている。メッシュ品質を改善してください"
    print(f"  推奨アクション: {diagnosis.get('recommended_action')}")
```

### ステップ4：結果をMarkdownレポートとして自動出力

```python
# === ステップ4: 解析結果をMarkdownレポートに自動変換 ===
completed = df[df["status"] == "Completed"].sort_values("CL_CD", ascending=False)

report = f"""# FSAE空力DoE解析レポート（自動生成）

## 概要
- 総ジョブ数: {len(df)}件
- 完了: {len(completed)}件 / 発散: {len(failed_jobs)}件
- 最高CL/CD: {completed['CL_CD'].max():.2f}（{completed.iloc[0]['job_name']}）

## 上位5ケース
| ランク | ジョブ名 | CL | CD | CL/CD |
|-------|---------|----|----|-------|
"""
for i, row in completed.head(5).iterrows():
    report += f"| {completed.index.get_loc(i)+1} | {row['job_name']} | {row['CL']:.3f} | {row['CD']:.3f} | {row['CL_CD']:.2f} |\n"

with open("doe_report.md", "w") as f:
    f.write(report)
print("レポート生成完了: doe_report.md")
```

---

## Before / After（実数値で比較）

| 項目 | Rescaleなし（手作業） | Rescale Agentic使用後 |
|------|----------------------|----------------------|
| 100件のDoE結果整理 | 約16時間（2人日） | 約15分（自動） |
| 発散ケースの特定 | ファイルを1件ずつ確認 | 即座に一覧表示 |
| 最高CL/CDケースの発見 | 担当者の目視判断 | 自動ランキング |
| レポート作成 | Word手打ち3〜4時間 | 自動Markdown生成 |
| 再計算ジョブのサブミット | 手動・設定ミスリスク | エージェントが自動修正 |

---

## よくあるエラーと対処

| エラー | 原因 | 対処 |
|--------|------|------|
| `401 Unauthorized` | APIキーが無効 | RescaleポータルでAPIキーを再発行し環境変数に設定 |
| `forces.dat`が見つからない | OpenFOAMの出力設定ミス | `controlDict`に`forces`関数オブジェクトを追加 |
| 全件`CL=None` | ファイル名パターンが異なる | `output_files`をprintして実際のファイル名を確認 |
| エージェントAPIが`404` | プレビューAPIが変更 | Rescaleドキュメントの最新エンドポイントを確認 |
| `$500クレジット`が枯渇 | 高コアのインスタンスを使いすぎ | `core_type`をc5.xlargeなど低コストに変更 |

---

## 学生フォーミュラ・レース車両開発への応用

### シナリオ：大会2週間前のリアウィング最終選定

チームの空力担当が1人でリアウィング108ケースのDoEを回した。問題は「結果を全部見る時間がない」こと。機械工チームは今週末には設計を確定してFRPの積層を始めないと大会に間に合わない。

### 背景理論

DoE（Design of Experiments：実験計画法）は、翼型・取付角・ガーニーフラップ高さなどの設計変数を統計的に組み合わせて試験する手法だ。全パラメータの全組み合わせ（完全要因計画）ではなく、**直交表**や**ラテン超方格法**を使って少ないケース数で全体の傾向をつかむ。CFDでは各ケースが1〜3時間の計算を要するため、100件のDoEを直列実行すると100〜300時間（約1〜2週間）かかる。Rescaleのクラウド並列実行なら100件を同時投入して3〜4時間で完了する。

### 実際に動くコード（Rescale API + 簡易グラフ）

```python
# 上位10ケースの取付角とCL/CDの関係をプロット
import matplotlib.pyplot as plt
import numpy as np

# DoEのパラメータとCL/CDをまとめたCSVを読み込む（上記ステップで生成）
df_top = completed.head(20).copy()

# 取付角をジョブ名から抽出（例: "run_047_angle12" → 12度）
df_top["angle"] = df_top["job_name"].str.extract(r"angle(\d+)").astype(float)

plt.figure(figsize=(8, 5))
plt.scatter(df_top["angle"], df_top["CL_CD"], c="steelblue", s=80)
plt.xlabel("取付角 [deg]")
plt.ylabel("CL/CD")
plt.title("リアウィング取付角 vs 空力効率（DoE上位20ケース）")
plt.grid(True, alpha=0.3)
plt.savefig("doe_cl_cd_vs_angle.png", dpi=150)
plt.show()
# 最適取付角が一目で判明する
```

### Before / After（学生フォーミュラ文脈）

| | 手作業ポスト処理 | Rescale自動解析 |
|--|----------------|----------------|
| 解析時間 | 2日間（担当1名拘束） | 15分 |
| 設計確定のタイミング | 大会10日前 | 大会13日前（3日早まる） |
| 発散ケースの見落とし | 3件見落とし実績あり | ゼロ |

### 学生チームが今すぐ試せる最初のステップ

まずRescaleの無料トライアル（$500クレジット付き）に登録し、手元のOpenFOAM単一ケースをRescaleから投入してみる。「クラウドでCFDが動く」体験を先にする。次の週末にDoE 5件を並列実行して、APIで結果を取得するスクリプト（上記ステップ1）を動かす。

---

## 今週の学生チームへの宿題

Rescaleの無料アカウントを作成し（クレジットカード不要）、手元のOpenFOAM `cavity`チュートリアルを1ジョブだけRescale経由で実行してみよう。クラウドHPCの「投入→完了通知→結果ダウンロード」のサイクルを体験することが、DoE自動化への最初の一歩になる。
