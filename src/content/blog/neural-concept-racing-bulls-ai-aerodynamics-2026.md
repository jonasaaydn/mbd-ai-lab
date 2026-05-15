---
title: "F1チームがAI空力サロゲートモデルを本格採用——Racing BullsとNeural Conceptが変えたCFDワークフロー"
date: 2026-05-15
category: "Race Engineering Use Cases"
tags: ["F1", "空力開発", "サロゲートモデル", "GNN", "CFD", "Neural Concept", "2026年規制", "Racing Bulls"]
tool: "Neural Concept"
official_url: "https://www.neuralconcept.com"
importance: "high"
summary: "Racing Bulls（VCARB）が2026年F1新レギュレーションへの対応でNeural ConceptのAIサロゲートモデルを本格導入。従来CFD1ランが数時間かかっていた空力評価を0.1秒以下まで圧縮し、数千バリアントを数日で探索できるようになった実態を解説する。"
---

## 2026年F1規制変更が「AI前提」の開発環境を強制した

2026年F1技術レギュレーションは過去10年最大の刷新だ。車体は全長・全幅ともに縮小、ダウンフォースを削減しながらも可動式フロント/リアウィングを備え、空力の「最適点」が過去のデータベースとまったく変わった。

問題はFIAが課す**風洞テスト時間の制限**だ。コンストラクターズランキング下位ほど使える風洞時間が増えるルールはあるが、開発リソースが限られた中堅チームにとって「物理試験で全バリアントを評価する」のは不可能に近い。

この制約を突破するために Racing Bulls (Visa Cash App RB / VCARB) が2025年6月に正式契約したのが、スイスのAIスタートアップ**Neural Concept**だ。

## Neural ConceptのGNNサロゲートとは何か

Neural Conceptの技術の核心は**測地線畳み込みニューラルネットワーク（Geodesic CNN）**による代理モデルだ。過去に実施した高精度CFDシミュレーション結果をトレーニングデータとして学習し、新しい形状ジオメトリを入力すると圧力・摩擦力分布と統合空力特性（CL/CD）を予測する。

| 評価方法 | 1ケースの所要時間 | 1日で評価可能な数 |
|---------|----------------|----------------|
| 高精度RANS CFD（商用ソルバー） | 4〜12時間 | 2〜6ケース |
| 低解像度CFD（粗メッシュ） | 30〜60分 | 24〜48ケース |
| Neural Concept AIサロゲート | **0.1秒以下** | **数万ケース** |

Racing Bullsのエンジニアリング責任者によると、「数週間かかっていた設計探索フェーズが数日になった」——これは誇張ではなく、1日で評価できるバリアント数が3桁変わった結果だ。

## 何が「サロゲートモデル」で何が「CFD」のままなのか

重要な注意点がある。AI予測は「CFDを置き換える」のではなく**前工程のスクリーニングに特化**している。

```
[設計アイデア群（数千）]
       ↓ Neural Concept AIサロゲート（0.1秒/ケース）
[上位N%に絞り込み（数十）]
       ↓ 低解像度CFD（30分/ケース）
[候補形状（数件）]
       ↓ 高精度RANS + 風洞（4〜12時間/ケース）
[最終確認]
```

このファネル構造により、**高価な風洞時間と計算リソースを本当に有望な形状にだけ投入**できる。サロゲートモデルが「正しい答え」を出す必要はなく「外れ値を排除する」だけでいい。

## 中規模チームがAIサロゲートを独自構築するには

Neural ConceptはSaaSプラットフォームであり、F1チームのような大規模CFDデータが前提だ。しかし同様のアプローチをゼロから構築することは技術的に可能だ。

```python
# PhysicsNeMoでCFDデータから簡易サロゲートを訓練する例
import torch
from physicsnemo.models.fno import FNO  # Fourier Neural Operator

# モデル定義（CFD入力:形状パラメータ5次元 → 出力:Cl, Cd）
model = FNO(
    in_channels=5,   # 形状パラメータ（例:フロントウィング角度、ストール量等）
    out_channels=2,  # Cl, Cd
    decoder_layers=2,
    decoder_layer_size=128,
)

# 学習ループ（既存CFD結果100〜1000ケースが最低ライン）
optimizer = torch.optim.Adam(model.parameters(), lr=1e-4)
for epoch in range(500):
    pred = model(X_train)
    loss = torch.nn.functional.mse_loss(pred, y_train)
    loss.backward()
    optimizer.step()
```

NVIDIAの**PhysicsNeMo**はオープンソース（Apache 2.0）であり、Fourier Neural Operator（FNO）やGraph Neural Networkによるサロゲートモデル構築機能を無料で使える。GTX/RTX GPU搭載PCがあれば小規模なCFDデータセットでの試験的なモデル構築が可能だ。

## できないこと・要検証事項

- サロゲートモデルは**学習データ外の形状（Out-of-Distribution）に弱い**。2026年新レギュレーション初年度はそもそも参照CFDデータが少なく、予測精度の検証が必須。
- **非定常現象**（渦崩壊、DRS効果のタイムラグ等）は定常CFD学習のサロゲートでは捉えられない。
- モデル再学習には追加CFDランが必要。データ収集コストは依然として存在する。

## 今すぐ試せる最初の一歩

1. **手元のCFDデータを整理**：過去に実施したパラメトリックスタディ（50ケース以上）があればサロゲート訓練の素材になる
2. **PhysicsNeMoをインストール**：`pip install physicsnemo`でFNO/GNNサロゲートを試せる
3. **Neural Conceptのデモをリクエスト**：[neuralconcept.com](https://www.neuralconcept.com)からSaaSデモを申し込める。F1チームが実際に使っているUIを確認できる
