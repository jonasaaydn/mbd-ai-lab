---
title: "自然言語一行でOpenFOAM空力解析が全自動完走——Foam-Agent 2.0の実力と使い方"
date: 2026-05-15
category: "CAE / Simulation AI"
tags: ["OpenFOAM", "CFD", "AIエージェント", "マルチエージェント", "空力開発", "MCP", "Python"]
tool: "Foam-Agent"
official_url: "https://github.com/csml-rpi/Foam-Agent"
importance: "high"
summary: "「フロントウィングのダウンフォース解析を実行して」——この一行でOpenFOAM CFDのメッシュ生成から計算実行、ParaView可視化まで全自動完走するFoam-Agent 2.0。NeurIPS 2025採択、成功率88.2%のマルチエージェントフレームワークを解説する。"
---

## CFDエンジニアの「5時間の壁」

新しいウィング形状案が出るたびに、あなたはこれをやっている：

1. STLファイルの修正と確認（30分）
2. snappyHexMeshのdictファイル設定（60分）
3. boundaryConditionsのセットアップ（30分）
4. simpleFoamの実行と収束確認（60〜90分）
5. ParaViewでの可視化・Cp/Cd抽出（45分）

形状案が10案あれば50時間。これがOpenFOAMでの空力開発の現実だ。それもOpenFOAMを熟知したCFDスペシャリストがいてはじめて成立する話であって、MBD寄りのエンジニアが「ちょっと試してみたい」にはハードルが高すぎる。

**Foam-Agent 2.0**は、このフローを自然言語1プロンプトで完走させる。

## Foam-Agent 2.0とは何か

ライス大学 Computer Science & Machine Learning グループが開発し、NeurIPS 2025「ML for Physical Sciences」ワークショップで採択されたマルチエージェントCFD自動化フレームワーク。**Claude 3.5 Sonnetを使うと成功率88.2%**を達成——既存フレームワーク最高水準（MetaOpenFOAMの55.5%を大きく上回る）。

内部は6つの専門エージェントが協調動作する：

| エージェント | 担当する作業 |
|------------|------------|
| Architect | ユーザー指示を解釈してワークフローを計画 |
| Meshing | Gmshでメッシュ自動生成またはSTL取り込み |
| Case Setup | OpenFOAMのdictファイル一式を生成 |
| Solver | simpleFoam / pimpleFoamを選択・実行 |
| Post-Processing | 収束判定・Cd/Cl・圧力場の数値抽出 |
| Visualization | ParaViewバッチ処理でコンター画像を出力 |

アーキテクチャの特徴は2点。①**Model Context Protocol（MCP）**で各エージェントのツール呼び出しを標準化しており、HPCシステムや外部メッシャーへの拡張が容易。②**Hierarchical Multi-Index RAG**でOpenFOAMの膨大なドキュメントをリアルタイム参照するため、dictファイルの構文エラーが大幅に減る。

## 実際の操作とプロンプト例

```bash
# セットアップ（Linux + OpenFOAM v10以上が前提）
git clone https://github.com/csml-rpi/Foam-Agent
cd Foam-Agent
pip install -r requirements.txt
export ANTHROPIC_API_KEY="sk-ant-..."

# エージェント起動
python foam_agent.py
```

起動後、以下のようなプロンプトを入力するだけだ：

```
Analyze external aerodynamics of a single-element front wing at 30 m/s.
Wing span: 1200 mm, chord: 250 mm, angle of attack: 8 degrees.
Use k-omega SST turbulence model.
Extract Cl, Cd and surface pressure distribution. Output PNG contours.
```

Foam-Agentはこのプロンプトから：
- Gmshでウィング形状とバウンダリーボックスのメッシュを自動生成
- `0/`・`constant/`・`system/` ディクショナリを全自動生成
- simpleFoamを起動し残差を自動監視
- Cl/Cdの数値とPNG圧力コンターを出力

まで全て実行する。

## 前後比較：空力パラメータスタディ10案の場合

| 指標 | 従来（手動セットアップ） | Foam-Agent 2.0 |
|-----|-------------------|----------------|
| 1案のセットアップ時間 | 3〜5時間 | 15〜30分 |
| 10案のスタディ工数 | 30〜50時間 | 3〜6時間（バッチ） |
| 必要スキル | OpenFOAM熟練者 | Python実行環境があれば可 |
| dictファイルの品質 | エンジニア依存 | RAGで一貫した品質 |

特に「毎週ウィング形状を変えてダウンフォースを比較したい」というサーキット前のワークロードに対して、工数削減効果が顕著だ。

## 注意点：現状できないこと

- **Windowsは非対応**：OpenFOAMのLinux環境（WSL2可）が前提
- **複雑なフルカーボディ形状**：マルチコンポーネントのジオメトリは成功率が低下する傾向
- **メッシュ品質の保証なし**：自動生成メッシュはy+や境界層解像度を人手で確認する必要がある
- **乱流モデル・数値スキームの判断**：エンジニアによる指定を推奨。自動選択に依存しすぎると収束しないケースがある

## 今すぐ試す最初の一歩

公式GitHubの `examples/` ディレクトリにある `cavity_flow`（2Dキャビティ流れ）から始めるのが最速だ。

```bash
git clone https://github.com/csml-rpi/Foam-Agent
cd Foam-Agent
# READMEの Quick Start セクションに従い cavity_flow を実行
# → Agentが自動でmesh・caseを生成して解析が走る
```

5分でエージェントがケースを組み上げて解析が走るのを体験できる。その後、自分のウィングSTLをMeshingエージェントに渡してレースカー形状への拡張に進もう。

OpenFOAMは習得コストが高く、多くのMBDエンジニアが「必要なのはわかるが手が出ない」状態にある。Foam-Agent 2.0はそのハードルを根本から下げる可能性を持っている。PyFluentとは別のアプローチ——オープンソースCFDの完全自動化——として押さえておきたいツールだ。
