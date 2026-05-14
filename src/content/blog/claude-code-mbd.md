---
title: "Claude CodeをレースカーMBD開発に活用する実践ガイド"
date: 2026-05-10
category: "Race Engineering Use Cases"
tags: ["Claude Code", "MBD", "MATLAB", "Simulink", "自動化", "スクリプト生成"]
tool: "Claude Code"
official_url: "https://claude.ai/code"
importance: "high"
summary: "Claude Codeがレース車両のモデルベース開発にどう役立つか、MATLABスクリプト自動化からドキュメント生成まで実践的な活用方法を解説します。"
---

## なぜMBDエンジニアにClaude Codeが刺さるのか

走行データ解析やSimulinkモデル周辺のスクリプト作業、実はほとんどが「定型パターンの繰り返し」です。セッションごとに異なるCSVファイルを読んで、チャンネル名を合わせて、プロットを出して——この一連の作業、Claude Codeに頼むと劇的に変わります。

実際の現場でよく起きる状況で試してみましょう。

---

## ケース1：走行データ前処理スクリプトの自動生成

### 状況

サーキットで収録した走行ログ（CSV）が30ファイルある。チャンネル構成はセッションによって微妙に違う。これを統一フォーマットに変換してMATLABの `.mat` に保存したい。

### 従来の作業

手作業でスクリプトを書くと約2〜3時間。ヘッダー行の読み取り処理、チャンネル名の正規化、欠損値処理、保存ロジック……。

### Claude Codeへの指示

```
このフォルダにある走行ログCSVを一括処理するMATLABスクリプトを作ってください。
・1行目はヘッダー（チャンネル名）、2行目以降がデータ
・Speed_kph, SteeringAngle_deg, LateralG, LongG, LapTime_s が必須チャンネル
・ない場合はNaNで埋める
・セッションごとに data/processed/session_XX.mat として保存
・処理ログをCSVで出力する
```

### Claude Codeが生成したコード（抜粋）

```matlab
function batch_process_logs(input_dir, output_dir)
    required_channels = {'Speed_kph','SteeringAngle_deg',...
                         'LateralG','LongG','LapTime_s'};
    files = dir(fullfile(input_dir, '*.csv'));
    log_entries = {};

    for i = 1:length(files)
        fname = fullfile(input_dir, files(i).name);
        raw = readtable(fname, 'VariableNamingRule', 'preserve');
        
        % チャンネル正規化
        data = struct();
        for ch = required_channels
            if ismember(ch{1}, raw.Properties.VariableNames)
                data.(ch{1}) = raw.(ch{1});
            else
                data.(ch{1}) = NaN(height(raw), 1);
                warning('Missing: %s in %s', ch{1}, files(i).name);
            end
        end
        
        out_path = fullfile(output_dir, ...
            sprintf('session_%02d.mat', i));
        save(out_path, '-struct', 'data');
        log_entries{end+1} = {files(i).name, height(raw), ...
            datetime('now')};
    end
    % ログ出力省略
end
```

### 結果

- 作業時間：**2〜3時間 → 約15分**（指示5分 + 確認・調整10分）
- スクリプトは初回から動作し、欠損チャンネルの警告も自動で出た

---

## ケース2：Simulinkモデルのドキュメント自動生成

### 状況

サスペンション制御モデル（約80ブロック）のデザインレビュー用説明資料が必要。手書きだと半日かかる。

### Claude Codeへの指示

```
以下のSimulinkブロック仕様リスト（JSON）をもとに、
Markdownのモデル仕様書を生成してください。
各サブシステムの入出力と機能を日本語で説明してください。
```

JSONを渡すと、Claude Codeは以下のような仕様書を自動生成します：

```markdown
## SuspensionController サブシステム

**入力**
| 信号名 | 単位 | 説明 |
|--------|------|------|
| vehicle_speed | m/s | 車体速度（CAN受信） |
| yaw_rate | rad/s | ヨーレート（IMU） |
| steering_angle | rad | ステアリング角度 |

**処理概要**
PIDコントローラにより目標ダンパー推力を計算。
高速域（>120km/h）では安定性優先でゲインを低減。

**出力**
| 信号名 | 単位 | 説明 |
|--------|------|------|
| damper_force_FL | N | 左前ダンパー推力指令 |
...
```

### 結果

- 作業時間：**4時間 → 30分**
- レビュー指摘事項も「この信号の定義が不明」から「この制御則の根拠は？」という本質的な議論に集中できた

---

## ケース3：MILテストのレポート自動集計

### 状況

Simulinkの Model-in-the-Loop テスト結果（XMLログ）が複数セッション分ある。合格率・失敗箇所・トレンドを1枚のHTMLレポートにまとめたい。

### Claude Codeへの指示

```
test_results/ フォルダのXMLファイルを解析して、
テスト合格率・失敗したテスト名・セッション間トレンドを
HTMLレポートにまとめるPythonスクリプトを書いてください。
```

生成されたスクリプトはXMLをパースし、Plotlyでインタラクティブなグラフ付きHTMLを出力します。**通常1日かかる集計作業が1時間以内**に完了しました。

---

## 実際に使うときのコツ

### プロジェクト情報を最初に渡す

Claude Codeはセッション開始時にプロジェクト構造を把握していません。最初の一言で環境を教えると精度が上がります：

```
MATLAB R2024b使用。
走行データはdata/raw/にCSV形式。
チャンネル名はlogging_spec.xlsxで定義。
単位系はSI。変数名はキャメルケース規約。
```

### CLAUDE.md でプロジェクト記憶を永続化

プロジェクトルートに `CLAUDE.md` を置くと毎回読んでくれます。上記の環境情報を書いておけば毎回説明不要になります。

### 生成コードは必ず小さなデータで検証する

Claude Codeが生成するコードは95%以上の確率で動きますが、MATLABのバージョン差やツールボックスの有無で動かないことがあります。**本番データの前に10行分のサンプルで動作確認**するのが鉄則です。

---

## まとめ：MBD開発での役割分担

| 担当 | Claude Code | エンジニア |
|------|------------|-----------|
| スクリプト生成 | ◎ 得意 | レビュー・調整 |
| モデル本体設計 | △ 補助のみ | ◎ 主体 |
| ドキュメント作成 | ◎ 得意 | 内容確認 |
| テストレポート集計 | ◎ 得意 | 結果の解釈 |
| 制御則の妥当性判断 | ✕ 不可 | ◎ 必須 |

「繰り返し作業はClaude Codeに」「判断と設計はエンジニアに」——この分担が、MBD開発での最も現実的な活用スタイルです。
