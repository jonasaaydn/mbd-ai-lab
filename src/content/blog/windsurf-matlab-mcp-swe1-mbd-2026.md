---
title: "WindsurfのCascade AIとMATLAB MCPサーバーを繋ぐ——SWE-1モデルがMBDコードを自律修正するセットアップ完全手順"
date: 2026-05-29
category: "AI Coding"
tags: ["Windsurf", "MATLAB", "MCP", "SWE-1", "Cascade", "AI IDE"]
tool: "Windsurf"
official_url: "https://windsurf.com/"
importance: "high"
summary: "OpenAIが250億円で買収したAI IDE「Windsurf」とMATLAB公式MCPサーバーを接続する具体的な手順を解説。SWE-1モデルを搭載したCascadeエージェントがSimulinkモデルのコード補完・自動修正を実行し、Cursorと比較してどちらが向いているかを検証する。"
---

## はじめに

MBDエンジニアにとって、Cursor + MATLAB MCPサーバーの組み合わせはもはや標準的な選択肢になりつつある。しかし2026年、新たな競合が現れた。

2025年12月、OpenAIはAI IDE「Windsurf」を開発するCodeiumを約2億5000万ドル（約370億円）で買収した。2026年2月のLogRocket AI開発ツールランキングでWindsurfは**1位**を記録し、CursorとGitHub Copilotを上回った。Windsurfが搭載する独自モデル「SWE-1」はソフトウェアエンジニアリング専用に設計されており、内部ベンチマークではコード承認率が38%向上している。MathWorks公式のMATLAB MCPサーバーをWindsurfに接続すれば、Cursorとは異なるもう一つの強力な選択肢が手に入る。このセットアップ手順を知らないと、Cursorとの使い分けを最適化できずに毎日数十分を無駄にする。

## Windsurf（Cascade）とは

Windsurfは元々Codeiumが開発したAIネイティブコードエディタで、中心にある「Cascade」エージェントが単なる補完ではなくコードベース全体を横断したマルチステップタスクを自律実行する。ターミナルコマンドの発行も自動で行う。

Cascadeを動かすのは**SWE-1モデルファミリー**だ。フラッグシップの「SWE-1」、コンパクトな「SWE-1-lite」、速度重視の「SWE-1-mini」の3種類がある。これらはClaudeやGPTといった汎用モデルと異なり、Windsurfが蓄積した実際の開発ワークフローデータで訓練されたエンジニアリング特化モデルだ。CursorのComposerは承認ステップを随時挟むのに対し、WindsurfのCascadeは「割り込みを最小化して完走する」設計哲学（Flow State）を採用している。

MathWorksは2025年末に公式のMATLAB MCP Core Serverをリリースした。同サーバーはGo製バイナリとして配布されており、MATLAB R2021a以降（過去5年分のリリース）と接続できる。Claude Desktop、Cursor、VS Codeなど複数のAIホストをサポートしており、Windsurfも正式対応している。

## 実際の動作：ステップバイステップ

### ステップ1：Windsurfをインストール

```bash
# Windows（winget）
winget install Codeium.Windsurf

# macOS（Homebrew）
brew install --cask windsurf
```

または [windsurf.com](https://windsurf.com/) からインストーラーをダウンロードして実行する。

### ステップ2：MATLAB MCP Core Serverをインストール

MathWorks公式リポジトリ `github.com/matlab/matlab-mcp-core-server` からバイナリを取得する。

```bash
# Goがインストールされている場合
go install github.com/matlab/matlab-mcp-core-server/cmd/matlab-mcp-core-server@latest

# Go不使用の場合：GitHub Releasesから直接ダウンロード
# Windows: matlab-mcp-core-server-windows-amd64.zip
# Linux:   matlab-mcp-core-server-linux-amd64.tar.gz
# 展開後、バイナリをシステムPATH上に配置する

# MATLABもPATHに登録されていることを確認（Windowsの例）
where matlab   # → C:\Program Files\MATLAB\R2026a\bin\matlab.exe
```

### ステップ3：WindsurfのMCP設定ファイルを編集

設定ファイルのパス：
- macOS / Linux：`~/.codeium/windsurf/mcp_config.json`
- Windows：`%USERPROFILE%\.codeium\windsurf\mcp_config.json`

```json
{
  "mcpServers": {
    "matlab": {
      "command": "matlab-mcp-core-server",
      "args": [],
      "env": {}
    }
  }
}
```

ファイルが存在しない場合は新規作成する。

### ステップ4：WindsurfのMCP設定を有効化

`Ctrl+,`（macOS: `Cmd+,`）で設定を開き、**Advanced Settings → Cascade → Model Context Protocol (MCP)** をオンにする。その後Windsurfを再起動し、Cascadeペインのツールアイコンに「matlab」が表示されれば接続完了だ。

### ステップ5：Cascadeに指示を出す

Cascadeペイン（`Ctrl+L`）を開いて日本語で指示するだけでよい：

```
Simulinkモデル（pid_ctrl.slx）の現在のPIDゲインを読み込み、
ステップ入力に対する整定時間が2秒以内に収まるように
KpとKiをパラメータスイープで自動調整するMATLABスクリプトを
書いて実行し、最良のゲイン値と応答グラフをpid_result.pngに保存してください。
```

CascadeはMATLAB MCPの `run_matlab_code` と `check_matlab_code` ツールを自律的に呼び出す。エラーが発生すればスタックトレースを読んで自律修正し、完走まで繰り返す。

## Before / After 比較

| 項目 | AI導入前（手動） | Windsurf + MATLAB MCP |
|------|---------|---------|
| PIDゲイン調整スクリプト作成 | 45分 | 約8分 |
| コードスタイル・品質チェック | Polyspace別途起動 | `check_matlab_code` で即時 |
| デバッグ（エラー修正） | 手動で試行錯誤 | Cascade が自律ループ修正 |
| 複数ファイルをまたぐリファクタ | ファイルを手動で開き直す | Cascade がコードベース横断 |

Cursorとの違いも明確だ。Cursorは承認ダイアログが多く挟まる設計だが、Windsurfは承認要求を最小化するため**長時間連続タスクはWindsurfが向いている**。一方、仕様の議論や設計判断など対話的な作業ではCursorのClaude連携が依然として強い。用途で使い分けるのが現実的だ。

## 実践コード例

Cascadeが `run_matlab_code` ツール経由で実行するスクリプト例（コピーしてCascadeに渡せる）：

```matlab
% PID ゲインスイープ + 整定時間評価
Kp_range = 0.5:0.5:5.0;
Ki_range = 0.01:0.05:0.5;
best = struct('Kp', 1.0, 'Ki', 0.1, 't_settle', inf);

for Kp = Kp_range
  for Ki = Ki_range
    % Simulinkモデルを実行（pid_ctrl.slxが存在すること）
    sim('pid_ctrl', 'StopTime', '10');
    out = evalin('base', 'simout');
    % 2%帯域での整定時間を計算
    steady = out.Data(end);
    idx = find(abs(out.Data - steady) > 0.02 * abs(steady), 1, 'last');
    t_settle = out.Time(idx);
    if t_settle < best.t_settle
      best.t_settle = t_settle;
      best.Kp = Kp; best.Ki = Ki;
    end
  end
end
fprintf('最適ゲイン → Kp=%.2f, Ki=%.3f, 整定時間=%.2fs\n', ...
        best.Kp, best.Ki, best.t_settle);
```

このコードをベースにCascadeが実行→エラー確認→修正を繰り返す。手元での実行・デバッグは不要になる。

## 注意点・落とし穴

**MATLAB PATHの事前登録**：MATLABをシステムPATHに追加していないとMCPサーバーがMATLABを起動できない。複数バージョン（R2024a、R2026aなど）が共存している場合は、どのバージョンのMATLABがPATH上で先に解決されるかを明示的に確認する。

**Cascadeのツール数上限**：Windsurfは1セッションで同時接続できるMCPツールの合計が**100個**に制限されている。GitHub MCPや他のサーバーも同時に使っている場合はツール数の合計に注意。超過するとMATLABツールが無効化される。

**SWE-1のMATLAB特化度**：SWE-1はPython・TypeScript・C++データで最適化されており、Simulinkブロックの直接操作（add_block APIなど）はClaude搭載のCursorよりやや弱い場合がある。本記事時点では、**コーディングタスクはWindsurf、Simulinkモデル構造の操作はCursorかClaude Code**という使い分けが現実的。

**Windsurf無料プランの制限**：Freeプランは月間のCascade利用回数に上限がある。MBD業務での日常使いには月額$15のProプランを検討すること。

## 応用：より高度な使い方

MATLAB MCPサーバーと以下を組み合わせると格段に強力になる：

- **GitHub MCP**：Cascadeが自動でブランチ作成→コード修正→PR作成まで完結。SimulinkモデルのリファクタをIssueベースで管理できる。
- **Filesystem MCP**：複数の.slxファイルや.mファイルをまたいでCascadeが一括リネーム・整理を実行する。
- **dSPACE VEOS MCP（将来対応予定）**：dSPACEが2026年以降に提供予定のMCPサーバーと接続すれば、SILテストの自動実行もCascadeに委譲できる見込みだ。

## 今すぐ試せる最初の一歩

```bash
# 1. Windsurf インストール（Windows）
winget install Codeium.Windsurf

# 2. MATLAB MCP Server インストール
go install github.com/matlab/matlab-mcp-core-server/cmd/matlab-mcp-core-server@latest

# 3. MCP設定ファイルを作成
echo '{"mcpServers":{"matlab":{"command":"matlab-mcp-core-server"}}}' \
  > ~/.codeium/windsurf/mcp_config.json
```

設定後、WindsurfのCascadeに「MATLABでsin(x)のグラフをplot_sin.pngに保存してください」と入力してみよう。MATLAB MCPが起動しCascadeがコードを書いて即実行する。5分で体験できる最小限の手順だ。
