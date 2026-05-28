---
title: "サスペンションハードポイントをRLが自動最適化——Volvo×ChalmersのSAE論文が示す設計工数50%削減の実装手順"
date: 2026-05-28
category: "Race Engineering Use Cases"
tags: ["強化学習", "サスペンション設計", "車両ダイナミクス", "VI-CarRealTime", "PPO", "ハードポイント最適化"]
tool: "VI-CarRealTime"
official_url: "https://saemobilus.sae.org/articles/find-optimal-suspension-kinematics-targets-vehicle-dynamics-using-reinforcement-learning-10-10-01-0002"
importance: "high"
summary: "「どのハードポイント座標を選べば、目標とするロールセンター高さとキャスタートレールが両立するか」——この逆問題を強化学習で解いた研究がSAE International Journal of Vehicle Dynamics, Stability, and NVH（2026年）に掲載された。Volvo Cars×Chalmers大学の共同研究で、従来の多目的最適化より収束速度が大幅に向上し、概念設計フェーズの検討工数50%削減を実証。"
---

## はじめに

レース車両やスポーツカーのサスペンション設計で最も時間を食う工程の一つが、**ハードポイント座標の初期目標値設定**だ。ロールセンター高さ・キャンバーゲイン・キャスタートレール・アンチダイブ率——これらのキネマティクス特性は複数のハードポイント座標が絡み合った非線形系であり、「ロールセンターを下げたい、でもアンチスクワットを確保したい」という相反する要求をすべて満足する座標セットを手動で探すと、ベテランエンジニアでも1〜2週間かかる。多目的最適化（NSGA-II等）を使っても、初期値の設定感度が高く再現性に乏しい。

---

## RL サスペンション最適化とは

Volvo Cars AB と Chalmers 工科大学（スウェーデン）の共同研究として、SAE International Journal of Vehicle Dynamics, Stability, and NVH 第10巻第1号（2026年、DOI: 10.4271/10-10-01-0002）に掲載。著者は Yansong Huang、Max Boerboom、Krister Wolff、Bengt Jacobson。

**アプローチの核心**：RL エージェントにサスペンションのハードポイント座標（行動）を与え、達成された車両ダイナミクス特性（ロールセンター高さ、キャンバーゲイン等）が目標値にどれだけ近いかで報酬を与える。エージェントは VI-CarRealTime（Adams/Car互換の商用MBSソフト）と繰り返し対話しながら最適な座標を探索する。

**既存手法との違い**：

- NSGA-II等の進化的アルゴリズム → 高次元空間で大量評価が必要、初期値依存が強い
- DOE + サロゲートモデル → 実験計画の設計に専門知識が必要
- RL → シミュレーション環境と対話しながら自律的に探索、初期値不要

ケーススタディは Volvo XC60 のフロントサスペンション（ダブルウィッシュボーン）で実施された。

---

## 実際の動作：ステップバイステップ

### Step 1：状態空間と行動空間を定義する

```python
# 状態空間：現在のキネマティクス特性値（目標との差分）
# 行動空間：調整するハードポイント座標の増分

import numpy as np
from gymnasium import spaces

class SuspensionEnv:
    """サスペンションキネマティクス最適化RL環境（概念実装）"""
    
    def __init__(self):
        # 観測：各キネマティクス特性の目標値からの偏差
        # [roll_center_height_err, camber_gain_err, caster_trail_err,
        #  anti_dive_err, toe_change_err]
        self.observation_space = spaces.Box(
            low=-1.0, high=1.0, shape=(5,), dtype=np.float32
        )
        
        # 行動：5つのハードポイントのX/Y/Z座標を±5mm の範囲で調整
        self.action_space = spaces.Box(
            low=-5.0, high=5.0, shape=(15,), dtype=np.float32
        )
        
        # 現在のハードポイント座標（mm）
        self.hardpoints = np.array([
            [100.0, 350.0, 280.0],   # UCA アウター
            [200.0, 400.0, 150.0],   # LCA アウター
            [-150.0, 380.0, 200.0],  # タイロッド エンド
            [50.0, 320.0, 300.0],    # ショック アッパー
            [-200.0, 410.0, 140.0],  # LCA インナー後
        ])
        
        # 目標キネマティクス値
        self.targets = {
            "roll_center_height": 80.0,   # mm（静止時）
            "camber_gain": -0.8,           # deg/100mm bump
            "caster_trail": 25.0,          # mm
            "anti_dive": 20.0,             # %
            "toe_change": 0.05,            # deg/100mm bump
        }
```

### Step 2：報酬関数を設計する

```python
def compute_reward(self, kinematics_result: dict) -> float:
    """
    各キネマティクス特性の目標値への近さを報酬に変換。
    重み付き2乗誤差の負値を報酬とし、目標に近いほど高報酬。
    """
    weights = {
        "roll_center_height": 2.0,   # 最重要
        "camber_gain": 1.5,
        "caster_trail": 1.0,
        "anti_dive": 0.8,
        "toe_change": 0.5,
    }
    
    total_error = 0.0
    for key, weight in weights.items():
        target = self.targets[key]
        actual = kinematics_result[key]
        # 正規化誤差
        normalized_err = (actual - target) / abs(target + 1e-6)
        total_error += weight * normalized_err ** 2
    
    reward = -total_error
    
    # ボーナス：全特性が目標の±5%以内に入ったら大きなボーナス
    all_within_5pct = all(
        abs((kinematics_result[k] - self.targets[k]) / (self.targets[k] + 1e-6)) < 0.05
        for k in self.targets
    )
    if all_within_5pct:
        reward += 10.0
    
    return reward
```

### Step 3：PPO エージェントで学習する

```python
# stable-baselines3 を使った標準的な実装
from stable_baselines3 import PPO

env = SuspensionEnv()

model = PPO(
    "MlpPolicy",
    env,
    learning_rate=3e-4,
    n_steps=2048,
    batch_size=64,
    n_epochs=10,
    gamma=0.99,
    verbose=1
)

# 学習（VI-CarRealTimeとの接続を前提）
model.learn(total_timesteps=100_000)

# 推論：最適なハードポイント調整量を取得
obs = env.reset()
optimal_action, _ = model.predict(obs, deterministic=True)
print("最適ハードポイント調整量（mm）:", optimal_action.reshape(5, 3))
```

---

## Before / After 比較

| 項目 | 従来手法（NSGA-II） | RL最適化（本研究） |
|------|--------------------|-------------------|
| 初期値設定 | エンジニアが経験則で手動設定 | 不要（ランダム初期化） |
| 収束に必要な評価回数 | 5,000〜10,000回 | 2,000〜3,000回（論文値） |
| 全目標同時達成率 | 初期値依存で50〜70% | 安定して80%超（Volvo XC60実証） |
| 設計工数（概念段階） | 1〜2週間 | 3〜5日（約50%削減） |
| 結果の再現性 | 初期値によって変動 | 物理的に妥当な結果に安定収束 |
| 高次元展開（30+パラメータ） | 計算量爆発 | スケールしやすい |

---

## 実践コード例：VI-CarRealTime との接続（Python COM）

```python
import win32com.client  # pywin32

def evaluate_kinematics_vi_carrealtime(hardpoints: np.ndarray) -> dict:
    """
    VI-CarRealTime COM APIでサスペンションキネマティクスを評価する。
    （Windows環境 + VI-CarRealTime ライセンス必須）
    """
    vi = win32com.client.Dispatch("VICarRealTime.Application")
    model = vi.OpenModel(r"C:\Models\XC60_Front.vvdc")
    
    # ハードポイント座標を更新
    hp_names = ["UCA_Outer", "LCA_Outer", "TieRod_End",
                "Shock_Upper", "LCA_Inner_Rear"]
    for i, name in enumerate(hp_names):
        hp = model.Hardpoints(name)
        hp.X = float(hardpoints[i, 0])
        hp.Y = float(hardpoints[i, 1])
        hp.Z = float(hardpoints[i, 2])
    
    # バウンス解析実行（±50mm）
    result = model.RunAnalysis("KnC_Bounce", bounce_range=50)
    
    return {
        "roll_center_height": result.RollCenterHeight,
        "camber_gain":        result.CamberGainPerBump,
        "caster_trail":       result.CasterTrail,
        "anti_dive":          result.AntiDivePct,
        "toe_change":         result.ToeChangePerBump,
    }
```

---

## 注意点・落とし穴

**シミュレーション速度がボトルネック**：PPOの学習には数千〜数万回のシミュレーション評価が必要。VI-CarRealTimeの1解析が2〜5秒かかる場合、学習に数時間〜数十時間要する。**並列環境（`SubprocVecEnv`）でプロセスを並列化すること**が実用化の前提条件。

**幾何学的干渉のチェックが必須**：RLエージェントはハードポイントを物理的に干渉する位置に動かす可能性がある。行動空間に制約（`ClipAction`ラッパー）を設け、干渉チェックを報酬に組み込まないと、最適化が無意味な領域に収束する。

**論文の対象は概念設計段階**：詳細設計（ブッシュ剛性、ジョイント摩擦まで含む高精度モデル）への適用はまだ研究段階。まず静的K&C（Kinematics & Compliance）解析から始めるのが現実的。

---

## 応用：より高度な使い方

**MBD統合**：最適なハードポイントが決まったら、Simulinkの車両ダイナミクスモデル（Vehicle Dynamics Blockset）に座標を自動インポートして閉ループシミュレーションへ移行できる。探索から検証まで完全自動化のパイプラインが構築可能。

**レース用途への展開**：セットアップ変更（スプリングレート、スタビライザーバー）に対するキネマティクス感度を事前にRLで学習させておき、イベント中の地上高変更などに対して「次の最適ハードポイント調整量」をリアルタイム提案するシステムへ発展できる。

---

## 今すぐ試せる最初の一歩

```bash
# 依存パッケージのインストール（VI-CarRealTimeなしでも概念実装は可能）
pip install stable-baselines3 gymnasium numpy

# 最小RLループのテスト（ダミー環境で動作確認）
python3 -c "
from stable_baselines3 import PPO
import gymnasium as gym
env = gym.make('Pendulum-v1')  # 代替環境で概念確認
model = PPO('MlpPolicy', env, verbose=0)
model.learn(1000)
print('PPO学習完了。VI-CarRealTime環境に置き換えて本番適用へ')
"
```
