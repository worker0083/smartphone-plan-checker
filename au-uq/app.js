// 料金診断の画面と計算（料金データは data/carriers.json から data-adapter.js が読み込む）
const APP_VERSION = "2.9.1";
const APP_DATE = "2026-11-27";
document.getElementById("version").textContent = `v${APP_VERSION}（${APP_DATE.replace(/-/g, "/")} 更新・料金データ ${DATA.updated}）`;

// ───── 更新チェック：公開中の version.json と比べて、古ければ「最新版に更新」ボタンを出す ─────
const newer = (a, b) => { // a が b より新しいか
  const x = a.split(".").map(Number), y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); }
  return false;
};
let latest = null;
async function checkUpdate(manual) {
  try {
    const r = await fetch(`version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) throw new Error();
    const v = await r.json();
    if (v.version && newer(v.version, APP_VERSION)) {
      latest = v.version;
      document.getElementById("updateText").textContent = `新しいバージョン v${v.version} があります（今は v${APP_VERSION}）${v.notes ? "：" + v.notes : ""}`;
      document.getElementById("updateBar").classList.add("show");
    } else if (manual) alert(`最新版（v${APP_VERSION}）です。`);
  } catch (e) { if (manual) alert("更新を確認できませんでした。通信状態を確かめてください。"); }
}
// 入力内容を一時保存して、更新後に戻す
const FORM_KEY = "auuq-form";
const formFields = () => [...document.getElementById("form").querySelectorAll("input, select")].filter(el => !el.closest("#persons"));
function saveForm() {
  const vals = formFields().map(el => el.type === "radio" || el.type === "checkbox" ? el.checked : el.value);
  try { sessionStorage.setItem(FORM_KEY, JSON.stringify({ persons: readPersons(), vals, shown: !!document.getElementById("result").innerHTML })); } catch (e) {}
}
function restoreForm() {
  let d; try { d = JSON.parse(sessionStorage.getItem(FORM_KEY)); sessionStorage.removeItem(FORM_KEY); } catch (e) {}
  if (!d || !d.persons) return;
  renderPersons(d.persons);
  const els = formFields();
  if (els.length === d.vals.length) {
    els.forEach((el, i) => { if (el.type === "radio" || el.type === "checkbox") el.checked = d.vals[i]; else el.value = d.vals[i]; });
    if ($("#netCost").value !== "") netCostTouched = true;
  }
  onNetChange();
  if ($("#current").value) $("#totalBox").open = true;
  if (d.shown) diagnose();
}
document.getElementById("updateBtn").addEventListener("click", () => {
  saveForm();
  const u = new URL(location.href);
  u.searchParams.set("v", latest || Date.now()); // キャッシュを避けるため版番号付きで読み込み直す
  location.replace(u.toString());
});
document.getElementById("checkBtn").addEventListener("click", () => checkUpdate(true));
checkUpdate();
document.addEventListener("visibilitychange", () => { if (!document.hidden) checkUpdate(); });
setInterval(checkUpdate, 10 * 60 * 1000);

const yen = n => n.toLocaleString("ja-JP") + "円";
const $ = s => document.querySelector(s);
const val = name => (document.querySelector(`input[name=${name}]:checked`) || {}).value;
const AU = DATA.carriers.find(c => c.id === "au");
const UQ = DATA.carriers.find(c => c.id === "uq");

const GB_OPTS = [[1, "〜1GB"], [3, "〜3GB"], [5, "〜5GB"], [10, "〜10GB"], [20, "〜20GB"], [30, "〜30GB"], [35, "〜35GB"], [Infinity, "それ以上・無制限"]];
const CALL_OPTS = [["none", "ほぼしない"], ["short", "短い通話が多い"], ["long", "長電話する"]];

// ───── 今のネット会社 ─────
const netCoSel = $("#netCo");
netCoSel.innerHTML = [["セット割の対象", c => c.set], ["セット割の対象外", c => !c.set]].map(([g, f]) =>
  `<optgroup label="${g}">${DATA.netCompanies.filter(f).map(c => `<option value="${c.id}">${c.name}</option>`).join("")}</optgroup>`).join("");
netCoSel.value = "other";
const curNetCo = () => DATA.netCompanies.find(c => c.id === netCoSel.value);
// 今のネットで au / UQ のセット割が付くか
const curNetSet = () => { const c = curNetCo(); return c.set === "any" || (c.set === "phone" && val("netPhone") === "yes"); };
let netCostTouched = false;
$("#netCost").addEventListener("input", () => { netCostTouched = true; });
function onNetChange() {
  const c = curNetCo();
  $("#netPhoneBox").style.display = c.set === "phone" ? "flex" : "none";
  $("#netSetNote").textContent = c.set === "phone" ? (val("netPhone") === "yes" ? "au / UQ のセット割の対象です。" : "ネットのみだとセット割の対象外です（固定電話も契約すると対象）。")
    : c.set === "any" ? "au / UQ のセット割の対象です（対象の料金プランの場合）。" : c.id === "none" ? "" : "au / UQ のセット割の対象外です。";
  if (!netCostTouched) {
    const v = c[$("#house").value];
    $("#netCost").value = v === undefined ? "" : v;
  }
  if ($("#result").innerHTML) diagnose();
}
[netCoSel, $("#house")].forEach(el => el.addEventListener("change", onNetChange));

// ───── 1人ずつの入力欄 ─────
const CARRIERS = [["docomo", "ドコモ"], ["softbank", "ソフトバンク"], ["ymobile", "ワイモバイル"], ["rakuten", "楽天モバイル"],
  ["online", "ahamo・LINEMO"], ["mvno", "格安SIM"], ["au", "au"], ["uq", "UQ mobile"]];
const carrierName = id => (CARRIERS.find(c => c[0] === id) || [, ""])[1];
const isOwn = id => id === "au" || id === "uq";
const defaultPerson = from => ({ from: from || "docomo", now: "", amount: "", gb: "5", call: "none", fix: "auto", u18: false });
function nowPlanOptions(cid, sel) {
  const list = DATA.currentPlans[cid];
  const norm = x => String(x || "").replace(/-/g, "_");
  const opt = p => `<option value="${p.id}" ${p.id === norm(sel) ? "selected" : ""}>${p.name}${p.ended ? `（${p.ended}受付終了）` : ""}</option>`;
  return `<option value="">わからない・その他</option>
    <optgroup label="今のプラン">${list.filter(p => !p.ended).map(opt).join("")}</optgroup>
    <optgroup label="新規受付終了のプラン">${list.filter(p => p.ended).map(opt).join("")}</optgroup>`;
}
// 画面の入力 → 配列
function readPersons() {
  return [...document.querySelectorAll("#persons .person")].map(el => ({
    from: (el.querySelector(".from:checked") || {}).value || "docomo",
    now: (el.querySelector(".now") || {}).value || "",
    amount: el.querySelector(".amount").value,
    gb: el.querySelector(".gb").value,
    call: el.querySelector(".call").value,
    fix: (el.querySelector(".fix:checked") || {}).value || "auto",
    u18: el.querySelector(".u18").checked,
  }));
}
// 配列 → 画面
function renderPersons(list) {
  const n = list.length;
  $("#persons").innerHTML = list.map((d, i) => `
    <div class="person from-${d.from}" data-i="${i}">
      <div class="person-head">
        <span class="pno">${i + 1}</span>
        <span class="pname">${i + 1}人目</span>
        ${n > 1 ? `<button type="button" class="del-btn" data-del="${i}">削除</button>` : ""}
      </div>
      <span class="sublabel">今のキャリア</span>
      <div class="chips carrier-grid">
        ${CARRIERS.map(([v, t]) => `<label><input type="radio" class="from" name="from${i}" value="${v}" ${v === d.from ? "checked" : ""}>${t}</label>`).join("")}
      </div>
      ${isOwn(d.from) ? `<div class="q" style="margin-bottom:10px"><span class="sublabel">今の${carrierName(d.from)}のプラン</span>
        <select class="now">${nowPlanOptions(d.from, d.now)}</select></div>` : ""}
      <div class="row3">
        <div><span class="sublabel">データ（1か月）</span>
          <select class="gb">${GB_OPTS.map(([v, t]) => `<option value="${v}" ${String(v) === String(d.gb) ? "selected" : ""}>${t}</option>`).join("")}</select></div>
        <div><span class="sublabel">通話</span>
          <select class="call">${CALL_OPTS.map(([v, t]) => `<option value="${v}" ${v === d.call ? "selected" : ""}>${t}</option>`).join("")}</select></div>
        <div><span class="sublabel">今の月額（円）</span>
          <input type="number" class="amount" inputmode="numeric" min="0" step="any" value="${d.amount}" placeholder="${isOwn(d.from) ? "空欄でも可" : "例：7000"}"></div>
      </div>
      <div class="fix-row"><span class="sublabel">${isOwn(d.from) ? "見直し先" : "乗り換え先"}</span>
        <div class="chips">
          ${[["auto", "おまかせ"], ["au", "au"], ["uq", "UQ mobile"]].map(([v, t]) =>
            `<label><input type="radio" class="fix" name="fix${i}" value="${v}" ${v === d.fix ? "checked" : ""}>${t}</label>`).join("")}
        </div>
        <div class="chips"><label class="u18-chip"><input type="checkbox" class="u18" ${d.u18 ? "checked" : ""}>18歳以下（5〜18歳）</label></div>
      </div>
    </div>`).join("");
}
$("#persons").addEventListener("change", e => {
  if (e.target.classList.contains("from")) {          // キャリアを変えたらプラン欄を出し直す
    const list = readPersons();
    const i = +e.target.closest(".person").dataset.i;
    list[i].now = "";
    renderPersons(list);
  }
  if ($("#result").innerHTML) diagnose();
});
$("#persons").addEventListener("input", e => {
  if (!e.target.classList.contains("amount") || !$("#result").innerHTML) return;
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => diagnose(), 400);
});
$("#persons").addEventListener("click", e => {
  const b = e.target.closest("[data-del]");
  if (!b) return;
  const list = readPersons();
  list.splice(+b.dataset.del, 1);
  renderPersons(list);
  if ($("#result").innerHTML) diagnose();
});
$("#addPerson").addEventListener("click", () => {
  const list = readPersons();
  if (list.length >= 6) { alert("一度に診断できるのは6人までです。"); return; }
  list.push(defaultPerson(list.length ? list[list.length - 1].from : "docomo"));  // 前の人と同じキャリアで追加
  renderPersons(list);
  $("#persons .person:last-child").scrollIntoView({ behavior: "smooth", block: "center" });
  if ($("#result").innerHTML) diagnose();
});
renderPersons([defaultPerson()]);

// ───── 料金計算 ─────
// 1人分：その会社のプランの中でいちばん安いものを選ぶ
function bestPlan(c, person, ctx, famCount, oyako) {
  let best = null;
  const OY = DATA.uqOyako;
  const nowName = person.from === "uq" && person.now ? (DATA.currentPlans.uq.find(x => x.id === person.now) || {}).name : null;
  for (const p of c.plans) {
    const tier = p.tiers.find(([cap]) => person.gb <= cap);
    if (!tier) continue;
    const base = tier[1];
    const lines = [];
    // 自宅セット割
    let set = 0, setLabel = "";
    if (p.set !== false) {
      const amt = typeof p.set === "number" ? p.set : 0;           // 割引額はプランごと（data/carriers.json）
      const netD = ctx.net && c.net ? (amt || c.net.amt) : 0;
      const denD = ctx.denki && c.denki ? (amt || c.denki.amt) : 0;
      if (c.stack) { set = netD + denD; setLabel = [netD && c.net.label, denD && c.denki.label].filter(Boolean).join("・"); }
      else if (netD || denD) { set = Math.max(netD, denD); setLabel = netD >= denD ? c.net.label : c.denki.label; }
    }
    // 家族割
    const fam = p.fam2 ? (famCount >= 3 ? p.fam3 : famCount >= 2 ? p.fam2 : 0) : 0;
    if (c.famWithSet) {
      if (set) lines.push([setLabel, set]);
      if (fam) lines.push([`${c.famName}（${famCount}回線）`, fam]);
    } else if (set >= fam) { if (set) lines.push([setLabel, set]); }
    else lines.push([`${c.famName}`, fam]);
    // カード払い
    const cardAmt = typeof p.card === "number" ? p.card : 0;
    if (ctx.card && cardAmt) lines.push([c.cardName, cardAmt]);
    // UQ親子応援割（すでに同じプランの人は「新たに加入」ではないので対象外）と、少ない月の自動割引（重ねられない：親子応援割が優先）
    const oyHere = oyako && c === UQ && OY.plans.includes(p.name) && nowName !== p.name;
    const lowHere = p.low && person.gb <= p.low[0];
    if (oyHere) lines.push([OY.label + (lowHere ? `（${p.low[0]}GB以下の割引とは重ねられません）` : ""), OY.amt]);
    else if (lowHere) lines.push([`${p.low[0]}GB以下の月の割引`, p.low[1]]);
    const oyGain = oyHere ? OY.amt - (lowHere ? p.low[1] : 0) : 0;   // 親子応援割で実際に安くなる額
    const call = person.call === "short" ? p.callShort : person.call === "long" ? p.callLong : 0;
    const discount = lines.reduce((s, [, a]) => s + a, 0);
    const total = base - discount + call;
    const capLabel = tier[0] === Infinity ? "無制限" : `${tier[0]}GB`;
    const callLabel = person.call === "none" ? "" : person.call === "short" ? (call ? `＋短時間かけ放題 ${yen(call)}` : "（10分かけ放題込み）") : (call ? `＋かけ放題 ${yen(call)}` : "（かけ放題込み）");
    // 使う量で料金が変わるプラン（〜5GBの月は安い）：両方の金額
    let tiersInfo = null;
    if (p.low) {
      if (oyHere) tiersInfo = { cap: p.low[0], high: total, afterHigh: total + OY.amt, afterLow: total + OY.amt - p.low[1] };   // 1年目は使う量に関係なく同じ
      else { const high = lowHere ? total + p.low[1] : total; tiersInfo = { cap: p.low[0], low: high - p.low[1], high }; }
    }
    if (!best || total < best.total) best = { carrier: c, plan: p, cap: tier[0], capLabel, base, lines, call, callLabel, total, oyako: oyGain, oyakoQual: oyHere, tiersInfo };
  }
  return best;
}

// 今のプランの月額（目安）
function nowPlanCost(cid, p, person, ctx, famCount) {
  const tier = p.tiers.find(([cap]) => person.gb <= cap) || p.tiers[p.tiers.length - 1];
  const lines = [];
  if (p.low && person.gb <= p.low[0]) lines.push([`${p.low[0]}GB以下の割引`, p.low[1]]);
  const setOk = p.set && (ctx.net || (cid === "uq" && ctx.denki)) && !(p.setMinGb && person.gb <= p.setMinGb);   // auピタットプランは1GB以下の月はスマートバリューなし
  const set = setOk ? p.set : 0;
  const fam = p.fam2 ? (famCount >= 4 && p.fam4 ? p.fam4 : famCount >= 3 ? p.fam3 : famCount >= 2 ? p.fam2 : 0) : 0;
  const setLabel = cid === "au" ? "auスマートバリュー" : (ctx.net ? "自宅セット割（インターネットコース）" : "自宅セット割（でんきコース）");
  const famLabel = cid === "au" ? `家族割プラス（${famCount}回線）` : "家族セット割";
  if (cid === "au") { if (set) lines.push([setLabel, set]); if (fam) lines.push([famLabel, fam]); }
  else if (set >= fam) { if (set) lines.push([setLabel, set]); } else lines.push([famLabel, fam]);
  if (ctx.card && p.card) lines.push([p.cardName || "au PAYカード払い割", p.card]);
  if (p.contract) lines.push([`${p.contractName}（契約中の場合）`, p.contract]);
  const call = person.call === "short" ? p.callShort : person.call === "long" ? p.callLong : 0;
  const total = tier[1] - lines.reduce((a, [, v]) => a + v, 0) + call;
  const over = person.gb > tier[0];
  let tiersInfo = null;
  if (p.low) {
    const lowHere = person.gb <= p.low[0];
    tiersInfo = { cap: p.low[0], low: lowHere ? total : total - p.low[1], high: lowHere ? total + p.low[1] : total };
  }
  return { plan: p, base: tier[1], cap: tier[0], capLabel: tier[0] === Infinity ? "無制限" : `${tier[0]}GB`, lines, call, total, over, tiersInfo };
}
// 1人ずつの「今の月額」：入力した金額 → なければ au / UQ の今のプランから計算
function estimateNow(persons, ctx) {
  const famNow = { au: persons.filter(p => p.from === "au").length + ctx.exAu, uq: persons.filter(p => p.from === "uq").length + ctx.exUq };
  const rows = persons.map(pr => {
    const plan = isOwn(pr.from) ? DATA.currentPlans[pr.from].find(x => x.id === pr.now) : null;
    const est = plan ? nowPlanCost(pr.from, plan, pr, ctx, famNow[pr.from]) : null;
    const amount = Number(pr.amount) || 0;
    return { from: pr.from, est, amount, total: amount || (est ? est.total : 0), known: !!(amount || est) };
  });
  return { rows, complete: rows.every(r => r.known), total: rows.reduce((a, r) => a + r.total, 0) };
}

// 回線の割り当て（全員au / 全員UQ / 組み合わせ）を計算
function calcAssign(assign, persons, ctx, oyako) {
  // UQ親子応援割：18歳以下の人が UQ の対象プランに新しく入る形なら、家族の UQ 回線も割引
  if (oyako === undefined) {
    const on = persons.some((p, i) => p.u18 && assign[i] === "uq");
    if (!on) return calcAssign(assign, persons, ctx, false);
    const r = calcAssign(assign, persons, ctx, true);
    // 18歳以下の人が「今のプランのまま」になったら割引は付かないので、付けずに計算し直す
    if (r && !r.rows.some((row, i) => persons[i].u18 && row.oyakoQual)) return calcAssign(assign, persons, ctx, false);
    return r;
  }
  const famAu = assign.filter(a => a === "au").length + ctx.exAu;
  const famUq = assign.filter(a => a === "uq").length + ctx.exUq;
  const rows = [];
  for (let i = 0; i < persons.length; i++) {
    const c = assign[i] === "au" ? AU : UQ;
    const fc = assign[i] === "au" ? famAu : famUq;
    let r = bestPlan(c, persons[i], ctx, fc, oyako);
    // 今 au / UQ の人は「今のプランのまま」も候補にする
    const pr = persons[i];
    const cur = pr.from === assign[i] && pr.now ? DATA.currentPlans[pr.from].find(x => x.id === pr.now) : null;
    if (cur) {
      const k = nowPlanCost(pr.from, cur, pr, ctx, fc);
      if (!k.over && (!r || k.total <= r.total)) {   // 同じ金額なら今のプランのまま（手続き不要）
        const callLabel = pr.call === "none" || !k.call ? "" : `＋通話オプション ${yen(k.call)}`;
        r = { carrier: c, plan: k.plan, cap: k.cap, capLabel: k.capLabel, tiersInfo: k.tiersInfo, base: k.base, lines: k.lines, call: k.call, callLabel, total: k.total, keep: true };
      }
    }
    if (!r) return null; // 容量が足りない
    rows.push(r);
  }
  return { rows, total: rows.reduce((s, r) => s + r.total, 0), fam: { au: famAu, uq: famUq }, oyako: rows.reduce((s, r) => s + (r.oyako || 0), 0) };
}

// 全員au / 全員UQ / 組み合わせ の中でいちばん安い形
function compare(persons, ctx) {
  const n = persons.length;
  const ok = a => persons.every((p, i) => !p.fix || p.fix === "auto" || p.fix === a[i]);
  const fixed = persons.some(p => p.fix && p.fix !== "auto");
  const allAu = ok(Array(n).fill("au")) ? calcAssign(Array(n).fill("au"), persons, ctx) : null;
  const allUq = ok(Array(n).fill("uq")) ? calcAssign(Array(n).fill("uq"), persons, ctx) : null;
  let mix = null;
  for (let m = 1; m < (1 << n) - 1; m++) {
    const a = persons.map((_, i) => (m >> i) & 1 ? "au" : "uq");
    if (!ok(a)) continue;
    const r = calcAssign(a, persons, ctx);
    if (r && (!mix || r.total < mix.total)) mix = r;
  }
  const opts = [];
  const all = n > 1 ? "全員 " : "";
  if (allUq) opts.push({ key: "uq", name: `${all}UQ mobile`, ...allUq });
  if (allAu) opts.push({ key: "au", name: `${all}au`, ...allAu });
  if (mix && (fixed || mix.total < Math.min(allAu ? allAu.total : Infinity, allUq ? allUq.total : Infinity)))
    opts.push({ key: "mix", name: fixed && persons.every(p => p.fix !== "auto") ? "指定どおり（au と UQ mobile）" : "au と UQ mobile を組み合わせ", ...mix });
  opts.sort((a, b) => a.total - b.total);
  return { opts, best: opts[0], allAu, allUq };
}

// 住まい × 速さ → auひかりプラスのタイプ
const plusType = () => $("#house").value + (val("speed") === "10" ? "10" : "");
// ───── auひかりプラス：月ごとの料金（開通後 m か月目）─────
function hikariMonth(type, withPhone, denki, m) {
  const H = DATA.hikariPlus, t = H[type];
  let v = t.net + t.router - (m <= 24 ? t.twoYear : 0);
  if (withPhone) {
    v += m <= H.phoneFreeMonths ? 0 : H.phone;
    if (denki && m > H.phoneFreeMonths) v -= m <= H.denkiSet.to ? H.denkiSet.amt : H.denkiSet.after;
  }
  return v;
}
const avg = (f, a, b) => { let s = 0; for (let m = a; m <= b; m++) s += f(m); return Math.round(s / (b - a + 1)); };

// ───── でんき（関西）：電気代 → 使用量 → 各社の料金 ─────
function elecBill(p, kwh) {
  const E = DATA.electricity;
  const [r1, r2, r3] = p.rates;
  let v = p.min;
  if (kwh > 15) v += (Math.min(kwh, 120) - 15) * r1;
  if (kwh > 120) v += (Math.min(kwh, 300) - 120) * r2;
  if (kwh > 300) v += (kwh - 300) * r3;
  return v + kwh * (E.renewable + E.fuel);
}
function kwhFromBill(bill) {
  let lo = 0, hi = 3000;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; elecBill(DATA.electricity.kepco, mid) < bill ? lo = mid : hi = mid; }
  return lo;
}
function auDenkiPoint(kwh) {
  const A = DATA.electricity.audenki;
  const [r1, r2, r3] = A.ratesEx;
  let ex = A.minEx;
  if (kwh > 15) ex += (Math.min(kwh, 120) - 15) * r1;
  if (kwh > 120) ex += (Math.min(kwh, 300) - 120) * r2;
  if (kwh > 300) ex += (kwh - 300) * r3;
  const rate = A.point.find(([cap]) => ex < cap)[1];
  return { pt: Math.ceil(Math.floor(ex) * rate), rate };
}

// 電気代 → 関西電力 / auでんき の料金とポイント
function elecInfo(bill) {
  if (!bill) return { kwh: 0, kepco: 0, au: 0, pt: 0, rate: 0 };
  const E = DATA.electricity, kwh = kwhFromBill(bill);
  const { pt, rate } = auDenkiPoint(kwh);
  return { kwh, kepco: Math.round(elecBill(E.kepco, kwh)), au: Math.round(elecBill(E.audenki, kwh)), pt, rate };
}

// ───── 変えた場合（診断結果の中で切り替えるボタン）─────
function scenCard(persons, ctx0, cur, sc, netNow, bill, el) {
  const base = compare(persons, ctx0).best.total;              // 何も変えないときのおすすめ
  const fx = (d, extra) => d > 0 ? `<span class="chg good">月 ${yen(d)} おトク${extra || ""}</span>` : d < 0 ? `<span class="chg bad">月 ${yen(-d)} 高い${extra || ""}</span>` : `<span class="chg same">変わらず</span>`;
  const btn = (k, v, label, on) => `<button type="button" data-sc="${k}=${v}" class="${on ? "on" : ""}">${label}</button>`;
  // カード
  const cardGain = base - compare(persons, { ...ctx0, card: true }).best.total;
  // ネット
  const type = plusType();
  const netAvg = withPhone => avg(m => hikariMonth(type, withPhone, ctx0.denki, m), 1, 24);
  const netFx = v => {
    const ph = base - compare(persons, { ...ctx0, net: v === "plusPhone" }).best.total;
    return netNow ? fx(ph + netNow - netAvg(v === "plusPhone"), "（スマホ＋ネット）") : `${fx(ph, "（スマホ）")}<span class="chg same">ネット 月${yen(netAvg(v === "plusPhone"))}</span>`;
  };
  // でんき
  const dPhone = base - compare(persons, { ...ctx0, denki: true }).best.total;
  const dTotal = dPhone + (bill ? el.kepco - el.au + el.pt : 0);
  return `<div class="card scen"><h2>変えた場合<span class="hint">　ボタンを押すと上の結果に反映されます</span></h2>
    <p class="ex" style="margin-top:-6px">緑の金額は、ほかを今のままにして1つだけ変えた場合の差額です。組み合わせた結果は上に出ます。</p>
    <div class="sc-row">
      <div class="sc-name">au PAYカード払い</div>
      ${cur.card ? `<div class="sc-now">今 au PAYカードで払っています（計算に反映済み）</div>` : `
      <div class="seg two">${btn("scCard", "no", "今のまま", !sc.card)}${btn("scCard", "yes", "au PAYカードにする", sc.card)}</div>
      <div class="sc-fx">${fx(cardGain, "（スマホ）")}</div>`}
    </div>
    <div class="sc-row">
      <div class="sc-name">自宅のネット<span class="hint">（今：${curNetCo().name}${netNow ? `・${yen(netNow)}` : ""}）</span></div>
      <div class="seg">${btn("netPlan", "keep", "今のまま", sc.net === "keep")}${btn("netPlan", "plusOnly", "auひかりプラス<br>ネットのみ", sc.net === "plusOnly")}${btn("netPlan", "plusPhone", "auひかりプラス<br>ネット＋電話", sc.net === "plusPhone")}</div>
      <div class="seg two">${btn("speed", "1", "1ギガ", val("speed") === "1")}${btn("speed", "10", "10ギガ", val("speed") === "10")}</div>
      <div class="sc-fx">ネットのみ：${netFx("plusOnly")}<br>ネット＋電話：${netFx("plusPhone")}</div>
      ${netNow ? "" : `<div class="ex">今のネット代を入れると、ネット代も含めた差額が出ます。</div>`}
    </div>
    <div class="sc-row">
      <div class="sc-name">でんき</div>
      ${cur.denki ? `<div class="sc-now">今 auでんきを使っています（計算に反映済み）</div>` : `
      <div class="seg two">${btn("scDenki", "no", "今のまま", !sc.denki)}${btn("scDenki", "yes", "auでんきにする", sc.denki)}</div>
      <div class="sc-fx">${fx(dTotal, bill ? "（スマホ割引＋ポイント）" : "（スマホ）")}</div>
      ${bill ? "" : `<div class="ex">電気代を入れると、ポイント還元も含めた差額が出ます。</div>`}`}
    </div>
  </div>`;
}

// ───── 家族割のまとめ ─────
function famSummary(o, ctx) {
  const parts = [];
  let sum = 0;
  for (const c of [AU, UQ]) {
    const rows = o.rows.filter(r => r.carrier === c);
    if (!rows.length) continue;
    const count = o.fam[c.id], ex = c.id === "au" ? ctx.exAu : ctx.exUq;
    const disc = rows.reduce((s, r) => s + r.lines.filter(([l]) => l.startsWith(c.famName)).reduce((a, [, v]) => a + v, 0), 0);
    sum += disc;
    const who = `診断${rows.length}人${ex ? `＋家族${ex}人` : ""}＝${count}回線`;
    let note;
    if (disc) note = `<b>−${yen(disc)}/月</b>`;
    else if (count < 2) note = `<b>なし</b>（2回線から）`;
    else if (rows.every(r => r.plan.fam2 === undefined)) note = `<b>なし</b>（コミコミプランバリューは対象外）`;
    else note = `<b>自宅セット割を優先</b>（併用不可）`;
    parts.push(`<div class="fam-row"><span>${c.name} ${c.famName}（${who}）</span><span class="fam-val">${note}</span></div>`);
  }
  return { sum, html: `<div class="fam ${sum ? "" : "none"}"><div class="fam-title">家族割 ${sum ? `合計 月${yen(sum)}引き` : "なし"}</div>${parts.join("")}</div>` };
}

function diagnose(e) {
  e && e.preventDefault();
  const persons = readPersons().map(p => ({ ...p, gb: Number(p.gb) }));
  const cur = { card: val("card") === "yes", denki: val("denki") === "yes" };             // 今の状態
  const sc = { card: val("scCard") === "yes", denki: val("scDenki") === "yes", net: val("netPlan") }; // 変えた場合
  const ctx = {
    net: sc.net === "plusPhone" ? true : sc.net === "plusOnly" ? false : curNetSet(),
    denki: cur.denki || sc.denki, card: cur.card || sc.card,
    exAu: +$("#exAu").value, exUq: +$("#exUq").value,
  };
  const ctx0 = { ...ctx, net: curNetSet(), denki: cur.denki, card: cur.card };            // 何も変えない場合
  const currentInput = Number($("#current").value) || 0;
  const ownCount = persons.filter(p => isOwn(p.from)).length;
  const own = ownCount > 0;
  const W = ownCount === persons.length ? "見直し" : ownCount ? "乗り換え・見直し" : "乗り換え";
  const nowEst = estimateNow(persons, ctx0);   // 今の月額は今の条件で計算
  const current = currentInput || (nowEst.complete ? nowEst.total : 0);
  const n = persons.length;
  const { opts, best, allUq } = compare(persons, ctx);
  if (!best) {
    $("#result").innerHTML = `<div class="card"><div class="notice">指定した乗り換え先では計算できません。UQ mobile は最大35GBなので、それより多く使う人は「au に固定」か「おまかせ」にしてください。</div></div>`;
    $("#result").style.display = "block";
    return;
  }

  // 家族全体：乗り換えない家族のスマホ代と、すでに au / UQ の家族の家族割の増え方
  const othersCost = Number($("#othersCost").value) || 0;
  const famAmt = { au: k => k >= 3 ? 1210 : k >= 2 ? 660 : 0, uq: k => k >= 2 ? 550 : 0 };
  let exGain = 0;
  if (ctx.exAu) exGain += ctx.exAu * (famAmt.au(best.fam.au) - famAmt.au(ctx.exAu));
  if (ctx.exUq && !ctx.net && !ctx.denki) exGain += ctx.exUq * (famAmt.uq(best.fam.uq) - famAmt.uq(ctx.exUq));
  const famBefore = current + othersCost, famAfter = best.total + othersCost - exGain;
  const famLine = (othersCost || exGain) ? `<div class="famtotal">家族全体のスマホ代${+$("#exOther").value + ctx.exAu + ctx.exUq ? `（乗り換えない${+$("#exOther").value + ctx.exAu + ctx.exUq}人を含む）` : ""}：${current ? `今 ${yen(famBefore)} → ` : ""}<b>${yen(famAfter)}</b>/月
      ${current ? `<b class="${famBefore - famAfter > 0 ? "plus" : "minus"}">（月${yen(Math.abs(famBefore - famAfter))}${famBefore - famAfter > 0 ? "安い" : "高い"}）</b>` : ""}
      ${exGain ? `<br><span class="ex">すでに au / UQ の家族も、回線が増えて家族割が月${yen(exGain)}増えます（目安）</span>` : ""}</div>` : "";

  // 変えた場合：家計（スマホ＋ネット＋でんき）
  const netPlan = sc.net;
  const netNow = Number($("#netCost").value) || 0;
  const house = plusType();
  const netNew = netPlan === "keep" ? netNow : avg(m => hikariMonth(house, netPlan === "plusPhone", ctx.denki, m), 1, 24);
  const sp = val("speed") === "10" ? "10ギガ" : "1ギガ";
  const NET_LABEL = { keep: "", plusOnly: `auひかりプラス（${sp}）ネットのみ`, plusPhone: `auひかりプラス（${sp}）ネット＋電話` };
  const bill = Number($("#elec").value) || 0;
  const el = elecInfo(bill);
  const elecNew = bill && sc.denki && !cur.denki ? el.au - el.pt : bill;
  const scOn = netPlan !== "keep" || (sc.card && !cur.card) || (sc.denki && !cur.denki);
  const hhRows = [["スマホ", current, best.total]];
  if (netNow || netPlan !== "keep") hhRows.push([netPlan === "keep" ? "ネット" : `ネット（${NET_LABEL[netPlan]}・2年平均）`, netNow, netNew]);
  if (bill) hhRows.push([sc.denki && !cur.denki ? "でんき（auでんき・ポイント込み）" : "でんき", bill, elecNew]);
  const hhNow = hhRows.reduce((a, r) => a + r[1], 0), hhNew = hhRows.reduce((a, r) => a + r[2], 0);
  const netLine = scOn && current > 0 && hhRows.length > 1 ? `<div class="netline"><b>家計（${hhRows.map(r => r[0].replace(/（.*/, "")).join("＋")}）</b>
      <table class="hh">${hhRows.map(r => `<tr><td>${r[0]}</td><td>${r[1] ? yen(r[1]) : "—"} → <b>${yen(r[2])}</b></td></tr>`).join("")}
      <tr><td><b>合計</b></td><td>${yen(hhNow)} → <b>${yen(hhNew)}</b> <b class="${hhNow - hhNew > 0 ? "plus" : "minus"}">（月${yen(Math.abs(hhNow - hhNew))}${hhNow - hhNew > 0 ? "安い" : "高い"}）</b></td></tr></table></div>` : "";

  // ヒント：まだ使っていない割引でさらに安くなるか
  const tips = [];
  const tryCtx = (patch, label) => {
    const c2 = { ...ctx, ...patch };
    const a = best.rows.map(r => r.carrier.id);
    const r = calcAssign(a, persons, c2);
    if (r && best.total - r.total > 0) tips.push(`${label}と、さらに<b>月 ${yen(best.total - r.total)}</b>安くなります。`);
  };
  if (val("netPlan") === "keep" && curNetCo().set === "phone" && val("netPhone") !== "yes") tryCtx({ net: true }, `今の${curNetCo().name}に固定電話も付ける（電話の料金は別にかかります）`);

  const out = $("#result");
  let html = "";
  const applied = [netPlan !== "keep" ? NET_LABEL[netPlan] : "", sc.card && !cur.card ? "au PAYカード払い" : "", sc.denki && !cur.denki ? "auでんき" : ""].filter(Boolean);
  const appliedTags = applied.map(t => `<span class="applied">${t}</span>`).join("");

  // 結論
  if (current > 0) {
    const hh = scOn && hhRows.length > 1;                    // 変えた場合は家計全体で比べる
    const save = hh ? hhNow - hhNew : current - best.total;
    if (save > 0) {
      html += `<div class="card hero">
        <div class="tagline">${persons.some(p => p.fix !== "auto") ? `指定した${W}先での結果` : `いちばんおトクな${W}`}</div>
        <div class="title">${best.name}</div>${applied.length ? `<div class="sub">変えた場合：${appliedTags}</div>` : ""}
        <div class="big">${hh ? "家計で" : ""}月 ${yen(save)} 節約</div>${hh ? `<div class="sub">うちスマホ代は月 ${yen(current - best.total)} 節約</div>` : ""}
        <div class="sub">1年で <b>${yen(save * 12)}</b>・2年で <b>${yen(save * 24 - (best.oyako || 0) * 12)}</b> おトク</div>
        ${best.oyako ? `<div class="sub">UQ親子応援割（月${yen(best.oyako)}引き）は1年間。2年目からは月${yen(best.oyako)}高くなります。</div>` : ""}
        <div class="sub">今 ${yen(current)}${!currentInput && nowEst.rows.some(r => !r.amount) ? "（今のプランから計算を含む）" : ""} → ${W}後 <b>${yen(best.total)}</b>/月</div>
      ${famSummary(best, ctx).html}${famLine}${netLine}</div>`;
    } else {
      html += `<div class="card hero bad">
        <div class="tagline">診断結果</div>
        <div class="title">今のままのほうが安いかもしれません</div>
        <div class="big">いちばん安くても月 ${yen(-save)} 高くなります</div>
        <div class="sub">${W}後のいちばん安い形：${best.name}（${yen(best.total)}/月）</div>
        <div class="sub">データ量を見直す・割引の条件をそろえると逆転することがあります。下のヒントも見てください。</div>
      ${famSummary(best, ctx).html}${famLine}${netLine}</div>`;
    }
  } else {
    html += `<div class="card hero">
      <div class="tagline">いちばん安い${W}</div>
      <div class="title">${best.name}</div>${applied.length ? `<div class="sub">変えた場合：${appliedTags}</div>` : ""}
      <div class="big">月 ${yen(best.total)}</div>
      <div class="sub">1人ずつ「今の月額」を入れる${own ? "（au・UQ mobile の人は今のプランを選ぶ）" : ""}と、節約額も計算します。</div>
    ${famSummary(best, ctx).html}${famLine}${netLine}</div>`;
  }

  // 比較
  html += scenCard(persons, ctx0, cur, sc, netNow, bill, el);
  html += personCard(persons, nowEst, best, currentInput);
  html += `<div class="card"><h2>${W}先の比較${appliedTags}</h2>`;
  if (netPlan === "plusOnly") html += `<p class="ex">auひかりプラスをネットのみで使うと、スマホのセット割は付きません。</p>`;
  opts.forEach((o, idx) => {
    const d = current > 0 ? current - o.total : null;
    html += `<div class="opt ${o.key} ${idx === 0 ? "best" : ""}">
      <div class="opt-head">
        <span class="opt-name">${o.name}${idx === 0 ? '<span class="badge">おすすめ</span>' : ""}</span>
        <span><span class="price">${yen(o.total)}</span><span class="ex">/月</span></span>
      </div>
      ${d !== null ? `<div class="diff ${d > 0 ? "plus" : "minus"}">${d > 0 ? `今より月 ${yen(d)} 安い（年 ${yen(d * 12)}）` : `今より月 ${yen(-d)} 高い`}</div>` : ""}
      <table><thead><tr><th>人・プラン</th><th>月額</th></tr></thead><tbody>
      ${o.rows.map((r, i) => `<tr><td>${n > 1 ? `${i + 1}人目 ` : ""}<span class="pill ${r.carrier.id}">${r.carrier.name}</span>${r.plan.name}（${r.capLabel}）${freshBadge(r.plan)}
        <span class="disc">基本 ${yen(r.base)}${r.lines.map(([l, a]) => `／${l} −${yen(a)}`).join("")}${r.callLabel ? `／${r.callLabel}` : ""}</span></td>
        <td><b>${yen(r.total)}</b></td></tr>`).join("")}
      </tbody></table>
      ${famSummary(o, ctx).html}
    </div>`;
  });
  if (best.key === "mix") {
    const lost = best.rows.some(r => r.carrier === AU) && best.fam.au < 2;
    if (lost) html += `<div class="tip">組み合わせだと au が1回線だけになり、au の家族割は付きません。それでも組み合わせのほうが安くなっています。</div>`;
  }
  if (!allUq) html += `<div class="notice">データを35GBより多く使う人がいるため、全員UQ mobileにはできません（UQ mobileは最大35GB）。</div>`;
  if (tips.length) html += tips.map(t => `<div class="tip">${t}</div>`).join("");
  html += `</div>`;

  html += netCard(persons, ctx, current, best);
  html += denkiCard(persons, ctx, best);

  html += flowCard(persons, best, nowEst);

  html += `<button type="button" class="clear-btn restart" data-clear style="width:100%">入力をクリアして最初から</button>`;
  html += `<p class="disclaimer">※ 料金データは${DATA.updated}更新（各プランの確認日が${(DATA.stale || {}).warn || 30}日を過ぎると黄色、${(DATA.stale || {}).alert || 60}日を過ぎると赤の印が付きます）。税込の目安です。キャンペーン・端末代・ユニバーサルサービス料などは含みません。最新の料金と条件は au・UQ mobile 公式サイトや店頭で確認してください。</p>`;

  out.innerHTML = html;
  out.style.display = "block";
  buildResultNav();
  const sv = current > 0 ? current - best.total : null;
  $("#barSum").innerHTML = `${best.name}　<b>${yen(best.total)}</b>/月`
    + (sv === null ? "" : `<br><span class="${sv > 0 ? "plus" : "minus"}">${sv > 0 ? `月 ${yen(sv)} 節約` : `月 ${yen(-sv)} 高い`}</span>`)
    + ` <button type="button" id="toResult">結果を見る</button>`;
  $("#form").querySelector("button[type=submit]").textContent = "もう一度診断";
  if (e) { if (isWide()) out.scrollTo({ top: 0, behavior: "smooth" }); else out.scrollIntoView({ behavior: "smooth" }); }
}
const isWide = () => window.matchMedia("(min-width: 1000px)").matches;
// 結果の上に目次を作る（iPad横向き）
function buildResultNav() {
  const out = $("#result");
  const cards = [...out.querySelectorAll(":scope > .card")];
  const short = t => t.replace(/\s.*$/, "").replace("auひかりプラス（関西）の詳細", "ネット").replace("auでんきの詳細", "でんき").replace(/先の比較$/, "先").replace("1人ずつの比較", "1人ずつ").replace("手続きの流れ", "手続き");
  cards.forEach((c, i) => c.id = "rc" + i);
  const nav = document.createElement("nav");
  nav.id = "resultNav";
  nav.innerHTML = cards.map((c, i) => {
    const h = c.querySelector("h2");
    const label = c.classList.contains("hero") ? "結果" : h ? short(h.childNodes[0].textContent.trim()) : "";
    return label ? `<button type="button" data-rjump="rc${i}">${label}</button>` : "";
  }).join("");
  out.prepend(nav);
  markNav(out, cards, "data-rjump");
}
document.addEventListener("click", e => {
  const j = e.target.closest("[data-jump]");
  if (j) { $("#" + j.dataset.jump).scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  const r = e.target.closest("[data-rjump]");
  if (r) $("#" + r.dataset.rjump).scrollIntoView({ behavior: "smooth", block: "start" });
});
// 目次：今見ている場所に色を付ける
function markNav(container, items, attr) {
  const top = container.getBoundingClientRect().top + 70;
  let cur = null;
  for (const el of items) if (el && el.getBoundingClientRect().top <= top) cur = el.id;
  if (!cur && items[0]) cur = items[0].id;
  document.querySelectorAll(`[${attr}]`).forEach(b => b.classList.toggle("on", b.getAttribute(attr) === cur));
}
$("#form").addEventListener("scroll", () => markNav($("#form"), ["f1", "f2", "f3", "f4"].map(id => document.getElementById(id)), "data-jump"), { passive: true });
$("#result").addEventListener("scroll", () => markNav($("#result"), [...$("#result").querySelectorAll(":scope > .card")], "data-rjump"), { passive: true });
markNav($("#form"), ["f1", "f2", "f3", "f4"].map(id => document.getElementById(id)), "data-jump");

// 結果が出ているときは、入力を変えるとすぐ計算し直す（左で入力→右ですぐ確認）
let liveTimer = null;
$("#form").addEventListener("input", e => {
  if (!$("#result").innerHTML || e.target.closest("#persons")) return;   // 人の欄は別で計算し直している
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => diagnose(), 300);
});
// ───── 確認日の印：checked_at から warn 日で黄、alert 日で赤。公式で確認できなかった値は「目安」 ─────
function freshBadge(o) {
  if (!o || !o.checked_at) return "";
  const days = Math.floor((Date.now() - new Date(o.checked_at + "T00:00:00+09:00").getTime()) / 86400000);
  const st = DATA.stale || { warn: 30, alert: 60 };
  let b = "";
  if (days > st.alert) b += `<span class="fresh alert" title="料金の確認日 ${o.checked_at}">要再確認（確認から${days}日）</span>`;
  else if (days > st.warn) b += `<span class="fresh warn" title="料金の確認日 ${o.checked_at}">確認から${days}日</span>`;
  if (o.confidence === "estimate") b += `<span class="fresh guess" title="公式で確認できていない値を含みます">目安</span>`;
  return b;
}

// ───── 1人ずつの比較（今 → おすすめ）─────
const pillOf = id => `<span class="pill ${isOwn(id) ? id : "other"}">${carrierName(id)}</span>`;
const gbText = cap => cap === Infinity ? "無制限" : `${cap}GBまで`;
const useText = gb => gb === Infinity ? "たくさん（無制限が必要）" : `〜${gb}GB`;
function gbChange(nowCap, newCap) {
  if (nowCap === undefined) return "";
  if (nowCap === newCap) return `<span class="chg same">ギガは同じ</span>`;
  if (newCap === Infinity) return `<span class="chg up">ギガ 無制限に</span>`;
  if (nowCap === Infinity) return `<span class="chg down">ギガ 無制限 → ${newCap}GB</span>`;
  const d = newCap - nowCap;
  return d > 0 ? `<span class="chg up">ギガ ${d}GB 増える</span>` : `<span class="chg down">ギガ ${-d}GB 減る</span>`;
}
// 1年・2年でいくら得か
// tmp：1年間だけの割引（UQ親子応援割）。2年目はその分を引かずに計算
const yearBox = (d, tmp = 0) => {
  if (d === null || d === 0) return "";
  const y1 = d * 12, y2 = d * 24 - tmp * 12;
  const v = x => `${x > 0 ? "" : "＋"}${yen(Math.abs(x))}`;
  return `<div class="yr ${d > 0 ? "good" : "bad"}">
  <div><span>1か月${tmp ? "（1年目）" : ""}</span><b>${v(d)}</b></div>
  <div><span>1年間</span><b>${v(y1)}</b></div>
  <div><span>2年間</span><b>${v(y2)}</b></div>
  <div class="yr-label">${y2 > 0 ? "おトク" : "高くなる"}</div>
  ${tmp ? `<div class="yr-note">2年目は親子応援割（月${yen(tmp)}）が終わるので、月${v(d - tmp)}で計算</div>` : ""}</div>`;
};
// 使う量で変わる料金（UQ トクトクプラン2 など）
const tierLine = (t, gbUse) => {
  if (!t) return "";
  const mark = lowSide => (gbUse <= t.cap) === lowSide ? " now" : "";
  if (t.afterHigh) return `<div class="pc-tier">1年目は使う量に関係なく <b>${yen(t.high)}</b>
    <span>13か月目から：〜${t.cap}GB <b>${yen(t.afterLow)}</b>／${t.cap}GB超 <b>${yen(t.afterHigh)}</b></span></div>`;
  return `<div class="pc-tier"><span class="t${mark(true)}">〜${t.cap}GBの月 <b>${yen(t.low)}</b></span><span class="t${mark(false)}">${t.cap}GB超の月 <b>${yen(t.high)}</b></span></div>`;
};
const breakdown = (base, lines, callLabel) => `基本 ${yen(base)}${lines.map(([l, a]) => `<br>${l} −${yen(a)}`).join("")}${callLabel ? `<br>${callLabel}` : ""}`;
function personCard(persons, est, best, currentInput) {
  const items = persons.map((p, i) => {
    const e = est.rows[i], r = best.rows[i];
    const nowCap = e.est ? e.est.cap : undefined;
    const d = e.known ? e.total - r.total : null;
    const priceChg = d === null ? "" : d > 0 ? `<span class="chg good">月 ${yen(d)} 安い</span>` : d < 0 ? `<span class="chg bad">月 ${yen(-d)} 高い</span>` : `<span class="chg same">料金は同じ</span>`;
    const notes = [
      e.est && e.est.over ? `<span class="minus">今のプランの容量（${e.est.capLabel}）より多く使っています</span>` : "",
      e.est && e.est.plan.ended && !r.keep ? `今のプランは${e.est.plan.ended}に新規受付終了（変更すると戻せません）` : "",
      e.amount && e.est && Math.abs(e.amount - e.est.total) >= 300 ? `入力した月額と計算の目安（${yen(e.est.total)}）に差があります（オプション・ほかの割引などの分かも）` : "",
    ].filter(Boolean);
    return `<div class="pc">
      <div class="pc-head"><span class="pno">${i + 1}</span><b>${i + 1}人目</b><span class="ex">使う量 ${useText(p.gb)}${p.call !== "none" ? `・${p.call === "short" ? "短い通話が多い" : "長電話する"}` : ""}</span></div>
      <div class="pc-body">
        <div class="pc-side now">
          <div class="pc-tag">今</div>
          <div class="pc-plan">${pillOf(p.from)}${e.est ? e.est.plan.name + freshBadge(e.est.plan) : ""}</div>
          <div class="pc-gb">${e.est ? gbText(e.est.cap) : `<span class="ex">ギガ：不明</span>`}</div>
          <div class="pc-price">${e.known ? yen(e.total) : "—"}<small>${e.known ? (e.amount ? "/月（入力）" : "/月（計算）") : "今の月額 未入力"}</small></div>
          ${e.est && !e.amount ? tierLine(e.est.tiersInfo, p.gb) : ""}
        </div>
        <div class="pc-arrow">→</div>
        <div class="pc-side new ${r.carrier.id}">
          <div class="pc-tag">${r.keep ? "そのまま" : "おすすめ"}</div>
          <div class="pc-plan">${pillOf(r.carrier.id)}${r.plan.name}${freshBadge(r.plan)}</div>
          <div class="pc-gb">${gbText(r.cap)}</div>
          <div class="pc-price">${yen(r.total)}<small>/月</small></div>
          ${tierLine(r.tiersInfo, p.gb)}
        </div>
      </div>
      <div class="pc-chg">${r.keep ? `<span class="chg same">今のプランのままがいちばん安い（プラン変更の手続き不要）</span>${d > 0 ? `<span class="chg good">家族の割引が増えて安くなります</span>` : ""}` : (d ? "" : priceChg) + gbChange(nowCap, r.cap)}</div>
      ${yearBox(d, r.oyako || 0)}
      ${notes.map(t => `<div class="disc">${t}</div>`).join("")}
      <details class="pc-detail"><summary>料金の内訳</summary>
        <div class="pc-bd">
          <div><b>今</b><br>${e.est ? breakdown(e.est.base, e.est.lines, e.est.call ? `通話オプション ＋${yen(e.est.call)}` : "") : e.amount ? "入力した金額" : "—"}</div>
          <div><b>${r.keep ? "そのまま" : "おすすめ"}</b><br>${breakdown(r.base, r.lines, r.callLabel)}</div>
        </div>
      </details>
    </div>`;
  }).join("");
  const unknown = est.rows.filter(r => !r.known).length;
  const tot = est.complete ? est.total - best.total : null;
  return `<div class="card"><h2>1人ずつの比較</h2>
    ${items}
    ${est.complete ? `<div class="pc-total"><span>合計</span><span>${yen(est.total)} → <b>${yen(best.total)}</b></span>
      <b class="${tot > 0 ? "plus" : tot < 0 ? "minus" : ""}">${tot > 0 ? `月 ${yen(tot)} 安い` : tot < 0 ? `月 ${yen(-tot)} 高い` : "同じ"}</b></div>
      ${yearBox(tot, best.oyako || 0).replace('class="yr', 'class="yr total')}` : ""}
    ${currentInput ? `<p class="ex">いちばん上の節約額は、入力した家族の合計 ${yen(currentInput)} と比べています。</p>` : ""}
    ${unknown && !currentInput ? `<div class="notice">今の月額がわからない人が${unknown}人います。「今の月額」を入れる${persons.some(p => isOwn(p.from)) ? "か、au・UQ mobile の人は今のプランを選ぶ" : ""}と、家族全体の節約額が出ます。</div>` : ""}
    <p class="ex">他社の人は今のプランのギガがわからないため、「使う量」を目安に表示しています。</p>
  </div>`;
}
function flowCard(persons, best, est) {
  const fromNotes = {
    docomo: "ドコモの解約金は今のプランならほぼかかりません。dポイントは解約前に使い切りましょう。",
    softbank: "ソフトバンクの解約金は今のプランならほぼかかりません。「新トクするサポート」で機種を買った人は端末の返却時期を確認しましょう。",
    ymobile: "ワイモバイルは解約金なし。PayPayカード割・おうち割がなくなる分も含めて比較しています。",
    rakuten: "楽天モバイルはもともと安いので、通話やエリアの安定を重視する場合に検討しましょう。",
    online: "ahamo・LINEMOはもともと安いので、店舗サポートや家族割・セット割を使えるかがポイントです。",
    mvno: "格安SIMはもともと安いので、通信速度や店舗サポートを重視する場合に検討しましょう。",
  };
  const others = [...new Set(persons.filter(p => !isOwn(p.from)).map(p => p.from))];
  const moves = persons.map((p, i) => [p.from, best.rows[i].carrier.id, !!best.rows[i].keep]);
  const change = moves.filter(([f, t, keep]) => isOwn(f) && f === t && !keep);
  const migrate = [...new Set(moves.filter(([f, t]) => isOwn(f) && f !== t).map(([f, t]) => `${carrierName(f)} → ${carrierName(t)}`))];
  const ended = est.rows.some((r, i) => r.est && r.est.plan.ended && !best.rows[i].keep);
  const keeps = moves.filter(m => m[2]).length;
  let html = `<div class="card"><h2>手続きの流れ</h2>`;
  if (others.length) html += `<h3 class="h3">他社からの乗り換え（${others.map(carrierName).join("・")}）</h3>
    <ul class="check">
      <li><b>MNPワンストップ</b>に対応しているので、多くの場合は予約番号なしでそのまま申し込めます。</li>
      <li>今のスマホをそのまま使うなら、<b>SIMロック解除</b>と対応機種かどうかを確認しましょう（2021年10月以降に買った機種は原則ロックなし）。</li>
      <li>キャリアメール（@docomo.ne.jp など）は使えなくなります。必要なら「メールアドレス持ち運び」を利用しましょう。</li>
      ${others.map(c => `<li>${fromNotes[c]}</li>`).join("")}
    </ul>`;
  if (change.length || migrate.length || keeps) html += `<h3 class="h3">au・UQ mobile の見直し</h3>
    <ul class="check">
      ${change.length ? `<li><b>同じ会社でプラン変更</b>：My au・My UQ mobile や店頭で手続きできます。新しいプランは基本的に翌月から適用です。</li>` : ""}
      ${migrate.map(m => `<li><b>${m}</b>：同じKDDIグループ内の「番号移行」で、電話番号はそのまま使えます。SIMの差し替え（eSIMは再発行）が必要です。</li>`).join("")}
      ${ended ? `<li><b>新規受付終了のプランから変更すると、元のプランには戻せません。</b>今のプランの特典がなくなってもよいか確認しましょう。</li>` : ""}
    </ul>`;
  if (keeps) html += `<p class="ex">今のプランのままがいちばん安い人（${keeps}人）は、手続きはいりません。</p>`;
  html += `<ul class="check">
      <li>端末代の分割が残っている場合、手続き後も支払いは続きます（この診断の金額には入っていません）。</li>
    </ul>
    <details><summary>持っていくもの</summary>
      <ul class="check"><li>本人確認書類（マイナンバーカード・運転免許証など）</li><li>支払い用のクレジットカードまたはキャッシュカード</li><li>今使っているスマホ</li></ul>
    </details>
  </div>`;
  return html;
}

// ───── ネットを auひかりプラス にした場合 ─────
function netCard(persons, ctx, current, best) {
  const H = DATA.hikariPlus, type = plusType(), t = H[type];
  const netNow = Number($("#netCost").value) || 0;
  const onlyNet = m => hikariMonth(type, false, ctx.denki, m);
  const withPh = m => hikariMonth(type, true, ctx.denki, m);
  const pA = compare(persons, { ...ctx, net: false }).best;  // ネットのみ → セット割なし
  const pB = compare(persons, { ...ctx, net: true }).best;   // ネット＋電話 → セット割あり
  const a2 = avg(onlyNet, 1, 24), b2 = avg(withPh, 1, 24);
  const rows = [];
  if (current > 0) rows.push(["今のまま", current, netNow, current + netNow, ""]);
  const keep = compare(persons, { ...ctx, net: curNetSet() }).best;  // ネットは今のまま
  rows.push([`乗り換え・ネットは今のまま（${curNetCo().name}）`, keep.total, netNow, keep.total + netNow, ""]);
  rows.push([`auひかりプラス <b>ネットのみ</b>`, pA.total, a2, pA.total + a2, "a"]);
  rows.push([`auひかりプラス <b>ネット＋電話</b>`, pB.total, b2, pB.total + b2, "b"]);
  const base = rows[0][3];
  const minTotal = Math.min(...rows.map(r => r[3]));
  const setGain = pA.total - pB.total;
  const yr = f => [avg(f, 1, 12), avg(f, 13, 24), avg(f, 25, 36)];
  const [a1, a2y, a3] = yr(onlyNet), [b1, b2y, b3] = yr(withPh);

  return `<div class="card"><h2>auひかりプラス（関西）の詳細</h2>
    <p class="ex">${t.name}・2年契約（BIGLOBE）・ルーター代込み。ネット代は2年間の平均です。${netNow ? "" : "今のネット代を入れると、家計全体の差額も出ます。"}</p>
    <table><thead><tr><th>パターン</th><th>スマホ</th><th>ネット</th><th>合計/月</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${r[0]}${r[3] === minTotal ? '<span class="badge">最安</span>' : ""}</td><td>${yen(r[1])}</td><td>${r[2] ? yen(r[2]) : "—"}</td><td><b>${yen(r[3])}</b>${r !== rows[0] && current > 0 ? `<span class="disc ${base - r[3] > 0 ? "plus" : "minus"}">${base - r[3] > 0 ? `月${yen(base - r[3])}安い` : `月${yen(r[3] - base)}高い`}</span>` : ""}</td></tr>`).join("")}
    </tbody></table>
    <table><thead><tr><th>auひかりプラスの月額</th><th>1年目</th><th>2年目</th><th>3年目</th></tr></thead><tbody>
      <tr><td>ネットのみ</td><td>${yen(a1)}</td><td>${yen(a2y)}</td><td>${yen(a3)}</td></tr>
      <tr><td>ネット＋電話（Wi-Fiパック）${ctx.denki ? "<span class=\"disc\">auでんきセット割込み</span>" : ""}</td><td>${yen(b1)}</td><td>${yen(b2y)}</td><td>${yen(b3)}</td></tr>
    </tbody></table>
    ${setGain > 0 ? `<div class="tip"><b>ネットのみだとスマホのセット割が受けられません。</b>電話（Wi-Fiパック 月770円・最初の12か月は0円）を付けると、スマホが<b>月${yen(setGain)}</b>安くなります。</div>` : ""}
    <ul class="check" style="margin-top:12px">
      <li>auスマートバリュー・UQの自宅セット割は「ネット＋電話」のセットが条件です。</li>
      <li>初期費用：登録料 ${yen(H.signup)}。工事費 39,600円は24か月の割引で実質0円（途中で解約すると残りを請求）。</li>
      <li>2年契約の途中解約は ${yen(H.cancel)}。2年毎月割はBIGLOBE・対象窓口での申し込みが条件です。</li>
      <li>光回線の工事までは届いたルーターの5G通信で使えます。提供エリアは住所で確認してください。</li>
      <li>他社からの乗り換えは、解約違約金相当額の還元（最大30,000円分）などの特典があります。</li>
    </ul>
  </div>`;
}

// ───── auでんきに変えた場合 ─────
function denkiCard(persons, ctx, best) {
  const bill = Number($("#elec").value) || 0;
  const E = DATA.electricity;
  if (!bill) return "";
  const kwh = kwhFromBill(bill);
  const kepco = Math.round(elecBill(E.kepco, kwh)), au = Math.round(elecBill(E.audenki, kwh));
  const { pt, rate } = auDenkiPoint(kwh);
  if (val("denki") === "yes") {
    return `<div class="card"><h2>auでんき</h2><p>すでにauでんきなので、スマホの計算にもでんきのセット割を入れています。Pontaポイントは毎月 約<b>${pt}ポイント</b>（${rate * 100}%）です。</p></div>`;
  }
  const withD = compare(persons, { ...ctx, denki: true }).best;
  const phoneGain = compare(persons, { ...ctx, denki: false }).best.total - withD.total;
  const billDiff = kepco - au;
  const total = phoneGain + pt + billDiff;
  const H = DATA.hikariPlus;
  return `<div class="card"><h2>auでんきの詳細</h2>
    <p class="ex">電気代 ${yen(bill)}/月 → 使用量 約${Math.round(kwh)}kWh として計算（燃料費調整額は両社同じ扱い）</p>
    <table><thead><tr><th>項目</th><th>差額/月</th></tr></thead><tbody>
      <tr><td>電気代（${E.kepco.name} → ${E.audenki.name}）<span class="disc">${yen(kepco)} → ${yen(au)}</span></td><td>${billDiff >= 0 ? "−" : "＋"}${yen(Math.abs(billDiff))}</td></tr>
      <tr><td>Pontaポイント還元（${rate * 100}%）</td><td>−${pt}円相当</td></tr>
      <tr><td>スマホのセット割<span class="disc">${phoneGain > 0 ? withD.name + "で UQの自宅セット割（でんきコース）" : ctx.net ? "ネットのセット割と併用できないため増えません" : "auのスマホはでんきだけではセット割の対象外"}</span></td><td>−${yen(phoneGain)}</td></tr>
    </tbody><tfoot><tr><td><b>合計</b></td><td><b class="${total > 0 ? "plus" : ""}">月${yen(total)}おトク</b></td></tr></tfoot></table>
    <div class="sub" style="margin-top:8px">1年で約 <b>${yen(total * 12)}</b> おトク</div>
    <div class="tip">auひかりプラスを「ネット＋電話」で使う場合は、さらに auひかりプラス でんきセット割（13〜36か月目 月${yen(H.denkiSet.amt)}、以降 月${yen(H.denkiSet.after)}）も付きます（上のネットの表には入っていません）。</div>
    <ul class="check" style="margin-top:12px">
      <li>auでんき（関西）の単価は関西電力の従量電灯Aとほぼ同じです。おトク分は主にポイントとセット割です。</li>
      <li>UQ mobile の自宅セット割は「インターネットコース」か「でんきコース」のどちらか1つです。</li>
      <li>切り替えは工事不要。今の電力会社の解約手続きもいりません。</li>
    </ul>
  </div>`;
}

$("#form").addEventListener("submit", diagnose);
document.addEventListener("click", e => { if (e.target.id === "toResult") { if (isWide()) $("#result").scrollTo({ top: 0, behavior: "smooth" }); else $("#result").scrollIntoView({ behavior: "smooth" }); } });

// ───── クリア：入力をすべて最初の状態に戻す ─────
function clearAll() {
  if (!confirm("入力した内容をすべて消して、最初の状態に戻しますか？")) return;
  $("#result").innerHTML = "";
  $("#result").style.display = "";
  $("#form").reset();
  netCoSel.value = "other";
  netCostTouched = false;
  renderPersons([defaultPerson()]);
  $("#totalBox").open = false;
  $("#barSum").innerHTML = "";
  $("#form").querySelector("button[type=submit]").textContent = "診断する";
  onNetChange();
  $("#estBox").open = false;
  updateEstimate();
  try { sessionStorage.removeItem(FORM_KEY); } catch (e) {}
  window.scrollTo({ top: 0, behavior: "smooth" });
  $("#form").scrollTo({ top: 0, behavior: "smooth" });
}
document.addEventListener("click", e => { if (e.target.closest("[data-clear]")) clearAll(); });
$("#result").addEventListener("click", e => {
  const b = e.target.closest("[data-sc]");
  if (!b) return;
  const [k, v] = b.dataset.sc.split("=");
  document.querySelector(`#scen input[name=${k}][value="${v}"]`).checked = true;
  diagnose();
});
document.querySelectorAll("input[name=netPhone]").forEach(r => r.addEventListener("change", onNetChange));
document.querySelectorAll("input[name=speed]").forEach(r => r.addEventListener("change", () => { if ($("#result").innerHTML) diagnose(); }));

// ───── 電気代の目安 ─────
const EST = DATA.electricity.estimate;
$("#estPeople").innerHTML = Object.keys(EST.people).map(k => `<option value="${k}" ${k === "3" ? "selected" : ""}>${k === "6" ? "6人以上" : k + "人"}</option>`).join("");
$("#estSeason").innerHTML = Object.entries(EST.season).map(([k, [, t]]) => `<option value="${k}">${t}</option>`).join("");
$("#estStay").innerHTML = Object.entries(EST.stay).map(([k, [, t]]) => `<option value="${k}" ${k === "normal" ? "selected" : ""}>${t}</option>`).join("");
let estBill = 0;
function updateEstimate() {
  const kwh = EST.people[$("#estPeople").value] * EST.house[$("#estHouse").value] * EST.season[$("#estSeason").value][0] * EST.stay[$("#estStay").value][0];
  estBill = Math.round(elecBill(DATA.electricity.kepco, kwh) / 10) * 10;
  $("#estOut").innerHTML = `使用量 約${Math.round(kwh)}kWh → 電気代 <span class="v">約${yen(estBill)}</span>/月`;
}
["#estPeople", "#estHouse", "#estSeason", "#estStay"].forEach(id => $(id).addEventListener("change", updateEstimate));
$("#estBox").addEventListener("toggle", () => { if ($("#estBox").open) { $("#estHouse").value = $("#house").value.replace("10", ""); updateEstimate(); } });
$("#estUse").addEventListener("click", () => {
  $("#elec").value = estBill;
  $("#estBox").open = false;
  if ($("#result").innerHTML) diagnose();
});
updateEstimate();
onNetChange();
restoreForm();
document.querySelectorAll("input[name=netPlan]").forEach(r => r.addEventListener("change", () => {
  if ($("#result").innerHTML) diagnose();
}));
