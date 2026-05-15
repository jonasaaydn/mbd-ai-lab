# Claude ルーティン追記文

このファイルの「ルーティン追記テキスト」セクションの内容を、
https://claude.ai/code/routines/trig_01FhUeHuEiurx2ecmNni7ef6 のルーティン設定にコピペしてください。

**事前準備**: GitHub Fine-grained PAT を作成し、`YOUR_GITHUB_PAT_HERE` を置き換えてください。
- 作成URL: https://github.com/settings/tokens?type=beta
- 権限: `mbd-ai-lab` リポジトリの Contents → Read and write

---

## ルーティン追記テキスト

```
## 記事を生成したら必ずこの手順でGitHubに公開すること

### 事前設定
GITHUB_PAT=YOUR_GITHUB_PAT_HERE
REPO=jonasaaydn/mbd-ai-lab

### Step 1: 既存記事の一覧を取得して重複を避ける

curl -s "https://api.github.com/repos/${REPO}/contents/src/content/blog" \
  -H "Authorization: token ${GITHUB_PAT}" \
  | python3 -c "
import sys, json, base64, urllib.request, os

files = json.load(sys.stdin)
pat = os.environ.get('GITHUB_PAT', '')
titles = []
for f in files:
    if not f['name'].endswith('.md'):
        continue
    req = urllib.request.Request(f['url'], headers={'Authorization': f'token {pat}'})
    data = json.loads(urllib.request.urlopen(req).read())
    content = base64.b64decode(data['content']).decode('utf-8')
    for line in content.split('\n'):
        if line.startswith('title:'):
            titles.append(line)
            break
for t in titles:
    print(t)
"

### Step 2: 記事を生成する
以下の frontmatter フォーマットに従って記事を生成してください。

---
title: "タイトル（日本語）"
date: YYYY-MM-DD  ← 今日の日付（JST）
category: "カテゴリ名"  ← 以下から完全一致で選ぶ
tags: ["タグ1", "タグ2", "タグ3", "タグ4"]
tool: "ツール名"  ← 省略可
official_url: "https://..."  ← 実在が確実なもののみ、不明なら省略
importance: "high"  ← high / medium / low
summary: "1〜2文の概要"
---

（本文 2000〜3000文字、コードスニペット・具体的手順を含む）

利用可能カテゴリ:
- "AI Coding"
- "MBD / Simulink"
- "CAE / Simulation AI"
- "Research AI"
- "Race Engineering Use Cases"
- "Weekly AI Update"
- "Tool Comparison"

### Step 3: GitHub API で直接アップロード（git push 不要）

記事ファイルを /tmp/article.md に保存した後:

```bash
SLUG="記事のスラッグ（英数字とハイフンのみ）"
CONTENT_B64=$(base64 -w 0 /tmp/article.md 2>/dev/null || base64 /tmp/article.md)
TODAY=$(date +%Y-%m-%d)

curl -s -X PUT \
  "https://api.github.com/repos/${REPO}/contents/src/content/blog/${SLUG}.md" \
  -H "Authorization: token ${GITHUB_PAT}" \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"feat: 自動記事追加 ${TODAY} — ${SLUG}\", \"content\": \"${CONTENT_B64}\"}" \
  | python3 -c "import sys,json; r=json.load(sys.stdin); print('✅ 公開成功:', r.get('content',{}).get('html_url','')) if 'content' in r else print('❌ エラー:', r.get('message','unknown'))"
```

アップロード成功後、GitHub Actions が自動でサイトをデプロイします。
```

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| `401 Bad credentials` | PAT が間違い or 期限切れ | PAT を再作成して置き換え |
| `422 sha not found` | 同名ファイルが既に存在 | スラッグをリネームして再実行 |
| `403 Resource not accessible` | PAT の権限不足 | Contents: Read and write を確認 |
| デプロイが走らない | push が成功していない | GitHub Actions タブでログを確認 |
