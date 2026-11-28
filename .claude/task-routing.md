# タスクのルーティング表（正とするファイル）

セッション開始時と、各タスクの開始時にこの表を読み、タスク種別に合うモデル／エフォートで実行する。
表を変えたら `python3 tools/routing.py sync` で `.claude/agents/*.md` に反映する（手で agents を直さない）。

<!-- routing:table:start  ※ tools/routing.py がこの表を読み書きする。列の順番を変えないこと -->
| キー | タスク種別 | モデル | エフォート | 担当 | 状態 | 備考 |
|---|---|---|---|---|---|---|
| design | 設計・方針判断（仕様変更、データ構造の判断） | opus | high | メイン（Claude本体） | 通常 | opus は1日3回まで |
| implement | 実装（画面・ロジックの変更） | sonnet | medium | implementer | 通常 | 難所は high へ昇格可 |
| data | 料金データの作成・更新（JSON編集） | sonnet | low | クロ（data-editor） | 通常 | 検証スクリプトが品質担保 |
| verify | 検証・チェック（validate実行、差分確認） | haiku | low | checker | 通常 |  |
| review | レビュー（PR内容の最終確認） | sonnet | medium | reviewer | 通常 | haiku に下げない |
| chore | 定型作業（整形、コミット、PR文の下書き） | haiku | low | chore | 通常 |  |
<!-- routing:table:end -->

## 使い方

- **Claude Code（このリポジトリ）**：メインのセッションは設計・方針判断（design）を担当する。ほかの種別は、表の「担当」のエージェント（`.claude/agents/`）に Agent ツールで任せる。エージェントのモデル・エフォートは表と同じ値になっている。
- **難所だけ一時的に上げる**：implement の難所は、そのタスクだけ high で実行してよい（表は変えない）。ログのエフォート欄には実際に使った値を書く。
- **無人実行ランナー**：今はない。作るときは、タスクキューの種別キー（design／implement／…）で `python3 tools/routing.py get <キー>` を呼び、出力の `--model … --effort …` をそのまま渡す。

## モデル／エフォートの段階（上げ下げは1段ずつ）

`haiku/low` → `haiku/medium` → `sonnet/low` → `sonnet/medium` → `sonnet/high` → `opus/high` → `opus/xhigh`

## 更新ルール（`python3 tools/routing.py update` が自動で適用）

1. **上げる（自動）**：同じ種別で、直近のタスクが「手戻り2回以上」、または「手戻り」か「失敗」が2回続いたら、1段階上げる
2. **下げる候補（要確認）**：同じ種別で5回続けて「成功」かつ「重さ：軽」なら、状態を「要検討」にする。実際に下げるのは kuro（クロ）の確認後
3. 表を変えたら、理由を `docs/effort-log.md` の「ルーティング変更の記録」に書き、コミットメッセージにも書く
4. **opus は1日3回まで**：超えそうなら sonnet/high で代わりに実行し、ログの所見に「opus上限のため sonnet/high で代替」と書く（`python3 tools/routing.py opus` で今日の残り回数）

## 品質の下限（どのモデルでも下げない）

- 料金データに触れたら、必ず `python3 tools/validate_data.py` を実行する
- 価格・条件の出典（公式ページ）の確認を省略しない
- review は haiku に下げない（`tools/routing.py` が sonnet/low より下にはしない）
