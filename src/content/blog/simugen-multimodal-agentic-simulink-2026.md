---
title: "SimuGen：マルチモーダルAIエージェントでSimulinkモデルを94.5%の精度で自動生成する方法"
date: 2026-05-26
category: "MBD / Simulink"
tags: ["SimuGen", "Simulink", "LLM", "マルチエージェント", "モデル自動生成"]
tool: "SimuGen"
official_url: "https://arxiv.org/abs/2506.15695"
importance: "high"
summary: "NeurIPS 2025採択のSimuGenは、ブロック線図の画像とテキスト仕様を入力するだけで94.5%の精度でSimulinkコードを自動生成するマルチエージェントフレームワーク。手動モデリングの数時間を数分に短縮できる可能性があり、MBD開発の生産性革命を起こしつつある。"
---

## はじめに

あなたはこんな経験がないだろうか。紙やPDFに書かれた制御ブロック線図を見ながら、Simulinkでゼロから同じモデルを組み直す——この作業に何時間も費やした経験が。ブロックの配置、信号線の接続、パラメータ設定、サブシステムの階層化……一つひとつは単純でも、全体を組み上げると半日かかることも珍しくない。しかも接続漏れやパラメータミスはバグの温床になる。

このボトルネックを根本から解決するのが、2025年にarXivで発表されNeurIPS 2025に採択された**SimuGen**だ。「このツールを知らないまま手動モデリングを続けると、週に数時間を永遠に失い続ける」——そう感じさせる技術が静かに登場している。

## SimuGenとは

SimuGenは、中国科学技術大学などの研究チームが開発したマルチモーダル・マルチエージェントフレームワーク（arXiv:2506.15695）だ。**既存のSimulinkブロック線図の画像**と**テキストによる仕様記述**を入力として受け取り、実行可能なMATLAB/Simulinkコードを自動生成する。

従来のLLMベースのアプローチ（ChatGPTやCopilotに直接聞く方法）が苦手としてきた問題は3つある。(1) Simulink特有のデータ不足による事前学習の弱さ、(2) グラフィカルモデルが守るべき厳密な構造制約、(3) 大規模モデルのコンテキスト超過だ。SimuGenはこれらをマルチエージェントの分業体制と専用ドメインデータベースで克服している。

単一のLLMにすべてを任せるのではなく、「各エージェントが専門タスクに集中する」設計が精度の鍵だ。

## 実際の動作：ステップバイステップ

SimuGenのパイプラインは6つの専門エージェントで構成される。

```
入力: Simulinkモデル画像 + テキスト仕様
         ↓
[1] Investigator（調査エージェント）
    - 画像を解析し、使用ブロック・信号経路を特定
    - 専用ドメインデータベースから関連ブロック情報を取得
         ↓
[2] Code Generator（コード生成エージェント）
    - MATLAB APIを使用してモデルを構築するコードを生成
         ↓
[3] Unit Test Reviewer（テストエージェント）
    - 生成コードの単体テストを自動作成・実行
         ↓
[4] Executor（実行エージェント）
    - MATLAB環境でコードを実際に実行
         ↓
[5] Debug Locator（デバッグエージェント）
    - エラー発生時に根本原因を特定してフィードバック
         ↓
[6] Report Writer（レポートエージェント）
    - 生成モデルの検証レポートを自動生成
         ↓
出力: 実行可能なSimulinkモデル（.slx）
```

既存モデルのスクリーンショット1枚と「PIコントローラをフィードバック制御に追加する」などのテキストを渡せば、システムが自律的にコードを生成・テスト・修正する。エラーが出ても自己修復するため、ユーザーはデバッグ作業から解放される。

## Before / After 比較

| 項目 | AI導入前（手動） | SimuGen導入後 |
|------|----------------|---------------|
| 既存モデルの再現時間 | 2〜4時間 | 5〜15分 |
| ブロック接続ミス率 | 5〜15%（経験差あり） | 平均5.5%（精度94.5%） |
| 新人エンジニアの習熟コスト | 数週間のOJT必要 | 仕様書と画像があれば即日着手可 |
| ドキュメント→モデル変換 | 全手動 | 画像＋テキストで自動化 |

特筆すべきは「多様なシミュレーションタスク全体での平均94.5%の再現精度」という数字だ。標準ライブラリのブロックで構成されたモデルでは100%近く達成している事例もある。

## 実践コード例

SimuGenのGitHubリポジトリ（renxinxing123/SimuGen_beta）からクローンして試す最小ステップ：

```python
# pip install -r requirements.txt 後に実行
from simugen import SimuGenAgent

agent = SimuGenAgent(
    llm_model="gpt-4o",       # または claude-3-7-sonnet-20250219
    matlab_engine=True         # MATLAB Engine API for Python が必要
)

# モデル画像とテキスト仕様を渡して自動生成
result = agent.generate(
    image_path="./examples/pid_controller.png",
    spec_text="PIDコントローラを使った速度制御系。目標値との偏差をPID演算し、プラントモデルに入力する。"
)

# 生成されたMATLABコードを確認
print(result.matlab_code)

# MATLABで実行して .slx ファイルを出力
result.execute_in_matlab(output_path="./output/generated_model.slx")
```

必要なのはPython 3.10以上とMATLAB Engine API for Python（R2021b以降）、そしてOpenAI/Anthropicいずれかのモデルアクセスだ。初回のdemo.py実行は5〜10分程度で完了する。

## 注意点・落とし穴

**MATLAB Engineが必須**：SimuGenはバックエンドでMATLABを直接呼び出す。MATLABのライセンスと`matlab.engine`パッケージがなければ動かない。MATLAB Onlineでの動作は現時点で未サポートだ。

**カスタムブロック・Stateflowは精度低下**：標準ライブラリ外のカスタムブロックや複雑なStateflowチャートは再現精度が落ちる。R2026a以降の新機能ブロックも学習データに含まれていない可能性がある。

**LLM APIコストに注意**：1モデル生成あたり複数回のLLM呼び出しが発生する。GPT-4oを使用すると、複雑なモデルでは$0.5〜$2程度かかることがある。コスト管理のためgpt-4o-miniやClaude Haiku系への切り替えも検討すること。

**画像解像度が精度を左右する**：スクリーンショットが低解像度・部分的に切れている場合、Investigatorが誤認識することがある。1920×1080以上の解像度でキャプチャするのが安全だ。

## 応用：より高度な使い方

基本的な再現精度を確認したら、次のステップとして**要件駆動モデル生成**が見えてくる。SysML形式やDOORS形式の要件仕様をテキストとして流し込み、対応するSimulinkサブシステムを段階的に生成するパイプラインだ。

SimuGenと**MATLAB Agentic Toolkit**を組み合わせると、「要件書を入力 → Simulinkモデルを生成 → 単体テストを実行 → レポートを出力」という完全自動MBDパイプラインが実現できる。dSPACEのSIL環境と連携させれば、コード生成から検証まで人手なしで完結する可能性もある。

## 今すぐ試せる最初の一歩

```bash
git clone https://github.com/renxinxing123/SimuGen_beta.git
cd SimuGen_beta
pip install -r requirements.txt
python demo.py --image examples/simple_pid.png --spec "速度PID制御系"
```

まず論文（arxiv.org/abs/2506.15695）を読んでアーキテクチャを把握し、自チームが抱える「手動モデリングのボトルネック」に当てはめて考えるのが最初のステップだ。論文は無料公開されており、読了に30分もかからない。
