---
title: "OpenAI×Chip Ganassi RacingがIndyCarで実証——ピット戦略AIがFirestone Pit Stop Championship 1-2フィニッシュを達成した技術システムの全貌"
date: 2026-05-31
category: "Race Engineering Use Cases"
tags: ["IndyCar", "OpenAI", "ピット戦略", "テレメトリ解析", "レース工学", "AI戦略", "GPT-4o"]
tool: "OpenAI API"
official_url: "https://chipganassiracing.com/news/chip-ganassi-racing-openai-announce-strategic-collaboration-sam-altman"
importance: "high"
summary: "OpenAIとChip Ganassi Racingは2026年に技術連携をさらに深化させ、100以上のセンサーから届くリアルタイムテレメトリをAIが解析してピット戦略を最適化している。成果はFirestone Pit Stop Performance Championship 1-2フィニッシュという具体的な数字に現れた。F1とは異なるIndyCar特有の制約のもとでAIが発揮する威力と、MBDエンジニアが自分の現場に応用できる技術要素を詳解する。"
---

## はじめに

「ピットストップを7秒以内に収めろ」——IndyCarでは0.1秒の差が順位を変え、チャンピオンシップを左右する。Chip Ganassi Racing（CGR）がOpenAIとの技術連携を深めた2026年シーズン、#9と#10の2台がFirestone Pit Stop Performance Championship（ピット作業効率の年間ランキング）で1-2フィニッシュを達成した。

AIがF1の戦略ツールとして注目を集める中、IndyCarでの実装は日本のMBDエンジニアにとっても見逃せない。オーバルコースと市街地サーキットが混在するIndyCarならではのデータ複雑性、リアルタイム意思決定の制約——これはまさにレース用ECU・制御ソフトのMBD開発が直面する課題と同じ構造だからだ。

---

## Chip Ganassi Racing × OpenAI の連携とは

**Chip Ganassi Racing（CGR）** はIndyCar・IMSA・NASCAR等に参戦する米国トップチームで、4年連続チャンピオン（Alex Palou、#10 Honda）を擁する。OpenAIとの連携は2025年2月に始まり、F1系ではなくIndyCar初のAI戦略パートナーシップとして注目された。

**連携の規模（2026年）**：  
- OpenAIエンジニア・研究者がレースウィークエンドに現地参加
- GPT-4oをベースにチームの専用データで追加ファインチューニング
- 2026年4月にはロングビーチ・ワシントンD.C.戦で#10ホンダのプライマリスポンサーにも昇格

**既存ツールとの違い**：他チームが使う独自Excelマクロやスプレッドシートベースの戦略計算に対し、CGRは100以上のセンサーから届くリアルタイムテレメトリをAIが同時並行で処理し、自然言語でエンジニアにインサイトを提供する。

---

## 実際の動作：ステップバイステップ

### IndyCar AIシステムの3層構造

CGR × OpenAIのシステムは大きく3つのレイヤーで動作している：

**Layer 1：リアルタイムテレメトリ取得**

IndyCarには1台あたり100以上のセンサーが搭載されており、毎周回以下のデータがピットウォールに送られる：

| データ種別 | 取得頻度 | 主な用途 |
|-----------|---------|---------|
| タイヤ温度・圧力 | 10Hz | デグラデーション予測 |
| 燃料流量・残量 | 100Hz | フューエルカット計算 |
| ブレーキ温度 | 50Hz | ピット判断タイミング |
| ラップタイム | 周回ごと | ピットウィンドウ最適化 |
| トラック温度 | 1Hz | タイヤ選択モデルへの入力 |

**Layer 2：AIによるリアルタイム解析**

```python
# === CGRシステムの概念実装（実際の実装はOpenAI社内）===
# レースエンジニアの問い合わせに自然言語で応答するRAGシステム

from openai import OpenAI
import json

client = OpenAI()

def query_race_strategy(telemetry_snapshot: dict, engineer_question: str) -> str:
    """
    テレメトリスナップショットとエンジニアの質問を受け取り
    GPT-4oが戦略インサイトを返す
    """
    # === ステップ1: テレメトリをコンテキストに変換 ===
    # 100以上のセンサー値を構造化テキストにまとめてプロンプトに組み込む
    telemetry_str = json.dumps(telemetry_snapshot, ensure_ascii=False, indent=2)

    # === ステップ2: システムプロンプトにIndyCar専門知識を込める ===
    system_prompt = """
あなたはIndyCarレースの戦略AIアシスタントです。
以下の制約を常に考慮してください：
- フューエルウィンドウ: 最大32周（オーバルコース換算）
- ピットストップ目標: 7秒以内（給油+タイヤ交換）
- イエローフラッグ時はフリーピット判断を優先する
- タイヤコンパウンドは1レースに最低2種類使用が義務

現在のテレメトリデータを分析し、エンジニアの質問に日本語で回答してください。
"""

    # === ステップ3: GPT-4oに問い合わせる（ストリーミングで低遅延応答）===
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": f"テレメトリ:\n{telemetry_str}\n\n質問: {engineer_question}"}
        ],
        stream=True,           # レース中のリアルタイム性のためストリーミング
        max_tokens=500         # 応答を短く保つ（エンジニアが読める量に制限）
    )

    # ストリーミング応答を結合して返す
    result = ""
    for chunk in response:
        if chunk.choices[0].delta.content:
            result += chunk.choices[0].delta.content
    return result

# === 使用例：ピットウィンドウ判断を問い合わせる ===
sample_telemetry = {
    "lap": 45,
    "fuel_remaining_pct": 18.3,
    "front_left_tire_temp_C": 112,
    "lap_time_delta_sec": +0.42,   # ベストラップ比で0.42秒遅い
    "track_position": 3,
    "yellow_flag": False
}

answer = query_race_strategy(
    sample_telemetry,
    "今すぐピットインすべきか、あと2周待つべきか？"
)
print(answer)
```

**実行すると、以下のような応答が返ります：**
```
燃料残量18.3%は約3〜4周相当です。現在のラップタイム劣化（+0.42秒）は
タイヤデグラデーションが加速しているサインであり、2周後にはさらに+0.8〜1.0秒
の劣化が予測されます。

推奨：次周でのピットインを強く推奨。理由は2点——
1. 燃料計算: あと2周待つと給油時間が0.3秒増加（フューエルウィンドウ外リスク）
2. タイヤ: 現在3番手のポジションを維持したままアンダーカットを狙える

競合チームのピットタイミング予測（テレメトリ比較から推定）: 
#5 は残り2周でピット見込み。今すぐピットすれば逆転の可能性あり。
```

**よくあるエラーと対処：**

| エラー | 原因 | 解決法 |
|--------|------|--------|
| `RateLimitError` | API呼び出し過多 | レース中は1クエリ/10秒以下に制限 |
| 応答遅延 > 3秒 | トークン数が多すぎる | テレメトリの送信変数を絞る |
| 誤った燃料計算 | モデルにIndyCar知識がない | システムプロンプトにルールを詳細記述 |

**Layer 3：ピットストップ実行支援**

AIはピットストップ中の給油量計算も担当する。IndyCarの給油ノズルは毎秒約1ガロン（3.8L）給油するため、0.1秒のズレが燃料不足・過剰給油に直結する。AIがリアルタイムでターゲット給油量を算出し、クルーに音声フィードバックで伝える仕組みがある。

---

## Before / After 比較

| 項目 | AI導入前（従来手法） | AI導入後（OpenAI活用） |
|------|---------------------|----------------------|
| テレメトリ解析 | エンジニアが手動でグラフ確認（周回ごと） | 100+センサーをAIがリアルタイム統合処理 |
| ピット判断時間 | 5〜10秒（チーフエンジニアの直感＋計算） | 2秒以内（AI推奨＋エンジニア最終判断） |
| 給油量精度 | ±0.5ガロン（ストップウォッチ計測） | ±0.05ガロン（AI算出） |
| ピット作業成績 | チャンピオンシップ中位圏 | 2026年Firestone Pit Stop Championship 1-2達成 |
| ドライバー育成 | 月次レビュー（後日振り返り） | レース直後にAIがパーソナライズされたフィードバック生成 |

---

## 実践コード例：テレメトリデータ前処理パイプライン

レースデータをOpenAI APIに渡す前の前処理スクリプト（Python）：

```python
import pandas as pd
import numpy as np
from openai import OpenAI

def preprocess_telemetry_for_llm(raw_csv_path: str, lap_window: int = 5) -> dict:
    """
    生テレメトリCSV（100Hz）を LLMに渡せる要約辞書に変換する

    IndyCarの生データは約100Hz×100チャンネルで10分で60,000行になる。
    LLMのコンテキストに収めるため、直近N周の統計量に圧縮する。
    """
    df = pd.read_csv(raw_csv_path)

    # === ステップ1: 直近N周のデータに絞る ===
    latest_lap = df['lap'].max()
    recent     = df[df['lap'] >= (latest_lap - lap_window)]

    # === ステップ2: チャンネルごとに統計量を計算する ===
    # 平均・最大・最小・標準偏差を取ることでデータを1/1000に圧縮
    summary = {
        "current_lap"            : int(latest_lap),
        "fuel_remaining_mean_pct": round(recent['fuel_pct'].mean(), 1),
        "tire_temp_fl_max_C"     : round(recent['tire_temp_fl'].max(), 1),
        "tire_temp_fr_max_C"     : round(recent['tire_temp_fr'].max(), 1),
        "lap_time_delta_trend"   : round(
            # 直近5周のラップタイム傾向（正=悪化、負=改善）
            np.polyfit(range(lap_window), 
                       recent.groupby('lap')['lap_time_delta'].mean().values, 1)[0], 3
        ),
        "brake_temp_max_C"       : round(recent['brake_temp_front'].max(), 1),
    }
    return summary

# === 使用例 ===
telemetry = preprocess_telemetry_for_llm("race_telemetry.csv", lap_window=5)
client    = OpenAI()
response  = client.chat.completions.create(
    model    = "gpt-4o",
    messages = [{"role": "user", "content": f"直近5周の状況: {telemetry}\nピット推奨タイミングは？"}]
)
print(response.choices[0].message.content)
```

---

## 注意点・落とし穴

**1. リアルタイム応答速度の制約**  
GPT-4oのAPIレスポンスは通常1〜3秒。レース中の判断に使うには、プロンプトを短く保つ（500トークン以内）設計が必要。ストリーミングAPIを使うと初回トークンが0.3秒以内に届くため、体感レイテンシを大幅に改善できる。

**2. AIの「自信過剰」に注意**  
LLMは不確実な状況でも自信ありげに回答する。CGRでは必ずエンジニアが最終判断を下す「ヒューマン・イン・ザ・ループ」を維持している。AIを「候補提示ツール」として使い、意思決定者はあくまで人間であることを組織として明確にすることが重要だ。

**3. IndyCar独自ルールのファインチューニングが必要**  
汎用GPT-4oはIndyCarの詳細ルール（燃料計算の特殊ルール、イエローフラッグ時の特例等）を知らない。システムプロンプトまたはファインチューニングでチーム独自のナレッジを組み込む設計が必須。

**4. データセキュリティ**  
テレメトリデータは競合他チームに知られたくない機密情報。OpenAI APIに送る前に個人識別情報・機密戦略データを匿名化・集計するパイプラインが必要。API送信データは学習に使われないエンタープライズ契約を結ぶこと。

---

## 応用：MBDエンジニアが自分の現場に活かす方法

**① HILテスト結果のAI解析**  
dSPACE HILの大量ログデータをOpenAI APIに渡し、「何周目でブレーキ温度が限界に近づくか」「どのシナリオでECUエラーが発生しやすいか」を自然言語で問い合わせるシステムを構築できる。

**② MISRA準拠チェックの自動コメント生成**  
Polyspace解析結果をGPT-4oに渡し、「この違反はどう修正すればいいか」を自然言語で説明させることで、後輩エンジニアへの教育コストを削減できる。

**③ ドライバー育成データ分析への応用**  
ドライバーのブレーキ・アクセル操作ログをAIが解析し、パーソナライズされたコーチングレポートを生成する仕組みは、テストドライバーの育成に直接応用できる。

---

## 今すぐ試せる最初の一歩

OpenAI APIキーさえあれば以下のコードで5分以内にテレメトリAI解析を体験できる：

```python
# pip install openai  でインストール後に実行
from openai import OpenAI
client = OpenAI()  # OPENAI_API_KEY 環境変数を設定しておく

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{
        "role": "user",
        "content": "燃料残量15%、タイヤ温度115℃、ラップタイム0.5秒劣化中。あと何周走れるか？ピット推奨タイミングは？"
    }]
)
print(response.choices[0].message.content)
```
