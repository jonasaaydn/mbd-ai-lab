---
title: "MATLAB Agentic Toolkit完全解説：Claude CodeがMATLABを直接制御してMBD作業を自律実行"
date: 2026-05-20
category: "MBD / Simulink"
tags: ["MATLAB", "Claude Code", "MCP", "Agentic AI", "自動化"]
tool: "MATLAB Copilot"
official_url: "https://github.com/matlab/matlab-agentic-toolkit"
importance: "high"
summary: "2026年4月にMathWorksが公開したMATLAB Agentic ToolkitはMCPサーバー経由でClaude CodeなどのAIエージェントがMATLABを直接実行・制御できるオープンソースツールキット。MBDエンジニアのデバッグ・テスト・コードモダナイズ作業を大幅に自動化する。"
---

## 「またこのエラーか」を終わらせる

MBDエンジニアの典型的な午後：Simulinkモデルのシミュレーション後、データ処理用MATLABスクリプトを実行すると謎のエラーが出る。スタックトレースを追い、変数の型を確認し、修正して再実行。このループに30〜60分が溶ける体験は誰にでもある。

2026年4月13日、MathWorksはこの状況を根本から変えるツールを公開した。**MATLAB Agentic Toolkit**だ。Claude CodeなどのAIエージェントがローカルMATLABを**直接実行・制御**できるようになる。

---

## MATLAB Agentic Toolkitの構造

ツールキットは2層で構成される：

| コンポーネント | 役割 |
|---|---|
| **MATLAB MCP Core Server** | エージェントがMATLABを呼び出すための5つのMCPツールを提供 |
| **Agent Skills** | 熟練MATLABエンジニアの知識を9カテゴリで体系化したYAMLスキルライブラリ |

MCPサーバーが提供する5つの組み込みツール：

```
evaluate_matlab_code   — MATLABコードを実行してコマンドウィンドウ出力を取得
run_matlab_file        — .mファイルを実行
run_matlab_test_file   — runtests()でユニットテストを実行
check_matlab_code      — 静的コード解析（Polyspace連携）
detect_matlab_toolboxes — インストール済みMATLABバージョン・ツールボックスを取得
```

これらを使ってClaude Codeは**コードを読む→実行する→エラーを解析する→修正する→再実行する**のループを自律的に回せる。Simulink Agentic Toolkitと異なり、こちらはMATLABスクリプト・データ解析・テスト自動化が主な守備範囲だ。

---

## AIなし vs AIありの実測比較

| 作業 | 手動（従来） | Claude Code + MATLAB Agentic Toolkit |
|---|---|---|
| エラーデバッグ（スタックトレース解析〜修正〜確認） | 20〜45分 | 3〜8分 |
| MATLAB Test の単体テスト作成 | 45分/関数 | 8〜12分/関数 |
| 旧コードのモダナイズ（R2019a→R2026a スタイル） | 2〜3時間/ファイル | 15〜25分/ファイル |
| 関数のhelpドキュメント一括生成 | 半日/モジュール | 15〜20分/モジュール |

スキルライブラリには「MATLAB Core」「Software Development」「Reporting and Database Access」「Signal Processing」など9カテゴリが含まれ、エージェントはタスクに応じた知識を自動で参照する。

---

## セットアップ：Claude Code で3ステップ

MATLAB R2024b以上とClaude Codeのサブスクリプションがあれば5分以内に動く。

```bash
# ① プラグインをマーケットプレイスから直接追加（クローン不要）
claude plugin marketplace add "https://github.com/matlab/matlab-agentic-toolkit"

# ② MATLAB Coreスキルをインストール
claude plugin install matlab-core@matlab-agentic-toolkit

# ③ Claude Codeに設定させる
claude "Set up the MATLAB Agentic Toolkit"
# → MATLABインストールを自動検出してMCPサーバーを登録
```

または従来のMCP登録方法でも動作する：

```bash
claude mcp add matlab npx -y matlab-mcp-core-server
```

スキルは約2週間ごとに更新されるため、定期的に `git pull` または `claude plugin update` を実行することを推奨する。

---

## 実際の指示例と動作の流れ

```
# Claude Codeへの指示例（MBDエンジニア向け）
「src/vehicle_dynamics/tire_force.m を開いて、
 R2026a の推奨スタイルでモダナイズした後、
 MATLAB Test の単体テストファイルを作成して全テストを実行してほしい。
 失敗したら原因を修正してすべてパスさせること。」
```

Claude Codeが自律的に実行するステップ：

1. `evaluate_matlab_code` でファイル内容を取得・分析
2. `check_matlab_code` で静的解析（非推奨API・型の不整合を検出）
3. コードを修正してファイルに書き戻す
4. `run_matlab_test_file` でテストを実行
5. 失敗があれば原因を特定→再修正→再実行（パスするまで繰り返す）

エンジニアが手を動かすのは最初の指示を書くだけだ。

---

## 注意点・現在の制限

- **ローカルMATLABが必須**：MATLAB Online（クラウド版）では現状未対応
- **ライセンスは別途必要**：ツールキット自体は無料だが、MATLABライセンス＋Claude Codeサブスクリプションの両方が必要
- **Simulinkモデル操作は対象外**：ブロック線図の編集にはSimulink Agentic Toolkitを別途導入すること
- **長時間シミュレーションはタイムアウトに注意**：重いシミュレーションは`run_matlab_file`でバックグラウンド実行を工夫する必要がある

---

## 今すぐ試せる最初の一歩

手持ちの既存スクリプトで最もバグが多い、またはテストのないファイルを1つ選び、Claude Codeにこう頼んでみよう：

```
「このMATLABファイルのすべての関数に
 MATLAB Test の単体テストを作成して実行してほしい。」
```

10〜15分後、グリーンのテストスイートが手元に残る。
ツールキットのGitHubリポジトリ：[github.com/matlab/matlab-agentic-toolkit](https://github.com/matlab/matlab-agentic-toolkit)
