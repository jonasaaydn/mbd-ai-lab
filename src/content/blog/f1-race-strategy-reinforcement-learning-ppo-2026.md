---
title: "ピットストップのタイミングをAIが決める時代——強化学習で平均8.6秒縮めたMercedes-AMG×帝大の実証研究"
date: 2026-05-22
category: "Race Engineering Use Cases"
tags: ["F1", "強化学習", "レース戦略", "ピットストップ", "機械学習"]
tool: "Python"
importance: "high"
summary: "Mercedes-AMG PETRONAS F1チームと帝国理工大学（Imperial College London）が2025年11月に発表した研究で、PPO（近位方策最適化）による強化学習エージェントがF1レース戦略の意思決定を担い、固定戦略と比較して平均8.6秒の改善と全76%レースでトップ5フィニッシュを実現した。MBDエンジニアがPythonで再現できる最小実装も紹介する。"
---

## はじめに

「次のラップでピットインすべきか、もう5周粘るべきか」——このたった一つの判断が、F1では勝敗を分ける。従来、この決断はデータエンジニアとレースストラテジストが膨大なテレメトリを見ながら数分で下してきた。しかし2025年11月、Mercedes-AMG PETRONAS F1チームと帝国理工大学（Imperial College London）が共同で発表した研究は、強化学習エージェントがこの判断を人間より8.6秒速く・正確に下せることを実証した。

AIが「ピットウォールのブレイン」になる世界は、もはや遠未来の話ではない。この記事を読んで実装を先送りにした1週間が、次の開発サイクルで致命的な遅れになりかねない。

## 研究概要：説明可能な強化学習（XRL）とは

2025年11月に発表された論文「Explainable Reinforcement Learning for Formula One Race Strategy」（著者：Devin Thomas他）は、F1レース戦略最適化に強化学習（RL）フレームワークを適用し、その判断根拠をSHAP値で説明可能にした世界初の実用研究だ。

**使用技術**：PPO（Proximal Policy Optimization）＋SHAP値による説明可能性
**データ**：複数シーズンのF1レースデータ（タイヤ劣化、燃料消費、気温、ライバル位置等）
**評価軸**：固定戦略（従来手法）との比較タイム差、グリッド順位

既存のF1 AIツール（単純な回帰モデルやルールベースシステム）との違いは、「レースを通して変化し続ける状況への適応能力」だ。従来手法はレース前の予測精度に優れるが、セーフティカーや突然の降雨など動的変化への対応が苦手だった。PPOエージェントは実行中に状態を観測しながら方策を調整できる。

## 実際の動作：ステップバイステップ

### データの取得（fastf1ライブラリ）

```python
import fastf1
import pandas as pd
import numpy as np

# F1公式データをAPIで取得（無料）
fastf1.Cache.enable_cache('./cache')
session = fastf1.get_session(2025, 'Bahrain', 'R')
session.load()

laps = session.laps
# ラップタイム・タイヤ情報・ピットストップ記録を統合
features = laps[['LapNumber', 'LapTime', 'TyreLife', 
                  'Compound', 'TrackStatus', 'Position']].dropna()
features['LapTimeSeconds'] = features['LapTime'].dt.total_seconds()
print(features.head())
```

### 状態空間と報酬関数の定義

```python
# 強化学習エージェントが観測する「状態」
state = {
    'lap': current_lap / total_laps,          # 正規化ラップ数
    'tyre_age': tyre_age / 50,                # タイヤ使用ラップ数
    'gap_to_leader': gap_to_leader,           # リーダーとのギャップ（秒）
    'fuel_load': remaining_fuel / total_fuel, # 燃料残量
    'track_status': track_status_code         # SC/VSC/雨フラグ
}

# 報酬関数：最終グリッド順位を最大化
def reward(position, laps_remaining):
    base_reward = (20 - position) * 10  # 順位が良いほど高報酬
    if laps_remaining == 0:
        return base_reward * 2  # 最終ラップは2倍の重み付け
    return base_reward
```

### PPOエージェントの最小構成（stable-baselines3使用）

```python
from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env

# レースシミュレーター環境（gym.Env継承）を作成後
env = make_vec_env(F1RaceEnv, n_envs=4)

model = PPO(
    "MlpPolicy", env,
    learning_rate=3e-4,
    n_steps=2048,
    batch_size=64,
    n_epochs=10,
    gamma=0.99,
    verbose=1
)
model.learn(total_timesteps=500_000)
model.save("f1_pit_strategy_ppo")
```

## Before / After 比較

| 指標 | 固定戦略（従来） | PPO強化学習 |
|------|--------------|-----------|
| 平均タイム差 | 基準（0秒） | **−8.6秒（短縮）** |
| トップ5フィニッシュ率 | 約50% | **約76%** |
| SC・雨への適応 | ルールベース | 状態観測で動的調整 |
| 判断根拠の説明 | 不可 | SHAP値で定量的説明 |
| 判断速度 | 数分（人間） | ミリ秒（リアルタイム） |

2025年中国GPでの深層学習モデルの実証では、ピットストップタイミング予測の正確度70.59%・再現率92.31%・F1スコア80%を達成。「ピットを見送るべき状況を見逃さない」再現率の高さが戦略上の安全弁になっている。

## 実践コード例：SHAP値で判断根拠を可視化

チームに「なぜここでピットしたのか」を説明できる説明可能AIが実用上の必須条件だ：

```python
import shap

# 学習済みモデルのポリシーネットワークを抽出
policy = model.policy

explainer = shap.KernelExplainer(
    lambda x: policy.predict(x, deterministic=True)[0],
    background_data
)

# あるレース局面でのSHAP値を計算
shap_values = explainer.shap_values(race_state)

# 可視化：どの特徴がピットイン判断に最も影響したか
shap.waterfall_plot(shap.Explanation(
    values=shap_values[0],
    base_values=explainer.expected_value,
    feature_names=['ラップ数', 'タイヤ寿命', 'ギャップ', '燃料', 'トラック状態']
))
```

このグラフにより「タイヤ寿命が32ラップを超え、かつギャップが2秒以内のときにピット確率が急増する」という定量的な根拠を、エンジニアがストラテジストに説明できる。

## 注意点・落とし穴

**クローズドループ対応が次の課題**：Mercedes-AMG×帝国理工の研究はオープンループ設計（レース開始後は決定を変更しない）だ。リアルタイム動的判断（クローズドループ）の実装には、レース中の観測データを低遅延でモデルに入力するパイプラインが別途必要になる。

**シミュレーターの品質がボトルネック**：PPOエージェントはシミュレーター内で50万ステップ以上の訓練が必要だ。シミュレーターがタイヤ劣化・燃料消費を正確に再現できていないと、実環境での性能が大幅に低下する。fastf1で取得した実データでバリデーションすること。

**ライセンスと公式APIの制約**：F1の詳細テレメトリは通常チーム専用。fastf1は公式F1 APIを使うがレート制限がある。大量データの取得はキャッシュ（`fastf1.Cache.enable_cache()`）を必ず有効にすること。

**SHAPの計算コスト**：KernelExplainerは計算が遅い。リアルタイム用途にはLinearExplainerやTreeExplainerへの切り替えを検討すること。

## 応用：より高度な使い方

**タイヤ劣化モデルとの統合**：本ブログで紹介したPINN（物理インフォームドニューラルネットワーク）によるタイヤモデルをPPOの状態空間に組み込むことで、劣化予測の精度が大幅に向上する。PINN出力（劣化係数）をRL状態の一特徴として追加するだけで実装できる。

**マルチエージェント戦略**：自車のエージェントに加え、ライバルカーの行動を予測するサブエージェントを追加し、「相手がアンダーカットを仕掛けてきたら」という状況を先読みする戦略AIへと発展できる。

**MBDへの応用展開**：同じPPO＋SHAP構成は、ECUキャリブレーション最適化（入力：センサ値、出力：マップ値調整）にも転用可能だ。レース戦略で実証されたフレームワークをMBD領域へ横展開することで開発コストを大幅削減できる。

## 今すぐ試せる最初の一歩

```bash
# 必要パッケージのインストール（Python 3.10以降）
pip install fastf1 stable-baselines3 shap gymnasium

# fastf1でF1データを取得してみる
python3 -c "
import fastf1
fastf1.Cache.enable_cache('./cache')
s = fastf1.get_session(2025, 'Bahrain', 'R')
s.load()
print(s.laps[['LapNumber','LapTime','Compound']].head(10))
"
```

まずはfastf1でデータ取得の感触を掴もう。次に上記のPPOコードと組み合わせれば、自分のF1戦略AIが5分で動き始める。
