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

  // ───────── auひかりプラス（1ギガ・2年契約・プロバイダBIGLOBE）✅ 2026年11月 au公式 ─────────
  // ネット料金にハイブリッドホームルーターのレンタル料（858円・必須）を足した額
  // 2年毎月割：光回線開通後24か月の割引（対象窓口・BIGLOBEの場合）
  // phone：Wi-Fiパック（電話含む）770円。開通後12か月はデビュー割で実質0円
  // denkiSet：auひかりプラス でんきセット割（Wi-Fiパックの料金から割引。13〜36か月目 330円、37か月目〜 110円）
  // auスマートバリュー・自宅セット割は「ネット＋電話」のときだけ対象（ネットのみは対象外）✅
  hikariPlus: {
    home:    { name: "auひかりプラス ホーム（1ギガ）",    net: 5720, router: 858, twoYear: 1188 },
    mansion: { name: "auひかりプラス マンション（1ギガ）", net: 4642, router: 858, twoYear: 627 },
    phone: 770, phoneFreeMonths: 12,
    denkiSet: { amt: 330, from: 13, to: 36, after: 110 },
    signup: 4950,             // サービス登録料（初回のみ）
    cancel: 3102,             // 契約解除料
  },

  // ───────── でんき（関西）─────────
  // 最低料金（〜15kWh）＋ 15〜120 / 120〜300 / 300kWh超 の1kWh単価（税込 / 税抜）
  electricity: {
    renewable: 4.18, // 再エネ賦課金 2026年度 ✅
    kepco:   { name: "関西電力 従量電灯A",       min: 763.81, rates: [20.89, 26.29, 29.27] },                 // ✅
    audenki: { name: "auでんき でんきMプラン（関西）", min: 763.80, rates: [20.88, 26.29, 29.26],              // ✅ 2026年11月改定後
               minEx: 694.37, ratesEx: [18.99, 23.90, 26.60],                                                // ✅ 税抜（ポイント計算用）
               // Pontaポイント還元（基本料金・電力量料金の税抜合計に対して）
               // 8,000円以上 1% ✅（公式の計算例）/ 8,000円未満 0.5% ⚠
               point: [[8000, 0.005], [Infinity, 0.01]] },
  },
};
