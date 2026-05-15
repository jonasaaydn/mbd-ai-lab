---
title: "テレメトリからPacejka係数を自動同定するPINN——Deep Dynamicsが変えるタイヤモデリングの現場"
date: 2026-05-15
category: "Race Engineering Use Cases"
tags: ["PINN", "タイヤモデル", "Pacejka", "機械学習", "車両ダイナミクス", "Python", "オープンソース"]
tool: "Deep Dynamics"
official_url: "https://github.com/linklab-uva/deep-dynamics"
importance: "high"
summary: "ラップタイムに直結するPacejka Magic Formulaの係数同定は、今も「熟練エンジニアの勘」に頼る部分が大きい。バージニア大学が公開したPINN「Deep Dynamics」は、走行テレメトリから係数を自動学習し、物理的な妥当性も保証する。"
---

## タイヤモデリングは今でも「職人技」

レース車両のシミュレーションで最も精度に影響するのがタイヤモデルだ。Pacejka Magic Formulaのような半経験式モデルは多くのチームが採用しているが、係数（Cx、Bx、Dx、Ex……）を正確に決めるには、専用タイヤ試験機（タイヤリグ）でのデータ採取と熟練エンジニアによる手動フィッティングが不可欠だった。

問題は3つある。

1. **タイヤリグデータは高価で入手困難**：F1以外のカテゴリでは外注コストが障壁になる
2. **実車とリグの乖離**：リグデータで同定した係数が実走行で合わないケースが頻発する
3. **タイヤ摩耗・温度変化への非対応**：静的に同定した係数はスティントを通じた変化に追従できない

これを根本から変えるアプローチが、バージニア大学Linklab開発の**Deep Dynamics**と、ビンガムトン大学が発展させた**FTHD（Fine Tuning Hybrid Dynamics）**だ。

---

## Deep Dynamics：Physics-Informed Neural Networkとは何か

Deep DynamicsはPINN（Physics-Informed Neural Network）の一種で、**神経回路網の出力が必ず物理モデルと整合するよう制約をかける**。具体的には以下の構造をとる。

```
走行テレメトリ（速度、加速度、ステアリング角、ヨーレート等）
        ↓
    Deep Dynamics PINN
        ↓         ↓
【学習ブロック】   【Physics Guard】
タイヤ係数を推定   推定値が物理的有効域内か監視
  (Bx, Cx, Dx…)  違反時は勾配をクリッピング
        ↓
 車両ダイナミクス予測（横加速度、ヨーレート）
```

**Physics Guard層**が最大の特徴だ。純粋なニューラルネットは学習データの外挿で物理的にあり得ない値（負のコーナリングスティフネス等）を出力することがある。Physics Guardはパラメータを物理的有効範囲にクランプする制約層として機能し、これがあることで実用展開が可能になる。

### 検証：Indy Autonomous Challenge（時速280km超）

論文での検証はおもちゃデータではない。Indy Autonomous Challenge（IAC）の全スケールレーシングカーAV-21から取得したテレメトリで学習・検証している。280km/hを超える高速コーナリングでも、従来手法（ガウス過程回帰など）を有意に下回る予測誤差を達成している。

---

## FTHD：少ないデータでも使える実用拡張版

Deep Dynamicsの課題は「そこそこのデータ量が必要」な点だった。実際のレースチームでは、クリーンな高荷重データを大量に取れる機会は限られている。

ビンガムトン大学のFTHD（Fine Tuning Hybrid Dynamics）はこれを解決する。

| 比較項目 | Deep Dynamics | FTHD |
|--------|-------------|------|
| 学習データ量 | 多め | **少量でも高精度** |
| 損失関数 | 教師あり損失のみ | **教師あり＋物理残差** |
| センサーノイズ対応 | 標準 | **EKF内蔵（EKF-FTHD）** |
| 公開ライセンス | MIT | MIT |

FTHDは物理残差（車両運動方程式の残差）を損失関数に直接組み込むことで、少ないデータからより汎化する係数推定を実現した。さらにEKF-FTHDバリアントはExtended Kalman Filterを組み合わせ、実際のセンサーノイズに対してロバストな推定が可能だ。

---

## 実際に動かす：セットアップとサンプルコード

```bash
# Deep DynamicsのGitHubリポジトリをクローン
git clone https://github.com/linklab-uva/deep-dynamics.git
cd deep-dynamics
pip install -e .

# FTHDの場合
git clone https://github.com/Binghamton-ACSR-Lab/FTHD.git
cd FTHD
pip install -r requirements.txt
```

データ準備のキーポイントを示す。テレメトリのCSVから学習データを構築する最小サンプルだ。

```python
import numpy as np
import torch
from deep_dynamics.model.models import DeepDynamicsModel

# テレメトリCSVを読み込む（最低限必要なチャンネル）
# columns: speed_x, speed_y, yaw_rate, ax, ay, steer_angle, throttle, brake
telem = np.loadtxt("telemetry_session01.csv", delimiter=",", skiprows=1)

# 入力特徴：速度・加速度・操舵量
X = telem[:, [0, 1, 2, 4, 5, 6, 7]]  # [vx, vy, r, ay, delta, throttle, brake]
# 出力ターゲット：次ステップのヨーレート・横速度
Y = telem[1:, [1, 2]]                 # [vy_next, r_next]

# DeepDynamicsモデルを初期化（Physics Guard込み）
model = DeepDynamicsModel(
    input_size=7,
    output_size=2,
    num_dynamic_params=9,   # Pacejka係数の数（front/rear合計）
    physics_guard=True      # これがないと物理制約が外れる
)

# 学習
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
for epoch in range(500):
    loss = model.training_step(X, Y)
    optimizer.zero_grad(); loss.backward(); optimizer.step()

# 推定されたPacejka係数を確認
params = model.get_dynamic_params()
print("推定Pacejka係数（前輪）:")
print(f"  Bf={params['Bf']:.4f}, Cf={params['Cf']:.4f}, Df={params['Df']:.4f}")
print("推定Pacejka係数（後輪）:")
print(f"  Br={params['Br']:.4f}, Cr={params['Cr']:.4f}, Dr={params['Dr']:.4f}")
```

---

## AIあり・なしの比較

| 指標 | 従来の手動フィッティング | Deep Dynamics + FTHD |
|------|-------------------|----------------------|
| データソース | タイヤリグ（専用装置） | 走行テレメトリ（既存） |
| 係数同定時間 | 数日〜1週間 | **数時間（学習込み）** |
| 実車との整合 | リグ→実車の乖離あり | **実走データで直接学習** |
| 動的更新 | 困難（再リグが必要） | **新セッションデータで再学習可** |
| 追加コスト | タイヤリグ外注費用 | **ゼロ（OSS・既存GPU）** |
| Physics Guard | 手動で範囲確認 | **自動（学習中に強制）** |

特にFTHDのEKFバリアントは、実際の計測ノイズ込みのテレメトリで3〜8%の横力予測誤差を達成しており、実務投入に現実的な水準だ。

---

## 注意点・現状の限界

- **適用範囲は定常旋回〜準定常域が主**：過渡的なスピン・グリップ回復領域は現時点の検証が不足
- **タイヤ温度・摩耗は入力特徴に含める必要あり**：ほぼ全てのセッションでタイヤ赤外温度計データが必要（ない場合は精度が落ちる）
- **モデル校正の定期実行が前提**：コンパウンドやタイヤ仕様変更のたびに再学習が必要
- **EKF-FTHDはシングルGPUで30分以内**：レースウィークエンドの夜間バッチ処理に十分間に合う

---

## 今すぐ試せる最初の一歩

1. **FTHDのGitHubをクローン**し、リポジトリ内の `example_data/` に含まれるIACデータで学習を回す（GPU不要、CPU15分で完了）
2. 自チームの走行ログ（速度・加速度・操舵角・ヨーレート）をCSVに整形して入力する
3. 推定されたPacejka係数をSimulinkの車両モデルに入力し、ラップシミュレーターとの一致度を確認する

タイヤリグデータなしで、既存テレメトリからここまでできる時代になっている。知っているチームと知らないチームの差は、次のデータ取得セッションから開き始める。
