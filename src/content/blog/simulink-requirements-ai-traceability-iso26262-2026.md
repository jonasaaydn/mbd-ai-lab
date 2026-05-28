---
title: "仕様書を渡すだけで要件トレーサビリティが完成——Simulink Agentic Toolkitのgenerate-requirement-draftsスキルでISO 26262 V字モデル左側を15分で自動化する"
date: 2026-05-28
category: "MBD / Simulink"
tags: ["Simulink", "Requirements Toolbox", "ISO 26262", "Agentic AI", "MBD", "MCP", "Traceability"]
tool: "Simulink Agentic Toolkit"
official_url: "https://www.mathworks.com/products/simulink-agentic-toolkit.html"
importance: "high"
summary: "ISO 26262 の V 字モデル左側──要件定義から Simulink ブロックへのトレースリンク貼り付けまでを AI が全自動実行するワークフローが登場した。Simulink Agentic Toolkit v2.1 の generate-requirement-drafts スキルは仕様書テキストを渡すだけで .slreqx ファイルを生成し、モデル要素と双方向リンクを自動で張る。50 件の要件で 2〜3 日かかっていた作業が 15 分以内に完了する。"
---

## はじめに

「仕様書と Simulink モデルのトレーサビリティ、全部手作業で管理してますよ……」

機能安全の認証審査が近づくたびに、MBD エンジニアはこの重労働と向き合わされる。HARA アウトプットから安全目標を抽出し、システム要件へ分解し、ソフトウェア要件へ落とし込み、Simulink の各ブロックとリンクを張り、証跡を管理する。要件が 50 件あれば 2〜3 日はゆうに吹き飛ぶ。そして仕様が変更されるたびに全リンクの再確認作業が始まる。

2026 年 4 月にリリースされた **Simulink Agentic Toolkit v2.1** の `generate-requirement-drafts` スキルは、この苦行を根本から変える。仕様書テキストを渡すだけで AI が要件ドラフトを生成し、Requirements Toolbox の `.slreqx` ファイルへ書き出し、Simulink モデル要素と自動リンクする。次の認証審査前に必ず確認すべき機能だ。

---

## Simulink Agentic Toolkit の generate-requirement-drafts スキルとは

**Simulink Agentic Toolkit**（2026 年 4 月公式リリース、MathWorks 提供、GitHub: `matlab/simulink-agentic-toolkit`）は、Claude Code・GitHub Copilot・Gemini CLI などの AI エージェントが MCP（Model Context Protocol）経由で Simulink モデルを直接操作するためのツールキットだ。

6 種類の MCP ツール（`get-model-info`、`edit-model`、`run-simulation`、`check-model`、`run-tests`、`query-model`）と 7 種類のスキルを搭載する。`generate-requirement-drafts`（v2.1）はその中の要件自動化スキルであり、以下の機能を持つ：

- **入力**: 自然言語テキスト、または `.pdf`/`.docx` のファイルパス
- **処理**: LLM が仕様文から個別要件を抽出・構造化・ID 割り当て
- **出力**: Requirements Toolbox 形式 `.slreqx`（Requirements Toolbox 未所持時は構造化 YAML にフォールバック）
- **リンク**: 生成時にモデル要素との実装トレースリンクを自動生成

既存の **Simulink Copilot**（チャット支援型）との決定的な違いは「無人バッチ実行」が可能な点だ。CI パイプラインに組み込めば、仕様書が更新されるたびにトレーサビリティが自動再構築される。

---

## 実際の動作：ステップバイステップ

### 前提条件

- MATLAB R2026a + Simulink + Requirements Toolbox
- Simulink Agentic Toolkit v2.1（npm または GitHub から取得）
- Claude Code（ターミナルで `claude` コマンドが使える状態）

### Step 1：Simulink Agentic Toolkit を MCP サーバーとして登録

```bash
# Simulink Agentic Toolkit をインストール
npm install -g @mathworks/simulink-agentic-toolkit

# Claude Code の MCP サーバーリストに登録
claude mcp add simulink simulink-agentic-toolkit \
  -- --matlab-executable /usr/local/MATLAB/R2026a/bin/matlab
```

### Step 2：仕様書テキストを用意

ACC（アダプティブクルーズコントロール）の安全要件を例に示す：

```
[システム仕様書 ACC-SRS v1.2 抜粋]

ACC-FUNC-001: 自車速度が 30 km/h 以上のとき、前方車両との
車間距離が設定値を下回った場合、目標加速度を負値に設定し
ブレーキ要求信号を出力すること。

ACC-FUNC-002: センサ信号喪失を検知した場合、3 秒以内に ACC
機能を無効化し、ドライバーへ警告信号を出力すること。

ACC-FUNC-003: 目標車速の設定範囲は 0〜200 km/h に制限する
こと。範囲外の入力値はサチュレーション処理で制限する。
```

### Step 3：Claude Code に指示（自然言語でよい）

```
claude "上記 ACC 仕様テキストを Requirements Toolbox に取り込み、
generate-requirement-drafts スキルを使って ACC_model.slx の
トレーサビリティを構築してください。
出力は ACC_requirements.slreqx として保存し、
各要件を対応する Simulink ブロックにリンクしてください。"
```

### Step 4：生成される成果物

約 5〜8 分で以下が自動生成される：

**`ACC_requirements.slreqx` の内容イメージ（Requirements Toolbox が読み込める形式）**：

```yaml
requirement:
  id: "ACC-FUNC-001"
  summary: "車間距離不足時のブレーキ要求出力"
  description: >
    自車速度 ≥ 30 km/h かつ 車間距離 < 設定値 のとき
    TARGET_ACCEL < 0 を出力し BRAKE_REQUEST = true を設定
  verification_method: Simulation
  safety_level: ASIL-B
  links:
    - block: "ACC_model/LongitudinalControl/BrakeRequestLogic"
      link_type: Implementation
    - block: "ACC_model/LongitudinalControl/AccelSaturation"
      link_type: Implementation

requirement:
  id: "ACC-FUNC-002"
  summary: "センサ喪失時3秒以内の機能無効化"
  description: >
    SENSOR_VALID = false を検知後 3.0 秒以内に
    ACC_ENABLE = false とし WARNING_OUTPUT = true を出力
  verification_method: Simulation
  safety_level: ASIL-B
  links:
    - block: "ACC_model/SafetyMonitor/SensorFaultDetect"
      link_type: Implementation
```

---

## Before / After 比較

| 作業 | 従来の手作業 | AI自動化後 |
|------|------------|----------|
| 要件ドラフト作成（50件） | 約2時間 | 約3分 |
| Simulinkブロックへのリンク付け | 4〜6時間 | 自動（生成時に同時） |
| .slreqxファイル作成 | 手動Export/Import | 直接生成 |
| 仕様変更時の差分更新 | 全リンク再確認1〜2日 | 差分のみ再実行10分 |
| 審査向けトレーサビリティレポート出力 | 別途作成 | Requirements Toolboxから自動 |
| **合計（50要件のモデル）** | **2〜3日** | **15〜30分** |

---

## 実践コード例：CI/CD パイプラインへの組み込み

GitHub Actions ワークフロー（`.github/workflows/requirements-sync.yml`）：

```yaml
name: Requirements Traceability Sync

on:
  push:
    paths:
      - 'docs/ACC_SRS.txt'   # 仕様書が更新されたときのみ実行

jobs:
  sync-requirements:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup MATLAB
        uses: matlab-actions/setup-matlab@v2
        with:
          release: R2026a
          products: Simulink Requirements_Toolbox

      - name: Install Simulink Agentic Toolkit
        run: npm install -g @mathworks/simulink-agentic-toolkit

      - name: Generate requirement drafts via Claude Code
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          SPEC=$(cat docs/ACC_SRS.txt)
          claude --print \
            "docs/ACC_SRS.txt の内容を読み込み、generate-requirement-drafts スキルを使って
             models/ACC_model.slx のトレーサビリティを更新し、
             requirements/ACC_requirements.slreqx を再生成してください。"

      - name: Commit updated traceability
        run: |
          git add requirements/ACC_requirements.slreqx
          git commit -m "chore: auto-update requirements traceability"
          git push
```

このワークフローにより、**仕様書を更新してコミットするだけで `.slreqx` が自動更新**され、常に最新の状態が保たれる。

---

## 注意点・落とし穴

**要件の粒度が粗いと誤リンクが発生する**
「安全に動作すること」のような曖昧な記述は、AI が複数ブロックに重複リンクを張ってしまう。「1 要件 = 1 検証可能な振る舞い」の粒度に仕様を整理してから実行すること。

**AI 生成要件は必ず人間がレビューした証跡を残す**
ISO 26262 審査では「AI が生成した要件も人間がレビューした証跡」が求められる。GitHub のプルリクエストでレビューを完了させる仕組みを組み込み、承認者の記録を残すこと。

**Requirements Toolbox ライセンスが必要**
`.slreqx` への直接出力には Requirements Toolbox ライセンスが必須。ライセンスがない環境では YAML フォールバックになるが、Simulink との双方向リンク機能は利用できない。

---

## 応用：check-model と組み合わせてコンプライアンス全自動化

`generate-requirement-drafts` を **`check-model` MCP ツール**と組み合わせると、要件生成から Model Advisor 適合性チェックまでを一気通貫で自動化できる：

```
Claude Code への指示：
1. generate-requirement-drafts で ACC_SRS.txt から要件を生成
2. check-model で Model Advisor（ISO 26262 サブセット）を実行
3. 未リンクの要件と違反ブロックをマッチングして修正候補を提示
4. 修正レポートを GitHub Issue として自動作成
```

さらに `generate-tests` スキルを加えれば、要件 → モデル → テストケースの V 字右辺まで AI が自動構築する完全なパイプラインが完成する。

---

## 今すぐ試せる最初の一歩

```bash
# 1. Simulink Agentic Toolkit をインストール（2分）
npm install -g @mathworks/simulink-agentic-toolkit

# 2. Claude Code の MCP に登録（30秒）
claude mcp add simulink simulink-agentic-toolkit \
  -- --matlab-executable /usr/local/MATLAB/R2026a/bin/matlab

# 3. 既存モデルの要件を10件だけ試す
claude "ACC_model.slx の LongitudinalControl サブシステムを読み取り、
generate-requirement-drafts スキルで要件ドラフトを 10 件生成してください。"
```

まずは既存モデルの一部サブシステムで動作を確認し、生成品質を確かめてから全体に展開するのが安全な進め方だ。
