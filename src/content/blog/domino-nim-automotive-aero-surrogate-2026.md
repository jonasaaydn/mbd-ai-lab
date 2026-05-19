---
title: "STL1枚→空力場を500倍速推論——NVIDIA DoMINO NIMをレース開発フローに組み込む"
date: 2026-05-19
category: "CAE / Simulation AI"
tags: ["CFD", "サロゲートモデル", "NVIDIA", "PhysicsNeMo", "NIM", "空力", "F1", "レースエンジニアリング"]
tool: "NVIDIA DoMINO NIM"
official_url: "https://github.com/NVIDIA/physicsnemo-cfd"
importance: "high"
summary: "NVIDIAがNIM（推論マイクロサービス）として公開したDoMINOは、STLファイル1枚を受け取り、車体の表面圧力・壁面せん断応力・周囲の速度場を数秒で返す。RANS初期化比500倍速。元メルセデスF1空力エンジニアが実務応用を発表した2026年の注目CFDサロゲート技術。"
---

## 「昨日入れた修正の結果が今週月曜に届く」を終わらせる

GT3チームを想定しよう。フロントスプリッター形状を10mm変えるバリアントが5案。RANSソルバーを1ケース8〜24時間回す計算環境では、週に回せる形状は数件が限界だ。風洞時間はFIAレギュレーションで制限され、計算予算も青天井ではない。

この「設計サイクルのボトルネック」に直接刺さるのが、NVIDIAが2025年末にNIM（NVIDIA Inference Microservice）として公開した**DoMINO**（Decomposable Multi-Scale-Iterative Neural Operator）だ。

STLファイル1枚とストリーム速度を渡すと、車体の**表面圧力・壁面せん断応力・周囲の速度場と圧力場**がまとめて返ってくる。処理時間は数秒〜数分。元メルセデスF1空力エンジニアのPablo Hermoso Moreno（現NVIDIA Solutions Architect）がCFDAM Barcelona 2026で「レース空力エージェントパイプライン」として発表し、一気に業界の注目を集めた。

---

## DoMINOの技術的な中身

arXiv論文（2501.13350）によると、DoMINOは次の特徴を持つ：

- **点群ベースの幾何学深層学習** — STLのサーフェスを点群として取り込み、局所計算ステンシルを動的に構築してNavier-Stokes解を近似
- **重いダウンサンプリング不要** — 従来のGNNサロゲートが抱える「粗いメッシュ変換で細部を失う」問題を回避
- **大規模データで事前学習済み** — DrivAerML（公開）+ GMの実車600超バリアントデータセットで訓練。SAE 2026論文（2026-01-0600）で独立検証済み

PhysicsNeMo v2.0（PyTorch Geometric統合）の上に構築されており、オープンソースでファインチューニング可能。NIMコンテナはNGCカタログから取得できる。

---

## 速度比較

| 手法 | 時間 | 計算資源 |
|------|------|---------|
| RANS（定常解析） | 8〜24時間 | 64〜256コア |
| DDES（非定常） | 40時間以上 | 1,536コア |
| DoMINO NIM（表面）| 5〜60秒 | GPU 1枚 |
| DoMINO NIM（体積場込）| 1〜5分 | GPU 1枚 |

「500倍以上の高速化」という数字はRANS初期化との比較。DoMINOの推奨ワークフローは **スクリーニング（DoMINO）→上位10件だけフルCFD** という2段階フィルタだ。1週間で評価できる形状バリアント数が5件から500件以上に変わる。

---

## REST APIの呼び出し例（Python）

NIMコンテナを起動すると、`/v1/infer` などのREST APIが生える。以下はPythonでSTLを投げて表面圧力を取得する最小実装：

```python
import requests

# STLをmultipart form-dataで送信
with open("front_splitter_v3.stl", "rb") as stl_file:
    response = requests.post(
        "http://localhost:8000/v1/infer/surface",
        files={"design_stl": stl_file},
        data={
            "stream_velocity": "30.0",   # m/s（例: 108 km/h）
            "stencil_size": "1",
            "point_cloud_size": "500000"
        },
        timeout=120
    )

result = response.json()
# 返却例: {"surface_pressure": [...], "wall_shear_stress": [...], "drag_coefficient": 0.312}
print(f"推定Cd: {result['drag_coefficient']:.4f}")
```

体積場（velocity field・pressure field）が必要なら `/v1/infer/volume`、両方まとめて取りたいなら `/v1/infer` を使う。カスタム点群（.npy形式）を `point_cloud` パラメータで渡すことも可能で、セクターごとの精度を集中的に高められる。

---

## 注意点：できないこと・要検証事項

- **形状外挿は精度劣化** — 訓練分布外の形状（例: LMDhのアクティブ可動フラップ、異形リア拡散器）では信頼性が下がる。形状ファミリーが大きく外れる場合はファインチューニングを行うこと
- **非定常現象は範囲外** — 渦の剥離タイミング・フラッタなど非定常空力の予測は現バージョン（v2.0）の対象外
- **FIA制限風洞計算には使えない** — 公認CFDソルバーの代替にはならない。あくまで開発初期スクリーニング用
- **GPU必須** — CPU推論はサポートされていない。A100/H100推奨だが、RTX 4090でも動作報告あり

---

## 今すぐ試せる最初の一歩

1. **GitHubでファインチューニング例を確認**: [https://github.com/NVIDIA/physicsnemo-cfd](https://github.com/NVIDIA/physicsnemo-cfd) にDoMINO NIMのnotebookあり
2. **NGCからコンテナ取得**（無料アカウント要）:
   ```
   docker pull nvcr.io/nvidia/physicsnemo/domino-automotive-aero:latest
   ```
3. **DrivAerML形状で動作確認**: Hugging Faceで公開されている600+バリアントを使えばゼロコストで試せる
4. **手持ちSTLを投入**: Solidworksのエクスポートをそのまま使える（単一ソリッド形式）

2026年の空力開発で「CFDは最終確認専用ツール」という役割分担が始まっている。DoMINO NIMはその入口に立つツールだ。
