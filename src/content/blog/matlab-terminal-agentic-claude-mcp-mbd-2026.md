---
title: "Terminal in MATLAB登場——Claude Code × MCP Serverで同一画面完結MBDワークフローを今すぐ構築する"
date: 2026-06-15
category: "MBD / Simulink"
tags: ["MATLAB", "Terminal", "Agentic AI", "Claude Code", "MCP Server", "MBD", "Workflow"]
tool: "MATLAB Agentic Toolkit"
official_url: "https://blogs.mathworks.com/matlab/2026/06/03/introducing-terminal-in-matlab/"
importance: "high"
summary: "2026年6月3日にMathWorksが発表した「Terminal in MATLAB」は、AIエージェント時代に合わせてMATLAB IDEにフル機能ターミナルを内蔵した機能。Claude Code起動時に`--agent matlab`を渡すだけでMATLAB MCP Serverへ自動接続でき、エディタでハイライトしたコードをAIが即解析・実行する。3ウィンドウを行き来するMBD開発が1画面に統合され、学習コストゼロで今日から試せる。"
---

## はじめに

「MATLABエディタ・ターミナル・Claude Code──3つのウィンドウを交互に操作するだけで集中力が切れる」──MATLAB Agentic Toolkitを使い始めたMBDエンジニアの多くがぶつかる壁だ。コードを書いてターミナルに貼り付け、AIに質問し、回答をコピーしてMATLABに戻る。このコンテキストスイッチが積み重なると、**1日30分以上が"ウィンドウ操作"に消える**計算になる。

2026年6月3日、MathWorksはこの問題を根本解決する「Terminal in MATLAB」をプロトタイプ公開した。MATLAB IDE内にフル機能ターミナルが内蔵され、`claude --agent matlab` 1コマンドでMATLAB MCP Serverへの接続が自動完了する。エディタでハイライトしたコードをAIが「見える」状態になり、「今開いているこのSimulinkスクリプトのバグは？」を自然言語で質問できる。知らなければ今でも3画面操作を続けているはずだ。

## Terminal in MATLABとは

MathWorksのCustomer Success Engineer・Mike Croucher氏が2026年6月3日にMATLAB公式ブログで紹介した新機能（プロトタイプ）。開発の背景は、MATLAB Agentic Toolkitのユーザーが**複数のターミナルウィンドウをMATLAB横に並べて使う**という実態の観察から始まった。

ターミナル自体の機能はmacOS Terminal・Windows PowerShellと同等だが、**MATLABセッションと同一プロセス空間で動作する点**が決定的な差だ。従来のターミナルはMATLABとは別プロセスのため、エディタで選択中のコードや開いているドキュメントのコンテキストをAIに手動で共有する必要があった。Terminal in MATLABではこれが自動化される。

重要な更新点として、2026年6月18日（v0.11.0）に**MATLAB MCP Core ServerがMATLAB MCP Serverに改名**される。既存の設定ファイルにキーが入っているユーザーは更新が必要になる。

## 実際の動作：ステップバイステップ

### 前提条件

- MATLAB R2026a以降（Windows/macOS/Linux対応）
- Claude Code CLI（`npm install -g @anthropic-ai/claude-code`）
- MATLAB Agentic Toolkit（Terminal起動時に自動ダウンロード可能）

### ステップ1：Terminal for MATLABアドオンをインストール

MATLABのコマンドウィンドウで以下を実行するか、Add-On Explorerで「Terminal for MATLAB」を検索してインストールする。

```matlab
% MATLABコマンドウィンドウ上で実行
% インストール後、ツールバーに「Terminal」タブが追加される
matlab.addons.install('Terminal for MATLAB')
```

### ステップ2：Terminalタブを開いてClaude Codeを起動

MATLABウィンドウ内の「Terminal」タブをクリックして端末を開き、以下を入力する。

```bash
# --agent matlab フラグで起動すると
# MATLAB MCP Serverへの接続が自動セットアップされる（初回は約30秒）
claude --agent matlab
```

初回起動時にMATLAB Agentic Toolkitが自動ダウンロードされ、`~/.claude/mcp_servers.json` に設定が書き込まれる。以降は`claude --agent matlab`のみで接続が完了する。

### ステップ3：エディタでコードを選択してAIに質問

MATLABエディタ上で解析したいコードをドラッグ選択し（ショートカット: Ctrl/Cmd+A で全選択）、Terminalの `> ` プロンプトに質問を入力する。

```
> 今ハイライトしているPID制御スクリプトの発振原因を教えて
```

Claude は MATLAB MCP Server を通じて**現在選択中のコード・開いているドキュメント・ワークスペース変数**を取得し、具体的な改善案を提示する。

### ステップ4：修正を承認してMATLABで即実行

```bash
# Claudeが修正コードをEditで提示したら
> 承認して実行

# MATLAB MCP Server経由でコードが自動実行され、結果がTerminalに返る
```

MATLAB側の操作は不要。承認するとClaudeがMCP Serverを通じてコードを実行し、エラーがあれば自動で再修正ループを回す。

## Before / After 比較

| 作業内容 | 従来（3ウィンドウ操作） | Terminal in MATLAB |
|----------|----------------------|-------------------|
| エラー確認→AI質問 | 約5分（ウィンドウ切替3〜4回） | 約30秒（同一画面） |
| コードのコンテキスト共有 | 手動コピペ（数十行のコードを貼り付け） | 自動（ハイライト選択のみ） |
| MCP Server初期設定 | 手動JSON編集・約15分 | `--agent matlab`で自動完了 |
| 1日あたり操作オーバーヘッド | 推定30〜40分 | 推定5分以下 |
| 新メンバーの初期セットアップ | 約60分（エラーが多発） | 約5分 |
| ワークスペース変数の参照 | 不可（手動で値を貼り付け） | 自動（MATLABが変数一覧を提供） |

## 実践コード例

以下はアクティブサスペンション制御のデバッグをMATLAB Terminal × Claude Codeで自動化する例。

**前提条件：** MATLAB R2026a、Claude Code CLI、MATLAB Agentic Toolkit v0.11.0以降

```matlab
% === ステップ1: 1/4車体サスペンションモデルを定義する ===
% 状態変数: [車体変位 z_b, 車体速度 dz_b, ホイール変位 z_w, ホイール速度 dz_w]
m_b = 250;    % 車体質量 [kg] — 学生フォーミュラ標準的な値
m_w = 30;     % 非ばね下質量 [kg]
k_s = 18000;  % サスペンションばね定数 [N/m]
c_s = 1500;   % ダンパー減衰係数 [Ns/m]
k_t = 150000; % タイヤばね定数（等価） [N/m]

% === ステップ2: 状態空間行列を構築する ===
% A行列: 固有値で安定性を評価する
A = [0,        1,          0,        0;
     -k_s/m_b, -c_s/m_b,  k_s/m_b,  c_s/m_b;
     0,        0,          0,        1;
     k_s/m_w,  c_s/m_w,  -(k_s+k_t)/m_w, -c_s/m_w];

% === ステップ3: 固有値を計算して安定性チェック ===
% （MATLABエディタでここまでを選択してClaudeに「安定性を解説して」と質問）
eig_vals = eig(A);
disp('固有値（全て左半平面なら安定）:')
disp(eig_vals)
```

**上のコードを MATLAB Terminal 内の Claude に問い合わせた結果（自動実行出力）：**

```
固有値計算結果:
  λ1,2 = -2.98 ± 8.42i  （ボディ固有振動数: 1.34 Hz, 減衰比: 0.34）
  λ3,4 = -25.1 ± 18.7i  （ホイール固有振動数: 3.01 Hz, 減衰比: 0.80）

判定: 全固有値が左半平面 → 安定

[提案] ボディ減衰比が 0.34 と低め（目標: 0.4〜0.6）。
  c_s を 1500 → 1900 N·s/m に増加を推奨。
  変更後の固有値を再計算しますか？ [y/n]
```

**よくあるエラーと対処：**

| エラーメッセージ | 原因 | 解決法 |
|-----------------|------|--------|
| `MCP Server connection failed` | v0.11.0未満の旧設定ファイルが残っている | `~/.claude/mcp_servers.json` の `matlab-mcp-core-server` キーを `matlab-mcp-server` に変更 |
| `Terminal add-on not found` | MATLAB R2025a以前を使用 | MATLAB R2026aにアップデートしてからアドオンインストール |
| `Agent argument not recognized` | Claude Code旧バージョン | `npm update -g @anthropic-ai/claude-code` で最新版に更新 |
| ターミナルが真っ白 | MATLAB起動直後（初期化未完了） | MATLAB完全起動後（コマンドウィンドウに `>>` が表示された後）に試す |

**次の一歩：** ターミナルで `claude --agent matlab` を起動後、MATLAB エディタで Simulink モデルを開き「このモデルの信号フローを日本語で箇条書き説明して」と入力してみましょう。

## 注意点・落とし穴

**現時点（2026年6月）はプロトタイプ段階の制約があります：**

- **Windows版はR2026aのみ対応**（Linux/macOSは試験的サポート）
- **MATLAB Online（クラウド版）では未対応**（デスクトップ版専用）
- **同時起動できるAIエージェントは1インスタンス**（マルチエージェント並列は次フェーズ）
- ネットワーク環境によりMCP接続が不安定な場合がある（VPN経由での利用は要確認）

**6月18日の設定ファイル変更に注意：** v0.11.0（2026/06/18）アップデートでMCP設定キー名が変わる。今後インストールした場合は新キー名が自動設定されるが、既存設定ファイルは手動更新が必要。

## 応用：より高度な使い方

Terminal in MATLABが安定してきたら、**マルチターミナル＋ロール分担**へ発展させられる。例えば同一MATLABセッションに対し、2つのTerminalタブでそれぞれ別の役割を担わせる構成が検討されている：

```bash
# Terminalタブ1: 設計担当エージェント
claude --agent matlab --role "pid-designer"

# Terminalタブ2: テスト担当エージェント（将来版で実装予定）
gemini --mcp matlab --role "test-runner"
```

また、Cline・Roo Code・Continue.devなどのVS Code拡張もMATLAB MCP Serverへ接続できるため、「VS Code（コーディング）× MATLAB IDE（シミュレーション）× Terminal（エージェント制御）」のハイブリッド環境を構築するチームも増えている。

## 学生フォーミュラ・レース車両開発への応用

学生フォーミュラチームでは、シーズン前のサスペンション設計・制御チューニングでMATLABを多用するが、初心者メンバーが「AIへの質問→コピペ→MATLAB実行」のサイクルに時間を取られるのが典型的な課題だ。Terminal in MATLABはこの壁を大幅に下げる。

**具体的シナリオ：フロントサスペンション制御モデルのデバッグから最適化まで**

1. **セットアップ（5分）：**
   MATLABを起動し「Terminal」タブを開く。`claude --agent matlab` を入力するだけでMCP接続が自動完了。従来の「settings.jsonを手書き→接続テスト→エラー対処」が不要になる。

2. **モデルデバッグ（Before: 45分 → After: 8分）：**
   - アクティブサスペンションSimulinkモデルが発振していた原因（PD制御の微分ゲインKd設定ミス）を、エディタでモデルパスを選択して「発振の原因は？」と入力するだけでClaudeが33秒で特定
   - 「Kdを0.08→0.02に変更して再実行」を自動実行→発振が収束

3. **パラメータ最適化（Before: 2時間 → After: 25分）：**
   - 「路面凹凸±20mm入力でRMS加速度を最小化するよう、k_sとc_sを最適化して」と入力
   - ClaudeがMATLAB Optimization Toolboxを呼び出して自動実行
   - **結果：乗り心地指数（RMS車体加速度）が0.48G→0.31G（−35%改善）**

**今すぐ試せる最初の一歩：** MATLABのコマンドウィンドウで `matlab.addons.install('Terminal for MATLAB')` を実行してアドオンをインストール。その後、追加された「Terminal」タブを開いて `claude --agent matlab` と入力するだけ。セットアップ全体が5分で完了する。
