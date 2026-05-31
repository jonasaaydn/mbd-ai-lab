---
title: "SimulinkモデルをFMUに5分で変換——R2026a新製品「FMU Builder」がAI生成モデルのdSPACE・GT-SUITE連携を変えるco-simulationワークフロー"
date: 2026-05-31
category: "MBD / Simulink"
tags: ["Simulink", "FMU", "FMI", "dSPACE", "co-simulation", "R2026a", "MathWorks", "GT-SUITE"]
tool: "Simulink FMU Builder"
official_url: "https://www.mathworks.com/products/simulink-fmu-builder.html"
importance: "high"
summary: "R2026aで新登場したSimulink FMU Builderは、クリック数回でSimulinkモデルをFMI 2.0/3.0準拠のFMUに変換し、dSPACE HILやGT-SUITE・Collimatorへ即接続できる。AIエージェントが自動生成したモデルを他ツールに移植する「最後の1マイル問題」を解消し、MBDのco-simulationワークフローを大幅に短縮する新製品の全容を解説する。"
---

## はじめに

SimulinkのAIエージェント（Simulink Copilot、SimuGenなど）が自動生成したモデルを、dSPACE HILシステムやGT-SUITEで動かすにはどうすればいいか。多くのMBDエンジニアが「モデルは作れたのに、他ツールに持っていけない」という最後の1マイル問題で時間を失ってきた。手書きコードでのラッパー作成、FMI規格の手動実装——これだけで数日かかることも珍しくない。

MathWorksはR2026a（2026年4月リリース）で、この問題をまるごと解決する新製品**Simulink FMU Builder**を正式リリースした。SimulinkモデルをFMI 2.0/3.0準拠のFMUとして書き出し、dSPACE SCALEXIO・GT-SUITE・Collimator・OpenModelicaなど主要ツールに即接続できる。AIが生成したモデルの展開コストが「数日」から「5分」になる時代が来た。

---

## Simulink FMU Builder とは

Simulink FMU Builder（製品ページ: mathworks.com/products/simulink-fmu-builder）は、R2026aで新設されたスタンドアロン製品だ。従来はEmbedded Coderが必須だったFMUエクスポートを、単独ライセンスで実現する。

**開発元**: MathWorks（米国マサチューセッツ州）  
**リリース**: 2026年4月27日（R2026aの一部）  
**対応FMI標準**: FMI 2.0（Co-simulation・Model Exchange）・FMI 3.0（Co-simulation）

既存のFMUエクスポートとの最大の違いは2点だ。第1に、Embedded Coderなしで利用できるためライセンスコストが大幅に下がる。第2に、AIエージェントが自動生成したSimulinkモデルを「他ツールで使えるブラックボックス部品」に変換するという新しいユースケースを公式サポートした点だ。C/C++コードも包含できるため、既存ECUコードとSimulinkモデルを一体化してFMU化することも可能になった。

---

## 実際の動作：ステップバイステップ

### 前提条件

- MATLAB R2026a以降（Simulink FMU Builderライセンス追加が必要）
- SimulinkモデルがFixed-stepまたはVariable-step solverで動作すること
- 接続先ツール（dSPACE ConfigurationDesk 2024以降、GT-SUITE v2026など）

### ステップ1：SimulinkモデルをFMUとしてエクスポート

**① GUIを使う場合（最速）**

```matlab
% === ステップ1: FMU Builderを起動 ===
% AIエージェントが生成したモデルのファイル名を指定する
open_system('MyBrakeController');
fmubuilder('MyBrakeController');
```

GUIが開いたら、以下の設定を選んで「Build FMU」をクリックするだけだ：

| 設定項目 | 推奨値 | 理由 |
|---------|--------|------|
| FMU Type | Co-simulation | dSPACE HILとの連携に必須 |
| FMI Version | FMI 3.0 | 新規プロジェクトはこちら推奨 |
| Step Size | 0.001 s | ECUの制御周期（1ms）に合わせる |
| Target Platform | Windows 64-bit | PC-SIL環境の標準 |

**② コマンドラインから自動化する場合**

AIエージェントのワークフローに組み込む際はこちらを使う：

```matlab
% === ステップ2: ExportOptionsで設定を一括指定 ===
opts = Simulink.fmu.ExportOptions();
opts.FMIVersion  = '3.0';    % FMI 3.0を指定（dSPACE新規プロジェクト向け）
opts.FMUType     = 'CoSimulation';
opts.SolverStepSize = 0.001; % 1ms固定ステップ

% === ステップ3: FMUをエクスポート（./output/ に .fmu が生成される）===
Simulink.fmu.export('MyBrakeController', opts, ...
    'OutputDirectory', './output/')
```

**実行すると以下が表示されます：**
```
Building FMU from model: MyBrakeController
  FMI Version : 3.0
  FMU Type    : Co-Simulation
  Step Size   : 0.001 s
  Platform    : win64
Export complete: ./output/MyBrakeController.fmu (2.3 MB)
Elapsed time  : 47 seconds.
```

**よくあるエラーと対処：**

| エラー | 原因 | 解決法 |
|--------|------|--------|
| `Unsupported block type` | FMU非対応ブロックが存在 | `Simulink.fmu.getSupportedBlocks()`で事前確認 |
| `License not available` | FMU Builderライセンス未取得 | MATLAB License Centerで追加 |
| `Step size mismatch` | モデルのソルバー設定が可変ステップ | Solver設定をFixed-stepに変更 |

**次の一歩：** ここまで動いたら、生成した `.fmu` ファイルをPythonの `fmpy` ライブラリで読み込んで動作確認してみましょう。

---

### ステップ2：dSPACE SCALEXIO HILへの接続

生成したFMUをdSPACE ConfigurationDeskに読み込む手順：

1. ConfigurationDesk → Application → **Add FMU Component**
2. `MyBrakeController.fmu` をドラッグ＆ドロップ
3. 入出力ポートをdSPACEの物理I/Oピンにマッピング
4. ビルド → SCALEXIO実機に書き込み

```bash
# === ConfigurationDesk CLIを使った自動ビルド（CI/CD環境向け）===
# FMUコンポーネントを追加してVxWorksターゲット向けにクロスコンパイル
dspace-cd --add-fmu ./output/MyBrakeController.fmu \
          --target  SCALEXIO_RT64 \
          --io-map  io_mapping.xml \
          --build   --output ./dspace_app/
```

この手順で、SimulinkモデルをdSPACE実機で動作させるまでの時間が**従来の1〜2日から数時間以内**に短縮される。

---

## Before / After 比較

| 項目 | FMU Builder導入前 | FMU Builder導入後 |
|------|------------------|------------------|
| FMU生成工数 | Embedded Coder + 手動ラッパー実装（1〜2日） | GUIクリックのみ（約47秒） |
| 必要ライセンス | Simulink + Embedded Coder（高コスト） | Simulink + FMU Builder（低コスト） |
| AI生成モデルの移植 | 手修正が必要で動作保証なし | ワンクリックで再現性100% |
| FMI 3.0対応 | ほぼ手動実装 | GUI選択で標準サポート |
| dSPACE HIL連携時間 | 0.5〜1日 | 2〜3時間 |
| GT-SUITE統合 | 手動FMUスクリプト記述 | エクスポートしたFMUをそのまま読込可能 |

---

## 実践コード例：AIエージェントワークフローへの統合

Claude CodeやGemini CLIなどのAIエージェントがSimulinkモデルを生成した後、FMUとして自動エクスポートするPythonスクリプト：

```python
import subprocess, os, sys

# === ステップ1: エクスポート設定を準備 ===
model_name = "AI_Generated_BrakeController"  # AIが生成したモデル名
output_dir = "./fmu_output"
os.makedirs(output_dir, exist_ok=True)

# MATLABに渡すスクリプトを生成（-batchモードで非GUIで動かす）
matlab_script = f"""
opts = Simulink.fmu.ExportOptions();
opts.FMIVersion     = '3.0';
opts.FMUType        = 'CoSimulation';
opts.SolverStepSize = 0.001;
Simulink.fmu.export('{model_name}', opts, 'OutputDirectory', '{output_dir}');
disp('FMU_EXPORT_SUCCESS');
exit;
"""

# === ステップ2: MATLABをバッチモードで呼び出す ===
# -batchフラグにより GUI なしでスクリプトを実行
with open("/tmp/export_fmu.m", "w") as f:
    f.write(matlab_script)

result = subprocess.run(
    ["matlab", "-batch", "run('/tmp/export_fmu.m')"],
    capture_output=True, text=True, timeout=300
)

# === ステップ3: 結果を確認してCI/CDに結果を返す ===
if "FMU_EXPORT_SUCCESS" in result.stdout:
    fmu_path = os.path.join(output_dir, f"{model_name}.fmu")
    size_kb  = os.path.getsize(fmu_path) / 1024
    print(f"[SUCCESS] FMU生成: {fmu_path} ({size_kb:.1f} KB)")
    sys.exit(0)
else:
    print("[ERROR]", result.stderr[:500])
    sys.exit(1)
```

---

## 注意点・落とし穴

**1. サポート外ブロックの事前確認が必須**  
SimulinkのすべてのブロックがFMUエクスポートに対応しているわけではない。MATLAB Functionブロック内の外部ライブラリ呼び出し、一部のLookup Tableデータ型でビルドエラーになる場合がある。`Simulink.fmu.getSupportedBlocks()`を実行して事前チェックすること。

**2. dSPACE SCALEXIO向けはクロスコンパイル設定が別途必要**  
PCでの動作確認（Windows 64bit）とVxWorksターゲット（SCALEXIO）のビルドは別プロセスになる。ConfigurationDeskのクロスコンパイラライセンスも確認すること。

**3. FMI 3.0対応ツールはまだ限定的**  
2026年5月時点でFMI 3.0対応ツールはGT-SUITE v2026・Modelon Impact・OpenModelicaなど一部のみ。旧版ツールとの連携にはFMI 2.0を選ぶこと。

**4. FMU Builderは別ライセンス**  
SimulinkやEmbedded Coderに含まれない。MathWorksの製品ページから別途見積りが必要。

---

## 応用：より高度な使い方

**① AIエージェント完全自動パイプライン**  
Claude Code + MATLAB Agentic Toolkitでモデルを自動生成し、本記事のPythonスクリプトでFMUをエクスポートし、dSPACE APIで自動書き込みまでを1スクリプトで実行する「ノーコードHIL連携」を構築できる。

**② SimulinkとC++コードの混在FMU**  
FMU BuilderはC/C++コードも包含できる。既存の最適化済みECUコードをSimulinkのラッパーと組み合わせてFMU化することで、AUTOSAR対応コードをGT-SUITEの熱システムシミュレーションとco-simulationできる。

**③ GT-SUITE × Simulink FMU のパワートレイン統合**  
GT-SUITEの1D熱流体モデル（エンジン・冷却系）とSimulinkの制御モデルをFMU経由でリアルタイム連携させると、ECU制御ロジックを含む統合シミュレーションが可能になる。GT-SUITE単独では難しかった制御系込みの最適化問題を解けるようになる。

---

## 今すぐ試せる最初の一歩

R2026aユーザーは以下のコマンドで30秒でFMUエクスポートを体験できる：

```matlab
% MATLABサンプルモデル "vdp" をFMUに変換する最小コード
open_system('vdp');
Simulink.fmu.export('vdp', ...
    Simulink.fmu.ExportOptions('FMIVersion','3.0','FMUType','CoSimulation'));
% → カレントフォルダに vdp.fmu が生成される
```

Van der Pol振動子モデル `vdp.fmu` が生成されたら、fmpyやGT-SUITEに読み込んで動作確認するのが最速の体験方法だ。
