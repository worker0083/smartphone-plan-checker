// 料金診断の「スマホ以外」のデータ（すべて税込・円/月）
// スマホの料金（au・UQ のプラン・割引・通話オプション）は ../data/carriers.json にあります。
//   → クロ（調査チーム）が更新。画面は data-adapter.js で読み込みます。ここには書かないでください。
// ✅ = 2026年11月に公式サイトで確認した値 / ⚠ = 目安
window.DATA = {
  // ───────── 今のネット（関西）─────────
  // set : "phone" = ネット＋電話で au/UQ のセット割の対象 / "any" = 対象プランならそのまま対象 / false = 対象外
  //       ✅ 2026年11月 auスマートバリュー公式ページの対象一覧で確認
  // home / mansion : 月額の目安（入力欄に自動で入る値。空欄 = 目安なし）
  netCompanies: [
    { id: "eo",       name: "eo光",                     set: "phone", home: 5814, mansion: 4400 },  // ✅戸建て / マンション⚠
    { id: "auhikari", name: "auひかり",                 set: "phone", home: 6380, mansion: 5000 },  // ✅戸建て / マンション⚠
    { id: "plus",     name: "auひかりプラス",           set: "phone", home: 6578, mansion: 5500 },  // ✅ ルーター込み・2年毎月割なし
    { id: "biglobe",  name: "ビッグローブ光",           set: "phone" },
    { id: "sonet",    name: "So-net光",                 set: "phone" },
    { id: "nifty",    name: "@nifty光",                 set: "phone" },
    { id: "jcom",     name: "J:COM",                    set: "phone" },
    { id: "auhome",   name: "au ホームルーター 5G・WiMAX", set: "any" },
    { id: "docomo",   name: "ドコモ光",                 set: false, home: 5720, mansion: 4400 },    // ✅
    { id: "softbank", name: "ソフトバンク光",           set: false, home: 6050, mansion: 4510 },    // ✅
    { id: "nuro",     name: "NURO光",                   set: false, home: 3980, mansion: 2980 },    // ✅ 2年割
    { id: "rakuten",  name: "楽天ひかり",               set: false, home: 5280, mansion: 4180 },    // ✅
    { id: "flets",    name: "フレッツ光（NTT西日本）",  set: false },
    { id: "ahamo",    name: "ahamo光",                  set: false },
    { id: "home5g",   name: "ドコモ home 5G",           set: false },
    { id: "sbair",    name: "ソフトバンク エアー",      set: false },
    { id: "other",    name: "そのほかの回線",           set: false },
    { id: "none",     name: "ネットなし",               set: false, home: 0, mansion: 0 },
  ],

  // ───────── auひかりプラス（1ギガ・2年契約・プロバイダBIGLOBE）✅ 2026年11月 au公式 ─────────
  // ネット料金にハイブリッドホームルーターのレンタル料（858円・必須）を足した額
  // 2年毎月割：光回線開通後24か月の割引（対象窓口・BIGLOBEの場合）
  // phone：Wi-Fiパック（電話含む）770円。開通後12か月はデビュー割で実質0円
  // denkiSet：auひかりプラス でんきセット割（Wi-Fiパックの料金から割引。13〜36か月目 330円、37か月目〜 110円）
  // auスマートバリュー・自宅セット割は「ネット＋電話」のときだけ対象（ネットのみは対象外）✅
  hikariPlus: {
    home:    { name: "auひかりプラス ホーム（1ギガ）",    net: 5720, router: 858, twoYear: 1188 },
    mansion: { name: "auひかりプラス マンション（1ギガ）", net: 4642, router: 858, twoYear: 627 },
    home10:    { name: "auひかりプラス ホーム（10ギガ）",    net: 6380, router: 858, twoYear: 1848 },  // ✅ 10ギガは一部エリア
    mansion10: { name: "auひかりプラス マンション（10ギガ）", net: 6380, router: 858, twoYear: 1848 }, // ✅ 対応設備のある建物のみ
    phone: 770, phoneFreeMonths: 12,
    denkiSet: { amt: 330, from: 13, to: 36, after: 110 },
    signup: 4950,             // サービス登録料（初回のみ）
    cancel: 3102,             // 契約解除料
  },

  // ───────── でんき（関西）─────────
  // 最低料金（〜15kWh）＋ 15〜120 / 120〜300 / 300kWh超 の1kWh単価（税込 / 税抜）
  electricity: {
    renewable: 4.18, // 再エネ賦課金 2026年度 ✅
    fuel: 4.36,      // 燃料費調整額（税込・1kWhあたり）⚠ 毎月変わります。auでんき料金表の計算例（税抜3.96円）を仮置き
    kepco:   { name: "関西電力 従量電灯A",       min: 763.81, rates: [20.89, 26.29, 29.27] },                 // ✅
    audenki: { name: "auでんき でんきMプラン（関西）", min: 763.80, rates: [20.88, 26.29, 29.26],              // ✅ 2026年11月改定後
               minEx: 694.37, ratesEx: [18.99, 23.90, 26.60],                                                // ✅ 税抜（ポイント計算用）
               // Pontaポイント還元（基本料金・電力量料金の税抜合計に対して）
               // 8,000円以上 1% ✅（公式の計算例）/ 8,000円未満 0.5% ⚠
               point: [[8000, 0.005], [Infinity, 0.01]] },

    // 電気代の目安（使用量 kWh/月）⚠ 一般的な家庭の平均をもとにした目安
    estimate: {
      people: { 1: 180, 2: 290, 3: 340, 4: 380, 5: 430, 6: 480 },
      house: { home: 1.1, mansion: 0.9 },
      season: { year: [1, "1年の平均"], summer: [1.15, "夏（7〜9月）"], winter: [1.35, "冬（12〜3月）"], mild: [0.8, "春・秋"] },
      stay: { out: [0.9, "日中はほぼ留守"], normal: [1, "ふつう"], home: [1.15, "日中も家にいることが多い"] },
    },
  },
};
