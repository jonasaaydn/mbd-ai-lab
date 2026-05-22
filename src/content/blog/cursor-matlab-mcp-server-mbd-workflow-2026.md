---
title: "CursorとMATLAB MCPサーバーを繋げる——AIエージェントがMATLABコードを書いて即実行する新ワークフロー"
date: 2026-05-22
category: "AI Coding"
tags: ["Cursor", "MATLAB", "MCP", "AIエージェント", "MBD"]
tool: "Cursor"
official_url: "https://github.com/matlab/matlab-mcp-core-server"
importance: "high"
summary: "VS Code互換AIエディタ「Cursor」にMATLAB公式MCPサーバー（v0.9.2）を接続することで、自然言語の指示だけでMATLABコードの生成・実行・品質チェックまでが一気通貫になる。既存記事で紹介したGemini CLIとの違いも含め、CursorのAgent Mode設定からMBD実務への応用まで詳しく解説する。"
---

## はじめに

「Simulinkモデルの検証コードを書いて、そのままMATLABで実行して結果を返してほしい」——MBDエンジニアがAIにそう頼める時代が正式に来た。MathWorksが公開しているMATLAB MCP Core Server（2026年5月21日リリースのv0.9.2）は、CursorをはじめとするMCPに対応したAIエージェントからMATLABを直接制御できる仕組みだ。

Gemini CLIやClaude Codeとの連携は本ブログでも紹介してきたが、Cursorはコードエディタ上でAIとインタラクティブに作業できる点が異なる。コードを書きながらAIに「このSimulinkブロックのパラメータを最適化して」と頼み、MATLABで即座に実行確認できる——この一体感が最大の強みだ。MATLAB MCP接続を知らなければ、毎日手動コピペを繰り返す非効率なループから抜け出せない。

## Cursor + MATLAB MCP Serverとは

Cursor（cursor.com）は、VS Codeをベースに構築されたAIファーストのコードエディタだ。Anthropic、OpenAI、Googleのモデルを選択して使え、2025年後半からMCP（Model Context Protocol）サーバーへの接続に正式対応した。2026年1月のアップデートでは動的コンテキスト管理が導入され、複数MCPサーバーを同時使用してもトークン消費が47%削減されている。

MathWorksが提供するMATLAB MCP Core Serverは、AIアプリケーションに以下を可能にする：

- MATLABの起動・終了を制御する
- MATLABコードを記述・実行し結果を取得する
- コードのスタイルと正確性を静的解析する

MATLAB R2021a以降（最大5世代前まで）が動作要件で、v0.9.2ではMATLAB起動中にMCPサーバーがブロックされない改善（非ブロッキング起動）が追加されている。Windowsの.NET相互運用バグも修正済みだ。

## 実際の動作：ステップバイステップ

### Step 1：MATLAB MCP Serverのインストール

```bash
# GitHubリリースページから最新バイナリをダウンロード
# https://github.com/matlab/matlab-mcp-core-server/releases

# macOS/Linuxの場合：実行権限を付与
chmod +x ~/Downloads/matlab-mcp-core-server

# MATLABがPATHに含まれているか確認
matlab -batch "disp('MATLAB OK')"
```

### Step 2：Cursorのプロジェクト設定ファイルを作成

プロジェクトルートに `.cursor/mcp.json` を作成する（グローバル設定は `~/.cursor/mcp.json`）：

```json
{
  "mcpServers": {
    "matlab": {
      "command": "/path/to/matlab-mcp-core-server",
      "args": [
        "--matlab-display-mode", "nodesktop",
        "--matlab-session-mode", "new",
        "--initialize-matlab-on-startup", "true",
        "--log-level", "warn"
      ]
    }
  }
}
```

`nodesktop` モードで起動すると、GUIなしでバックグラウンドMATLABが立ち上がるため、CI環境やヘッドレスサーバーでも動作する。

### Step 3：Cursorでの動作確認

Cursorを開き、Agent Modeでチャット欄に入力：

```
MATLAB上でfft関数を使って100Hzサンプリングのsin波(5Hz)のスペクトルを
プロットし、ピーク周波数を返してください
```

すると、CursorのAIは自動でMATLABコードを生成し、MCPサーバー経由でMATLABに送信・実行し、結果（ピーク5.0Hz）を返してくる。

**入力（自然言語）→ 出力（実行結果）**の流れがエディタ内で完結する。

## Before / After 比較

| 項目 | MATLAB MCP導入前 | MATLAB MCP導入後 |
|------|----------------|----------------|
| コード→実行サイクル | 手動コピペ + MATLAB切替（約2分/回） | エージェントが自動実行（約15秒/回） |
| コード品質チェック | MLintを別途起動 | AIが静的解析を自動実施 |
| 試行錯誤回数（1時間） | 平均8〜10回 | 平均25〜30回 |
| MBD検証スクリプト作成 | 30〜60分（ゼロから） | 5〜10分（AIが生成・実行） |

Cursorの「Ask Mode」で設計方針を検討し、「Agent Mode」でコード生成・実行を自動化、デリケートな箇所だけ「Manual Edit」——この3段階のモード使い分けが、手動開発より格段に効率的なループを生む。

## 実践コード例：MBD向けパラメータ掃引スクリプト

以下はCursorのAIに「Simulinkモデルのゲインパラメータを0.1〜2.0まで掃引してRMSEを計算して」と依頼した際に生成・実行されたコードの例：

```matlab
% CursorのAIが生成し、MATLAB MCPサーバー経由で自動実行したコード
gains = 0.1:0.1:2.0;
rmse_values = zeros(size(gains));

for i = 1:length(gains)
    set_param('MyModel/Gain', 'Gain', num2str(gains(i)));
    sim('MyModel');
    error = out.simout.Data - reference_data;
    rmse_values(i) = sqrt(mean(error.^2));
end

[best_rmse, best_idx] = min(rmse_values);
fprintf('最適ゲイン: %.1f (RMSE: %.4f)\n', gains(best_idx), best_rmse);
```

このコードを人間が書く必要はない。Cursorに自然言語で依頼すれば、MATLABで即実行して「最適ゲイン: 1.2 (RMSE: 0.0034)」といった結果を返してくれる。

## 注意点・落とし穴

**40ツール上限に注意**：Cursorは全MCPサーバー合計で約40ツールが上限だ。MATLAB MCPに加えてGitHub MCPや他のサーバーも接続する場合、ツール数が超過するとエージェントが後から登録したツールへのアクセスをサイレントに失う。接続するMCPサーバーは厳選すること。

**MATLAB R2024b以降を推奨**：v0.9.0でR2024b互換性バグが修正されているため、古いバージョン（特にR2022a以前）ではrun_matlab_codeツールが予期せず失敗することがある。

**ライセンスサーバー環境**：Linuxでネットワークライセンスマネージャーを使用している場合、v0.9.1以前ではライセンス取得に失敗する既知の問題があった。v0.9.1以降を使うこと。

**`--matlab-session-mode connect`** は既存MATLABセッションへの接続が可能だが、セッションが予期せず終了するとMCPサーバーも停止する。長時間の解析には `new` モードを推奨。

## 応用：より高度な使い方

**カスタムMATLABツールの定義（v0.8.0以降）**：JSON設定でMATLAB関数をカスタムMCPツールとして登録できる。例えば「run_simulink_validation」という専用ツールを定義し、チームのMBDワークフローに特化した操作をAIから呼び出せる。

**Simulink Agentic Toolkitとの組み合わせ**：本ブログで紹介したMathWorks公式のSimulink Agentic Toolkitと組み合わせると、Simulinkモデルの構造操作（ブロック追加・接続変更）もCursorのAIが実行できる。MATLAB MCP CoreでコードをRunし、Simulink ToolkitでモデルをEditという役割分担が理想的だ。

**コーディングガイドラインの注入**：`--initial-working-folder` でチームのガイドラインフォルダを指定し、MCP Serverにチーム規約（1i/1jを虚数単位に使う等）を読み込ませると、AIが規約に沿ったコードを自動生成するようになる。

## 今すぐ試せる最初の一歩

```bash
# 1. リリースページからバイナリをダウンロード（macOS例）
curl -L https://github.com/matlab/matlab-mcp-core-server/releases/latest/download/matlab-mcp-core-server-macos -o matlab-mcp-core-server
chmod +x matlab-mcp-core-server

# 2. .cursor/mcp.json に上記の設定を記述してCursorを再起動
# 3. Agent Modeで「MATLABでhello worldを実行して」と入力して動作確認
```

MATLAB R2021a以降があれば今すぐ試せる。5分で動作確認が完了するはずだ。
