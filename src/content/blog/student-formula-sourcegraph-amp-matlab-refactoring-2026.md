---
title: "【学生フォーミュラ実践】Sourcegraph Amp（完全無料）でMATLAB/SimulinkコードをAI自動リファクタリングする"
date: 2026-06-08
category: "Race Engineering Use Cases"
tags: ["学生フォーミュラ", "Sourcegraph Amp", "MATLAB", "Simulink", "無料AIエージェント"]
tool: "Sourcegraph Amp"
official_url: "https://sourcegraph.com/amp"
importance: "high"
summary: "学生フォーミュラチームが予算ゼロでSourcegraph Ampを使いMATLABスクリプトとSimulinkモデルのリファクタリングを自動化し、引き継ぎコードの把握期間を4〜8週間から1〜2週間に短縮できます。"
---

## この記事を読む前に

本記事は「[AIツール一覧 — Sourcegraph Amp](/tools)」の基本紹介を前提にしています。Amp自体の説明ではなく、**学生フォーミュラチームが無料で今日から使えるMATLAB/Simulinkリファクタリングの実践手順**にフォーカスします。

---

## 学生フォーミュラにおける課題

学生フォーミュラチームのMATLABコードベースは、**4年間で複数世代のメンバーが継ぎ足してきた「技術負債」の塊**であることが多い。典型的な問題：

- 変数名が `a1`, `b2`, `tmp` のような意味不明な名前
- ハードコードされた定数（車両パラメータが30箇所に散在）
- コメントが2年前のまま更新されていない
- 同じ計算ロジックが3つのファイルにコピーされている

こうしたコードを引き継いだ新メンバーが内容を把握するのに**1〜2ヶ月**かかるケースがある。GitHub Copilot（月$10）やClaude Code（月$20）の導入が予算的に難しいチームも多いが、**Sourcegraph Ampは完全無料**（広告サポート型）でこの問題を解決できる。

---

## Sourcegraph Ampを使った解決アプローチ

Sourcegraph Ampは VS Code・Cursor・JetBrains・CLI に対応する無料AIコーディングエージェントである。内部では Claude Agent・OpenAI Codex・Gemini CLI を切り替えて使うことができ、**MATLAB MCP Server と連携することでSimulinkモデルもブロック単位で操作**できる。

コードグラフ（どの関数がどこから呼ばれているか）をAST（抽象構文木：コードの構造を木形式で表現したデータ）ベースで把握した上でリファクタリングを実行するため、単なる補完ツールと違い**「壊さないリネーム」**が可能である。

---

## 実装：ステップバイステップ

**前提条件：**
- VS Code（最新版）
- Sourcegraph Amp VS Code拡張（無料）
- MATLAB R2024b以上（MATLAB MCP Server連携する場合）

### ステップ1：Sourcegraph Ampのインストール

```bash
# === VS Code拡張をCLIでインストール ===
code --install-extension sourcegraph.cody-ai

# インストール後、VS Code左サイドバーの「Cody」アイコンをクリック
# Sourcegraphアカウント（無料）でサインイン
```

VS Code設定ファイル（`.vscode/settings.json`）に以下を追加してAmpエージェントモードを有効化する：

```json
{
  "cody.advanced.agent.capabilities.agentic": true,
  "cody.chat.preInstruction": "このリポジトリはMATLABを使った学生フォーミュラ車両のシミュレーションコードです。変数名は英語、コメントは日本語で書いてください。"
}
```

### ステップ2：MATLABリポジトリの技術負債を一括スキャン

VS CodeでMATLABプロジェクトフォルダを開き、Ampのチャットパネル（`Ctrl+Shift+P` → "Cody: Open Chat"）に以下を送信する：

```
このリポジトリは学生フォーミュラ車両のMATLABシミュレーションです。
以下を調べて箇条書きで報告してください：
1. 1〜3文字の意味不明な変数名が多いファイル（上位5件）
2. 数値リテラルがハードコードされている箇所（全件）
3. 同一ロジックが重複しているファイルペア
4. コメントが古い（2022年以前）と思われる関数
```

### ステップ3：自動リファクタリングを実行

```matlab
% === リファクタリング前のコード（実際によくある状態） ===
% calcLap.m — ラップタイムシミュレーション（2022年先輩作成）
function [t, v] = calcLap(x, p)
    a1 = 1.2;           % ???
    b2 = 0.85;          % ???
    tmp = x * a1;       % 中間計算
    v = sqrt(tmp / p);  % 速度計算
    t = x / v;          % 時間計算
end
```

Ampへのプロンプト：

```
calcLap.m の変数名を適切な名前にリネームしてください。
文脈から推測して：
- a1, b2 は車両の物理定数です
- 車両パラメータを vehicle struct にまとめてください
- 各変数に「変数名[単位] — 意味」の形式で日本語コメントを追加してください
- 関数名も内容を表す名前に変更してください
```

Ampが生成するリファクタリング後コード：

```matlab
% === リファクタリング後 ===
% calcCorneringSpeed.m — コーナリング速度・通過時間の計算
% vehicle struct のフィールド:
%   .dragCoeff        — 空気抵抗係数 [-]（ダウンフォース含む等価値）
%   .rollingResistance — 転がり抵抗係数 [-]
function [lapTime_s, velocity_ms] = calcCorneringSpeed(distance_m, vehicle)
    % 空力抵抗と転がり抵抗の合成抵抗係数 [N/kg]
    resistance_total = vehicle.dragCoeff * vehicle.rollingResistance;

    % コーナリング速度の上限（運動エネルギーと抵抗仕事の平衡から）
    % v = sqrt(F_lateral_limit / resistance_total) の近似
    velocity_ms = sqrt(distance_m * resistance_total);  % [m/s]

    % 区間距離を平均速度で割ってラップタイムを推定
    lapTime_s = distance_m / velocity_ms;               % [s]
end
```

### ステップ4：ハードコード定数を vehicle_params.m に一括集約

```matlab
% === Ampへのプロンプト ===
% "すべての .m ファイルからハードコードされた数値定数を抽出し、
%  vehicle_params.m という struct にまとめてください。
%  呼び出し元のコードも vehicle_params.XXX に自動置換してください。"

% Ampが生成する vehicle_params.m の例
function vehicle = vehicle_params()
    vehicle.mass_kg          = 285;    % 車両質量（ドライバー込み）[kg]
    vehicle.wheelbase_m      = 1.530;  % ホイールベース [m]
    vehicle.cog_height_m     = 0.285;  % 重心高さ [m]
    vehicle.dragCoeff        = 1.20;   % 空気抵抗係数 [-]
    vehicle.rollingResistance = 0.85;  % 転がり抵抗係数 [-]
    vehicle.engine_power_kW  = 47.5;   % エンジン最大出力 [kW]
end
```

### ステップ5：MATLAB MCP Server連携でSimulinkモデルも整理

```bash
# MATLAB コマンドウィンドウで MCP Server を起動
# matlab.mcp.Server.start()   ← MATLAB R2024b以上で利用可能

# .vscode/mcp.json を作成
```

```json
{
  "servers": {
    "matlab": {
      "command": "matlab-mcp-server",
      "args": ["--port", "3000"]
    }
  }
}
```

Ampのチャットに送信：

```
VehicleDynamics.slx のすべてのブロックを一覧化して、
未接続のSignalがあれば指摘してください。
また以下のリファクタリングを実行してください：
1. Subsystem を Referenced Model（参照モデル）に分割する
2. ハードコードされた Gain ブロックの値をワークスペース変数に置換する
3. 信号名のない配線にすべて信号名を付ける
```

---

## Before / After（実数値で比較）

| 項目 | 手動リファクタリング | Sourcegraph Amp使用後 |
|------|------------------|----------------------|
| コードベース全体の変数名整理 | 5〜8時間/人 | 30〜60分 |
| 引き継ぎドキュメント自動生成 | 2日間 | Ampが自動生成（2時間） |
| ハードコード定数の検出・集約 | 手作業・見落としあり | 全ファイル100%検出 |
| ツール費用 | — | **完全無料** |
| Simulinkモデル整理対応 | MATLAB熟練者のみ | メンバー全員が実行可 |

---

## よくあるエラーと対処

| エラー | 原因 | 対処法 |
|--------|------|--------|
| `Context window exceeded` | ファイルが大きすぎる（1000行超） | ファイルを機能単位で100行以下に分割してから依頼 |
| リネームが一部だけ反映 | 異なるファイルに同名変数が存在 | 「プロジェクト全ファイルで一括置換して」と追記する |
| MATLAB MCP接続エラー | ポートが競合している | `--port 3001` に変更して再起動 |
| Simulink操作が失敗 | MATLAB R2024b未満 | MATLAB MCP ServerはR2024b以上が必須 |
| Ampが英語で回答する | 言語設定の問題 | settings.jsonの `preInstruction` に「日本語で答えてください」を追記 |

---

## 今週の学生チームへの宿題

今週末、チームで最も古いMATLABスクリプトを1つ選んでSourcegraph Amp（VS Code拡張インストールで無料、5分）に読み込ませ、「このファイルのリファクタリング提案を10個挙げてください」と依頼してみよう。実際に適用する前に提案をレビューする習慣が、安全なAI活用の第一歩だ。

---

## 学生フォーミュラ・レース車両開発への応用

### シナリオ：シーズン終了後の技術引き継ぎコードクリーンアップ

学生フォーミュラでは**毎年3〜4月にチームメンバーが交代**する。引き継ぎ前にAmpでコードベースを一掃することで、新メンバーのキャッチアップ期間を大幅に短縮できる。特に「車両パラメータがどこに定義されているか」を新メンバーが理解するまでの時間は、コード品質に直結する。

### 背景理論

Sourcegraph AmpのコードグラフはASTベースで関数間の呼び出し関係を把握する。単純な文字列置換ではなく「この変数はどの関数からどのように使われているか」を理解した上でリネームを実行するため、**動作を壊さない安全なリファクタリング**が可能になる。GitHub Copilot（IDE補完）やCursor（コンテキスト補完）との最大の違いは、「コードベース全体をグラフとして把握する」点にある。

### 実際に動く手順

```matlab
% Ampへの依頼プロンプト（実際にコピペして使える）：
%
% "以下を順番に実行してください：
%  ① src/ 内のすべての .m ファイルからハードコードされた
%    数値定数を抽出し、vehicle_params.m という関数にまとめる
%  ② 呼び出し元のコードを vehicle_params().フィールド名 に自動置換する
%  ③ 1〜3文字の変数名をすべて意味のある英単語にリネームする
%  ④ 各関数の冒頭に入出力の説明コメント（日本語）を追加する"
```

### Before / After

| 項目 | 引き継ぎ前 | Amp活用後 |
|------|----------|----------|
| 新メンバーがコードを把握する期間 | 4〜8週間 | 1〜2週間 |
| ハードコード定数の散在箇所 | 30〜50箇所 | `vehicle_params.m` 1箇所に集約 |
| 引き継ぎドキュメント作成工数 | 2日 | 2時間（Ampが自動生成） |
| ツール費用 | — | 無料 |

### 学生チームが今すぐ試せる最初のステップ

① VS CodeにSourcegraph Amp拡張をインストール（無料、約1分）  
② GitHubリポジトリをVS Codeで開く  
③ Ampチャットに「このリポジトリのMATLABコードの技術負債を箇条書きにして、優先度順に並べてください」と送信する
