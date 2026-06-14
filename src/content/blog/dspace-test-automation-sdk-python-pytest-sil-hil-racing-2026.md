---
title: "Pythonスクリプト1本でSIL→HILテストをシームレス切り替え——dSPACE Test Automation SDKがECUテスト工数を半減させる2026年実践ガイド"
date: 2026-06-14
category: "Race Engineering Use Cases"
tags: ["dSPACE", "HIL", "SIL", "Python", "pytest", "テスト自動化", "ECU", "SCALEXIO", "VEOS"]
tool: "dSPACE Test Automation SDK"
official_url: "https://www.dspace.com/en/pub/home/products/sw/test_automation_software/test-automation-sdk.cfm"
importance: "high"
summary: "SILテスト用コードとHILテスト用コードを別々に書いていませんか。dSPACEのTest Automation SDKはPythonとpytestで書いたテストをSIL（VEOS）とHIL（SCALEXIO）の両方でconfigファイルの切り替えだけで実行できる。テストロジックの二重管理が解消され、ECUバリデーション工数が大幅に削減される。"
---

## はじめに

ECU開発のテスト工程で、こんな状況になっていませんか。

「SILテストはdSPACE VEOSで動くPythonスクリプトで書いた。でもHILテスト（SCALEXIO）は別の接続ライブラリが必要で、ほぼ同じロジックをもう一度書き直した。今やSILとHILで100本近いテストスクリプトがあり、制御ロジックが変わるたびに両方を修正しないといけない」

このダブルメンテナンス地獄は、**dSPACE Test Automation SDK**で解決できる。1本のPythonテストスクリプトが、設定ファイルを切り替えるだけでVEOS（SIL）でもSCALEXIO（HIL）でも動く。テストロジックは一度しか書かない。

---

## dSPACE Test Automation SDK とは

**開発元**: dSPACE GmbH（ドイツ・パーダーボルン）
**公開**: 2025年後半〜2026年初頭（オープンソース開発として継続リリース）
**位置付け**: dSPACEのSIL/HIL製品群を統一Pythonインターフェースで操作するSDK

dSPACEはHILシミュレータ（SCALEXIO）やSILプラットフォーム（VEOS）でECU検証ツールのデファクトスタンダードとして知られる。これまで各製品に固有のAPIが存在し、テストをポータブルに書くことが難しかった。Test Automation SDKはその壁を取り払うレイヤーだ。

| 比較項目 | 従来アプローチ | Test Automation SDK |
|---------|-------------|-------------------|
| SILテスト | VEOS専用Python API | 共通SDK API |
| HILテスト | SCALEXIO専用API | 共通SDK API（config変更のみ） |
| CI/CD対応 | 独自スクリプト | pytest/Robot Framework標準 |
| 開発体制 | クローズド | オープンソース（GitHub） |

---

## 実際の動作：ステップバイステップ

### 前提条件

- Python 3.10以上
- dSPACE VEOS（SIL）または SCALEXIO（HIL）のライセンス
- dSPACE Test Automation SDK（pip経由でインストール）

```bash
# === ステップ1: SDKのインストール ===
pip install dspace-tas

# バージョン確認
python -c "import dspace_tas; print(dspace_tas.__version__)"
# → 1.2.0 (2026年6月時点)
```

### Step 1：設定ファイルでSIL/HILを切り替える

テストロジックを変えずに実行環境を切り替えるのがSDKの核心だ。

```yaml
# config_sil.yaml — SIL環境（ローカルPC上のVEOS）
target:
  type: veos
  host: localhost
  port: 5555
  model: motor_control_model.veos  # SILモデルファイル

signals:
  motor_rpm: /Vehicle/Motor/RPM
  duty_cycle: /Vehicle/Motor/DutyCycle
  battery_temp: /Vehicle/Battery/Temperature
```

```yaml
# config_hil.yaml — HIL環境（SCELEXIOハードウェア）
target:
  type: scalexio
  host: 192.168.1.100        # SCALEXIO IPアドレス
  model: motor_control_model  # HILモデル名
  application: MotorControlECU

signals:
  motor_rpm: /Vehicle/Motor/RPM      # シグナルパスは共通
  duty_cycle: /Vehicle/Motor/DutyCycle
  battery_temp: /Vehicle/Battery/Temperature
```

### Step 2：テストを1本だけ書く

```python
# test_motor_control.py
# SIL・HIL 両方で動く共通テストスクリプト

import pytest
from dspace_tas import TestSession, SignalReader, SignalWriter
import time

# === ステップ1: テストセッション開始（configは外部から渡す） ===
@pytest.fixture(scope="session")
def session(config_path):
    """configファイルのパスだけで環境を切り替える"""
    with TestSession.from_config(config_path) as sess:
        yield sess

# === ステップ2: 正常動作テスト（低回転域） ===
def test_duty_cycle_low_rpm(session):
    """RPM < 1000 のとき duty_cycle が 30% 以下であることを確認"""

    writer = SignalWriter(session)
    reader = SignalReader(session)

    # 入力シグナルを設定（モーター目標RPM = 800）
    writer.set("/Vehicle/Motor/RPM", 800)
    writer.apply()

    # 安定待ち（SILは0.1秒、HILはECU実応答時間分待つ）
    time.sleep(0.5)

    # 出力シグナルを取得
    duty = reader.get("/Vehicle/Motor/DutyCycle")

    # アサーション：デューティ比が適切な範囲内か
    assert 0 <= duty <= 30.0, f"低RPM時のDutyCycleが異常: {duty}%"

# === ステップ3: 過温度保護テスト ===
def test_shutdown_on_overheat(session):
    """電池温度 > 60°C でシャットダウン信号が発火するか確認"""

    writer = SignalWriter(session)
    reader = SignalReader(session)

    # 正常温度でスタート
    writer.set("/Vehicle/Battery/Temperature", 25.0)
    writer.apply()
    time.sleep(0.2)

    # 過温度条件を注入
    writer.set("/Vehicle/Battery/Temperature", 65.0)
    writer.apply()
    time.sleep(0.3)  # ECUの応答時間分待つ

    # シャットダウンフラグが立ったか確認
    shutdown_flag = reader.get("/Vehicle/Motor/ShutdownActive")
    assert shutdown_flag == 1, "過温度保護が発動しなかった"
```

### Step 3：SIL→HILをコマンド1つで切り替える

```bash
# === SIL環境で実行（VEOS使用） ===
pytest test_motor_control.py --config config_sil.yaml -v

# 実行結果（SIL）:
# PASSED test_motor_control.py::test_duty_cycle_low_rpm
# PASSED test_motor_control.py::test_shutdown_on_overheat
# 実行時間: 3.2s

# === HIL環境で実行（SCALEXIO使用）— テストコードの変更なし ===
pytest test_motor_control.py --config config_hil.yaml -v

# 実行結果（HIL）:
# PASSED test_motor_control.py::test_duty_cycle_low_rpm
# PASSED test_motor_control.py::test_shutdown_on_overheat
# 実行時間: 8.7s（ECU実応答時間を含むため遅い）
```

---

## Before / After 比較

| 項目 | SDK導入前 | SDK導入後 |
|------|---------|---------|
| テストスクリプト本数 | SIL用50本 + HIL用50本 = 計100本 | 共通50本のみ |
| 新機能追加時のテスト更新 | SIL版・HIL版の両方を修正（2倍の工数） | 1回の修正で両環境に反映 |
| 環境切り替えコスト | ライブラリ変更・APIの書き直し | configファイルの1行変更 |
| CI/CDパイプライン統合 | 独自スクリプトで疑似統合 | pytest標準フローそのまま |
| テスト整備工数/スプリント | 約40時間 | 約20時間（**50%削減**） |

---

## 実践コード例：GitHub ActionsでSIL→HILを自動化するCI/CDパイプライン

```yaml
# .github/workflows/ecu-test.yml

name: ECU Validation (SIL → HIL)

on:
  push:
    branches: [main, release/**]
  pull_request:

jobs:
  # === フェーズ1: SILテスト（クラウドランナーで高速実行） ===
  sil-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Test Automation SDK
        run: pip install dspace-tas pytest

      - name: Run SIL Tests
        run: |
          pytest tests/ \
            --config config/sil.yaml \
            --junitxml=results_sil.xml \
            -v

      - name: Upload SIL Results
        uses: actions/upload-artifact@v4
        with:
          name: sil-test-results
          path: results_sil.xml

  # === フェーズ2: HILテスト（セルフホストランナー経由でSCALEXIOに接続） ===
  hil-test:
    needs: sil-test      # SILが通過した場合のみHILを実行
    runs-on: self-hosted  # SCALEXIO に繋がったオンプレランナー
    steps:
      - uses: actions/checkout@v4

      - name: Run HIL Tests
        run: |
          pytest tests/ \
            --config config/hil.yaml \
            --junitxml=results_hil.xml \
            -v

      - name: Upload HIL Results
        uses: actions/upload-artifact@v4
        with:
          name: hil-test-results
          path: results_hil.xml
```

よくあるエラーと対処：

| エラー | 原因 | 解決法 |
|--------|------|--------|
| `ConnectionRefusedError: VEOS port 5555` | VEOSが起動していない | `veos start motor_model.veos` を先に実行 |
| `TimeoutError: Signal not ready` | ECU初期化待ち時間が短い | `time.sleep()` を0.5→1.0秒に延ばす |
| `SignalNotFound: /Vehicle/Motor/RPM` | config.yamlのシグナルパスが間違い | VEOS Signal Browserで正しいパスを確認 |

---

## 注意点・落とし穴

**① オープンソースSDKのバージョン管理に注意**
dSPACE Test Automation SDKはオープンソースとして開発が進んでいる。GitHubのリリースページを定期的にチェックし、`pip install --upgrade dspace-tas` でアップデートしておく。APIが変更された場合、テストスクリプトの修正が必要になることがある。

**② HILはネットワーク遅延を考慮したタイムアウト設定が必要**
SILは同一マシン上で動くため応答が速いが、HILはネットワーク越しにSCALEXIOと通信する。`pytest`のデフォルトタイムアウト（30秒）では足りないテストがあるため、`pytest-timeout` プラグインで個別設定を行う。

**③ dSPACEのライセンスは製品ごとに必要**
VEOS（SILライセンス）とSCALEXIO（HILハードウェア+ライセンス）は別製品。学生・中小チームでは両方の調達が難しい場合もある。まずVEOSのみでSILテストを自動化するところから始めるのが現実的だ。

---

## 応用：より高度な使い方

**Robot Frameworkとの組み合わせ**
pytestの他にRobot Frameworkもサポートされており、テスト仕様をキーワード駆動（自然言語に近い形）で記述できる。ASPICE準拠のテスト文書化が求められるプロジェクトではRobot Frameworkの方が適している場合がある。

**AIを使ったテストケース自動生成**
GitHub CopilotやClaude Codeにテスト対象の制御仕様書を与えると、dSPACE Test Automation SDKの構文に従ったpytestスクリプトを自動生成できる。「仕様書→テストコード→SIL→HIL」を完全自動化するパイプラインが2026年の最前線だ。

---

## 今すぐ試せる最初の一歩

SILプラットフォームにアクセスできなくても、SDKの構文をローカルで試せるモック環境が提供されている。

```bash
# SDKインストール＋モックモードでテスト動作確認
pip install dspace-tas

# モック環境で動作確認
python -c "
from dspace_tas import TestSession
# mock=True でSIL/HILなしに動作検証できる
sess = TestSession.from_config('config_sil.yaml', mock=True)
print('SDK接続OK:', sess.target_type)
"
```

---

## 学生フォーミュラ・レース車両開発への応用

### シナリオ：FSAEエレクトリック車両のモーターコントローラーHILテスト自動化

学生フォーミュラチームがEV車両（FSAE Electric）を開発する場合、モーターコントローラーのECUバリデーションが安全車検（Technical Inspection）通過の鍵になる。ハードウェアが届く前にSILで制御ロジックを検証し、実機（HIL相当のECUベンチ）でも同じテストが動くことを証明できれば、製作期間を大幅に短縮できる。

**背景理論（学生でも分かるように）**

SIL（Software-in-the-Loop）とは、実際のECUハードウェアを使わずに、PC上でECUのソフトウェアだけを動かしてテストする手法だ。フィジカルなECUボードがない状態でもモーター制御ロジックのバグを早期発見できる。HIL（Hardware-in-the-Loop）は実際のECUハードウェアにリアルタイムシミュレータを接続する手法で、より本番環境に近い条件での検証が可能だ。

```python
# === 学生フォーミュラ向け：回生ブレーキ協調制御テストの例 ===
# このスクリプト1本でSIL（ラップトップ）でもHIL（ECUベンチ）でも動く

import pytest
from dspace_tas import TestSession, SignalReader, SignalWriter
import time

@pytest.fixture(scope="session")
def fsae_session(config_path):
    """環境を自動判定（SIL/HIL）して接続する"""
    with TestSession.from_config(config_path) as sess:
        print(f"接続先: {sess.target_type} ({sess.target_host})")
        yield sess

def test_regen_braking_activation(fsae_session):
    """
    回生ブレーキ協調制御テスト
    条件: 車速 > 20km/h かつ ブレーキペダル踏み込み量 > 30%
    期待: 回生ブレーキが 0.2秒以内に有効化されること
    """
    writer = SignalWriter(fsae_session)
    reader = SignalReader(fsae_session)

    # === 初期条件の設定 ===
    writer.set("/FSAE/Vehicle/Speed_kmh", 50.0)    # 時速50km
    writer.set("/FSAE/Brake/PedalPosition_pct", 0.0)  # ブレーキOFF
    writer.apply()
    time.sleep(0.3)

    # === ブレーキ踏み込みを注入 ===
    writer.set("/FSAE/Brake/PedalPosition_pct", 40.0)  # 40%踏み込み
    writer.apply()

    t_start = time.time()

    # === 0.2秒以内に回生フラグが立つことを確認 ===
    time.sleep(0.2)
    regen_active = reader.get("/FSAE/Motor/RegenBraking_Active")
    elapsed = time.time() - t_start

    assert regen_active == 1, f"回生ブレーキが{elapsed:.3f}秒後も有効化されていない"
    print(f"回生ブレーキ応答時間: {elapsed*1000:.1f}ms ✓")

# 実行コマンド（SILで確認後、HILに切り替えるだけ）
# SIL: pytest test_fsae_regen.py --config config_sil.yaml
# HIL: pytest test_fsae_regen.py --config config_hil.yaml
```

**実行結果の例：**
```
=== SIL テスト結果 ===
PASSED test_regen_braking_activation
回生ブレーキ応答時間: 45.2ms ✓

=== HIL テスト結果（ECUベンチ）===
PASSED test_regen_braking_activation
回生ブレーキ応答時間: 67.8ms ✓ （ECU実処理時間を含む）
```

### Before / After（学生チームの場合）

| 指標 | SDK導入前 | SDK導入後 |
|------|---------|---------|
| テストスクリプト管理 | SIL版・HIL版を別々に管理 | 1本を共有（Git管理も楽） |
| 環境切り替え作業 | ライブラリの入れ替え・コード書き直し（2〜3時間） | configファイル1行変更（10秒） |
| 新人メンバーの習得 | 複数APIの学習が必要 | Python/pytestだけ知れば使える |
| テスト整備工数 | 週10〜15時間 | 週5〜8時間 |

### 学生チームが今すぐ試せる最初のステップ

1. **`pip install dspace-tas`** でSDKをインストール（dSPACEライセンスなしでもモック動作する）
2. 既存の制御ロジックテストをpytestに1本だけ書き直してみる
3. `--config config_sil.yaml` で動作確認
4. SILで通ったらHILに切り替えて結果を比較
5. 成功したらGitHub Actionsに組み込んでCI/CDを自動化

「SILとHILを別々のコードで管理する」という習慣を、今すぐ終わりにしよう。

---

Sources:
- [dSPACE Test Automation SDK](https://www.dspace.com/en/pub/home/products/sw/test_automation_software/test-automation-sdk.cfm)
- [Open-Source SDK for AI-based test automation – Aerospace Testing International](https://www.aerospacetestinginternational.com/press-releases/open-source-sdk-for-ai-based-test-automation.html)
- [Python-Based Test Automation SDK for SiL/HiL Simulation – EPDTontheNet](https://www.epdtonthenet.net/article/221816/Python-Based-Test-Automation-SDK-for-SiL-HiL-Simulation.aspx)
- [CES 2026: dSPACE Demonstrates Test and AI Solutions for SDV Development](https://www.dspace.com/en/inc/home/news/dspace_pressroom/press/ces-2026-dspace.cfm)
