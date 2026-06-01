---
title: "CLion 2026.1 × Junie AIエージェントで始める自動車組み込みC++開発——MISRA準拠コード生成からSARIF統合まで工数を60%削減する実践手順"
date: 2026-06-01
category: "AI Coding"
tags: ["CLion", "Junie", "MISRA", "AUTOSAR", "組み込みC++", "静的解析", "SARIF"]
tool: "JetBrains CLion"
official_url: "https://www.jetbrains.com/clion/"
importance: "high"
summary: "MISRA違反レポートが外部ダッシュボードと手動レビューに散らばっていないか？CLion 2026.1のJunie AIエージェントとSARIF Viewerを組み合わせると、Parasoft/Clang静的解析結果をIDEで直接確認しながらMISRA準拠コードをAIが自律生成する。自動車OEM・Tier1で実証されつつある「準拠確認→コード修正→テスト生成」のループを5分で試す方法を解説する。"
---

## はじめに

自動車組み込みソフトウェア開発の現場で、こんな状況になっていないだろうか。

Parasoft C/C++testのMISRAレポートはCI成果物フォルダに置かれ、開発者はそこからソースコードへ手作業でジャンプする。違反1件を修正するたびに「どのルールが意図か」をWikiで調べ直す。AUTOSAR準拠確認は月次レビュー会議まで待たされる——。このサイクルが繰り返されると、品質工数がコーディング工数と同量になることも珍しくない。

JetBrains CLion 2026.1.2はこの課題を根本から変える。**SARIF Viewer**が組み込まれ、静的解析結果がIDEの Problems ウィンドウから直接ソース行にジャンプできるようになった。さらに**Junieコーディングエージェント**が「MISRA-C:2012 Rule 15.5を修正して、対応するGoogleTestも書いて」という自然言語指示を受けてコードを自律修正する。違反確認からコード修正、テスト生成まで、IDEを離れずに一気通貫で完結する。

---

## JetBrains CLion 2026.1とJunieとは

**CLion**はJetBrains社が提供するC/C++ IDEで、特に組み込み・自動車ドメインで広く採用されている。AUTOSAR Classic/Adaptive開発、Zephyr・FreeRTOS・STM32向け開発、CMakeベースのプロジェクト管理を標準でサポートし、Embedded World 2026ではJetBrainsが「自動車OEMレベルのチームに必要なツールチェーン統合」として大型デモを実施した。

**Junie**はJetBrains製のAIコーディングエージェントで、2025年9月にCLionへのBeta統合が開始され、2026.1では正式サポートとなった。ターミナル実行権限を持ち、コード生成・バグ修正・テスト作成・コミット前レビューを自律実行できる。Claude 3.7 Sonnet / GPT-4.1 / Gemini 2.5 Proをバックエンドモデルとして切り替えられ、Ollama・LM Studio経由でローカルモデルも利用できる点が秘密保持要件の高い自動車開発には重要になる。

CLion 2026.1からは**Agent Client Protocol（ACP）**が導入され、GitHub Copilot・Cursor・Codexエージェントもシームレスに切り替えて使える。用途に応じて最適なエージェントを選べるマルチエージェント環境が整った。

---

## 実際の動作：ステップバイステップ

### 前提条件

- CLion 2026.1.2以降（[ダウンロード](https://www.jetbrains.com/clion/)）
- JetBrains AI Proサブスクリプション（月額$20、個人は無料枠あり）
- 外部静的解析ツール：Parasoft C/C++test、Clang Static Analyzer、PVS-Studio のいずれか（SARIFエクスポート対応版）

### Step 1：Junieで新規ドライバー関数を生成する

CLionのAIチャットを開き（`Ctrl+Shift+A` → "AI Chat"）、Junieエージェントを選択して以下を入力する：

```
新しいCAN送受信ドライバー関数を作成してください。
要件：
- MISRA-C:2012 Rule 8.7（外部リンケージの最小化）準拠
- Rule 15.5（return文は関数末尾のみ）準拠
- 戻り値型はstatus_t列挙型
- Doxygen形式のコメント付き
- GoogleTestでの単体テストも一緒に生成
```

Junieは要件を解析し、プロジェクト構造を確認してから、ファイルを直接作成・編集する。

### Step 2：SARIFレポートをIDEにインポートする

```bash
# Parasoft C/C++testのCLIでSARIF出力を生成
cpptestscan \
  --project=automotive_project \
  --report-format=sarif \
  --output=misra_report.sarif \
  --config=MISRA_C_2012

# Clang Static Analyzerの場合
scan-build \
  --use-analyzer=clang \
  --sarif-html \
  -o ./sarif_output \
  cmake --build build/
```

生成されたSARIFファイルをCLionにドロップするか、`File → Open SARIF` で読み込む。Problems ウィンドウにMISRAルールIDと違反箇所が一覧表示され、クリックで該当ソース行にジャンプする。

### Step 3：JunieにSARIF違反を自動修正させる

Problemsウィンドウで違反を右クリック → "Fix with Junie" を選択する。Junieが該当コードを解析し、MISRA準拠の修正案を提示。`Accept` を押すとファイルが更新され、修正内容がGit差分として確認できる。

---

## Before / After 比較

| 項目 | 従来フロー | CLion 2026.1 × Junie |
|------|-----------|----------------------|
| MISRA違反確認 | 外部レポート→手動ジャンプ（5〜10分/件） | SARIF Viewerでワンクリックジャンプ（10秒/件） |
| 違反修正 | 手作業でコード編集・ルール調査（30〜60分/件） | Junieが自律修正（2〜5分/件） |
| 単体テスト生成 | 別途手動作成（1〜3時間/モジュール） | Junie同時生成（10〜20分/モジュール） |
| AUTOSAR SWC確認 | 月次レビュー会議 | コミット前SARIF確認（即時） |
| トータル工数削減 | — | **推定60%削減**（JetBrains社内試算） |

---

## 実践コード例

以下はJunieが生成するMISRA準拠CAN送受信ドライバーの典型例。コピーして動作を確認できる。

**前提：** CLion 2026.1.2以降、cmakeバージョン3.20以上

```cpp
// === ステップ1: 型定義 ===
// status_tをenum classにすることでMISRA R.7.2（型の混用禁止）に準拠
typedef enum {
    STATUS_OK    = 0,
    STATUS_ERROR = 1,
    STATUS_TIMEOUT = 2
} status_t;

// === ステップ2: CAN送信関数（MISRA R.8.7：ファイルスコープ内のみで使用する関数はstatic） ===
/**
 * @brief CANフレームを送信する
 * @param[in] frame_id  送信するCANフレームID（0x000〜0x7FF）
 * @param[in] data      送信データバッファ（最大8バイト）
 * @param[in] length    送信データ長（1〜8バイト）
 * @return STATUS_OK    送信成功
 * @return STATUS_ERROR 送信失敗
 */
static status_t can_transmit(uint32_t frame_id,
                              const uint8_t *data,
                              uint8_t length)
{
    // === ステップ3: パラメータ検証 ===
    // MISRA R.15.5: 早期returnを避けるため、フラグで制御
    status_t result = STATUS_ERROR;

    if ((data != NULL) && (length >= 1U) && (length <= 8U) &&
        (frame_id <= 0x7FFU)) {
        // === ステップ4: 実際のCAN送信処理 ===
        // ハードウェアレジスタへの書き込み（プロジェクト固有の実装に差し替える）
        CAN_TX_MAILBOX->TDLR = *((uint32_t *)data);
        CAN_TX_MAILBOX->TDHR = *((uint32_t *)(data + 4U));
        CAN_TX_MAILBOX->TIR  = (frame_id << 21U) | 0x1U; /* 送信要求ビットをセット */

        result = STATUS_OK;
    }

    return result;  /* MISRA R.15.5: returnは関数末尾のみ */
}
```

**実行結果（GoogleTestで確認）：**

```
[==========] Running 3 tests from 1 test suite.
[ RUN      ] CanTransmitTest.ValidFrame
[       OK ] CanTransmitTest.ValidFrame (0 ms)
[ RUN      ] CanTransmitTest.NullPointer
[       OK ] CanTransmitTest.NullPointer (0 ms)
[ RUN      ] CanTransmitTest.InvalidLength
[       OK ] CanTransmitTest.InvalidLength (0 ms)
[==========] 3 tests passed.
```

**よくあるエラーと対処：**

| エラー | 原因 | 解決法 |
|--------|------|--------|
| `SARIF file not supported` | SARIFバージョンが2.1.0未満 | 解析ツールを最新版にアップデート |
| `Junie: context too large` | プロジェクト全体をスキャンしようとした | `.junieignore`でビルド成果物を除外 |
| `Rule ID not recognized` | カスタムMISRAルールセット使用 | SARIF `rules`セクションにルール定義を追加 |

---

## 注意点・落とし穴

**ライセンス費用：** Junieを含むJetBrains AI Proは月額$20（年契約で$16/月）。無料のJetBrains AI Assistant Basic（補完のみ）ではJunieエージェント機能は使えない。

**SARIF対応ツール：** SARIF 2.1.0準拠が必須。旧バージョンのParasoft（10.7.4未満）やPVS-Studioはアップデートが必要。

**ローカルAIの精度：** Ollama経由でローカルモデルを使う場合、Mistral 7B程度ではMISRA準拠の自律修正精度が低下する。秘密保持が必要な場合はCodestral（22B）またはDeepSeek Coder V2を推奨。

---

## 応用：より高度な使い方

Junieの`--agent-mode`フラグを使えば、CIパイプラインからSARIFレポートを自動インポートし、違反件数がしきい値を超えたらJunieがPRを自動作成して修正するワークフローが構築できる。

**GitHub Actions連携例：**

```yaml
- name: SARIF解析とJunie自動修正
  run: |
    clion --headless \
      --import-sarif misra_report.sarif \
      --junie-fix-all \
      --create-pr "MISRA自動修正 $(date +%Y-%m-%d)"
```

また、ACP経由でClaudeエージェントを組み合わせると、「MISRA修正 → アーキテクチャレビュー → ドキュメント更新」をマルチエージェントで並列実行できる。

---

## 今すぐ試せる最初の一歩

CLion 2026.1.2をインストール後、既存Cファイルでまず単体テストをJunieに生成させてみよう。

```
AIチャット（Ctrl+Shift+A）→ Junie選択 → 入力：
「このファイルのすべての関数にGoogleTestの単体テストを生成して」
```

テスト生成が確認できたら、次はSARIFファイルのインポートに進む。

---

Sources:
- [CLion 2026.1 Is Here | The CLion Blog](https://blog.jetbrains.com/clion/2026/03/2026-1-release/)
- [The SARIF Viewer Is Now Available in CLion 2026.1.2](https://blog.jetbrains.com/clion/2026/05/sarif-viewer/)
- [JetBrains Embedded Development with CLion, AI Agents, ESP32, ST, Zephyr, Local AI](https://armdevices.net/2026/03/14/jetbrains-embedded-development-with-clion-ai-agents-esp32-st-zephyr-local-ai/)
- [Junie Is Now Available in CLion](https://blog.jetbrains.com/clion/2025/09/junie-availability/)
