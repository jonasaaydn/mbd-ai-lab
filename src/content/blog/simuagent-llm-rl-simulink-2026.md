---
title: "7BモデルがGPT-4oを超える——SimuAgent、強化学習でSimulink自動化の壁を突破"
date: 2026-05-21
category: "MBD / Simulink"
tags: ["Simulink", "LLM", "強化学習", "SimuBench", "MBD", "自動化", "オープンソース"]
importance: "high"
summary: "2026年1月発表のSimuAgent（arXiv:2601.05187）は、強化学習（ReGRPO）で鍛えたQwen2.5-7BモデルをSimulinkモデリングに適用し、GPT-4oを超える成功率51.89%を達成。5300タスクのSimuBenchも同時公開された。"
---

## 「Simulinkをそのまま食わせても壊れたモデルしか出てこない」問題

LLMでSimulinkモデルを自動生成しようと試みたMBDエンジニアは、ほぼ全員がこの壁に当たる。

ChatGPTやGPT-4oにSimulinkのXMLを貼り付けてモデル構造を変えるよう依頼しても、返ってくるのは動かないXMLか、そもそも意味をなさないブロック構成だ。原因は明快——SimulinkのXMLは冗長で1ブロックあたり数百トークンを消費し、接続関係が人間にも機械にも読みにくい。標準的なコーパスにSimulink固有データはほぼ存在せず、LLMはSimulinkを「知らない」まま動いている。

2026年1月、RPIのCSMLラボとは独立して、Liang Zhaoらがこの問題を根本から解き直した論文をarXivに投稿した。

それが **SimuAgent**（arXiv:2601.05187）だ。

---

## SimuAgentの革新：XML廃止とPython辞書形式への置き換え

SimuAgentは、LLMが扱う内部表現をSimulinkのXMLからPython辞書形式に全面刷新した。

変換前（XML・抜粋）:
```xml
<Block BlockType="Gain" Name="Gain1" SID="42">
  <P Name="Position">[295, 155, 325, 185]</P>
  <P Name="Gain">Kp</P>
</Block>
<Line>
  <P Name="Src">40#out:1</P>
  <P Name="Dst">42#in:1</P>
</Line>
```

変換後（Python辞書）:
```python
{
  "Gain1": {"type": "Gain", "gain": "Kp", "in": ["PID_error"], "out": ["plant_input"]}
}
```

この変換だけで**トークン数が約70〜80%削減**される。LLMにとって「信号の流れ」が自然言語に近い構造で読めるようになり、生成・編集の精度が飛躍的に向上する。

---

## ReGRPO：疎な報酬をRL で攻略する新手法

SimuAgentのもう一つの核心が **Reflection-GRPO（ReGRPO）** だ。

Simulinkモデルの自動生成は「長期タスク」だ。ブロックを50個配置して配線まで終えなければシミュレーションが走らず、成否の判定（報酬）が得られない。これは強化学習（RL）で言う「疎な報酬」問題で、通常のRL手法では収束が遅い。

ReGRPOはGRPO（Group Relative Policy Optimization）に自己振り返りトレースを組み込む。各ステップでモデルに「なぜこの行動をとったか」を明示させ、そのトレースを中間報酬として利用する。これにより：

- 収束速度が従来RL比で大幅改善
- 誤った接続をした場合でも「なぜ間違いか」を自己修正できる
- 7Bという小規模モデルでも高精度を達成可能

---

## ベンチマーク結果：7BがGPT-4oを超えた数字

SimuBenchは制御・機械・電気・流体・熱・電磁気の6ドメインにわたる5300タスクで構成される、初のSimulink専用LLMベンチマークだ。

| モデル / 手法 | 成功率（全体） |
|---|---|
| GPT-4o（few-shot） | 約43〜46% |
| Qwen2.5-7B（SFT） | 約38% |
| Qwen2.5-7B + SimuAgent Stage1（ツールスキルのみ） | 約47% |
| **Qwen2.5-7B + SimuAgent フル（Stage1+2+ReGRPO）** | **51.89%** |

重要なのは、**GPT-4oより小さく、ローカルで動く7BモデルがGPT-4oを超えている**点だ。クラウドAPIへのデータ送信に制約のある車両開発環境でも、オンプレミスで高精度なSimulink自動化が現実になりつつある。

---

## 注意点：現状でできないこと

- **Simscapeへの非対応**: 物理モデリングライブラリは対象外
- **コード生成（Embedded Coder）への非対応**: 量産向けコード自動生成まではまだ遠い
- **成功率51%はまだ実用水準ではない**: 複雑な実機制御系では追加検証が必須
- **GitHubリポジトリ未公開（2026年5月時点）**: 再現実験にはarXivの実装詳細から自力実装が必要
- **SimuBenchの入手**: ベンチマークデータセット自体も現時点では公開待ち

---

## 今すぐ試せる最初の一歩

SimuAgent本体を即日試す環境はまだないが、**Python辞書表現のアイデアは今日から使える**。

```python
# SimuAgent流のSimulink記述をLLMプロンプトに使う
prompt = """
以下のSimulinkモデル（Python辞書表現）のPIDゲインを
ルーカスの安定判別でチューニングし、変更後の辞書を返してください。

{
  "PID": {"type": "PIDController", "P": 1.0, "I": 0.5, "D": 0.1,
          "in": ["error"], "out": ["control_input"]},
  "Plant": {"type": "TransferFcn", "num": [1], "den": [1, 2, 1],
             "in": ["control_input"], "out": ["plant_output"]},
  "Error": {"type": "Sum", "inputs": ["+", "-"],
            "in": ["reference", "plant_output"], "out": ["error"]}
}
"""
```

GPT-4oやClaudeに渡すと、XML形式と比べて明らかに構造を理解した回答が得られる。完全な自動化が来る前に、**今の手持ちLLMをSimulink対話に使いやすくする工夫として**今すぐ実践できる。

論文全文: https://arxiv.org/abs/2601.05187  
SimuBench詳細: https://openreview.net/forum?id=mMB3Y1ERqi

---

*本記事はarXiv:2601.05187「SimuAgent: An LLM-Based Simulink Modeling Assistant Enhanced with Reinforcement Learning」（Liang Zhao et al., 2026年1月）をもとに構成。*
