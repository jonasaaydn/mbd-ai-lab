---
title: "R2026aで正式搭載——SimulinkとPolyspace CopilotでMBD品質保証工数が半減する5つのシナリオ"
date: 2026-05-23
category: "MBD / Simulink"
tags: ["Simulink Copilot", "Polyspace Copilot", "MATLAB R2026a", "MISRA C 2023", "AUTOSAR", "FMU Builder"]
tool: "MATLAB/Simulink R2026a"
official_url: "https://www.mathworks.com/products/simulink-copilot.html"
importance: "high"
summary: "2026年4月リリースのMATLAB R2026aでSimulink CopilotとPolyspace Copilotが正式搭載。モデル説明・エラー特定・MISRA C 2023準拠チェックをAIが自動化し、品質保証工程を根本的に変える。Simulink FMU Builderも新製品として追加され、異ツール間co-simulationが劇的に簡単になった。"
---

## はじめに

「このSimulinkモデル、誰が作ったんですか？」——引き継いだモデルを前に途方に暮れる場面は、MBD現場では珍しくない。既存モデルの解読、シミュレーションエラーの特定、MISRA準拠チェック、FMUエクスポート……こうした「設計本来ではない作業」が、1つのECU開発プロジェクトで何十時間も費やされている。

2026年4月、MathWorksはMATLAB R2026aをリリースし、この状況を変える2製品を正式搭載した。**Simulink Copilot**と**Polyspace Copilot**だ。さらに**Simulink FMU Builder**という新製品も追加。これを知らずに従来手順を踏み続けると、チームで毎週数十時間を無駄にし続けることになる。

## MATLAB R2026aとは

MATLAB R2026aは2026年4月にMathWorksがリリースした最新メジャーバージョンで、「Trusted AI（信頼できるAI）を組み込みシステム開発へ」をコンセプトとしている。前バージョンR2025bまでMATLAB Chat Copilotとして試験提供されていたAI機能群が、今回から正式製品として独立した。

競合ツールとの違いとして、SimulinkのMBDネイティブ環境に完全統合されている点が重要だ。dSPACE TargetLinkやVector CASCなどのECU開発ツールでは同等のAI機能は現時点では提供されておらず、Simulinkエコシステムのエンジニアにとって大きなアドバンテージになる。

主要な新製品・機能：
- **Simulink Copilot**：Simulinkモデル設計を支援するAIアシスタント（正式製品として独立）
- **Polyspace Copilot**：静的解析結果の解釈・修正提案AIコパイロット
- **Polyspace as You Code**：IDE内でC/C++コーディング規則をリアルタイムチェック
- **Simulink FMU Builder**：FMI 2.0/3.0準拠のFMUを生成する新製品
- **External Languagesパネル**：PythonのvenvをMATLABから直接管理

## 実際の動作：ステップバイステップ

### Simulink Copilotの基本操作

R2026aでSimulink Copilotを有効にすると、モデルエディタの右ペインにチャットパネルが表示される。

**シナリオ1：不明モデルの即時解読**

引き継いだSimulinkモデルを開いた状態で：
1. `Apps > Simulink Copilot` を選択してパネルを開く
2. チャット欄に「このモデルの機能を日本語で説明してください」と入力
3. CopilotがSimulinkキャンバスをスキャンし、サブシステム構成・信号フロー・主要ブロックを自動解説

**シナリオ2：シミュレーションエラーの自動解析**

エラー発生時：
1. エラーメッセージをコピーしてCopilotに貼り付ける
2. 「根本原因と修正手順を教えてください」と追記
3. CopilotがMathWorksドキュメントとモデル構造を照合して優先度付きの修正案を提示

**シナリオ3：自然言語でブロック生成**

「PID Controllerブロックを追加して、Plant subsystemの出力に接続してください」と入力するだけで、Copilotがライブラリから適切なブロックを選定・配置・接続する。

### Polyspace Copilotの基本操作

Polyspace Bug Finderで解析完了後、AIが欠陥を解説する：

```matlab
% Polyspace Bug Finderの結果を読み込む
results = polyspace.BugFinderResults('polyspace_results/');
summary = results.getSummary();

% Copilotに欠陥の説明と修正案を要求（R2026a新機能）
explanation = polyspaceCopilot.explain(summary.findings(1));
disp(explanation.rootCause);    % 「整数オーバーフローの可能性: line 42...」
disp(explanation.suggestion);  % 「int32をint64に変更、またはsaturation処理を追加」
```

MISRA C 2023の全ルールをPolyspace Bug Finderで自動チェックし、違反箇所をCopilotが重要度・修正コスト・関連ルール番号とともに整理して返す。

## Before / After 比較

| 作業 | R2026a導入前 | R2026a導入後 |
|------|------------|------------|
| 不明モデルの解読 | 1〜3時間（手動でブロックを追跡） | 10〜15分（Copilotが即時解説） |
| シミュレーションエラー修正 | 1〜2時間（ドキュメントを手動検索） | 15〜30分（Copilotが根本原因と修正案） |
| MISRA C準拠チェック | 2〜4時間（結果リストを1件ずつ確認） | 30〜60分（Copilotが説明・優先度付き） |
| FMUエクスポート設定 | 1〜3時間（複数ステップの手動設定） | 10〜20分（GUI＋5行以下のコード） |
| Python環境セットアップ | MATLAB外でvenvを作成・手動パス設定 | External Languagesパネルで一元管理 |

MathWorksがベータテストで公表したデータでは、設計レビュー・品質保証工程全体で**平均40〜60%の工数削減**が報告されている。

## 実践コード例

### Simulink FMU Builderで co-simulation FMUを生成する

```matlab
% 前提：MATLAB R2026a以降 + Simulink FMU Builder ライセンス
% 'my_ecu_model.slx' からFMI 3.0 Co-Simulation FMUを生成

model = 'my_ecu_model';
load_system(model);

% FMUエクスポート設定
fmuSettings = Simulink.FMU.ExportSettings();
fmuSettings.FMIVersion        = '3.0';    % FMI 2.0 または 3.0
fmuSettings.CoSimulation      = true;     % Co-Simulation FMU
fmuSettings.EmbeddedCodeGen   = true;     % Embedded Coderで生産コード化

% FMU生成（出力: my_ecu_model.fmu）
Simulink.exportToFMU(model, fmuSettings);
disp('FMU generated: my_ecu_model.fmu');
% → GT-Suite / ANSYS Twin Builder / dSPACE VEOS など
%   FMI 3.0対応シミュレータに直接インポート可能
```

### Polyspace Copilotで重大欠陥を一括解釈する

```matlab
% 重大欠陥のみCopilotで一括解釈するスクリプト
resultsDir  = 'polyspace_results/';
psBfResults = polyspace.BugFinderResults(resultsDir);

findings        = psBfResults.getFindingsTable();
criticalFindings = findings(findings.Severity == "High", :);

for i = 1:height(criticalFindings)
    exp = polyspaceCopilot.explain(criticalFindings(i,:));
    fprintf('--- Finding %d [%s] ---\n原因: %s\n修正案: %s\n\n', ...
        i, criticalFindings.RuleId{i}, exp.rootCause, exp.suggestion);
end
% 出力例:
% --- Finding 1 [MISRA-C:2023/R.12.1] ---
% 原因: 演算子の優先順位が不明確。意図しない計算順序になる可能性
% 修正案: 括弧を追加して優先順位を明示してください
```

## 注意点・落とし穴

**ライセンス追加が必要**：Simulink CopilotおよびPolyspace CopilotはR2026aから独立した有償製品として販売される。既存のMATLAB/Simulinkライセンスに追加購入が必要で、学術向けスイートには含まれないケースが多い。導入前に必ずライセンス確認を。

**大規模モデルの限界**：数千ブロック規模の大型モデルでは、Copilotのコンテキスト把握が不安定になり、不正確な説明が返ることがある。サブシステム単位でモデルを分割してから質問する運用を推奨。

**FMU BuilderとEmbedded Coderの依存関係**：生産コードベースのFMU生成にはEmbedded Coder（別ライセンス）が必須。研究用の機能FMUであれば不要だが、車両搭載を想定したワークフローでは注意が必要。

**Polyspace as You CodeのIDE対応**：現時点でVS Code、Eclipse、Visual Studioのみ対応。既存コードレビュー環境との統合計画を事前に確認しておくこと。

## 応用：より高度な使い方

**標準化タスクの自動実行**：チームのモデリング規約をSimulink Copilotの「タスクライブラリ」として登録することで、「規約チェック→コード生成→Polyspace解析→レポート生成」という一連の品質ゲートをCopilotが自動実行できる。ASPICE CL2準拠ワークフローへの応用が特に有望だ。

**FMU Builder＋GT-SuiteによるHIL効率化**：SimulinkのECUモデルをFMUとしてGT-Suiteにエクスポートし、エンジン・パワートレインモデルとFMI 3.0でco-simulation接続することで、HIL環境セットアップの工数を大幅削減できる。

## 今すぐ試せる最初の一歩

R2026aにアップデート後、まず既存Simulinkモデルを開いてSimulink Copilotに「このモデルの機能を説明してください」と入力するだけ。5分以内に既存モデルの全体像が把握でき、引き継ぎコスト削減の効果をすぐに実感できる。ライセンスなしでも30日間のトライアルが利用可能（MathWorksアカウント要）。
