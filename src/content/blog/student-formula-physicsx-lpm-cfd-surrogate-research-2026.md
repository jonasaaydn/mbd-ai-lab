---
title: "【学生フォーミュラ実践】PhysicsX Large Physics ModelでCFDサロゲートを「使い捨て」から「共有ライブラリ」に進化させる"
date: 2026-06-18
category: "Race Engineering Use Cases"
tags: ["学生フォーミュラ", "PhysicsX", "Large Physics Model", "CFDサロゲート", "空力解析", "転移学習"]
tool: "PhysicsX"
official_url: "https://www.physicsx.ai"
importance: "high"
summary: "学生フォーミュラチームがPhysicsXのLarge Physics Model（LPM）を使い、毎シーズン使い捨てにしていたCFDサロゲートモデルを「再利用可能なモデルライブラリ」に進化させる方法を解説します。5ケースのCFDデータから50パターンの設計を15分以内に評価できます。"
---

## この記事を読む前に

PhysicsXの概要は「[LLMの次は「物理版LLM」——PhysicsXのLarge Physics Modelが自動車CAEを変える理由](/blog/physicsx-large-physics-model-cae-2026)」で紹介済みです。この記事では**学生フォーミュラへの具体的な応用**に絞り、実際にPythonでAPIを叩いて空力サロゲート推論を実行するところまで扱います。

## 学生フォーミュラにおける課題

毎年5〜6月のサスペンション確定後、エアロパッケージの最終調整フェーズで学生チームは同じ問題に直面する。

- フロントウィングの翼型形状パラメータを**20〜50パターン**評価したいが、CFDは1ケース4〜8時間
- 予算上クラスターHPCにアクセスできないチームが多く、年間CFD実行数は**20〜40ケース以下**
- 毎年ゼロからサロゲートを学習し直す「**使い捨てサロゲート問題**」——2・3年目のチームでさえ蓄積データが活かせない

PhysicsXのLarge Physics Model（LPM）は2万件超の自動車空力CFDデータで事前学習されたFoundationモデルであり、「少量のファインチューニングデータで高精度サロゲートを起動できる」点がこの問題に直撃する。

## PhysicsXを使った解決アプローチ

LPMの核心は**転移学習（Transfer Learning）**にある。ナビエ-ストークス方程式（流体の速度・圧力の時間発展を記述する偏微分方程式）の解を大量のCFDデータから学習済みなので、ゼロから訓練するより10〜100倍少ないデータで目的形状のサロゲートを構築できる。

学生チームの利用形態は3ステップで完結する：

1. **既存CFDデータ（5〜10ケース）をPhysicsX APIにアップロード**してドメイン適応（Fine-tune）
2. **新形状パラメータをAPIに渡して推論**——GPU不要、レスポンスは数十秒
3. **Pareto最適解を可視化**して実CFDで検証すべき優先案を絞り込む

## 実装：ステップバイステップ

### 前提条件

- PhysicsX APIアカウント（無料トライアルあり：https://www.physicsx.ai）
- OpenFOAM または Ansys Fluent で出力したCSV形式のCFD結果（最低5ケース）
- Python 3.10+、`requests`、`numpy`、`matplotlib`

```python
# === ステップ1: 既存CFD結果をPhysicsX APIに登録してFine-tuneを実行 ===
# 手持ちのCFDケースをアップロードし、フロントウィング形状に特化したサロゲートを起動する

import requests
import time
import numpy as np
import matplotlib.pyplot as plt

PHYSICSX_API_KEY = "YOUR_API_KEY"   # PhysicsXポータルで取得
BASE_URL = "https://api.physicsx.ai/v1"
HEADERS = {
    "Authorization": f"Bearer {PHYSICSX_API_KEY}",
    "Content-Type": "application/json"
}

# CFD実行済みケースをパラメータ＋結果で定義する
# inputs: [キャンバー角(deg), 弦長(mm), 後縁フラップ角(deg)]
# outputs: Cl（揚力係数）, Cd（抗力係数）——いずれも無次元数
training_data = [
    {"inputs": [4.0, 250, 12.0], "outputs": {"Cl": 1.45, "Cd": 0.089}},
    {"inputs": [5.0, 250, 14.0], "outputs": {"Cl": 1.62, "Cd": 0.097}},
    {"inputs": [6.0, 250, 16.0], "outputs": {"Cl": 1.79, "Cd": 0.108}},
    {"inputs": [4.5, 260, 13.0], "outputs": {"Cl": 1.53, "Cd": 0.093}},
    {"inputs": [5.5, 260, 15.0], "outputs": {"Cl": 1.71, "Cd": 0.102}},
]

# Fine-tuneジョブを投入する
payload = {
    "model_type": "wing_aero_2d",   # LPMの翼型空力モジュールを指定
    "training_samples": training_data,
    "target_outputs": ["Cl", "Cd"]
}
resp = requests.post(f"{BASE_URL}/surrogate/finetune", headers=HEADERS, json=payload)
job_id = resp.json()["job_id"]
print(f"Fine-tune ジョブ投入: {job_id}")

# === ステップ2: Fine-tune完了を待機してサロゲートIDを取得 ===

surrogate_id = None
for _ in range(30):                 # 最大15分待機（30秒×30回）
    status = requests.get(
        f"{BASE_URL}/surrogate/status/{job_id}", headers=HEADERS
    ).json()
    if status["state"] == "completed":
        surrogate_id = status["surrogate_id"]   # 来季も再利用できるID
        print(f"サロゲート完成: {surrogate_id}")
        break
    time.sleep(30)

# === ステップ3: 50パターンの形状を一括推論でDesign Space Explorationを実施 ===

# 設計パラメータ探索グリッドを生成する
camber_range = np.linspace(3.0, 7.0, 10)    # キャンバー角 3〜7度
flap_range   = np.linspace(10.0, 18.0, 10)  # フラップ角 10〜18度

inference_cases = []
for cam in camber_range:
    for fla in flap_range:
        inference_cases.append({"inputs": [cam, 250.0, fla]})  # 弦長は基準値固定

# バッチ推論を実行（100ケース同時送信）
batch_payload = {"surrogate_id": surrogate_id, "cases": inference_cases}
results = requests.post(
    f"{BASE_URL}/surrogate/infer", headers=HEADERS, json=batch_payload
).json()

Cl_pred = np.array([r["Cl"] for r in results["predictions"]])
Cd_pred = np.array([r["Cd"] for r in results["predictions"]])

# === ステップ4: パレートフロントを可視化（Cl最大化 & Cd最小化）===

def is_pareto_optimal(Cl, Cd):
    pareto = []
    for i in range(len(Cl)):
        dominated = any(
            (Cl[j] >= Cl[i] and Cd[j] <= Cd[i] and (Cl[j] > Cl[i] or Cd[j] < Cd[i]))
            for j in range(len(Cl)) if j != i
        )
        pareto.append(not dominated)
    return np.array(pareto)

pareto_mask = is_pareto_optimal(Cl_pred, Cd_pred)

fig, ax = plt.subplots(figsize=(8, 5))
ax.scatter(Cd_pred, Cl_pred, c="steelblue", alpha=0.5, label="PhysicsX推論（100ケース）")
ax.scatter(Cd_pred[pareto_mask], Cl_pred[pareto_mask],
           c="tomato", s=80, label=f"Pareto最適解（{pareto_mask.sum()}件）", zorder=5)
ax.set_xlabel("Cd（抗力係数）")
ax.set_ylabel("Cl（揚力係数）")
ax.set_title("フロントウィング空力 Design Space（PhysicsX LPM推論）")
ax.legend()
plt.tight_layout()
plt.savefig("pareto_front.png", dpi=150)
print(f"Pareto最適解 {pareto_mask.sum()} ケース → 次のCFD検証候補")
```

実行結果（例）：
```
Fine-tune ジョブ投入: job_a8f21c
サロゲート完成: sur_7d3b9e
Pareto最適解 8 ケース → 次のCFD検証候補
```

`sur_7d3b9e` のIDを保存しておけば、来シーズンも同じデータ資産から推論が再開できる。これが「使い捨てサロゲート」との最大の違いだ。

## 学生フォーミュラ・レース車両開発への応用

### 具体的なシナリオ

学生フォーミュラの設計審査（Design Event）直前の6月、チームは「フロントダウンフォースをもう5%上げたい」という要求を持ちながらも、残りのCFD枠が3ケースしかない状況に陥ることがある。PhysicsX LPMを使えば、既存の7ケースのデータでFine-tuneし、100パターンのCamber×Flap組み合わせを15分で評価できる。

### 背景理論

LPMが実現する**転移学習**は、人間のエンジニアが「F1車両の空力経験を小型車に応用できる」のと同じ概念だ。「翼の周囲の流れは基本的に同じ方程式に従う」という物理的な普遍性を、モデルの重みとして内部表現している。これにより、5ケース程度のドメイン固有データで精度が確保できる。

### 実際に動くコードと手順

上記コードの`training_data`部分を自チームのCFD結果CSVから読み込む形に変更するだけで使える：

```python
import pandas as pd
df = pd.read_csv("cfd_results.csv")   # 列: camber, chord, flap_angle, Cl, Cd
training_data = [
    {"inputs": [row.camber, row.chord, row.flap_angle],
     "outputs": {"Cl": row.Cl, "Cd": row.Cd}}
    for _, row in df.iterrows()
]
```

### Before / After 比較

| 項目 | 従来（CFDのみ） | PhysicsX LPM導入後 |
|------|----------------|-------------------|
| 1設計ループあたりの評価ケース数 | 5〜10ケース | 50〜200ケース |
| 評価1件あたりの時間 | 4〜8時間（CFD） | 10〜30秒（API推論） |
| Fine-tuneに必要なCFDデータ数 | — | 5〜10ケースで十分 |
| サロゲートの再利用性 | 年毎に廃棄 | IDで永続保存・再利用可能 |
| 設計領域のカバレッジ | スポット探索 | 全域パレートフロント可視化 |

### 学生チームが今すぐ試せる最初のステップ

1. PhysicsXの無料トライアルに登録（https://www.physicsx.ai）
2. 今年度のCFDケースを5件CSVに整理する
3. 上記コードのStep 1を実行してFine-tuneを起動する

## よくあるエラーと対処

| エラー | 原因 | 対処 |
|--------|------|------|
| `401 Unauthorized` | APIキー誤り or 期限切れ | PhysicsXポータルでキーを再発行する |
| `model_type not found` | モジュール名が誤り | `/v1/models`でモデル一覧を確認してから指定する |
| Fine-tuneが収束しない | データ数不足または外れ値含む | CFD結果の物理的整合性を確認後、10ケース以上に増やす |
| Cl予測誤差が10%超 | 形状パラメータの次元が少ない | アタック角・スパン方向コード分布も追加して次元を増やす |

## 今週の学生チームへの宿題

**今年度のCFDケースを5つ選んでPhysicsXの無料トライアルにアップロードし、最もCl/Cdが良い設計をAPIで探索してみてください。** 手動比較していた時間の1/10以下で答えが出ます。
