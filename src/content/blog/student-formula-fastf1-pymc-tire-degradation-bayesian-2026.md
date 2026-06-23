---
title: "【学生フォーミュラ実践】FastF1 × PyMCのベイズ状態空間モデルで走行ログからタイヤ劣化を確率的に予測してピット判断を定量化する"
date: 2026-06-23
category: "Race Engineering Use Cases"
tags: ["学生フォーミュラ", "FastF1", "PyMC", "ベイズ推定", "タイヤ劣化予測"]
tool: "FastF1 / PyMC"
official_url: "https://theoehrly.github.io/Fast-F1/"
importance: "high"
summary: "学生フォーミュラチームがFastF1とPyMCを使って走行テレメトリからタイヤ劣化曲線を確率的に推定し、ピット判断に「誤差棒付きの数値根拠」を持たせられます。感覚依存のピット戦略から脱却できます。"
---

## この記事を読む前に

本記事はブログ記事「[F1タイヤデグラデーション予測をベイズ状態空間モデルで解く——FastF1×PyMCでピット判断の「いつ？」に確率的に答える実装ガイド2026](../bayesian-state-space-tire-degradation-f1-fastf1-racing-2026)」の学生フォーミュラ応用編です。PyMCとベイズ推定の基礎理論は基礎記事を参照してください。この記事ではFSAEエンデュランス走行の実データに直接適用する手順に集中します。

## 学生フォーミュラにおける課題

FSAEエンデュランス（22km・約15〜20周）ではタイヤ劣化が後半に加速する。多くの学生チームは「前年の走行会の経験」と「感覚」でピット・セットアップ変更を決めているが、次の問題がある。

- **劣化の原因が特定できない**：ラップタイムが5周目から落ちてきたとき、タイヤ劣化なのか路面温度の上昇なのか燃料減少なのか区別できない
- **「限界」の判断基準が言語化されていない**：タイヤが本当に終わっているのか、まだ余裕があるのかを数字で示せない
- **データはあるが使い方がわからない**：AiMやMoTeCのデータロガーには豊富なログがあるのにExcelで傾向を眺めるだけで終わっている

年間走行会の機会が月1〜2回しかない学生チームにとって、1回の走行でデータから正しい結論を出せるかどうかは致命的に重要だ。

## FastF1 × PyMCを使った解決アプローチ

**FastF1**はF1公式データAPIへのアクセスライブラリですが、そのデータ構造（LapNumber・LapTime・TyreAge・AmbientTemp）はFSAEデータロガーのCSVと同一形式で使えます。学生チームは自分のテレメトリCSVをFastF1互換形式に変換するだけでそのまま利用できます。

**PyMC**はベイズ推定フレームワークで、**状態空間モデル（SSM: State Space Model）**を実装します。SSMとは「観測値（ラップタイム）の背後に隠れた状態（タイヤの劣化度合い）があり、それが時間とともに変化する」という確率モデルです。

このアプローチの特長：
- **不確実性を定量化**：「8周目に劣化限界を超える確率は72%」という確率的予測が得られる
- **ノイズ分離が可能**：路面温度・燃料変化によるラップタイム変動をランダムウォーク成分として分離できる
- **少ないデータでも動く**：3〜5周分のデータからでも確率的な推定ができる

## 実装：ステップバイステップ

**前提条件**
- Python 3.10以上
- `pip install pymc arviz numpy pandas matplotlib`（FastF1は省略可、直接CSVを使う場合）
- FSAEデータロガー出力CSV：LapNumber、LapTime[s]、TyreAge[周]、AmbientTemp[℃]のカラムが必要

```python
# === ステップ1: 走行ログを読み込んで前処理 ===

import pandas as pd
import numpy as np
import pymc as pm
import arviz as az
import matplotlib.pyplot as plt

# FSAEデータロガーCSVを読み込む（AiM/MoTeC等のエクスポートを想定）
df = pd.read_csv('endurance_laps.csv')
# 必須カラム: LapNumber, LapTime, TyreAge, AmbientTemp
# 例: df.columns = ['LapNumber', 'LapTime', 'TyreAge', 'AmbientTemp']

# ラップタイムの正規化（最初の3周の中央値をベースラインとした偏差に変換）
lap_times = df['LapTime'].values
baseline  = np.median(lap_times[:3])   # 最初の3周の中央値 = タイヤ新品時のベースライン
delta_t   = lap_times - baseline        # ベースラインからの遅れ[s]（正の値=遅くなっている）
tyre_age  = df['TyreAge'].values.astype(float)  # タイヤ使用周回数

print(f"データ確認: {len(df)}周分, ベースライン={baseline:.2f}s")
print(f"最大遅れ: {delta_t.max():.2f}s（{int(tyre_age[delta_t.argmax()])}周目）")

# === ステップ2: PyMCでベイズ状態空間モデルを定義 ===
# 「タイヤ劣化 = 線形劣化成分 + ランダムウォーク（路面・外乱の変動）」

with pm.Model() as tire_model:

    # 事前分布①: タイヤ劣化率（1周あたり何秒遅くなるか）
    # 経験的に0〜0.3 s/周が妥当な範囲
    degradation_rate = pm.HalfNormal('degradation_rate', sigma=0.1)

    # 事前分布②: ランダムウォークの標準偏差（路面温度・風速などの外乱の大きさ）
    noise_sigma = pm.HalfNormal('noise_sigma', sigma=0.5)

    # ランダムウォーク: 周ごとのランダムなタイムバリエーション（外乱成分）
    n_laps = len(delta_t)
    random_walk = pm.GaussianRandomWalk(
        'random_walk',
        sigma=noise_sigma,
        init_dist=pm.Normal.dist(0, 0.5),
        shape=n_laps
    )

    # タイヤ劣化の期待値モデル = 線形劣化 + ランダムウォーク
    expected_delta = degradation_rate * tyre_age + random_walk

    # 観測モデル: 実測ラップタイム偏差の分布（計測ノイズを考慮）
    obs_sigma = pm.HalfNormal('obs_sigma', sigma=0.3)
    obs = pm.Normal(
        'obs',
        mu=expected_delta,
        sigma=obs_sigma,
        observed=delta_t    # 実際のラップタイム偏差を「観測」として条件付け
    )

    # MCMCサンプリング（事後分布を推定）
    trace = pm.sample(
        2000,               # 事後分布サンプル数
        tune=1000,          # バーンイン（捨てるサンプル）
        chains=4,           # 並列チェーン数
        target_accept=0.9,  # 受入率の目標値
        return_inferencedata=True,
        progressbar=True
    )

print("ベイズ推定完了")
az.summary(trace, var_names=['degradation_rate', 'obs_sigma'])

# === ステップ3: 将来周のタイヤ劣化を予測して可視化 ===

degradation_samples = trace.posterior['degradation_rate'].values.flatten()

# 現在10周完了として、残り10周分を予測
current_lap  = len(delta_t)
future_laps  = np.arange(current_lap + 1, current_lap + 11, dtype=float)

predictions = []
for dr in degradation_samples[:500]:  # 500サンプルで予測
    future_delta = dr * future_laps + delta_t[-1] - dr * current_lap
    predictions.append(future_delta)
pred_array = np.array(predictions)

# 可視化
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# 左: タイヤ劣化予測グラフ
ax = axes[0]
ax.plot(tyre_age, delta_t, 'ko', label='実測ラップタイム偏差', markersize=6, zorder=5)
ax.fill_between(
    future_laps,
    np.percentile(pred_array, 5,  axis=0),
    np.percentile(pred_array, 95, axis=0),
    alpha=0.3, color='red', label='90%信頼区間'
)
ax.plot(future_laps, np.median(pred_array, axis=0), 'r-', linewidth=2, label='予測中央値')
ax.axhline(y=3.0, color='orange', linestyle='--', linewidth=2, label='許容遅れ上限(3s)')
ax.set_xlabel('タイヤ使用周回数', fontsize=12)
ax.set_ylabel('ラップタイム遅れ [s]', fontsize=12)
ax.set_title('ベイズ状態空間モデルによるタイヤ劣化予測', fontsize=13)
ax.legend(fontsize=10)
ax.grid(True, alpha=0.3)

# 右: 劣化率の事後分布
ax2 = axes[1]
ax2.hist(degradation_samples, bins=50, color='steelblue', alpha=0.7, edgecolor='white')
ax2.axvline(degradation_samples.mean(),  color='red', linestyle='-',  label=f'平均: {degradation_samples.mean():.3f}')
ax2.axvline(np.percentile(degradation_samples, 5),  color='gray', linestyle='--', label='5%/95%タイル')
ax2.axvline(np.percentile(degradation_samples, 95), color='gray', linestyle='--')
ax2.set_xlabel('劣化率 [s/周]', fontsize=12)
ax2.set_ylabel('頻度', fontsize=12)
ax2.set_title('タイヤ劣化率の事後分布', fontsize=13)
ax2.legend(fontsize=10)

plt.tight_layout()
plt.savefig('tire_degradation_bayesian.png', dpi=150)
print("グラフ保存完了: tire_degradation_bayesian.png")

# ピット判断の確率を計算して出力
exceed_in_5 = (np.median(pred_array, axis=0)[:5] > 3.0).any()
exceed_prob  = (pred_array[:, 4] > 3.0).mean()  # 5周後に3s超える確率

print(f"\n=== ピット推奨タイミング ===")
print(f"劣化率推定: {degradation_samples.mean():.3f} ± {degradation_samples.std():.3f} s/周")
print(f"5周後に許容限界(3s)を超える確率: {exceed_prob*100:.1f}%")
if exceed_prob > 0.5:
    print("→ ピットインを推奨します（確率50%超）")
else:
    print("→ 継続走行可（5周後の限界超え確率が50%未満）")
```

**実行結果（例）**
```
データ確認: 10周分, ベースライン=63.42s
最大遅れ: 2.14s（10周目）
ベイズ推定完了
               mean    sd  hdi_3%  hdi_97%
degradation_rate  0.183  0.041   0.106    0.260
obs_sigma         0.213  0.038   0.144    0.284

グラフ保存完了: tire_degradation_bayesian.png

=== ピット推奨タイミング ===
劣化率推定: 0.183 ± 0.041 s/周
5周後に許容限界(3s)を超える確率: 68.3%
→ ピットインを推奨します（確率50%超）
```

## Before / After（実数値で比較）

| 項目 | 経験則のみ | FastF1 × PyMC使用後 |
|------|-----------|---------------------|
| ピットタイミングの根拠 | 「前年こうだった」「感覚」 | 確率68.3%・90%信頼区間付き |
| 外乱（路面温度変化）の分離 | 不可能（主観的判断） | ランダムウォーク成分として自動分離 |
| エンデュランスでのタイム損失（試算） | 不適切なピットで平均+8秒 | 最適判断に近づき+2〜3秒に改善 |
| 走行後の分析にかかる時間 | 1〜2時間（Excel手作業） | スクリプト実行5分で完了 |
| 次シーズンへのデータ引継ぎ | 「前年の担当者の記憶」 | 事後分布パラメータがファイルで残る |

## よくあるエラーと対処

| エラー | 原因 | 対処法 |
|--------|------|--------|
| `SamplingError: Bad initial energy` | 事前分布と観測データの大きな乖離 | `delta_t`の単位が秒になっているか確認 |
| MCMCが30分以上かかる | `n_laps`が多く高次元ランダムウォーク | まず10周以内のデータでテスト。`chains=2, draws=500`に縮小 |
| 信頼区間が極端に広い | データ数が少なすぎる（<5周） | 事前分布を狭める: `HalfNormal('degradation_rate', sigma=0.05)` |
| `ImportError: No module named 'pymc'` | PyMCのインストール漏れ | `pip install pymc`（Anaconda環境: `conda install -c conda-forge pymc`） |
| `ValueError: setting an array element with a sequence` | CSVカラム名の不一致 | `df.columns`で実際のカラム名を確認し変数名を合わせる |

## 学生フォーミュラ・レース車両開発への応用

### 具体的なシナリオ

FSAEエンデュランス当日、スタートから5周後に走行エンジニアがピットサイドでリアルタイムにデータを確認しながら「このまま走り続けるか、タイヤセット交換のためピットインするか」を判断するシナリオを想定する。

### 背景理論

**ベイズ状態空間モデル**は「見えない状態（タイヤの真の劣化度）が時間とともに変化し、観測値（ラップタイム）として確率的に現れる」というモデルです。

コイン投げに例えると：コインを5回投げて表3回裏2回だったとき、「表が出る確率は60%」と点推定するのでなく「60%を中心に40〜80%の幅がある」という分布として推定するのがベイズ推定です。タイヤ劣化の場合、「劣化率は0.18 s/周、ただし0.10〜0.26 s/周の幅がある」という形で不確実性も含めて推定します。

**MCMCサンプリング（マルコフ連鎖モンテカルロ法）**は、パラメータ空間を確率的に歩き回りながらデータに最もよく合う分布を効率的に探索するアルゴリズムです。PyMCはこのMCMCをPythonから2〜3行のコードで実行できるフレームワークです。

**ランダムウォーク**成分は、タイヤ劣化以外の要因（路面温度の上昇、コーナーの清掃状況、ドライバーの集中力）によるラップタイムの変動を表します。これを分離することで純粋なタイヤ劣化だけを推定できます。

### 実際に動くコード（ピットサイド5分分析版）

```python
# === ピットサイドで走行中に使う簡易版 ===
# 毎周ラップタイムを手入力してリアルタイムに予測を更新する

def quick_pit_analysis(lap_times_so_far: list, limit_sec: float = 3.0, future_laps: int = 5):
    """
    lap_times_so_far: これまでのラップタイムリスト[s]（例: [64.1, 64.5, 65.0, 65.8, 66.4]）
    limit_sec: 「これ以上遅れたらピット」の基準[s]
    future_laps: 何周先まで予測するか
    """
    times = np.array(lap_times_so_far)
    baseline = times[:3].mean()               # 最初の3周の平均をベースライン
    delta_t  = times - baseline               # ベースラインからの遅れ
    tyre_age = np.arange(1, len(times) + 1, dtype=float)

    with pm.Model():
        dr   = pm.HalfNormal('dr', sigma=0.1)
        ns   = pm.HalfNormal('ns', sigma=0.5)
        rw   = pm.GaussianRandomWalk(
            'rw', sigma=ns,
            init_dist=pm.Normal.dist(0, 0.5),
            shape=len(delta_t)
        )
        mu  = dr * tyre_age + rw
        obs_s = pm.HalfNormal('obs_s', sigma=0.3)
        pm.Normal('obs', mu=mu, sigma=obs_s, observed=delta_t)
        # 速いサンプリング設定（ピットサイドで5分以内に完了）
        trace = pm.sample(500, tune=300, chains=2,
                          target_accept=0.85, progressbar=False,
                          return_inferencedata=True)

    dr_samples = trace.posterior['dr'].values.flatten()
    current_lag = delta_t[-1]

    # 未来周の中央値予測
    future_ages  = np.arange(len(times) + 1, len(times) + future_laps + 1, dtype=float)
    future_preds = np.array([dr * future_ages + current_lag - dr * len(times)
                             for dr in dr_samples[:300]])
    exceed_prob  = (future_preds[:, future_laps - 1] > limit_sec).mean()

    print(f"\n{'='*40}")
    print(f"現在の遅れ: {current_lag:+.2f}s (基準比)")
    print(f"劣化率:     {dr_samples.mean():.3f} ± {dr_samples.std():.3f} s/周")
    print(f"{future_laps}周後に{limit_sec}s超える確率: {exceed_prob*100:.0f}%")
    if exceed_prob >= 0.5:
        print(">>> ピットインを推奨 <<<")
    else:
        print(">>> 継続走行可 <<<")
    print(f"{'='*40}\n")
    return exceed_prob

# 使用例（FSAEエンデュランス10周完了後）
laps = [63.4, 63.6, 63.8, 64.4, 65.0, 65.5, 65.9, 66.3, 66.9, 67.4]
quick_pit_analysis(laps, limit_sec=3.0, future_laps=5)
```

### Before / After

| フェーズ | 従来（感覚） | PyMC導入後 |
|----------|------------|-----------|
| ピット判断の根拠 | 「感覚と経験」 | 確率と信頼区間で定量化 |
| チーム内の合意形成 | 意見対立が起きやすい | グラフ1枚で全員が同じ認識を共有 |
| 次シーズンへの引継ぎ | 担当者が卒業すると経験が失われる | 推定パラメータがファイルで残る |
| 走行後の振り返り品質 | 定性的な感想 | 「劣化率が前回比+0.04 s/周増加」と数値比較可能 |

### 学生チームが今すぐ試せる最初のステップ

先週または先々週のテスト走行のラップタイムCSVを取り出し、上記の`quick_pit_analysis`関数に**ラップタイムをリストで手入力する**だけで動かせます。`pm.sample`の設定を`draws=500, chains=2`に落とすことで、一般的なノートPCでも5分以内に結果が出ます。まず「動かしてみること」が最優先です。

## 今週の学生チームへの宿題

先週のテスト走行のラップタイム（何周分でも可）を`laps = [xx.x, xx.x, ...]`のリストにまとめ、上記の`quick_pit_analysis`関数を実行してください。グラフが出るだけで次の設計会議でのタイヤ議論が「感覚」から「数字」に変わります。
