# smartphone-plan-checker の作業ルール

## タスクのルーティング（必ず守る）
- セッション開始時と各タスクの開始時に `.claude/task-routing.md` を読み、タスク種別（design／implement／data／verify／review／chore）を決めてから始める
- メインのセッションは design（設計・方針判断）を担当する。ほかの種別は表の「担当」のエージェント（`.claude/agents/`）に Agent ツールで任せる（モデル・エフォートは表と同じ値）
- opus は1日3回まで。`python3 tools/routing.py opus` で残りを確認し、超えるときは sonnet/high で代わりに実行してログに書く
- タスクが終わったら `docs/effort-log.md` に1行追記し、`python3 tools/routing.py update` を実行する。表が変わったら、変更理由をコミットメッセージにも書く
- 下げる候補（要検討）を実際に下げるのは kuro（クロ）の確認後。上げるのは自動でよい

## 品質の下限（どのモデルでも省略しない）
- 料金データに触れたら `python3 tools/validate_data.py` を必ず実行する
- 価格・条件の出典（公式ページ）の確認を省略しない
- review は haiku に下げない

## 役割分担
- 料金データ（`data/carriers.json`）の調査・更新はクロ（調査チーム）。Claude は読む側。クロは `data/kuro` ブランチ → main へのプルリクエスト、取り込みは本人
- クロへの確認・依頼は、そのままコピーして渡せるコードブロックにまとめる（「クロさんへ（実装チームのClaudeより）」で始める）

## 公開
- 乗り換え診断は `au-uq/`（GitHub Pages）。画面を変えたら `au-uq/README.md` の「バージョンの上げ方」に従って版を上げる
