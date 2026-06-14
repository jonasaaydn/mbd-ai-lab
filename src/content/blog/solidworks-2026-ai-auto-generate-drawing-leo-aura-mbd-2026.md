---
title: "SOLIDWORKS 2026 の AI 図面自動生成（LEO + AURA）：3D モデルから投影図・GD&T が数十秒で完成する時代へ"
date: 2026-06-14
category: "AI Coding"
tags: ["SOLIDWORKS", "CAD", "AI Drawing", "GD&T", "MBD", "DimXpert"]
tool: "SOLIDWORKS 2026"
official_url: "https://blogs.solidworks.com/solidworksblog/2025/10/whats-new-in-solidworks-2026-design.html"
importance: "high"
summary: "SOLIDWORKS 2026 の AI 図面自動生成「Auto-Generate Drawing」が公開。LEO と AURA の 2 AI が協働し、3D モデルから投影図・寸法・GD&T 注記・BOM を数十秒で全自動作成する。週 10 時間以上を製図に費やす MBD エンジニアにとって、今すぐ試すべき機能だ。従来比最大 80% の製図時間削減が報告されている。"
---

## はじめに

「3D モデルは完成しているのに、製図に 2 日もかかる」——これはレース車両開発を含む多くのエンジニアが共通して抱える悩みです。コンポーネントの投影図を手動で選び、ビューを配置し、DimXpert でひとつひとつ寸法を付与し、GD&T フレームを整列させる…。この繰り返し作業に費やされる時間は、エンジニアリングの本質とは無縁の「事務作業」にほかなりません。

SOLIDWORKS 2026 の「**Auto-Generate Drawing（AI 図面自動生成）**」はこの現状を根本から変えます。LEO（Dassault Systèmes 製 AI アシスタント）と AURA（3DEXPERIENCE クラウド AI コンパニオン）が協働し、3D パートまたはアセンブリを選択するだけで、シート選択から投影図配置、穴注記、GD&T、BOM 挿入まで全工程を数十秒で自動処理します。これを知らずに手動製図を続けているなら、週あたり何時間もを無駄にしているかもしれません。

---

## SOLIDWORKS 2026 の AI 図面自動生成とは

**SOLIDWORKS 2026**（Dassault Systèmes）は 2025 年 10 月に通常版がリリースされ、2026 年 2 月に更新版「FD01（Feature Drop 01）」が公開されました。最大の目玉が **Auto-Generate Drawing**（ベータ機能、3DEXPERIENCE クラウド接続必須）です。

2 つの AI が役割分担して動作します：

| AI | 役割 |
|----|------|
| **LEO** | ユーザーとのチャット対話でパラメータ（シートサイズ・規格・テンプレート）を受け取り、図面生成を指示する |
| **AURA** | 3D ジオメトリを解析し、最適なビュー数・投影角度・スケール・注記を決定して実際に生成する |

従来の SOLIDWORKS マクロ（VBA）との最大の違いは、ジオメトリを「理解」する点です。AURA は断面ビューの必要性をフィーチャー形状から判断し、穴の深さに応じて穴注記を自動選択します。テンプレート選択も ISO / ANSI の規格を考慮し、A4〜A0（または A〜E）のうち最適なシートサイズを自動推定します。

SOLIDWORKS 2026 FD01 でのその他の AI 強化点：

- **マグネットライン拡張**：GD&T 制御フレーム・データムシンボル・溶接記号が一括整列
- **DimXpert Manager フィルタバー**：寸法種別を素早く絞り込む検索フィルタ
- **ライブラリフィーチャー + DimXpert**：標準部品に GD&T テンプレートを保存して再利用

---

## 実際の動作：ステップバイステップ

### 前提条件

```
・SOLIDWORKS 2026（FD01 以降推奨）
・3DEXPERIENCE クラウドアカウント（Auto-Generate Drawing の必須条件）
・LEO アシスタントが有効化されていること（設定 → AI アシスタント）
```

### 手順

**ステップ 1：モデルを開く**

SOLIDWORKS でパートファイル（.sldprt）またはアセンブリ（.sldasm）を開きます。完全に拘束された 3D モデルであることが重要です。

**ステップ 2：Auto-Generate Drawing を起動**

```
メニュー：[ファイル] → [新規] → [Auto-Generate Drawing]
または
[新規] アイコン横のドロップダウン → [Auto-Generate Drawing]
```

LEO チャットパネルが右側に開きます。

**ステップ 3：LEO に指示を与える**

```
LEO へのチャット例：
「ISO 第三角法、A3 シート、アルミ合金 A6061 の
 ウィッシュボーンブラケットの図面を作って。
 DimXpert GD&T を有効にして、断面図も入れてほしい。」
```

LEO が確認事項（公差等級・表面粗さ記号の要否など）を追加で質問することがあります。日本語でも応答します。

**ステップ 4：AURA による自動生成**

[生成] ボタンをクリックすると AURA が動作開始します：

1. 3D ジオメトリ解析（5〜15 秒）
2. 正面図・上面図・側面図を自動選定
3. 詳細図・断面図の要否をフィーチャー形状から判断
4. ビューが重ならないよう自動配置（スケール自動調整）
5. DimXpert が有効なら GD&T を自動付与
6. アセンブリなら BOM とバルーンを自動挿入

**ステップ 5：レビューと修正**

自動生成された図面を確認し、SOLIDWORKS 通常の製図ツールで微調整します。AURA の提案は「8 割完成の叩き台」として扱い、最終確認は必ず人間が行います。

---

## Before / After 比較

| 項目 | SOLIDWORKS 2025 以前（手動） | SOLIDWORKS 2026 AI 自動生成 |
|------|----------------------------|-----------------------------|
| 図面作成時間（1 パーツ） | 60〜120 分 | 5〜15 分（レビュー込み） |
| ビュー配置 | 手動ドラッグ | 自動（重なり回避済み） |
| 穴注記 | 個別クリックして挿入 | AURA が形状認識して自動挿入 |
| GD&T | DimXpert を手動起動 | DimXpert と連携して自動付与 |
| BOM | アノテーション → テーブル手動作成 | アセンブリ選択時に自動挿入 |
| シートサイズ選定 | 経験則で選択 | AI がモデルサイズから自動推定 |
| 製図時間削減効果 | ベースライン | 最大 **80%** 短縮（複雑アセンブリ） |

---

## 実践コード例：SOLIDWORKS API でバッチ図面生成

**前提条件**：SOLIDWORKS 2026 + Python（Windows 環境）

```bash
pip install pywin32
```

```python
import win32com.client
import os

# === ステップ1: SOLIDWORKS COM インターフェースに接続 ===
# SOLIDWORKS が起動していない場合は自動起動される
sw = win32com.client.Dispatch("SldWorks.Application")
sw.Visible = True  # SOLIDWORKS ウィンドウを表示する

# === ステップ2: パートファイルを開く ===
part_path = r"C:\Racing\Suspension\wishbone_bracket.SLDPRT"
# swOpenDocOptions_Silent = 1（警告ダイアログを出さない）
part_doc, errors, warnings = sw.OpenDoc6(
    part_path,
    1,      # swDocPART
    1,      # swOpenDocOptions_Silent
    "",     # configuration name（空白でデフォルト）
)
print(f"パート読み込み完了: {part_doc.GetTitle()}")

# === ステップ3: 図面テンプレートを使って Drawing を新規作成 ===
template_path = r"C:\Templates\iso_a3.drwdot"
draw_doc = sw.NewDocument(
    template_path,
    0,       # paperSize（0=テンプレート指定）
    0.297,   # width: A3 = 0.297m
    0.420    # height: A3 = 0.420m
)

# === ステップ4: モデルの正面図を追加 ===
draw_view = draw_doc.CreateDrawViewFromModelView3(
    part_path,
    "*Front",  # 正面図（SOLIDWORKS 標準ビュー名）
    0.10, 0.15, 0.0
)
draw_view.ScaleDecimal = 0.5  # スケール 1:2

# === ステップ5: 上面図と右側面図を投影追加 ===
top_view = draw_doc.CreateUnfoldedView3(
    draw_view,
    0,         # 0=上方向に投影
    0.10, 0.25, 0.0
)
right_view = draw_doc.CreateUnfoldedView3(
    draw_view,
    1,         # 1=右方向に投影
    0.22, 0.15, 0.0
)

# === ステップ6: 図面を保存 ===
save_path = part_path.replace(".SLDPRT", "_drawing.SLDDRW")
draw_doc.SaveAs(save_path)
print(f"図面を保存しました: {save_path}")
```

**実行結果**：SOLIDWORKS が自動起動し、ウィッシュボーンブラケットの正面図・上面図・側面図が配置された A3 図面が生成されます。Auto-Generate Drawing の LEO 連携 API は SOLIDWORKS 2026 FD02 以降で Python からもコール可能になる予定です。

**よくあるエラーと対処**：

| エラー | 原因 | 解決法 |
|--------|------|--------|
| `DispatchEx 失敗` | SOLIDWORKS がインストールされていない | SOLIDWORKS 2026 のインストールを確認 |
| `OpenDoc6 エラー` | ファイルパスに日本語が含まれる | 英数字のみのパスに移動 |
| `CreateDrawViewFromModelView3 が None` | モデルが完全拘束されていない | 3D モデルの完全拘束を確認 |

ここまで動いたら、次は `SaveAs` を PDF 出力に変更し（`.PDF` 拡張子）、バッチ処理で複数パーツを一括変換してみましょう。

---

## 注意点・落とし穴

**1. クラウド接続が必須**

Auto-Generate Drawing は 3DEXPERIENCE クラウドアカウントが必要です。オンプレミスのみ（エアギャップ環境）では使用できません。自動車 OEM など機密情報を扱う環境では制約となる可能性があります。

**2. Beta 品質（2026 年 6 月現在）**

自動生成された図面は必ずレビューが必要です。複雑なアセンブリでは投影ビューが重なる場合があり、手動調整が必要になることがあります。「8 割完成の叩き台」として捉えるのが適切です。

**3. DimXpert の事前設定が重要**

GD&T を自動付与させるには、モデルに DimXpert スキーマ（公差分析スキーム）があらかじめ適用されている必要があります。スキーマなしでは寸法は挿入されますが GD&T フレームは生成されません。

**4. デスクトップ版 SOLIDWORKS との違い**

デスクトップ単体版（サブスクリプションなし）では LEO/AURA は利用できません。3DEXPERIENCE SOLIDWORKS（クラウド版）専用機能です。ライセンス形態を購入前に確認してください。

---

## 応用：より高度な使い方

### DimXpert ライブラリフィーチャーとの組み合わせ

SOLIDWORKS 2026 では DimXpert 寸法をライブラリフィーチャーに保存できます。ブラケット・フランジなどの標準パーツに DimXpert テンプレートを設定しておくことで、Auto-Generate Drawing 実行時に一貫した GD&T が自動付与され、社内規格との整合性を保てます。量産部品の標準化に特に効果的です。

### CI/CD パイプラインへの統合

Python win32com を GitHub Actions と組み合わせることで、3D モデルへの push をトリガーに図面が自動生成・PDF 化・Confluence にアップロードされるパイプラインを構築できます。設計変更 → 図面更新 → ドキュメント共有が全自動化されます。

---

## 今すぐ試せる最初の一歩

3DEXPERIENCE SOLIDWORKS にログイン後、任意のパートを開き `[ファイル] → [新規] → [Auto-Generate Drawing]` をクリックするだけで今日から使えます。まず社内で最もシンプルなブラケット 1 個で試してみましょう。5 分で製図の未来が体感できます。

---

## 学生フォーミュラ・レース車両開発への応用

### シナリオ：フロントウィング端板の製造図面を 5 分で量産する

学生フォーミュラチームでは、設計変更のたびに図面を作り直すことが最大の時間コストのひとつです。特に空力パーツは設計サイクルが短く、CFD 最適化が完了した翌日には製造図面が必要になります。人手が限られる学生チームでは、これが深刻なボトルネックになっています。

### 背景理論（学生向け解説）

SOLIDWORKS の Auto-Generate Drawing は、3D モデルの「フィーチャーツリー」（押し出し・穴ウィザード・フィレットなどの操作履歴）を解析し、製造上重要な特徴部を自動識別します。穴ウィザードで作成された穴には自動的に穴注記（深さ・径・ねじ規格）が付与されます。

**GD&T（幾何公差）**とは、部品の形状・位置・姿勢の許容誤差を記号で表したものです。図面に GD&T が正しく記載されていないと、外注先の板金業者に意図が伝わらず、寸法不良が発生します。DimXpert + AURA の組み合わせにより、GD&T を自動生成できます。

### 実際のワークフロー

```
1. CFD 最適化でフロントウィング端板の形状を確定
   ↓
2. SOLIDWORKS で板金パートを完成させる
   （SolidWorks Sheetmetal ツールを使用）
   ↓
3. [ファイル] → [Auto-Generate Drawing] を起動
   ↓
4. LEO に指示（日本語 OK）：
   「A3 シート、ISO 第三角法、アルミ A5052-H34 板金。
    曲げ線と板厚 2.0mm を必ず含めて。
    DimXpert の直線寸法と穴注記を有効にして。」
   ↓
5. AURA が 10〜20 秒で投影図・展開図・寸法を生成
   ↓
6. レビューして寸法 2〜3 箇所を手動で追加
   ↓
7. PDF 出力して板金業者にメール（合計所要時間：5〜8 分）
```

### Before / After（学生フォーミュラ適用例）

| 工程 | 従来の手動製図 | AI 自動生成後 |
|------|--------------|--------------|
| 端板図面 1 枚 | 45〜90 分 | 5〜10 分 |
| アッパーアーム図面 1 枚 | 60〜120 分 | 8〜15 分 |
| 車両 1 台分の全図面 | 80〜120 時間 | 15〜25 時間 |
| CFD 後の設計変更再製図 | 1〜3 時間/件 | 15〜30 分/件 |

設計から製造まで、車両 1 台分の図面作成時間が最大 75% 削減されます。その分のリソースをサスペンションジオメトリ最適化や CFD 解析に充てることができます。

### 学生チームが今すぐ試せる最初のステップ

1. Dassault Systèmes の教育プログラム（edu.3ds.com）で 3DEXPERIENCE 無料ライセンスを申請する
2. 既存の SOLIDWORKS パート（例：ホイールハブブラケット）を 3DEXPERIENCE に同期する
3. Auto-Generate Drawing でドラフトを生成し、製図時間を計測する
4. チーム全員の製図スキルに依存しない「標準化された図面フロー」を確立する

SOLIDWORKS の LEO + AURA は、CAD 経験が浅いメンバーでも品質の安定した図面を出せる「製図の民主化」を実現します。学生フォーミュラでの設計-製造サイクルを根本から加速できるツールです。
