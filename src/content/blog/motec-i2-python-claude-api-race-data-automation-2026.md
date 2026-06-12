---
title: "MoTeC i2 Pro × Python + Claude APIでレース走行データ解析を完全自動化——テスト後30分でFSAEエンジニアリングブリーフを生成する実践ガイド"
date: 2026-06-12
category: "Race Engineering Use Cases"
tags: ["MoTeC", "Python", "Claude API", "テレメトリ解析", "データ解析自動化", "学生フォーミュラ", "FSAE", "レースエンジニアリング"]
tool: "MoTeC i2 Pro"
official_url: "https://www.motec.com.au/i2/i2overview/"
importance: "high"
summary: "MoTeC i2 Proの走行データをPythonで自動取得し、ClaudeのAPIに渡すと、テスト後30分でセットアップ改善アドバイス付きのエンジニアリングブリーフが生成される。年間30セッションを運営するFSAEチームが毎回4〜5時間費やしていたデータ整理・解釈・報告書作成を、Pythonスクリプト1本で自動化する方法を実際のコードで解説する。"
---

## はじめに

テスト走行後のピットに戻ると、エンジニアは4〜5時間のデータ格闘を覚悟する。MoTeC i2 Proでチャンネルを1本1本確認し、エクセルに数字を転記し、「前回比でトラクションが落ちた原因は何か」を言葉にして報告書を作る——この繰り返しが年間30セッション続く。翌朝のチームミーティングまでに間に合わせようと深夜まで作業する学生は多い。

2026年現在、このルーティンを根本から変えられる方法がある。MoTeC i2 ProからCSVエクスポートしたデータをPythonで自動処理し、Claude APIに渡すと、**テスト後30分でアドバイス付き日本語ブリーフが自動生成**される。年間換算で150〜200時間のデータ作業をゼロに近づける実装を、コピペ可能なコードで解説する。

## MoTeC i2 ProとClaude APIとは

**MoTeC i2 Pro**は、F1からFSAEまで世界中のレーシングチームが使うデータ解析ソフトウェア（MoTeC社製、オーストラリア）。ロガーが記録した走行データ（速度・スロットル・ブレーキ・操舵・GPS等、数十チャンネル）を時系列グラフで表示し、ラップ比較や相関分析ができる。無料版（i2 Standard）でも多くの機能が利用可能。

**Claude API**はAnthropic社が提供するLLMのAPI。2026年時点の最新モデル`claude-opus-4-8`は工学的な数値解釈と日本語生成に優れており、走行データの数値を渡すと具体的なセットアップ改善アドバイスを自然言語で返す。

既存アプローチとの違い：従来のデータ解析は「人間がグラフを見て判断」するもので、自動化には専門的なシグナル処理知識が必要だった。Claude APIを使うと、チャンネルの統計値を自然言語の形で渡すだけで、エンジニアリング的な解釈が自動生成される。

## 実際の動作：ステップバイステップ

**前提条件**: Python 3.11以降。`pip install anthropic pandas numpy matplotlib`でインストール可能。MoTeC i2 ProはCSVエクスポート機能を内蔵（Freeバージョンでも利用可能）。

### Step 1: MoTeC i2 ProからCSVエクスポート

```
i2 Pro メニュー → Export → Export to Spreadsheet
→ All Channels を選択 → Format: CSV → Output rate: 100Hz
→ 保存先: /data/session_20260612_run1.csv
```

エクスポートされるCSVの形式（例）:
```csv
Time,Speed,ThrottlePos,BrakePressF,BrakePressR,SteeringAngle,LateralG,LongG,EngineRPM,GearPos
0.000,0.0,0.0,0.0,0.0,2.3,0.01,-0.02,850,0
0.010,0.3,5.2,0.0,0.0,2.1,0.02,-0.01,920,1
...
```

### Step 2: Pythonで統計量を自動計算

```python
# === ステップ1: 必要ライブラリのインポート ===
import pandas as pd
import numpy as np
import anthropic
from pathlib import Path

# === ステップ2: CSVデータ読み込みと基本クリーニング ===
def load_motec_csv(filepath: str) -> pd.DataFrame:
    """MoTeC i2 ProエクスポートCSVを読み込む"""
    df = pd.read_csv(filepath)
    # 時刻インデックスに変換（秒単位）
    df = df.set_index('Time')
    # 速度0以下のガレージデータを除外（走行中データのみ）
    df = df[df['Speed'] > 5.0]
    return df

df = load_motec_csv('/data/session_20260612_run1.csv')
print(f"走行データ読み込み完了: {len(df)}行 ({len(df)*0.01:.1f}秒分)")

# === ステップ3: セクション別（加速/コーナー/制動）に統計量を計算 ===
def extract_session_stats(df: pd.DataFrame) -> dict:
    """走行データから主要指標を抽出"""
    stats = {}

    # --- 全体統計 ---
    stats['max_speed_kmh'] = df['Speed'].max()
    stats['avg_speed_kmh'] = df['Speed'].mean()
    stats['total_time_s'] = len(df) * 0.01

    # --- スロットル特性 ---
    # スロットル開度50%以上の区間（加速フェーズ）
    accel_phase = df[df['ThrottlePos'] > 50]
    stats['throttle_avg_accel_phase'] = accel_phase['ThrottlePos'].mean()
    stats['throttle_on_time_pct'] = len(accel_phase) / len(df) * 100

    # --- ブレーキ特性 ---
    brake_phase = df[df['BrakePressF'] > 5]  # 前輪5bar以上
    stats['max_brake_pressure_f_bar'] = df['BrakePressF'].max()
    stats['max_brake_pressure_r_bar'] = df['BrakePressR'].max()
    # 前後ブレーキバランス (前輪/(前+後))
    if brake_phase['BrakePressR'].mean() > 0:
        stats['brake_balance_pct'] = (
            brake_phase['BrakePressF'].mean() /
            (brake_phase['BrakePressF'].mean() + brake_phase['BrakePressR'].mean())
        ) * 100
    else:
        stats['brake_balance_pct'] = 100.0

    # --- コーナリング特性（横Gが0.3g以上の区間）---
    corner_phase = df[df['LateralG'].abs() > 0.3]
    stats['max_lateral_g'] = df['LateralG'].abs().max()
    stats['avg_lateral_g_corner'] = corner_phase['LateralG'].abs().mean()
    # 最大横Gでの速度（グリップ限界探索）
    max_g_idx = df['LateralG'].abs().idxmax()
    stats['speed_at_max_lateral_g'] = df.loc[max_g_idx, 'Speed']

    # --- エンジン特性 ---
    stats['max_rpm'] = df['EngineRPM'].max()
    stats['avg_rpm_accel'] = accel_phase['EngineRPM'].mean()
    stats['gear_changes'] = (df['GearPos'].diff() != 0).sum()

    # --- トラクション制御評価（スロットル急開の瞬間）---
    throttle_diff = df['ThrottlePos'].diff()
    aggressive_throttle = df[throttle_diff > 20]  # 0.01s間に20%以上の急開
    stats['aggressive_throttle_events'] = len(aggressive_throttle)

    return stats

stats = extract_session_stats(df)
print("統計量算出完了")
for k, v in stats.items():
    print(f"  {k}: {v:.2f}")
```

**実行結果（例）:**
```
走行データ読み込み完了: 42380行 (423.8秒分)
統計量算出完了
  max_speed_kmh: 108.3
  avg_speed_kmh: 62.7
  throttle_on_time_pct: 51.2
  max_brake_pressure_f_bar: 42.8
  brake_balance_pct: 68.3
  max_lateral_g: 1.82
  aggressive_throttle_events: 47
  max_rpm: 11450
  gear_changes: 312
```

### Step 3: Claude APIでエンジニアリングブリーフ生成

```python
# === ステップ4: Claude APIでエンジニアリングブリーフを生成 ===
def generate_engineering_brief(stats: dict, session_info: dict) -> str:
    """走行統計をClaudeに渡してエンジニアリングブリーフを自動生成"""

    client = anthropic.Anthropic()  # ANTHROPIC_API_KEY環境変数から自動取得

    # --- プロンプト構築 ---
    prompt = f"""あなたは学生フォーミュラ（FSAE）の経験豊富なレースエンジニアです。
以下の走行データ統計を分析し、日本語でエンジニアリングブリーフを作成してください。

## セッション情報
- 日時: {session_info['date']}
- サーキット: {session_info['circuit']}
- ドライバー: {session_info['driver']}
- 走行条件: {session_info['conditions']}

## 走行データ統計
- 最高速度: {stats['max_speed_kmh']:.1f} km/h
- 平均速度: {stats['avg_speed_kmh']:.1f} km/h
- スロットルオン率: {stats['throttle_on_time_pct']:.1f}%
- 前輪最大ブレーキ圧: {stats['max_brake_pressure_f_bar']:.1f} bar
- ブレーキバランス（前）: {stats['brake_balance_pct']:.1f}%
- 最大横G: {stats['max_lateral_g']:.2f} G
- コーナリング平均横G: {stats['avg_lateral_g_corner']:.2f} G
- 最大横G時速度: {stats['speed_at_max_lateral_g']:.1f} km/h
- 急スロットル開操作回数: {stats['aggressive_throttle_events']} 回
- 最大エンジン回転数: {stats['max_rpm']:.0f} rpm
- 変速回数: {stats['gear_changes']} 回

## 出力形式
以下の構成で日本語ブリーフを作成してください（合計400〜600文字）：

1. **セッション概要**（2文）: 走行全体の傾向評価
2. **改善優先度TOP3**（箇条書き）: 最も重要な改善ポイントを数字根拠とともに
3. **次セッションの推奨セットアップ変更**（具体的な数値で）
4. **ドライバーへのフィードバック**（1〜2文）
5. **機械信頼性チェック項目**（該当するもののみ）
"""

    # --- API呼び出し ---
    message = client.messages.create(
        model="claude-opus-4-8",   # 工学推論に優れた最新モデル
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )

    return message.content[0].text

# セッション情報
session_info = {
    'date': '2026-06-12 14:30',
    'circuit': '袖ヶ浦フォレストレースウェイ',
    'driver': '山田太郎',
    'conditions': '晴れ・気温28℃・路面ドライ'
}

brief = generate_engineering_brief(stats, session_info)
print("=== エンジニアリングブリーフ ===")
print(brief)

# テキストファイルに保存
output_path = f"/data/brief_{session_info['date'][:10]}.txt"
Path(output_path).write_text(brief, encoding='utf-8')
print(f"\nブリーフ保存完了: {output_path}")
```

**生成されるブリーフの例:**
```
=== エンジニアリングブリーフ ===

## セッション概要
本セッションは最高速108.3 km/hと標準的な速度レンジで推移したが、
急スロットル操作が47回と多く、コーナー脱出のトラクション管理に
課題が見られた。ブレーキバランス68%は前寄りであり、後輪の制動力
不足によるリアスタビリティ低下の可能性がある。

## 改善優先度TOP3
1. **ブレーキバランス調整（優先度：高）**: 前68%→目標62〜65%へ調整。
   後輪ブレーキ圧を現状比15%増加でリアスタビリティ改善が期待できる。
2. **コーナー出口のスロットルコントロール（優先度：高）**: 急スロットル47回は
   多すぎる。ドライバーへの意識付けと、TCS閾値を現状比10%下げることを検討。
3. **コーナリング速度向上（優先度：中）**: 最大横G 1.82Gはタイヤポテンシャル
   未活用の可能性。空力パッケージの前後バランス再確認を推奨。

## 次セッション推奨変更
- 後輪ブレーキバイアス: +2クリック（約3%後輪増加）
- TCS介入閾値: 現状設定×0.90
- リアウィング角度: +1度（ダウンフォース増加でトラクション改善）

## ドライバーフィードバック
コーナー出口のスロットル操作を「2〜3コ数えてから踏む」リズムを意識すること。
特に2コーナー・4コーナー出口で急スロットルのタイムロスが確認できた。

## 機械信頼性チェック
- [ ] 前輪ブレーキ温度確認（最大圧42.8barは高負荷）
- [ ] TCSセンサーキャリブレーション（急スロットル検知精度確認）
```

## Before / After 比較

| 項目 | 手動データ解析（従来） | Python + Claude API（自動） |
|------|---------|---------|
| ブリーフ作成時間 | 4〜5時間/セッション | 30分（CSV取得含む） |
| 分析の一貫性 | エンジニアによって変動 | 毎回同じフォーマット |
| 見落とし | 人間の疲労で発生 | 全チャンネルを漏れなく確認 |
| API費用 | — | 約¥20/セッション（claude-opus-4-8） |
| 年間削減時間（30セッション） | — | **約150〜200時間** |

## 注意点・落とし穴

**1. CSVエクスポートのレート設定**
MoTeC i2 ProのCSVエクスポートでOutputRateを高く設定しすぎるとファイルが巨大になる。100Hzで通常のFSAEセッション（5〜7分）は約50MBになる。Claude APIはトークン制限があるため、生データをそのままAPIに渡さず、**統計量に集約してから**渡すのが鉄則。

**2. チャンネル名はロガー設定依存**
CSVのカラム名はチームのロガー設定によって異なる。`ThrottlePos`が`TPS`や`TH_POS`と記録されているチームは多い。スクリプト冒頭に`CHANNEL_MAP`辞書を定義してチーム固有のチャンネル名を標準名に変換する処理を追加すること。

**3. GPSデータの活用**
GPSチャンネルがあれば、コーナー別の分析（どのコーナーで改善余地があるか）が可能になる。ただしGPS精度が悪い場合はセクタータイムベースの分析に切り替えること。

## 応用：より高度な使い方

**ラップ比較の自動化**: 同日の複数ランをループ処理して「ベストランとの差分分析」を自動生成できる。「3本目のランで5秒速かった理由を分析して」というプロンプトでセクター別比較レポートが出力される。

**組み合わせると威力を発揮するツール**:
- **MoTeC EDL3ロガー + i2 Pro**: データ品質とチャンネル数を最大化
- **AiM Sports Sports Dash**: 車載リアルタイムフィードバックとの併用
- **GitHub Actions**: スクリプトをCIに組み込み、走行後にファイルをpushするだけで自動実行

## 学生フォーミュラ・レース車両開発への応用

### シナリオ：全エンデュランスセッションの自動データ解析

FSAE大会エンデュランス（22km）の走行後に、翌朝のチームブリーフィングで使えるレポートを自動生成するワークフローを構築する。

**背景理論**:
エンデュランスレースでは走行中にドライバー交代が1回あり、前半・後半でセットアップ評価が変わる。Python + Claude APIを使えば「ドライバーA（前半11km）vs ドライバーB（後半11km）の違い」を自動比較できる。これは従来なら熟練エンジニアが2〜3時間かけて行う分析だ。

**実際に動くコード**:

```python
# === エンデュランス2ドライバー比較ブリーフ生成 ===

def analyze_endurance(df: pd.DataFrame, driver_change_time: float) -> dict:
    """エンデュランスデータを前半/後半に分割して比較統計を計算"""
    df_a = df[df.index <= driver_change_time]   # ドライバーA
    df_b = df[df.index > driver_change_time]    # ドライバーB

    comparison = {
        'driver_a': extract_session_stats(df_a),
        'driver_b': extract_session_stats(df_b),
        'avg_speed_diff': extract_session_stats(df_b)['avg_speed_kmh'] -
                          extract_session_stats(df_a)['avg_speed_kmh'],
        'lateral_g_diff': extract_session_stats(df_b)['max_lateral_g'] -
                          extract_session_stats(df_a)['max_lateral_g']
    }
    return comparison

# ドライバー交代時刻（秒）
comparison = analyze_endurance(df, driver_change_time=680.0)

# Claudeに比較分析を依頼
prompt_compare = f"""
ドライバーAとBのエンデュランスデータを比較分析してください。
ドライバーA平均速度: {comparison['driver_a']['avg_speed_kmh']:.1f} km/h
ドライバーB平均速度: {comparison['driver_b']['avg_speed_kmh']:.1f} km/h
速度差: {comparison['avg_speed_diff']:+.1f} km/h

...（他の統計値）...

各ドライバーへの具体的な改善アドバイスと、次回の車両セットアップ変更を提案してください。
"""
```

**Before / After（エンデュランス後のデータ分析）:**
| 作業 | 従来 | 自動化後 |
|------|------|----------|
| データ整理 | 1時間 | 5分（CSV取得のみ） |
| セクター分析 | 1.5時間 | 自動 |
| ドライバー比較 | 1時間 | 自動 |
| ブリーフ作成 | 1〜2時間 | 自動（30分以内） |
| **合計** | **4.5〜5.5時間** | **35分** |

**学生チームが今すぐ試せる最初のステップ**:

```bash
# 1. 必要パッケージのインストール（2分）
pip install anthropic pandas numpy

# 2. APIキーの設定（Anthropic Console: console.anthropic.com）
export ANTHROPIC_API_KEY="sk-ant-..."

# 3. まず1セッション分のCSVをi2 Proからエクスポートして試す
python analyze_session.py --input session_20260612.csv
```

APIキー取得と最初のスクリプト実行まで15分。まず「手元の過去セッションCSV1本」で試してみることが最初の一歩だ。Claude APIの無料トライアル枠でも十分動作確認できる。
