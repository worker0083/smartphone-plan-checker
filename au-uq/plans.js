// au / UQ mobile の料金データ（すべて税込・円/月）
// ✅ = 2026年11月に公式サイトで確認した値 / ⚠ = 目安（公式サイトで確認して更新してください）
//
//   tiers      : [データ容量GB, 割引前の月額]（Infinity = 無制限）
//   fam2/fam3  : 家族割（その会社の回線が家族で2回線 / 3回線以上のときの1回線あたり割引）
//   card       : false ならカード払い割引の対象外
//   set        : false なら自宅セット割（ネット・でんき）の対象外
//   callShort  : 短時間かけ放題の追加料金 / callLong : 完全かけ放題の追加料金（0 = プランに込み）
//   net        : 自宅セット割の対象ネット回線と1回線あたりの割引額
//   denki      : 自宅セット割の対象でんきと1回線あたりの割引額
//   stack      : ネットとでんきのセット割を両方受けられるか
//   famWithSet : 家族割とセット割を両方受けられるか（false なら大きい方だけ）
window.DATA = {
  updated: "2026年11月",
  carriers: [
    {
      id: "au", name: "au", card: 220, cardName: "au PAYカード払い",
      net: { ids: ["eo", "auhikari"], amt: 1100, label: "auスマートバリュー" },   // ✅
      denki: null,                                                                // auでんき単体はスマートバリュー対象外 ✅
      stack: true, famWithSet: true, famName: "家族割プラス",
      plans: [
        { name: "使い放題MAX＋ 5G/4G", tiers: [[Infinity, 7788]], fam2: 660, fam3: 1210, callShort: 880, callLong: 1980 },                // ✅
        { name: "スマホミニプラン＋ 5G/4G", tiers: [[1, 4928], [3, 6578], [5, 8228]], fam2: 660, fam3: 1210, callShort: 880, callLong: 1980 }, // ✅（家族割2回線は⚠）
      ],
    },
    {
      id: "uq", name: "UQ mobile", card: 220, cardName: "au PAYカード払い",
      net: { ids: ["eo", "auhikari"], amt: 1100, label: "自宅セット割（インターネットコース）" }, // ✅
      denki: { amt: 1100, label: "自宅セット割（でんきコース）" },                                // ✅
      stack: false, famWithSet: false, famName: "家族セット割",                                   // ✅ 家族セット割(550)とは併用不可
      plans: [
        { name: "トクトクプラン2", tiers: [[5, 2948], [30, 4048]], fam2: 550, fam3: 550, callShort: 880, callLong: 1980 }, // ✅ 5GB以下は-1,100込み / 通話⚠
        { name: "コミコミプランバリュー", tiers: [[35, 3828]], card: false, set: false, callShort: 0, callLong: 1100 },   // ✅ 10分かけ放題込み
      ],
    },
  ],
};
