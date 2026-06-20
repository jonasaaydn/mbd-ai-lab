---
title: "クラウド不要・API費用ゼロ——LM Studio × Gemma 4 × MATLAB MCPで完全ローカルAIエージェントを構築する"
date: 2026-06-20
category: "MBD / Simulink"
tags: ["MATLAB", "LM Studio", "Gemma 4", "ローカルLLM", "MCP", "プライベートAI", "Agentic AI"]
tool: "LM Studio"
official_url: "https://lmstudio.ai"
importance: "high"
summary: "クラウドAPIを一切使わずMATLABを自律操作するAIエージェントがノートPC上で動く。2026年6月にMathWorks公式ブログで実証された構成——LM Studio 0.3.6+・Gemma 4 12B（MLX量子化）・MATLAB MCP Server——を使えば、知財漏洩リスクゼロ・月額費用ゼロ・インターネット不要のMBD自動化エージェントが16GB MacBook Proで完全動作する。Claude CodeやGitHub Copilotに月数万円払っているチームにとって代替手段が今ここにある。"
---

## はじめに

「AIエージェントを使いたいが、機密設計データをクラウドに送るのはNDA違反になるかもしれない」「月々のAPI費用が予算を超えつつある」——MBDエンジニアの多くが直面するこの二重苦が、2026年6月に解消された。

MathWorksが6月15日に公開した公式ブログ記事は「16GB RAMのMacBook Proと無料ソフトだけで、完全オフラインのMATLABエージェントが動作する」ことを証明した。クラウドAPI費用がネックだったチーム、社内セキュリティポリシーで外部サービス利用が制限されているチームに、今日から使える具体的な構成を解説する。

## LM Studio × Gemma 4 × MATLAB MCPとは

**LM Studio**は、デスクトップ上でローカルLLMをGUI操作で実行するアプリだ（macOS・Windows・Linux対応）。HuggingFaceのモデルをワンクリックでダウンロードし、OpenAI互換API（`http://localhost:1234`）として公開できる。バージョン0.3.6以降でMCPクライアント機能が搭載されており、外部のMCPサーバーに接続してツールを自律実行できる。完全無料・オープンソース。

**Gemma 4 12B**はGoogle DeepMindが2026年4月に公開したオープンソースLLMの最新世代だ。12BパラメータながらTool Use（ツール呼び出し）機能を持ち、MCPサーバーのツールを自律的に呼び出せる。Mac向けのMLX量子化バージョン（Q4量子化、約8GB）であれば、16GB RAM・M2 MacBook Proでも約20〜30トークン/秒で動作する。

**MATLAB MCP Core Server**はMathWorksが提供するMCPサーバーで、AIエージェントがMATLABをリモート操作できるようにする。コード実行・変数操作・テスト実行・ファイル作成など20種以上のツールが提供される。このサーバーにLM Studio（Gemma 4）を接続すれば、クラウドを一切経由しないMATLAB AIエージェントが完成する。

すでに紹介済みのOllama + MCPHost構成や、Claude Code / Gemini CLI / Cursor などのクラウドAIとの最大の違いは、**GUIによる簡単セットアップとMCP設定のワンクリック追加**にある。ターミナル操作を最小限に抑えられ、エンジニア初心者でも30分以内に動作確認できる。

## 実際の動作：ステップバイステップ

### 前提条件

- MATLAB R2025b以降（R2026a推奨）
- LM Studio 0.3.6以降（lmstudio.ai からダウンロード、無料）
- RAM 16GB以上、ストレージ空き容量 10GB以上

### ステップ1：LM Studioのインストールとモデルのダウンロード

公式サイトからLM Studioをインストールし、起動後に検索バーで `gemma-4-12b-tool-use` を検索する。MacではMLX量子化版を選択するとM1/M2/M3チップの性能を最大限に引き出せる。「Load Model」でモデルをRAMに展開。

### ステップ2：MATLABのMCP Serverを起動

```matlab
% MATLAB コマンドウィンドウで実行（初回のみインストール）
% ※MATLAB Add-On Explorerからも入手可能
matlab.addons.install('matlab-mcp-server')

% MCPサーバーをポート3000で起動する
mcp_server('port', 3000, 'verbose', true)
```

実行結果：
```
MATLAB MCP Server v1.4.0 started on port 3000
Registered 23 tools: run_code, read_variable, create_function, run_tests ...
Waiting for client connection...
```

### ステップ3：LM StudioにMATLABツールを登録

LM Studioの「Developer > MCP Servers」タブに以下のJSON設定を追加する：

```json
{
  "mcpServers": {
    "matlab": {
      "command": "lms",
      "args": ["mcp-bridge", "--host", "localhost", "--port", "3000"]
    }
  }
}
```

「Apply & Restart」をクリックすれば、Gemma 4がMATLABのツールリストを自動認識する。

### ステップ4：自然言語でMATLABを操作

LM StudioのChat画面に日本語で指示するだけで、Gemma 4がMATLABコードを生成・実行する：

```
「空力データファイル wing_cl_cd.mat を読み込んで、
  揚抗比（Cl/Cd）が最大の形状名を教えてください。
  全形状の比較表も表示してください。」
```

Gemma 4が自動的にMATLABツールを呼び出して実行する：

```matlab
% === AIエージェントが自動生成・実行したコード ===

% ステップ1: データを読み込む
load('wing_cl_cd.mat');   % Cl, Cd, wing_names が含まれる

% ステップ2: 揚抗比を計算して最大値を探す
LD_ratio = Cl ./ Cd;                     % 揚抗比（空力効率の指標）
[max_LD, best_idx] = max(LD_ratio);

fprintf('揚抗比最大の形状: %s (L/D = %.3f)\n', wing_names{best_idx}, max_LD);

% ステップ3: 全形状を比較した表を表示する
fprintf('\n%-20s %8s %8s %8s\n', '形状名', 'Cl', 'Cd', 'L/D');
fprintf('%s\n', repmat('-', 1, 50));
for i = 1:length(wing_names)
    fprintf('%-20s %8.4f %8.4f %8.3f\n', ...
        wing_names{i}, Cl(i), Cd(i), LD_ratio(i));
end
```

実行結果：
```
揚抗比最大の形状: Wing_TypeC_AOA18 (L/D = 4.821)

形状名                      Cl       Cd    L/D
--------------------------------------------------
Wing_TypeA_AOA12        1.2340   0.3120   3.955
Wing_TypeB_AOA15        1.5610   0.3680   4.242
Wing_TypeC_AOA18        1.8920   0.3924   4.821  ← 最適
```

## Before / After 比較

| 項目 | クラウドAPI（Claude Code等） | LM Studio + Gemma 4 |
|------|---------------------------|---------------------|
| 月額費用 | $20〜$200 | **¥0（完全無料）** |
| データの送信先 | Anthropicクラウド | **ローカルPC内のみ** |
| インターネット接続 | 必須 | **不要（初回除く）** |
| 応答速度 | 1〜5秒 | 5〜30秒（PC依存） |
| 最大コンテキスト長 | 100K〜200Kトークン | 32K〜128Kトークン |
| 知財漏洩リスク | 中（ポリシー次第） | **なし** |
| セットアップ難易度 | 中（APIキー管理） | **低（GUI操作）** |

推論速度はクラウドAPIに劣るが、知財リスクゼロ・費用ゼロ・オフライン動作の三拍子はMBD現場での価値が圧倒的に高い。

## 実践コード例：Python経由でローカルAPIを活用する

社内ツールにAIエージェント機能を組み込む場合、LM StudioのOpenAI互換APIをPythonから直接叩ける：

```python
# pip install openai  （openai ライブラリのみ必要、APIキー不要）
import openai

# LM Studio のローカルAPIエンドポイント（クラウド不要）
client = openai.OpenAI(
    base_url="http://localhost:1234/v1",   # LM Studioのデフォルトポート
    api_key="not-needed"                   # ローカルなのでダミーキーでOK
)

# === サスペンションKnC解析を自然言語で依頼 ===
response = client.chat.completions.create(
    model="gemma-4-12b",    # LM Studioで読み込んでいるモデル名
    messages=[{
        "role": "user",
        "content": (
            "MATLABでフロントサスペンションのKnC解析を実行してください。"
            "バウンス0〜60mm（10mm刻み）のトー変化とキャンバー変化をグラフ化し、"
            "許容値（トー±0.2deg、キャンバー±0.5deg）との比較も示してください。"
        )
    }]
    # MATLABツールはLM StudioがMCP経由で自動で使う
)

print(response.choices[0].message.content)
# → Gemma 4がMATLABコードを生成・実行し、結果と解釈を返す
```

よくあるエラーと対処：

| エラー | 原因 | 解決法 |
|--------|------|--------|
| Connection refused | LM Studioが起動していない | LM Studioを起動してモデルをロードする |
| Tool not found | MCP設定が未適用 | Developer > MCP Servers でApplyをクリック |
| Model not available | モデル名が違う | LM Studioで読み込んでいるモデル名を確認する |

ここまで動いたら、次はMATLABのスクリプトファイルを読み書きする `read_file` / `create_function` ツールを試してみましょう。

## 注意点・落とし穴

**Tool Use非対応モデルは使えない：** LM Studioで動かせるすべてのモデルがTool Use対応ではない。モデル選択時に「Tool Use」「Function Calling」が機能リストに明記されていることを確認すること。非対応モデルを選ぶとMATLABツールを一切呼び出せない。

**RAM不足でのクラッシュに注意：** Gemma 4 12B（MLX Q4量子化版）は約8GB RAMを消費し、MATLABも別途4〜8GB使う。16GBは最低ライン。余裕を持つなら32GBが推奨。7Bモデル（Gemma 4 7B）なら12GB環境でも動作可能だが精度がやや低下する。

**MATLABライセンスは別途必要：** LM Studio自体は無料だが、MATLAB実行には有効なライセンスが必要。教育機関向けの学生ライセンス（年間数千円〜）を活用しよう。

## 応用：より高度な使い方

- **Open WebUI連携**：LM Studio APIをバックエンドにブラウザUIを立てれば、チーム全員がブラウザ経由でプライベートChatGPTを使える
- **Modelfileカスタマイズ**：システムプロンプトにMATLAB/Simulinkの専門用語・チームのコーディング規約を記述し、専門特化型エージェントを作る
- **複数モデルの切り替え**：LM Studioなら軽量なQwen2.5 7Bと高精度なGemma 4 12Bを用途に応じてワンクリックで切り替えられる
- **Linux/Windows展開**：Mac以外でもGGUF Q4_K_M量子化版を使えば同等機能が動作。社内サーバーに立てればチーム共有も可能

## 学生フォーミュラ・レース車両開発への応用

学生フォーミュラチームが抱える「クラウドAPIを使う予算がない」「チームの設計データをネットに送りたくない」という課題を、このローカルAI構成は完璧に解決する。

**具体的なシナリオ：ウィング形状データの自動解析とラップタイム影響評価**

チームのラップトップ（RAM 32GB、Windows/Mac）にLM Studio + Gemma 4をセットアップし、MATLAB MCP Serverを接続しておく。大会直前の夜中でも、機密の設計データを外に出さず自律的に解析できる。

```matlab
% === AIエージェントへの指示（日本語で入力するだけ） ===
% 「wing_variants.mat を読み込んで、
%   コーナリング速度80km/hでのダウンフォースが最大になる形状を教えて」

% Gemma 4がローカルで生成・実行するコード（機密データはPC外に出ない）：
load('wing_variants.mat');   % Cl, Cd, wing_names（チームの機密設計データ）

% 背景理論：ダウンフォースはF_L = ½ρv²S·Cl で計算される
% ρ=1.225 kg/m³（空気密度）、v=80/3.6=22.2 m/s（コーナー速度）、S=0.4m²（ウィング面積）
rho = 1.225; v = 80 / 3.6; S = 0.4;
F_L = 0.5 * rho * v^2 * S * Cl;   % 各形状のダウンフォース [N]
F_D = 0.5 * rho * v^2 * S * Cd;   % 各形状の抗力 [N]

% コーナリング重視スコア（ダウンフォース優先、抗力にペナルティ）
score = F_L - 0.25 * F_D;
[best_score, best_idx] = max(score);

fprintf('最適形状: %s\n', wing_names{best_idx});
fprintf('  ダウンフォース: %.1fN / 抗力: %.1fN / スコア: %.1f\n', ...
    F_L(best_idx), F_D(best_idx), best_score);
```

**Before / After（数字で示す）：**

| 指標 | 手動分析（スプレッドシート）| LM Studio AIエージェント |
|------|--------------------------|------------------------|
| 7形状のランキング作業 | 30分 | **3分** |
| チームメンバー全員が使えるか | スキル依存 | **Yes（日本語指示のみ）** |
| 外部サーバーへのデータ送信 | 場合による | **ゼロ** |
| 月額コスト | ¥0 | **¥0** |

**学生チームが今すぐ試せる最初のステップ：**

1. lmstudio.ai からLM Studioをダウンロード（5分）
2. `gemma-4-12b-tool-use` を検索してダウンロード（ストレージ8GB必要）
3. MATLABで `matlab.addons.install('matlab-mcp-server')` を実行（1分）

以上3ステップで準備完了。最初の指示は「現在のMATLABバージョンを教えてください」——これだけで動作確認完了だ。

## 今すぐ試せる最初の一歩

```bash
# 1. LM Studio をインストール（公式サイトから、無料）
#    https://lmstudio.ai

# 2. MATLAB MCP Server をインストール（MATLABコマンドウィンドウで実行）
#    matlab.addons.install('matlab-mcp-server')

# 3. MCPサーバーを起動（MATLABコマンドウィンドウで実行）
#    mcp_server('port', 3000)
```

LM Studioを起動しGemma 4 12Bをダウンロードしたら、MATLABのMCPサーバーを起動し、LM StudioのDeveloperタブでlocalhost:3000に接続する。最初の指示は「1から100の和をMATLABで計算してください」——5分で体験できる。
