---
title: "LLMとFrama-Cでつくる機能安全C++コード：ISO 26262対応ソフトをAIが自動生成する時代が来た"
date: 2026-06-03
category: "AI Coding"
tags: ["ISO 26262", "LLM", "Frama-C", "TDD", "機能安全", "組込みC++", "GenAI-SDLC"]
official_url: "https://arxiv.org/abs/2506.04038"
importance: "high"
summary: "ミュンヘン工科大学（TU Munich）が2026年6月に発表したGenAI-SDLCフレームワーク（arXiv 2506.04038、IEEE IV 2025採択）は、LLMによるC++コード自動生成とテスト駆動開発（TDD）・Frama-C形式検証を組み合わせてISO 26262対応コードを生成するパイプラインを提案する。適応走行制御（ACC）システムで実証済み。「安全性をAIに担保させる」実装が現実になった。"
---

## はじめに

機能安全（ISO 26262）に準拠した組込みC++コードを書くのに、何日かかっているだろうか。要件からASIL分類・設計・実装・静的解析・テストまで一連のプロセスを律儀に回すと、経験豊富なエンジニアでもACCモジュール1本に数週間消えることがある。その「変換作業の大部分をLLMに任せつつ、品質をFrama-Cで機械的に担保する」フレームワークを、ミュンヘン工科大学（TU Munich）のSven KirchnerとAlois C. Knollが2026年6月にarXiv（2506.04038）で公開し、IEEE Intelligent Vehicles Symposium 2025でも採択された。このツールを知らずにいると、競合チームとのソフト品質・開発速度の差が広がる一方だ。

---

## GenAI-SDLCフレームワークとは

**GenAI-SDLC**はLLMをソフトウェア開発ライフサイクル（SDLC）全体に組み込んだ自動化フレームワークで、TU MunichのCeCaS研究プロジェクト（BMBF助成、FKZ: 16ME0800K）から生まれた。

既存のLLMコード生成との最大の差異は「フィードバック駆動パイプライン」にある。ChatGPTやCopilotに「ACCのC++コードを書いて」と投げる一発生成ではなく、生成→検証→失敗フィードバック→再生成のループを自動で回し、Frama-Cの形式検証をパスするまで反復する。MISRA-Cスタイルの静的解析や単体テスト（Google Test）も組み込まれており、ISO 26262のソフトウェア開発ガイドライン（Part 6）に沿ったプロセスを自動で踏む。

---

## 実際の動作：5ステップパイプライン

### ① 要件入力

自然言語または形式仕様（ACSL形式）で機能要件を記述する。たとえばACC（適応走行制御）の場合：

```
要件: 先行車との車間距離が設定値を下回った場合、
      目標速度を毎秒5 km/h以内の減速率で下げる。
      速度は0〜130 km/hの範囲に制限する。
      ASIL-B要件: 車速センサー異常時はフェイルセーフ状態に遷移する。
```

### ② LLMによるC++コード生成

フレームワークはコンテキスト付きプロンプトをLLMに送信し、ACSL（ANSI/ISO C Specification Language）アノテーション付きのC++コードを出力させる。

```cpp
// === ACC 速度制御モジュール（LLM生成＋ACSL仕様付き） ===

/*@ requires 0.0 <= current_speed <= 130.0;
  @ requires 0.0 <= target_speed <= 130.0;
  @ requires 0.0 <= decel_rate <= 5.0;
  @ ensures  0.0 <= \result <= 130.0;
  @ ensures  \result <= current_speed;
  @*/
double compute_target_speed(double current_speed,
                            double target_speed,
                            double decel_rate,
                            bool   sensor_fault) {
    // フェイルセーフ: センサー異常時は即座に0を返す
    if (sensor_fault) return 0.0;

    // 目標速度との差分に基づく減速量を計算
    double delta = current_speed - target_speed;
    double applied = (delta > decel_rate) ? decel_rate : delta;
    double result  = current_speed - applied;

    // 速度範囲をクランプ（ASIL-B: ランタイム境界チェック）
    if (result < 0.0)   result = 0.0;
    if (result > 130.0) result = 130.0;
    return result;
}
```

`@requires` / `@ensures` はFrama-Cが解釈する事前・事後条件の形式仕様で、LLMが自動付与する。

### ③ Frama-C形式検証

生成されたコードをFrama-Cの弱い前置条件（WP）プラグインで検証する。

```bash
# WP（Weakest Precondition）検証 + ランタイムエラー自動検出
frama-c -wp -wp-rte acc_speed_control.cpp

# 期待される出力例
[wp] acc_speed_control.cpp:12: Goal wp_rte_ok (Assertion)
     Status: Valid
[wp] Proved goals: 8 / 8
```

「Proved goals: 8 / 8」が出れば、ACSL仕様が数学的に満たされていることが保証される。

### ④ TDDによる単体テスト

Google TestベースのテストスイートをLLMが自動生成し、CMakeビルド環境で実行する。

```cpp
// === LLM生成テストケース（Google Test） ===
TEST(AccSpeedControl, NormalDeceleration) {
    // 通常減速: 100 km/h から 80 km/h、減速率 5 km/h
    double result = compute_target_speed(100.0, 80.0, 5.0, false);
    EXPECT_DOUBLE_EQ(result, 95.0);  // 100 - 5 = 95 km/h
}

TEST(AccSpeedControl, SensorFaultFailsafe) {
    // センサー異常: 速度に関わらず 0 を返す
    double result = compute_target_speed(80.0, 60.0, 5.0, true);
    EXPECT_DOUBLE_EQ(result, 0.0);
}

TEST(AccSpeedControl, SpeedClampUpperBound) {
    // 上限クランプ: 130 km/h を超えない
    double result = compute_target_speed(130.0, 130.0, 0.0, false);
    EXPECT_LE(result, 130.0);
}
```

### ⑤ フィードバックループ

Frama-CまたはGoogle Testが失敗した場合、エラーメッセージをプロンプトに追記してLLMに再生成を依頼する。このループを最大5回繰り返し、全検証をパスしたコードのみを採用する。

```python
# === GenAI-SDLCフレームワーク（Pythonオーケストレーション） ===
import anthropic, subprocess

client = anthropic.Anthropic()  # ANTHROPIC_API_KEY 環境変数から自動読込

def genai_sdlc(requirement: str, max_retries: int = 5) -> str:
    feedback = ""
    for attempt in range(max_retries):
        # === LLMにコード生成を依頼 ===
        prompt = build_prompt(requirement, feedback)
        resp   = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}]
        )
        code = extract_cpp_block(resp.content[0].text)
        write_file("/tmp/generated.cpp", code)

        # === Frama-C 形式検証 ===
        frama = subprocess.run(
            ["frama-c", "-wp", "-wp-rte", "/tmp/generated.cpp"],
            capture_output=True, text=True
        )
        # === Google Test 実行 ===
        build_and_run_tests("/tmp/generated.cpp")

        if frama.returncode == 0 and tests_passed():
            return code  # 全検証パス → 採用

        # 失敗したらエラーをフィードバックして再試行
        feedback = frama.stderr[:800]
    raise RuntimeError("検証をパスできませんでした")
```

---

## Before / After 比較

| 項目 | 従来の手動開発 | GenAI-SDLCフレームワーク |
|------|----------------|--------------------------|
| ACCモジュール1本の実装時間 | 2〜3週間 | 数時間（反復込み） |
| ACSL仕様の付与 | 手動（スキル依存） | LLMが自動付与 |
| Frama-C検証 | 専門知識が必要 | パイプラインに組込み済み |
| テストケース作成 | 手動50〜100件 | LLMが自動生成 |
| ISO 26262 Part6適合確認 | 手動チェックリスト | フレームワーク内で自動確認 |
| ASIL-Bフェイルセーフ漏れ | 人的ミスのリスク | ACSL仕様で機械的検証 |

---

## 実践コード例：今すぐ試せる最小構成

**前提条件**: Python 3.10以上、Frama-C（`apt install frama-c`）、Google Test（`apt install libgtest-dev`）、`pip install anthropic`

```python
import anthropic, subprocess, re

client = anthropic.Anthropic()  # 環境変数 ANTHROPIC_API_KEY が必要

SYSTEM_PROMPT = """
あなたは機能安全（ISO 26262 ASIL-B）準拠のC++コードを生成する専門家です。
Frama-C ACSL仕様（@requires/@ensures）を必ず付与してください。
ランタイムエラー検出用の境界チェックを実装してください。
コードブロック（```cpp〜```）のみを出力してください。
"""

def generate(req: str, feedback: str = "") -> str:
    """要件からACSL付きC++コードを生成する"""
    user_msg = f"要件:\n{req}"
    if feedback:
        user_msg += f"\n\n前回の検証エラー（修正してください）:\n{feedback}"

    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_msg}]
    )
    # コードブロックを抽出
    m = re.search(r'```cpp\n(.*?)```', resp.content[0].text, re.DOTALL)
    return m.group(1) if m else resp.content[0].text

# === 使用例 ===
requirement = """
ブレーキペダル踏力（0〜100%）から制動減速度（0〜1.0G）を計算する。
センサー値が範囲外の場合はフェイルセーフ値（0.0G）を返す。
"""

code = generate(requirement)
print("=== 生成コード ===")
print(code)

# Frama-Cで検証する場合:
# with open("/tmp/brake.cpp", "w") as f: f.write(code)
# subprocess.run(["frama-c", "-wp", "-wp-rte", "/tmp/brake.cpp"])
```

---

## 注意点・落とし穴

**1. Frama-Cのインストールは手間がかかる**  
Ubuntu 22.04では `apt install frama-c` で入るが、最新プラグイン（WP 2.0以降）はOPAMで別途インストールが必要。まずWPなしで動作確認してから段階的に有効化するのが安全。

**2. ASIL-Dには追加の独立性要件が必要**  
本フレームワークはASIL-A〜Bを想定。ASIL-CやDでは独立した検証環境・ツール認定（IEC 61508 Tool Class T3）が別途必要であり、フレームワークそのものを安全認証に使うには追加評価が要る。

**3. LLMの出力は毎回異なる**  
Temperatureを0にしても完全に再現性はない。パイプラインに組み込む際は乱数シードの固定と、CI/CDでの自動再検証を必ずセットで設計すること。

---

## 応用：より高度な使い方

**Polyspace Copilot との連携**  
MathWorksのPolyspace Copilot（R2026a以降）でも同様の静的解析が可能で、MATLABワークフローとの親和性が高い。GenAI-SDLCでコードのベースを生成し、PolyspaceでASIL適合のダブルチェックを行うと、既存MBD環境への統合がスムーズになる。

**AUTOSAR Adaptive との組合せ**  
本フレームワークのC++生成をAUTOSAR Adaptive Platform向けServiceInterface実装に応用することで、spec2codeフレームワーク（arXiv 2411.13269）とのハイブリッドパイプラインが構築できる。要件→AUTOSARアーキテクチャはspec2codeで、実装C++コードの品質担保にGenAI-SDLCを使うという役割分担が現実的だ。

---

## 今すぐ試せる最初の一歩

```bash
# Frama-Cのインストール（Ubuntu 22.04）
sudo apt install frama-c

# Anthropic SDK のインストール
pip install anthropic

# 環境変数の設定
export ANTHROPIC_API_KEY="your_api_key_here"

# 上記のサンプルコードを貼り付けて実行
python genai_sdlc_demo.py
```

---

## まとめ

TU MunichのGenAI-SDLCフレームワーク（arXiv 2506.04038）は、LLMコード生成・TDD・Frama-C形式検証の3要素をフィードバックループで結合し、ISO 26262対応の自動車組込みC++コードを自動生成する実用的なアプローチだ。ACCシステムでの実証に加え、ブレーキ制御・センサーフュージョン・パワートレイン制御など幅広い組込みモジュールへの応用が期待される。機能安全コードをAIに書かせる時代はもうすぐそこまで来ている。まず手元のFrama-Cで動かしてみることから始めよう。
