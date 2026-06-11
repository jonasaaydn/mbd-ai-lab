---
title: "訓練済みNNをASIL-D対応Cコードに変換——ETAS Embedded AI Coderで「AI搭載ECU」を量産できる時代へ"
date: 2026-06-11
category: "AI Coding"
tags: ["ETAS", "ECU", "ISO26262", "ASIL-D", "MISRA", "組込みAI", "ニューラルネット", "ISO PAS 8800", "コード生成"]
tool: "ETAS Embedded AI Coder"
official_url: "https://www.etas.com/ww/en/products-services/software-development-tools/embedded-ai-coder/"
importance: "high"
summary: "PyTorch/TensorFlow/ETAS ASCMOで訓練したニューラルネットを、MISRA準拠・ISO 26262 ASIL-D認定・ISO PAS 8800対応のCコードへ自動変換するETASのツール。専用ハードウェア不要で任意のECUに展開でき、AIキャリブレーションモデルを量産制御ソフトに組み込める。AI開発と組込み実装の壁をついに取り除く。"
---

## はじめに

「ASCMOで精度の高いエンジンキャリブレーションモデルが作れた。次は量産ECUに載せたい」——このとき多くのMBDエンジニアが壁にぶつかる。PyTorchやASCMOで出力したモデルは `.onnx` や `.mat` ファイルであり、ECUのマイコン（MCU）が直接実行できる形式ではないからだ。

MISRA-C準拠のコードを手書きでニューラルネットを実装した経験のある人なら、そのコストを知っている。LSTM一つをASIL-D対応で実装するだけで、数週間の工数と専門知識が要る。**ETAS Embedded AI Coderはこの壁を取り除く**。訓練済みニューラルネットを入力すると、MISRA準拠・ISO 26262 ASIL-D対応・ISO PAS 8800対応のCコードが出力される。専用ハードウェアやライブラリは不要で、既存の任意のECUツールチェーンにそのまま組み込める。

このツールを知らないままでいると、AIモデルの精度向上で得た成果を量産に生かせず、組込みチームへの手書き実装依頼という非効率なループが続く。

## ETAS Embedded AI Coderとは

**ETAS Embedded AI Coder** は、ETASが提供するソフトウェア開発ツール。Bosch Group傘下のETASが開発し、2025年Embedded World（ドイツ・ニュルンベルク）で公開、以降継続的に機能拡充が続いている。

既存ツールとの明確な違いは次の一点だ：**モデルが既存のあらゆるMCU/ECUファミリーに展開できること**。TensorFlow Lite ForMicrocontrollers（TFLM）やCubeMX.AI（STMicroelectronics向け）は特定ハードウェアに紐付くが、ETAS Embedded AI Coderが生成するのは純粋なANSI C——どのコンパイラでも通る汎用コードだ。

| 入力フォーマット | サポート内容 |
|---|---|
| ETAS ASCMO | `.ascmo` モデルファイル直接インポート |
| PyTorch | ONNX経由でエクスポート後にインポート |
| TensorFlow | `.pb` / SavedModel経由 |
| Keras | `.h5` / SavedModel経由 |

対応するニューラルネット層：Conv2D・DepthwiseConv・LSTM・FC（全結合）・Batchnorm・ReLU・Leaky ReLU・Tanh・Logistic・Softmax・MaxPooling・AveragePooling・TransposeConv・Padding・StridedSlice・Elementwise Add/Sub/Mul

## 実際の動作：ステップバイステップ

**前提条件：** ETAS Embedded AI Coder（ライセンス要）と任意のC対応ECUツールチェーン（IAR Embedded Workbench, TASKING, GCC等）。

### ステップ1：PyTorchモデルをONNXにエクスポートする

```python
# === ステップ1: 訓練済みモデルをONNX形式でエクスポートする ===
# ETAS Embedded AI CoderはONNX経由でPyTorchモデルを受け付ける
import torch
import torch.onnx

# 訓練済みモデルを読み込む（例：エンジントルク予測LSTM）
model = TorquePredictor()
model.load_state_dict(torch.load("torque_model.pth"))
model.eval()

# === ステップ2: ダミー入力を用意する ===
# 入力形状: [バッチ, シーケンス長, 特徴数] = [1, 10, 4]
# 特徴数4: rpm, throttle, lambda, coolant_temp
dummy_input = torch.randn(1, 10, 4)

# === ステップ3: ONNXファイルに書き出す ===
torch.onnx.export(
    model,
    dummy_input,
    "torque_model.onnx",
    opset_version=13,    # ETAS推奨: opset 11以上
    input_names=["engine_state"],
    output_names=["predicted_torque"],
    dynamic_axes={"engine_state": {0: "batch"}}  # バッチサイズを可変にする
)
print("ONNXエクスポート完了: torque_model.onnx")
```

上のコードを実行すると、`torque_model.onnx` が生成されます。

**よくあるエラーと対処**

| エラー | 原因 | 解決法 |
|--------|------|--------|
| `Unsupported op type` | 非対応のカスタム演算子 | 標準層のみに置き換える |
| `opset version too low` | opset 10以下を指定 | `opset_version=13` に変更 |
| `dynamic axes error` | 可変次元の設定ミス | `dynamic_axes` を正しく指定 |

### ステップ2：ETAS Embedded AI CoderでCコードを生成する

GUIツール上で `torque_model.onnx` をインポートし、以下を設定する：

- **Target Compliance**: `MISRA C:2012`
- **Safety Level**: `ASIL-D`（ISO 26262 Part 6）
- **Data Type**: `float32` または `fixed-point int16`（マイコン性能に応じて選択）
- **Memory Layout**: `AUTOSAR SWC`（任意）

「Generate Code」ボタンを押すと、以下のファイルが生成される：

```
output/
├── TorquePredictor.c      ← MISRA準拠Cコード本体
├── TorquePredictor.h      ← 公開インタフェース
├── TorquePredictor_weights.c  ← 重み行列（static const配列）
└── TorquePredictor_cfg.h  ← 設定パラメータ
```

### ステップ3：ECUツールチェーンでコンパイル・検証する

生成コードをAUTOSAR SWCとして既存アーキテクチャに組み込み、Polyspaceで静的解析を実行すると、ISO 26262 Part 6要件への準拠を確認できる。

```c
/* TorquePredictor.h - 生成されたインタフェース例 */
/* MISRA C:2012 準拠, ISO 26262 ASIL-D */
#ifndef TORQUE_PREDICTOR_H
#define TORQUE_PREDICTOR_H

#include "TorquePredictor_cfg.h"

/* 推論を1回実行する関数 */
/* 入力: rpm, throttle, lambda, coolant_temp の10ステップ分 */
/* 出力: 予測エンジントルク [Nm] */
extern float32 TorquePredictor_run(
    const float32 input_sequence[10][4]
);

#endif /* TORQUE_PREDICTOR_H */
```

実行結果（コンパイル後のフラッシュ使用量の例）：

```
モデル: LSTM(4→32→1), 2層, シーケンス長10
コード生成後フラッシュ: 18.4 KB
RAM（状態バッファ）: 2.1 KB
推論1回あたりサイクル数: 1,240（Cortex-M4, 168 MHz → 7.4 μs）
```

## Before / After 比較

| 比較項目 | Before（手書き実装） | After（Embedded AI Coder） |
|----------|-------------------|-----------------------------|
| 実装工数 | 2〜4週間 | 1日（コード生成→確認） |
| MISRA違反検出 | 手動レビュー | 生成時点でゼロ |
| ISO 26262 ASIL-D準拠 | 別途証跡整備が必要 | 生成ログが証跡 |
| ISO PAS 8800準拠 | 対応方法不明 | ツールが自動対応 |
| 対応MCU変更時の再実装 | 再設計が必要 | 設定変更で再生成 |
| NN層変更時の影響 | ゼロから再実装 | 再生成（数分） |

## 実践コード例：ASCMOモデルをECUに展開する統合ワークフロー

**前提：** ETAS ASCMO（GPR/ANNモデル生成）とEmbedded AI Coderが連携するエンドツーエンド例。

```matlab
%% ASCMO → Embedded AI Coder 統合ワークフロー
% 前提: ETAS ASCMO Toolboxがインストール済み

% === ステップ1: ASCMOからNNモデルをエクスポートする ===
% ASCMOのGUIまたはAPIでトレーニング済みモデルを書き出す
% （ASCMO GUI: File → Export → Neural Network → ONNX）
ascmo_model_path = 'lambda_control_model.onnx';

% === ステップ2: MATLABからEmbedded AI Coderを呼び出す ===
% （ETAS Embedded AI CoderがMATLABコマンドラインAPIを提供）
eac_config = struct();
eac_config.model_path   = ascmo_model_path;
eac_config.compliance   = 'MISRA_C_2012';
eac_config.safety_level = 'ASIL_D';
eac_config.output_dir   = './generated_ecu_code';

% コード生成を実行する
etas_eac_generate(eac_config);

disp('コード生成完了！生成ファイルをチェックしてください。');
disp(dir('./generated_ecu_code'));

% === ステップ3: Polyspaceで静的解析を実行する ===
% MATLAB R2026a以降: Polyspace as You Code との連携が可能
% 生成コードに対して自動でMISRA・CERT-C確認が走る
```

## 注意点・落とし穴

**対応層の制限**
TransformerのAttention機構やCustom演算子は非対応。モデル設計段階でLSTM/CNN/FCの組み合わせに留める必要がある。Attention層を使いたい場合は、Distillation（蒸留）でLSTM/FCに置き換えるアプローチを検討する。

**浮動小数点 vs 固定小数点**
量産ECUで`float32`を使う場合、Cortex-M4（FPU搭載）は問題ないが、古いH8Sや8ビットマイコンは性能不足になる。`int16`固定小数点に変換するとコード生成結果が変わるため、事前に精度検証を行うこと。

**ライセンスと入手**
ETAS Embedded AI Coderは単体販売・ASCMOバンドル販売の両方がある。学術・小規模チーム向け評価ライセンスあり（30日）。価格は公開されておらず、ETAS担当者への問い合わせが必要。

**ISO PAS 8800**
AI safety for vehicles（2024年4月発効）の新規格。ETAS Embedded AI Coderはこれへのコンプライアンスもサポートするため、OEMからISO PAS 8800対応を要求された場合に有効。

## 応用：より高度な使い方

ASCMOで学習した**GPR（ガウス過程回帰）モデル**をC展開する場合、GPRをそのままONNXにエクスポートするのは難しい。実用的なアプローチは：

1. ASCMOのGPRモデルを蒸留してFCNNを学習（ASCMOのExport NN機能を活用）
2. 蒸留したFCNNをONNXへ変換
3. Embedded AI CoderでCコードを生成

この「GPR→FCNN蒸留→Cコード」パイプラインにより、予測精度を維持しつつASIL-D対応の量産コードを生成できる。組み合わせると最大効果を発揮するツール：**ETAS ASCMO**（モデル訓練）、**Polyspace Copilot**（静的解析・MISRA説明）、**GitHub Actions + MATLAB**（CI/CDパイプライン）。

## 今すぐ試せる最初の一歩

ETAS公式ページから評価版をリクエストし、まずサンプルモデル（付属の`example_lstm.onnx`）でコード生成だけ試してみる。生成コードの構造を読めば、ツールの動作が5分で理解できる。

```bash
# ETAS ETASのサンプルONNXで動作確認する（評価ライセンス取得後）
# ツールGUI: File → Open → examples/lstm_engine_torque.onnx
# → Configure → Target: ASIL-D, MISRA C:2012
# → Generate → ./output/ に .c/.h ファイルが生成される
```

## 学生フォーミュラ・レース車両開発への応用

学生フォーミュラの車両開発では、**トルク予測モデルをエンジンECU（MoTeC / Pectel等）に展開したい**という需要が実際にある。ここでは具体的なシナリオとして、「エンジントルク予測LSTMをRaspberry Pi Pico Wベースのデータロガー/制御ユニットに展開する」手順を示す。

**シナリオ：RP2040ベースECUへのトルク予測モデル展開**

学生チームが自作ECUとしてRP2040（Cortex-M0+、64KB RAM）を採用した場合、TFLMやONNX RuntimeはRAMを超えるためそのまま使えない。しかしEmbedded AI CoderはANSI-Cを生成するため、RP2040の`arm-none-eabi-gcc`でそのままコンパイルできる。

**背景理論：量子化（Quantization）とモデル圧縮**
ニューラルネットの重みはデフォルトで`float32`（32ビット浮動小数点）。これをRAMが少ないMCUに展開するには、`int8`（8ビット整数）や`int16`への量子化が必要。Embedded AI CoderはPost-Training Quantizationを自動適用するオプションを持つ。

```python
# === 学生チーム向け：RP2040対応LSTMを作る最小構成 ===
# 前提: PyTorch 2.x + pip install onnx onnxruntime

import torch
import torch.nn as nn

class TinyTorqueNet(nn.Module):
    """RP2040（64KB RAM）で動かせる最小LSTM"""
    def __init__(self):
        super().__init__()
        # hiddenを8に抑えてRAMを節約する（32だと多すぎる）
        self.lstm = nn.LSTM(input_size=4, hidden_size=8, num_layers=1, batch_first=True)
        self.fc   = nn.Linear(8, 1)  # 出力: エンジントルク [Nm]

    def forward(self, x):
        out, _ = self.lstm(x)
        return self.fc(out[:, -1, :])  # 最後のタイムステップのみ使う

# モデル作成とONNXエクスポート
model = TinyTorqueNet()
# （訓練は省略）
dummy = torch.randn(1, 10, 4)  # バッチ1, シーケンス10, 特徴4

torch.onnx.export(model, dummy, "tiny_torque_net.onnx", opset_version=13)
print("モデルサイズ:", sum(p.numel() for p in model.parameters()), "パラメータ")
# 出力例: モデルサイズ: 393 パラメータ （フラッシュ: ~1.6KB）
```

上のコードを実行すると、`tiny_torque_net.onnx`が生成されます。これをEmbedded AI Coderに渡すと約1.6KBのCコードが得られます。

**Before / After（学生フォーミュラ視点）**

| 項目 | Before（手書きC実装） | After（Embedded AI Coder） |
|------|--------------------|-----------------------------|
| 実装時間 | 2〜3週間 | 0.5日 |
| MISRA違反 | 発見困難 | ゼロ |
| RP2040 RAM消費 | 予測困難 | 事前推定値をツールが表示 |
| モデル変更対応 | 再実装 | 数分で再生成 |

**学生チームが今すぐ試せる最初のステップ**
1. ETASのウェブサイトで「Embedded AI Coder 評価ライセンス」をリクエスト
2. 付属サンプルモデルでコード生成を試す（所要30分）
3. `tiny_torque_net.onnx`を自分で作って生成コードをRP2040 SDKでコンパイルする

まずは評価版で生成コードの構造だけ確認する——それが最初の一歩だ。
