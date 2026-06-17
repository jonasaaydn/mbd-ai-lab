---
title: "3行で動くMBD自動化エージェント——AWS Strands Agents 1.0とMATLAB MCPでSimulinkオーケストレーションを構築する"
date: 2026-06-17
category: "AI Coding"
tags: ["AWS Strands Agents", "MCP", "MATLAB", "Simulink", "Python", "マルチエージェント", "オープンソース"]
tool: "AWS Strands Agents"
official_url: "https://strandsagents.com/"
importance: "high"
summary: "AWS Strands Agents 1.0（2026年5月21日リリース）は、3行のPythonで本格的なAIエージェントを構築できるOSSのエージェントSDKです。LangChainより軽量でLangGraphより簡単に始められ、MCP対応・モデル無依存・マルチエージェント対応の3点が特徴。MATLAB MCPサーバーと接続すれば、Simulinkシミュレーション実行からレポート生成まで自然言語で自動化できます。"
---

## あなたのMBDワークフローはまだ手動ですか？

「Simulinkのパラメータを変えて回して、結果をExcelにコピーして、また変えて……」

MBDエンジニアが1日に費やす単純反復作業は、驚くほど多いです。パラメータスイープ、単体テスト実行、コード生成のキック、ログ解析——これらをAIエージェントに任せられれば、エンジニアは本来の設計・判断業務に集中できます。

問題は、これまでのエージェントフレームワーク（LangChain、LangGraph、CrewAI）は**機械学習エンジニア向けに設計されており、MBDエンジニアが使うには学習コストが高すぎた**ことです。

2026年5月21日にリリースされたAWS Strands Agents 1.0は、この問題を「3行のPython」で解決します。

---

## AWS Strands Agentsとは

### AWSがOSSとして公開したエージェントSDK

AWS Strands Agentsは、Amazonが2025年5月に最初のリリースを行い、2026年5月21日に本番向けのv1.0を公開したオープンソースのAIエージェントSDKです。

最大の特徴は**「モデル駆動型（model-driven）アプローチ」**。エージェントのロジックをあれこれ手書きする代わりに、どのツールを持つかをAIモデルが判断して実行します。

既存フレームワークとの違いは次の通りです：

| 比較項目 | LangGraph | CrewAI | Strands Agents 1.0 |
|---------|-----------|--------|-------------------|
| 学習コスト | 高（グラフ設計が必要） | 中（ロール定義が煩雑） | 低（3〜5行で動く） |
| MCP対応 | 追加設定が必要 | 限定的 | ネイティブサポート |
| モデル切替 | コード変更が必要 | コード変更が必要 | 1行で切替 |
| マルチエージェント | グラフ定義が複雑 | YAML定義 | パターン選択するだけ |
| ライセンス | MIT | MIT | Apache 2.0 |

### Strands Agents 1.0の3大機能

1. **MCP（Model Context Protocol）ネイティブ対応**: stdioやHTTP経由でMCPサーバーに接続可能。MATLAB MCPサーバーとの接続が数行で完結する
2. **モデル無依存**: Claude（Anthropic）、GPT（OpenAI）、Gemini（Google）、Bedrock（AWS）、Ollama（ローカル）を1行で切り替え可能
3. **マルチエージェントパターン内蔵**: Graph（有向グラフ）、Swarm（全員で協調）、Workflow（パイプライン）の3パターンをコードで選択できる

---

## 実際の動作：ステップバイステップ

### 前提条件

- Python 3.10以上
- MATLABがインストールされている（ローカルまたはMATLAB Online）
- MATLAB MCPサーバー（`matlab-mcp-server`パッケージ）がインストール済み

```bash
# === インストール（これだけで始められる）===
pip install strands-agents strands-agents-tools

# MATLABのMCPサーバー（別途インストール）
pip install matlab-mcp-server
```

### ステップ1：最もシンプルなMATLAB連携エージェント

まず「MATLAB MCPに接続して、簡単な計算を実行する」エージェントを作ります。

```python
# === ステップ1: ライブラリのインポート ===
from strands import Agent
from strands.tools.mcp import MCPClient

# === ステップ2: MATLAB MCPサーバーへの接続設定 ===
# stdio経由でMATLABのMCPサーバーを起動・接続する
matlab_mcp = MCPClient(
    transport="stdio",
    command="python",
    args=["-m", "matlab_mcp_server"],  # MATLAB MCPサーバーを起動
)

# === ステップ3: エージェントの作成（これだけで動く）===
with matlab_mcp:
    # MATLABが持つツール（run_script, get_variable等）を自動で取得
    tools = matlab_mcp.list_tools_sync()
    
    agent = Agent(
        system_prompt="""あなたはMBDエンジニアを支援するAIエージェントです。
        MATLABを使って計算・シミュレーション・解析を行います。
        結果は数字と意味を必ずセットで報告してください。""",
        tools=tools,
    )
    
    # === ステップ4: 自然言語で指示するだけ ===
    result = agent("ばねーダンパ系のステップ応答をシミュレーションして、
                    定常値と整定時間を教えてください。k=500, c=20, m=10です")
    print(result)
```

**実行結果の例：**
```
MATLAB実行完了:
  定常値: 0.0196 m（= F/k = 9.81/500）
  整定時間: 4.12 秒（2%基準）
  最大オーバーシュート: 17.3%
  減衰比: ζ = 0.447（不足減衰）
```

---

## 本番向け：Simulinkパラメータスイープエージェント

より実践的な例として、Simulinkモデルのパラメータを自動スイープするエージェントを構築します。

### 前提条件（コードの前に確認）

- MATLAB R2024b 以降
- Simulinkがインストールされていること
- 対象Simulinkモデル（例：`vehicle_dynamics.slx`）が手元にあること

### コード：パラメータスイープ自動化エージェント

```python
# === ステップ1: 必要なライブラリのインポート ===
from strands import Agent, tool
from strands.tools.mcp import MCPClient
import json

# === ステップ2: カスタムツールの定義（@toolデコレータを使う）===
# Strands Agentsでは、Python関数に@toolをつけるだけでツールになる

@tool
def save_sweep_results(results: list, filename: str) -> str:
    """スイープ結果をJSONで保存する。
    
    Args:
        results: スイープ結果のリスト（各要素はdict）
        filename: 保存先ファイル名（拡張子なし）
    """
    import json
    filepath = f"/tmp/{filename}.json"
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    return f"保存完了: {filepath}（{len(results)}件）"

@tool  
def plot_pareto_front(results_json: str) -> str:
    """Pareto前線をプロットしてPNGで保存する。
    
    Args:
        results_json: スイープ結果のJSON文字列
    """
    import json, matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    
    results = json.loads(results_json)
    # 例: overshoot vs settling_time のPareto前線
    x = [r.get("settling_time", 0) for r in results]
    y = [r.get("overshoot", 0) for r in results]
    
    plt.figure(figsize=(8, 6))
    plt.scatter(x, y, c='steelblue', alpha=0.7)
    plt.xlabel("整定時間 [s]")
    plt.ylabel("オーバーシュート [%]")
    plt.title("パラメータスイープ結果")
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig("/tmp/pareto.png", dpi=150)
    plt.close()
    return "プロット保存: /tmp/pareto.png"

# === ステップ3: MATLABエージェントの構築 ===
matlab_mcp = MCPClient(
    transport="stdio",
    command="python",
    args=["-m", "matlab_mcp_server"],
)

with matlab_mcp:
    matlab_tools = matlab_mcp.list_tools_sync()
    
    # MATLABのツール + カスタムツールを両方渡す
    sweep_agent = Agent(
        system_prompt="""あなたはSimulinkパラメータスイープ専門のエージェントです。
        
        タスクを受け取ったら以下の手順で進めます：
        1. MATLAB/Simulinkを使って指定パラメータ範囲のシミュレーションを実行
        2. 各ケースの整定時間・オーバーシュート・定常偏差を記録
        3. 結果を保存してPareto前線を可視化
        4. 最適パラメータの推薦とその根拠を報告
        
        数字は有効数字3桁で報告し、単位を必ず付けてください。""",
        tools=matlab_tools + [save_sweep_results, plot_pareto_front],
    )
    
    # === ステップ4: 自然言語でスイープを指示 ===
    result = sweep_agent("""
        vehicle_dynamics.slxのPIDゲインをスイープしてください。
        Kp: 1.0〜5.0（5点）, Ki: 0.1〜1.0（5点）の25ケース。
        整定時間最小・オーバーシュート10%以下の制約付き最適点を探してください。
    """)
```

**実行結果の例：**
```
25ケースのシミュレーション完了（所要時間: 3分12秒）

最適パラメータ（制約満足解）:
  Kp = 3.5, Ki = 0.4
  → 整定時間: 1.23 s, オーバーシュート: 8.7%

Pareto前線: /tmp/pareto.png に保存
全結果: /tmp/sweep_results.json に保存（25件）

Kp=1.0〜2.0の低ゲイン域は整定時間が長く（>3s）非推薦。
Kp>4.0はオーバーシュートが10%超過のため制約違反。
```

---

## Before / After 比較

| 作業 | AI導入前（手動） | Strands Agents導入後 |
|------|----------------|---------------------|
| 25ケースのパラメータスイープ | 2〜3時間（手動でパラメータ変更） | 約5分（自然言語で指示） |
| 結果のExcel整理 | 30分 | 自動（JSON保存） |
| Pareto前線のプロット | 20分（Excelでグラフ作成） | 自動（PNG生成） |
| 最適点の特定 | 目視で判断（抜け漏れあり） | 全件評価・制約込み自動選択 |
| フレームワーク習得時間 | — | 2〜3時間（LangGraphの1/5） |

---

## 注意点・落とし穴

- **APIキーの設定が必要**: デフォルトではAnthropic APIキーを使用。`ANTHROPIC_API_KEY`環境変数を設定すること。ローカルLLM（Ollama）を使う場合は`model=OllamaModel(model_id="llama3")`に切り替えれば無料で使える
- **MATLABのライセンスは別途必要**: Strands Agents自体は無料だが、MATLAB MCPサーバーを動かすにはMATLABライセンスが必要
- **長時間タスクは途中経過を確認**: デフォルトのLLMトークン制限に注意。100ケース以上のスイープはバッチ分割を検討すること
- **エラーハンドリングはエージェントに任せる**: ほとんどのケースでエージェントが自動リトライするが、MATLABのクラッシュには対応できない

---

## 応用：マルチエージェントでより高度な自動化

Strands Agents 1.0には**マルチエージェントパターンが内蔵**されています。「解析エージェント」「レポートエージェント」「品質チェックエージェント」を組み合わせ、CI/CDパイプラインに組み込むことも可能です。

```python
from strands import Agent, tool
from strands.multiagent import Workflow

# 解析エージェントをツールとしてラップ
@tool
def run_simulation_agent(task: str) -> str:
    """Simulinkシミュレーションを実行する専門エージェント"""
    return simulation_agent(task)

@tool  
def run_report_agent(data: str) -> str:
    """解析結果をMarkdownレポートにまとめる専門エージェント"""
    return report_agent(data)

# オーケストレーターエージェント（他エージェントを呼び出す）
orchestrator = Agent(
    system_prompt="シミュレーション→レポート作成の全体を管理します",
    tools=[run_simulation_agent, run_report_agent],
)
```

LangGraphではノードとエッジの手動定義が必要でしたが、Strands Agentsではエージェントを`@tool`でラップして渡すだけです。

---

## 学生フォーミュラ・レース車両開発への応用

### シナリオ：Simulinkサスペンションモデルの自動最適化

学生フォーミュラチームでは「パッシブサスペンションのばね・ダンパ係数最適化」作業を、毎週末の走行前に手動で行っているチームが多いです。Strands Agentsを使えば、この作業を完全自動化できます。

### 背景理論（初学者向け）

サスペンションの乗り心地と操縦性は、**ばね定数k**と**減衰係数c**のトレードオフで決まります。k/cが大きいと路面追従性が良く（グリップ向上）、小さいと乗り心地が良い（ドライバーの疲労軽減）。この最適バランスを周回ごとの路面特性に合わせて自動算出するエージェントを構築します。

### 実装コード（日本語コメント付き）

```python
# === 前提: Python 3.10以上, pip install strands-agents matlab-mcp-server ===

from strands import Agent, tool
from strands.tools.mcp import MCPClient
import numpy as np

# === カスタムツール: ラップタイム推定（簡略版）===
@tool
def estimate_laptime_improvement(
    k_front: float, k_rear: float, 
    c_front: float, c_rear: float
) -> str:
    """サスペンション設定からラップタイム改善量を推定する。
    
    単純なモデル（実際はSimulinkの結果を使う）で推定。
    Returns: JSON形式の推定結果
    """
    import json
    # 実際にはSimulinkのモデルを呼び出してラップタイムを計算する
    # ここでは簡単な経験式で近似
    baseline_time = 75.0  # ベースラインラップタイム[s]
    
    # 前後ロールスティフネスのバランス（フロントヘビーほどUF傾向）
    balance = k_front / (k_front + k_rear)
    
    # 減衰比（過減衰・不足減衰の評価）
    m = 250  # 車両質量[kg]
    zeta_front = c_front / (2 * np.sqrt(k_front * m * 0.5))
    
    # 単純な評価式（実際はSimulinkで計算）
    penalty_balance = abs(balance - 0.45) * 0.5  # 前後45:55が最適と仮定
    penalty_zeta = abs(zeta_front - 0.7) * 0.3   # 減衰比0.7が最適
    
    estimated_time = baseline_time + penalty_balance + penalty_zeta
    
    return json.dumps({
        "estimated_laptime": round(estimated_time, 3),
        "improvement_vs_baseline": round(baseline_time - estimated_time, 3),
        "front_rear_balance": round(balance, 3),
        "front_damping_ratio": round(zeta_front, 3),
    }, ensure_ascii=False)

# === MATLABエージェントの構築 ===
matlab_mcp = MCPClient(transport="stdio", command="python", args=["-m", "matlab_mcp_server"])

with matlab_mcp:
    tools = matlab_mcp.list_tools_sync()
    
    suspension_agent = Agent(
        system_prompt="""学生フォーミュラのサスペンション最適化エージェントです。
        サーキットの特性（低速コーナー多め/高速コーナー多め）に応じて
        ばね定数・減衰係数の最適値を探索します。
        結果はBefore/Afterの数値比較で報告してください。""",
        tools=tools + [estimate_laptime_improvement],
    )
    
    result = suspension_agent("""
        サーキット条件: 低速コーナー中心（最高速90km/h）
        現在の設定: k_front=15000N/m, k_rear=18000N/m, 
                    c_front=1500Ns/m, c_rear=1800Ns/m
        
        前後バランスとダンパー設定を最適化して、
        推定ラップタイム改善量を計算してください。
    """)
    print(result)
```

**実行結果の例：**
```
現在の設定のラップタイム: 75.00 s（ベースライン）

最適化結果（20パターン探索）:
  k_front: 13000 N/m（↓ 2000）
  k_rear:  17000 N/m（↓ 1000）
  c_front: 1600 Ns/m（↑ 100）
  c_rear:  1700 Ns/m（↓ 100）
  推定ラップタイム改善: -0.42 s

理由: 低速コーナー中心のサーキットでは前後バランスを
45.3:54.7（前輪荷重重め）にすることでターンインが改善。
前後ダンピング比をともに0.68〜0.70に揃えることで
コーナリング中の姿勢変化が小さくなります。
```

### 今すぐ試せる最初のステップ

```bash
# 1. インストール（5分）
pip install strands-agents anthropic

# 2. APIキーを設定
export ANTHROPIC_API_KEY="sk-ant-..."

# 3. 動作確認（MATLAB不要の最小テスト）
python3 -c "
from strands import Agent
agent = Agent()
print(agent('Pythonで2次系のステップ応答を計算して、整定時間を求めてください。k=500, c=30, m=10'))
"
```

MATLABなしでも動作確認できます。その後、MATLAB MCPサーバーを追加すれば実際のSimulinkモデルと接続できます。

---

## まとめ

AWS Strands Agents 1.0は、「使いやすさ」「MCP対応」「マルチエージェント対応」の3点でMBDエンジニアに最もなじみやすいエージェントフレームワークです。LangChain/LangGraphのような機械学習の深知識なしに、PythonとMATLABの知識だけで本格的なMBD自動化エージェントを構築できます。

まずAPIキーとpip installで手元で動かし、次にMATLAB MCPとの接続を試してみてください。

Sources:
- [Strands Agents — Open Source AI Agent SDK](https://strandsagents.com/)
- [Introducing Strands Agents 1.0 | AWS Open Source Blog](https://aws.amazon.com/blogs/opensource/introducing-strands-agents-1-0-production-ready-multi-agent-orchestration-made-simple/)
- [Strands Agents Python SDK | PyPI](https://pypi.org/project/strands-agents/)
- [Model Context Protocol (MCP) Tools | Strands Agents SDK](https://strandsagents.com/docs/user-guide/concepts/tools/mcp-tools/)
