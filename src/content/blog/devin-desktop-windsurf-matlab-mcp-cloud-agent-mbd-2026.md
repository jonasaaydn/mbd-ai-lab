---
title: "WindsurfがDevin Desktopに生まれ変わった——$26B評価のCognition AIがクラウド自律エージェントをIDEに統合、MATLAB MBDを24時間動かし続ける実践ガイド"
date: 2026-06-22
category: "AI Coding"
tags: ["Devin", "Windsurf", "MATLAB", "MBD", "クラウドAIエージェント", "SWE-1.5"]
tool: "Devin Desktop（旧Windsurf）"
official_url: "https://devin.ai"
importance: "high"
summary: "2026年6月2日、WindsurfがDevin Desktopとして再誕した。Cognition AI（評価額$26B、年収13倍成長）が自律AIエンジニア「Devin」をIDEに直接統合し、あなたがキーボードを叩き続けながら別のクラウドマシンでMATLAB/Simulinkタスクが自律実行される時代が到来。月額$20のProプランで利用可能なSWE-1.5モデルと、MBD開発に特化した実装手順を完全解説する。"
---

## はじめに

MBDエンジニアの日常は「待ち」で埋まっている。Simulinkのシミュレーションが走る間、次のモデル修正の段取りを考えながらも手は止まる。CFD後処理スクリプトが終わるのを眺めながらコーヒーを飲む——その「待ち時間」が実は年間数百時間に積み上がっている。

2026年6月2日、Cognition AIが放った一手がその常識を変えた。**Windsurf が Devin Desktop として生まれ変わり**、自律AIエンジニア「Devin」がIDE本体に直接統合された。あなたが手元の設計を進めながら、クラウド上の別マシンでMATLABコードが自律修正・テスト・検証されている——という並列作業が$20/月から現実になった。

## Devin Desktopとは

**Devin Desktop**（旧Windsurf）は、AIコーディングエージェント開発企業Cognition AIが2026年春にWindsurfを約250億円で買収し、4月15日にWindsurf 2.0としてリリース、6月2日に正式リブランドしたAI統合IDEだ。

### Cognition AIの実力

Cognition AIは2026年5月27日に10億ドルのシリーズD調達を完了し、評価額は**260億ドル**（約3.9兆円）に到達した。同社の年間収益は2025年5月の$37Mから2026年5月には$492Mへと**13倍成長**している数字が、ツールの実用性を物語る。

### Cascade AIとDevinの本質的な違い

従来のWindsurf（Cascade AI）は「エディタ内でAIが支援する」ペアプログラミングモデルだった。Devin Desktopでは**Devinが独自のクラウドマシンを起動し**、そのマシン上でブラウザ操作・コード実行・テスト・バグ修正を完全自律ループで回す。エンジニアはサイドで完全に別の作業を継続できる点が根本的に異なる。

搭載モデル**SWE-1.5**は、Cerebrasと共同開発した推論特化型で最大950トークン/秒を実現。Claude Sonnet 4.5と同等のコーディング性能を13倍の速度で発揮する。

## 実際の動作：ステップバイステップ

Devin DesktopとMATLAB MCPサーバーを連携させてMBDタスクを自律実行する手順を示す。

**前提条件**
- Devin Desktop（devin.ai からインストール、旧WindsurfからのOTAアップデート可）
- Proプラン（$20/月）以上でDevinクラウドエージェントが使用可能
- MATLAB R2024b以降、MATLAB Agentic Toolkit（MCPサーバー）インストール済み

### Step 1：MCP設定（Devin Desktop）

```json
// Devin Desktop > Settings > MCP Servers
{
  "mcp.servers": {
    "matlab": {
      "command": "npx",
      "args": ["-y", "@mathworks/matlab-mcp-server"],
      "env": {
        "MATLAB_PORT": "27184"
      }
    }
  }
}
```

> MATLAB を先にバックグラウンド起動しておく必要がある（`matlab -nosplash &`）。Devinのクラウドマシン上にはMATLABがないため、ローカルMATLABをMCPで橋渡しする構成がポイント。

### Step 2：Agent Command CenterでDevinタスクを投入

Devin 2.0の新機能**Agent Command Center**は、ローカル・クラウド全エージェントをカンバンビューで統合管理する。左サイドバーから開き、以下のようなタスクを投入する。

```
# Agent Command Centerへのタスク入力例
MATLABのMCPツールを使って以下を実行してください：

1. models/suspension/active_susp.slx を open_model スキルで開く
2. パラメータ Kp_spring を 1000〜5000 の範囲で 20 点スイープする
3. 各条件で simulate_model を実行し body_acceleration 出力の最大値を記録
4. 結果を results/spring_sweep_20260622.csv と .png で保存する

完了条件：CSVが20行あり、グラフファイルが存在すること
```

Devinはこれを受け取り、クラウドマシン上でMATLAB MCPに接続して**完全自律で実行**する。

### Step 3：進捗確認

上の実行を確認すると、以下のようなステータスが返ってくる：

```
Agent Command Center ステータス:
[完了] open_model — active_susp.slx 読み込み成功
[実行中 12/20] simulate_model — Kp=2800 シミュレーション中...
[待機] CSV保存, グラフ生成
```

### よくあるエラーと対処

| エラー | 原因 | 解決法 |
|--------|------|--------|
| `MCP connection refused` | MATLABが未起動 | `matlab -nosplash &` で先に起動 |
| `Session timeout (30min)` | タスクが長すぎる | タスクを5〜10ステップに細分化して投入 |
| `File path error` | 相対パス/絶対パスの混在 | プロンプトにフルパスを明記する |

## Before / After 比較

| 項目 | 従来（手動MBD開発） | Devin Desktop導入後 |
|------|---------|---------|
| PIDゲイン調整+検証 | 2〜3時間（待機あり） | 40〜60分（並行作業中） |
| パラメータスイープ20点 | エンジニアが逐次実行 | Devinが夜間に自律完了 |
| テスト結果確認 | 翌朝手動チェック | 完了通知＋レポート自動生成 |
| 月額コスト | 0円（時間は自腹） | $20（Proプラン） |

**実測例**：20点のばね剛性パラメータスイープ（各シミュレーション約8分）は従来なら翌日に食い込む作業量だが、Devinに投入して帰宅・就寝中に完了した事例が複数報告されている。

## 実践コード例

Devin APIを使いタスクをプログラム的に投入するテンプレートを示す。

**前提**: `pip install requests` 済み、Devin API Keyを取得済み（devin.aiダッシュボードから発行）。

```python
# === ステップ1: デフォルトのMBDタスクテンプレートを定義 ===
import requests, json

DEVIN_API_KEY = "your_api_key_here"
BASE_URL = "https://api.devin.ai/v1"

# === ステップ2: パラメータスイープタスクをDevinに送信 ===
def submit_matlab_sweep_task(model_path, param_name, values, output_signal):
    """Devinにパラメータスイープタスクを送信する"""
    task_prompt = f"""
MATLAB MCPツールを使って {model_path} の {param_name} を
{values} の各値でシミュレーションし、{output_signal} の最大値を記録してください。
結果は results/sweep_result.csv に保存してください。
"""
    response = requests.post(
        f"{BASE_URL}/sessions",
        headers={"Authorization": f"Bearer {DEVIN_API_KEY}"},
        json={"prompt": task_prompt, "model": "swe-1.5"}
    )
    return response.json()["session_id"]

# === ステップ3: 実行してセッションIDを取得 ===
sid = submit_matlab_sweep_task(
    model_path="models/aero/front_wing.slx",
    param_name="flap_angle_deg",
    values=list(range(5, 35, 5)),   # 5〜30度を5度刻み
    output_signal="downforce_N"
)
print(f"Devinタスク開始 — セッションID: {sid}")
# >> Devinタスク開始 — セッションID: sess_a3k9x21...
```

ここまで動いたら、次はDevin APIを使ってCI/CDパイプラインにMATLABタスクを組み込んでみましょう。

## 注意点・落とし穴

- **MATLABライセンスはローカルに必要**: Devinのクラウドマシン上でMATLABは動かせないため、ローカルMATLABをMCPサーバー経由でDevinが操作する構成が必須
- **Devinクラウドは$20/月Proから**: 旧Windsurf時代の無料版Cascadeとは異なり、Devinクラウドエージェントは有料プランのみ
- **SWE-1.5の得意・不得意**: テキストベースのコードファイル（.m, .py, .json）の読み書きは得意。バイナリ形式の.slxファイルの直接編集は非対応（MCPツール経由でSimulinkを操作する必要あり）
- **タスク分解が鍵**: Devinは1タスクで複雑すぎると途中でつまずく。3〜5ステップ以内のシンプルなタスクに細分化して投入する方が成功率が上がる

## 応用：より高度な使い方

**Agent Command Center**の真価は複数Devinセッションの並列管理にある。

```
[Agent 1] フロントウィング空力スイープ（15ケース）   — 実行中
[Agent 2] PIDゲインROBUST最適化（モンテカルロ100回）  — 実行中
[Agent 3] HILテストスクリプトのデバッグ               — 完了✓
```

3体のエージェントが並列稼働する間、あなたは設計レビューに集中できる。Devin + Cursor + Claude Codeのハイブリッド運用で、ローカル作業・リモート重計算・リアルタイム対話を役割分担する戦略も有効だ。

## 今すぐ試せる最初の一歩

```bash
# Windsurf既存ユーザー：アプリを開いてOTAアップデートを確認するだけ
# 新規インストール：devin.ai から Devin Desktop をダウンロード
```

インストール後に$20/月Proプランへ登録し、「過去のMATLABスクリプト1本の関数コメントを全て日本語で書き直してください」とAgent Command Centerに投入するところから始めてみよう。

---

## 学生フォーミュラ・レース車両開発への応用

### シナリオ：テスト走行後の「一晩自動解析」でチームを変える

学生チームが直面する共通の問題がある。「走行会の夜、疲弊したメンバーが深夜まで手動でデータを整理している」だ。翌朝のチームミーティングまでに解析が間に合わず、次の走行判断が勘頼みになる——Devin Desktopはこの悪循環を断ち切る。

### 背景理論

Devinのクラウドエージェントは、非同期で動作するスタンドアロンのAIソフトウェアエンジニアだ。「やること」を自然言語で渡すと、クラウドマシンを起動し、MATLAB MCPを通じてローカルのMATLABを遠隔操作しながら、ファイル読み込み→計算→グラフ生成→レポート作成の全工程を自律実行する。エンジニアリングで言えば「常駐の非同期ジュニアエンジニア」に相当する。

### 実際に動くタスクプロンプト（コピペで使える）

**前提条件**: Devin Desktop Proプラン、MATLAB MCPサーバー起動済み、走行ログが `data/test_YYYYMMDD/` に保存済み。

```
# Agent Command Centerに貼り付けるタスク（走行会後に投入）
今日のテスト走行（2026-06-22）のデータを解析してください。

## データ場所
data/test_20260622/telemetry.csv
（列：time_s, lap_num, speed_kmh, throttle_pct, brake_pct,
  suspension_FL_mm, suspension_FR_mm, eng_temp_degC）

## MATLABで実行する解析（scripts/フォルダのスクリプトを使用）
1. load_telemetry.m を実行してデータを読み込む
2. lap_time_stats.m で各ラップのタイム・平均速度を計算する
3. suspension_balance.m でF/Rサスペンションバランスを可視化する
4. eng_temp_monitor.m でエンジン温度の異常ラップを検出する

## 出力
results/morning_report_20260622.pdf にグラフ4枚+数値サマリーを保存する
改善事項があれば recommendations_20260622.md に箇条書きで記載する

完了したら「解析完了」と Agent Command Center に表示してください。
```

### Before / After 比較

| 項目 | 従来（手動解析） | Devin Desktop使用後 |
|------|------|------|
| 走行後の解析時間 | 2〜4時間（深夜作業） | 0分（Devinが自律実行中に就寝） |
| 翌朝ミーティング準備 | 徹夜で間に合わせ or スキップ | 完成レポートでスタート |
| テスト走行頻度 | 月2回（解析が追いつかない） | 週1回対応可能 |
| メンバーの疲弊 | 走行会後に毎回深夜作業 | 翌朝の議論に集中できる |

### 学生チームが今すぐ試せる最初のステップ

1. **devin.ai** でDevin Desktopをインストール（5分）
2. **$20/月Pro**プランに登録（学生ディスカウントあり要確認）
3. 最初のタスクとして「過去ログCSV1本のラップタイムをMATLABで可視化してPNG保存して」と入力

これだけで最初の自律解析が動き始める。翌朝には結果が出ている。
