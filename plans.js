// 料金データ（すべて税込・円/月）
// 【確認済み】= 2026年11月に公式サイトで確認した値 / 【参考】= 目安。公式サイトで確認して更新してください。
window.DATA = {
  updated: "2026年11月",

  // ───────── スマホ ─────────
  au: {
    // 【確認済み】au.com 料金ページ（2026年10月21日時点）
    unlimited: { name: "au 使い放題MAX＋ 5G/4G", gb: Infinity, base: 7788 },
    // 【確認済み】スマホミニプラン＋ 割引後 〜1GB 2,398 / 〜3GB 4,048 / 〜5GB 5,698 から逆算した割引前料金
    mini: { name: "au スマホミニプラン＋ 5G/4G", tiers: [[1, 4928], [3, 6578], [5, 8228]] },
    smartValue: 1100,          // auスマートバリュー（ネット回線とセット）【確認済み】
    family2: 660,              // 家族割プラス 2人【確認済み】
    family3: 1210,             // 家族割プラス 3人以上【確認済み】
    auPay: 220,                // au PAY カードお支払い割【確認済み】
    call5: 880,                // 通話定額ライト2（5分）【参考】
    callFree: 1980,            // 通話定額2（完全かけ放題）【参考】
  },
  uq: {
    // 【確認済み】uqwimax.jp トクトクプラン2（2026年10月13日現在）
    tokutoku: { name: "UQ mobile トクトクプラン2", gb: 30, base: 4048, smallDiscount: 1100, smallGb: 5 },
    // 【確認済み】コミコミプランバリュー：35GB＋10分かけ放題込み（2026年11月9日現在）※セット割対象外
    komikomi: { name: "UQ mobile コミコミプランバリュー", gb: 35, base: 3828 },
    homeSet: 1100,             // 自宅セット割（ネット or auでんき）【確認済み】
    familySet: 550,            // 家族セット割（自宅セット割と併用不可）【確認済み】
    auPay: 220,                // au PAY カードお支払い割【確認済み】
    call10: 880,               // 通話かけ放題（10分）【参考】
    callFree: 1980,            // 通話かけ放題（完全）【参考】
  },
  // 他社の目安【参考】
  otherMobile: [
    { name: "ドコモ・ソフトバンク 無制限プラン", tiers: [[Infinity, 7500]], call5: 880, callFree: 1980, family: 1100, homeSet: 1100 },
    { name: "大手のオンライン専用プラン（ahamo・LINEMO・povo など）", tiers: [[3, 990], [30, 2970], [100, 4950]], call5: 0, callFree: 1100, family: 0, homeSet: 0 },
    { name: "楽天モバイル", tiers: [[3, 1078], [20, 2178], [Infinity, 3278]], call5: 0, callFree: 0, family: 110, homeSet: 0 },
    { name: "格安SIM（IIJmio・mineo など）", tiers: [[2, 850], [5, 950], [10, 1400], [15, 1800], [25, 2000], [35, 2400]], call5: 500, callFree: 1400, family: 0, homeSet: 0 },
  ],

  // ───────── 自宅のインターネット ─────────
  // setOk: au スマートバリュー / UQ 自宅セット割の対象か
  internet: [
    // 【確認済み】eo光ネット ホーム1ギガ（即割）5,500＋eo光電話 314（セット割には ネット＋電話 が必要）
    { id: "eo", name: "eo光（1ギガ）＋eo光電話", home: 5814, mansion: 4400, setOk: true, note: "関西の光回線。au スマートバリュー / UQ 自宅セット割の対象（ネット＋電話）。マンション料金は【参考】" },
    // 【確認済み】auひかり ホーム 1ギガ ずっとギガ得プラン 5,610＋電話 770
    { id: "auhikari", name: "auひかり（1ギガ）＋電話", home: 6380, mansion: 5000, setOk: true, note: "関西では戸建てタイプの提供エリアが限られます。マンション料金は【参考】" },
    { id: "docomo", name: "ドコモ光（1ギガ）", home: 5720, mansion: 4400, setOk: false, note: "【参考】au/UQのセット割は対象外" },
    { id: "softbank", name: "ソフトバンク光（1ギガ）", home: 5720, mansion: 4180, setOk: false, note: "【参考】au/UQのセット割は対象外" },
    { id: "nuro", name: "NURO光（2ギガ）", home: 5200, mansion: 3850, setOk: false, note: "【参考】au/UQのセット割は対象外" },
  ],

  // ───────── でんき（関西電力エリア）─────────
  // 料金単価：最低料金（〜15kWh）と 15〜120 / 120〜300 / 300kWh超 の1kWhあたり単価（税込）
  // 燃料費調整額はどのプランもほぼ同水準のため比較から除外。再エネ賦課金は共通で加算。
  electricity: {
    renewable: 4.18,           // 再エネ賦課金 1kWhあたり（2026年度）【確認済み】
    kepcoA: { name: "関西電力 従量電灯A", min: 763.81, rates: [20.89, 26.29, 29.27] },          // 【確認済み】kepco.jp
    kepcoNattoku: { name: "関西電力 なっトクでんき（なっトクパック）", min: 618.63, rates: [20.99, 24.78, 28.48] }, // 【確認済み】kepco.jp
    au: { name: "auでんき（でんきM 関西）", min: 763.80, rates: [20.88, 26.29, 29.26] },       // 【確認済み】au.com
    // auでんきポイントで割引：電気料金（税抜の最低料金＋電力量料金）に応じたPonta還元【参考：規約で要確認】
    auPoint: [[5000, 0.01], [8000, 0.03], [Infinity, 0.05]],
  },
};
