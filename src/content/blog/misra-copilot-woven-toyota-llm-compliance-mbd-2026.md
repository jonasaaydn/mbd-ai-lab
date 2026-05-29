---
title: "MISRA違反の81%をAIが自動修正——Woven by Toyota発「MISRA Copilot」がMBD品質工数を激変させる理由"
date: 2026-05-29
category: "AI Coding"
tags: ["MISRA", "Azure OpenAI", "RAG", "マルチエージェント", "Embedded Coder", "ISO 26262", "Woven by Toyota"]
tool: "MISRA Copilot (Azure OpenAI)"
official_url: "https://www.microsoft.com/en/customers/story/24108-woven-by-toyota-inc-azure-openai"
importance: "high"
summary: "Woven by Toyotaがマイクロソフトと共同開発した「MISRA Copilot」は、RAGと3エージェント構成でMISRA C違反を81.5%自動修正し、1つのADAS認識モジュール内の6万件の違反を数ヶ月分の工数から数日に短縮した。MISRA C:2025対応の新ルールと合わせ、Embedded CoderユーザーがPolyspaceの指摘を高速にクリアする新ワークフローを解説する。"
---

## はじめに

Simulink + Embedded CoderでECU向けC/C++コードを自動生成した後、必ずPolyspaceが吐き出すのがMISRA違反の大量リストだ——経験のあるMBDエンジニアなら誰もが直面する「コードレビュー地獄」である。ISO 26262適合プロジェクトでは、このMISRA対応だけで数週間〜数ヶ月の工数が溶ける。この問題に正面から取り組んだのが、Woven by ToyotaとMicrosoftが共同開発した「MISRA Copilot」だ。2025年1月に社内展開されたこのツールは、MISRA C違反の**81.5%を自動修正**し、従来の人海戦術を根本から置き換えることを実証した。このツールを知らないまま来年の認証プロジェクトに入ると、数百時間分の工数を無駄にする可能性がある。

---

## MISRA Copilotとは

MISRA Copilotは、Woven by ToyotaがMicrosoft Azure OpenAIと組んで開発した車載組込みソフトウェア向けAI違反修正ツールだ。2024年6月にプロジェクトが開始され、2025年1月にトヨタグループ内で展示・展開された。

従来のMISRA対応ツール（Polyspace、PC-lintなど）が「違反の検出」に留まるのに対し、MISRA Copilotは**違反コードを自動修正してGitHub PRを生成**する点が根本的に異なる。GitHub Enterprise、VS Code拡張、CI/CDパイプラインと統合されており、MBDエンジニアが普段使う開発環境の中でそのまま動作する。

なお、MISRA C:2025（最新版）では4つの新ルールが追加されている：

| ルール | 内容 |
|--------|------|
| 8.18 | ヘッダファイル内の仮定義を禁止 |
| 8.19 | ソースファイル内の外部宣言を禁止 |
| 11.11 | NULLへの暗黙ポインタ比較を禁止 |
| 19.3 | 非アクティブなunionメンバの読み取りを禁止 |

手動対応の負担はますます増しており、自動化の価値は年々高まっている。

---

## 実際の動作：3エージェント自動修正ワークフロー

MISRA Copilotの中核は、**Coder・Reviewer・Evaluatorの3エージェント構成**だ。AutoGenフレームワーク上でAzure OpenAI（モデルはo3-mini）が動作する。

```
[Polyspace出力] → 違反リスト（CSV）
       ↓
[Coder Agent] — o3-mini
  - 違反ルールを解釈
  - RAG DBから過去の修正パターンを検索
  - 修正コードを生成
       ↓
[Reviewer Agent] — o3-mini
  - 修正内容を検証
  - 不適切な場合は Coder Agent にフィードバック（反復ループ）
       ↓
[Evaluator Agent] — o3-mini
  - 修正を総合評価して確信度スコアを算出
  - 将来の保守コメント・改善根拠を自動付加
       ↓
[GitHub PR] 自動生成 → エンジニアがレビュー・マージ
```

RAGのナレッジベースは、Woven by ToyotaとToyotaが長年蓄積したMISRA対応ノウハウをデータベース化したものだ。「なぜそのルールに違反するのか」「どう直すべきか」という人間の判断パターンをAIが参照しながら修正を行う。開発モデルはGPT-4o（PoC, 修正率50%）→ o1（80%）→ o3-mini（81.5%, 量産版）と段階的に強化された。

---

## Before / After 比較

| 項目 | AI導入前（従来手法） | AI導入後（MISRA Copilot） |
|------|---------------------|--------------------------|
| 担当体制 | 専任エンジニア複数名が手動修正 | AI + エンジニアによるレビューのみ |
| 60,000件の処理時間 | 数ヶ月 | 数日〜1週間 |
| 修正の一貫性 | 担当者依存でバラつきあり | RAGナレッジで均質化 |
| ドキュメント生成 | 手動（別工数） | 保守コメント・根拠を自動付加 |
| CI/CD統合 | 別ステップで実施 | GitHub Actions自動トリガー |
| コスト | 数億円相当の工数 | 大幅削減（数百万USD規模） |

自動修正率81.5%・コード生成成功率97.1%という数値は、残り18.5%をエンジニアが確認するだけで済むことを意味する。従来の「全件手動」と比べた生産性向上は桁が違う。

---

## 実践コード例：Polyspace結果をCSVに出力してAIパイプラインに渡す

Embedded CoderでC/C++を自動生成後、Polyspace Bug FinderのMISRA結果をエクスポートするMATLABスクリプト：

```matlab
% Polyspace Bug Finderのバッチ解析（MATLABスクリプト内から呼び出す）
proj = polyspace.Options;
proj.Sources = {'./codegen/mymodel_ert_rtw/mymodel.c'};
proj.CodingRulesCodeMetrics.EnableMisraC = true;
proj.CodingRulesCodeMetrics.MisraC = 'mandatory-required';

% 解析実行
polyspaceDir = polyspaceBugFinder(proj, ...
    '-results-dir', '/tmp/ps_results', ...
    '-nodesktop');

% 結果をCSVでエクスポート
res = polyspace.CodeMetrics('/tmp/ps_results');
misraTable = res.Results;
writetable(misraTable, '/tmp/misra_violations.csv');
fprintf('MISRA違反件数: %d\n', height(misraTable));
```

出力されたCSVをAzure OpenAI APIに渡すPythonスクリプト側では、違反ファイル・行番号・ルールIDをプロンプトとして投げ、修正後のコードをレスポンスで受け取る。GitHubへのPR作成はGitHub Actions内のPythonスクリプトで自動化する設計が最も運用しやすい。

---

## 注意点・落とし穴

**LLM生成コードは「自動生成コード」の例外を受けない。** MISRA C:2025では、Embedded CoderやStateflow由来の自動生成コードは一部ルールが「非適用」と緩和される。しかしGitHub CopilotやLLMが直接生成したコードは通常の手書きコードと同じ基準で評価される。つまりAIが修正したコードも**必ずPolyspaceで再チェックが必要**だ。

Evaluatorが「確信度：低」と判定した修正（全体の約3〜5%相当）はエンジニアが必ず確認する運用設計が前提となる。また、RAGナレッジDBの品質が自動修正率に直結するため、社内の過去修正事例を丁寧に蓄積することが初期投資として重要だ。

---

## 応用：より高度な使い方

**ASPICE成果物との自動連携**が次のステップだ。MISRA Copilotが各修正に自動付加する「根拠コメント」は、そのままASPICE SWE.4（Unit Verification）のワークプロダクトとして転用できる。

PopcornSARのPARVIS-Coderは同様のアプローチをさらに体系化しており、PARVIS-Spec（要件分析）→ PARVIS-Coder（MISRA自動修正、実績40% → 94%改善）→ PARVIS-Verify（テスト自動生成）の3ステップを一気通貫で自動化している。自社でパイプラインを構築する際の設計参考になる。

---

## 今すぐ試せる最初の一歩

Polyspaceのコマンドライン解析を5分で実行する：

```bash
# Polyspace Bug Finderバッチ実行（MATLABなしでも動作）
polyspace-bug-finder-nodesktop \
  -sources mymodel.c \
  -misra-c-subset mandatory \
  -report-template BugFinder \
  -results-dir /tmp/ps_results

# 結果をCSVに変換（後続のAIパイプラインへ）
polyspace-results-export \
  -results-dir /tmp/ps_results \
  -format csv \
  -output /tmp/misra_output.csv
```

この出力をAzure OpenAI APIに渡す実験を試みることが、MISRA Copilot型フローへの最短ルートだ。
