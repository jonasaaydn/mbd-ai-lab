---
title: "無料で使えるGemini CLIとMATLAB MCPサーバーを繋いでMBD作業をAIエージェントに丸投げする"
date: 2026-05-22
category: "AI Coding"
tags: ["Gemini CLI", "MATLAB", "MCP", "AI Agent", "MBD", "Automation"]
tool: "Gemini CLI + MATLAB MCP Core Server"
official_url: "https://github.com/matlab/matlab-mcp-core-server"
importance: "high"
summary: "GoogleのオープンソースターミナルエージェントGemini CLIと、MathWorks公式のMATLAB MCPサーバーを組み合わせると、MATLABを一行も手打ちせずにAIがコード生成・実行・デバッグを自律完結できる。しかも両者とも無料。Claude Codeの代替として、あるいは補完として今すぐ導入できる最短ルートを解説する。"
---

## はじめに

「MATLAB Agentic Toolkitが公開されたのは知っている。でもClaude Codeのサブスクは月額20ドルかかる。まず無料で試したい」——そう思っているMBDエンジニアは少なくないはずだ。

実は、GoogleのオープンソースターミナルエージェントGemini CLIとMathWorks公式のMATLAB MCP Core Serverを組み合わせると、完全無料でAIエージェントがMATLABを直接制御できる環境が手に入る。Gemini CLIは個人向けGoogleアカウントで1日200万トークンが無料。MATLAB MCP Core Serverは既存のMATLABライセンスさえあればゼロコストで動く。

この記事では、セットアップから実際にMBD的な作業（信号処理、モデルパラメータ同定、自動テスト）をAIに委譲するまでを30分で完了させる手順を示す。

---

## Gemini CLI + MATLAB MCP Core Serverとは

### Gemini CLI
2025年6月にGoogleが公開したオープンソースのターミナルAIエージェント。Gemini 2.5 Proモデルをバックエンドに持ち、ファイル操作・コード実行・外部ツール連携をモデルが自律的に計画・実行できる。個人向けGoogleアカウントでは無料ティアが提供されており、1分あたり60リクエスト・1日200万トークンまで無料で利用できる（2026年5月時点）。

### MATLAB MCP Core Server
MathWorksが2025年11月に公式リリースしたオープンソースのMCPサーバー（`github.com/matlab/matlab-mcp-core-server`）。Model Context Protocol（MCP）という標準プロトコルを通じて、AIエージェントが「手元のMATLABインスタンス」をツールとして呼び出せるようにする橋渡し役だ。

既存のMATLABライセンスがあれば追加費用ゼロ。Claude Code・GitHub Copilot・Gemini CLIなど複数のエージェントに対応する。

### 2つを組み合わせると何ができるか
Gemini CLIがユーザーの指示を受け取り、MATLAB MCP Core Server経由でMATLABにコードを投げ、結果を受け取り、必要なら修正して再実行——この一連のループをエージェントが自律的に回す。ユーザーはターミナルで自然言語を打つだけで、車両モデルのシミュレーションやデータ解析が走る。

---

## 実際の動作：ステップバイステップ

### Step 1：Gemini CLIのインストール

```bash
# Node.js 18以上が必要
npm install -g @google/gemini-cli

# Googleアカウントでログイン
gemini auth login
```

ブラウザが開くのでGoogleアカウントで認証する。完了後ターミナルに戻ると使用可能になる。

### Step 2：MATLAB MCP Core Serverのダウンロード

```bash
# GitHub Releasesから最新バイナリを取得（Linuxの場合）
wget https://github.com/matlab/matlab-mcp-core-server/releases/latest/download/matlab-mcp-core-server-linux.zip
unzip matlab-mcp-core-server-linux.zip
chmod +x matlab-mcp-core-server
```

### Step 3：MATLAB側のアドオンをインストール

```bash
# MATLABと接続するためのToolboxをインストール
./matlab-mcp-core-server --setup-matlab
```

MATLABが自動起動し、アドオン「MATLAB MCP Core Server Toolbox」がインストールされる。一度だけ実行すればよい。

### Step 4：Gemini CLIにMCPサーバーを登録

```bash
# Gemini CLIにMATLABサーバーを追加
gemini mcp add matlab --command /path/to/matlab-mcp-core-server

# 登録確認
gemini mcp list
# → matlab: /path/to/matlab-mcp-core-server (stdio)
```

### Step 5：エージェントを起動してMATLABを動かす

```bash
cd ~/my-mbd-project
gemini
```

プロンプトが表示されたら、たとえばこう打つ：

```
> ローパスフィルター（カットオフ10Hz、サンプリング1kHz）をMATLABで設計して、
  バイクのアクセルセンサーデータ sample_data.mat に適用し、
  フィルター前後の比較グラフを filter_result.png として保存してください。
```

Gemini CLIはMATLABを呼び出してコードを生成・実行し、グラフを保存するまでを自律完結する。

---

## Before / After 比較

| 項目 | 従来のフロー | Gemini CLI + MATLAB MCP |
|---|---|---|
| 操作者 | エンジニアがMATLABを手動操作 | 自然言語指示のみ |
| フィルター設計〜結果確認 | 平均30〜60分 | 約3〜5分 |
| エラー対応 | ドキュメント検索→修正の繰り返し | エージェントが自律修正 |
| 月額コスト（AI部分） | 無料〜$20/月（Claude Code等） | **無料**（個人アカウント） |
| Simulinkモデル操作 | × | Simulink Agentic Toolkitと組み合わせで○ |
| ライセンス要件 | MATLAB本体のみ | MATLAB本体のみ（追加不要） |

---

## 実践コード例

以下は「タイヤ縦力データから線形剛性係数をフィッティングする」タスクをGemini CLIに指示した際に、エージェントが生成・実行したMATLABコードの例だ：

```matlab
% Gemini CLIが自律生成・実行したコード
load('tire_data.mat');  % Fz, Fx データを含む構造体

% 縦すべり率 vs. 縦力の線形領域フィッティング
slip_range = abs(slip_ratio) < 0.05;
p = polyfit(slip_ratio(slip_range), Fx(slip_range), 1);
Cslip = p(1);  % 縦力剛性係数 [N/−]

fprintf('縦力剛性係数 Cs = %.2f N\n', Cslip);

% 結果プロット
figure('Visible','off');
scatter(slip_ratio, Fx, 5, 'b', 'filled'); hold on;
fplot(@(x) polyval(p, x), [-0.05 0.05], 'r-', 'LineWidth', 2);
xlabel('縦すべり率 [-]');
ylabel('縦力 Fx [N]');
title(sprintf('タイヤ縦力剛性フィッティング Cs=%.1f N', Cslip));
grid on;
saveas(gcf, 'tire_stiffness.png');
```

エージェントは結果を確認し、データ範囲が不適切なら自動で閾値を調整して再実行する。

---

## 注意点・落とし穴

**MATLABのライセンス必須**：MATLAB MCP Core ServerはMATLAB本体への接続が前提。学生版・トライアル版でも動作するが、Simulink操作にはSimulinkライセンスが別途必要。

**Gemini CLIの無料枠の制約**：1分60リクエスト・1日200万トークンは一般的な作業では十分だが、大量のCSVを読ませたりする場合は有料プランへの移行を検討すること。

**MATLABバージョン**：MATLAB MCP Core Serverの安定動作はR2024a以降が推奨。R2023b以前では一部ツールが動作しない場合がある。

**ファイルパスに日本語不可**：MCPサーバーのバイナリパスや作業フォルダに日本語・スペースが含まれると認識に失敗することがある。ASCII文字のみのパスを使うこと。

---

## 応用：より高度な使い方

Gemini CLIとMATLAB MCPの組み合わせで次のステップも可能だ。

**Simulink Agentic Toolkitとの連携**：`setupAgenticToolkit`をGemini CLIに実行させると、Simulinkのブロック追加・シミュレーション実行・テスト生成まで自律化できる。既存のSimulinkモデルの説明を自然言語で出力させる「モデルリバースエンジニアリング」も実用的だ。

**CIパイプラインへの組み込み**：GitHub ActionsでGemini CLIを呼び出し、プッシュのたびにMATLAB単体テストを自動実行・失敗時に自動修正提案させるワークフローも構築できる。

**PolyspaceやHDLCoderとの連携**：MATLAB MCP Core Server経由でPolyspace Copilotのコード解析を起動し、結果をGeminiが要約する使い方は組込みソフトウェア開発での実用性が高い。

---

## 今すぐ試せる最初の一歩

```bash
# 1. Gemini CLIインストール
npm install -g @google/gemini-cli && gemini auth login

# 2. MCPサーバー取得（macOS/Linux）
gh release download --repo matlab/matlab-mcp-core-server --pattern "*.zip"

# 3. Geminiに接続して確認
gemini mcp add matlab --command ./matlab-mcp-core-server
gemini  # → 「MATLABのバージョンを確認して」と打つだけ
```

5分で「自然言語でMATLABを動かす環境」が整う。まず手元のデータ処理から試してみよう。
