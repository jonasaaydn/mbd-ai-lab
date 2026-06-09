---
title: "【学生フォーミュラ実践】LLMs with MATLABでSimulinkシミュレーション結果をAIが自動解釈してテストレポートを生成する"
date: 2026-06-09
category: "Race Engineering Use Cases"
tags: ["学生フォーミュラ", "LLMs with MATLAB", "シミュレーション解析", "自動レポート生成", "MBD"]
tool: "LLMs with MATLAB"
official_url: "https://github.com/matlab-deep-learning/llms-with-matlab"
importance: "high"
summary: "学生フォーミュラチームがLLMs with MATLABを使ってSimulinkシミュレーション結果をAIが自動解釈し、改善提案付きの日本語テストレポートを数分で生成できます。MATLABコードから直接LLMを呼び出す公式ツールキットで、データ解釈の属人化と引継ぎロスを解消します。"
---

## この記事を読む前に

本記事は「[MATLABスクリプトからGPT-5・ローカルLLMを直接呼び出す——公式ツールキット「LLMs with MATLAB」でシミュレーション結果を自動解釈するMBD新ワークフロー](/blog/llms-with-matlab-mbd-simulation-agent-2026)」の学生フォーミュラ応用編です。ツールキットのインストールとAPIキーのセットアップは元記事を参照してください。ここでは「実際に走行シミュレーションのレポートを自動生成する」ことにフォーカスします。

## 学生フォーミュラにおける課題

FSAEチームでは設計・製作・走行の担当が分かれているため、シミュレーション担当が解析した結果をセットアップ担当へ正確に伝えるコミュニケーションコストが常に問題です。

典型的なボトルネック：
- **解釈に時間がかかる**：Simulink走行シミュレーション1回の出力は数十の時系列グラフ＋評価指標CSV。「どの数字が良化して何が悪化したか」を言語化するのに30〜60分かかる
- **ノウハウの属人化**：ベテランメンバーは「ヨーゲインが上がったのにスキッドパッドが改善しない理由」を直感的に説明できるが、新メンバーには伝わらない
- **引継ぎロス**：年度末にメンバーが引退すると、「何に着目してセットアップを変えたか」という判断ノウハウが失われる
- **走行条件による評価の複雑さ**：同じパラメータ変更でもアクセラレーション/スキッドパッド/エンデュランスで評価が異なる

これをLLMs with MATLABで解決します。シミュレーション完了後に自動でLLMを呼び出し、「なぜこの結果が出たか」と「次に試すべき変更点」を含む日本語レポートを生成します。

## LLMs with MATLABを使った解決アプローチ

LLMs with MATLAB（MathWorks公式GitHubリポジトリ）は、MATLABスクリプトから`openAIChat`・`azureChat`・`ollamaChat`などを統一インターフェースで呼び出せるツールキットです。

このアプローチの利点：
- シミュレーション完了と同時にLLMがデータを受け取る（別ツールへのコピー貼り付け不要）
- プロンプトテンプレートをチームのGitリポジトリで管理することで、評価視点を標準化・継承できる
- MATLABの計算結果（数値・構造体・時系列の統計量）を直接プロンプトに埋め込める
- Claude / GPT-4o / ローカルLLM（Ollama）を用途に応じて切り替えられる（機密データはローカルLLM）

## 実装：ステップバイステップ

**前提条件：**
- MATLAB R2024b以降
- LLMs with MATLAB ツールキット（GitHubからクローン後 `addpath`）
- OpenAI APIキー（または Anthropic APIキー）
- 既存の車両ダイナミクス Simulink モデル（`.slx`）

```matlab
% === ステップ1: LLMs with MATLABツールキットのセットアップ ===
% GitHubから取得したツールキットフォルダをパスに追加する
% git clone https://github.com/matlab-deep-learning/llms-with-matlab
addpath(genpath("./llms-with-matlab"));

% APIキーを環境変数から読み込む（コードにAPIキーを直書きしない）
apiKey = getenv("OPENAI_API_KEY");
chat = openAIChat("gpt-4o", APIKey=apiKey);

% === ステップ2: Simulinkシミュレーションを実行する ===
% パラメータを変更してから走行シミュレーションを実行する
% （例：フロントARB剛性を380→450 Nm/radに変更）
front_arb_stiffness = 450;  % フロントスタビライザー剛性 [Nm/rad]
rear_arb_stiffness  = 220;  % リアスタビライザー剛性 [Nm/rad]
front_spring_rate   = 22000; % フロントスプリングレート [N/m]

simOut = sim("vehicle_dynamics_fsae.slx", ...
    "StopTime", "60", ...
    "SimulationMode", "normal");

% 評価指標を構造体にまとめる
results.laptime_skidpad_s   = compute_laptime(simOut, "skidpad");
results.yaw_gain_peak       = max(abs(simOut.yaw_rate.Data)) / ...
                              max(abs(simOut.steer_angle.Data) + 1e-6);
results.lateral_accel_max_g = max(abs(simOut.lat_accel.Data)) / 9.81;
results.roll_angle_max_deg  = max(abs(simOut.roll_angle.Data));
results.understeer_grad     = compute_understeer_gradient(simOut); % 独自関数
results.laptime_endurance_s = compute_laptime(simOut, "endurance");

% 比較用の前回結果（ベースライン）
baseline.laptime_skidpad_s   = 5.57;
baseline.lateral_accel_max_g = 2.58;
baseline.yaw_gain_peak       = 0.71;
baseline.roll_angle_max_deg  = 3.8;
baseline.understeer_grad     = 0.0041;

% === ステップ3: 評価指標をテキストに変換してLLMへ送る ===
% プロンプトを日本語で構築し、評価視点を標準化する
results_text = sprintf([ ...
    "--- 変更パラメータ ---\n" ...
    "フロントARB剛性: %d → %d Nm/rad（+%d%%）\n" ...
    "リアARB剛性: %d Nm/rad（変更なし）\n" ...
    "フロントスプリングレート: %d N/m（変更なし）\n\n" ...
    "--- 今回のシミュレーション結果 ---\n" ...
    "スキッドパッドタイム: %.3f s（前回比 %+.3f s）\n" ...
    "最大横加速度: %.2f G（前回比 %+.2f G）\n" ...
    "ヨーゲイン（ピーク）: %.3f deg/s/deg（前回比 %+.3f）\n" ...
    "最大ロール角: %.1f deg（前回比 %+.1f deg）\n" ...
    "アンダーステアグラジェント: %.4f deg/G（前回比 %+.4f）\n" ...
    "エンデュランスタイム（1周）: %.3f s\n" ...
    ], ...
    380, front_arb_stiffness, ...
    round((front_arb_stiffness/380 - 1)*100), ...
    rear_arb_stiffness, front_spring_rate, ...
    results.laptime_skidpad_s, ...
    results.laptime_skidpad_s - baseline.laptime_skidpad_s, ...
    results.lateral_accel_max_g, ...
    results.lateral_accel_max_g - baseline.lateral_accel_max_g, ...
    results.yaw_gain_peak, ...
    results.yaw_gain_peak - baseline.yaw_gain_peak, ...
    results.roll_angle_max_deg, ...
    results.roll_angle_max_deg - baseline.roll_angle_max_deg, ...
    results.understeer_grad, ...
    results.understeer_grad - baseline.understeer_grad, ...
    results.laptime_endurance_s);

% システムプロンプト：チームで共有するFSAE向け評価テンプレート
system_prompt = [ ...
    "あなたは学生フォーミュラチームのベテランシャシーエンジニアです。" ...
    "シミュレーション結果を見て、以下の3点を日本語で300字以内で回答してください：\n" ...
    "1. 今回の変更で改善・悪化した点（FSAE各イベントの採点基準の観点から）\n" ...
    "2. 物理的な理由（なぜその変化が起きたか、専門用語に括弧で補足）\n" ...
    "3. 次に試すべきパラメータ変更の優先順位（具体的な数値付きで3件以内）" ...
    ];

% メッセージ履歴を構築してLLMに問い合わせる
messages = messageHistory;
messages = addSystemMessage(messages, system_prompt);
messages = addUserMessage(messages, results_text);
[response, ~, ~] = generate(chat, messages);

% 結果を表示する
fprintf("\n=== AI解析レポート ===\n%s\n", response);

% === ステップ4: レポートをMarkdownファイルに自動保存 ===
% 日付とパラメータ名で自動ファイル名を生成し、チームのGitリポジトリに蓄積する
filename = sprintf("reports/sim_%s_fARB%d_rARB%d.md", ...
    datestr(now, "yyyymmdd_HHMMSS"), ...
    front_arb_stiffness, rear_arb_stiffness);
if ~exist("reports", "dir"), mkdir("reports"); end

fid = fopen(filename, "w", "n", "UTF-8");
fprintf(fid, "# シミュレーション解析レポート\n\n");
fprintf(fid, "**実行日時:** %s\n\n", datestr(now));
fprintf(fid, "## 変更パラメータ・結果\n\n```\n%s\n```\n\n", results_text);
fprintf(fid, "## AI解析コメント\n\n%s\n", response);
fclose(fid);
fprintf("レポートを保存しました: %s\n", filename);
```

**出力例：**
```
=== AI解析レポート ===
【改善点】
フロントARB剛性増加により横加速度が2.71G（+0.13G）に向上し、スキッドパッドタイムが
0.15秒短縮されました。コーナー中盤のオーバーステア（後輪の横滑り）傾向が緩和されています。

【物理的な理由】
フロントARB増加→前後ロール剛性比（ロール時の前後輪への荷重配分バランス）が変化→
フロントタイヤの動的荷重移動が均等化→コーナリングスティフネス（スリップ角あたりの
横力）が回復。アンダーステアグラジェント+0.0004のわずかな悪化は許容範囲内です。

【次の変更（優先順位）】
1. リアARB: 220→260 Nm/rad（前後バランスをさらにリア寄りに）→予測改善: 0.05〜0.1s
2. フロントスプリング: 22000→20000 N/m（定常ロール角を増やしてニュートラルへ）
3. リアトー角: -0.1°→-0.2°（高速コーナーの安定性補強）
```

## 学生フォーミュラ・レース車両開発への応用

### 具体的なシナリオ

エンデュランス前日のセットアップ会議でよくある状況：シミュレーションを5パターン実行したが、どれが最善か判断に迷っている。担当メンバーがその場でLLMs with MATLABを走らせれば、5パターン分の評価を比較分析した日本語コメントを15分で生成できます。

### 背景理論

FSAEのセットアップ最適化はトレードオフの連続です。ARB（アンチロールバー、ロール時の荷重移動を制御するスタビライザー）を硬くすると横Gは上がりますが、バンプ路面での接地性が下がります。この関係を数式で理解していなくても、LLMに「最大横G重視かタイヤ接地重視か」という評価基準を伝えれば、最適な変更方向を言語で得られます。

### コードと手順のポイント

上記の実装で特に重要なポイントを補足します：

```matlab
% プロンプトテンプレートをチームのGitリポジトリで管理する
% templates/fsae_setup_analysis.txt に保存して全員で共有する
system_prompt = fileread("templates/fsae_setup_analysis.txt");

% 複数のシミュレーション結果を一括比較するループ
param_sweep = [380, 420, 460, 500];  % ARB剛性のパラメータスイープ
results_all = cell(length(param_sweep), 1);

for i = 1:length(param_sweep)
    front_arb = param_sweep(i);
    simOut = sim("vehicle_dynamics_fsae.slx");
    % ... 評価指標を計算 ...
    results_text_i = build_results_text(simOut, front_arb);  % 上記の関数化版
    messages = messageHistory;
    messages = addSystemMessage(messages, system_prompt);
    messages = addUserMessage(messages, results_text_i);
    [resp, ~, ~] = generate(chat, messages);
    results_all{i} = resp;
    fprintf("ARB=%d: %s\n\n", front_arb, resp(1:min(100,end)));
end
```

### Before / After（実数値で比較）

| 項目 | LLM導入前 | LLMs with MATLAB使用後 |
|------|-----------|----------------------|
| 結果解釈・レポート作成時間 | 40〜60分/回 | 3〜5分/回（自動生成） |
| レポート品質の安定性 | 担当者依存（ベテランと新人で大きく差がある） | プロンプトで均一化・継承可能 |
| セットアップ変更の根拠説明 | 「感覚的に良さそう」が多い | 物理的根拠を日本語で明示 |
| 引継ぎドキュメントの充実度 | ほぼ存在しない | シミュレーション毎に自動蓄積 |
| シミュレーション1サイクル（実行〜文書化） | 45分 | 8分 |

### 学生チームが今すぐ試せる最初のステップ

まず `git clone https://github.com/matlab-deep-learning/llms-with-matlab` を実行し、`addpath` と `openAIChat("gpt-4o", APIKey=getenv("OPENAI_API_KEY"))` が動くことを確認してください。次に、最後に実行したSimulinkシミュレーションの評価指標3つ（ラップタイム・最大横G・ロール角）をプロンプトに貼り付けて `generate` を呼ぶだけです。まず1回試せば、日常の解析作業がどれだけ変わるか実感できます。

## よくあるエラーと対処

| エラー | 原因 | 対処 |
|--------|------|------|
| `openAIChat`が見つからない | ツールキットのパスが通っていない | `addpath(genpath("./llms-with-matlab"))`を先に実行 |
| APIエラー401 Unauthorized | APIキーが正しくない | `setenv("OPENAI_API_KEY","sk-xxx")`を確認 |
| レスポンスが英語で返ってくる | システムプロンプトに日本語指示が不足 | `"必ず日本語で回答してください"`をプロンプト末尾に追加 |
| レポートの分析が短くなる | トークン上限またはMaxTokens設定 | 評価指標を10個以下に絞り込む |
| MATLABが文字化けする | ファイルエンコーディングの問題 | `fopen`の第4引数に`"UTF-8"`を指定 |

## 今週の学生チームへの宿題

LLMs with MATLABをインストールして `openAIChat("gpt-4o")` が動くことを確認したら、直近のシミュレーション結果（数値3〜5個）をプロンプトに貼り付けて「改善提案を1件」生成してみてください。このたった1回の体験がチームのワークフローを変えるきっかけになります。
