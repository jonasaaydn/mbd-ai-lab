---
title: "PythonのMATLAB Engine APIとLangChainでAIがSimulinkを自律操作する時代が来た"
date: 2026-05-25
category: "MBD / Simulink"
tags: ["MATLAB Engine API", "LangChain", "Python", "Simulink", "AIエージェント", "自動化"]
tool: "MATLAB Engine API for Python"
official_url: "https://www.mathworks.com/help/matlab/matlab-engine-for-python.html"
importance: "high"
summary: "Python MATLAB Engine APIとLangChainを組み合わせれば、自然言語の指示一つでSimulinkシミュレーションを自律実行するAIエージェントが構築できる。パラメータスイープ30分→5分の自動化を、コピペで動くコードで解説する。"
---

## はじめに

「このゲインをスイープして最適値を探してほしい」と思いながら、毎回手作業でSimulinkのパラメータを変えてシミュレーションを回している——そんな作業に週に何時間費やしているだろうか。MBDエンジニアなら誰でも経験するこの「パラメータ探索地獄」は、Python MATLAB Engine APIとLangChainを組み合わせることで根本から変えられる。AIに「モデルAのKpを0.1から1.0まで0.1刻みでスイープして、オーバーシュートが5%以下になる最小値を見つけて」と指示するだけで、あとはAIが自律的にシミュレーションを回し、結果をレポートしてくれる。MATLAB Copilotが「IDE内の補完」であるとすれば、このアプローチはMATLAB/Simulinkそのものを外部AIが操作する**アウトサイド・イン**の自動化だ。

## Python MATLAB Engine APIとLangChainとは

**MATLAB Engine API for Python**はMathWorksが提供する公式パッケージ（`matlabengine`）で、PythonからMATLABセッションを直接起動・制御できる。MATLAB R2014bから提供されており、`pip install matlabengine`一発でインストール可能（MATLAB本体が別途必要）。Simulinkモデルの実行やワークスペース変数の読み書き、グラフ出力まですべてPythonから操作できる。

**LangChain**はLLMを使ったエージェントワークフローを構築するPythonフレームワーク。OpenAIやAnthropicのAPIと連携し、「ツール（Python関数）」を定義してAIに与えると、AIが状況を判断して適切なツールを選択・実行する自律エージェントが完成する。この2つを組み合わせると、MATLABのコマンドラインをAIが状況判断しながら操作するエージェントが実現する。MATLAB Agentic Toolkitとの違いは、LangChainを使うことでAnthropicやOpenAIを含む任意のLLMと接続でき、RAGや他ツールとの連携も自由に設計できる点にある。

## 実際の動作：ステップバイステップ

### Step 1: 環境構築

```bash
# MATLABエンジンAPIのインストール（MATLAB R2024b以降推奨）
pip install matlabengine langchain langchain-anthropic

# バージョン確認
python3 -c "import matlab.engine; print('MATLAB Engine OK')"
```

### Step 2: MATLABツールの定義

```python
import matlab.engine
import json
from langchain.tools import tool

# グローバルMATLABセッション（起動に20〜30秒かかるため一度だけ起動）
_eng = None

def get_matlab_engine():
    global _eng
    if _eng is None:
        _eng = matlab.engine.start_matlab()
    return _eng

@tool
def run_simulink_simulation(model_name: str, params: str) -> str:
    """
    Simulinkモデルを指定パラメータで実行し結果を返す。
    params: JSON形式の辞書（例: {"Kp": 0.5, "StopTime": 10.0}）
    返り値: 最大値・最終値・最大オーバーシュートのJSON
    """
    eng = get_matlab_engine()
    param_dict = json.loads(params)

    eng.load_system(model_name, nargout=0)

    # パラメータをワークスペースに設定
    for key, value in param_dict.items():
        eng.workspace[key] = value

    # シミュレーション実行
    eng.eval(f"simOut = sim('{model_name}');", nargout=0)

    # 結果取得（モデルのTo Workspaceブロックが"out"に出力すると想定）
    out_vals = eng.eval("simOut.get('out').Data", nargout=1)
    max_val = float(eng.max(matlab.double(list(out_vals))))
    final_val = float(list(out_vals)[-1])
    overshoot_pct = max(0.0, (max_val - final_val) / final_val * 100) if final_val != 0 else 0.0

    return json.dumps({
        "max_value": max_val,
        "final_value": final_val,
        "overshoot_pct": round(overshoot_pct, 2),
        "params": param_dict
    })

@tool
def set_model_param(model_name: str, param_name: str, value: str) -> str:
    """SimulinkモデルのトップレベルパラメータをAPI経由で変更する（例: StopTime, SolverType）"""
    eng = get_matlab_engine()
    eng.set_param(model_name, param_name, value, nargout=0)
    return f"{param_name} を {value} に設定しました"

@tool
def eval_matlab(expression: str) -> str:
    """任意のMATLABコマンドを実行して結果を返す。データ解析や可視化に使う。"""
    eng = get_matlab_engine()
    result = eng.eval(expression, nargout=1)
    return str(result)
```

### Step 3: LangChainエージェントの構築と実行

```python
from langchain_anthropic import ChatAnthropic
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate

llm = ChatAnthropic(model="claude-opus-4-7", temperature=0)

tools = [run_simulink_simulation, set_model_param, eval_matlab]

prompt = ChatPromptTemplate.from_messages([
    ("system",
     "あなたはMBD（モデルベース開発）エンジニアのアシスタントです。"
     "MATLABツールを使ってSimulinkモデルを操作できます。"
     "ユーザーの指示に従って自律的にシミュレーションを実行し、"
     "最適なパラメータを見つけて結果を日本語で報告してください。"),
    ("human", "{input}"),
    ("placeholder", "{agent_scratchpad}"),
])

agent = create_tool_calling_agent(llm, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

# 実行例：自然言語でパラメータスイープを指示
result = executor.invoke({
    "input": (
        "pid_controller_model の Kp を 0.1 から 1.0 まで 0.1 刻みでスイープして、"
        "最大オーバーシュートが 5% 以下になる最小の Kp 値を見つけて。"
        "StopTime は 10 秒で固定。結果を表形式でまとめてください。"
    )
})

print(result["output"])
```

AIは内部でループを組み、10回のシミュレーション呼び出しを自律的に行い、条件を満たした最小 Kp 値と全試行結果のサマリーを返す。人間が行うのは上記の1行の指示だけだ。

## Before / After 比較

| 項目 | AI導入前（手作業） | AI導入後（LangChain + Engine API） |
|------|---------|---------|
| パラメータスイープ（10点） | 手作業 30〜45 分 | AI が自動実行 5〜8 分 |
| 結果整理・レポート | 別途 15 分 | 自動でサマリー出力 |
| エンジニアの関与 | 常時監視が必要 | 指示だけ出して他の作業が可能 |
| 探索できる次元数 | 1〜2 次元が現実的な限界 | 3〜5 次元も自動化可能 |
| 夜間・週末の自動実行 | 不可 | cron ジョブで翌朝に結果を受け取れる |

## 実践コード例：3次元パラメータ探索

以下は PID 制御器の Kp・Ki・Kd を同時探索する指示例。手作業では 1000 回以上のシミュレーションが必要な三次元格子探索を、AIが賢く絞り込みながら実行する。

```python
# 多次元探索の自然言語指示
query = """
pid_controller_model の Kp（0.1〜2.0）、Ki（0.01〜0.5）、Kd（0.0〜0.2）を最適化してください。

目標条件:
1. 立ち上がり時間 < 2 秒（10%→90% の時間）
2. 最大オーバーシュート < 3%
3. 定常偏差 < 1%

まず Kp を固定して Ki と Kd を探索し、次に最良 Ki/Kd を固定して Kp を最適化してください。
最終的に上記条件を満たすパラメータセットを 3 つ提案し、それぞれのトレードオフを説明してください。
"""

result = executor.invoke({"input": query})
print(result["output"])
```

LLM は分割統治戦略を自ら立案し、効率的な探索順序を決定する。

## 注意点・落とし穴

**MATLAB 起動時間**: `matlab.engine.start_matlab()` は初回起動に 20〜40 秒かかる。スクリプト実行ごとに起動するのではなく、セッションをグローバルで保持するか、`matlab.engine.connect_matlab()` で既存の MATLAB セッションに接続する形を推奨する。

**ライセンス**: MATLAB Engine API の使用には MATLAB ライセンスが必要。並列で複数エージェントを走らせる場合は並列サーバーライセンスの追加が必要になる場合がある。

**LLM のトークン消費**: 多数のシミュレーション結果をすべて LLM に渡すとコストが増大する。中間結果はファイルや変数に保存し、サマリーのみを LLM に渡す設計にすることでトークンを節約できる。claude-opus-4-7 使用時は 1 回の探索セッション（20 回のシミュレーション）でおよそ $0.05〜0.15 程度。

**セキュリティ**: `eval_matlab` ツールはシステムコマンドも実行できる。エージェントに渡すツールは必要最小限に絞り、本番環境では `eval_matlab` を無効化してホワイトリスト型のツールのみ提供することを推奨する。

## 応用：より高度な使い方

基本を習得したら、**Simulink Design Optimization Toolbox** との連携が次のステップになる。ベイズ最適化やパレート最適化といった高度なアルゴリズムを LLM エージェントが選択・実行できるようになり、多目的最適化（タイム vs 燃費 vs 排熱など）が自然言語で指示できる。

**GitHub Actions + MATLAB Engine API** を組み合わせることで、プルリクエスト時に自動でシミュレーション検証を行う CI パイプラインも構築可能。コードレビュー前に AI がモデルの挙動変化をチェックするフローは ISO 26262 対応の根拠資料としても活用できる。

## 今すぐ試せる最初の一歩

```bash
# 1. パッケージインストール
pip install matlabengine langchain langchain-anthropic

# 2. MATLAB 起動テスト（Python から）
python3 -c "
import matlab.engine
eng = matlab.engine.start_matlab()
result = eng.sqrt(4.0)
print(f'MATLAB sqrt(4) = {result}')  # 出力: MATLAB sqrt(4) = 2.0
eng.quit()
"
```

`2.0` が返れば環境構築は完了。次のステップは Step 2 のツール定義コードをコピーして、自分のモデルパス（`model_name`）に合わせて書き換え、5分のパラメータスイープを試してみることだ。
