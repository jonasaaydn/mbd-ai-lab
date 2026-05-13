# MBD×AI Lab

レース車両開発エンジニア向け AI ツール情報ブログ。  
MBD・Simulink・CAE・走行データ解析に役立つ最新 AI 情報を発信します。

**Astro + Markdown** で構築された静的サイトです。

---

## 目次

1. [はじめに（初学者向け）](#はじめに初学者向け)
2. [ローカルでの起動方法](#ローカルでの起動方法)
3. [記事の追加方法](#記事の追加方法)
4. [GitHub Pages への公開方法](#github-pages-への公開方法)
5. [Cloudflare Pages への公開方法](#cloudflare-pages-への公開方法)
6. [プロジェクト構成](#プロジェクト構成)

---

## はじめに（初学者向け）

このサイトは **Astro** というフレームワークを使っています。  
記事は **Markdown**（.md）ファイルで書くだけで、自動的にHTMLページに変換されます。

サイトを動かすには **Node.js** が必要です。まずインストールしましょう。

---

## ローカルでの起動方法

### ステップ 1：Node.js のインストール

1. [https://nodejs.org/](https://nodejs.org/) を開く
2. **「LTS（推奨版）」** をダウンロードしてインストール
3. インストール後、ターミナル（PowerShell など）で確認：

```powershell
node --version   # v20.x.x などと表示されればOK
npm --version    # 10.x.x などと表示されればOK
```

### ステップ 2：依存パッケージのインストール

このプロジェクトのフォルダに移動して、以下を実行：

```powershell
npm install
```

`node_modules` フォルダが作成されれば成功です（数分かかる場合があります）。

### ステップ 3：開発サーバーの起動

```powershell
npm run dev
```

ターミナルに以下のように表示されたら成功：

```
  🚀  astro  v4.x.x started in XXXms

  ┃ Local    http://localhost:4321/
  ┃ Network  http://192.168.x.x:4321/
```

ブラウザで `http://localhost:4321` を開くとサイトが表示されます。

> **ファイルを編集すると、ブラウザが自動的に更新されます。**

### ビルド（本番用ファイルの生成）

```powershell
npm run build
```

`dist/` フォルダに静的ファイルが生成されます。

---

## 記事の追加方法

### ステップ 1：Markdown ファイルを作成

`src/content/blog/` フォルダに新しい `.md` ファイルを作成します。

ファイル名が URL になります（例：`new-article.md` → `/blog/new-article`）。

### ステップ 2：frontmatter を書く

ファイルの先頭に `---` で囲まれたメタデータ（frontmatter）を書きます：

```markdown
---
title: "記事のタイトル"
date: 2026-05-20
category: "MBD / Simulink"
tags: ["タグ1", "タグ2", "タグ3"]
tool: "使用するAIツール名"                # 省略可
official_url: "https://example.com"       # 省略可
importance: "high"                        # high / medium / low
summary: "この記事の概要を1〜2文で書きます。"
---

## ここから本文を書く

Markdownで自由に書いてください。
```

### 利用できるカテゴリ

| カテゴリ名 | 説明 |
|-----------|------|
| `AI Coding` | AIコーディング支援ツール |
| `MBD / Simulink` | モデルベース開発関連 |
| `CAE / Simulation AI` | CAE・シミュレーションAI |
| `Research AI` | AI研究・技術動向 |
| `Race Engineering Use Cases` | レース車両開発への応用 |
| `Weekly AI Update` | 週次更新情報 |
| `Tool Comparison` | ツール比較・評価 |

### importance の選び方

- `high` — 重要なアップデートや必読の情報
- `medium` — 注目すべき情報
- `low` — 参考情報

### ステップ 3：本文を書く

frontmatter の下（2つ目の `---` より後）に Markdown で本文を書きます。

```markdown
## セクション見出し

普通の文章をここに書きます。

**太字** や *斜体* も使えます。

- リスト項目1
- リスト項目2

\`\`\`matlab
% コードブロックも使えます
x = linspace(0, 10, 100);
plot(x, sin(x));
\`\`\`
```

### ステップ 4：確認

`npm run dev` が起動中なら、ブラウザを開いて記事が表示されることを確認します。

---

## GitHub Pages への公開方法

### 前提条件

- [GitHub](https://github.com/) アカウントを持っていること
- Git がインストールされていること（[https://git-scm.com/](https://git-scm.com/)）

### ステップ 1：astro.config.mjs を編集

`astro.config.mjs` の `site` と `base` を自分のリポジトリに合わせて変更：

```js
// astro.config.mjs
export default defineConfig({
  site: 'https://あなたのGitHubユーザー名.github.io',
  base: '/リポジトリ名/',   // ユーザーページ (username.github.io) の場合は '/'
});
```

### ステップ 2：GitHub リポジトリを作成

1. [https://github.com/new](https://github.com/new) でリポジトリを作成
2. `Public` に設定

### ステップ 3：GitHub Actions ワークフローを追加

`.github/workflows/deploy.yml` ファイルを作成：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### ステップ 4：コードをプッシュ

```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/ユーザー名/リポジトリ名.git
git push -u origin main
```

### ステップ 5：GitHub Pages を有効化

1. リポジトリの **Settings** → **Pages** を開く
2. **Source** を `GitHub Actions` に設定
3. 数分後、`https://ユーザー名.github.io/リポジトリ名/` でサイトが公開されます

---

## Cloudflare Pages への公開方法

GitHub Pages より簡単で、カスタムドメインの設定も無料です。

### ステップ 1：Cloudflare アカウントを作成

[https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) で無料アカウントを作成。

### ステップ 2：GitHub と連携

1. Cloudflare ダッシュボード → **Workers & Pages** → **Create** → **Pages**
2. **Connect to Git** → GitHub アカウントを連携
3. 公開したいリポジトリを選択

### ステップ 3：ビルド設定

| 設定項目 | 値 |
|---------|---|
| Framework preset | `Astro` |
| Build command | `npm run build` |
| Build output directory | `dist` |

### ステップ 4：デプロイ

**Save and Deploy** をクリック。  
数分後、`https://プロジェクト名.pages.dev` でサイトが公開されます。

> **記事を追加・編集して GitHub にプッシュするだけで、自動的に再デプロイされます。**

---

## プロジェクト構成

```
mbd-ai-lab/
├── src/
│   ├── content/
│   │   ├── config.ts           # コンテンツコレクション設定
│   │   └── blog/               # ← ここに記事 .md を追加
│   │       ├── claude-code-mbd.md
│   │       ├── simulink-copilot.md
│   │       └── ai-tools-reading-tips.md
│   ├── data/
│   │   └── tools.ts            # AIツール一覧データ
│   ├── utils/
│   │   └── categories.ts       # カテゴリ定義・ユーティリティ
│   ├── layouts/
│   │   └── BaseLayout.astro    # 共通HTMLテンプレート
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── ArticleCard.astro   # 記事カード
│   │   └── ToolCard.astro      # ツールカード
│   ├── pages/
│   │   ├── index.astro         # トップページ
│   │   ├── blog/
│   │   │   ├── index.astro     # 記事一覧
│   │   │   └── [slug].astro    # 記事詳細
│   │   ├── categories/
│   │   │   └── [category].astro
│   │   └── tools/
│   │       └── index.astro     # AIツール一覧
│   └── styles/
│       └── global.css
├── public/
│   └── favicon.svg
├── astro.config.mjs
├── package.json
├── tsconfig.json
└── README.md
```

---

## よくある質問

**Q: 記事を追加したのに表示されない**  
A: ファイル名が正しく `.md` で終わっているか確認してください。frontmatter の `date` が未来の日付だと表示されない場合があります（今日以前の日付を使ってください）。

**Q: npm install でエラーが出る**  
A: Node.js のバージョンが古い可能性があります。Node.js 18以上が必要です。`node --version` で確認してください。

**Q: AIツール一覧に新しいツールを追加したい**  
A: `src/data/tools.ts` を開いて、既存のエントリをコピーして編集してください。

---

## ライセンス

MIT License
