---
title: "【学生フォーミュラ実践】Tomorrow.io Weather APIでサーキット天気を分単位で予測し、タイヤ選択・ピット判断を定量化する"
date: 2026-06-18
category: "Race Engineering Use Cases"
tags: ["学生フォーミュラ", "Tomorrow.io", "天気予報API", "レース戦略", "タイヤ選択", "データ解析"]
tool: "Tomorrow.io"
official_url: "https://www.tomorrow.io/"
importance: "high"
summary: "学生フォーミュラチームがTomorrow.io Weather APIを使い、競技当日のサーキット周辺の降雨確率を分単位で取得して、ウェット/ドライタイヤ選択の判断基準を定量化する方法を解説します。感覚頼りの天気判断をデータドリブンな戦略フレームワークに変換できます。"
---

## この記事を読む前に

Tomorrow.ioとDeepSky気象AIの技術概要は「[FIA × Tomorrow.io DeepSkyがF1天気予報を根本から変える](/blog/tomorrow-io-deepsky-f1-weather-ai-pit-strategy-2026)」で紹介済みです。この記事では**学生フォーミュラでの実践的な使い方**に絞り、無料プランで使えるAPIをPythonで叩き、当日の降雨リスクをリアルタイムに評価するところまで扱います。

## 学生フォーミュラにおける課題

学生フォーミュラの動的審査（エンデュランス・アクセラレーション・スキッドパッド）は屋外で行われ、天候変化が直接スコアに影響する。

- 競技前日にスマホのデフォルト天気アプリを確認する程度で、**会場ピンポイントの分単位予測**を行っているチームはほとんどいない
- 「雨が降り始めてからタイヤを交換する」決断に**平均3〜5分かかる**一方、局所的スコールは数分で状況が激変する
- ウェットタイヤへの交換コストは走行中なら実質的なタイムロス——**正確な5〜10分前予測があれば先手が打てる**

Tomorrow.ioのWeather APIは毎分更新の降雨確率（1時間先まで分単位）をHTTPで取得でき、**無料プランで1日1000コール**可能だ。競技当日の気象モニタリングダッシュボードとして十分活用できる。

## Tomorrow.ioを使った解決アプローチ

Tomorrow.ioのDeepSkyは**低軌道衛星コンステレーション＋AIモデル「ICGen」**により、通常の気象サービスより2〜3倍高い局所降雨予測精度を持つ（特に突発的なスコールに強い）。

学生チームが活用すべき主要APIエンドポイント：
- `/v4/timelines`：任意地点の分単位降雨強度（`precipitationIntensity`）と確率（`precipitationProbability`）を取得
- `/v4/realtime`：現時点のリアルタイム気象データ

これに**タイヤ選択判断ロジック**を組み合わせ、「10分後の降雨確率が60%を超えたらアラート」というしきい値ベースの意思決定システムを構築する。しきい値自体は競技場所・天候パターンに合わせてチームごとに調整できる。

## 実装：ステップバイステップ

### 前提条件

- Tomorrow.io APIキー（無料登録：https://www.tomorrow.io/signup）
- Python 3.10+、`requests`、`pandas`、`matplotlib`
- 競技会場の緯度・経度（Google Mapsで小数点6桁まで取得）

```python
# === ステップ1: Tomorrow.io APIで分単位降雨予測を取得 ===
# 競技会場（例: 静岡エコパ周辺）の1時間分の気象データを取得する

import requests
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime, timezone

API_KEY = "YOUR_TOMORROW_IO_API_KEY"   # 無料登録で取得

# 競技会場座標（静岡・エコパ付近の例）
VENUE_LAT = 34.7697
VENUE_LON = 137.9298

params = {
    "location": f"{VENUE_LAT},{VENUE_LON}",
    "fields": [
        "precipitationIntensity",    # 降雨強度（mm/hr）
        "precipitationProbability",  # 降雨確率（0〜100）
        "temperature",               # 気温（°C）
        "windSpeed"                  # 風速（m/s）
    ],
    "timesteps": "1m",       # 1分単位で取得
    "startTime": "nowMinus30m",
    "endTime": "nowPlus1h",  # 現在から1時間先まで
    "units": "metric",
    "apikey": API_KEY
}

resp = requests.get("https://api.tomorrow.io/v4/timelines", params=params)
resp.raise_for_status()
intervals = resp.json()["data"]["timelines"][0]["intervals"]

# DataFrameに整形する
records = []
for iv in intervals:
    records.append({
        "time": iv["startTime"],
        "precip_intensity": iv["values"]["precipitationIntensity"],
        "precip_prob":      iv["values"]["precipitationProbability"],
        "temperature":      iv["values"]["temperature"],
        "wind_speed":       iv["values"]["windSpeed"]
    })

df = pd.DataFrame(records)
df["time"] = pd.to_datetime(df["time"])
df = df.sort_values("time").reset_index(drop=True)

print(f"取得データ件数: {len(df)} 分間")
print(df[["time", "precip_prob", "precip_intensity"]].tail(10).to_string(index=False))

# === ステップ2: タイヤ選択判断ロジックを実装 ===
# 降雨強度・確率に基づいてドライ/ウェットの推奨を自動判定する

THRESHOLD_PROB = 60    # 降雨確率がこの値（%）を超えたらウェット準備推奨
THRESHOLD_INT  = 1.0   # 降雨強度がこの値（mm/hr）を超えたらウェット確定

def tire_decision(row):
    if row["precip_intensity"] >= THRESHOLD_INT:
        return "ウェット確定"           # 既に雨が降っている状態
    elif row["precip_prob"] >= THRESHOLD_PROB:
        return "ウェット準備推奨"       # 近い将来に雨の確率が高い
    else:
        return "ドライ継続"

df["tire_recommendation"] = df.apply(tire_decision, axis=1)

# === ステップ3: 競技当日ダッシュボードを生成して保存 ===

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 7), sharex=True)

# 上段: 降雨強度グラフ
ax1.bar(df["time"], df["precip_intensity"], width=0.0005,
        color="steelblue", alpha=0.7, label="降雨強度 (mm/hr)")
ax1.axhline(y=THRESHOLD_INT, color="red", linestyle="--",
            label=f"ウェット確定しきい値 ({THRESHOLD_INT} mm/hr)")
ax1.set_ylabel("降雨強度 (mm/hr)")
ax1.legend(loc="upper left")
ax1.set_title("競技会場 気象モニター")

# 下段: 降雨確率グラフ
ax2.plot(df["time"], df["precip_prob"], color="darkorange", lw=2, label="降雨確率 (%)")
ax2.axhline(y=THRESHOLD_PROB, color="red", linestyle="--",
            label=f"ウェット準備しきい値 ({THRESHOLD_PROB}%)")
ax2.fill_between(df["time"], df["precip_prob"], THRESHOLD_PROB,
                 where=(df["precip_prob"] >= THRESHOLD_PROB),
                 alpha=0.3, color="red", label="要注意帯")
ax2.set_ylabel("降雨確率 (%)")
ax2.set_xlabel("時刻（UTC）")
ax2.legend(loc="upper left")

plt.tight_layout()
plt.savefig("weather_dashboard.png", dpi=150)
print("ダッシュボード保存: weather_dashboard.png")

# === ステップ4: 直近の判断状況をコンソールに出力 ===

now_utc = pd.Timestamp.now(tz="UTC")
upcoming = df[df["time"] >= now_utc].head(10)
print("\n=== 今後10分のタイヤ推奨 ===")
print(upcoming[["time", "precip_prob", "precip_intensity", "tire_recommendation"]]
      .to_string(index=False))
```

実行結果（例）：
```
取得データ件数: 90 分間

=== 今後10分のタイヤ推奨 ===
                  time  precip_prob  precip_intensity tire_recommendation
2026-06-18 03:01:00+00:00         35.0              0.0          ドライ継続
2026-06-18 03:02:00+00:00         42.0              0.0          ドライ継続
2026-06-18 03:03:00+00:00         58.0              0.2     ウェット準備推奨
2026-06-18 03:04:00+00:00         73.0              0.8     ウェット準備推奨
2026-06-18 03:05:00+00:00         81.0              1.4       ウェット確定
```

「03:03」時点でウェット準備推奨が発出されており、実際に雨が降り始める2分前に先手を打てていることが分かる。

## 学生フォーミュラ・レース車両開発への応用

### 具体的なシナリオ

全日本学生フォーミュラ（静岡・エコパ）のエンデュランス当日、開始30分前から天気が怪しくなり始めた。従来のチームはスマホアプリの「3時間後の天気」しか見ておらず、ドライタイヤで走り始めたところ開始10分で雨が降り出し、タイヤ交換タイムロスで大きく順位を落とした。

Tomorrow.io APIを使えば、会場ピンポイントの分単位予測を取得し、「開始15分後に降雨確率70%」というデータから**スタート前にウェットタイヤを選択**できる。

### 背景理論

Tomorrow.ioのDeepSkyが使う**ICGen**は、衛星レーダー・地上観測・大気数値モデルを融合したアンサンブル手法で降雨場を予測する。従来の気象モデルが数kmスケールの格子で解くのに対し、DeepSkyは500mスケールの解像度を持つ（ハイパーローカル予測）。学生フォーミュラのサーキット半径は数百メートル程度なので、この解像度差は決定的な優位性になる。

### Before / After 比較

| 項目 | 従来（スマホアプリ） | Tomorrow.io API導入後 |
|------|---------------------|----------------------|
| 予測時間解像度 | 1時間単位 | 1分単位 |
| 空間解像度（局所性） | 数km格子 | 約500m（DeepSky衛星AI） |
| タイヤ交換の先行判断時間 | 0〜2分（目視後） | 5〜15分前にアラート |
| 競技中の確認頻度 | 手動・不定期 | 毎分自動更新 |
| 判断根拠 | 担当者の経験・感覚 | しきい値ベースで定量化 |
| APIコスト | — | 無料枠で1日1000コール |

### 学生チームが今すぐ試せる最初のステップ

1. Tomorrow.ioに無料登録してAPIキーを取得する
2. 次回の練習走行会場の緯度・経度をGoogle Mapsで調べる
3. 走行前日に上記コードを実行して翌朝の降雨予報を確認する

## よくあるエラーと対処

| エラー | 原因 | 対処 |
|--------|------|------|
| `429 Too Many Requests` | 無料枠（1000コール/日）超過 | `timesteps`を`"1m"`から`"5m"`に変更してコール数を削減する |
| `400 Bad Request` | `location`フォーマット誤り | `"34.7697,137.9298"`の「緯度,経度」順で指定する |
| 降雨確率が常に0% | 会場座標が誤り | Google Mapsで小数点6桁の正確な座標を再取得する |
| データが古い | タイムゾーン処理のズレ | `startTime`を`"nowMinus10m"`に変更してデバッグする |

## 今週の学生チームへの宿題

**今週末の練習走行前日に、Tomorrow.ioの無料アカウントを作り、走行予定会場の座標をAPIに渡して降雨予報を取得してみてください。** スマホアプリより詳細なデータが5分以内に取れます。しきい値（`THRESHOLD_PROB`）の数値を変えながら、自チームのリスク許容度に合わせた判断基準を探ってみてください。
