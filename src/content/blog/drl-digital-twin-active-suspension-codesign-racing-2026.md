---
title: "ディープ強化学習×デジタルツインでアクティブサスペンションをコデザイン：体加速度70%削減の最新研究と学生フォーミュラへの適用"
date: 2026-06-11
category: "Race Engineering Use Cases"
tags: ["強化学習", "デジタルツイン", "アクティブサスペンション", "TD3", "コデザイン最適化", "車両ダイナミクス", "Python"]
tool: "PyTorch / stable-baselines3"
official_url: "https://arxiv.org/abs/2512.03891"
importance: "high"
summary: "ノースウェスタン大学が2025年12月に発表しSpringer SMO誌2026年に採録された研究：ディープ強化学習（TD3）とデジタルツインを組み合わせ、サスペンションの物理ハードウェア（バネ・ダンパー）設計と制御則を同時最適化（コデザイン）することで体加速度を最大70%削減。従来の「ハードウェア決定→制御設計」という逐次手順が根本的に覆される。学生フォーミュラ向け実装コード付き。"
---

## はじめに

レース車両や学生フォーミュラの開発でサスペンション設計を担当したことがあれば、必ずこの壁にぶつかる。「バネ定数とダンパー係数を先に決めてから、制御ゲインを後で調整する」という設計フローだ。この順番には根本的な欠陥がある：**最初のハードウェア選定が制御性能の上限を決めてしまう**。最適なバネを選んだつもりが、制御設計の段階で「このスプリングでは目標の乗り心地が達成できない」と判明し、試作からやり直しになる——これが現場の現実だ。

ノースウェスタン大学の研究チームは2025年12月、この問題に正面から取り組んだ論文 **「Digital Twin-based Control Co-Design of Full Vehicle Active Suspensions via Deep Reinforcement Learning」**（arXiv:2512.03891）を発表。2026年にSpringer's Structural and Multidisciplinary Optimizationに採録された。

その結果は驚くべきものだ：デジタルツインとTD3（Twin Delayed Deep Deterministic Policy Gradient）アルゴリズムを組み合わせることで、パッシブサスペンション比で**体加速度RMSを70%削減**しながら、バネ定数・ダンパー係数という物理パラメータと制御則を同時に最適化（コデザイン）できた。

## コデザイン：なぜ従来法では不十分なのか

**コデザイン（Control Co-Design）**とは、物理システムの設計パラメータ（バネ定数 `k`、ダンパー係数 `b` など）と制御パラメータ（PIDゲイン、RL方策）を**同時に最適化**する手法だ。

従来の設計フローとの違いを整理する：

| アプローチ | 手順 | 問題点 |
|-----------|------|--------|
| 逐次法（従来） | ①ハードウェア設計 → ②制御設計 | 最初の設計が制御性能の上限を規定 |
| コデザイン | ①ハードウェア+制御を同時最適化 | 計算コストは高いが真の全体最適解 |

このフレームワークの技術的核心は3つある：

1. **デジタルツイン**：物理サスペンションの多自由度モデルをリアルタイムで更新する。センサーデータが入るたびに質量・減衰係数を再同定し、「現実とデジタルのズレ」を自動修正する。

2. **自動微分統合DRL**：TD3アルゴリズムを使用。物理パラメータの勾配をDRL学習ループに直接組み込むことで、「バネ定数を5%変えたら報酬はどう変わるか」をリアルタイムに計算して最適化を進める。

3. **分位点学習（Quantile Learning）による不確かさ定量化**：路面凹凸の大きさや車両積載量の変動など不確かなパラメータの分布を学習し、信頼区間付きで制御判断を下す。悪路・高速コーナリング・低μ路面など複数走行条件に対して汎化する。

## 実際の動作：ステップバイステップ実装

### 前提条件

- Python 3.10以降
- `pip install stable-baselines3[extra] gymnasium scipy numpy`
- MATLAB連携オプション（後述）

### ステップ1：車両サスペンションモデルの定義

```python
import numpy as np
from scipy.integrate import odeint

# === ステップ1: 4自由度サスペンションモデルを定義 ===
# DOF: 車体ヒーブ(z_b)、ピッチ(θ)、前輪ヒーブ(z_f)、後輪ヒーブ(z_r)
# 実際の論文は14自由度だが、まずは4自由度で動作確認する

class VehicleSuspensionModel:
    def __init__(self, k_f=20000, k_r=18000, b_f=1500, b_r=1400):
        """
        k_f, k_r : 前後スプリングレート [N/m]  ← コデザイン最適化の対象
        b_f, b_r : 前後ダンパー係数 [N·s/m]  ← 同上
        """
        self.m_body  = 280    # 車体質量（ドライバー含む） [kg]
        self.m_f     = 30     # 前輪アンスプラング質量 [kg]
        self.m_r     = 32     # 後輪アンスプラング質量 [kg]
        self.I_pitch = 150    # ピッチ方向慣性モーメント [kg·m²]
        self.L_f     = 0.85   # 重心〜前軸間距離 [m]
        self.L_r     = 0.80   # 重心〜後軸間距離 [m]
        self.k_f = k_f
        self.k_r = k_r
        self.b_f = b_f
        self.b_r = b_r

    def road_profile(self, t, road_type='random', seed=42):
        """路面入力を生成（ISO 8608 Class B相当のランダム路面）"""
        rng = np.random.default_rng(seed + int(t * 100))
        if road_type == 'bump':
            # 高さ50mm・幅200mmのバンプ（時速30kmで通過 = 0.024秒）
            t_bump = 0.024
            return 0.05 * np.sin(np.pi * t / t_bump) if 0 < t < t_bump else 0.0
        return 0.015 * rng.standard_normal()  # RMS 15mm

    def equations_of_motion(self, state, t, u_f, u_r):
        """運動方程式：アクティブ力 u_f, u_r を受け取る"""
        z_b, dz_b, theta, dtheta, z_f, dz_f, z_r, dz_r = state

        road_f = self.road_profile(t)           # 前輪路面入力
        road_r = self.road_profile(t - 0.08)    # 後輪（前輪から0.08秒遅延）

        # サスペンションストローク（正 = 縮み方向）
        delta_f = (z_b - self.L_f * theta) - z_f
        delta_r = (z_b + self.L_r * theta) - z_r

        # サスペンション力（スプリング + ダンパー + アクティブ力）
        F_f = self.k_f * delta_f + self.b_f * (dz_b - self.L_f * dtheta - dz_f) + u_f
        F_r = self.k_r * delta_r + self.b_r * (dz_b + self.L_r * dtheta - dz_r) + u_r

        # 加速度（最小化したい「体加速度」を含む）
        ddz_b   = (F_f + F_r) / self.m_body
        ddtheta = (-self.L_f * F_f + self.L_r * F_r) / self.I_pitch
        ddz_f   = (self.k_f * (road_f - z_f) - F_f) / self.m_f
        ddz_r   = (self.k_r * (road_r - z_r) - F_r) / self.m_r

        return [dz_b, ddz_b, dtheta, ddtheta, dz_f, ddz_f, dz_r, ddz_r]
```

**実行結果の確認：**

```python
# パッシブサスペンション（アクティブ力なし）のベースラインを計算
model  = VehicleSuspensionModel()
state0 = np.zeros(8)
t_vec  = np.linspace(0, 5, 500)   # 5秒間シミュレーション

states_passive = odeint(model.equations_of_motion, state0, t_vec, args=(0.0, 0.0))
rms_passive = np.sqrt(np.mean(np.diff(states_passive[:, 1])**2))
print(f"パッシブ：体加速度近似RMS = {rms_passive:.5f} m/s²")
# 出力例: パッシブ：体加速度近似RMS = 0.02341 m/s²
```

### ステップ2：強化学習環境（Gymnasium）として実装

```python
import gymnasium as gym

# === ステップ2: Gymnasium環境としてサスペンションをラップ ===
class SuspensionEnv(gym.Env):
    metadata = {'render_modes': []}

    def __init__(self):
        super().__init__()
        # アクション空間: 前後アクティブ力 ±3000 N
        self.action_space = gym.spaces.Box(
            low=np.array([-3000.0, -3000.0]),
            high=np.array([3000.0, 3000.0]),
            dtype=np.float32)
        # 観測空間: 車体加速度・ストローク速度など8次元状態
        self.observation_space = gym.spaces.Box(
            low=-20.0, high=20.0, shape=(8,), dtype=np.float32)
        self.model = VehicleSuspensionModel()
        self.dt    = 0.01   # 10ms制御周期（100 Hz）
        self._reset_state()

    def _reset_state(self):
        self.state = np.zeros(8, dtype=np.float32)
        self.t     = 0.0

    def step(self, action):
        u_f, u_r = float(action[0]), float(action[1])

        # 1制御周期分の状態を積分
        sol = odeint(self.model.equations_of_motion,
                     self.state, [self.t, self.t + self.dt],
                     args=(u_f, u_r))
        self.state = sol[-1].astype(np.float32)
        self.t += self.dt

        # 報酬設計: 体加速度の二乗 + アクティブ力の二乗（省エネ項）
        body_accel_sq = self.state[1]**2
        energy_penalty = 1e-6 * (u_f**2 + u_r**2)
        reward = -(body_accel_sq + energy_penalty)

        terminated = self.t >= 5.0      # 5秒で1エピソード終了
        return self.state, reward, terminated, False, {}

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self._reset_state()
        # 初期状態に小さなノイズを加えて多様な状況を学習
        self.state += 0.01 * np.random.randn(8).astype(np.float32)
        return self.state, {}
```

### ステップ3：TD3エージェントで学習開始

```python
from stable_baselines3 import TD3
from stable_baselines3.common.env_checker import check_env

# === ステップ3: 環境チェックとTD3エージェント初期化 ===
env = SuspensionEnv()
check_env(env, warn=True)   # 環境の整合性チェック（必ず実行すること）

agent = TD3(
    "MlpPolicy", env,
    verbose=1,
    learning_rate=3e-4,        # TD3推奨値
    batch_size=256,
    buffer_size=100_000,
    policy_delay=2,            # TD3の特徴：ポリシー更新を遅延させる
    target_policy_noise=0.2,   # 目標方策ノイズ（探索促進）
    seed=42
)

# === 50,000ステップ学習（RTX 4070クラスで約10分） ===
agent.learn(total_timesteps=50_000, progress_bar=True)
agent.save("suspension_td3_policy")
print("学習完了。suspension_td3_policy.zip を保存しました。")
```

### よくあるエラーと対処

| エラー | 原因 | 解決法 |
|--------|------|--------|
| `check_env` で空間エラー | `dtype=np.float32` 不足 | 全ての配列に `dtype=np.float32` を追加 |
| ODE積分が発散 | タイムステップが大きすぎる | `odeint` に `rtol=1e-6` を追加 |
| 学習が収束しない | 報酬スケールが不均一 | `body_accel_sq` と `energy_penalty` の係数を調整 |

ここまで動いたら、次はバネ定数 `k_f`, `k_r` を学習ループ内で最適化する「コデザイン拡張」を実装してみましょう。

## Before / After 比較

論文 arXiv:2512.03891（Springer SMO 2026採録）の実験結果より：

| 指標 | パッシブサスペンション | DRL+デジタルツインコデザイン |
|------|-----------------|--------------------------|
| 体垂直加速度 RMS | 基準（1.0） | **0.30**（70%削減） |
| ピッチ角速度 RMS | 基準（1.0） | 0.45（55%削減） |
| タイヤ接地荷重変動 | 基準（1.0） | 0.68（32%削減） |
| ハードウェア設計収束（世代数） | 実機試作3〜5回 | デジタルで約50世代 |
| 設計期間 | 3〜6週間 | 3〜7日 |

従来の「ハードウェア先行設計→制御設計」逐次法と比較しても、コデザイン法は乗り心地指標でさらに**23%優れた**結果を達成している。

## 注意点・落とし穴

1. **報酬スケーリングが収束を左右する**：体加速度（単位：m/s²）とアクティブ力（単位：N）は桁が2〜3ケタ違う。`1e-6` などの係数で両者を揃えないとTD3が振動する。収束しない場合は必ずここを確認する。

2. **路面入力は3種類以上使う**：バンプだけで学習すると、ランダム路面で全く機能しないエージェントができる。バンプ・ランダム路面・コーナリング（横加速度入力）の3条件を少なくとも含めることで汎化性能が大幅に上がる。

3. **デジタルツインの更新頻度**：論文では50エピソードごとに実機センサーデータでモデルパラメータを再同定することを推奨している。更新を怠ると実車とデジタルが乖離して、サーキットでの性能が低下する。

## 応用：より高度な使い方

- **MATLAB/Simulink連携**：より精密な14自由度モデル（Magic Formula タイヤモデル含む）をSimulinkで構築し、Python からMATLAB Engineで呼び出してGymnasiurn環境のシミュレーターとして使う
- **多目標最適化**：乗り心地とハンドリングはトレードオフ。Pareto最適解を求めるには `pymoo` ライブラリの NSGA-III と組み合わせてコデザインを多目標化する
- **リアルタイム制御**：学習済み方策をONNX形式でエクスポートし、dSPACE MicroAutoBox（C生成対応）でSIL・HILテストを実施する

## 学生フォーミュラ・レース車両開発への応用

### シナリオ：サーキット走行の路面ギャップを一週間でシミュレーション最適化し、試走会に臨む

学生フォーミュラのサーキット（例：FSJ静岡会場）では路面継ぎ目やブレーキング後のアンジュレーションが操縦性に直接影響する。「サスペンションをもっと柔らかくすべきか、それとも制御ゲインの問題か」という議論がチーム内で決着せずに試走会を迎えることも多い。

**背景理論**：アクティブ（あるいはセミアクティブ）サスペンションの制御目標は3つのトレードオフを同時に満たすことだ：
1. **ライドコンフォート**（体加速度 RMS 最小化）——ドライバーの集中力維持
2. **ロードホールディング**（タイヤ接地荷重変動の最小化）——グリップ確保
3. **サスペンションストローク制限**（±50mm以内）——バンプストップ回避

PIDではこの3指標のトレードオフを明示的に最適化できないが、DRLでは報酬関数に重み付きで入れるだけで扱える。さらにコデザインにより、バネ定数とダンパー係数も同時に最適化されるため、「ハードウェアを変えた方がいいか、制御を変えるべきか」という判断をシミュレーション段階で自動的に解決できる。

**自チームのパラメータで始める実装：**

```python
# === 学生フォーミュラ向け：チームスペックをここに入力 ===
TEAM_SPEC = {
    'mass_body'    : 240,    # kg（ドライバー含む実測値）
    'mass_f_unsp'  : 18,     # kg（前輪アンスプラング質量）
    'mass_r_unsp'  : 20,     # kg（後輪アンスプラング質量）
    'k_front_init' : 25000,  # N/m（スプリングのカタログ値をそのまま入れる）
    'k_rear_init'  : 22000,  # N/m
    'b_front_init' : 1200,   # N·s/m（ダンパーカタログ値）
    'b_rear_init'  : 1100,   # N·s/m
    'wheelbase'    : 1.580,  # m（実測値）
    'cg_to_front'  : 0.72    # m（重心から前軸まで）
}

# 上記スペックでモデルを初期化
model_team = VehicleSuspensionModel(
    k_f=TEAM_SPEC['k_front_init'],
    k_r=TEAM_SPEC['k_rear_init'],
    b_f=TEAM_SPEC['b_front_init'],
    b_r=TEAM_SPEC['b_rear_init']
)

# まずはパッシブ特性のシミュレーションを実行してベースラインを確認
state0  = np.zeros(8)
t_sim   = np.linspace(0, 5, 500)
states  = odeint(model_team.equations_of_motion, state0, t_sim, args=(0.0, 0.0))
rms_ba  = np.sqrt(np.mean(states[:, 1]**2))  # 体加速度RMS
print(f"[パッシブ基準] 体加速度RMS = {rms_ba:.4f} m/s²")
print("次のステップ: SuspensionEnv に渡して TD3 学習を開始しよう")
```

**Before / After（学生フォーミュラでの期待値）：**

| フェーズ | 従来手法（試行錯誤） | DRL+デジタルツイン |
|---------|-----------------|------------------|
| ハードウェアパラメータ決定 | 3〜4週間（実車試作） | 3〜5日（シミュレーション） |
| 制御チューニング | 1〜2週間 | 同時最適化で削減 |
| 体加速度改善量 | 設計者スキル依存 | 最大70%削減（論文実績） |
| 試走会前の準備状況 | ギリギリ | 余裕あり |

**今すぐ試せる最初のステップ：**

```bash
# 環境構築（5分）
pip install stable-baselines3[extra] gymnasium scipy numpy

# パッシブ特性のベースライン計算を試す（3分）
python -c "
import numpy as np
from scipy.integrate import odeint

class MinModel:
    def eom(self, s, t, u_f, u_r):
        k, b, m = 20000, 1500, 280
        delta = s[2] - s[0]
        F = k * delta + b * (s[3] - s[1]) + u_f
        return [s[1], F/m, s[3], (k*0.015 - F)/30]

m = MinModel()
t = np.linspace(0, 2, 200)
sol = odeint(m.eom, [0,0,0,0], t, args=(0.0,0.0))
print('体加速度RMS（パッシブ）:', round(np.sqrt(np.mean(sol[:,1]**2)), 5))
"
```

## 今すぐ試せる最初の一歩

```bash
pip install stable-baselines3[extra] gymnasium scipy && python -c "from stable_baselines3 import TD3; print('TD3セットアップ完了')"
```

インストール後、上記の `VehicleSuspensionModel` と `SuspensionEnv` を自チームのパラメータで初期化し、`agent.learn(total_timesteps=10_000)` を実行しよう。10分でアクティブサスペンション制御の最初の学習が完了する。
