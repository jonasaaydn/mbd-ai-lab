---
title: "90分→15分・専門家と97.8%一致——Siemens Simcenter Testlab 2506のAIがNVHモーダル解析の「職人技」を自動化する"
date: 2026-05-23
category: "CAE / Simulation AI"
tags: ["NVH", "Modal Analysis", "Siemens", "Simcenter", "振動解析", "構造ダイナミクス", "レース車両", "AI自動化"]
tool: "Siemens Simcenter Testlab"
importance: "high"
summary: "Siemensが2025年6月リリースのSimcenter Testlab 2506で搭載したAI Modal Dashboardは、NVH専門家でなければ判断できなかった安定化ダイアグラムのポール選定を完全自動化し、解析時間を90分から15分に短縮（最大7倍速）、専門家との一致率97.8%・矛盾率0%を実現した。レース車両の構造認証・共振管理において、スキルボトルネックを解消する決定的なアップデートだ。"
---

## はじめに

モーダル解析という作業をご存じだろうか。サスペンション部品、シャシー構造、パワートレインマウント——レース車両のあらゆる構造部品の**固有振動数・減衰比・モード形状**を実測によって同定する、NVH（Noise, Vibration, Harshness）検証の根幹工程だ。

問題は、この作業の核心部分が長年「職人技」であり続けてきたことにある。測定後に生成される「安定化ダイアグラム」には、本物の構造モードと数値的なゴーストポールが混在して表示される。どのポールが真の固有振動数を表すかを正確に選別できるのは、数百件以上の経験を積んだNVH専門家だけだった。この判断に1件あたり平均90分。専門家が不在のときは作業が止まり、開発ループが詰まる。

Siemens Digital Industriesは2025年6月リリースの**Simcenter Testlab Neo 2506**で、この問題を根本的に解決した。

## Simcenter Testlab 2506 AI Modal Dashboardとは

Simcenter Testlab Neoは、Siemensが提供する試験計測・データ解析統合プラットフォームだ。加速度センサー・力センサー・マイクを使った実物試験データをリアルタイムで収録し、FRF（周波数応答関数）の演算からモーダルパラメータの同定まで一気通貫で実行できる。

2506バージョン（バージョン命名は「西暦下2桁＋月」）で追加されたのが**AI Modal Dashboard**だ。従来のEFDD（Enhanced Frequency Domain Decomposition）やSSI（Stochastic Subspace Identification）といった同定アルゴリズム自体は変わらない。変わったのは、その出力である安定化ダイアグラムの解釈を**AIが自動で行う**ようになった点だ。

AIは**機械学習とルールベースシステムのハイブリッドアプローチ**を採用しており、Siemensが40年以上蓄積したモーダル解析のドメイン知識を学習ベースで実装している。以下の3ステップを自動実行する：

1. **ポールのクラスタリング**: 安定化ダイアグラム上の全ポールをAIが自動分類し、各クラスターから代表ポールを選定
2. **独立性検証**: 選定された各ポールが互いに独立した物理モードを表しているか検証
3. **ゴーストポールの除去**: 数値的に発生した偽ポールを自動排除し、完全なモーダルモデルを即時出力

## 実際の動作：ステップバイステップ

測定フェーズ（従来と変わらない）：

```
1. 試験体（例：サスペンションサブフレーム）に加速度センサーを取り付け
2. インパクトハンマーまたは電磁シェーカーで励振
3. Simcenter Testlab Neoで時刻歴データを収録
4. FRF行列を自動演算（H1, H2, Hv推定量から選択）
```

解析フェーズの変化（ここが革命的に変わった）：

```
【従来】
5a. 安定化ダイアグラムを表示
6a. 専門家が目視で各ポールを確認（安定ポール＝振動数・減衰・モード形状が
    次数をまたいで安定していることを確認）
7a. 疑わしいポールを1つずつクリックして手動選定 → 議論・再選定
8a. モーダルパラメータを確定
   → 所要時間: 60〜90分（専門家のみ実施可能）

【AI Modal Dashboard使用後】
5b. AI Modal Dashboardを起動（ボタン1クリック）
6b. AIが安定化ダイアグラムを自動解釈（所要時間: 2〜5分）
7b. AIが選定した結果をエンジニアが確認・必要なら微修正
8b. モーダルパラメータを確定
   → 所要時間: 10〜15分（初年次エンジニアでも実施可能）
```

## Before / After 比較

| 指標 | 従来（熟練NVH専門家が手動実施） | AI Modal Dashboard 使用後 |
|---|---|---|
| 1件あたり解析時間 | 60〜90分 | 10〜15分（**最大7倍短縮**） |
| 必要スキルレベル | 10年以上の経験が理想 | 初年次エンジニアでも実施可能 |
| 専門家との一致率 | — | **97.8%** |
| 専門家との矛盾率 | — | **0%** |
| Transfer Path Analysis（TPA）データ準備時間 | 基準値 | **最大40%削減** |
| コンポーネントキャラクタリゼーション期間 | 数週間 | 数時間 |

※ 数値はSiemens公表のSimcenter Testlab 2506リリースノートおよび独立レビューによる

## 実践コード例

Simcenter Testlab Neoは自動化APIを提供しており、Pythonスクリプトで解析パイプラインをバッチ実行できる。以下は複数の測定ファイルに対してAIモーダル解析を自動実行し、固有振動数リストをCSVに書き出す例だ（Testlab Python APIを使用）。

```python
# Simcenter Testlab Python API (Testlab Neo 2506以降)
# 前提: Testlab Python APIがインストール済み
from testlab_api import TestlabSession, ModalAnalysisAI
import pandas as pd

session = TestlabSession(host="localhost", port=49999)

atf_files = [
    r"C:\Measurements\subframe_config_A.atfx",
    r"C:\Measurements\subframe_config_B.atfx",
    r"C:\Measurements\subframe_config_C.atfx",
]

results = []

for atf_path in atf_files:
    project = session.open_project(atf_path)
    frf_set = project.get_frf_dataset("FRF_Matrix_H1")

    # AI Modal Dashboard を呼び出し
    modal_ai = ModalAnalysisAI(frf_set)
    modal_result = modal_ai.run(
        freq_range=(5.0, 500.0),    # 解析周波数帯域 [Hz]
        max_order=60,                # 最大モデル次数
        stability_threshold=0.01,   # 安定化判定閾値（1%）
        auto_select=True             # AIによる自動ポール選定を有効化
    )

    for mode in modal_result.modes:
        results.append({
            "file": atf_path.split("\\")[-1],
            "mode_index": mode.index,
            "natural_freq_hz": round(mode.natural_frequency, 3),
            "damping_ratio_pct": round(mode.damping_ratio * 100, 3),
            "mac_value": round(mode.mac_value, 4),
        })

    session.close_project()

df = pd.DataFrame(results)
df.to_csv("modal_results_batch.csv", index=False, encoding="utf-8-sig")
print(f"完了: {len(results)} モードを {len(atf_files)} 件のファイルから抽出")
```

出力例（`modal_results_batch.csv`）：

```csv
file,mode_index,natural_freq_hz,damping_ratio_pct,mac_value
subframe_config_A.atfx,1,23.412,1.823,0.9987
subframe_config_A.atfx,2,47.891,2.156,0.9941
subframe_config_B.atfx,1,25.034,1.711,0.9993
```

このバッチスクリプトをCI/CDパイプラインやGitHub Actionsに組み込めば、試験完了後の解析を自動起動する仕組みが作れる。

## 注意点・落とし穴

**高減衰系・密連成モードには過信は禁物**。減衰比が10%を超えるゴム系マウントや複合材料部品では、安定化ダイアグラム自体の見通しが悪くなるため、AIの自動選定結果を必ず専門家が確認する体制を取ること。公開ベンチマークは主に1〜5%減衰の金属構造を対象としており、高減衰系での精度は別途検証が必要だ。

**ライセンス構成の確認が必須**。AI Modal Dashboard機能はSimcenter Testlab Neo 2506以降の「Dynamic Testing」製品ライセンスに含まれるが、旧バージョン（Testlab Classic）では利用不可。また「Advanced Modal Analysis」オプションライセンスが別途必要な場合があるため、Siemens販売店に事前確認すること。

**バージョン命名の混乱に注意**。「2506」は2025年6月リリースを意味するSiemensの年月命名規則（年下2桁＋月2桁）であり、製品バージョン番号ではない。混同すると資料検索やサポート問い合わせでハマる。

## 応用：より高度な使い方

**Simcenter 3D（FEMソルバー）との実験/解析相関（EMA/FEA Correlation）**がこの機能の真価を引き出す。実測モーダルパラメータをAIで自動抽出し、SimcenterのFEMモデルとMAC（Modal Assurance Criterion）相関を自動演算するパイプラインを構築すれば、設計変更ごとの試験→FEM更新サイクルが劇的に短縮される。レース車両の軽量化設計で繰り返し発生する「構造変更後の構造健全性確認」が、半日仕事から2時間の作業になる。

もう一つの応用が**Transfer Path Analysis（TPA）との組み合わせ**だ。2506ではAutomated Component Model ExtractorがTPA向けに大幅強化され、ブロックドフォース測定とインピーダンスFRFの取得・処理が自動化された。従来数週間かかったコンポーネントキャラクタリゼーションが数時間で完了し、室内騒音やステアリングコラム振動の発生源特定スピードが根本的に変わる。

## 今すぐ試せる最初の一歩

Siemensの販売代理店にSimcenter Testlab Neo 2506の評価ライセンス（通常30日間）を申請し、過去に手動で解析した既存ATFまたはUFF形式の測定データを取り込んで、AI Modal DashboardとManual Pickingの結果を並べて比較してみること。差分が出る箇所こそ、専門家が暗黙知で処理していたポイントであり、自社NVHナレッジの可視化機会にもなる。
