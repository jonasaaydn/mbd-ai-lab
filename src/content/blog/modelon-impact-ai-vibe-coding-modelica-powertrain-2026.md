---
title: "SimulinkだけがMBDではない——Modelon Impact × AI「バイブコーディング」でEVパワートレイン熱システムをゼロから半日で構築してFMU化する"
date: 2026-05-30
category: "CAE / Simulation AI"
tags: ["Modelon Impact", "Modelica", "バイブコーディング", "FMU", "EV", "パワートレイン熱管理"]
tool: "Modelon Impact"
official_url: "https://modelon.com/modelon-impact/"
importance: "medium"
summary: "Simulinkが使えない環境、またはオープン標準で設計資産を管理したいチームに向け、Modelon ImpactのAI機能が現実的な選択肢になりつつある。自然言語でEVパワートレイン冷却回路を記述するだけでModelicaコードが生成され、当日中にFMUとしてSimulinkやdSPACE環境に組み込める。従来2〜3日かかった初期モデル構築が半日で完了する「バイブコーディング」の具体手順と限界を解説する。"
---

## はじめに

「Simulinkは高額ライセンスが壁になる」「設計モデルをオープン標準で管理してサプライヤーと共有したい」「FMU形式で各ツールを疎結合にしたい」——こうした要件に答えるMBDツールとして、**Modelon Impact**が静かに注目を集めている。Modelicaというオープンな方程式ベース言語を採用し、ブラウザ上でシステムシミュレーションが完結するクラウドプラットフォームだ。2026年1月のAI統合発表と2026.1リリースにより、「自然言語でModelicaモデルを生成する」バイブコーディングが実用段階に入った。Simulinkなしでも、EVパワートレイン熱管理システムのモデルを半日で構築してFMUとして書き出せる手順を解説する。

## Modelon Impactとは

**Modelon**はスウェーデン発の企業で、Modelicaシミュレーションエコシステムを長年にわたり牽引している。**Modelon Impact**はそのクラウド型システムシミュレーションプラットフォームで、ブラウザのみでモデリング・シミュレーション・最適化・FMU書き出しが完結する。

- **言語**: Modelica（IEC 61508対応、方程式ベース、マルチフィジックス対応）
- **対応分野**: 自動車、航空宇宙、エネルギー、HVAC、データセンター冷却
- **FMI対応**: モデルをFMU（FMI 2.0/3.0 Co-Simulation）として書き出し可能
- **AI統合**: 2026年1月より自然言語→Modelicaコード生成に対応（2026.1でCode Studio強化）

### SimulinkやGT-SUITEとの違い

| 項目 | Simulink + Simscape | GT-SUITE | Modelon Impact |
|------|--------------------|---------|-----------------|
| 言語・フォーマット | .slx（独自） | 独自形式 | Modelica（ISO標準） |
| ライセンス形態 | 高額・シート制 | 高額・シート制 | クラウド課金 |
| FMU書き出し | 別ライセンス必要 | 独自連携 | 標準機能 |
| AI自然言語生成 | ブロック補完のみ | 非対応 | パッケージ生成対応 |
| ブラウザ動作 | ✗ | ✗ | ✓ |

## 実際の動作：AI「バイブコーディング」ステップバイステップ

Modelon社が公式ブログで実証した「自然言語→Modelicaモデル」ワークフローを、EVパワートレイン冷却システムに適用した手順を示す。

### Step 1: Code StudioのAIチャットでシステムを記述

Modelon ImpactのCode Studio（VS CodeベースのModelica IDE）を開き、AIチャットに以下を入力する：

```
Define a Modelica package for an EV powertrain cooling system.
Components: battery pack (8kW heat source, 40kg, cp=900 J/kg·K),
inverter (2kW heat source), motor (1.5kW heat source),
coolant pump (variable speed), radiator (UA=3000 W/K).
Coolant loop: pump → battery → inverter → motor → radiator → pump.
Add a PI controller to maintain 35°C coolant temperature at radiator outlet.
Use Modelica.Fluid and Modelica.Thermal standard libraries.
```

### Step 2: 生成されたModelicaパッケージの確認と修正

AIが以下の構造のModelicaパッケージを生成する：

```modelica
package EVCooling
  model CoolingLoop
    // コンポーネント宣言
    Modelica.Fluid.Machines.ControlledPump pump(
      m_flow_nominal=0.5,
      dp_nominal=50000);
    Components.BatteryPack battery(
      Q_gen=8000,   // 発熱 8kW
      m=40,         // 質量 40kg
      cp=900);      // 比熱 [J/kg·K]
    Components.Inverter inverter(Q_gen=2000);
    Components.ElectricMotor motor(Q_gen=1500);
    Modelica.Fluid.HeatExchangers.BasicHX radiator(
      UA=3000);
    Modelica.Blocks.Continuous.PI controller(
      k=0.1, Ti=30,
      yMax=1.0, yMin=0.1);

  equation
    // 冷却回路接続
    connect(pump.port_b, battery.port_a);
    connect(battery.port_b, inverter.port_a);
    connect(inverter.port_b, motor.port_a);
    connect(motor.port_b, radiator.port_a);
    connect(radiator.port_b, pump.port_a);
    // PI制御（目標：35°C = 308.15K）
    controller.u_s = 308.15;
    controller.u_m = radiator.port_b.T;
    pump.N_in = controller.y * pump.N_nominal;
  end CoolingLoop;
end EVCooling;
```

生成されたコードにコンパイルエラーが含まれる場合は、AIチャットに「Fix the compilation error in the BatteryPack component」と伝えると修正案が返る。

### Step 3: シミュレーション実行とライブプロット

Code Studioのコンパイル機能でモデルをビルドし、0〜1800秒（30分）のシミュレーションを実行する。Modelon Impact 2026.1から追加された**ライブプロット**機能で、バッテリー温度と冷却水温度のリアルタイム変化を確認できる。

### Step 4: FMUとして書き出し

```
File → Export → FMI 2.0 Co-Simulation FMU
```

生成された`EVCooling_CoolingLoop.fmu`は、SimulinkのFMU Import Block・dSPACE VEOS・GT-LINK・Ansys Twin Builderなど、FMI 2.0対応の任意ツールから呼び出せる。

## Before / After 比較

| 項目 | 従来（Simulink + Simscape） | Modelon Impact + AI |
|------|---------------------------|-------------------|
| 初期モデル構築時間 | 2〜3日（コンポーネント配線・設定） | 約半日（自然言語入力） |
| ライセンス要件 | MATLAB + Simscapeツールボックス | Modelon Impact（クラウド） |
| モデル形式 | .slx（MATLAB依存） | Modelica（ISO標準・ポータブル） |
| FMU書き出し | Simscape要（追加ライセンス） | 標準機能・追加コスト不要 |
| コードの可読性 | ブロック線図（非テキスト） | 方程式テキスト（Gitで差分管理可） |

## 実践コード例：PythonからFMUを読み込んで解析

```python
from fmpy import simulate_fmu
import matplotlib.pyplot as plt

# FMUシミュレーション実行（fmpy使用）
result = simulate_fmu(
    'EVCooling_CoolingLoop.fmu',
    start_time=0,
    stop_time=1800,       # 30分
    output_interval=1.0,
    start_values={
        'battery.Q_gen': 8000,   # バッテリー発熱 8kW
        'motor.Q_gen': 1500      # モーター発熱 1.5kW
    },
    output=['battery.T', 'radiator.port_b.T', 'pump.N_in']
)

# 結果可視化
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8))
ax1.plot(result['time'], result['battery.T'] - 273.15, label='バッテリー温度')
ax1.plot(result['time'], result['radiator.port_b.T'] - 273.15, label='冷却水出口温度')
ax1.axhline(35, ls='--', color='red', label='目標温度 35°C')
ax1.set_ylabel('温度 [°C]'); ax1.legend(); ax1.grid()

ax2.plot(result['time'], result['pump.N_in'], label='ポンプ回転数比 [-]')
ax2.set_xlabel('時間 [s]'); ax2.set_ylabel('回転数比 [-]')
ax2.legend(); ax2.grid()
plt.tight_layout(); plt.show()
```

`fmpy`は`pip install fmpy`でインストールでき、MATLABなしでFMUを解析できる。

## 注意点・落とし穴

**AIが生成したモデルは初期検討段階に留まる**: Modelon社自身が「生産グレードではない」と明言しており、詳細な熱交換器相関式（Chevronコルゲーション等）や検証済みコンポーネントマップは手動追加・実験検証が必要。

**Modelicaの学習コストは避けられない**: Simulinkのブロック線図に慣れたエンジニアにとって、方程式ベースのModelicaは概念的な転換が必要。AIが生成したコードを読んで修正できる程度の理解がなければ、エラー対応ができない。

**2026.1でのAIコード生成は反復修正が不安定**: マルチターンの反復的コード修正はまだ試験段階。コンパイルエラーを含むコードが生成されることがあるため、Modelica構文の基礎知識は必須。

## 応用：より高度な使い方

Modelon ImpactのFMUを**Ansys optiSLang**に取り込み、冷却ポンプ流量・ラジエーターUAをDesign of Experimentで自動最適化するワークフローが実現する。さらに**Vehicle Thermal Management Library（VTMLib）**など産業用Modelicaライブラリと組み合わせれば、AIが生成した初期モデルを産業グレードのコンポーネントで強化できる。ModelicaはテキストベースのためGitでバージョン管理でき、CI/CDパイプラインでシミュレーションを自動実行することも容易だ。

## 今すぐ試せる最初の一歩

Modelon Impactには無料トライアルがある。`modelon.com`でアカウント作成後、Code StudioのAIチャットに以下を入力するだけで5分以内にModelicaシミュレーションが動く：

```
Create a simple Modelica model with one heat source (100 W),
one thermal mass (5 kg, cp=500 J/kg·K), and one heat sink.
Run for 600 seconds and plot temperature vs time.
```

Simulinkなしで方程式ベースの物理モデルが動く感覚を、まずこの最小例で体験してほしい。
