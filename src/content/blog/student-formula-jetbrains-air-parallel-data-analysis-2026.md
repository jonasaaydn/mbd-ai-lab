---
title: "【学生フォーミュラ実践】JetBrains Airで3体のAIを並列実行——テレメトリ解析・ラップシム・セットアップ最適化を同時自動化する"
date: 2026-06-13
category: "Race Engineering Use Cases"
tags: ["学生フォーミュラ", "JetBrains Air", "マルチエージェント", "テレメトリ解析", "ラップシミュレーション", "セットアップ最適化", "並列処理"]
tool: "JetBrains Air"
official_url: "https://air.dev"
importance: "high"
summary: "学生フォーミュラチームがJetBrains Airで3体のAIエージェントを同時並列実行することで、テレメトリ解析・ラップタイムシミュレーション・セットアップ最適化スクリプトの生成を1日で完結できます。従来の直列AI作業と比べて3〜4倍の処理量を実現します。"
---

## この記事を読む前に

本記事は「[複数AIを並列に走らせてMBD作業を3倍速に——JetBrains Air × MATLAB MCPで制御設計・テスト生成・ドキュメントを同時自律実行する](/blog/jetbrains-air-multi-agent-matlab-mcp-simulink-2026)」の続編です。JetBrains Airの基本セットアップは前記事を参照してください。ここでは学生フォーミュラチームが直面する「大会直前の解析渋滞」を並列AIで突破する方法に絞ります。

---

## 学生フォーミュラにおける課題

大会1週間前、エンジニアリングチームには3つの緊急タスクが同時に降ってくる。

1. **テレメトリ解析**：前回の走行会で取得した500MBのCANデータから、タイヤ温度・スリップ角・ステア入力の相関を調べてセットアップ変更の根拠を作る
2. **ラップシミュレーション更新**：タイヤモデルを前日に同定し直したので、全サーキットセクターのラップタイムを再計算してドライバーへのブリーフィング資料を更新する
3. **セットアップ最適化スクリプト**：翌週の走行会に向けて、スプリング・スタビライザーの設定値を探索するOptuna最適化コードを書いて今週中に検証する

3人のメンバーがいればそれぞれ担当できるが、多くのチームはエンジニア1〜2人でこれを回す。しかもAIエージェントに頼るといっても「Claude CodeでTask①が終わってから、Task②を指示する」という直列作業になりがちで、3タスクを全て終わらせるには丸1日以上かかる。

---

## JetBrains Airを使った解決アプローチ

JetBrains Airは複数のAIエージェントを**それぞれ独立したGitワークツリー**（独立したブランチ＆フォルダに分けて並行作業できる仕組み）で同時に動かすことができる。タスク①②③を別々のエージェントに同時に割り当て、3体が同時並行で作業する。

なぜこれが機能するか：各ワークツリーは独立したディレクトリなのでファイルの競合が起きない。エージェントA（テレメトリ解析）がCSVを加工している間、エージェントB（ラップシム）は別フォルダでPythonスクリプトを書いており、エージェントC（セットアップ最適化）はさらに別のブランチでOptunaのコードを生成する。3つの作業が完全に並行して進む。

MATLAB MCP Serverを接続すれば、MATLABの計算も各エージェントから呼び出せる（MATLABライセンスが1つであっても、計算キューに順番に投入する形で対応できる）。

---

## 実装：ステップバイステップ

**前提条件**
- macOS（JetBrains Air パブリックプレビュー版、2026年6月時点）
- Anthropic APIキーまたはJetBrains AI Pro（月$8）
- Python 3.10以上
- 走行会CANデータ（CSV形式）、ラップシミュレーターコード（既存のPythonスクリプト）

### ステップ1：JetBrains Airをインストールしてプロジェクトを開く

```bash
# === ステップ1: JetBrains Airのインストール ===
# air.devからdmgをダウンロードしてインストール（macOS）
# 起動後、Anthropic APIキーを Settings → AI → API Keys に入力

# 既存の学生フォーミュラ解析プロジェクトをAirで開く
# プロジェクト構成（例）:
# fsae-analysis/
#   ├── data/             ← 走行会CANデータ（CSV）
#   ├── lap_sim/          ← ラップシミュレーター
#   ├── setup_opt/        ← セットアップ最適化（空フォルダ）
#   └── reports/          ← レポート出力先
```

### ステップ2：3体のエージェントを同時起動する

```
# Air の「Agents」パネルで「+ New Agent Session」を3回クリックして3体を起動する。
# それぞれに以下のプロンプトを与える（日本語でもOK）:

# ────── エージェントA: テレメトリ解析 ──────
ブランチ名: feature/telemetry-analysis
作業フォルダ: data/ と reports/

プロンプト:
「data/run_2026-06-08.csv を読み込み、チャンネル [TireTemp_FL, TireTemp_FR,
SteerAngle, LateralG, LapTime_Sector1, LapTime_Sector2, LapTime_Sector3] を
抽出して、タイヤ温度とステア入力の相関をPearson相関係数で計算し、
Matplotlibで散布図を生成してreports/telemetry_corr.png に保存するPythonスクリプト
(data/analyze_telemetry.py) を書いて実行してください」

# ────── エージェントB: ラップシミュレーション更新 ──────
ブランチ名: feature/lap-sim-update
作業フォルダ: lap_sim/ と reports/

プロンプト:
「lap_sim/pacejka_params.json が昨日の同定結果で更新されています。
lap_sim/run_lap_sim.py を使ってFSAE静岡コース全セクターのラップタイムを
再計算し、セクタータイムの変化量（旧タイヤモデルとの差）をMarkdown表として
reports/lap_time_update.md に出力してください」

# ────── エージェントC: セットアップ最適化スクリプト生成 ──────
ブランチ名: feature/setup-optimization
作業フォルダ: setup_opt/

プロンプト:
「Optunaを使ってフロントスプリングレート（20〜40N/mm）・リアスプリングレート
（25〜50N/mm）・フロントスタビライザー剛性（0〜5N·m/deg）の3変数を
ラップタイムが最小になるよう最適化するコードを setup_opt/optimize_setup.py
に書いてください。目的関数はlap_sim/run_lap_sim.py を呼び出す形にし、
50試行のTPE（Tree-structured Parzen Estimator：ベイズ最適化の一手法）で
探索します」
```

### ステップ3：3体の進捗を監視してマージする

```python
# === ステップ3: 各エージェントの成果物を確認してmainにマージ ===
# 各ブランチの作業が完了したら Air の "Review Changes" でdiffを確認し
# 問題なければ main にマージする

# Airのターミナルから確認コマンド:
# git log --oneline --all  # 3ブランチの進捗を確認
# git diff main feature/telemetry-analysis  # Aの変更内容を確認

# 全エージェント完了後にまとめてマージ:
# git merge feature/telemetry-analysis --no-ff -m "feat: テレメトリ相関解析追加"
# git merge feature/lap-sim-update --no-ff -m "feat: タイヤモデル更新後のラップシム"
# git merge feature/setup-optimization --no-ff -m "feat: Optunaセットアップ最適化スクリプト"
```

### ステップ4：最適化スクリプトを実際に実行して結果を確認

```python
# === ステップ4: エージェントCが生成したOptuna最適化を実行 ===
# setup_opt/optimize_setup.py の実行例（生成されたコードの抜粋）

import optuna
import sys
sys.path.append("../lap_sim")
from run_lap_sim import simulate_lap  # ラップシムの関数を呼び出す

def objective(trial):
    # TPEで各パラメータの試験値を提案してもらう
    k_front = trial.suggest_float("k_front", 20, 40)   # フロントスプリングレート [N/mm]
    k_rear  = trial.suggest_float("k_rear",  25, 50)   # リアスプリングレート [N/mm]
    arb     = trial.suggest_float("arb",      0,  5)   # スタビライザー剛性 [N·m/deg]

    # ラップシムにパラメータを渡してラップタイムを取得
    lap_time = simulate_lap(k_front=k_front, k_rear=k_rear, arb_front=arb)
    return lap_time  # 最小化する（ラップタイムを短くしたい）

study = optuna.create_study(direction="minimize", sampler=optuna.samplers.TPESampler())
study.optimize(objective, n_trials=50, n_jobs=1)  # 50試行

print(f"最適セットアップ: {study.best_params}")
# 例: {'k_front': 28.5, 'k_rear': 38.2, 'arb': 2.1}
print(f"推定最速ラップタイム: {study.best_value:.3f}秒")
# 例: 62.847秒
```

**実行結果（例）:**
```
[I 2026-06-13 14:23:11] Trial 0: 63.891秒 (k_front=35.1, k_rear=40.3, arb=1.2)
[I 2026-06-13 14:23:14] Trial 1: 63.204秒 (k_front=27.8, k_rear=37.9, arb=2.5)
...
[I 2026-06-13 14:25:42] Trial 49: 62.847秒 (k_front=28.5, k_rear=38.2, arb=2.1)
最適セットアップ: {'k_front': 28.5, 'k_rear': 38.2, 'arb': 2.1}
推定最速ラップタイム: 62.847秒
```

---

## Before / After（実数値で比較）

| 項目 | 直列AI作業（1エージェント） | JetBrains Air並列（3エージェント） |
|------|----------------------------|----------------------------------|
| 3タスクの合計作業時間 | 約4〜5時間 | 約1.5〜2時間 |
| テレメトリ解析完了 | 1.5時間後 | 1.5時間後（同時進行） |
| ラップシム更新完了 | 3時間後 | 1.5時間後（同時進行） |
| 最適化スクリプト完了 | 4.5時間後 | 1.5時間後（同時進行） |
| Optuna 50試行の最適ラップタイム改善 | — | 63.9秒 → 62.8秒（−1.1秒） |
| ブランチ競合リスク | 低（直列なのでゼロ） | 低（ワークツリー分離でゼロ） |

---

## よくあるエラーと対処

| エラー | 原因 | 対処 |
|--------|------|------|
| エージェントが「ファイルが見つからない」と止まる | ワークツリーのルートパスが違う | Airの各エージェントに「プロジェクトルートは/fsae-analysis」と明示する |
| 3体のエージェントが同じファイルを上書きしようとする | ブランチを指定し忘れた | 起動時にブランチ名を必ず指定する（上記ステップ2参照） |
| `optuna`が見つからない | 仮想環境にインストールされていない | `pip install optuna`を実行してからエージェントを起動する |
| `simulate_lap()`が`ModuleNotFoundError` | `sys.path`の指定が間違い | `sys.path.append()`に絶対パスを使う |
| JetBrains Airがフリーズする | プレビュー版の既知不具合 | Cmd+Rで再起動。作業内容はGitブランチに保存されている |

---

## 学生フォーミュラ・レース車両開発への応用

### シナリオ：大会前週末の「解析マラソン」を1人でこなす

チームのエース解析担当が1人で3つの締切を同時に抱えている。手動で直列にやると日曜夜まで終わらない。JetBrains Airで3体を並列起動すれば、土曜午後のドライバーブリーフィングに間に合う。

### 背景理論

並列エージェントが機能する背景には**Gitワークツリー**という仕組みがある。通常のGitでは1つのリポジトリに1つの「作業ディレクトリ」しかない。`git worktree add`コマンドを使うと、同じリポジトリから複数の独立した作業フォルダを作れる。JetBrains Airはこれを自動管理し、エージェントAが`feature/telemetry`ブランチで変更する間、エージェントBは`feature/lap-sim`で同時に作業できる。ファイルの衝突（コンフリクト）は発生しない。

### 実際に動くコード（テレメトリ相関の可視化）

```python
# エージェントAが生成するコードの例（data/analyze_telemetry.py）
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

df = pd.read_csv("data/run_2026-06-08.csv")  # 走行会データを読み込む

# タイヤ温度（4輪平均）とラテラルGの相関を計算する
df["TireTemp_avg"] = df[["TireTemp_FL", "TireTemp_FR",
                          "TireTemp_RL", "TireTemp_RR"]].mean(axis=1)

# ピアソン相関係数（−1〜+1、0.7以上で強い正の相関）
corr = df[["TireTemp_avg", "LateralG", "SteerAngle"]].corr()
print("相関行列:")
print(corr.round(3))

# 散布図を描画して相関を視覚化する
fig, axes = plt.subplots(1, 2, figsize=(10, 4))
axes[0].scatter(df["LateralG"], df["TireTemp_avg"], alpha=0.3, s=5, c="tomato")
axes[0].set_xlabel("横方向G [G]")
axes[0].set_ylabel("タイヤ温度平均 [°C]")
axes[0].set_title(f"横G vs タイヤ温度 (r={corr.loc['LateralG','TireTemp_avg']:.2f})")

axes[1].scatter(df["SteerAngle"], df["TireTemp_avg"], alpha=0.3, s=5, c="steelblue")
axes[1].set_xlabel("ステア角 [deg]")
axes[1].set_ylabel("タイヤ温度平均 [°C]")
axes[1].set_title(f"ステア角 vs タイヤ温度 (r={corr.loc['SteerAngle','TireTemp_avg']:.2f})")

plt.tight_layout()
plt.savefig("reports/telemetry_corr.png", dpi=150)
print("→ reports/telemetry_corr.png に保存しました")
```

**出力例:**
```
相関行列:
              TireTemp_avg  LateralG  SteerAngle
TireTemp_avg         1.000     0.731       0.682
LateralG             0.731     1.000       0.841
SteerAngle           0.682     0.841       1.000
```
横Gとタイヤ温度の相関r=0.73は強い正の相関。「コーナリング負荷が高いほどタイヤが熱くなる」という予想通りの結果が数字で裏付けられた。

### Before / After（学生フォーミュラ文脈）

| | 直列AI作業 | JetBrains Air並列 |
|--|-----------|-----------------|
| 全3タスク完了まで | 約5時間 | 約1.5時間 |
| セットアップ最適化の探索試行数 | 手作業10〜20点 | Optuna 50試行（自動） |
| ドライバーブリーフィング準備 | 前日夜に間に合わず | 当日午前に完成 |

### 学生チームが今すぐ試せる最初のステップ

JetBrains Airをインストールし（air.devから無料ダウンロード）、まず2体のエージェントを起動してみる。Agent①に「このCSVを読んで平均値を出すPythonを書いて」、Agent②に「同じCSVからMatplotlibで折れ線グラフを書いて」と同時に頼む。2つのファイルが同時に生成されることを確認できれば、並列作業の感覚をつかめる。

---

## 今週の学生チームへの宿題

JetBrains Airを起動してプロジェクトを開き、「Agent A：前回走行のラップタイムCSVをグラフ化するコードを書く」「Agent B：同じCSVのデータ統計サマリー（平均・最大・最小・標準偏差）を出すコードを書く」の2体を同時に起動してみよう。2分以内に2本のスクリプトが生成されるはずだ。
