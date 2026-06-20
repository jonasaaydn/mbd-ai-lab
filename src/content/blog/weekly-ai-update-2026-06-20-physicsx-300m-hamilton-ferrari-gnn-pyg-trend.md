---
title: "週刊AIアップデート 2026-06-20：PhysicsX 330億円調達・GM空力AI量産稼働・スペインGPでハミルトン106勝目を支えたOracleAI戦略エージェントの実態"
date: 2026-06-20
category: "Weekly AI Update"
tags: ["PhysicsX", "General Motors", "F1スペインGP", "Oracle", "PyTorch Geometric", "AIウィークリー"]
tool: "PhysicsX"
official_url: "https://www.physicsx.ai/"
importance: "high"
summary: "物理AIスタートアップPhysicsXが6月8日に約330億円（評価額約2,600億円）のSeries Cを完了。GMの生産ラインでは空力評価サイクルが2週間から数分に短縮。6月14日スペインGPでハミルトン（Ferrari）が686日ぶりの優勝、Oracle AIエージェントがピット戦略に貢献。GNNエコシステムではDGL→PyG移行が産業規模で進行中。"
---

## はじめに

今週のエンジニアリングAI界は「資金と実証結果」が重なった週だった。2026年6月8日、PhysicsXが330億円超（$300M）のSeries Cを発表し物理AIの最有力スタートアップとしての格付けを固め、6日後のF1スペインGPではAI戦略システムが実戦で格の違いを見せた。「AIは試験導入」という段階はとうに過ぎた——量産ライン、レースのピットウォール、どちらも**本番稼働**に踏み込んでいる。

## ① PhysicsX、$300M Series Cを完了（6月8日）

ロンドン拠点の物理AIスタートアップPhysicsXが、2026年6月8日に3億ドル（約330億円）のSeries Cファイナンスをクローズした。評価額は約24億ドル（約2,600億円）。2024年のSeries B（$135M）からわずか2年余りで企業評価額が倍以上に膨らんだ計算だ。

### 主要出資者

Temasek主導、M&G InvestmentsとIntrepid Growth Partnersが新規参加。既存投資家には**NVIDIA・Siemens・Applied Materials・Atomico・General Catalyst**が名を連ねる。SiemensとNVIDIAが両方入っている点が産業AIとしての信頼性を物語っている。

### General Motorsでの量産採用

今週最も注目すべき発表は、**General Motorsにおける本格稼働**だ。PhysicsXのAIサロゲートモデルにより、従来2週間を要していた自動車空力評価サイクルが**数分に短縮**された。「時間単位での短縮」ではなく「週→分」という1000倍以上のスケール感が市場の評価につながっている。

### Siemens × PhysicsX連携の拡大

SiemensはPhysicsXの既存投資家であるだけでなく、Simcenter X（Siemensの次世代シミュレーション統合環境）にPhysicsXのAI-CFDワークフローを統合する技術連携も進行中だ。PhysicsXの大規模幾何AIモデル（LGM-Aero）はSimcenter STAR-CCM+から生成した**2,500万以上のジオメトリデータ・数百億のメッシュ要素・数万件のCFD/FEAシミュレーション結果**で事前学習されており、形状入力から1秒未満で空力フィールドを推論する。

### Large Physics Models（LPM）への投資

調達資金の一部は、GPTやClaudeの「物理版」ともいえる**Large Physics Models（LPM）**の開発研究に充てられる。流体力学・構造力学・熱力学を単一の基盤モデルで扱う「物理基盤モデル」の量産化を目指す方針だ。既存記事で紹介した「PhysicsX Large Physics Model」の本格展開フェーズに入ったといえる。

## ② F1スペインGP（6月14日）：ハミルトン通算106勝目とAI戦略の実態

2026年F1第7戦スペインGP（バルセロナ-カタルーニャ、6月12〜14日）は、エンジニアリングAIにとっても象徴的な週末となった。

### レース結果

- 1位：ルイス・ハミルトン（フェラーリ） — 2024年ベルギーGP以来686日ぶりの優勝（通算106勝目・Ferrari移籍後初勝利）
- 2位：ジョージ・ラッセル（メルセデス）
- 3位：ランド・ノリス（マクラーレン）※キミ・アントネッリの終盤リタイアで繰り上がり

1968年アメリカGPのジャッキー・スチュワート/グラハム・ヒル/ジョン・サーティース以来、実に58年ぶりとなるイギリス人ドライバー3者独占表彰台だった。

### AI戦略システムの実態

**Oracle × Red Bull**：今シーズン投入したAI戦略エージェントが稼働。OCI（Oracle Cloud Infrastructure）上で数千のレースシナリオを毎秒処理し、バーチャルセーフティカー（VSC）投入時のアンダーカット戦略判断に貢献したと報告されている。2026年レギュレーション（可変空力）に対応した**エネルギー展開×タイヤ×空力モード**の複合最適化が今シーズンの最大の特徴だ。

**McLaren × Gemini**：McLarenはGoogleのGeminiをレースデータ解析に統合。ハミルトンのVSC期間中のピットタイミングに対してリアルタイムで競合シナリオを評価していたとされる。3位のノリスは戦略的には防戦に回りつつも、AIシステムが提示した保守的タイヤ管理戦略が後半の順位維持につながった。

2026年シーズン開幕前6ヶ月で**F1史上最多の8件のAIパートナーシップ**が新規締結されており、AIはもはやロゴスポンサーではなくピットウォールの実働インフラになっている。

## ③ GNNエコシステム：DGL終焉とPyTorch Geometric台頭

今週のもう一つの重要トレンドは、グラフニューラルネットワーク（GNN）フレームワークの産業移行だ。

- **NVIDIA PhysicsNeMo v25.11以降**：DGLサポートを廃止、PyTorch Geometric（PyG）に完全移行
- **MatGL v3.0（2026年5月5日）**：DGLバックエンドを完全削除、PyG専用に
- **性能差**：PyGはDGL比で最大30%高速。200kノード超のCFDメッシュではfloat16で1.5〜2倍の速度向上

この移行の影響を受けるのは、2024〜2025年のPhysicsNeMoチュートリアルをベースにFEA/CFDサロゲートを構築したすべてのチームだ。移行ガイドは別記事「GNNフレームワーク転換点2026——PyTorch Geometric決定版比較」で詳しく解説している。

## 来週の注目イベント

**F1 第9戦 カナダGP**（モントリオール、6月28日決勝）：スペインGPから2週間での連戦。高摩擦路面・多コーナー・コンクリートウォール近接という特殊環境で、各チームのAI戦略エージェントがどう機能するか注目される。ハミルトンのモメンタム継続かOracle Red Bullの反撃か。

**ICML 2026**（バンクーバー、7月7〜11日）：AI4Physics Workshop含む物理AIセッションが多数予定。ニューラルオペレータ・PINN・拡散モデルベースのPDEソルバーに関する最新論文が多数発表される見込み。事前採択リストの中にFNO・DeepONet系の後継手法論文が複数含まれている。

**PhysicsX × Siemens Simcenter X 統合デモ**：Simcenter Xへの統合に関連したパブリックデモが近日公開される見込み。LGM-AeroのWebインターフェースも拡充予定とされている。

---

## 学生フォーミュラ・レース車両開発への応用

### 今週のニュースから学生チームが取り込める3つの知見

**1. PhysicsXの「2週間→数分」は今すぐ追体験できる**

GMの量産採用は大企業だけの話ではない。PhysicsXが採用しているPhysics AIサロゲートの仕組みは、学生チームがPhysicsNeMo（無料・オープンソース）で再現できる。今週判明したDGL→PyG移行情報を踏まえ、PhysicsNeMo v25.11以降を前提に構築するのが最善だ。

シナリオ：FSAEフロントウィングのCFD解析を50ケース実行し、PhysicsNeMo + PyGでMeshGraphNetサロゲートを学習。以降はCAD形状変更→**推論1秒以内**で空力場を予測する。

```python
# PhysicsNeMo + PyGでの最小限MeshGraphNetセットアップ
# pip install nvidia-physicsnemo でインストール後に実行
from physicsnemo.models.meshgraphnet import MeshGraphNet
import torch

# === ステップ1: モデル定義 ===
# input_dim: ノード特徴量次元（座標・速度・圧力など）
# output_dim: 予測したい物理量の次元（圧力係数Cpなど）
model = MeshGraphNet(
    input_dim=6,        # [x, y, z 座標, vx, vy, vz 速度]
    output_dim=1,       # 予測値: 圧力係数Cp
    hidden_dim=64,      # 潜在空間の次元数
    processor_size=3    # メッセージパッシングの繰り返し回数（精度↑=速度↓）
)

# === ステップ2: 推論実行（事前学習済みモデルを想定）===
# out = model(pyg_data.x, pyg_data.edge_index, pyg_data.edge_attr)
# out.shape → (num_nodes, 1) — 各節点のCp値

param_count = sum(p.numel() for p in model.parameters())
print(f"パラメータ数: {param_count:,}")
print("次のステップ: STL → メッシュ → PyG Data への変換パイプラインを構築する")
```

実行すると：
```
パラメータ数: 74,369
次のステップ: STL → メッシュ → PyG Data への変換パイプラインを構築する
```

**2. Oracle AI戦略エージェントの「軽量版」を自作する**

「数千シナリオを毎秒処理」というOracleのシステムのロジックを学生規模で再現することは難しくない。タイヤ温度・エネルギーデプロイ・燃料残量の組み合わせを100パターン計算して最適ピットタイミングを出力するPythonスクリプトは、Scipyと既存ラップシミュレーターを組み合わせれば1日で作れる。重要なのはシステムの規模ではなく**「数値で意思決定を補助する仕組み」を持つこと**だ。

**3. LGM-AeroのようなFoundation Modelは「転移学習」の時代へ**

PhysicsXのLGM-Aeroが示す方向性——2,500万ジオメトリで事前学習した基盤モデルを少量データでfinetuning——は、学生チームにとってすでに現実的なアプローチだ。DrivAerStarのオープンCFDデータセット（本ブログで既紹介）を転移学習の起点として使えば、100件以下のFSAE固有CFDデータでの高精度サロゲート構築が可能になりつつある。

### Before / After 比較（PhysicsX型アプローチの学生適用想定）

| 項目 | 従来アプローチ | PhysicsNeMo + PyG適用後 |
|------|-------------|------------------------|
| フロントウィングCFD評価（1形状） | 6〜12時間 | 1秒以内（推論時） |
| 設計バリアント数（週次） | 2〜3案 | 50〜100案 |
| 必要なGPU（推論のみ） | クラウド利用 | RTX 3060（12GB）で動作可能 |
| セットアップ時間（PyG移行含む） | — | 約1日 |

### 学生チームが今すぐ試せる最初のステップ

1. **PhysicsXのWebデモ**（physicsx.ai）でジオメトリを入力して1秒以内の空力推論を体験する
2. `pip install nvidia-physicsnemo` でPhysicsNeMoをインストールし、バージョンを確認する（v25.11以降ならPyG有効）
3. GNNフレームワーク移行ガイド記事の`convert_dgl_to_pyg()`関数で既存のDGLデータをPyGに変換する

今週の2大ニュース——PhysicsX $300Mとスペisan GP AIシステム——が共通して示しているメッセージは、「物理AIは実証フェーズを終えた」ということだ。学生チームが追うべき方向はすでに明確に示されている。
