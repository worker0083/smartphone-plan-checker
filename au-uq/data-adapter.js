// data/carriers.json（クロが更新する料金データ）を読み込み、画面の計算が使う形（window.DATA）に変換する
// 料金の数字はここに書かない。ここにあるのは「データの書き方 → 計算の形」の対応だけ
(function () {
  const ERA = s => s ? (s.length >= 7 ? `${s.slice(0, 4)}年${+s.slice(5, 7)}月` : `${s.slice(0, 4)}年`) : undefined;

  // 割引額を取り出す
  const amountFor = (d, planId, lines) => {
    const a = d.amount;
    if (a.type === "fixed") return a.yen;
    if (a.type === "by_plan") return a.table[planId];
    const rows = a.type === "by_lines" ? a.table : (a.table[planId] || null);
    if (!rows) return undefined;
    const ok = rows.filter(r => lines >= r.min_lines).map(r => r.yen);
    return ok.length ? Math.max(...ok) : 0;
  };
  const condTypes = d => {
    const out = [];
    const walk = cs => cs.forEach(c => { out.push(c); if (c.type === "any_of") walk(c.of || []); });
    walk(d.conditions || []);
    return out;
  };

  // 1プランを計算の形に
  function toPlan(carrier, p, discs) {
    const my = (p.discount_ids || []).map(id => discs[id]).filter(Boolean);
    const byKind = k => my.filter(d => d.kind === k);
    const opts = Object.fromEntries((carrier.call_options || []).map(o => [o.id, o]));
    const myOpts = (p.calls && p.calls.option_ids || []).map(id => opts[id]).filter(Boolean);
    const incl = (p.calls && p.calls.included) || "none";
    const shortOpt = myOpts.filter(o => o.covers === "5min" || o.covers === "10min").sort((a, b) => a.yen - b.yen)[0];
    const longOpt = myOpts.find(o => o.covers === "unlimited");

    const tiers = p.price.type === "flat"
      ? [[p.data.cap_gb == null ? Infinity : p.data.cap_gb, p.price.yen]]
      : p.price.tiers.map(t => [t.up_to_gb == null ? Infinity : t.up_to_gb, t.yen]);

    const out = {
      id: p.id, name: p.name, tiers,
      callShort: incl === "5min" || incl === "10min" || incl === "unlimited" ? 0 : (shortOpt ? shortOpt.yen : 0),
      callLong: incl === "unlimited" ? 0 : (longOpt ? longOpt.yen : 0),
      checked_at: p.checked_at, confidence: p.confidence || "confirmed", source_url: p.source_url,
    };
    if (p.status === "ended") out.ended = ERA(p.ended_on) || "受付終了";

    // 少ない月の自動割引（〜5GB など）
    const usage = byKind("usage").find(d => condTypes(d).some(c => c.type === "data_usage_max"));
    if (usage) out.low = [condTypes(usage).find(c => c.type === "data_usage_max").max, amountFor(usage, p.id, 1)];

    // 自宅セット割（ネット・でんき）
    const set = byKind("set_home")[0];
    if (set) {
      out.set = amountFor(set, p.id, 1);
      const minC = condTypes(set).find(c => c.type === "data_usage_min");
      if (minC) out.setMinGb = minC.min;
      out.setName = set.name;
      out.setDenki = condTypes(set).some(c => c.type === "electricity");
    } else out.set = false;

    // 家族割
    const fam = byKind("family")[0];
    if (fam) {
      out.fam2 = amountFor(fam, p.id, 2) || 0;
      out.fam3 = amountFor(fam, p.id, 3) || 0;
      const f4 = amountFor(fam, p.id, 4);
      if (f4 && f4 !== out.fam3) out.fam4 = f4;
      out.famName = fam.name;
    }
    // カード払い
    const pay = byKind("payment")[0];
    out.card = pay ? amountFor(pay, p.id, 1) : false;
    if (pay) out.cardName = pay.name;
    // 契約の種類による割引（2年契約N など）：旧プランの人は契約していることが多いので、今の月額の計算では付けて表示する
    const contract = byKind("contract")[0];
    if (contract) {
      out.contract = amountFor(contract, p.id, 1) || 0; out.contractName = contract.name;
      // 「au PAYカード割か2年契約Nのどちらか」のように同じグループなら、両方は引かない
      out.contractOrCard = !!(pay && contract.exclusive_group && contract.exclusive_group === pay.exclusive_group);
    }
    return out;
  }

  // キャリア全体の設定（新しいプランの比較で使う）
  function toCarrier(c, plans, discs) {
    const all = Object.values(discs);
    const set = all.find(d => d.kind === "set_home");
    const fam = all.find(d => d.kind === "family");
    const pay = all.find(d => d.kind === "payment");
    const denki = set && condTypes(set).some(t => t.type === "electricity");
    const exclusive = set && fam && set.exclusive_group && set.exclusive_group === fam.exclusive_group;
    const active = plans.filter(p => !p.ended);
    return {
      id: c.id, name: c.name, plans: active,
      net: set ? { amt: 0, label: set.name + (denki ? "（インターネットコース）" : "") } : null,
      denki: denki ? { amt: 0, label: set.name + "（でんきコース）" } : null,
      stack: !denki,                       // ネットとでんきの両方を受けられるか（「どちらか1つ」の書き方なら false）
      famWithSet: !exclusive,              // 家族割とセット割を重ねられるか
      famName: fam ? fam.name : "",
      card: pay ? 1 : 0, cardName: pay ? pay.name.replace(/（.*）$/, "") : "",
      checked_at: c.checked_at, source_url: c.source_url,
    };
  }

  window.applyCarrierData = function (json) {
    const D = window.DATA;
    D.carrierData = json;
    D.stale = json.stale_days;
    D.updated = json.updated_at.replace(/^(\d{4})-(\d{2})-(\d{2})$/, (_, y, m, d) => `${y}年${+m}月${+d}日`);
    D.carriers = [];
    D.currentPlans = {};
    for (const c of json.carriers) {
      if (!["au", "uq"].includes(c.id)) continue;           // 今の画面は au・UQ のみ（他社はステップ5で）
      const discs = Object.fromEntries((c.discounts || []).map(d => [d.id, d]));
      const plans = c.plans.map(p => toPlan(c, p, discs));
      D.currentPlans[c.id] = plans;
      D.carriers.push(toCarrier(c, plans, discs));
      // UQ親子応援割（年齢の条件がある期間限定の割引）
      const oy = (c.discounts || []).find(d => d.kind === "age" && d.duration_months);
      if (oy) {
        const names = c.plans.filter(p => (p.discount_ids || []).includes(oy.id)).map(p => p.name);
        D.uqOyako = { amt: amountFor(oy, null, 1), months: oy.duration_months, plans: names,
          label: `${oy.name}（${oy.duration_months === 12 ? "1年間" : oy.duration_months + "か月"}）`, checked_at: oy.checked_at };
      }
    }
    if (!D.uqOyako) D.uqOyako = { amt: 0, months: 0, plans: [], label: "" };
  };

  // 読み込み：公開ページは ../data/、非公開版（claude.ai）は同じ場所の data/
  window.loadCarrierData = async function () {
    const urls = ["../data/carriers.json", "data/carriers.json"];
    let lastErr;
    for (const u of urls) {
      try {
        const r = await fetch(`${u}?t=${Date.now()}`, { cache: "no-store" });
        if (r.ok) return r.json();
        lastErr = new Error(`${u}: ${r.status}`);
      } catch (e) { lastErr = e; }
    }
    throw lastErr;
  };
})();
