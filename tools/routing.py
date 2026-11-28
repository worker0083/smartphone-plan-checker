#!/usr/bin/env python3
"""タスクのルーティング表（.claude/task-routing.md）と実績ログ（docs/effort-log.md）を扱う

  python3 tools/routing.py get <キー>     # 例: get implement → --model sonnet --effort medium（無人実行ランナー用）
  python3 tools/routing.py show           # 今の表
  python3 tools/routing.py update         # 実績ログから更新ルールを適用（上げる＝自動、下げる＝「要検討」の印だけ）
  python3 tools/routing.py sync           # 表の値を .claude/agents/*.md に反映
  python3 tools/routing.py opus           # 今日の opus 使用回数と残り
  python3 tools/routing.py check          # 表・エージェント・品質の下限の整合チェック（CI 用）
"""
import datetime, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TABLE = ROOT / ".claude" / "task-routing.md"
LOG = ROOT / "docs" / "effort-log.md"
AGENTS = ROOT / ".claude" / "agents"

LADDER = [("haiku", "low"), ("haiku", "medium"), ("sonnet", "low"), ("sonnet", "medium"),
          ("sonnet", "high"), ("opus", "high"), ("opus", "xhigh")]
FLOOR = {"review": ("sonnet", "low")}          # 品質の下限：review は haiku にしない
OPUS_PER_DAY = 3

# 種別ごとのエージェント（メインのセッションが担当する design と、クロが担当する data は作らない）
AGENT_DEFS = {
    "implement": ("implementer", "画面・計算ロジックの変更を実装する。変更後は回帰テストと validate_data.py を実行する",
                  "Read, Edit, Write, Bash, Grep, Glob"),
    "verify": ("checker", "検証・チェック（validate_data.py の実行、差分・スナップショットの比較、Playwright での画面確認）を行い、結果だけを短く報告する。リポジトリのファイルは変更しない。ブラウザ確認のスクリプトはファイルにせず node -e '...' で直接実行する（ファイル書き込みの道具は持たない）",
               "Read, Bash, Grep, Glob"),
    "review": ("reviewer", "PR の最終確認。料金・条件は出典（公式ページ）と支払い例で確かめ、validate_data.py を必ず実行する",
               "Read, Bash, Grep, Glob"),
    "chore": ("chore", "定型作業（整形、コミット、PR 本文の下書き）。内容の判断が要るものはメインに戻す",
              "Read, Edit, Bash, Grep, Glob"),
}


def step(model, effort):
    return LADDER.index((model, effort)) if (model, effort) in LADDER else None


# ───── 表とログの読み書き ─────
def block(text, name):
    m = re.search(rf"<!-- {name}:start.*?-->\n(.*?)<!-- {name}:end -->", text, re.S)
    if not m: sys.exit(f"{name} の区切りが見つからない")
    return m


def rows(md):
    out = []
    for line in md.strip().splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if not cells or set(cells[0]) <= {"-", ""} or cells[0] in ("キー", "日付"): continue
        out.append(cells)
    return out


def read_table():
    t = TABLE.read_text(encoding="utf-8")
    return t, [dict(zip(["key", "name", "model", "effort", "owner", "state", "note"], r)) for r in rows(block(t, "routing:table").group(1))]


def write_table(text, table):
    head = "| キー | タスク種別 | モデル | エフォート | 担当 | 状態 | 備考 |\n|---|---|---|---|---|---|---|\n"
    body = "".join(f"| {r['key']} | {r['name']} | {r['model']} | {r['effort']} | {r['owner']} | {r['state']} | {r['note']} |\n" for r in table)
    m = block(text, "routing:table")
    TABLE.write_text(text[:m.start(1)] + head + body + text[m.end(1):], encoding="utf-8")


def read_log():
    t = LOG.read_text(encoding="utf-8")
    log = [dict(zip(["date", "key", "model", "effort", "result", "rework", "weight", "memo"], r)) for r in rows(block(t, "effort-log").group(1))]
    changes = [dict(zip(["date", "key", "before", "after", "reason"], r)) for r in rows(block(t, "routing-changes").group(1))]
    return t, log, changes


MARK = "［表変更］"


def mark_log_row(key):
    """表を変えるきっかけになった実績（その種別の最後の行）に印を付ける。次の判定は印より後の実績だけで行う"""
    t = LOG.read_text(encoding="utf-8")
    m = block(t, "effort-log")
    lines = m.group(1).splitlines(keepends=True)
    for i in range(len(lines) - 1, -1, -1):
        cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
        if len(cells) >= 8 and cells[1] == key and MARK not in cells[7]:
            cells[7] = (cells[7] + " " + MARK).strip()
            lines[i] = "| " + " | ".join(cells) + " |\n"
            break
    LOG.write_text(t[:m.start(1)] + "".join(lines) + t[m.end(1):], encoding="utf-8")


def add_change(date, key, before, after, reason):
    t = LOG.read_text(encoding="utf-8")
    m = block(t, "routing-changes")
    LOG.write_text(t[:m.end(1)] + f"| {date} | {key} | {before} | {after} | {reason} |\n" + t[m.end(1):], encoding="utf-8")


# ───── コマンド ─────
def cmd_get(key):
    _, table = read_table()
    r = next((r for r in table if r["key"] == key), None)
    if not r: sys.exit(f"種別 {key} は表にない（{', '.join(x['key'] for x in table)}）")
    model, effort = r["model"], r["effort"]
    if model == "opus" and opus_used_today() >= OPUS_PER_DAY:      # 上限：sonnet/high で代替
        print(f"# opus は今日 {OPUS_PER_DAY} 回使用済み → sonnet/high で代替（ログの所見に書くこと）", file=sys.stderr)
        model, effort = "sonnet", "high"
    print(f"--model {model} --effort {effort}")


def opus_used_today(today=None):
    today = today or datetime.date.today().isoformat()
    _, log, _ = read_log()
    return sum(1 for r in log if r["date"] == today and r["model"] == "opus")


def cmd_opus():
    n = opus_used_today()
    print(f"今日の opus 使用：{n}回／上限 {OPUS_PER_DAY}回（残り {max(0, OPUS_PER_DAY - n)}回）")


def cmd_update(today=None):
    today = today or datetime.date.today().isoformat()
    text, table = read_table()
    _, log, changes = read_log()
    notes = []
    for r in table:
        key = r["key"]
        mine = [x for x in log if x["key"] == key]
        # 前回表を変えたきっかけの行（［表変更］の印）より後の実績だけで判断する（同じ実績で何度も変えない）
        marks = [i for i, x in enumerate(mine) if MARK in x["memo"]]
        recent = mine[marks[-1] + 1:] if marks else mine
        cur = step(r["model"], r["effort"])
        if cur is None:
            notes.append(f"{key}：{r['model']}/{r['effort']} は段階表にないので判定しない"); continue
        last = recent[-1] if recent else None
        up_reason = None
        if last and last["rework"].isdigit() and int(last["rework"]) >= 2:
            up_reason = f"直近のタスクで手戻り{last['rework']}回"
        elif len(recent) >= 2 and all(x["result"] in ("手戻り", "失敗") for x in recent[-2:]):
            up_reason = f"「{recent[-2]['result']}」「{recent[-1]['result']}」が続いた"
        if up_reason and cur < len(LADDER) - 1:
            nm, ne = LADDER[cur + 1]
            before = f"{r['model']}/{r['effort']}"
            r["model"], r["effort"], r["state"] = nm, ne, "通常"
            add_change(today, key, before, f"{nm}/{ne}", f"自動で1段階上げ：{up_reason}")
            mark_log_row(key)
            notes.append(f"↑ {key}：{before} → {nm}/{ne}（{up_reason}）")
            continue
        last5 = recent[-5:]
        floor = step(*FLOOR[key]) if key in FLOOR else 0
        if len(last5) == 5 and all(x["result"] == "成功" and x["weight"] == "軽" for x in last5) and cur > floor:
            if r["state"] != "要検討":
                r["state"] = "要検討"
                add_change(today, key, f"{r['model']}/{r['effort']}", f"（要検討）{LADDER[cur - 1][0]}/{LADDER[cur - 1][1]}", "5回続けて成功かつ軽。下げるのは kuro の確認後")
                mark_log_row(key)
                notes.append(f"？ {key}：下げる候補（要検討）→ {LADDER[cur - 1][0]}/{LADDER[cur - 1][1]}。kuro の確認待ち")
    write_table(text, table)
    print("\n".join(notes) if notes else "変更なし")
    if any(n.startswith(("↑", "？")) for n in notes):
        cmd_sync()                                   # エージェント定義も表に合わせる
        print("\n表を変えたので、コミットメッセージに変更理由を書くこと（docs/effort-log.md の「ルーティング変更の記録」と同じ内容）")


def cmd_sync():
    _, table = read_table()
    AGENTS.mkdir(parents=True, exist_ok=True)
    for r in table:
        if r["key"] not in AGENT_DEFS: continue
        name, desc, tools = AGENT_DEFS[r["key"]]
        body = f"""---
name: {name}
description: {desc}
model: {r['model']}
effort: {r['effort']}
tools: {tools}
---
<!-- このファイルは tools/routing.py sync が .claude/task-routing.md から作る。手で直さない -->
あなたは smartphone-plan-checker の「{r['name']}」担当です。

- 作業の前に `.claude/task-routing.md` の「品質の下限」を読み、守ること
- 料金データ（data/carriers.json）に触れたら `python3 tools/validate_data.py` を必ず実行する
- 価格・条件は出典（公式ページ）で確かめる。確かめられない値は推測で埋めない
- 終わったら、結果（成功／手戻り／失敗）・手戻り回数・重さ（軽／普通／重）・所見を短く報告する（メインが docs/effort-log.md に記録する）
"""
        (AGENTS / f"{name}.md").write_text(body, encoding="utf-8")
        print(f".claude/agents/{name}.md ← {r['model']}/{r['effort']}")


def cmd_check():
    errs = []
    _, table = read_table()
    keys = {r["key"] for r in table}
    for k in ["design", "implement", "data", "verify", "review", "chore"]:
        if k not in keys: errs.append(f"種別 {k} が表にない")
    for r in table:
        if step(r["model"], r["effort"]) is None: errs.append(f"{r['key']}：{r['model']}/{r['effort']} は段階表にない")
        if r["key"] in FLOOR and (step(r["model"], r["effort"]) or 0) < step(*FLOOR[r["key"]]):
            errs.append(f"{r['key']}：品質の下限（{'/'.join(FLOOR[r['key']])}）より下になっている")
        if r["key"] in AGENT_DEFS:
            f = AGENTS / f"{AGENT_DEFS[r['key']][0]}.md"
            t = f.read_text(encoding="utf-8") if f.exists() else ""
            if f"model: {r['model']}" not in t or f"effort: {r['effort']}" not in t:
                errs.append(f"{f.relative_to(ROOT)} が表（{r['model']}/{r['effort']}）と違う → python3 tools/routing.py sync")
    _, log, _ = read_log()
    for x in log:
        if x["key"] not in keys: errs.append(f"ログ {x['date']}：種別 {x['key']} が表にない")
        if x["result"] not in ("成功", "手戻り", "失敗"): errs.append(f"ログ {x['date']}：結果「{x['result']}」は 成功／手戻り／失敗 のどれか")
    for e in errs: print("✗", e)
    print("OK" if not errs else f"エラー {len(errs)}件")
    sys.exit(1 if errs else 0)


def cmd_show():
    _, table = read_table()
    for r in table: print(f"{r['key']:10} {r['model']:7} {r['effort']:7} {r['state']:4} {r['owner']}")


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] not in ("get", "show", "update", "sync", "opus", "check"): print(__doc__); sys.exit(1)
    {"get": lambda: cmd_get(a[1] if len(a) > 1 else ""), "show": cmd_show, "update": lambda: cmd_update(a[1] if len(a) > 1 else None),
     "sync": cmd_sync, "opus": cmd_opus, "check": cmd_check}[a[0]]()
