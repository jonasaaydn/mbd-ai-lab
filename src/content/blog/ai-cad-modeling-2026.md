---
title: "AIがCADモデリングをする時代——Zoo.dev・text-to-CAD・生成設計の最前線"
date: 2026-05-14
category: "CAE / Simulation AI"
tags: ["AI CAD", "text-to-CAD", "生成設計", "Zoo.dev", "KittyCAD", "トポロジー最適化", "自動車工学"]
tool: "Zoo.dev (KittyCAD)"
official_url: "https://zoo.dev"
importance: "high"
summary: "AIが自然言語やパラメータ指定からCADジオメトリを自動生成する時代が来ています。Zoo.devのtext-to-CAD、Autodesk生成設計、AI×トポロジー最適化の最新動向と、レース車両開発への応用可能性を解説します。"
---

## AIによるCADモデリングとは何か

2024〜2026年にかけて、「テキストから3Dモデルを生成する」「AIが設計目標から最適形状を自動生成する」ツールが急速に実用化されてきました。

CADの世界は長年GUIベースの手作業が主流でしたが、以下の3つのアプローチで「AIがモデリングをする」領域が急拡大しています。

| アプローチ | 代表ツール | 成熟度 |
|-----------|-----------|--------|
| Text-to-CAD（テキスト→ジオメトリ） | Zoo.dev, Tripo3D | ★★★☆☆ |
| 生成設計（目標→最適形状） | Autodesk Fusion, nTop | ★★★★☆ |
| AI×トポロジー最適化 | nTop, Siemens NX AI | ★★★★☆ |
| コードベースCAD×AI | Zoo.dev API, FreeCAD+AI | ★★★☆☆ |

---

## Zoo.dev（旧KittyCAD）：APIで操作できるCAD

Zoo.devは**CADをAPIとして提供するプラットフォーム**です。最大の特徴は：

1. **Text-to-CAD**：「角が丸い直方体 (100mm × 50mm × 30mm) を生成」と入力するとSTEP/STLが返ってくる
2. **Machine Learning CAD**：MLモデルがジオメトリを生成するAPIが公開されている
3. **コードベース**：PythonやTypeScriptからCAD操作が可能

```python
# Zoo.dev APIの使用例
import requests

response = requests.post(
    "https://api.zoo.dev/ai/text-to-cad/iteration",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "prompt": "A rear wing endplate with a curved profile, "
                  "100mm wide, 200mm tall, 3mm thick with two mounting holes",
        "output_format": "step"
    }
)

# STEPファイルとして保存
with open("endplate.step", "wb") as f:
    f.write(response.content)
```

**現時点での精度**：シンプルな部品（ブラケット、パイプ、フランジ）は実用的なレベルに近い。複雑な曲面形状（翼形断面など）はまだ人間のレビューと修正が必要です。

---

## Autodesk生成設計（Generative Design）：すでに実用段階

Autodesk Fusion（旧Fusion 360）に搭載された**生成設計機能**は、2026年現在では最も実用的なAI CADツールのひとつです。

### 使い方の流れ

1. **設計スペースを定義**：どの領域に素材を配置してよいか（Preserve/Obstacle領域）
2. **荷重・拘束を設定**：力の入力点と固定点
3. **製造方法を指定**：切削加工、3Dプリント、ダイカストなど
4. **目標を設定**：最小重量 or 最大剛性 or トレードオフ曲線
5. **AIが形状候補を複数生成**：10〜50パターンが数時間で生成される

### レース車両への応用例

**サスペンションアップライト**で有名な成功事例があります：

- 目標：ブレーキング時の最大荷重に耐えつつ重量を最小化
- 入力：コーナリングG・ブレーキング荷重・取り付け点の位置
- 結果：従来設計比で**35%の軽量化**（AlSi10Mg 3Dプリント品）
- 生産性：形状探索が3週間 → 2日に短縮

---

## nTop（旧nTopology）：格子構造＋AI最適化

**nTop**はエンジニアリング向けのフィールドベースCADプラットフォームです。一般のCADとは根本的に異なるアーキテクチャを持ち、以下が得意です：

- **格子構造（ラティス）の自動設計**：部品の内部に最適な格子パターンを自動生成
- **トポロジー最適化との統合**：Simulinkシミュレーション結果をそのまま入力可能
- **製造制約を考慮した最適化**：3Dプリントの積層方向、オーバーハング制限を守った形状生成

```python
# nTop Python APIの例（概念コード）
import ntopology as ntp

# 設計スペースを定義
design_space = ntp.Body.from_step("wing_bracket_design_space.step")

# 荷重ケースの定義
loads = ntp.LoadCase()
loads.add_force(point=(0, 0, 150), direction=(0, -1, 0), magnitude=5000)  # 5kN下向き

# トポロジー最適化実行
optimized = ntp.topology_optimize(
    body=design_space,
    loads=loads,
    constraints=["fixed_faces"],
    target_volume_fraction=0.3,  # 元の30%の体積
    manufacturing="additive"
)
optimized.export("optimized_bracket.step")
```

---

## AI×LIDAR/点群：スキャンデータからCADへ

レース車両開発で見落とされがちな応用が、**3Dスキャンデータ（点群）からのリバースエンジニアリング自動化**です。

従来のワークフロー：
```
3Dスキャン（点群）→ メッシュ化 → 手作業でサーフェス化 → CAD（1〜3週間）
```

AI活用後のワークフロー：
```
3Dスキャン（点群）→ AIがサーフェス・フィーチャーを自動認識 → CAD（数時間）
```

Geomagic Design X（3D Systems）やALICONA ImSurface、ZEISS INSPECT AIなどがこの領域に参入しています。

---

## コードベースCAD×AIエージェント：最もエンジニア向きの組み合わせ

「text-to-CAD」の精度がまだ低いなら、**AIがCADスクリプトを書く**というアプローチが現実的です。

### OpenSCAD + Claude Code

OpenSCADはパラメトリックCADをコードで書くツールです（無料）。AIエージェントに「こういうブラケットを書いて」と指示するとOpenSCADコードを生成し、そのままSTLとして出力できます：

```openscad
// AIが生成したウィングステーブラケット
module wing_stay_bracket(
    width = 40,
    height = 60,
    thickness = 4,
    hole_dia = 8
) {
    difference() {
        // メイン形状
        hull() {
            cube([width, thickness, height]);
            translate([0, 20, 0])
                cube([width, thickness, height * 0.7]);
        }
        // ボルト穴
        for (y = [10, 50]) {
            translate([width/2, -1, y])
                rotate([-90, 0, 0])
                    cylinder(d=hole_dia, h=thickness+2, $fn=32);
        }
    }
}

wing_stay_bracket(width=40, height=60, thickness=4, hole_dia=8);
```

このコードをClaudeに生成させて、寸法変更・形状調整のイテレーションをチャットで行うことができます。

---

## 今すぐ試せること

1. **Autodesk Fusion生成設計（無料トライアルあり）**：既存部品に荷重設定して生成設計を実行してみる
2. **Zoo.dev API（無料枠あり）**：APIキーを取得してシンプルなブラケットをtext-to-CADで生成してみる
3. **OpenSCAD + Claude Code**：「このサイズのブラケットのOpenSCADコードを書いて」と試してみる

CADの「手作業」が最も多く残っている領域だからこそ、早期に自動化に慣れたチームのアドバンテージは大きくなります。
