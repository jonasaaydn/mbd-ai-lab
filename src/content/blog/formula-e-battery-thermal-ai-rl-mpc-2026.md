---
title: "Formula Eで「57℃の壁」を超える——強化学習×MPCでバッテリー熱管理とラップタイムを同時最適化する実装ガイド"
date: 2026-05-29
category: "Race Engineering Use Cases"
tags: ["Formula E", "バッテリー熱管理", "強化学習", "MPC", "エネルギーマネジメント", "ニューラルネット", "最適制御"]
tool: "Python / CasADi / Stable-Baselines3"
official_url: "https://link.springer.com/article/10.1007/s00521-020-04871-1"
importance: "high"
summary: "Formula Eではバッテリー温度57℃が性能の天井であり、熱制約を無視した戦略はパワーカットで致命傷になる。強化学習とモデル予測制御（MPC）を組み合わせた最新手法は、温暖気候のレースで1周あたり0.63秒の改善を実証。再生ブレーキの熱負荷を先読みしてエネルギー配分をリアルタイム最適化するシステムを、MBDエンジニアが実装できる形で解説する。"
---

## はじめに

Formula Eのエンジニアにとって、バッテリー温度管理はレース結果を左右する最大の変数のひとつだ。内燃機関のF1が燃料消費量を管理するように、Formula Eは「電力×熱」の二重制約の中で戦略を組む。バッテリーの最高効率動作温度の上限はおよそ**57℃**——これを超えると保護機能が作動し、利用可能出力が強制的に絞られる。温暖な環境のレースでは、この「57℃の壁」に何度も衝突しながら戦略を組み直す必要がある。従来の経験則ベースの調整では、この動的最適化に限界がある。強化学習とMPCの組み合わせが、この問題への実用的な解として浮上している。

---

## バッテリー熱管理と強化学習の組み合わせとは

Formula Eのエネルギーマネジメントシステム（EMS）の自動化研究は、ケンブリッジ大学・インペリアル・カレッジ・ETH Zürichなど複数の機関から相次いで発表されている。中核となる手法は3種類だ：

1. **ニューラルネット + モンテカルロ木探索（MCTS）**：神経回路網で状態価値を推定しながらMCTSで先読みするハイブリッド手法
2. **強化学習（PPO/DDPG）**：熱・電力制約をペナルティとして組み込んだ連続行動空間のRLエージェント
3. **逐次二次計画法（SQP）によるリアルタイムMPC**：各ラップをレース中にリアルタイム再最適化

これらは単独で使うより**NN+MPC**の二層構成が最も実用的で、車両モデルの物理制約を守りながらパラメータを適応更新できる。

---

## 実際の動作：ステップバイステップ

### Step 1：熱モデルの構築

バッテリーの発熱は再生ブレーキ時に最大化する（駆動時の放電より発熱量が大きい）。まずSimulinkか1Dサーマルモデルで熱応答を同定する：

```matlab
% 簡易バッテリー熱モデル（MATLABで同定）
% T_bat: バッテリー温度 [℃]
% P_regen: 回生電力 [W]
% P_drive: 駆動電力 [W]

dt = 0.1; % サンプリング [s]
R_thermal = 0.05; % 熱抵抗 [℃/W]
C_thermal = 15000; % 熱容量 [J/℃]
T_amb = 30; % 環境温度 [℃]

% 次ステップの温度を計算
P_heat = 0.08 * P_drive + 0.12 * P_regen; % 発熱係数（実測値でキャリブレ）
dT = (P_heat - (T_bat - T_amb) / R_thermal) / C_thermal * dt;
T_bat_next = T_bat + dT;
```

### Step 2：MPCによる1ラップ最適化

SQPソルバー（CasADiを推奨）で熱・エネルギー制約を同時に扱う：

```python
import casadi as ca
import numpy as np

N = 60  # 予測ホライズン（秒）
opti = ca.Opti()

# 決定変数
P_drive = opti.variable(N)    # 各時刻の駆動電力
P_regen = opti.variable(N)    # 各時刻の回生電力

# 状態変数
SoC = opti.variable(N + 1)    # バッテリーSoC
T_bat = opti.variable(N + 1)  # バッテリー温度

# 初期条件
opti.set_initial(T_bat[0], 40.0)  # 初期温度 40℃
opti.set_initial(SoC[0], 1.0)     # 満充電

# 制約：温度上限 57℃
for k in range(N):
    P_heat_k = 0.08 * P_drive[k] + 0.12 * P_regen[k]
    opti.subject_to(T_bat[k+1] == T_bat[k] + 
                    (P_heat_k - (T_bat[k] - 30) / 0.05) / 15000 * 1.0)
    opti.subject_to(T_bat[k+1] <= 57.0)  # 熱制約
    opti.subject_to(SoC[k+1] == SoC[k] - P_drive[k] / 54000 + P_regen[k] / 54000)
    opti.subject_to(SoC[k+1] >= 0.05)    # 残量制約

# 目的関数：ラップタイム最小化（電力最大化）
opti.minimize(-ca.sum1(P_drive))

opti.solver('ipopt')
sol = opti.solve()
print(f"最適駆動電力プロファイル: {sol.value(P_drive)}")
```

### Step 3：強化学習エージェントの訓練

```python
from stable_baselines3 import PPO
import gymnasium as gym

class FormulaEEnv(gym.Env):
    """Formula E エネルギー管理環境"""
    def __init__(self):
        super().__init__()
        # 行動空間：駆動出力比率 [0, 1]
        self.action_space = gym.spaces.Box(low=0.0, high=1.0, shape=(1,))
        # 観測：SoC, T_bat, ラップ残り時間, 現在区間
        self.observation_space = gym.spaces.Box(low=-np.inf, high=np.inf, shape=(4,))

    def step(self, action):
        P_drive = action[0] * 200000  # 最大200kW
        # 熱モデル更新
        self.T_bat += self._heat_model(P_drive)
        # 報酬：速度最大化 - 熱ペナルティ
        reward = P_drive / 1000 - max(0, self.T_bat - 55) * 100
        done = self.lap_done or self.T_bat > 60
        return self._get_obs(), reward, done, False, {}

model = PPO("MlpPolicy", FormulaEEnv(), verbose=1)
model.learn(total_timesteps=500_000)
model.save("formula_e_thermal_agent")
```

---

## Before / After 比較

| 項目 | 従来（経験則ベース） | AI最適化後 |
|------|--------------------|-----------| 
| 温暖気候でのラップタイム差 | 基準 | **0.63秒/ラップ短縮** |
| 熱制約違反（57℃超え） | 発生時にパワーカット | 事前回避で出力を保持 |
| 戦略のリアルタイム更新 | ピットウォールが手動調整 | SQPで各ラップ自動再最適化 |
| MCTS戦略のラップタイム改善 | 基準 | **0.25%改善、分散26%低減** |
| エンジニアの判断サポート | 経験＋テレメトリ目視 | AI推薦値＋残り余裕温度を提示 |

研究では再生ブレーキ時の発熱が駆動放電時より著しく大きいことが確認されており、ブレーキゾーンでの回生量を絞ることで温度上昇を抑制しながら戦略的にSoCを保持できることが示された。

---

## 注意点・落とし穴

**実レース環境では気温・サーキットレイアウトが毎戦異なる。** 同じエージェントを南アフリカのケープタウン（涼しい）とサウジアラビアのジェッダ（高温）に使い回すと、熱制約の余裕が大きく異なる。モデルのオンライン再キャリブレーションか、気温を観測変数に加えたドメイン適応が必要だ。

また、**FIAのGen3 Evo規則では最大出力350kW（予選）・300kW（レース）**という制約があり、熱管理と出力制約を同時にMPC内に組み込まないと実用性がない。シミュレーション段階では自由に設定できても、規則パラメータの反映を忘れずに。

---

## 応用：より高度な使い方

**デジタルツインとの組み合わせ**がプロチームの最前線だ。Michelin Simulation ServicesはFormula Eチーム向けにバッテリー熱シミュレーションサービスを提供しており、Simulink/AMESimで構築した熱モデルをMPCの内部モデルとして使うアーキテクチャが採用されている。FMUエクスポートを使えばMATLABとPythonのSQPソルバーをco-simulationとして繋げることができる。

スーパーフォーミュラやスーパーGT EVクラスなど国内カテゴリへの応用も活発化しており、同様の熱管理AIフレームワークが下位カテゴリにも波及し始めている。

---

## 今すぐ試せる最初の一歩

CasADiとStable-Baselines3を5分でインストールして熱MPCを動かす：

```bash
pip install casadi stable-baselines3 gymnasium numpy

# Pythonで最小限の熱MPCを動かす（前述のStep 2コードを保存後）
python formula_e_mpc.py
# → 最適電力プロファイルが出力され、温度が57℃を超えないことを確認できる
```
