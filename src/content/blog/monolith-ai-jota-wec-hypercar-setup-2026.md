---
title: "WECハイパーカーのテストを80%削減：Cadillac JOTAがMonolith AIでセットアップ時間を半減させた実態"
date: 2026-05-24
category: "Race Engineering Use Cases"
tags: ["Monolith AI", "WEC", "JOTA", "車両セットアップ", "Next Test Recommender", "タイヤモデル"]
tool: "Monolith AI"
official_url: "https://www.monolithai.com/press-release/cadillac-jota-2025"
importance: "high"
summary: "2025年5月、FIA WECハイパーカー参戦のCadillac Hertz Team JOTAがMonolith AIを導入。テストキャンペーンを80%削減し、セットアップ時間を50%短縮した実績を公開。「Next Test Recommender」が何を自動化するのか、タイヤContact Patch Load削減まで具体的な仕組みを解説する。"
---

## はじめに

FIA世界耐久選手権（WEC）ハイパーカークラスの競争は、毎レースごとに数百回のシミュレーションと実車テストを必要とする。セットアップ変更のたびに「次に何を試すか」を決めるのはエンジニアの経験と勘に依存しており、探索空間が広すぎてテストが追いつかないのが現実だ。

しかし今、その常識が覆されている。Cadillac Hertz Team JOTAは2025年シーズンからMonolith AIを導入し、テストキャンペーンを**80%削減**、車両セットアップ時間を**50%短縮**することに成功した。このツールを知らずに従来の試行錯誤を続けるなら、ライバルチームに対して開発速度で圧倒的な差をつけられることになる。

## Monolith AIとは

**何者か**: エンジニアリング向け自己学習型AIプラットフォーム。センサーデータ、シミュレーション結果、物理テストデータをアップロードするだけで、新設計の挙動を予測する機械学習モデルを自動構築する。

**開発者・背景**: 英国ロンドン発のスタートアップMonolithが開発。BMW・Honda・Jaguar Land Roverなどの大手OEMへの導入実績を持つ。2025年10月にはAIクラウド大手CoreWeaveによる買収が発表され、インフラ基盤が大幅に強化された。

**既存ツールとの違い**: MATLAB/Simulinkの物理モデルは「第一原理」から動作を計算する。MonolithはそのMAA（モデル精度検証）に要する実テスト数を削減するという補完的なポジションを取る。CFDや1Dシミュレーション結果さえあれば、実車テストなしに精度の高い予測モデルを構築できる点が最大の差別化だ。

## 実際の動作：JOTAチームのステップバイステップ

### Phase 1: 既存テストデータの学習

JOTAのエンジニアリングチームはまず、過去のテストデータ（サスペンションダンパーの減衰設定×100パターン、エアロバランス×50パターン等）をMonolithにアップロードした。Monolithはこれらを学習し、設定パラメータ→車両挙動の予測モデルを自動構築する。

### Phase 2: Next Test Recommender（NTR）の活用

NTR（次テスト推薦プログラム）が核心的な機能だ。使い方は以下の通り：

1. エンジニアが「改善目標」を入力（例：フロントタイヤのContact Patch Loadを低減したい）
2. NTRが未試行のセットアップパラメータ空間を分析
3. 情報利得が最大となる「次に試すべき実験」のランク付きリストを出力
4. テストリグまたは実車テストを最小回数で実施
5. 新しいデータをMonolithにフィードバック→モデルが自己学習で精度向上

### Phase 3: Test Plan Optimisation（TPO）との連携

NTRで推薦されたテストをTest Plan Optimisation（TPO）が実行スケジュールに落とし込む。TPOはテストリグ稼働時間、エンジニアの工数、タイヤ本数などの制約条件を考慮した上で、最も効率的なテスト順序を出力する。

この一連のフローにより、JOTAは従来のテストキャンペーンを約80%削減した状態で、ほぼ同等の精度のパフォーマンスマップを取得することに成功している。

## Before / After 比較

| 項目 | Monolith AI 導入前 | Monolith AI 導入後 |
|------|-------------------|-------------------|
| テストキャンペーン数 | 基準（100%） | 約20%（80%削減） |
| セットアップ確定時間 | 基準（100%） | 約50%（半減） |
| テスト＆検証コスト | 基準（100%） | 約34%（66%削減） |
| フロントタイヤCPL | 改善前 | 顕著な低減を達成 |
| 加速時ピッチコントロール | 改善前 | 明確に改善 |

特にコスト削減の効果が大きい。WECハイパーカーの1日のテストコストは数百万円規模に達するため、66%のコスト削減は年間の開発予算を大幅に圧縮する。

## 実践コード例

Monolith AIはGUIベースのプラットフォームだが、類似の「自己学習型サロゲートモデル」をPythonで実装するアプローチを示す。ガウス過程（GP）を使ったセットアップ最適化の骨格だ：

```python
import numpy as np
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import Matern
from scipy.optimize import minimize

# --- 過去テストデータの準備 ---
# 設定パラメータ: [フロントRH, リアRH, フロントARB, リアARB, キャンバーF]
X_tests = np.array([
    [40, 45, 3, 4, -2.0],
    [38, 43, 2, 3, -2.5],
    [42, 47, 4, 5, -1.5],
    # ... 実際には100+件のデータ
])
# 計測結果: ラップタイム改善量（秒）
y_lap_delta = np.array([-0.05, 0.12, -0.18])  # 負が改善

# --- ガウス過程でサロゲートモデルを構築 ---
kernel = Matern(nu=2.5)
gp = GaussianProcessRegressor(kernel=kernel,
                               n_restarts_optimizer=10,
                               normalize_y=True)
gp.fit(X_tests, y_lap_delta)

# --- Next Test Recommender: 期待改善量(EI)で次の試験点を推薦 ---
def expected_improvement(X, gp, best_so_far, xi=0.01):
    from scipy.stats import norm
    mu, sigma = gp.predict(X.reshape(1, -1), return_std=True)
    Z = (best_so_far - mu - xi) / (sigma + 1e-9)
    ei = (best_so_far - mu - xi) * norm.cdf(Z) + sigma * norm.pdf(Z)
    return -ei.flatten()[0]  # minimizeのため符号反転

best_lap_delta = np.min(y_lap_delta)
# パラメータ範囲: [フロントRH 35-45, リアRH 40-50, ...]
bounds = [(35, 45), (40, 50), (1, 5), (2, 6), (-3.0, -1.0)]
result = minimize(expected_improvement, X_tests[0],
                  args=(gp, best_lap_delta),
                  method='L-BFGS-B', bounds=bounds)

print("次に試すべきセットアップ:")
print(f"  フロントRH: {result.x[0]:.1f}mm")
print(f"  リアRH: {result.x[1]:.1f}mm")
print(f"  フロントARB: {result.x[2]:.1f}")
print(f"  期待改善量: {-result.fun:.4f}秒")
```

Monolith AIはこの仕組みを工業レベルの精度と使いやすさでGUIとして提供しており、エンジニアはコードを書くことなく同等の機能を利用できる。

## 注意点・落とし穴

**データ量の要件**: Monolith AIのモデル精度は入力データ量に依存する。JOTAのケースでは豊富な過去テストデータが存在したことが成功の前提条件だった。テスト実績が少ない新プロジェクトでは初期精度が低く、最初の数シーズンはデータ蓄積フェーズとして位置づける必要がある。

**物理モデルとの補完関係**: Monolithは「ブラックボックス」モデルであり、物理的な説明可能性が低い。「なぜその設定が良いか」を理論的に説明する必要がある用途（車検対応、パーツ安全性証明等）では、Simulinkなどの物理モデルとの組み合わせが不可欠だ。

**CoreWeave買収後の価格動向**: 2025年10月の買収以降、エンタープライズ向けプランの価格体系が変更される可能性がある。契約前に最新の料金体系を確認すること。

## 応用：より高度な使い方

**タイヤウェアモデルとの統合**: JOTAはWEC第5戦ル・マン24時間に向け、Monolith AIでタイヤウェアモデルを構築するウェビナーを公開している（「Winning Le Mans with engineering ingenuity & AI」）。タイヤの複合条件（気温・路面温度・燃料搭載量）を変数にしたウェア予測で、ピット戦略の最適化に活用できる。

**デジタルツインとの連携**: Monolithで構築したサロゲートモデルをリアルタイムのデジタルツインに組み込むことで、レース中のエンジニアリングデシジョンをAI支援することが可能だ。JOTAでは車両ダイナミクス・エアロ・タイヤの全領域でこのアプローチを採用している。

**MBDエンジニアへの応用**: Simulinkモデルの検証に使う試験工数削減への応用も可能だ。HIL試験のテストケースをMonolith AIで最適化することで、同等のカバレッジを少ない試験工数で達成できる。

## 今すぐ試せる最初の一歩

Monolith AIは無料トライアルを提供している。まず自社の既存テストデータ（CSVかExcel形式）を用意し、以下から試用申請するだけで始められる：

```
https://www.monolithai.com/
→「Request a Demo」または「Try Free」をクリック
→ CSVまたはExcelのテストデータをアップロード
→ 予測モデルが数分で生成される
```

データが手元にない場合、Monolith公式のサンプルデータセット（車両ダイナミクス・振動試験）を使ったデモが5分で試せる。
