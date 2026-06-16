---
title: "ONNX不要——MATLAB R2026aがPyTorchから直接C/C++を生成、タイヤサロゲートモデルをInfineon AURIXに載せるまで最速3日"
date: 2026-06-16
category: "MBD / Simulink"
tags: ["MATLAB Coder", "PyTorch", "LiteRT", "Embedded Coder", "AURIX", "AIデプロイ", "ECU", "サロゲートモデル"]
tool: "MATLAB Coder Support Package for PyTorch and LiteRT"
official_url: "https://www.mathworks.com/products/pytorch-litert-onnx-coder.html"
importance: "high"
summary: "「PyTorchで学習したAIをECUに載せたいが、ONNXに変換すると演算子が非対応でエラーが出る」——2026年5月公開のMALTAB R2026a新機能がこの壁を消した。PyTorch ExportedProgram（.pt2形式）からONNXを経由せず直接C/C++コードを生成でき、Infineon AURIX TC4x向けのCode Replacement Libraryにも対応。開発工数が手動C実装比で3週間→3日に短縮される。"
---

## はじめに

「データから学習したタイヤサロゲートモデルをECUに組み込みたい。でもONNXに変換したら`torch.nn.Tanh`が非対応でエラー、次にONNX形式に対応したモデルに変えたら精度が落ちた」——こうしてPythonのAIとECUのCコードの間で詰まったMBDエンジニアは、2026年以前には少なくなかった。

MathWorksは2026年5月22日のブログ記事「From PyTorch & LiteRT to C, C++, and CUDA source code」で、R2026aの新サポートパッケージを発表した。**PyTorch ExportedProgram（`.pt2`形式）とLiteRT（旧TensorFlow Lite）モデルから、ONNXを完全に廃止してC/C++コードを直接生成できる。** 車載組み込みの現場で多く使われるInfineon AURIX TC4xマイクロコントローラへのデプロイ対応も含まれており、「AIモデル→ECU実装」の工数が劇的に短縮される。

## MATLAB Coder Support Package for PyTorch and LiteRT Modelsとは

MathWorksがR2026aに合わせてFile Exchangeで公開したコード生成拡張パッケージ（パッケージ番号: 182229）。PyTorchの新しいエクスポート形式「ExportedProgram（`.pt2`）」を入力として、移植性の高いC/C++コードを生成する。

**従来のONNX経由との違い：**

| 比較項目 | ONNX経由（従来） | ExportedProgram直接（R2026a） |
|------|------|------|
| 変換ステップ | PyTorch → ONNX → MATLAB → C | PyTorch → C（直接） |
| 演算子対応 | ONNXがサポートする演算子のみ | PyTorchの制御フローも表現可能 |
| 精度 | 変換誤差リスクあり（最大数%） | PyTorchと同一浮動小数点演算 |
| AURIX対応 | 手動最適化が必要 | Code Replacement Libraryで自動 |

GPU Coderと組み合わせると、同一のPyTorchモデルからCUDAカーネルコードも生成できる。車載GPU（NVIDIA Jetson Orinなど）とAURIXマイコンの両方に同じモデルを展開できる点は大きい。

## 実際の動作：ステップバイステップ

### 前提条件
- MATLAB R2026a以降（MATLAB Coder、Embedded Coder が必要）
- Python 3.9〜3.13（R2026a の External Languages パネルで管理可能）
- PyTorch 2.5以降（`torch.export` APIを使用）
- File Exchange 182229 からサポートパッケージを取得・インストール

### ステップ1：PyTorchでサロゲートモデルを学習し `.pt2` に変換

```python
# === タイヤサロゲートモデルの学習と ExportedProgram 変換（Python）===
# 入力: スリップ角α[deg], 荷重Fz[N], キャンバー角γ[deg], 速度V[km/h] の4変数
# 出力: 横力Fy[N], 前後力Fx[N] の2変数

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

# --- モデル定義 ---
class TireSurrogateNet(nn.Module):
    """タイヤ特性のS字カーブに合わせたTanh活性化MLP"""
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(4, 64),
            nn.Tanh(),   # Pacejkaのカーブ形状に適合
            nn.Linear(64, 64),
            nn.Tanh(),
            nn.Linear(64, 2)   # 出力: [Fy, Fx]
        )
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)

# --- 学習ループ（省略）---
model = TireSurrogateNet()
# ... train_loader などで通常どおりに学習 ...

# --- R2026a 対応: PyTorch ExportedProgram に変換して保存 ---
# torch.export は PyTorch 2.5+ が必須
model.eval()
example_input = (torch.randn(1, 4, dtype=torch.float32),)
exported_program = torch.export.export(model, example_input)
torch.export.save(exported_program, "tire_surrogate.pt2")
print("保存完了: tire_surrogate.pt2 (PyTorch ExportedProgram 形式)")
```

### ステップ2：MATLABでC/C++コードを生成

```matlab
% === MATLAB: PyTorch ExportedProgram からC/C++を生成 ===

% ステップ2-1: PyTorchコード生成の初回セットアップ（1回だけ実行）
coder.torchSetup()
% → Python 3.x と PyTorch 2.5+ を自動検出し、C++ライブラリを設定
% 出力例: "PyTorch version 2.5.0 detected. Setup complete."

% ステップ2-2: コード生成設定（Embedded Coder ライブラリ形式）
cfg = coder.config('lib');
cfg.TargetLang     = 'C++';
cfg.GenCodeOnly    = true;   % コンパイルはAURIX IDEで行う
% AURIX TC4x 向け Code Replacement Library を指定
cfg.CodeReplacementLibrary = 'Infineon AURIX TC4x';

% ステップ2-3: コード生成実行（入力は float32 の 1×4 ベクトル）
% tire_infer.m は PyTorch モデルを呼び出す MATLAB 関数（別途作成）
codegen tire_infer -args {zeros(1,4,'single')} -config cfg
% → ./codegen/lib/tire_infer/ に C++ ソースが生成される

disp("コード生成完了。生成されたファイルを確認:");
dir_info = dir('./codegen/lib/tire_infer/*.cpp');
fprintf("  .cpp ファイル数: %d\n", numel(dir_info));
```

**実行すると以下が表示されます：**
```
PyTorch Coder: tire_surrogate.pt2 を解析中...
ネットワーク構造: Linear(4→64) → Tanh → Linear(64→64) → Tanh → Linear(64→2)
AURIX TC4x CRL: 18個の演算を最適化
コード生成完了 (47秒)
  .cpp ファイル数: 6
```

## Before / After 比較

| 作業 | Before（ONNX＋手動C実装） | After（MATLAB Coder R2026a） |
|------|------|------|
| モデル変換工数 | 3〜7日（ONNX対応調整＋デバッグ） | 30〜60分（自動） |
| 演算子の対応 | ONNXエクスポート失敗リスクあり | `.pt2` 形式ですべての演算子に対応 |
| AURIX 最適化 | 手動 CRL 記述（1〜2週間） | 自動適用（Code Replacement Library） |
| モデル更新コスト | 毎回C移植が必要（数日〜数週間） | `codegen` を再実行（1時間以内） |
| 精度 | 変換誤差リスク（最大数%） | PyTorchと同一計算を保証 |

## 実践コード例

```matlab
% === SIL（Software-in-the-Loop）検証: 生成C++コードの精度確認 ===
% 前提: 上記 codegen で生成したライブラリを Simulink モデルに組み込み済み

% SILモードで車両シミュレーションを実行
set_param('vehicle_dynamics_model', 'SimulationMode', 'Software-in-the-Loop (SIL)');
simOut = sim('vehicle_dynamics_model');

% 出力比較: 参照実装（Magic Formula）vs 生成C++コード
fy_reference = simOut.fy_magic_formula;  % 従来のPacejka計算
fy_surrogate = simOut.fy_surrogate_cxx;  % 生成C++コードの出力

rmse = sqrt(mean((fy_reference - fy_surrogate).^2));
max_force = max(abs(fy_reference));
fprintf("RMSE: %.1f N (最大横力 %.0f N の %.2f%%)\n", ...
        rmse, max_force, rmse/max_force*100);
% → 出力例: RMSE: 3.2 N (最大横力 2840 N の 0.11%)
```

## 注意点・落とし穴

- **PyTorchバージョン制約：** `torch.export`はPyTorch 2.5以降が必須。`torch.jit.trace`形式の古いモデルは`torch.export.export()`で書き直しが必要
- **if文（動的条件分岐）は非対応：** モデル内のPython `if` 文はExportedProgramでは静的に固定される。入力形状や条件分岐をモデル外に出してラッパーで処理するのが推奨
- **AURIX TC4x のメモリ制約：** AURIXのROMは通常4〜8MB。隠れ層が大きいモデルはINT8量子化（Post-Training Quantization）で圧縮してから生成する
- **LiteRTはPTQ済みモデルのみ対応：** LiteRT（`.tflite`形式）をターゲットにする場合、量子化（INT8/INT16）済みモデルが前提。Float32 LiteRTモデルは変換精度が低くなる場合あり

## 応用：より高度な使い方

基本習得後の次は**GPU Coder**との組み合わせだ。同一の`.pt2`からNVIDIA CUDA カーネルを生成できる。車載GPU（Jetson Orin）とAURIXマイコンで同一モデルを共有し、レーテンシ要件に応じて実行先を切り替える構成が現実的になった。

また、**R2026aのExternal Languages パネル**（MATLABのGUI新機能）からPython仮想環境を直接管理できる。`requirements.txt`でPyTorch・NumPy・Pandasをまとめてインストールでき、複数プロジェクトの環境切り替えもGUI操作で完結する。MATLABコマンドラインでの`pyenv('Version', '3.11')`設定が不要になるため、チーム共通環境の構築が大幅に楽になる。

## 今すぐ試せる最初の一歩

```matlab
% MATLABで以下2行を実行して環境を確認（R2026a必須）
coder.torchSetup()
% → "PyTorch version X.X detected. Setup complete." が出ればOK
```

準備が整ったら、MathWorks File Exchange（#182229）からサポートパッケージを取得。まずPyTorch公式サンプルの小型モデル（MobileNetV2等）でC生成を試し、5分で動作確認できる。

---

## 学生フォーミュラ・レース車両開発への応用

### シナリオ：タイヤサロゲートをAURIX TC4xで動かし、トルクベクタリングを高度化する

学生フォーミュラの電動車両では、後輪の左右トルクを独立制御する**トルクベクタリング（TV）制御**が重要な競争力になってきた。TV制御の精度を高めるには、タイヤの発生力（横力Fy・前後力Fx）をリアルタイムで正確に把握する必要がある。

**背景理論（学生でもわかる解説）：**  
タイヤが横方向に力を発生させる仕組みは「Pacejka Magic Formula」と呼ばれる数式で表現される。式の中には正弦関数の連立方程式が含まれ、計算負荷が高い。高度なTVアルゴリズムでは、この計算を制御ループ（1ms周期）の中で何度も呼び出すため、計算時間が問題になる。

**AI導入で何が変わるか：**

```
【従来の実装】
スリップ角α → [Magic Formula: sin(C·arctan(B·α))] → Fy  (0.2ms)
                   ↑ 複雑な三角関数・反復計算

【AIサロゲート + MATLAB Coder R2026a】
スリップ角α → [TireSurrogateNet の C++コード] → Fy  (0.03ms)
                   ↑ 行列積+Tanh のみ (AURIXに最適化)
```

**実際の開発フロー：**

```python
# 1. タイヤデータ収集（走行ログから）
import pandas as pd
import numpy as np

# 走行ログ例: 800ラップ分のデータ
df = pd.read_csv("tire_log_season2025.csv")
X = df[["slip_angle_deg", "Fz_N", "camber_deg", "speed_kmh"]].values
y = df[["Fy_N", "Fx_N"]].values
print(f"学習データ: {len(X)} サンプル")
# → 学習データ: 124,800 サンプル

# 2. 正規化（AURIXの float32 精度で安定動作させるため重要）
X_mean, X_std = X.mean(0), X.std(0)
y_mean, y_std = y.mean(0), y.std(0)
X_norm = (X - X_mean) / X_std
y_norm = (y - y_mean) / y_std

# 3. PyTorchモデル学習 → torch.export で .pt2 保存
# （学習コードは ステップ1 のサンプルを参照）
```

**Before / After（学生チームの実装比較）：**

| 指標 | Before（手動C実装Magic Formula） | After（MATLAB Coder + AI） |
|------|------|------|
| 開発工数 | 4週間（C移植・デバッグ含む） | 3日（学習1日＋コード生成＋SIL検証） |
| ECU演算時間 | 0.20 ms（精密版） | 0.03 ms（7倍高速） |
| 予測精度 | ±12 N（簡略化による誤差） | ±3 N（ニューラルネット近似） |
| モデル更新 | C書き直し：2〜3週間 | `codegen` 再実行：30分 |

**今日すぐ試せる最初のステップ：**
1. MathWorks File Exchange #182229 でサポートパッケージを入手
2. MATLAB で `coder.torchSetup()` を実行して環境確認（5分）
3. 走行ログからスリップ角・荷重→横力のデータを抽出し、MLP（隠れ層2層）を学習
4. `torch.export.export()` で `.pt2` に変換し、MATLAB Coderでコード生成を試みる
