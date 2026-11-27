#!/usr/bin/env python3
"""data/carriers.json のチェック

  python3 tools/validate_data.py                 # 形式・参照・公式の支払い例（examples）をチェック
  python3 tools/validate_data.py --stale         # 確認日（checked_at）が古い項目の一覧（月1回の再確認用）
  python3 tools/validate_data.py --today 2026-12-31 --stale

必要なもの：pip install jsonschema
"""
import argparse, datetime, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "carriers.json"
SCHEMA = ROOT / "data" / "carriers.schema.json"


def load():
    return json.loads(DATA.read_text(encoding="utf-8")), json.loads(SCHEMA.read_text(encoding="utf-8"))


# ───── 1. 形式（JSON Schema）─────
def check_schema(doc, schema):
    import jsonschema
    v = jsonschema.Draft202012Validator(schema)
    errs = []
    for e in sorted(v.iter_errors(doc), key=lambda e: [str(x) for x in e.absolute_path]):
        where = readable_path(doc, e.absolute_path)
        errs.append(f"[形式] {where}: {e.message}")
    return errs


def readable_path(doc, path):
    """carriers/4/discounts/1 → softbank / 割引 paypay_card_wari のように読める場所にする"""
    names = {"carriers": "", "plans": "プラン", "discounts": "割引", "examples": "支払い例", "call_options": "通話オプション",
             "campaigns": "キャンペーン", "conditions": "条件", "home_internet": "光回線"}
    out, node, key = [], doc, None
    for p in path:
        nxt = node[p] if isinstance(node, (list, dict)) else None
        if isinstance(p, int) and isinstance(nxt, dict):
            label = nxt.get("id") or (nxt.get("label", "")[:30] if "label" in nxt else None) or (nxt.get("type") if key == "conditions" else None) or f"{p + 1}番目"
            out.append((names.get(key, key) + " " if names.get(key, key) else "") + str(label))
        elif isinstance(p, str) and p not in names:
            out.append(p)
        key, node = p, nxt
    return " / ".join(out) or "(全体)"


# ───── 2. ID の重複・参照切れ ─────
def check_refs(doc):
    errs = []
    hi_ids = {h["id"] for h in doc.get("home_internet", [])}
    cids = [c["id"] for c in doc["carriers"]]
    for dup in {i for i in cids if cids.count(i) > 1}:
        errs.append(f"[参照] キャリアIDが重複：{dup}")
    for c in doc["carriers"]:
        cid = c["id"]
        plans = {p["id"] for p in c["plans"]}
        discs = {d["id"]: d for d in c.get("discounts", [])}
        opts = {o["id"] for o in c.get("call_options", [])}
        for kind, ids in (("プラン", [p["id"] for p in c["plans"]]), ("割引", list(discs)), ("通話オプション", list(opts))):
            for dup in {i for i in ids if ids.count(i) > 1}:
                errs.append(f"[参照] {cid}：{kind}IDが重複：{dup}")
        for p in c["plans"]:
            for d in p.get("discount_ids", []):
                if d not in discs: errs.append(f"[参照] {cid}/{p['id']}：discount_ids の {d} が discounts にない")
            for o in p.get("calls", {}).get("option_ids", []):
                if o not in opts: errs.append(f"[参照] {cid}/{p['id']}：option_ids の {o} が call_options にない")
        for d in discs.values():
            t = d["amount"]
            if t["type"] in ("by_plan", "by_plan_lines"):
                for pid in t["table"]:
                    if pid not in plans: errs.append(f"[参照] {cid}/{d['id']}：割引額の表のプラン {pid} がない")
            for o in d.get("not_combinable_with", []) + d.get("overrides", []):
                if o not in discs: errs.append(f"[参照] {cid}/{d['id']}：{o} が discounts にない")
            for cond in walk_conditions(d.get("conditions", [])):
                if cond["type"] == "home_internet":
                    for h in cond.get("values", []):
                        if h not in hi_ids: errs.append(f"[参照] {cid}/{d['id']}：光回線 {h} が home_internet にない")
        for ex in c.get("examples", []):
            for o in ex.get("inputs", {}).get("call_option_ids", []):
                if o not in opts: errs.append(f"[参照] {cid}：支払い例「{ex['label']}」の通話オプション {o} がない")
            if ex["plan_id"] not in plans: errs.append(f"[参照] {cid}：支払い例「{ex['label']}」のプラン {ex['plan_id']} がない")
        for camp in c.get("campaigns", []):
            for pid in camp.get("plan_ids", []):
                if pid not in plans: errs.append(f"[参照] {cid}/{camp['id']}：キャンペーンのプラン {pid} がない")
    return errs


def walk_conditions(conds):
    for c in conds:
        yield c
        if c["type"] == "any_of":
            yield from walk_conditions(c.get("of", []))


# ───── 3. 計算（公式の支払い例と照合）─────
# 画面の計算と同じ規則を、データの書き方どおりに素直に実装したもの
def plan_price(plan, gb):
    pr = plan["price"]
    if pr["type"] == "flat": return pr["yen"]
    if pr["type"] == "metered":                    # 従量制：超えた分は1GBごと（切り上げ）
        import math
        over = max(0, math.ceil(gb - pr["included_gb"] - 1e-9))
        return pr["base_yen"] + over * pr["per_gb_yen"]
    for t in pr["tiers"]:
        if t["up_to_gb"] is None or gb <= t["up_to_gb"]: return t["yen"]
    return pr["tiers"][-1]["yen"]


def cond_ok(c, inp, hi):
    t = c["type"]
    if t == "any_of": return any(cond_ok(x, inp, hi) for x in c["of"])
    if t == "home_internet":
        h = inp.get("home_internet")
        if h not in c.get("values", []): return False
        need_phone = c.get("with_phone", hi.get(h, {}).get("requires_phone", False))
        return bool(inp.get("with_phone")) or not need_phone
    if t == "electricity": return inp.get("electricity") in c.get("values", [])
    if t == "family_lines": return inp.get("family_lines", 1) >= c.get("min", 1)
    if t == "age":
        a = inp.get("age")
        return a is not None and c.get("min", 0) <= a <= c.get("max", 200)
    if t == "payment": return inp.get("payment") in c.get("values", [])
    if t == "contract": return inp.get("contract") in c.get("values", [])
    if t == "data_usage_max": return inp.get("data_gb", 0) <= c["max"]
    if t == "data_usage_min": return inp.get("data_gb", 0) > c["min"]
    if t == "new_subscription": return bool(inp.get("new_subscription"))
    if t == "mnp_in": return bool(inp.get("mnp_in"))
    return False   # other：機械判定できない条件は付けない


def disc_amount(d, plan_id, lines):
    a = d["amount"]
    if a["type"] == "fixed": return a["yen"]
    if a["type"] == "by_plan": return a["table"].get(plan_id)
    rows = a["table"] if a["type"] == "by_lines" else a["table"].get(plan_id)
    if rows is None: return None
    ok = [r["yen"] for r in rows if lines >= r["min_lines"]]
    return max(ok) if ok else 0


def calc(carrier, plan, inp, hi):
    discs = {d["id"]: d for d in carrier.get("discounts", [])}
    lines = inp.get("family_lines", 1)
    applied = {}
    for did in plan.get("discount_ids", []):
        d = discs.get(did)
        if d is None: continue                      # 参照切れは check_refs で報告済み
        start = d.get("starts_after_months") or 0          # 「◯か月が過ぎてから」付く割引
        month = inp.get("month")
        if start and (month is None or month <= start + 1): continue
        if d.get("duration_months") and month and month > start + d["duration_months"] + 1: continue
        if not all(cond_ok(c, inp, hi) for c in d.get("conditions", [])): continue
        amt = disc_amount(d, plan["id"], lines)
        if amt: applied[did] = amt
    for did in list(applied):                       # overrides：これが付くと外れる割引
        for o in discs[did].get("overrides", []): applied.pop(o, None)
    for did in list(applied):                       # 重ねられない割引：大きい方
        for o in discs[did].get("not_combinable_with", []):
            if o in applied and did in applied: applied.pop(o if applied[o] <= applied[did] else did)
    groups = {}
    for did, amt in applied.items():                # 同じ exclusive_group は1つだけ（大きい方）
        g = discs[did].get("exclusive_group")
        if g: groups.setdefault(g, []).append(did)
    for g, ids in groups.items():
        keep = max(ids, key=lambda i: applied[i])
        for i in ids:
            if i != keep: applied.pop(i)
    opts = {o["id"]: o["yen"] for o in carrier.get("call_options", [])}
    calls = sum(opts.get(o, 0) for o in inp.get("call_option_ids", []))
    return plan_price(plan, inp.get("data_gb", 0)) - sum(applied.values()) + calls, applied


def check_examples(doc):
    errs, ok, skipped = [], 0, []
    hi = {h["id"]: h for h in doc.get("home_internet", [])}
    for c in doc["carriers"]:
        plans = {p["id"]: p for p in c["plans"]}
        for ex in c.get("examples", []):
            if ex["plan_id"] not in plans: continue
            if ex.get("skip_reason"):
                skipped.append(f"{c['id']}「{ex['label'][:40]}」：{ex['skip_reason']}"); continue
            got, applied = calc(c, plans[ex["plan_id"]], ex["inputs"], hi)
            if got == ex["expected_yen"]: ok += 1
            else: errs.append(f"[支払い例] {c['id']}「{ex['label']}」：公式 {ex['expected_yen']:,}円／計算 {got:,}円（付いた割引：{', '.join(f'{k} −{v}' for k, v in applied.items()) or 'なし'}）")
    return errs, ok, skipped


# ───── 4. 確認日が古い項目 ─────
def stale_items(doc, today):
    warn, alert = doc["stale_days"]["warn"], doc["stale_days"]["alert"]
    out = []
    def chk(where, o):
        if "checked_at" not in o: return
        days = (today - datetime.date.fromisoformat(o["checked_at"])).days
        if days > warn: out.append((days, "要再確認" if days > alert else "古い", where, o["checked_at"], o.get("source_url", "")))
    for c in doc["carriers"]:
        chk(f"{c['name']}", c)
        if "fees" in c: chk(f"{c['name']} / 初期費用", c["fees"])
        for p in c["plans"]: chk(f"{c['name']} / {p['name']}", p)
        for d in c.get("discounts", []): chk(f"{c['name']} / 割引：{d['name']}", d)
        for o in c.get("call_options", []): chk(f"{c['name']} / 通話：{o['name']}", o)
        for k in c.get("campaigns", []): chk(f"{c['name']} / キャンペーン：{k['name']}", k)
        for e in c.get("examples", []): chk(f"{c['name']} / 支払い例：{e['label']}", e)
    for h in doc.get("home_internet", []): chk(f"光回線：{h['name']}", h)
    return sorted(out, reverse=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stale", action="store_true", help="確認日が古い項目を一覧にする")
    ap.add_argument("--today", help="基準日 YYYY-MM-DD（省略時は今日）")
    a = ap.parse_args()
    doc, schema = load()
    errs = check_schema(doc, schema)
    if not errs:                    # 形式が正しいときだけ中身を見る
        errs += check_refs(doc)
        ex_errs, ok, skipped = check_examples(doc)
        errs += ex_errs
    else:
        ok, skipped = 0, []
    n_plans = sum(len(c["plans"]) for c in doc.get("carriers", []))
    print(f"キャリア {len(doc.get('carriers', []))}社・プラン {n_plans}件・公式の支払い例 一致 {ok}件")
    for e in errs: print("✗", e)
    for sk in skipped: print("－ 照合から除外：", sk)
    if a.stale:
        today = datetime.date.fromisoformat(a.today) if a.today else datetime.date.today()
        rows = stale_items(doc, today)
        print(f"\n確認日の古い項目（{today} 時点・{doc['stale_days']['warn']}日超）：{len(rows)}件")
        for days, level, where, d, url in rows: print(f"  {level}  {days}日前  {where}  （確認日 {d}）  {url}")
    if errs:
        print(f"\nエラー {len(errs)}件"); sys.exit(1)
    print("OK")


if __name__ == "__main__":
    main()
