---
title: "2026年6月第6週AIウィークリー——UQ付きサロゲート論文が急増・Formula E Season 10 AI戦略の集大成・OpenFOAM v13 MLモジュール登場"
date: 2026-06-06
category: "Weekly AI Update"
tags: ["週次まとめ", "不確実性定量化", "Formula E", "OpenFOAM", "物理インフォームドML"]
importance: "high"
summary: "今週はCFDサロゲートへのUQ（不確実性定量化）適用論文が3本同時にarXivを賑わせ、業界が「点予測から分布予測へ」移行する転換点を迎えた。Formula E Season 10は残り3戦でAI戦略エンジンの検証データが蓄積。OpenFOAM v13 alphaがMLベース乱流モデルのネイティブ統合を発表したことも大きなニュースだ。"
---

## 今週のハイライト（2026年6月6日週）

| # | ニュース | 重要度 |
|---|---------|--------|
| 1 | arXivに「CFDサロゲートのUQ論文」3本が集中投稿——不確実性定量化が業界標準へ | ★★★ |
| 2 | Formula E Season 10 最終章：AI戦略エンジンが6チームで本番稼働 | ★★★ |
| 3 | OpenFOAM v13 alpha：MLベース乱流モデル（κ-ε Neural）をネイティブ実装 | ★★☆ |
| 4 | ICML 2026 採択論文リスト公開——物理ML採択率が前年比+38% | ★★☆ |
| 5 | JetBrains AI Platform 2026.2：MATLAB MCPの接続安定性が大幅改善 | ★☆☆ |

---

## 1. arXiv物理ML論文ウィーク：UQが「次の必須技術」に

今週、CFDサロゲートモデルへの不確実性定量化（UQ）適用に関する論文が連続投稿され、業界の関心が「精度の高い点予測」から「信頼区間付き分布予測」へと明確にシフトした。

**注目の3本：**

### (1) 「Conformal Ensemble PINNs for Aerodynamic Drag Prediction」（arXiv:2506.03481）

スタンフォード大学の流体計算グループが発表。物理インフォームドニューラルネットワーク（PINN）のアンサンブルにConformal Predictionを組み合わせ、有限サンプルでも統計的保証付き信頼区間を実現する手法を提案。翼型Cd予測において、学習データ50件でも99%信頼区間の被覆率を達成した。

コード：PyTorchベース、Apache License 2.0で公開予定。

### (2) 「BayesFlow-Surrogate: Normalizing Flows for Uncertainty-Aware CFD Emulation」（arXiv:2506.04102）

Normalizing FlowsというGAN系の生成モデルをCFDサロゲートに応用し、入力の不確実性が出力のCl/Cdにどう伝播するかを完全な分布として追跡する。従来の点推定型サロゲートと比較してDesign Under Uncertainty（DUU）タスクで23%の改善を報告。

### (3) 「Scalable Uncertainty Propagation for Large-Scale CFD with Message-Passing GNNs」（arXiv:2506.04891）

グラフニューラルネットワーク（GNN）ベースのメッシュサロゲートにUQを組み込む方法論。200万セル規模のメッシュ上での不確実性伝播を60秒以内で計算する手法を示す。MeshGraphNet（DeepMind）の後継研究として注目される。

**エンジニアへの示唆：** これらの論文が示すように、「答えを出す」AIから「答えとその信頼度を出す」AIへの移行が加速している。現場のエンジニアが設計判断に使えるモデルには信頼区間が不可欠であり、今後1〜2年で商用ツール（Ansys SimAI Pro、Siemens Simcenter等）への実装が進むと見られる。

---

## 2. Formula E Season 10 AIの総決算：残り3戦で検証データが蓄積

Formula E Season 10（2025〜2026年）は6月末に最終戦を迎える。今季の最大の特徴は **AI戦略エンジンの本番稼働チームが6チームに拡大** したことだ（前季は3チーム）。

### 今季のAI戦略活用状況（暫定まとめ）

**エネルギー管理AI（採用：全10チーム）**
Formula E Gen3 Evoの電費は走行条件によって最大±15%変動する。AIがテレメトリをリアルタイム解析し、残エネルギー予測と攻撃/保守切替タイミングを0.1秒以内に更新する。今季は10チーム全てがベンダー製または自社開発のエネルギー管理AIを搭載しており、Formula Eは「最もAI化されたモータースポーツ」の地位を確立した。

**ピット/アタックモード戦略AI（採用：6チーム）**
アタックモード（追加出力50kW）の起動タイミングを最適化するAIが6チームで稼働。強化学習ベースのポリシーが相手チームの動向・天候・残周回数を入力として取り込み、従来の「エンジニア直感」から数理的最適化へ移行した。

**テレメトリ解析AIによるドライバーコーチング（採用：4チーム）**
走行データをAIが解析し、セクター別のブレーキングポイント・回生量・ペダルトレースの改善点をドライバーに音声フィードバックする仕組みを4チームが導入済み。Formula E × Google Cloudの連携事例（本ブログ5月26日記事参照）が他チームへ波及した形だ。

### 興味深い数字：AI戦略エンジンの効果

| 指標 | AI導入前（S9）| AI導入後（S10）|
|------|-------------|----------------|
| エネルギー使い切り率（目標残量±1kWh以内） | 61% | 82% |
| アタックモード「最適タイミング」達成率 | 53% | 74% |
| 戦略判断にかかる平均時間（ピット壁） | 8.3秒 | 1.2秒 |

残り3戦のデータが揃った段階で、各チームのAI戦略エンジンの詳細な性能評価レポートが来月（7月）に公開される見通しだ。

### 学生チームへの応用ヒント

Formula EのAI戦略は「強化学習×事前学習物理モデル」の組み合わせが主流だが、学生フォーミュラの場合はよりシンプルに **「Optunaによるリアルタイムパラメータ最適化」** から始めるのが現実的だ。

```python
# === 学生フォーミュラ向け：簡易エネルギー管理最適化（Optuna版）===
import optuna

def energy_lap_objective(trial):
    # ストレート: 電流制限（kW）を試行する
    power_straight = trial.suggest_float("power_straight", 60, 80)
    # コーナー: 回生率を試行する
    regen_ratio = trial.suggest_float("regen_ratio", 0.2, 0.5)

    # 簡易ラップタイムモデル（実際は自チームのシミュレーション関数に差し替え）
    lap_time = 65.0 - power_straight * 0.08 + regen_ratio * 1.5
    energy_use = power_straight * 0.012 - regen_ratio * 0.8  # kWh/lap

    # 制約：レース周回数×エネルギー使用量が総容量以内
    total_laps = 25
    if energy_use * total_laps > 28.0:  # kWh上限
        return float('inf')
    return lap_time

study = optuna.create_study(direction="minimize")
study.optimize(energy_lap_objective, n_trials=200)
print(f"最適設定: {study.best_params}")
print(f"推定ラップタイム: {study.best_value:.2f}秒")
```

---

## 3. OpenFOAM v13 alpha：MLベース乱流モデルがネイティブ統合

OpenFOAM v13の開発版（alpha）において、**機械学習ベースの乱流モデルをネイティブに実装する `MLTurbulenceModel` フレームワーク** が追加された。

### 何が変わるのか

従来、OpenFOAMへのMLモデル組み込みには外部ライブラリ（PyFluent、foam-extend等）や複雑なカスタムコードが必要だった。v13 alphaでは、PyTorchモデルをONNX形式でエクスポートし、OpenFOAMのソルバーから直接呼び出せる `onnxTurbulenceModel` クラスが追加されている。

### 基本的な使い方

```yaml
# constant/turbulenceProperties（OpenFOAM v13 alpha設定例）
RASModel    onnxTurbulenceModel;

onnxTurbulenceModelCoeffs
{
    modelPath  "<case>/constant/ml_k_epsilon.onnx";  # 学習済みONNXモデルのパス
    inputFields (k epsilon U);                         # モデルへの入力フィールド
    outputFields (nut);                                # 乱流粘性係数を出力する
    scaleInput  true;                                  # 入力を自動正規化する
}
```

```python
# Python側：既存のkepsilon学習データからONNXモデルを生成する
import torch
import torch.nn as nn
import numpy as np

class KepsilonSurrogate(nn.Module):
    """k-εモデルのニューラルネット代替（入力: k, ε, |U| → 出力: nut）"""
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(3, 64), nn.Tanh(),
            nn.Linear(64, 64), nn.Tanh(),
            nn.Linear(64, 1), nn.Softplus()  # nut > 0 を保証する
        )
    def forward(self, x):
        return self.net(x)

# モデルのインスタンス化と学習（学習データは省略）
model = KepsilonSurrogate()
# ... 学習ループ（省略）...

# ONNXにエクスポードしてOpenFOAMから呼べるようにする
dummy_input = torch.randn(1, 3)
torch.onnx.export(
    model, dummy_input, "ml_k_epsilon.onnx",
    input_names=["k_eps_U"], output_names=["nut"],
    dynamic_axes={"k_eps_U": {0: "batch_size"}}
)
print("ONNX形式でエクスポート完了: ml_k_epsilon.onnx")
```

**重要な注意点：** v13はまだalphaリリースであり、本番環境での使用は推奨されない。公式リリースは2026年末〜2027年初めが見込まれている。ただし開発版をGitHub（`OpenFOAM/OpenFOAM-dev`）から取得し、先行検証することは可能だ。

---

## 4. ICML 2026 採択論文リスト：物理ML採択率が前年比+38%

ICML（International Conference on Machine Learning）2026の採択論文リストが今週公開された。今年のハイライトは **物理インフォームドML（Physics-ML）の採択率が前年比38%増** となった点だ。

機械学習の主要国際会議で物理MLの採択が急増している背景には、産業界からの需要拡大がある。特に注目されるトレンドは以下の3つだ：

**① 演算子学習（Operator Learning）の成熟**
Neural Operator（FNO, DeepONet等）が「研究段階」から「エンジニアリング実用段階」に移行。モデルサイズと推論速度のトレードオフを示すベンチマーク論文が増えた。

**② 不確実性定量化（UQ）の主流化**
今週取り上げた通り、UQ付きサロゲートの論文が急増。査読者からも「UQなしの評価は不十分」というコメントが増えており、業界標準としての地位が確立されつつある。

**③ 少量データ学習（Few-Shot Physics Simulation）**
事前学習済み物理モデルを5〜10件のドメイン特化データで素早くファインチューニングする手法が複数採択。学習データが少ない産業現場（特に自動車・航空）への応用期待が高い。

---

## 5. JetBrains AI Platform 2026.2：MATLAB MCPの接続安定性が改善

JetBrains AIが2026.2アップデートをリリースし、MATLAB MCP Serverとの接続安定性が大幅に改善された。

前バージョン（2026.1）では長時間接続時にWebSocketが切断される問題があり、大規模シミュレーションの途中でMATLABセッションが失われるトラブルが多く報告されていた。2026.2では接続ハートビートの間隔が最適化され、最大6時間の継続接続が安定して動作するようになった。

また、JetBrains Air（マルチエージェントモード）において **Boomerang Orchestratorとの相互運用性** が改善され、Simulink Agentic ToolkitとRooCode Boomerangを組み合わせた分散MBD作業フローが安定して動作するようになった。

---

## 今週のKey Takeaways

1. **UQ（不確実性定量化）は今後1〜2年でCAEサロゲートの業界標準になる** — 今のうちにDeepXDEやアンサンブル手法に慣れておくことを強く勧める
2. **Formula E Season 10のAI戦略データ**は7月に公開予定。F1・WECを含む他シリーズへの知見の波及が続く
3. **OpenFOAM v13 alphaのMLネイティブ統合**は現時点ではalpha段階だが、オープンソースCFD×ML統合の道筋が明確になった
4. **ICML 2026の物理ML採択率+38%**は、学術界と産業界の両方でPhysics-MLが「特殊技術」から「標準的なツール」に変わっていることを示す

---

## 学生フォーミュラ・レース車両開発への応用

### 具体的シナリオ：今週の3大トレンドを学生チームで活かす方法

**① UQ付きサロゲート（今週の最重要トピック）**

本記事と同日掲載の「アンサンブルPINN実装ガイド」（Research AIカテゴリ）を参照。5点のCFDデータから17点分の予測と信頼区間を30分以内に生成できる。設計レビューで「この予測の根拠は？」と聞かれたとき、信頼区間の数字で答えられる準備をしよう。

**② Formula Eのエネルギー管理AIを学生版に縮小実装**

```python
# === 学生フォーミュラ向け：最小限の強化学習エネルギー管理 ===
# (gymnasium + stable-baselines3 が必要)
# pip install gymnasium stable-baselines3

import gymnasium as gym
import numpy as np
from stable_baselines3 import PPO

class FSAEEnergyEnv(gym.Env):
    """学生フォーミュラのエネルギー管理環境（簡略版）"""
    def __init__(self):
        super().__init__()
        # 行動空間: power_mode (0=eco, 1=normal, 2=attack)
        self.action_space = gym.spaces.Discrete(3)
        # 状態空間: [残エネルギー, 残周回, 現在順位, 前車との差]
        self.observation_space = gym.spaces.Box(
            low=np.array([0, 0, 1, -100]),
            high=np.array([5.0, 20, 10, 100]),
            dtype=np.float32
        )

    def reset(self, seed=None):
        self.energy_left = 5.0   # kWh (FSAE電動クラスの標準容量)
        self.laps_left = 20
        self.position = 5
        return np.array([self.energy_left, self.laps_left,
                         self.position, 0.0], dtype=np.float32), {}

    def step(self, action):
        power = [4.0, 6.0, 8.0][action]       # kW（各モードの平均電力）
        energy_use = power * 60 / 3600         # 1周60秒換算
        lap_time = [62.0, 60.0, 58.5][action]  # 各モードのラップタイム

        self.energy_left -= energy_use
        self.laps_left -= 1

        done = self.laps_left <= 0 or self.energy_left <= 0
        # 報酬: ラップ短縮を最大化・エネルギー切れにペナルティ
        reward = -lap_time + (0 if self.energy_left > 0 else -1000)

        obs = np.array([max(0, self.energy_left), self.laps_left,
                        self.position, 0.0], dtype=np.float32)
        return obs, reward, done, False, {}

# 学習（5分で完了する軽量設定）
env = FSAEEnergyEnv()
model = PPO("MlpPolicy", env, verbose=0)
model.learn(total_timesteps=50000)
print("学習完了。model.predict()でリアルタイム意思決定が可能")
```

**③ OpenFOAM v13 alphaのMLモデルを先行検証**

学生チームで既にOpenFOAM（v12以前）を使っているなら、v13 alphaのMLTurbulenceModelをテスト環境で試してみよう。v13-devのDocker imageが公開されており、`docker pull openfoam/openfoam-dev:latest` で環境構築できる。

### Before / After 比較

| 項目 | AI導入前 | 今週の3トレンド導入後 |
|------|---------|---------------------|
| CFD結果の信頼度評価 | 定性的（「だいたい合ってる」） | 定量的（95%CI付き） |
| レース中の電力配分 | 事前設定の固定プログラム | RL推薦値をリアルタイム更新 |
| CFD乱流モデルのカスタム | 困難（C++コード改変必要） | ONNX形式のPyTorchモデルを差し込むだけ |

### 今すぐ試せる最初のステップ

本記事と同日公開の「アンサンブルPINN実装ガイド」を開き、まず `pip install deepxde` を実行してみよう。次にFSAEEnergyEnvの強化学習コードで `pip install gymnasium stable-baselines3` を実行して学習が走ることを確認する。今日だけで2つの最新AIトレンドを体験できる。

---

## 来週の注目トピック

- **ル・マン24時間（6月14〜15日）** : 各チームのAI戦略システムがどう機能するか注目。事前分析記事を来週前半に掲載予定
- **MATLAB R2026b プレビュー続報** : 先週発表されたR2026bのLLM統合機能の詳細が明らかに
- **Ansys 2026 R2 リリース** : SimAI Proの新機能、UQ機能の追加が予告されている

---

*記事内のコードはデモ用簡略版です。実際の実装では自チームのデータと物理モデルに合わせた調整が必要です。*
