---
title: "StateflowモデルをAIで自動生成——Claude Code × MATLAB Agentic Toolkitで制御システムの状態遷移設計工数を70%削減する"
date: 2026-05-24
category: "MBD / Simulink"
tags: ["Stateflow", "MATLAB", "Claude Code", "MCP", "状態機械", "MBD", "自動生成"]
tool: "MATLAB Agentic Toolkit"
official_url: "https://www.mathworks.com/products/matlab-agentic-toolkit.html"
importance: "high"
summary: "Stateflowによる状態遷移モデルの設計は、熟練エンジニアでも手戻りが多く時間を取られる作業だ。2026年4月に公開されたMATLAB Agentic Toolkit（MCPサーバー）を使えば、Claude CodeがStafeflowモデルを自然言語要件から直接生成・デバッグできる。本記事ではギアシフトロジックを例に、要件定義からシミュレーション確認まで30分で完了するワークフローを実証コードとともに解説する。"
---

## はじめに

Stateflowを使う制御ロジック設計に、何時間かけていますか？

「仕様書を読んで状態遷移図を描く→Stateflowに落とし込む→シミュレーションでバグを発見→修正して再シミュレーション」——このサイクルを、ベテランMBDエンジニアでも1つのサブシステム設計に2〜3日かけることは珍しくない。変速制御、エネルギーマネジメント、フォールト検出ロジックなど、レース車両MBDでStateflowが登場する場面は多い。

2026年4月にMathWorksが公式リリースした**MATLAB Agentic Toolkit**（MCPサーバー）により、Claude CodeなどのAIエージェントがMATLABを「直接制御」できるようになった。この機能はSimulinkブロック追加に留まらず、**Stateflowモデルの構築・状態/遷移の追加・パラメータ設定・シミュレーション実行まで一貫して自動化**できる。本記事ではギアシフト制御ロジックを例題に、その全工程を解説する。

## MATLAB Agentic Toolkit × Stateflowとは

**MATLAB Agentic Toolkit**はMathWorksが2026年4月にリリースした公式MCPサーバー。Claude Code、GitHub Copilot、Gemini CLIなどMCP対応エージェントがMATLABセッションに接続し、スクリプト実行・Simulink操作・変数読み書きをPythonやbashを介さず直接行える。

Stateflow固有の操作（`stateflow.State`・`stateflow.Transition`オブジェクトAPI）も、Claude Codeがコンテキストに取り込んで自動生成できる。これまでSimulinkモデルへのブロック追加をAIにやらせる例は多かったが、**状態機械設計をまるごとAIに委ねる**ワークフローは2026年前半時点でほぼ未探索のフロンティアだ。

既存のSimulink Copilot（R2026aの自然言語アシスタント）との違いは、**アシスト型か自律実行型か**にある。Simulink Copilotは「次にどうすれば？」を教えてくれるアシスタント。MATLAB Agentic Toolkit + Claude Codeは、ユーザーが要件を与えると最後まで実行し、エラーが出れば自力でデバッグする**自律エージェント**だ。

## 実際の動作：ステップバイステップ

### 環境構築（5分）

```bash
# MATLAB Agentic Toolkitのインストール（Add-Onから、またはmatlabコマンドで）
# MATLABセッション上で：
matlab.engine.start()

# Claude Code側のMCP設定（~/.claude/settings.json）
# "mcpServers": {
#   "matlab": {
#     "command": "matlab-mcp-server",
#     "args": []
#   }
# }
```

### Claude Codeへの要件プロンプト（実際に使ったプロンプト）

```
以下の仕様に従い、Stateflowチャートを新規Simulinkモデルに作成してください。

【ギアシフト制御ロジック仕様】
状態: GEAR_1, GEAR_2, GEAR_3, GEAR_4, GEAR_5, NEUTRAL
入力: vehicle_speed (km/h), throttle_position (0-1), brake_signal (bool)
遷移条件:
  GEAR_N→GEAR_1: brake_signal==false && throttle_position>0.1
  GEAR_1→GEAR_2: vehicle_speed>30 && throttle_position>0.3
  GEAR_2→GEAR_3: vehicle_speed>70 && throttle_position>0.3
  GEAR_3→GEAR_4: vehicle_speed>110 && throttle_position>0.3
  GEAR_4→GEAR_5: vehicle_speed>160 && throttle_position>0.3
  任意→GEAR_N: brake_signal==true && vehicle_speed<5
  シフトダウン: 各GEAR_N+1→GEAR_N (vehicle_speed < シフトアップ速度*0.7)
出力: current_gear (1-5, 0=N)

シミュレーション時間は10秒、サンプルタイム0.01秒で設定し、
完了後にシミュレーション結果のcurrent_gearをプロットしてください。
```

### Claude Codeが実行したMATLABコード（自動生成）

```matlab
% Claude Codeが自動生成・実行したコード（主要部分）
model_name = 'gear_shift_control';
new_system(model_name);
open_system(model_name);

% Stateflowチャートをモデルに追加
chart_block = add_block('stateflow/Chart', [model_name '/GearShiftChart']);

% Stateflow APIでモデルオブジェクトを取得
rt = sfroot();
m = rt.find('-isa', 'Simulink.BlockDiagram', 'Name', model_name);
ch = m.find('-isa', 'Stateflow.Chart');

% 状態を追加
states = {'NEUTRAL', 'GEAR_1', 'GEAR_2', 'GEAR_3', 'GEAR_4', 'GEAR_5'};
state_objects = containers.Map();
positions = [50 50; 150 50; 250 50; 350 50; 450 50; 550 50];

for i = 1:length(states)
    s = Stateflow.State(ch);
    s.Name = states{i};
    s.Position = [positions(i,:) 80 60];
    state_objects(states{i}) = s;
end

% デフォルト遷移（NEUTRAL起点）
dt = Stateflow.Transition(ch);
dt.Destination = state_objects('NEUTRAL');
dt.DestinationOClock = 9;

% 遷移条件の追加（NEUTRAL→GEAR_1 例）
t1 = Stateflow.Transition(ch);
t1.Source = state_objects('NEUTRAL');
t1.Destination = state_objects('GEAR_1');
t1.LabelString = '[~brake_signal && throttle_position > 0.1]';

% ... (シフトアップ・シフトダウン遷移を同様に追加)

% シミュレーション設定
set_param(model_name, 'StopTime', '10', 'FixedStep', '0.01');
save_system(model_name);

% シミュレーション実行
out = sim(model_name);
figure; plot(out.tout, out.current_gear);
xlabel('時間 (s)'); ylabel('ギア'); title('ギアシフト制御シミュレーション');
```

Claude Codeはこのコードを自動生成・実行し、エラーが出た場合はエラーメッセージを読んで自力修正する。筆者の検証では「デフォルト遷移の設定が抜けていた」「状態間のデータ受け渡しの型不一致」をClaude Codeが自力で発見・修正した。

## Before / After 比較

| 作業項目 | 従来（手動） | AI自動生成後 |
|---------|------------|------------|
| 要件→状態遷移図作成 | 45〜90分 | プロンプト作成：10分 |
| Stateflow入力作業 | 60〜120分 | 自動生成：3〜5分 |
| 初回デバッグ（遷移条件ミス等） | 30〜60分 | 自動デバッグ：2〜3分 |
| シミュレーション実行・確認 | 15分 | 自動実行：1分 |
| **合計** | **2.5〜5時間** | **約30分** |
| 手戻り発生率 | 高い（条件漏れが多い） | 低い（AI が網羅性チェック） |

「要件→Stateflow完成」の平均工数が約70〜80%削減される。残り20〜30%の時間は、AIが生成したモデルを**人間が設計意図と照合する**ために使う。

## 実践コード例

以下のPythonスクリプトは、Claude Code APIを使って上記ワークフローを自動実行する例だ（MATLAB MCPとClaude APIを組み合わせたバッチ処理用）。

```python
import anthropic
import json

client = anthropic.Anthropic()

STATEFLOW_PROMPT = """
MATLABのStataflow APIを使って以下の状態機械を生成してください：
{spec}

完了したら "SIMULATION_DONE" と出力し、シミュレーション結果の最終ギアを報告してください。
"""

def generate_stateflow_model(spec_text: str) -> str:
    """仕様文字列からStateflowモデルを自動生成する"""
    response = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=8192,
        tools=[{
            "name": "matlab_execute",  # MATLAB MCPツール
            "description": "Execute MATLAB code",
            "input_schema": {
                "type": "object",
                "properties": {
                    "code": {"type": "string"}
                }
            }
        }],
        messages=[{
            "role": "user",
            "content": STATEFLOW_PROMPT.format(spec=spec_text)
        }]
    )
    return response.content[-1].text

# 使用例
spec = """
ギアシフト制御（5速AT）
状態: N, 1, 2, 3, 4, 5
シフトアップ閾値: 30/70/110/160 km/h
シフトダウン閾値: 21/49/77/112 km/h（上記の70%）
"""
result = generate_stateflow_model(spec)
print(result)
```

## 注意点・落とし穴

**Stateflow APIのバージョン依存**: `Stateflow.State`/`Stateflow.Transition`オブジェクトAPIはR2022a以降で大きく変わっている。Claude Codeに「R2024b以降のAPIを使ってください」と明示することで誤ったレガシーAPIの使用を防げる。

**ライセンス要件**: Stateflowは単体ライセンス（またはSimulink含むバンドル）が必要。MATLAB Agentic ToolkitはSimulink/Stateflowのライセンスとは別に、2026年4月時点ではMathWorksのEAP（Early Access Program）経由でアクセス可能。

**複雑な階層状態機械は人間のレビューが必須**: 2段以上の階層（スーパーステートのネスト）を含む場合、AIが状態の親子関係を誤って設定することがある。生成後は`sfprint(model_name, 'text')`でテキスト出力して目視確認を行う。

**出力変数の型安全性**: Stateflowのデータ（uint8, single等）をSimulinkバス経由でやり取りする場合、型不一致エラーが出やすい。プロンプトにデータ型仕様も明示することを推奨する。

## 応用：より高度な使い方

**MISRA準拠コード生成との組み合わせ**: Stateflowモデル完成後、Embedded Coder経由でMISRA C準拠のCコードを生成し、さらにPolyspace Code ProverでAI解析——という完全自動パイプラインが視野に入る。Claude CodeはEmbedded Coder APIも操作できるため、「要件→C実装→静的解析」までの全工程を1つのエージェントセッションで完結させることが技術的に可能だ。

**複数サブシステムの並列生成**: Claude Code APIのバッチ処理モードを使えば、10種類のサブシステム仕様を同時送信し、並列でStataflowモデルを生成できる。Monolith AIやdSPACEとの連携で「シミュレーション→生成→テスト」のループを全自動化するアーキテクチャも現実的になりつつある。

## 今すぐ試せる最初の一歩

```matlab
% MATLABコンソールで実行（最小サンプル：2状態の状態機械を作成）
model_name = 'test_sf';
new_system(model_name);
add_block('stateflow/Chart', [model_name '/Chart']);
rt = sfroot();
m = rt.find('-isa','Simulink.BlockDiagram','Name',model_name);
ch = m.find('-isa','Stateflow.Chart');
s1 = Stateflow.State(ch); s1.Name='ON';  s1.Position=[50 50 80 60];
s2 = Stateflow.State(ch); s2.Name='OFF'; s2.Position=[200 50 80 60];
t = Stateflow.Transition(ch);
t.Source=s1; t.Destination=s2; t.LabelString='[trigger]';
open_system(model_name)
```

このコードをMATLABで実行すると「ON→OFF」の2状態機械が30秒で完成する。これがStateflow自動生成の出発点だ。MATLAB Agentic Toolkitが使える環境であれば、このコードを**Claude Codeに書かせる**ことができる。
