// au / UQ mobile の料金データ（すべて税込・円/月）
// ✅ = 2026年11月に公式サイトで確認した値 / ⚠ = 目安（公式サイトで確認して更新してください）
//
//   tiers      : [データ容量GB, 割引前の月額]（Infinity = 無制限）
//   fam2/fam3  : 家族割（その会社の回線が家族で2回線 / 3回線以上のときの1回線あたり割引）
//   card       : false ならカード払い割引の対象外
//   set        : false なら自宅セット割（ネット・でんき）の対象外
//   callShort  : 短時間かけ放題の追加料金 / callLong : 完全かけ放題の追加料金（0 = プランに込み）
//   net        : 自宅セット割の1回線あたりの割引額（対象ネットは「ネット＋電話」での契約が必要 ✅）
//   denki      : 自宅セット割（でんき）の1回線あたりの割引額
//   stack      : ネットとでんきのセット割を両方受けられるか
//   famWithSet : 家族割とセット割を両方受けられるか（false なら大きい方だけ）
window.DATA = {
  updated: "2026年11月",
  carriers: [
    {
      id: "au", name: "au", card: 220, cardName: "au PAYカード払い",
      net: { amt: 1100, label: "auスマートバリュー" },   // ✅
      denki: null,                                       // auでんき単体はスマートバリュー対象外 ✅
      stack: true, famWithSet: true, famName: "家族割プラス",
      plans: [
        { name: "使い放題MAX＋ 5G/4G", tiers: [[Infinity, 7788]], fam2: 660, fam3: 1210, callShort: 880, callLong: 1980 },                // ✅
        { name: "スマホミニプラン＋ 5G/4G", tiers: [[1, 4928], [3, 6578], [5, 8228]], fam2: 660, fam3: 1210, callShort: 880, callLong: 1980 }, // ✅（家族割2回線は⚠）
      ],
    },
    {
      id: "uq", name: "UQ mobile", card: 220, cardName: "au PAYカード払い",
      net: { amt: 1100, label: "自宅セット割（インターネットコース）" }, // ✅
      denki: { amt: 1100, label: "自宅セット割（でんきコース）" },        // ✅
      stack: false, famWithSet: false, famName: "家族セット割",           // ✅ 家族セット割(550)とは併用不可
      plans: [
        { name: "トクトクプラン2", tiers: [[5, 2948], [30, 4048]], fam2: 550, fam3: 550, callShort: 880, callLong: 1980 }, // ✅ 5GB以下は-1,100込み / 通話⚠
        { name: "コミコミプランバリュー", tiers: [[35, 3828]], card: false, set: false, callShort: 0, callLong: 1100 },   // ✅ 10分かけ放題込み
      ],
    },
  ],

  // ───────── UQ親子応援割 ✅ 2026年11月 UQ mobile公式 ─────────
  // 受付：2026年11月19日〜（終了時期は未定）。5〜18歳の人が対象プランに新たに加入すると、
  // 同じ家族セット割グループの家族も含めて、翌月から1年間 1,100円/月 割引（家族セット割・自宅セット割と併用可）
  // 「新たに加入」が条件なので、すでにそのプランの人は対象外。他プランからの変更で対象になるかは店頭で確認 ⚠
  uqOyako: { amt: 1100, months: 12, plans: ["トクトクプラン2", "コミコミプランバリュー"], label: "UQ親子応援割（1年間）" },

  // ───────── 今 au / UQ mobile を使っている人の「今のプラン」（過去プランを含む）─────────
  // 書き方は carriers[].plans と同じ。追加の項目：
  //   set   : 自宅セット割の1回線あたりの割引額（false = 対象外）
  //   card  : au PAYカード払い割（または2年契約N）の割引額（false = 対象外）
  //   fam4  : 4回線以上のときの家族割
  //   low   : [GB, 割引額] … その容量以下の月は自動で割引
  //   ended : 新規受付終了の年月
  // ✅ = 2026年11月に au / UQ mobile 公式サイトで確認 / ⚠ = 目安
  currentPlans: {
    au: [
      { id: "max-plus",  name: "使い放題MAX＋ 5G/4G", tiers: [[Infinity, 7788]], fam2: 660, fam3: 1210, set: 1100, card: 220, callShort: 880, callLong: 1980 },                 // ✅
      { id: "mini-plus", name: "スマホミニプラン＋ 5G/4G", tiers: [[1, 4928], [3, 6578], [5, 8228]], fam2: 660, fam3: 1210, set: 1100, card: 220, callShort: 880, callLong: 1980 }, // ✅
      { id: "valuelink", name: "auバリューリンクプラン", tiers: [[Infinity, 8008]], fam2: 660, fam3: 1210, set: 1100, card: 220, callShort: 880, callLong: 1980 },              // ✅
      { id: "max",       name: "使い放題MAX 5G/4G", ended: "2024年12月", tiers: [[Infinity, 7568]], low: [3, 1650], fam2: 550, fam3: 1100, set: 1100, card: 110, callShort: 880, callLong: 1980 }, // ✅
      { id: "manekatsu", name: "auマネ活プラン 5G/4G", ended: "2024年12月", tiers: [[Infinity, 7568]], fam2: 550, fam3: 1100, set: 1100, card: false, callShort: 880, callLong: 1980 }, // 料金✅ / 家族割⚠
      { id: "datamax5g", name: "データMAX 5G/4G LTE", ended: "2021年2月", tiers: [[Infinity, 8745]], low: [2, 1628], fam2: 550, fam3: 1100, fam4: 2222, set: 1100, card: 187, callShort: 880, callLong: 1980 }, // ✅（cardは2年契約N）
      { id: "datamaxpro", name: "auデータMAXプランPro", ended: "2020年6月", tiers: [[Infinity, 8745]], fam2: 550, fam3: 1100, set: 1100, card: 187, callShort: 880, callLong: 1980 }, // ✅
      { id: "flat20n",   name: "auフラットプラン20N", ended: "2020年6月", tiers: [[20, 7007]], set: 1100, card: 187, callShort: 880, callLong: 1980 },                                     // ✅（家族割なし）
      { id: "flat7n",    name: "auフラットプラン7プラスN", ended: "2020年6月", tiers: [[7, 6435]], fam2: 550, fam3: 1100, set: 1100, card: 187, callShort: 880, callLong: 1980 },        // 料金✅ / 家族割2回線⚠
      { id: "pitatto",   name: "ピタットプラン 5G / 4G LTE", ended: "2023年1月", tiers: [[1, 3685], [4, 5335], [7, 6985]], fam2: 550, fam3: 1100, set: 550, card: 187, callShort: 880, callLong: 1980 }, // ✅
      { id: "mini",      name: "スマホミニプラン 5G/4G", ended: "2024年12月", tiers: [[1, 3685], [2, 4785], [3, 5885], [4, 6435]], fam2: 220, fam3: 550, set: 550, card: 187, callShort: 880, callLong: 1980 }, // ✅
    ],
    uq: [
      { id: "tokutoku2", name: "トクトクプラン2", tiers: [[5, 2948], [30, 4048]], fam2: 550, fam3: 550, set: 1100, card: 220, callShort: 880, callLong: 1980 },          // ✅（5GB以下の割引込み）
      { id: "komivalue", name: "コミコミプランバリュー", tiers: [[35, 3828]], set: false, card: false, callShort: 0, callLong: 1100 },                                   // ✅ 10分かけ放題込み
      { id: "tokutoku",  name: "トクトクプラン", ended: "2025年", tiers: [[1, 2387], [17, 3685]], fam2: 550, fam3: 550, set: 1100, card: 187, callShort: 880, callLong: 1980 }, // ✅（1GB以下 -1,298円込み）
      { id: "komikomi-plus", name: "コミコミプラン＋", ended: "2025年", tiers: [[30, 3498]], set: false, card: false, callShort: 0, callLong: 1100 },                    // ✅ 10分込み / 完全かけ放題⚠
      { id: "komikomi",  name: "コミコミプラン", ended: "2024年", tiers: [[20, 3498]], set: false, card: false, callShort: 0, callLong: 1100 },                           // ✅ 10分込み / 完全かけ放題⚠
      { id: "minimini",  name: "ミニミニプラン", ended: "2025年", tiers: [[5, 2475]], fam2: 550, fam3: 550, set: 1100, card: 187, callShort: 880, callLong: 1980 },          // ✅
      { id: "kurikoshi5g-s", name: "くりこしプランS +5G", ended: "2023年5月", tiers: [[4, 1738]], set: 638, card: false, callShort: 880, callLong: 1980 },             // ✅ 家族セット割の対象外
      { id: "kurikoshi5g-m", name: "くりこしプランM +5G", ended: "2023年5月", tiers: [[17, 2948]], set: 638, card: false, callShort: 880, callLong: 1980 },            // ✅
      { id: "kurikoshi5g-l", name: "くりこしプランL +5G", ended: "2023年5月", tiers: [[27, 4048]], set: 858, card: false, callShort: 880, callLong: 1980 },            // ✅
      { id: "kurikoshi-s", name: "くりこしプランS（4G）", ended: "2021年", tiers: [[4, 1738]], set: false, card: false, callShort: 880, callLong: 1980 },              // ✅ 自宅セット割の対象外
      { id: "kurikoshi-m", name: "くりこしプランM（4G）", ended: "2021年", tiers: [[17, 2948]], set: false, card: false, callShort: 880, callLong: 1980 },
      { id: "kurikoshi-l", name: "くりこしプランL（4G）", ended: "2021年", tiers: [[27, 4048]], set: false, card: false, callShort: 880, callLong: 1980 },
    ],
  },

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
