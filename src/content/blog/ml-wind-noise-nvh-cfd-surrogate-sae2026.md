---
title: "CFD数時間→10秒でキャビン風切り音を予測——SAE 2026が実証したML空力音響サロゲートでNVH設計を根本から変える方法"
date: 2026-05-31
category: "CAE / Simulation AI"
tags: ["NVH", "空力音響", "CFD", "サロゲートモデル", "深層学習", "風切り音", "騒音予測"]
importance: "high"
summary: "SAE World Congress 2026（論文2026-01-0599）で発表されたML空力音響サロゲートは、CFDデータで学習した深層学習モデルが運転席ヘッドスペースの音圧レベル（SPL）を数時間から10秒以下に短縮し、かつパネル別騒音寄与マップも同時に出力することを実証した。スタイリング確定前の設計初期段階から風切り音NVH評価を高速反復できる実践的手法を解説する。"
---

## はじめに

「このドアミラー形状に変更したら、高速道路走行時の風切り音はどう変わるか」——スタイリングレビューの場でNVHエンジニアが最も答えにくい質問だ。CFD（数値流体力学）で精度よく評価しようとすれば1ケースあたり4〜8時間かかり、量産試作前の設計探索フェーズでは非現実的だ。風洞試験はさらに遅く、プロトタイプが完成してからでないと実施できない。

その結果、風切り音の問題は設計後期に発覚し、スタイリング変更を余儀なくされるケースが後を絶たない。高速域でのEV静粛性が求められる現在、ICエンジン音でマスキングできていた風切り音がそのまま車内に入り込み、顧客クレームの主要因になりつつある。

2026年4月のSAE World Congress（論文番号：2026-01-0599）で発表されたML空力音響サロゲートは、CFDデータで学習した深層学習モデルが**運転席ヘッドスペースの音圧レベル（SPL）を10秒以下で予測**し、さらにどのパネルが騒音源に寄与しているかを同時に可視化する実装を実証した。設計初期段階から高速にNVH評価を反復できる環境が、ついに現実のものとなった。

## ML空力音響サロゲートとは

SAE 2026-01-0599が提案するアプローチは、大量のLBM（Lattice Boltzmann Method）または大渦シミュレーション（LES）CFDシミュレーション結果でニューラルネットワークを学習させ、新形状に対してCFDを実行せずにSPLを推論するサロゲートモデルだ。

- **発表**: SAE World Congress 2026、2026年4月
- **対象物理量**: 運転席ヘッドスペースでの周波数帯域別SPL（dB）＋フロントサイドウィンドウ・Aピラー・ドアミラー周辺のパネル別騒音寄与マップ
- **既存手法との違い**: 従来のMLエアロ予測は抗力係数（Cd）などのスカラー値が中心だったが、本手法は周波数スペクトル全体と空間的な騒音源分布を同時に予測するマルチアウトプット構造を採用

入力は車体形状のパラメトリック変数（ドアミラー形状、ウィンドウシール断面、Aピラー角度など）と走行速度。出力は周波数帯域ごとのSPLと、パネル別の騒音寄与率。CFD後処理で数時間かけて行っていた「音源同定」作業が、推論と同時に自動的に提供される。

## 実際の動作：ステップバイステップ

### Step 1: CFDトレーニングデータセットの構築

50〜200ケースの形状バリアントに対してLBM CFDを実施し、表面圧力変動データと室内SPLを計算する。設計変数の範囲（例：ドアミラー張り出し量 ±15mm、シール断面角度 ±5°など）をあらかじめ決定してからラテン超方格法（LHS）でサンプリングすると、少ないケース数で設計空間を効率よくカバーできる。

### Step 2: 特徴量エンジニアリング

```python
import numpy as np

def extract_panel_features(surface_pressure_data: np.ndarray, 
                            panel_masks: list[np.ndarray]) -> np.ndarray:
    """
    表面圧力変動データからパネル別の法線速度実効値を抽出する。
    surface_pressure_data: shape (n_time, n_nodes) — CFD出力
    panel_masks: 各パネルのノードインデックスマスクのリスト
    """
    features = []
    for mask in panel_masks:
        p_panel = surface_pressure_data[:, mask]
        # 時間RMS（音圧の有効値に比例）
        p_rms = np.sqrt(np.mean(p_panel**2, axis=0))
        features.append([p_rms.mean(), p_rms.max(), p_rms.std()])
    return np.array(features).flatten()
```

### Step 3: 深層学習サロゲートの学習

マルチアウトプット構造のMLP（多層パーセプトロン）を構築する。SPLスペクトル出力とパネル寄与マップ出力を独立したブランチで予測することで、両者の最適化を独立して制御できる。

```python
import tensorflow as tf
from tensorflow import keras

def build_wind_noise_surrogate(
    n_design_params: int = 12,
    n_octave_bands: int = 8,
    n_panels: int = 10
) -> keras.Model:
    """
    風切り音サロゲートモデル。
    入力: 形状パラメータ + 速度
    出力: オクターブバンド別SPL + パネル別騒音寄与率
    """
    inputs = keras.Input(shape=(n_design_params,), name="design_params")

    # 共有特徴抽出層
    x = keras.layers.Dense(256, activation='relu')(inputs)
    x = keras.layers.BatchNormalization()(x)
    x = keras.layers.Dropout(0.1)(x)
    x = keras.layers.Dense(512, activation='relu')(x)
    x = keras.layers.BatchNormalization()(x)
    x = keras.layers.Dense(256, activation='relu')(x)

    # SPL予測ブランチ（dB単位）
    spl_x = keras.layers.Dense(128, activation='relu')(x)
    spl_output = keras.layers.Dense(n_octave_bands, name='spl_spectrum')(spl_x)

    # パネル寄与マップ予測ブランチ（0〜1の寄与率）
    panel_x = keras.layers.Dense(128, activation='relu')(x)
    panel_output = keras.layers.Dense(
        n_panels, activation='softmax', name='panel_contribution'
    )(panel_x)

    model = keras.Model(inputs=inputs, outputs=[spl_output, panel_output])
    model.compile(
        optimizer=keras.optimizers.Adam(1e-3),
        loss={'spl_spectrum': 'mse', 'panel_contribution': 'kl_divergence'},
        loss_weights={'spl_spectrum': 1.0, 'panel_contribution': 0.3},
        metrics={'spl_spectrum': 'mae'}
    )
    return model

model = build_wind_noise_surrogate()
model.summary()
```

### Step 4: 新形状の推論（10秒以内）

学習済みモデルに新しい設計パラメータを入力すれば、SPLスペクトルとパネル寄与率が即座に返される。

```python
# 新形状の評価例（ドアミラーを5mm内側に変更した場合）
import numpy as np

# 設計変数ベクトル（例：12次元）
# [速度_kmh, ミラー_x, ミラー_y, ミラー_角度, Aピラー_角度, シール_断面, ...]
new_design = np.array([[120.0, -5.0, 0.0, 2.5, 8.2, 1.3, 
                        0.9, 1.1, 0.0, -1.5, 0.8, 0.5]])

spl_pred, panel_pred = model.predict(new_design)

# 結果の解釈
octave_bands = ['63Hz', '125Hz', '250Hz', '500Hz', '1kHz', '2kHz', '4kHz', '8kHz']
panel_names = ['フロントサイドウィンドウ', 'Aピラー', 'ドアミラー',
               'ルーフ前端', 'フードシール', '...他5パネル']

print("=== 運転席SPL予測 ===")
for band, spl in zip(octave_bands, spl_pred[0]):
    print(f"  {band}: {spl:.1f} dB")

print("\n=== 主要騒音パネル（寄与率Top3） ===")
top3 = np.argsort(panel_pred[0])[::-1][:3]
for rank, idx in enumerate(top3, 1):
    print(f"  {rank}位: {panel_names[idx]} ({panel_pred[0][idx]*100:.1f}%)")
```

## Before / After 比較

| 項目 | CFD（LBM/LES） | MLサロゲート |
|------|--------------|------------|
| 1ケースの評価時間 | 4〜8時間 | 約10秒 |
| 1設計サイクルの評価数 | 5〜10ケース/週 | 500〜1,000ケース/週 |
| SPL予測精度（MAPE） | 基準（CFD） | <10%（SAE論文比較値） |
| パネル騒音寄与の可視化 | 可能（事後処理で数時間） | 推論と同時（即時） |
| 適用可能な設計段階 | 量産前試作以降 | スタイリング確定前から |
| 計算リソース | 大規模HPC必須 | 推論はCPUで可 |

週に評価できる設計バリアント数が100倍に拡大することで、スタイリングチームとNVHエンジニアが同じミーティングの場でリアルタイムに設計検討できるようになる。

## 注意点・落とし穴

**学習データの範囲外は精度が保証されない**: 学習データでカバーしていない形状変化（例：学習時よりも大幅にAピラー角度を変えた場合）では、精度が著しく低下する。設計変数の変動範囲を事前に定義してから学習データを生成すること。範囲外の推論結果には必ず警告フラグを立てる実装を加えると安全。

**学習データ生成コストとのトレードオフ**: LES CFDを学習データに使うと精度は高いが1ケース数十時間かかり、50ケース生成だけで数千時間のHPC利用が必要になる。初期検討フェーズではLBMで50〜100ケースから始め、精度確認後にLESデータで追加学習する段階的アプローチが現実的。

**高周波成分の限界**: 現時点の手法では4kHz以上の高周波帯域（例：ワイパーリップ音）の予測精度が低下する傾向がある。また、タイヤノイズが支配的な60km/h以下の低速域や、路面凹凸によるロードノイズには適用不可。

## 応用：より高度な使い方

**Bayesian最適化との組み合わせ**: MLサロゲートを目的関数として、OptunaやBoTorchでドアミラー形状パラメータを自動最適化できる。風切り音SPLとCd係数の多目的最適化が数時間で完結し、設計エンジニアにパレートフロントを提示できる。

**Graph Neural Networkへの発展**: 形状をパラメータベクトルではなく3Dサーフェスメッシュ（グラフ）として直接入力するGNNに移行すると、任意形状への汎化性が大幅に向上する。NVIDIA PhysicsNeMoのMeshGraphNetがこの用途の参考実装として使える。

**社内ナレッジの蓄積**: 過去のCFD解析データを体系的に整備してサロゲートの学習データとすることで、社内に蓄積された設計ノウハウをAIモデルに凝縮できる。設計者が変わっても暗黙知が失われなくなる。

## 今すぐ試せる最初の一歩

合成データで動作確認してから本番データに移行する最速のアプローチ：

```bash
# 必要ライブラリのインストール
pip install tensorflow numpy scikit-learn matplotlib

# 5分で動作確認（合成データ使用）
python3 << 'EOF'
import numpy as np
import tensorflow as tf
from tensorflow import keras

np.random.seed(42)
# 合成学習データ（本番ではCFD結果に置き換え）
n_samples = 80
X = np.random.rand(n_samples, 12) * 2 - 1  # 設計パラメータ（-1〜+1に正規化）
y_spl = np.random.rand(n_samples, 8) * 20 + 40  # SPL: 40〜60dB

# モデル構築・学習
model = keras.Sequential([
    keras.layers.Dense(64, activation='relu', input_shape=(12,)),
    keras.layers.Dense(128, activation='relu'),
    keras.layers.Dense(8)
])
model.compile(optimizer='adam', loss='mse', metrics=['mae'])
history = model.fit(X, y_spl, epochs=50, batch_size=16, verbose=0)
print(f"学習完了 — 最終MAE: {history.history['mae'][-1]:.3f} dB")

# 推論時間測定
import time
x_new = np.random.rand(1, 12) * 2 - 1
t = time.time()
pred = model.predict(x_new, verbose=0)
print(f"推論時間: {(time.time()-t)*1000:.1f}ms")
print(f"予測SPL範囲: {pred[0].min():.1f}〜{pred[0].max():.1f} dB")
EOF
```

まずこの合成データで推論速度と基本動作を確認し、次に手持ちのCFDデータを整形して学習データとして投入するステップへ進む。
