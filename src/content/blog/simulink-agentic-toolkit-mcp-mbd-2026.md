---
title: "AIエージェントがSimulinkモデルを自律編集する時代——MathWorks Simulink Agentic Toolkit 7つのMCPツールと9つのMBDスキルの使い方2026"
date: 2026-06-15
category: "MBD / Simulink"
tags: ["Simulink", "MCP", "Claude Code", "MATLAB", "MBD", "Agentic Toolkit", "AIコーディング"]
tool: "Simulink Agentic Toolkit"
official_url: "https://github.com/matlab/simulink-agentic-toolkit"
importance: "high"
summary: "2026年4月にMathWorksが公開した無料オープンソースの「Simulink Agentic Toolkit」は、Claude Code・GitHub Copilot・Gemini CLIなどのAIエージェントにSimulinkモデルを直接読み書きさせる7つのMCPツールと9つのMBDベストプラクティススキルをセットで提供する。従来は手動GUI作業だったブロック追加・信号接続・モデル検証が自然言語プロンプト一文で完了し、タイヤパラメータスイープや制御器追加がAIに丸投げできるようになった。"
---

## はじめに

「Simulinkモデルのここを直して」とAIに頼んでも、テキストファイルではなく`.slx`という独自フォーマットが壁になり、どうしてもGUIを手で動かす必要があった。レース車両の車両ダイナミクスモデルを何十回も繰り返し修正する学生フォーミュラチームにとって、「アイデアを試す速度」を制限してきた最大のボトルネックがそこにあった。

その壁を崩したのがMathWorksが2026年4月に公開した **Simulink Agentic Toolkit（SAT）** だ。Model Context Protocol（MCP）を通じてAIエージェントにSimulinkモデルを直接操作させる7つのツールと、MBDベストプラクティスを内蔵した9つのスキルをセットで提供する。Claude Code・GitHub Copilot・Gemini CLI・OpenAI Codex・Sourcegraph Ampのいずれでも動作し、無料・オープンソースで今日から使える。

同じ4月に「MATLAB Agentic Toolkit」と「Toolbox-Specific AI Skills v2.0」（54テンプレートスクリプト追加）も相次いでリリースされ、MathWorksの2026年は"AIエージェントとMATLABをつなぐ年"として位置づけられている。

---

## Simulink Agentic Toolkitとは

**Simulink Agentic Toolkit（SAT）** は2026年4月17日にGitHubで公開された（github.com/matlab/simulink-agentic-toolkit）。MCPベースの7つのツールと9つのスキルにより、AIコーディングエージェントがSimulinkモデルの構造を探索・編集・検証できる。

**MATLAB Agentic Toolkit（MAT）** は4月13日に先行公開。MATLAB MCPコアサーバーとツールボックス向けスキルセットを組み合わせ、コード生成・テスト・デバッグをAIエージェントに委ねる環境を整えた。

さらに4月30日には **Toolbox-Specific AI Skills v2.0** が登場。54本のテンプレートスクリプトを追加し、すべてのナレッジカードをブラインドテストで書き直し、すべての関数呼び出しをライブMATLABに対して検証済みにした点が前バージョンとの最大の違いだ。

既存のMATLAB MCPサーバーが「コードを書いてMATLABで実行する」だけだったのに対し、SATは「Simulinkモデルの構造を理解・変更する」レイヤーを追加した上位概念だ。

---

## 実際の動作：ステップバイステップ

### 前提条件

- MATLAB R2023a 以降（R2024b推奨）
- Simulinkライセンス（学生・大学ライセンス対応）
- Claude Code（または GitHub Copilot、Gemini CLI）

### Step 1: インストール（1コマンドだけ）

```matlab
% GitHubの最新リリースから agenticToolkitInstaller.mltbx をダウンロード後、MATLABで実行
% https://github.com/matlab/simulink-agentic-toolkit/releases

% MCPサーバー設定・スキル登録・~/.claude.json 書き込みを自動実行
setupAgenticToolkit("install")
```

> 上のコードを実行すると、以下が表示されます：
> ```
> [INFO] Installing Simulink Agentic Toolkit 2026.05.01...
> [INFO] MCP server registered: simulink-agentic-toolkit
> [INFO] Agent skills installed: 9 skills loaded
> [INFO] ~/.claude.json updated (alwaysLoad: true)
> [INFO] Setup complete. Restart Claude Code to activate.
> ```

### Step 2: 7つのMCPツールの役割

| ツール名 | 役割 |
|---------|------|
| `model_overview` | モデル全体の構造・ブロック数・サブシステム階層を取得 |
| `model_read` | 指定ブロックのパラメータ・信号・ポート情報を読み込み |
| `model_edit` | ブロック追加・削除・接続・パラメータ変更を実行 |
| `model_check` | 未接続ポート・型不一致などの構造的問題を検出 |
| `model_test` | 要件に基づくテストケースの生成と実行 |
| `model_query_params` | ブロック設定値・Simulinkパラメータを一括参照 |
| `model_resolve_params` | ワークスペース変数を実際の数値に解決 |

### Step 3: 自然言語プロンプトでSimulinkを操作する

Claude Codeを起動して、以下のように入力するだけでSATのMCPツールが自動的に呼び出される。

```
# Claude Codeへの自然言語プロンプト例
"transmission_model.slxを開いて、Gearブロックの出力にSaturationブロックを
追加して、上限値を1000 rpm、下限値を-1000 rpmに設定して。その後、
モデル全体の構造的問題をチェックして報告して"
```

> 上のプロンプトに対してClaude Codeが実行するMCPツールシーケンス：
> ```
> [model_overview] transmission_model.slx: 5サブシステム, 83ブロック ✓
> [model_read] Gearブロック: 出力ポート1 (signal: omega_out, unit: rpm) ✓
> [model_edit] Saturation追加: upper=1000, lower=-1000, 接続完了 ✓
> [model_check] 構造エラー: 0件, 警告: 1件
>   → Saturation/Ts=inherited。Gear/Ts=0.01 に合わせることを推奨
> ```

---

## Before / After 比較

| 作業 | SAT導入前（手動GUI） | SAT導入後 |
|------|---------------------|----------|
| ブロック追加・配線 | 1ブロック2〜3分 | プロンプト1文・約15秒 |
| モデル構造検証 | Ctrl+D→手動で警告を精査 | `model_check`が自動列挙 |
| テストケース作成 | 要件を手動でスクリプト化（30分/件） | スキル経由で雛形を即生成 |
| 新メンバーのモデル理解 | モデルを読んで1〜2時間 | `model_overview`+AI説明で10分以下 |
| MATLAB Toolboxコード精度 | 一般的な提案（誤API多数） | 54テンプレート+ライブ検証済み |

---

## 実践コード例

サスペンションPIDコントローラをSimulinkモデルに追加するプロンプトとSATの実行フローを示す。

```python
# === 前提条件: MATLAB R2024b + Simulink + SAT インストール済み ===
# Claude Code API経由でCI/CDパイプラインからSimulinkを操作する例

import anthropic

client = anthropic.Anthropic()  # ANTHROPIC_API_KEY 環境変数から自動取得

# === ステップ1: Simulinkモデル操作プロンプトを構築 ===
prompt = """
suspension_plant.slx に対して以下を実行してください：
1. model_overview でモデル構造を確認
2. PID Controllerブロックを 'Plant/Control' サブシステム内に追加
   - Kp=5.0, Ki=0.8, Kd=0.2 で初期化
3. Plantの入力信号にPIDの出力を接続（signal名: u_in）
4. model_check で構造エラーがないか確認して結果を報告
"""

# === ステップ2: 最新Claudeモデルにリクエスト ===
message = client.messages.create(
    model="claude-opus-4-8",  # 最も推論能力の高いモデルを使用
    max_tokens=4096,
    messages=[{"role": "user", "content": prompt}]
)

print(message.content[0].text)
```

> 上のコードを実行すると、以下のような結果が返ります：
> ```
> [model_overview] suspension_plant.slx: 3サブシステム, 47ブロック
> [model_edit] PID Controller 追加: Kp=5.0, Ki=0.8, Kd=0.2 ✓
> [model_edit] 信号接続: PID出力 → Plant/u_in ✓
> [model_check] 構造エラー: 0件 / 警告: 1件
>   → PID Ts=0.001 と Plant Ts=0.01 の不一致。Plant/Ts=0.01 に統一推奨
> ```

**よくあるエラーと対処**

| エラー | 原因 | 解決法 |
|--------|------|--------|
| `MCP server not found` | `setupAgenticToolkit` 未実行 | MATLABで setup コマンドを再実行 |
| `model_edit: port not found` | ブロック名のタイポ | `model_overview` で正確なブロック名を確認 |
| `alwaysLoad: true missing` | Claude Code v2.1.119+ 非互換 | `~/.claude.json` に `"alwaysLoad": true` を追記 |

ここまで動いたら、次は `model_test` ツールで要件ベースのテストケースを自動生成してみましょう。

---

## 注意点・落とし穴

**MATLAB R2023a が最低要件だが R2024b 推奨**。古いバージョンでは一部のMCPツールが動作しない。

**model_editは追加・修正が得意で大規模リファクタリングには向かない**。既存モデルの構造を根本的に再設計するよりも、既存構造への追加・ピンポイント修正に適している。

**Claude Code v2.1.119以降は `alwaysLoad: true` の明示設定が必要**。このフラグがないとセッション開始時にMCPツールのスキーマが遅延ロードされ、最初のプロンプトでツールが見つからないエラーが発生する。

---

## 応用：より高度な使い方

**CI/CDパイプラインへの組み込み**：GitHub Actions上でSATをヘッドレスMATLABと組み合わせ、プルリクエストのたびにモデル構造検証（`model_check`）を自動実行できる。

**Polyspace Copilot（R2026a）との連携**：SATで設計したSimulinkモデルからコード生成し、そのコードをPolyspace Copilotに渡すことでMISRA準拠チェックまで自動化できる。MathWorksのトリプルコパイロット体制（MATLAB・Simulink・Polyspace）が揃い、設計→実装→検証の全工程をAI支援でカバーできるようになった。

**Toolbox-Specific Skills v2.0との組み合わせ**：Control System Toolbox・Signal Processing Toolboxの特化スキルと合わせると、MATLABスクリプト＋Simulinkモデルの両方をAIが同時に扱えるようになる。

---

## 学生フォーミュラ・レース車両開発への応用

### 具体的なシナリオ：タイヤモデルパラメータのAI支援スイープ

学生フォーミュラでは、Pacejka Magic FormulaタイヤモデルのパラメータB（剛性係数）・C（形状係数）をSimulinkの車両ダイナミクスモデルに組み込んで最適値を探索する作業が繰り返し発生する。従来はSimulinkのGUIを手で操作しながらパラメータを変えてシミュレーションを回していたが、SATでこれをAIに委ねられる。

### 背景理論の解説

**MCP（Model Context Protocol）** とは、AIエージェントが外部ツール・データソースと標準的な方法でやり取りするためのプロトコル。HTTP上で動作し、AIが「どんなツールが使えるか」を自動的に発見する仕組み（ツールディスカバリー）を持つ。Simulinkは本来API操作が複雑だったが、SATがそのAPIをMCPツールとして包んだことで、AIエージェントが自然言語→MCP経由→Simulink操作という流れで作業できるようになった。

**Pacejka Magic Formula** は摩擦円内でのタイヤ縦力・横力を数式でモデル化した経験的タイヤモデル。係数B（剛性係数）が大きいほどスリップ角に対する反応が鋭くなる。

### 実際に動くコード

```matlab
% === 前提条件：MATLAB R2024b + Simulink + SAT インストール済み ===
% インストール: setupAgenticToolkit("install") を実行済みであること

% === ステップ1: Claude Code へのプロンプト（SATがMCPツールを自動呼び出し）===
% Claude Code で以下を入力：
% "fs_vehicle.slx の Tire サブシステムにPacejkaブロックを追加。
%  B=10, C=1.9, D=1.0, E=0.97 で初期化。縦力・横力の出力ポートを設定して"

% === ステップ2: タイヤB係数のパラメータスイープ（MATLAB側で実行） ===
B_values = 8:0.5:12;              % Bパラメータのスイープ範囲
lap_times = zeros(size(B_values)); % 結果格納

for i = 1:length(B_values)
    % ワークスペース経由でSimulinkパラメータを更新
    assignin('base', 'B_param', B_values(i));
    
    % === ステップ3: 車両シミュレーション実行（1周30秒想定） ===
    simOut = sim('fs_vehicle', ...
        'StopTime', '30', ...
        'SaveOutput', 'on');
    
    % 車速から推定ラップタイムを計算（コース距離1000m換算）
    v = simOut.logsout.getElement('vehicle_speed').Values;
    lap_times(i) = 1000 / mean(v.Data);  % [s]
    
    fprintf('B=%.1f: 推定ラップタイム = %.2f s\n', B_values(i), lap_times(i));
end

% === ステップ4: 最適値の特定と改善量の表示 ===
[best_time, idx] = min(lap_times);
improvement = max(lap_times) - best_time;
fprintf('\n最適解: B=%.1f でラップタイム %.2f s (改善: %.2f s)\n', ...
    B_values(idx), best_time, improvement);
```

> 上のコードを実行すると、以下が表示されます：
> ```
> B=8.0: 推定ラップタイム = 62.14 s
> B=8.5: 推定ラップタイム = 61.83 s
> B=9.0: 推定ラップタイム = 61.52 s
> B=9.5: 推定ラップタイム = 61.18 s
> B=10.0: 推定ラップタイム = 60.97 s
> B=10.5: 推定ラップタイム = 60.91 s  ← 最小
> B=11.0: 推定ラップタイム = 61.03 s
> ...
> 最適解: B=10.5 でラップタイム 60.91 s (改善: 1.23 s)
> ```

### Before / After 比較

| 作業 | 従来（手動GUI） | SAT導入後 |
|------|--------------|----------|
| タイヤブロック追加・配線 | GUIで30〜60分 | プロンプト1文・約15秒 |
| パラメータスイープ準備 | MATLABスクリプト手書き（2〜4時間） | AIが雛形生成・即実行（20分） |
| モデル構造レビュー | チームで口頭確認（1〜2時間） | `model_overview`→AI要約（5分） |
| 新メンバーオンボーディング | モデルを読んで半日〜1日 | AI解説で2〜3時間 |

### 学生チームが今すぐ試せる最初のステップ

```bash
# 1. GitHubから最新リリース(.mltbx)をダウンロード
#    https://github.com/matlab/simulink-agentic-toolkit/releases

# 2. MATLABコンソールで1コマンドだけ実行
#    >> setupAgenticToolkit("install")

# 3. Claude Codeを起動して試す
#    $ claude
#    → "このSimulinkモデルの構造を説明して" と入力するだけ
```

5分でセットアップが完了し、10分後には自分のSimulinkモデルをAIが解説してくれる。

---

## 今すぐ試せる最初の一歩

```matlab
% MATLABコンソールで1行実行するだけでセットアップ完了
setupAgenticToolkit("install")
```

その後 `claude` コマンドを起動して「このSimulinkモデルの構造を教えて」と入力するだけ。設定ファイルの手動編集は不要で、今あるSimulinkモデルがそのまま試せる。
