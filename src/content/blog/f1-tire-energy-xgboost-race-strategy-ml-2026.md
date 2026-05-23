---
title: "タイヤエネルギーをXGBoostで予測してピット戦略を最適化——F1チームが使うML実装の全貌"
date: 2026-05-23
category: "Race Engineering Use Cases"
tags: ["F1", "タイヤ劣化", "XGBoost", "レース戦略", "機械学習", "テレメトリ"]
official_url: "https://arxiv.org/abs/2501.04067"
importance: "high"
summary: "Mercedes-AMGのテレメトリデータを使ったF1タイヤエネルギー予測モデルが論文公開された。XGBoostがLSTMを精度で上回り、SHAP値でステアリング角とVSCの影響を可視化。ピット戦略AI組み込みに向けた実装手順をPythonコードで完全解説する。"
---

## はじめに

「タイヤがいつへたるか分からないからピットを早めに切る」——この"保守的すぎる判断"が勝利を取り逃がしているケースは多い。逆に、タイヤ劣化を読み誤って引っ張りすぎてペースを失うシナリオも同じくらい多い。最適なピットウィンドウを見つけるには、今まさに消耗しているタイヤのエネルギー状態をリアルタイムに把握することが前提条件だ。King's College Londonとメルセデス・AMG PETRONASが2025年1月に発表した研究（arxiv:2501.04067）は、テレメトリからタイヤエネルギーをXGBoostで予測し、LSTMと比較検証した成果だ。そのモデルを知らないまま「勘と経験でタイヤを読む」スタイルを続けていると、データ駆動型チームとのギャップは開く一方だ。

## 研究の概要：Mercedes-AMGテレメトリ×XGBoost

本研究はKing's College London（KCL）とメルセデス・AMG PETRONASの共同研究として実施された。学術発表はACM/SIGAPP Symposium on Applied Computing 2025で行われている。

**モデルの入力**（テレメトリシグナル）：
- ステアリング角（steering angle）
- 速度・スロットル・ブレーキ圧
- ピットストップ状況フラグ
- VSC（バーチャルセーフティカー）発動状況
- ラップ数・コンパウンド種別

**出力**：4輪それぞれのタイヤエネルギー（kJ単位）

比較したモデルはXGBoostとLSTMで、XGBoostが最終的に高い予測精度を達成した。さらに **SHAP値（SHapley Additive exPlanations）** でどの特徴量が予測に寄与しているかを可視化し、ブラックボックスを解消している点が産業応用上の最大の強みだ。

## 実際の動作：ステップバイステップ

FastF1 APIで実際のF1テレメトリを取得してXGBoostモデルを構築する。

**ステップ1：FastF1でテレメトリを取得**

```python
import fastf1
import pandas as pd

fastf1.Cache.enable_cache("./f1cache")
session = fastf1.get_session(2024, "Monza", "R")
session.load()

# ハミルトンの全ラップテレメトリを取得
laps = session.laps.pick_driver("HAM")
telemetry = laps.get_telemetry()
print(telemetry[["Speed", "Throttle", "Brake", "SteeringAngle"]].head())
```

**ステップ2：特徴量エンジニアリング**

```python
def build_features(tel: pd.DataFrame, lap_info: pd.Series) -> pd.DataFrame:
    features = tel.copy()
    features["lap_number"]    = lap_info["LapNumber"]
    features["compound"]      = lap_info["Compound"].map(
        {"SOFT": 0, "MEDIUM": 1, "HARD": 2})
    features["tyre_age"]      = lap_info["TyreLife"]
    # ウィンドウ統計（過去5サンプルの移動平均）
    for col in ["Speed", "Throttle", "Brake"]:
        features[f"{col}_roll5"] = features[col].rolling(5).mean()
    return features.dropna()
```

**ステップ3：XGBoostでタイヤエネルギーを予測**

```python
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

FEATURE_COLS = [
    "Speed", "Throttle", "Brake", "SteeringAngle",
    "Speed_roll5", "Throttle_roll5", "Brake_roll5",
    "tyre_age", "compound", "lap_number"
]

X_train, X_test, y_train, y_test = train_test_split(
    df[FEATURE_COLS], df["TyreEnergy_kJ"],
    test_size=0.2, random_state=42
)

model = XGBRegressor(
    n_estimators=500, learning_rate=0.05,
    max_depth=6, subsample=0.8,
    tree_method="hist", random_state=42
)
model.fit(X_train, y_train,
          eval_set=[(X_test, y_test)], verbose=100)

mae = mean_absolute_error(y_test, model.predict(X_test))
print(f"MAE: {mae:.2f} kJ")
```

## Before / After 比較

| 項目 | 従来の判断 | XGBoost導入後 |
|------|----------|--------------|
| タイヤ状態把握 | エンジニアの経験則・目視 | テレメトリから定量予測 |
| ピット判断の根拠 | 「そろそろ限界かな」 | エネルギー残量の数値 |
| VSC対応 | アドホックな判断 | VSCフラグを特徴量に組み込み自動考慮 |
| 意思決定の説明 | 属人的 | SHAP値で根拠を可視化・共有可能 |
| 予測精度 | 定性評価のみ | MAE検証済み（論文ではXGBoost > LSTM） |

## 実践コード例：SHAP値で予測根拠を可視化

```python
import shap

explainer  = shap.TreeExplainer(model)
shap_vals  = explainer.shap_values(X_test[:200])

# 特徴量重要度のサマリプロット（上位10特徴量）
shap.summary_plot(shap_vals, X_test[:200], max_display=10)

# 個別ラップの予測根拠を確認（例：ラップ30）
shap.force_plot(
    explainer.expected_value,
    shap_vals[30],
    X_test.iloc[30]
)
```

論文の結果では、**ステアリング角** と **VSCフラグ** が予測に最も大きく寄与していることがSHAP値で確認されている。VSC発動時にタイヤエネルギーが急減するダイナミクスを、モデルが正しく捉えている証拠だ。

## 注意点・落とし穴

- **FastF1の公式データは前後輪を区別しない**：論文ではメルセデスの非公開テレメトリを使用。FastF1だけでは4輪個別のタイヤエネルギーは取得できないため、代理指標（横加速度×速度など）での近似が必要
- **コンパウンド間のデータ不均衡**：ハードタイヤのデータがソフトより圧倒的に少ない場合、`scale_pos_weight` や `sample_weight` で補正しないと精度が下がる
- **サーキット依存性**：モナツァとモナコでは特徴量の分布が大きく異なる。サーキット別にモデルを切り替えるか、サーキット特性パラメータを追加特徴量として組み込む
- **リアルタイム推論の遅延**：レース中の使用には10ms以内の応答が理想。XGBoostは軽量なので問題ないが、前処理パイプラインのボトルネックに注意

## 応用：より高度な使い方

本研究と同グループが発表した別論文（arxiv:2512.00640）では、**ベイズ状態空間モデル** をタイヤ劣化の潜在変数推定に適用している。ラップタイムを燃料質量と潜在タイヤペースの関数としてモデル化し、ピットストップを状態リセットとして扱う枠組みだ。Lewis Hamiltonの2025年オーストリアGPデータで検証され、ARIMA(2,1,2)ベースラインを精度で上回った。XGBoostのエネルギー予測と組み合わせれば、**短期予測（次ラップのタイヤ状態）+ 長期戦略（残りスティントの劣化曲線）** の二層構造が作れる。

## 今すぐ試せる最初の一歩

FastF1とxgboostを入れれば今日から動かせる：

```bash
pip install fastf1 xgboost shap scikit-learn matplotlib
```

まず `fastf1.get_session(2024, "Monza", "R")` で2024年モンツァ決勝を取得し、好きなドライバーのテレメトリでXGBoostを学習させてみよう。30分あれば予測モデルの第一歩が動く。
