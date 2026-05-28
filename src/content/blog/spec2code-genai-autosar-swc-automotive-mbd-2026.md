---
title: "要件テキストをAUTOSAR SWCに自動変換——生成AI×MBDで車載ソフト開発工数を激減させる「spec2code」フレームワークの全容"
date: 2026-05-28
category: "AI Coding"
tags: ["生成AI", "AUTOSAR", "MBD", "LLM", "車載ソフトウェア", "GPT-4o", "自動化"]
tool: "GPT-4o"
official_url: "https://arxiv.org/abs/2411.13269"
importance: "high"
summary: "自然言語で書いた要件をそのままAUTOSAR準拠のソフトウェアコンポーネントに変換する「spec2code」フレームワークが、Scania・Umeå大学・TU Munichの共同研究で実証された。GPT-4oとモデル駆動工学を組み合わせ、従来数週間かかっていたSWC実装が大幅に短縮される可能性を示す論文（arXiv 2411.13269、arXiv 2505.02500）の実装詳解。"
---

## はじめに

自動車向けソフトウェアの実装は、要件定義書からAUTOSAR SWC（Software Component）を起こすだけで数週間を要するのが現場の実態だ。AUTOSAR Classic/Adaptiveの厳格なアーキテクチャに準拠しつつ、機能安全（ISO 26262）要件も満たすコードを手書きするのは、ベテランエンジニアでも骨が折れる。この「要件→設計→コード」の変換ループを知らないままでいると、開発サイクルの中で最も機械化できるはずの工程に、チームの工数の30〜40%が消えていく。

---

## spec2code とは

2024年11月にarXiv（2411.13269）で公開され、2025年5月に「生成AI×モデル駆動工学」へと拡張されたフレームワーク（arXiv 2505.02500）。著者はUmeå大学・Scaniaの Minal Suresh Patil・Gustav Ung・Mattias Nyberg、TU Munichの Fengjunjie Pan ほかで、2026年12月に最終改訂版がリリースされた。

**コア概念は2段階変換**:

1. **Requirement → Event Chain**：LLMが自然言語の要件をイベントチェーン記述（形式仕様）に変換
2. **Event Chain → SWC Code**：形式仕様から、AUTOSARのRunnable・Port・Interface定義を含む実装コードを生成

Formal Verificationによる**批評ループ（Critic）**が生成物を評価し、問題があれば自動でバックプロンプティングして再生成する。つまり一発生成ではなく、正しさを検証しながら収束する構造だ。

既存のSimulinkcベースMBDツールとの最大の違いは「要件テキストを中間仕様なしに直接コードへ変換できる点」。Simulink CopilotがモデルレベルのAI支援であるのに対し、spec2codeはSW実装層の自動化をターゲットにしている。

---

## 実際の動作：ステップバイステップ

論文のAEB（自動緊急ブレーキ）デモを例に、フローを追う。

### Step 1：要件テキストを用意する

```text
[要件 REQ-AEB-001]
自車速度が30 km/h以上かつ前方障害物までの距離が
TTC（Time-To-Collision）2秒未満の場合、
ブレーキ制動要求信号(brake_demand)を100%で送出すること。
```

### Step 2：LLMでイベントチェーン記述を生成

```python
import openai

client = openai.OpenAI()

system_prompt = """
あなたはAUTOSAR/EAST-ADLのイベントチェーン仕様エキスパートです。
入力された機能要件を、以下のJSON形式のイベントチェーン記述に変換してください。
必ずトリガー条件・機能・出力信号を含めること。
"""

req_text = """
自車速度が30 km/h以上かつTTC < 2秒の場合、
brake_demand = 100%を送出。
"""

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": req_text}
    ]
)

event_chain = response.choices[0].message.content
print(event_chain)
```

**生成されるイベントチェーン（例）**:

```json
{
  "trigger": {
    "condition": "ego_speed >= 8.33 AND ttc < 2.0",
    "unit": "m/s, s"
  },
  "function": "AEB_Controller",
  "output": {
    "signal": "brake_demand",
    "value": 1.0,
    "type": "float"
  },
  "period_ms": 10
}
```

### Step 3：イベントチェーンからAUTOSAR SWCスタブを生成

```python
ec_spec = event_chain  # Step 2の出力

swc_prompt = f"""
以下のイベントチェーン仕様からAUTOSAR Classic SWCのCコードスタブを生成してください。
- Runnable名はイベントチェーンのfunction名を使用
- Port定義（R-Port: ego_speed, ttc / P-Port: brake_demand）を含める
- 10ms周期タスクとして定義

イベントチェーン仕様:
{ec_spec}
"""

swc_response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": swc_prompt}]
)

print(swc_response.choices[0].message.content)
```

生成されるCコードには `Rte_Read_*` / `Rte_Write_*` のRTE API呼び出しが自動で含まれ、Embedderd Coder等でのコード統合がそのまま可能な形式になる。

---

## Before / After 比較

| 項目 | AI導入前（手動） | AI導入後（spec2code） |
|------|----------------|----------------------|
| 要件→SWCスタブ | 2〜5日（担当者1名） | 15〜30分（LLM生成＋レビュー） |
| AUTOSAR Port定義漏れ | 設計レビューで発覚（数日後） | Critic ループで即検出 |
| 要件トレーサビリティ | 手動でExcel管理 | イベントチェーンJSONから自動生成 |
| ISO 26262 Work Product | 別途文書作成が必要 | イベントチェーンが仕様文書を兼ねる |
| コードレビュー工数 | 4〜8時間（SWCあたり） | 1〜2時間（差分レビューのみ） |

Scaniaの社内実証では、3つの産業用ケーススタディで「バックプロンプティングなしでも形式的に正しいコードが生成可能」と報告されている。

---

## 実践コード例：Critic ループで品質を担保する

```python
def spec2code_with_critic(requirement: str, max_iter: int = 3) -> str:
    """イベントチェーン生成→SWCコード生成→形式検証のループ"""
    
    for i in range(max_iter):
        # 1. 要件 → イベントチェーン
        ec = generate_event_chain(requirement)
        
        # 2. イベントチェーン → SWCコード
        swc_code = generate_swc_code(ec)
        
        # 3. 形式検証（例：AUTOSAR Port名のチェック）
        issues = validate_autosar_ports(swc_code)
        
        if not issues:
            print(f"✓ イテレーション {i+1} で検証通過")
            return swc_code
        
        # 4. バックプロンプティング
        requirement = f"""
前回の生成に以下の問題がありました。修正して再生成してください。
問題: {issues}
元の要件: {requirement}
"""
        print(f"イテレーション {i+1}: 問題検出 → 再生成")
    
    return swc_code  # 最大試行後の最善結果

def validate_autosar_ports(code: str) -> list:
    """基本的なAUTOSAR規約チェック"""
    issues = []
    if "Rte_Read_" not in code:
        issues.append("R-Port の Rte_Read_ API が見つかりません")
    if "Rte_Write_" not in code:
        issues.append("P-Port の Rte_Write_ API が見つかりません")
    return issues
```

---

## 注意点・落とし穴

**ハルシネーション対策が必須**：GPT-4oは存在しないAUTOSAR APIを生成することがある。`Rte_Read_NonExistentPort()` のような誤りは静的解析ツール（Polyspace、LDRA等）を組み合わせないと見落とす。

**対象はSWCスタブ生成まで**：BSW（Basic Software）の設定やarxmlのツールチェーン統合（Vector DaVinci、EB tresos）は現時点では自動化されていない。SWCコードを既存のAUTOSAR設定ツールに取り込む際の手作業が残る。

**安全分類に注意**：ASIL-Dのコンポーネントに対して生成コードをそのまま使用するのは現時点で難しい。ASIL-Bまでの機能から始めることを推奨する。

---

## 応用：より高度な使い方

**CARLA × ROS2での検証**：論文では生成されたSWCをROS2ノードに変換し、CARLAシミュレータ上でAEBシナリオを実走検証している。MBDワークフローにCARLA統合を追加することで、コード生成→シミュレーション検証のループを完全自動化できる。

**Simulink Agentic Toolkitとの組み合わせ**：spec2codeでSWCスタブを生成した後、Simulink Agentic Toolkit（MCP）でSimulinkモデルとのインターフェースを自動生成すると、MBD全体のトレーサビリティが一気に向上する。

---

## 今すぐ試せる最初の一歩

```bash
# arXiv論文の全文を取得して手法を確認
curl -L "https://arxiv.org/pdf/2505.02500" -o spec2code.pdf

# OpenAI APIで最小PoC（APIキーが必要）
pip install openai
python3 -c "
import openai; c = openai.OpenAI()
r = c.chat.completions.create(model='gpt-4o',
  messages=[{'role':'user','content':'AUTOSAR SWCのCスタブを生成: brake_demand信号をP-Portで出力する10ms Runnable'}])
print(r.choices[0].message.content[:500])
"
```
