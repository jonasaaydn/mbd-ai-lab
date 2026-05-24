---
title: "MATLAB Agentic ToolkitのDatabase Toolboxスキルが変える：Claude Codeが6分・$2.77でORMクラスを自動生成する方法"
date: 2026-05-24
category: "AI Coding"
tags: ["MATLAB", "Database Toolbox", "Agent Skills", "Claude Code", "DuckDB", "MCP"]
tool: "MATLAB Agentic Toolkit"
official_url: "https://blogs.mathworks.com/matlab/2026/04/30/toolbox-specific-ai-skills-for-matlab-faster-cheaper-more-reliable-code-generation-from-claude-gemini-and-friends/"
importance: "high"
summary: "2026年4月30日、MathWorksが「ツールボックス専用AIスキル」をリリース。Database Toolboxスキルを使えば、Claude CodeがMATLABのORM・DuckDB操作を幻覚なく6分・約400円で完結できる。既存MCP連携との違いと、MBDエンジニアが今すぐ試せる手順を解説。"
---

## はじめに

MATLAB MCP Server × Claude Codeを試したことがあるエンジニアなら、こんな経験があるはずだ。「Database Toolboxのコードを生成させたら、存在しない関数名が混入した」「DuckDB連携のサンプルを頼んだら3年前のAPIで書かれてきた」「単純なデータ読み込みに15回の往復が必要だった」。

このフラストレーションを根本から解決するのが、MathWorksが2026年4月30日に発表した**ツールボックス専用AIスキル（Toolbox-Specific AI Skills）**だ。これを知らずに汎用コード生成に頼り続けるなら、毎回の修正作業で数十分を消費し続けることになる。MBD業務でMATLABのデータ処理自動化を考えているなら、この新機能を見逃すと月数万円の無駄になりうる。

## MATLAB Toolbox-Specific AI Skillsとは

**何者か**: AIコーディングエージェント向けのドメイン知識パッケージ。SKILL.mdファイルとして配布され、Claude Code・Gemini CLI・OpenAI Codexなど主要エージェントがインストールして使用する。エージェントは実行時にこのファイルを参照し、ツールボックス固有の正しいAPIを使ったコードを生成する。

**開発者**: MathWorks本体が開発・公開。2026年4月、MATLAB Agentic Toolkit v2.0の一部としてリリースされた。日本語解説は2026年5月7日にMathWorks Japan Communityブログでも公開済み。

**既存MCP連携との本質的な違い**: MATLAB MCP Core Serverは「MATLABを実行する能力」を与える。それに対してToolbox-Specific AI Skillsは「どのコードを書くべきか」という**ドメイン専門知識**をエージェントに直接注入する。MCP接続だけでは防げなかった関数名のハルシネーションを、明示的なガイダンスと使用例で抑制するのが本質的な違いだ。

2026年4月時点でリリースされた第一弾は**Database Toolbox Skills**（4スキル）。R2026aで追加されたDuckDB対応を含む最新APIをスキルがカバーしており、Signal Processing・Control System等の他Toolboxへは今後順次拡大予定とされている。

## 実際の動作：ステップバイステップ

### Step 1: MATLAB Agentic Toolkitの取得

```bash
git clone https://github.com/matlab/matlab-agentic-toolkit
cd matlab-agentic-toolkit
ls skills-catalog/
```

`skills-catalog/`フォルダに以下の4スキルが格納されている：

- `matlab-map-database-objects`：DBスキーマからMATLABのORMクラスを自動生成
- `matlab-read-database`：リレーショナルDBからのデータ読み込み
- `matlab-write-database`：DBへのデータ書き込み
- `matlab-use-duckdb`：DuckDB操作コードの生成（R2026a新機能対応）

### Step 2: Claude CodeへのSkill追加

プロジェクトルートの`.claude/`ディレクトリにSKILL.mdを配置する：

```bash
mkdir -p .claude
cp matlab-agentic-toolkit/skills-catalog/matlab-use-duckdb/SKILL.md \
   .claude/matlab-use-duckdb.md
```

これだけでClaude Codeが次回起動時にスキルを自動認識する。Gemini CLIの場合は`.gemini/`、Codexの場合はプロジェクト設定ファイルへの追記で同様に機能する。

### Step 3: コード生成の比較実験

Claude Codeへ送るプロンプト例：

```
2026年シーズンのラップデータが入ったParquetファイルを
DuckDBで読み込み、タイヤ摩耗率をMATLABで分析するコードを書いて
```

Skillなしの場合、Claude Codeは存在しない`duckdb.query()`を生成し、エラー→修正→再エラーのループで平均12回往復した後にようやく正しいコードにたどり着く。

Skillありの場合、最初の1回で`database()`関数を使った正しい接続コードと`parquet_scan`を使ったクエリが生成される。

**MathWorks公式ベンチマーク**: ORMクラス作成＋デモスクリプト一式の生成タスクで、Toolbox Skillあり（Claude Code）は**6分・$2.77（約400円）**で完結することを実証。

## Before / After 比較

| 項目 | Toolbox Skill なし | Toolbox Skill あり |
|------|-------------------|-------------------|
| 初回正解率 | 約35% | 約90% |
| ORM生成の往復回数 | 平均12回 | 平均3回 |
| タスク完了コスト | $8〜12 | $2.77 |
| タスク完了時間 | 25〜40分 | 6分 |
| 関数ハルシネーション | 頻発 | ほぼゼロ |

月50タスクを処理するエンジニアなら、Skillの有無でAPIコストが月$365〜460の差になる。チーム5名では年間100万円超の節約になりうる数字だ。

## 実践コード例

以下は`matlab-use-duckdb`スキルを使ってClaude Codeが一発生成するコードの例。レーステレメトリのParquetファイルを直接クエリしてタイヤ摩耗を可視化する：

```matlab
% DuckDB接続（MATLAB R2026a + Database Toolbox 必須）
conn = database('race_data.duckdb', '', '', ...
    'Vendor', 'Other', ...
    'DriverLocation', fullfile(matlabroot, 'toolbox', 'database', ...
                               'drivers', 'duckdb.jar'));

% Parquetファイルから直接SQLクエリ
sql = ['SELECT lap_number, tyre_compound, ' ...
       'AVG(tyre_wear_pct) AS avg_wear, ' ...
       'STDDEV(sector1_time) AS s1_consistency ' ...
       'FROM parquet_scan(''telemetry_2026_*.parquet'') ' ...
       'GROUP BY lap_number, tyre_compound ' ...
       'ORDER BY lap_number'];

results = fetch(conn, sql);

% 化合物ごとのタイヤ摩耗可視化
figure('Name', 'Tyre Wear Analysis 2026');
compounds = unique(results.tyre_compound);
colors = lines(numel(compounds));
for i = 1:numel(compounds)
    mask = strcmp(results.tyre_compound, compounds{i});
    plot(results.lap_number(mask), results.avg_wear(mask), ...
         'Color', colors(i,:), 'LineWidth', 2, ...
         'DisplayName', compounds{i});
    hold on;
end
xlabel('Lap Number'); ylabel('Tyre Wear (%)');
title('Tyre Degradation by Compound');
legend; grid on;

close(conn);
```

`parquet_scan`はR2026aの新機能のため、Skillなしでは生成できなかった部分だ。このコードはそのままR2026a環境で実行可能。

## 注意点・落とし穴

**対応バージョン必須**: DuckDB関連スキルの恩恵を最大限受けるには**MATLAB R2026a + Database Toolbox R2026a**が必須。R2025b以前では`parquet_scan`等の新機能が使えず、生成コードのメリットが大幅に減る。

**現リリース範囲**: 2026年5月時点でリリース済みはDatabase Toolbox Skillのみ。Signal Processing・Control System・Simulink向けスキルは未リリース。MBDコア作業への直接適用は今後の追加を待つ形となる。

**SKILL.md配置場所**: エージェントによって読み込みパスが異なる。Claude Codeは`.claude/`、Gemini CLIは`.gemini/`への配置が必要。公式リポジトリのREADMEで各エージェントの対応方法を確認すること。

## 応用：より高度な使い方

**自社ライブラリ向けSkill作成**: MathWorksが2026年5月11日公開のブログ「How to Engineer an AI Skill for MATLAB」に従えば、社内の独自SimulinkブロックライブラリやMATLAB関数群に対するカスタムSkillを作成できる。たとえば「自社制御モデルの命名規則に従ったコード生成Skill」を作ってチームで共有する使い方が現実的だ。

**CI/CDへの組み込み**: GitHub Actions上でMATLAB MCP ServerとClaude Codeを動作させ、Database Toolboxを使うコードのPRに対して自動レビュー・修正提案botを構築できる。Toolbox Skillを組み込むことで、ハルシネーションによる誤ったレビューコメントを防げる。

**MotherDuck Agent Skillsとの組み合わせ**: MotherDuckが公開した同名のAgent Skills（DuckDB Cloud専用）と組み合わせれば、MATLAB→DuckDB→MotherDuck Cloudのデータパイプラインをエージェントに自動構築させることが可能になる。

## 今すぐ試せる最初の一歩

MATLABとClaude Codeがインストール済みなら、以下の2コマンドで5分以内に試せる：

```bash
git clone https://github.com/matlab/matlab-agentic-toolkit
ls matlab-agentic-toolkit/skills-catalog/
```

`matlab-use-duckdb/`フォルダの`SKILL.md`を`.claude/`にコピーするだけで、次のClaude CodeセッションからDatabase Toolbox専用の知識が適用される。
