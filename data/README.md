# 料金データ（data/carriers.json）の仕様

- **担当**：データの調査・更新は **クロ（調査チーム）**。提案ツール（実装チーム）はこのファイルを読むだけで、料金をコードに書きません。
- **形式**：`data/carriers.schema.json`（JSON Schema）に合わせます。
- **自動チェック**：GitHub に入れると自動で `tools/validate_data.py` が動き、次を確認します（手元では `pip install jsonschema` のあと `python3 tools/validate_data.py`）。
  1. 形式（必須項目・税込の整数・日付の書き方）
  2. ID の重複・参照切れ（プランの `discount_ids` に無い割引など）
  3. **公式の支払い例（`examples`）と計算が一致するか**。割引の重ねすぎなどはここで見つかります
  4. `--stale` を付けると、確認日が30日を超えた項目の一覧（月1回の再確認用）
- **金額**：すべて **税込・円・整数**。税抜の金額は入れません。
- **出典**：キャリア・プラン・割引・通話オプション・キャンペーン・初期費用の各項目に `source_url`（公式ページ）と `checked_at`（確認日 `YYYY-MM-DD`）が **必須** です。
- **古さの表示**：`checked_at` から `stale_days.warn` 日（例 30）を過ぎると画面に黄色「確認から◯日」、`stale_days.alert` 日（例 60）を過ぎると赤「要再確認」が付きます。

## 全体の形

```json
{
  "schema_version": "1.0",
  "updated_at": "2026-11-27",
  "tax": "included",
  "stale_days": { "warn": 30, "alert": 60 },
  "carriers": [ … ],
  "home_internet": [ … ]
}
```

## 1キャリアの書き方（UQ mobile の一部を例に）

※ 形の説明のための例です。金額は2026年11月にUQ公式で確認した値ですが、本番データはクロが作成・確認してください。

```json
{
  "id": "uq", "name": "UQ mobile", "group": "kddi", "kind": "subbrand", "is_proposal_target": true,
  "source_url": "https://www.uqwimax.jp/mobile/plan/", "checked_at": "2026-11-21",
  "fees": { "contract_yen": 3850, "source_url": "https://…", "checked_at": "2026-11-21" },
  "plans": [
    {
      "id": "tokutoku2", "name": "トクトクプラン2", "status": "active",
      "price": { "type": "flat", "yen": 4048 },
      "data": { "cap_gb": 30, "after_cap_mbps": 1, "rollover": true },
      "calls": { "included": "none", "per_30s_yen": 22, "option_ids": ["uq_call10", "uq_call_unlimited"] },
      "discount_ids": ["uq_low5", "uq_home_set", "uq_family_set", "uq_aupay", "uq_oyako"],
      "notes": ["5GB以下の月は自動で1,100円引き"],
      "source_url": "https://www.uqwimax.jp/mobile/plan/tokutoku2/", "checked_at": "2026-11-21"
    }
  ],
  "discounts": [
    { "id": "uq_low5", "name": "5GB以下の月の割引", "kind": "usage",
      "amount": { "type": "fixed", "yen": 1100 }, "unit": "per_line", "duration_months": null,
      "conditions": [{ "type": "data_usage_max", "max": 5 }],
      "condition_text": "その月のデータ利用量が5GB以下のとき自動で適用",
      "source_url": "https://…", "checked_at": "2026-11-21" },
    { "id": "uq_home_set", "name": "自宅セット割", "kind": "set_home",
      "amount": { "type": "by_plan", "table": { "tokutoku2": 1100, "kurikoshi5g_l": 858 } }, "unit": "per_line",
      "conditions": [{ "type": "home_internet", "values": ["eo", "au_hikari", "au_hikari_plus"], "with_phone": true }],
      "condition_text": "対象の光回線を「ネット＋電話」で契約、または auでんき とセット（どちらか1つ）",
      "exclusive_group": "uq_set_or_family",
      "source_url": "https://…", "checked_at": "2026-11-21" },
    { "id": "uq_family_set", "name": "家族セット割", "kind": "family",
      "amount": { "type": "by_lines", "table": [{ "min_lines": 2, "yen": 550 }] }, "unit": "per_line",
      "conditions": [{ "type": "family_lines", "min": 2 }],
      "condition_text": "家族で2回線以上（自宅セット割とは併用不可）",
      "exclusive_group": "uq_set_or_family",
      "source_url": "https://…", "checked_at": "2026-11-21" },
    { "id": "uq_oyako", "name": "UQ親子応援割", "kind": "age",
      "amount": { "type": "fixed", "yen": 1100 }, "unit": "per_line", "duration_months": 12,
      "conditions": [{ "type": "age", "min": 5, "max": 18, "scope": "any_family_member" }, { "type": "new_subscription" }],
      "condition_text": "5〜18歳の家族が対象プランに新しく加入。同じ家族セット割グループの家族も、翌月から1年間",
      "overrides": ["uq_low5"],
      "source_url": "https://www.uqwimax.jp/mobile/ouenwari/", "checked_at": "2026-11-21" }
  ],
  "examples": [
    { "label": "自宅セット割＋au PAYカード・5GB超", "plan_id": "tokutoku2",
      "inputs": { "data_gb": 20, "home_internet": "eo", "with_phone": true, "payment": "au_pay_card" },
      "expected_yen": 2728, "source_url": "https://www.uqwimax.jp/mobile/plan/tokutoku2/" }
  ]
}
```

## 項目ごとのルール

| 項目 | ルール |
|---|---|
| `price` | 割引前の月額。使う量で段階が変わるプラン（irumo・ピタット・IIJmio など）は `tiered`。「〜5GBは自動で安い」のように割引として案内されるものは `discounts` 側に書く |
| `data.cap_gb` | 無制限は `null`。超過時速度・テザリング上限も分かる範囲で |
| `status` | 新規受付終了は `ended`（今のプランとして選べるが、提案先には出さない） |
| `discounts[].condition_text` | **必須**。画面では割引額と必ずセットで表示する（最大値だけを強調しない） |
| `exclusive_group` / `not_combinable_with` / `overrides` | 併用できない割引の関係。ここが抜けると割引を重ねすぎて金額が安く出すぎる（実際に起きた例：トクトクプラン2の5GB以下割と親子応援割） |
| `duration_months` | 期間限定の割引（例：親子応援割は12）。2年間の差額は割引が終わる分を引いて計算する |
| `campaigns` | ポイント・キャッシュバックは月額に入れず別枠で表示。`apply_by` の申込期限を過ぎたものは自動で非表示 |
| `examples` | 公式ページの支払い例を1プラン1〜3件。計算結果と一致するか自動テストで確認する。`checked_at`（任意）を付けると、料金改定で古い例が残っていないかの確認に使える |
| `conditions` | 配列はすべて満たす（AND）。「光回線 **または** auでんき」のようにどれか1つでよいときは `{"type": "any_of", "of": [ … ]}`。「1GBを超える月だけ」は `data_usage_min` |
| `amount` | `fixed`（定額）／`by_plan`（プランごと）／`by_lines`（回線数ごと）／`by_plan_lines`（プラン×回線数：auの家族割プラスなど） |
| `confidence: "estimate"` | 公式で確認できなかった値。画面に「目安」と出す |

## 現在の中身（2026-11-27）

- au（11プラン）・UQ mobile（12プラン）：旧ツール（`au-uq/plans.js`）から Claude が移行。**クロの照合待ち**（各項目の `note_for_dev` に「クロの照合待ち」）
- 公式の支払い例 14件はすべて計算と一致
- 光回線（関西）12件：月額は目安（`confidence: estimate`）

## 提案（スキーマに足した項目）

ご指定の項目に加えて、計算と画面表示で次が必要になるため追加しました。

1. **`status` / `ended_on`**：受付終了プラン（今の au・UQ のお客様が使っている旧プラン）を「今のプラン」として選べるようにするため
2. **`price.tiered`**：使う量で月額が変わる段階制プラン
3. **割引の `unit`・`duration_months`・`exclusive_group`・`not_combinable_with`・`overrides`**：1回線ごとか世帯ごとか、期間限定か、併用できるか
4. **機械判定用の `conditions`**：ヒアリング結果から割引が付くかを自動で判定するため（文章の `condition_text` とは別に持つ）
5. **`fees`（初期費用）**：最終提案シートの初期費用欄
6. **`campaigns` の `apply_by`・`counts_in_monthly`**：申込期限と、月額に入れるかどうか
7. **`examples`（公式の支払い例）**：データ更新のたびに計算の正しさを自動で確かめるため
8. **`confidence`**：公式で確認できなかった値を画面で区別するため
9. **`home_internet`**：自宅の光回線ごとのセット割対象キャリアと「電話も必要か」
10. **`examples[].checked_at`**（クロ提案・採用）：支払い例を確認した日
11. **`any_of` / `data_usage_min` / `by_plan_lines`**（移行時に追加）：「光回線またはでんき」「1GB超の月だけ」「プラン×回線数で変わる家族割」を表すため
