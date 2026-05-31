---
title: "仕様書の図表まで読んで実車テストを自動実行——Mercedes-Benz×TU MunichのReq2Roadが変えるSDV検証工数"
date: 2026-05-31
category: "AI Coding"
tags: ["SDV", "GenAI", "テスト自動生成", "Mercedes-Benz", "VSS", "VLM", "Gherkin"]
tool: "Req2Road"
importance: "high"
summary: "Mercedes-Benz AGとTU Munichが2026年2月に発表したReq2Roadは、自然言語・表・図が混在する仕様書をVLMで解析し、Gherkinシナリオ→テストスクリプト→実車実行まで全自動化するGenAIパイプライン。Child Presence Detection Systemで仮想＋実車の両方で実証済み。SDV時代の検証ボトルネックを根本から解消する手法を徹底解説。"
---

## はじめに

SDV（Software-Defined Vehicle）の開発現場では、テスト工数が開発全体の40〜60%を占めるという報告がある。その主因は「仕様書からテストスクリプトへの変換作業」にある。仕様書はWord文書の自然言語、Excelの信号表、Visioのシーケンス図が混在しており、これを手動でGherkinシナリオに起こし、さらにPythonやCAPLのテストスクリプトに変換する作業は、熟練エンジニアでも1機能あたり数日かかる。

Mercedes-Benz AGとTU Munichが2026年2月に発表した**Req2Road**（arXiv:2602.15591）は、この「仕様→テスト→実行」の全工程をGenAIで自動化するパイプラインだ。テキスト・表・図を同時に処理するVLM（Vision-Language Model）を核に、VSS（Vehicle Signal Specification）と連携してRAGで正確な信号を特定。生成されたテストスクリプトを仮想環境と実車の両方で実行することを実証した。

このツールを知らないままでいると、チームが手動で1週間かけている検証作業が、他社では数時間で完結している時代に取り残されることになる。

## Req2Roadとは

Req2Roadは「Requirements-to-Road」の略で、Mercedes-Benz AGとTU Munichがドイツ連邦教育研究省のCeCaSプロジェクト（FKZ: 16ME0800K）の一環として開発した。2026年2月17日にarXivで公開（論文番号：2602.15591）。

従来のSDVテスト生成ツールとの最大の違いは、**Vision-Language Modelを使って図表入りの仕様書をそのまま処理できる**点にある。多くの既存ツールはプレーンテキストのみを扱うため、シーケンス図や信号テーブルは手動でテキスト化する前処理が必要だった。Req2Roadでは画像解析能力を持つVLM（論文ではQwen 2.5 VL 72Bを採用）を活用し、その前処理コストをゼロにした。

検証対象はADAS・安全機能全般で、論文ではChild Presence Detection（CPD：子供放置検知）システムを事例に使用。生成されたテストスクリプトを仮想SDVプラットフォームと実際の車両の両方で実行し、パイプライン全体の動作を確認している点が実用的な裏付けとなっている。

## 実際の動作：ステップバイステップ

Req2Roadのパイプラインは5段階で構成される。

### Step 1: 仕様書のパース（VLM）

自然言語テキスト・表・シーケンス図が混在したPDF/Wordを入力。VLMがページ全体を画像として解析し、信号名・条件・期待動作を構造化データとして抽出する。テキスト部分はLLMが、図表部分はVision機能が担当するため、従来は不可能だった「図中の信号フロー」の自動読み取りが実現した。

### Step 2: VSS信号の検索（RAG）

抽出された信号候補をRAGエンジンがVSS（COVESA標準のVehicle Signal Specification）カタログに照合する。ドット記法の正式な信号パス（例：`Vehicle.Cabin.Seat.Row2.Pos1.HasPassenger`）に変換する。RAGによる事前フィルタリングにより、LLMが存在しない信号名を生成するハルシネーションを大幅に低減している。

### Step 3: Gherkinシナリオの生成（LLM）

VSS信号で裏付けられた構造化データをGiven-When-Then形式のGherkinシナリオに変換する。

```gherkin
Feature: Child Presence Detection

  Scenario: 子供が座席に放置された場合にアラートを発する
    Given エンジンが停止している
    And Vehicle.Cabin.Door.Row1.Left.IsOpen が False である
    When Vehicle.Cabin.Seat.Row2.Pos1.HasPassenger が True である
    And Vehicle.OBD.AmbTemp が 25.0 以上である
    Then Vehicle.Body.Horn.IsActive が True になる
    And Vehicle.Body.Lights.Hazard.IsSignaling が True になる
```

### Step 4: テストスクリプトの自動生成

GherkinシナリオをPythonのBehaveフレームワーク向けスクリプトに自動変換する。VSS信号はCANまたはSOA（Service-Oriented Architecture）経由でシミュレータ/実車のECUに送信される形式に自動マッピングされる。

```python
from behave import given, when, then
from vss_client import VSSClient

vss = VSSClient(endpoint="vehicle://localhost:8090")

@given('エンジンが停止している')
def step_engine_off(context):
    vss.set('Vehicle.Powertrain.CombustionEngine.IsRunning', False)

@when('Vehicle.Cabin.Seat.Row2.Pos1.HasPassenger が True である')
def step_child_detected(context):
    vss.set('Vehicle.Cabin.Seat.Row2.Pos1.HasPassenger', True)

@then('Vehicle.Body.Horn.IsActive が True になる')
def step_horn_active(context):
    actual = vss.get('Vehicle.Body.Horn.IsActive')
    assert actual is True, f"Expected True, got {actual}"
```

### Step 5: 実行（仮想環境または実車）

生成したスクリプトを同一インタフェースで仮想SDVプラットフォーム（HILシミュレータ）または実車のテストドライブに適用できる。論文ではCARIADのzone controllerとcommAPIミドルウェアを通じて実車実行を確認している。

## Before / After 比較

| 項目 | 従来（手動） | Req2Road導入後 |
|------|------------|--------------|
| 仕様書解析（図表含む） | 2〜4時間（手動テキスト化が必要） | 約5分（VLMが自動解析） |
| Gherkinシナリオ作成 | 1機能あたり0.5〜1日 | 数分（自動生成） |
| テストスクリプト変換 | 0.5〜1日 | 自動生成（即時） |
| 実車への転用 | ツールチェーン再設定が必要 | 同一スクリプトで実行可 |
| 信号名ミス防止 | 担当者の知識に依存 | VSS照合で自動検証 |

1機能の検証準備工数が数日から数時間に短縮され、SDL全体の検証サイクルが高速化する。

## 実践コード例：パイプライン再現

Req2Roadのコアロジックを自社のLLM環境で再現する概念実装。Claude APIのvision機能とVSSカタログのRAGを組み合わせる。

```python
import anthropic
import base64
import json

client = anthropic.Anthropic()

def extract_signals_from_spec(spec_text: str, image_path: str | None = None) -> dict:
    """仕様書テキスト（＋画像）から信号と条件を抽出する"""
    content = []
    
    if image_path:
        with open(image_path, "rb") as f:
            img_b64 = base64.standard_b64encode(f.read()).decode()
        content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/png", "data": img_b64}
        })
    
    content.append({
        "type": "text",
        "text": (
            "以下の仕様書から車両信号・トリガー条件・期待動作をJSON形式で抽出してください。"
            f"信号名はVSS（Vehicle Signal Specification）形式で記述すること。\n\n{spec_text}"
        )
    })
    
    response = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=2048,
        messages=[{"role": "user", "content": content}]
    )
    return json.loads(response.content[0].text)


def generate_gherkin(signals: dict) -> str:
    """抽出した信号情報からGherkinシナリオを生成する"""
    prompt = (
        "以下のVSS信号マッピングからBDDのGherkinシナリオを生成してください。"
        f"Given-When-Then形式で、信号パスをそのまま使用してください。\n\n{json.dumps(signals, ensure_ascii=False, indent=2)}"
    )
    response = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text


# 使用例
spec = """
Child Presence Detection System:
- トリガー: 乗員がいる状態でエンジンがオフになる
- 条件: キャビン温度が30℃を超えた場合
- 動作: ホーンとハザードランプを作動させる
"""
signals = extract_signals_from_spec(spec)
gherkin = generate_gherkin(signals)
print(gherkin)
```

## 注意点・落とし穴

**VSS信号の網羅性に依存する**: VSSカタログにない信号（メーカー固有の拡張信号）はRAGで見つからず、ハルシネーションリスクが高まる。事前に社内VSS拡張シートを整備し、RAGカタログに追加することが前提条件となる。

**VLMの図解析精度**: 複雑なシーケンス図や文字が小さいUML図では誤読が発生する可能性がある。重要な仕様は必ず人間のエンジニアがGherkinシナリオをレビューすること。論文でもヒューマンインザループの確認ステップを推奨している。

**実車実行の前提条件**: 実車実行にはVSS準拠のSOAミドルウェア（commAPI等）に対応したECUが必要。AUTOSAR Classic CPの旧世代ECUはCAN変換レイヤーの追加実装が必要になる。

## 応用：より高度な使い方

基本的なシナリオ生成に習熟したら、以下の拡張が威力を発揮する。

**CI/CDパイプラインへの統合**: GitHub ActionsのPR作成時に自動でReq2Roadを実行し、仕様書が更新されるたびにテストスクリプトを自動再生成する。仕様とテストの「乖離」を防ぐ。

**ASPICE要件トレーサビリティ**: 生成されたGherkinシナリオを要件IDと自動紐付けし、ASPICE SWE.4〜6のトレースマトリクスを自動生成。審査工数が大幅に減少する。

**日本語仕様書への対応**: VLMとLLMが日本語を処理できるため、日本の開発現場の日本語仕様書にも追加設定不要で対応可能。

## 今すぐ試せる最初の一歩

COVESAのVSSカタログを取得して、RAGの基礎を確認する作業から始める。

```bash
# VSS 4.0カタログを取得（3,000以上の標準信号を含む）
git clone https://github.com/COVESA/vehicle_signal_specification.git

# 必要なライブラリをインストール
pip install anthropic sentence-transformers faiss-cpu

# VSSノード数を確認
python3 -c "
import subprocess, json
result = subprocess.run(
    ['python3', 'vehicle_signal_specification/tools/vspec2json.py',
     '-I', 'vehicle_signal_specification/spec/overlay',
     'vehicle_signal_specification/spec/VehicleSignalSpecification.vspec',
     '/dev/stdout'],
    capture_output=True, text=True
)
data = json.loads(result.stdout)
print(f'VSSシグナル総数: {len(data)} 件')
"
```

論文（arXiv:2602.15591）全文は無料でアクセスできる。Child Presence Detectionのケーススタディを手元の環境で再現するだけで、パイプライン全体の感触がつかめる。
