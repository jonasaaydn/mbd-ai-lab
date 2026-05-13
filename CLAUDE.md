# MBD×AI Lab — プロジェクト引継ぎ情報

## プロジェクト概要

レース車両MBD（モデルベース開発）エンジニア向けAIツール情報ブログ。
Astro + Markdown で構築した静的サイト。毎日自動でAI最新記事が追加される。

**運営者**: jonasaaydn（GitHub: https://github.com/jonasaaydn）

---

## 重要URL

| 用途 | URL |
|------|-----|
| 公開サイト | https://jonasaaydn.github.io/mbd-ai-lab/ |
| GitHubリポジトリ | https://github.com/jonasaaydn/mbd-ai-lab |
| GitHub Pages設定 | https://github.com/jonasaaydn/mbd-ai-lab/settings/pages |
| 自動エージェント管理 | https://claude.ai/code/routines/trig_01FhUeHuEiurx2ecmNni7ef6 |
| ローカル開発 | http://localhost:4321（npm run dev 実行後） |

---

## 技術スタック

- **フレームワーク**: Astro v4
- **コンテンツ**: Markdown（src/content/blog/）
- **スタイル**: カスタムCSS（src/styles/global.css）
- **デプロイ**: GitHub Actions → GitHub Pages（mainへのpushで自動）
- **自動記事追加**: Claude スケジュールエージェント（毎日深夜0時JST）

---

## ファイル構成（重要ファイルのみ）

```
WEB/
├── CLAUDE.md                        ← この引継ぎファイル
├── astro.config.mjs                 ← site/base設定済み
├── src/
│   ├── content/blog/                ← 記事.mdを追加するだけでOK
│   ├── data/tools.ts                ← AIツール一覧
│   ├── utils/categories.ts          ← カテゴリ定義
│   ├── layouts/BaseLayout.astro     ← 共通レイアウト
│   ├── components/
│   │   ├── ArticleCard.astro
│   │   ├── ToolCard.astro
│   │   ├── Header.astro
│   │   └── Footer.astro
│   ├── pages/
│   │   ├── index.astro              ← トップページ
│   │   ├── blog/index.astro         ← 記事一覧
│   │   ├── blog/[slug].astro        ← 記事詳細
│   │   ├── categories/[category].astro
│   │   └── tools/index.astro        ← ツール一覧
│   └── styles/global.css
└── .github/workflows/deploy.yml    ← 自動デプロイ（変更不要）
```

---

## 現在の状態（2026-05-13 時点）

- ブログ記事: 3件（claude-code-mbd.md, simulink-copilot.md, ai-tools-reading-tips.md）
- AIツール: 8件（Claude, Claude Code, ChatGPT, GitHub Copilot, Gemini, MATLAB Copilot, Simulink Copilot, Ansys SimAI）
- GitHub連携・自動デプロイ: 設定済み
- 自動記事追加エージェント: 稼働中（毎日深夜0時JST）
- Word資料: MBD-AI-Lab-ガイド.docx（WEBフォルダ直下）

---

## 記事追加のルール

frontmatterの必須フィールド:
```yaml
---
title: "タイトル（日本語）"
date: YYYY-MM-DD        # 今日以前の日付
category: "カテゴリ名"  # 下記リストから選ぶ
tags: ["タグ1", "タグ2"]
tool: "ツール名"         # 省略可
official_url: "https://..." # 省略可
importance: "high"      # high / medium / low
summary: "概要1〜2文"
---
```

利用可能カテゴリ:
- "AI Coding"
- "MBD / Simulink"
- "CAE / Simulation AI"
- "Research AI"
- "Race Engineering Use Cases"
- "Weekly AI Update"
- "Tool Comparison"

---

## よく使うコマンド

```powershell
# 開発サーバー起動
npm run dev

# GitHubにpushして公開
git add src/content/blog/新しいファイル.md
git commit -m "記事追加: タイトル"
git push origin main
```

---

## git設定（コミット時に必要）

```
user.email = akina4ag86@gmail.com
user.name  = jonasaaydn
```
（すでにローカルリポジトリに設定済み）
