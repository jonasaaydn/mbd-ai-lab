---
title: "TARA工数を70%削減——LLMがISO 21434の脅威分析を1日で自動化する最前線ツール3選"
date: 2026-05-27
category: "AI Coding"
tags: ["ISO 21434", "TARA", "Cybersecurity", "LLM", "Automotive", "AUTOSAR"]
tool: "Saphira AI / FEV TARA Copilot"
official_url: "https://fev.io/automation-of-threat-analysis-and-risk-assessment-tara-using-artificial-intelligence/"
importance: "high"
summary: "ISO/SAE 21434準拠のTARA（脅威分析・リスクアセスメント）は、ECU1品種あたり2〜4週間を要する重作業だ。LLMを活用したSaphira AI・FEV TARA Copilot・DefenseWeaverは工数を最大70%削減し、週単位の分析を1日に圧縮する。2026年、車載サイバーセキュリティ開発に欠かせないAI自動化の実態と実装手順を解説する。"
---

## はじめに

ISO/SAE 21434が本格施行されて以来、OEM・Tier1エンジニアにとってTARA（Threat Analysis and Risk Assessment）は避けられない業務となった。ECU1品種あたりの脅威シナリオは数十〜数百件に及び、攻撃パス分析まで含めると熟練のサイバーセキュリティエンジニアでも2〜4週間を要する。現代の自動車はECUを100個以上搭載し、EV・ADAS車両ではさらに増加の一途をたどる。このペースで手作業を続けることは現実的ではない。

2025〜2026年にかけて、LLMを核心技術としたTARA自動化ツールが急速に実用化段階に入った。**FEVのTARA Copilot**、**Saphira AI**、そして学術発の**DefenseWeaver**は、「週単位の作業を1日に」という目標に向けて異なるアプローチで挑んでいる。このツールを知らないまま手作業でTARAを続けていると、競合他社に対して月単位で開発スピードが遅れるリスクがある。

## TARA自動化の3つのツール

### FEV TARA Copilot
ドイツの大手エンジニアリング企業FEVが開発した、LLMベースのTARAアシスタント。チェーン型モジュラー設計により、アセット特定→ダメージシナリオ→影響評価→脅威特定→攻撃パス分析→攻撃実現可能性評価という一連のISO 21434ワークフローをLLMが自動実行する。FEVの実際のTARAコンサルティング案件から蒸留されたドメイン知識を搭載し、サイバーセキュリティエンジニアが入力・承認に集中できる設計だ。従来は並行して複数案件を担当できなかった専門家の稼働率を大幅に改善できる。

### Saphira AI
2025年に登場したSaaS型のTARA自動化プラットフォーム。高レベルのアーキテクチャ図（エンジニアが既に持っているもの）を入力するだけでISO 21434準拠のLevel-2 TARAを自動生成する。複数ECUにまたがるシステム横断的な脅威シナリオ生成が可能で、TARA工数を**約70%削減**、かつ週単位の作業を**数日に圧縮**できるとされる。2026年2月には半導体向けISO 21434対応のドキュメントを公開し、チップ設計段階からのサイバーセキュリティ統合を推進している。

### DefenseWeaver（NDSS 2025採択）
arXiv論文（2504.18083）で発表されたマルチエージェントLLMフレームワーク。システム構成情報からコンポーネント固有の攻撃ツリーを動的生成し、リスク評価まで自動化する初の「関数レベルTARA自動化システム」だ。検証では**11件の重大攻撃パスを特定**し、実際のペネトレーションテストで実証後、OEM/サプライヤーへの報告と修正まで完了している。NDSS Symposiumに採択された信頼性の高い研究成果だ。

## 実際の動作：ステップバイステップ（Saphira AI）

**Step 1: アイテム定義のアップロード**

```text
システム名: 電動パワーステアリングECU (EPS-ECU)
接続インターフェース: CAN FD, OBD-II, FlexRay
保護資産候補: ステアリング制御コマンド, キャリブレーションデータ
UDS: ISO 14229によるフラッシュ書き込みをサポート
```

Saphiraはこの記述を解析し、保護すべき資産リストを自動生成する。エンジニアはリストをレビューして承認するだけでよい。

**Step 2: AIによる脅威シナリオ自動生成（STRIDE適用）**

```text
[Saphira AI 生成例]
脅威ID: T-001
コンポーネント: CANバス通信インターフェース
STRIDE分類: Spoofing（なりすまし）
脅威シナリオ: 攻撃者がCAN IDを詐称してEPS-ECUに
  不正ステアリング指令を送信
影響評価: 安全S3 / 金融F2 / 運用O3
攻撃実現可能性: Medium（物理アクセスを前提とする場合）
リスクレベル: Critical → CAL3必須
```

**Step 3: 攻撃パス分析と要件自動生成**

LLMが攻撃ツリーを自動展開し、各攻撃パスに対してISO 21434準拠のサイバーセキュリティ目標と要件を出力する。このSTEP3が従来最も時間を要していた工程で、Saphiraは数時間で完了させる。

## Before / After 比較

| 作業ステップ | 手動（従来） | AI自動化（Saphira） |
|------------|------------|-------------------|
| アセット特定 | 4〜8時間 | 15分 |
| 脅威シナリオ生成（50件） | 3〜5日 | 2〜3時間 |
| 攻撃パス分析 | 5〜10日 | 半日 |
| TARA文書化 | 3〜5日 | 自動生成（即時） |
| **合計（ECU1品種）** | **2〜4週間** | **1〜3日** |
| 見落とし率 | 高（専門家依存） | 低（一貫した適用） |

## 実践コード例：Claude APIでTARA補助を試す（Python）

```python
import anthropic

client = anthropic.Anthropic()

SYSTEM_ARCH = """
システム: 電動パワーステアリング（EPS）ECU
接続: CAN FD (500kbps), OBD-II, CAN TP (ISO 14229)
機能: 操舵トルク補助、EPS制御ゲイン管理
ファームウェア更新: UDS経由でのFlash書き込みをサポート
セキュリティ制約: AUTOSAR SecOCによるメッセージ認証を一部適用済み
"""

prompt = f"""
以下の車載ECUシステムに対してISO/SAE 21434に準拠したTARAを実施してください。
STRIDE手法を適用し、各脅威について以下を特定してください：
1. 脅威シナリオ名とコンポーネント
2. 影響評価（安全/金融/運用/プライバシーを3段階で）
3. 攻撃実現可能性（Feasibility）
4. リスクレベル（Critical/High/Medium/Low）
5. 推奨サイバーセキュリティ目標

システム記述:
{SYSTEM_ARCH}

優先度の高い脅威シナリオを5件、Markdown表形式で出力してください。
"""

response = client.messages.create(
    model="claude-opus-4-7",
    max_tokens=2048,
    messages=[{"role": "user", "content": prompt}]
)

print(response.content[0].text)
```

このスクリプトを実行すると、LLMがSTRIDEフレームワークに基づいた脅威シナリオを自動生成する。生成結果をSaphira AIやFEV TARA Copilotにインポートして精査する**ハイブリッドワークフロー**が、2026年の実際のOEM現場で採用されはじめている。

## 注意点・落とし穴

**LLMの幻覚（Hallucination）は必ずレビューする**: 生成された脅威シナリオは必ずサイバーセキュリティエンジニアがレビューすること。特に**攻撃実現可能性評価**は、LLMが文脈なしにHigh/Lowを誤判定しがちで、専門家の補正が必要だ。

**CAL（Cybersecurity Assurance Level）の過小評価に注意**: AI生成TARAではCALレベルが不当に低くなるケースがある。CAL3・CAL4を必要とするシステムでは必ずリスク判定を人間がダブルチェックし、Type Approval書類に反映すること。

**ツールバージョンの固定**: SaphiraもFEV TARA CopilotもLLMバックエンドのバージョン更新で出力が変わりえる。ISO 21434の再認証サイクルに合わせてツールバージョンを固定・記録し、トレーサビリティを確保することが監査で求められる。

## 応用：より高度な使い方

TARA自動化の次のステップは、**セキュリティ要件→AUTOSAR設計への自動マッピング**だ。Saphiraが生成したセキュリティ目標を、Amazon Q DeveloperやGitHub Copilotを使ってAUTOSAR SWCのSecOCアノテーションや暗号化API呼び出しコードに自動変換するパイプラインが研究段階に入っている。また、DefenseWeaverの攻撃ツリー出力をdSPACE HILテスト環境にインポートし、侵入試験を自動化するまで繋げる構成も検討されている。FEV × ESCRYPT等、複数ツールを組み合わせた**エンドツーエンドのサイバーセキュリティ自動化フロー**が2026年後半に現実的な選択肢となる見通しだ。

## 今すぐ試せる最初の一歩

```python
# まずClaude APIで試してみる（5分で脅威シナリオのたたき台ができる）
pip install anthropic
# ANTHROPIC_API_KEY を設定して上記スクリプトをコピー実行
# SYSTEM_ARCHに自分のECU仕様を記入するだけでSTRIDEベースのTARAが即生成
```
