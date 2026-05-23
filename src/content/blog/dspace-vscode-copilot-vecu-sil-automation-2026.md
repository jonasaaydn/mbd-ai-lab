---
title: "VSCode×GitHub CopilotでvECUを自動生成——dSPACEがSILテスト自動化で実証した新ワークフロー"
date: 2026-05-23
category: "AI Coding"
tags: ["dSPACE", "GitHub Copilot", "SIL", "仮想ECU", "CI/CT", "テスト自動化"]
tool: "GitHub Copilot"
official_url: "https://www.dspace.com/en/pub/home/news/dspace_pressroom/press/ces-2026-dspace.cfm"
importance: "high"
summary: "dSPACEがCES 2026で公開した衝撃のデモ——GitHub Copilot×VS Codeで仮想ECU（vECU）コードを自動生成し、GitLab CI/CT + VEOS（SIL）+ SCALEXIO（HIL）の全自動パイプラインに直接投入。従来3日かかっていたvECU構築が30分で完結する新時代のMBD検証フローを完全解説する。"
---

## はじめに

「ECU検証環境を一から手で構築していたら1週間かかった」——MBDエンジニアなら誰もが経験したことがあるはずだ。仮想ECU（vECU）の生成、SILテスト設定、GitLab CI/CTへの組み込みと、個々は地味だが積み重なれば膨大な工数になる。dSPACEは2026年1月のCES会場で、この問題を真正面から攻略するデモを発表した。VS CodeとGitHub Copilotを組み合わせてvECUコードを自動生成し、VEOS（dSPACE SILプラットフォーム）とSCALEXIO（HIL）で構成された自動テストパイプラインへ直接投入するフローだ。このワークフローを知らずにいると、競合が同じ開発リソースで2〜3倍の検証サイクルを回している現実に気づかないまま取り残される。

## dSPACE VEOS × GitHub Copilotとは

dSPACEはドイツに本社を置く自動車開発向けHIL/SILテストプラットフォームの老舗ベンダー。VEOSはPC上でECUソフトウェアを仮想実行できるSILプラットフォームで、SCALEXIOが実機HILの対応製品だ。これまでvECU作成は専任エンジニアによる手作業が前提だったが、CES 2026でGitHub Copilot（VS Code拡張）を使った自動生成ワークフローを世界初公開した。

MathWorksのMATLAB MCPサーバーやCursor IDE連携に続き、自動車エンジニアリングツールへのAI統合は「概念実証フェーズ」から「製品デモフェーズ」へと移行しつつある。dSPACEのCTO Jens Rüdiger氏は「AIはSDV開発の全フェーズを加速する戦略的イネーブラー」と明言しており、2026年後半の製品ラインナップへの正式組み込みを示唆している。

## 実際の動作：ステップバイステップ

CES 2026でdSPACEが公開したデモフローは3ステップで完結する。

**ステップ1：VS CodeでGitHub Copilotに指示を投入**

```
# GitHub Copilot Chat（@workspace コマンド）
"dSPACE VEOS向けのvECUラッパーを生成して。
 対象はAUTOSAR Classic、コンポーネント名はSpeedControllerSWC"
```

**ステップ2：CopilotがvECUラッパーコードを自動生成**

```c
/* Copilotが生成したVEOS vECUラッパーのサンプル */
#include "SpeedController_rte.h"
#include "dspace_veos_api.h"

void SpeedController_Init(void) {
    VEOS_RegisterECU("SpeedController", &SpeedController_step);
    VEOS_SetSampleTime(0.001f);  /* 1ms周期 */
}

void SpeedController_step(void) {
    Float32 speedRef    = Rte_IRead_SpeedCtrl_SpeedRef();
    Float32 actualSpeed = Rte_IRead_SpeedCtrl_ActualSpeed();
    Float32 throttle    = PI_Controller(speedRef, actualSpeed);
    Rte_IWrite_SpeedCtrl_ThrottleOut(throttle);
}
```

**ステップ3：GitLab CI/CTパイプラインのYAMLもCopilotが生成**

```yaml
# .gitlab-ci.yml（Copilotが自動生成した構成例）
sil_test:
  stage: test
  script:
    - veos_run --ecu SpeedController --bench sil_bench.veos --timeout 300
    - python3 eval_coverage.py --min-coverage 95
  artifacts:
    paths: [test_report.html, coverage.xml]
  rules:
    - if: $CI_PIPELINE_SOURCE == "push"
```

VEOSがvECUを仮想実行して結果を収集し、カバレッジが95%未満ならパイプラインが自動失敗する。問題なければSCALEXIO（HIL）への移行ステージへ自動昇格する仕組みだ。

## Before / After 比較

| 項目 | AI導入前 | AI導入後 |
|------|---------|---------|
| vECU生成時間 | 1〜3日（手動コーディング） | 30分〜1時間 |
| CI/CT YAML設定 | 半日〜1日 | 15分（Copilotが自動生成） |
| テスト実行タイミング | 週1〜2回 | コミット毎に全自動 |
| 不具合検出 | 統合テスト時 | 開発中にリアルタイム |
| HW/SWループ移行 | 手動設定・半日 | パイプラインで自動昇格 |

dSPACEはSDV開発では「短サイクルでの開発と検証が不可欠」と位置付けており、このパイプラインにより月数回だったHIL検証を毎日実行できる体制が整う。

## 実践コード例

Python + dSPACE REST API（VEOS 2.x以降）でジョブ投入を試す最小構成：

```python
import requests, time

VEOS_URL = "http://localhost:8080/veos/api/v1"

def run_sil_test(ecu_path: str, bench_config: dict) -> dict:
    """vECUをVEOSにデプロイしてSILテストを実行、結果を返す"""
    with open(ecu_path, "rb") as f:
        ecu_id = requests.post(
            f"{VEOS_URL}/ecus",
            files={"file": f}
        ).json()["id"]

    job = requests.post(f"{VEOS_URL}/jobs", json={
        "ecu_id": ecu_id,
        "bench": bench_config,
        "duration_sec": 60
    }).json()

    # ポーリングで結果待ち
    while True:
        status = requests.get(f"{VEOS_URL}/jobs/{job['id']}").json()
        if status["state"] in ("DONE", "FAILED"):
            return status
        time.sleep(2)

result = run_sil_test("SpeedController.vECU", {
    "input_signals": {"SpeedRef_kph": [0, 50, 100, 50, 0]},
    "sample_time_s": 0.001
})
print(f"カバレッジ: {result['coverage_pct']}%  合否: {result['verdict']}")
```

## 注意点・落とし穴

- **VEOSはライセンス製品**：30日評価版あり。本番利用は有償ライセンス必須
- **AUTOSAR ARXMLを事前読み込み**：Workspaceに `.arxml` を置かないとCopilotの型推論精度が大幅に低下し、存在しないRte関数を呼び出す誤ったコードが生成される
- **ISO 26262との関係**：vECUコードはTCL-4ツール認定の対象外。Copilot生成コードは人間レビューが必須であり「生成＝完成」ではない
- **オンプレVEOS + クラウドCI**：VEOSはローカルLAN内で動作するため、GitHub ActionsなどクラウドCIから直接呼び出す場合はVPN・ファイアウォール設定が必要

## 応用：より高度な使い方

vECU自動生成が安定したら次は **SCALEXIOへの自動移行テスト** だ。SILで合格したvECUを同じGitLab CI/CTパイプライン経由でHILにデプロイし、実ハードウェアでの最終検証まで一気通貫にする。さらにMathWorks R2026aのSimulink Copilotと組み合わせれば、「モデル設計→コード生成→vECU作成→SIL/HILテスト」の全フローがAI支援体制になる。AI Codingと自動車開発ツールの融合はここまで来た。

## 今すぐ試せる最初の一歩

VEOSがなくてもGitHub CopilotでvECUコード生成の品質は即日検証できる。VS Codeに拡張を入れてCコードを開き、Chat窓で指示を投げるだけだ。

```bash
code --install-extension GitHub.copilot
# VS Code起動後、既存ECUのCファイルを開いて
# Copilot Chatで「このECUをdSPACE VEOS向けにラップするコードを書いて」と投入
```
