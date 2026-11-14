// 料金データ（すべて税込・円/月）
// ✅ = 2026年11月に公式サイトで確認した値 / ⚠ = 目安（公式サイトで確認して更新してください）
//
// 各社の書き方
//   plans[].tiers : [データ容量GB, 割引前の月額]（容量 Infinity = 無制限）
//   plans[].fam2 / fam3 : 家族割（2回線 / 3回線以上のときの1回線あたり割引）
//   plans[].famFrom2nd : 2回線目以降だけ割引される場合の金額
//   plans[].card : false ならカード払い割引の対象外 / plans[].set : false ならセット割の対象外
//   plans[].setAmt / denkiAmt : セット割の金額がプランで違う場合の上書き
//   plans[].callShort / callLong : 短い通話かけ放題 / 完全かけ放題 の追加料金（0 = 込み）
//   net   : セット割の対象ネット回線と割引額（per: "line" = 1回線ごと / "home" = 1世帯）
//   denki : セット割の対象でんきと割引額
//   stack : ネットとでんきのセット割を両方受けられるか
//   famWithSet : 家族割とセット割を両方受けられるか（false なら大きい方だけ）
//
// キャンペーン（promos）の書き方 ※乗り換え・新規で契約したときだけ計算に入ります
//   carriers[].promos : そのキャリアの全プラン共通 / plans[].promos があればそちらを使う
//   internet[].promos / electricity.plans[].promos : 回線・でんきのキャンペーン
//   { label: 名前,
//     amt: 毎月の割引額, months: 割引が続く月数,       ← 月額割引
//     rate: 基本料金に対する割引率（0.5 = 半額）, tiers: 対象のデータ容量,
//     byTier: { データ容量: 割引額 },                  ← 容量ごとに割引額が違う場合
//     once: 1回だけもらえるポイント・残高（1pt = 1円で計算）,
//     until: 申込期限 "YYYY-MM-DD"（過ぎると自動で表示・計算から外れる。未定なら書かない）,
//     excludeFrom: 対象外の乗り換え元キャリアid, house: "home"/"mansion" だけ対象,
//     src: "✅" 公式で確認 / "⚠" まとめサイト等の参考値, note: 条件など }
window.DATA = {
  updated: "2026年11月",
  promoChecked: "2026年11月14日", // キャンペーンを確認した日

  carriers: [
    {
      id: "docomo", name: "ドコモ", card: 220, cardName: "dカード払い",
      net: { ids: ["docomo"], amt: 1210, per: "line" },          // ✅ ドコモ光セット割
      denki: { id: "docomodenki", amt: 110, per: "line" },        // ✅ ドコモでんきセット割
      promos: [{ label: "SIMのみ乗り換え特典（dポイント）", once: 15000, src: "⚠", note: "ドコモオンラインショップでSIMのみ乗り換え・最大値" }],
      stack: true, famWithSet: true,
      plans: [
        { name: "ドコモMAX", tiers: [[1, 5698], [3, 6798], [Infinity, 8448]], fam2: 550, fam3: 1210, callShort: 880, callLong: 1980 }, // ✅
        { name: "ドコモmini2（12月〜）", tiers: [[6, 3278], [12, 4598]], fam2: 550, fam3: 550, callShort: 880, callLong: 1980 },    // ✅
        { name: "ahamo（12月〜）", tiers: [[40, 3135], [60, 4125], [120, 5115]], card: false, set: false, callShort: 0, callLong: 1100,
          promos: [{ label: "ahamo 乗り換え特典（dポイント 4,000pt×5回）", once: 20000, src: "⚠", note: "SIMのみ・要エントリー" }] }, // ✅ 5分込み / かけ放題⚠
      ],
    },
    {
      id: "au", name: "au", card: 220, cardName: "au PAYカード払い",
      net: { ids: ["eo", "auhikari"], amt: 1100, per: "line" },   // ✅ auスマートバリュー（auでんき単体は対象外）
      promos: [{ label: "SIMのみ乗り換え特典（au PAY残高）", once: 20000, excludeFrom: ["uq"], src: "⚠", note: "au Online ShopでSIMのみ・UQ mobile/povoからは対象外" }],
      stack: true, famWithSet: true,
      plans: [
        { name: "使い放題MAX＋ 5G/4G", tiers: [[Infinity, 7788]], fam2: 660, fam3: 1210, callShort: 880, callLong: 1980 },                // ✅
        { name: "スマホミニプラン＋ 5G/4G", tiers: [[1, 4928], [3, 6578], [5, 8228]], fam2: 660, fam3: 1210, callShort: 880, callLong: 1980 }, // ✅（家族割2回線は⚠）
      ],
    },
    {
      id: "uq", name: "UQ mobile", card: 220, cardName: "au PAYカード払い",
      net: { ids: ["eo", "auhikari"], amt: 1100, per: "line" },   // ✅ 自宅セット割 インターネットコース
      denki: { id: "audenki", amt: 1100, per: "line" },           // ✅ 自宅セット割 でんきコース
      promos: [{ label: "SIMのみ乗り換え特典（au PAY残高）", once: 15000, excludeFrom: ["au"], src: "⚠", note: "増量オプションII加入で最大20,000円相当" }],
      stack: false, famWithSet: false,                            // ✅ 家族セット割(550)とは併用不可
      plans: [
        { name: "トクトクプラン2", tiers: [[5, 2948], [30, 4048]], fam2: 550, fam3: 550, callShort: 880, callLong: 1980 }, // ✅ 5GB以下は-1,100込み / 通話⚠
        { name: "コミコミプランバリュー", tiers: [[35, 3828]], card: false, set: false, callShort: 0, callLong: 1100 },   // ✅ 10分かけ放題込み
      ],
    },
    {
      id: "softbank", name: "ソフトバンク", card: 187, cardName: "PayPayカード払い",   // カード割⚠（ゴールドは550）
      net: { ids: ["softbank"], amt: 1100, per: "line", extra: 550 },  // ✅ おうち割 光セット（オプションパック550円が必要）
      denki: { id: "ouchidenki", amt: 110, per: "line" },              // ✅ おうち割 でんきセット(M)
      stack: true, famWithSet: true,
      plans: [
        { name: "テイガク無制限", tiers: [[Infinity, 8008]], fam2: 660, fam3: 1210, callShort: 880, callLong: 1980 },              // ✅
        { name: "ミニフィット2", tiers: [[2, 5258], [5, 6358]], fam2: 220, fam3: 550, callShort: 880, callLong: 1980 },             // ✅
      ],
    },
    {
      id: "ymobile", name: "ワイモバイル", card: 187, cardName: "PayPayカード払い",  // ⚠
      net: { ids: ["softbank"], amt: 1650, per: "line", extra: 550 },  // おうち割 光セット(A) ✅1,650（M/L）
      denki: { id: "ouchidenki", amt: 1100, per: "line" },             // ✅ でんきセット(E)（M/L）・光セットと併用不可
      promos: [{ label: "SIMのみ乗り換え特典（PayPayポイント）", once: 15000, excludeFrom: ["softbank", "linemo"], src: "⚠", note: "最大値・ソフトバンク/LINEMOからは対象外" }],
      stack: false, famWithSet: false,
      plans: [
        { name: "シンプル3 S", tiers: [[5, 3058]], famFrom2nd: 1100, setAmt: 1100, denkiAmt: 0, callShort: 880, callLong: 1980 }, // ⚠
        { name: "シンプル3 M", tiers: [[30, 4158]], famFrom2nd: 1100, callShort: 880, callLong: 1980 },                           // ⚠
        { name: "シンプル3 L", tiers: [[35, 5258]], famFrom2nd: 1100, callShort: 880, callLong: 1980 },                           // ⚠
      ],
    },
    {
      id: "linemo", name: "LINEMO", card: 0,
      plans: [
        { name: "ベストプラン", tiers: [[3, 990], [10, 2090]], callShort: 550, callLong: 1650,
          promos: [{ label: "乗り換え特典（PayPayポイント）", once: 10000, excludeFrom: ["softbank", "ymobile"], src: "⚠" }] },          // ⚠
        { name: "ベストプランV", tiers: [[30, 2970]], callShort: 0, callLong: 1100,
          promos: [{ label: "乗り換え特典（PayPayポイント）", once: 12000, excludeFrom: ["softbank", "ymobile"], src: "⚠" }] },                    // ⚠ 5分込み
      ],
    },
    {
      id: "rakuten", name: "楽天モバイル", card: 0,
      net: { ids: ["rakuten"], amt: 1000, per: "home", label: "最強おうちプログラム（ポイント）" }, // ✅ 1,000pt/月（条件あり）
      promos: [{ label: "三木谷キャンペーン（楽天ポイント）", once: 14000, src: "⚠", note: "他社からの乗り換え・専用リンクからの申込が条件。新規は13,000pt" }],
      stack: true, famWithSet: true,
      plans: [
        { name: "Rakuten最強プラン", tiers: [[3, 1078], [20, 2178], [Infinity, 3278]], fam2: 110, fam3: 110, callShort: 0, callLong: 0 }, // ✅ Rakuten Linkで通話無料
      ],
    },
    {
      id: "mineo", name: "mineo", card: 0,
      net: { ids: ["eo"], amt: 330, per: "home", label: "eo×mineoセット割" },  // ✅
      promos: [{ label: "秋のピッタリ割", byTier: { 3: 418, 7: 528, 15: 968, 30: 858, 50: 858 }, months: 6, until: "2026-11-30", src: "⚠", note: "マイピタ（音声）の基本料金を最大6か月割引" }],
      stack: true, famWithSet: true,
      plans: [
        { name: "マイピタ", tiers: [[3, 1298], [7, 1518], [15, 1958], [30, 2178], [50, 2948]], fam2: 55, fam3: 55, callShort: 550, callLong: 1210 }, // ✅
      ],
    },
    {
      id: "iij", name: "IIJmio", card: 0,
      stack: true, famWithSet: true,
      promos: [{ label: "ギガプラン半額キャンペーン", rate: 0.5, tiers: [5, 10, 15, 25, 35], months: 3, src: "⚠", note: "2026年11月5日開始。12月1日申込分から初期費用が3,850円に" }],
      plans: [
        { name: "ギガプラン", tiers: [[2, 850], [5, 950], [10, 1400], [15, 1800], [25, 2000], [35, 2400]], fam2: 100, fam3: 100, callShort: 500, callLong: 1400 }, // 5GB・通話✅ / 他⚠
      ],
    },
  ],

  // ───────── 自宅のインターネット（1ギガ前後・月額）─────────
  internet: [
    { id: "eo", name: "eo光＋eo光電話", home: 5814, mansion: 4400, note: "戸建て✅（即割）/ マンション⚠",
      promos: [{ label: "eo暮らしスタート割", amt: 2220, months: 12, src: "⚠", note: "eo光ネットの新規申込" }] },
    { id: "auhikari", name: "auひかり＋電話", home: 6380, mansion: 5000, note: "戸建て✅ / マンション⚠。関西は戸建ての提供エリアが限られます" },
    { id: "docomo", name: "ドコモ光", home: 5720, mansion: 4400, note: "✅ タイプA・2年定期" },
    { id: "softbank", name: "ソフトバンク光", home: 6050, mansion: 4510, note: "✅ 2026年12月〜の料金" },
    { id: "nuro", name: "NURO光", home: 5720, mansion: 4235, note: "戸建て✅ 2026年9月〜の通常料金（2年契約）/ マンション⚠",
      promos: [{ label: "2年割", amt: 1740, months: 24, house: "home", src: "✅", note: "開通月〜24か月目は月3,980円" }] },
    { id: "rakuten", name: "楽天ひかり", home: 5280, mansion: 4180, note: "✅" },
  ],

  // ───────── でんき（関西電力エリア）─────────
  // 最低料金（〜15kWh）＋ 15〜120 / 120〜300 / 300kWh超 の1kWh単価（税込）。flat がある場合は1kWhあたり定額。
  // point: 電気料金（税抜）に対するポイント還元率。[[上限額, 率], ...] または 数値
  electricity: {
    renewable: 4.18, // 再エネ賦課金 2026年度 ✅
    plans: [
      { id: "kepcoA", name: "関西電力 従量電灯A", min: 763.81, rates: [20.89, 26.29, 29.27], point: 0, note: "✅" },
      { id: "kepcoNattoku", name: "関西電力 なっトクでんき", min: 618.63, rates: [20.99, 24.78, 28.48], point: 0, note: "✅ 関電ガスとセットの方のみ", needsGas: true },
      { id: "audenki", name: "auでんき（でんきM 関西）", min: 763.80, rates: [20.88, 26.29, 29.26], point: [[5000, 0.01], [8000, 0.03], [Infinity, 0.05]], note: "単価✅ / Ponta還元率⚠",
        promos: [{ label: "申込特典（au PAY残高）", once: 5000, src: "⚠", note: "2026年7月時点の内容。11月の実施は未確認" }] },
      { id: "ouchidenki", name: "おうちでんき（ソフトバンク）", min: 763.81, rates: [20.89, 26.29, 29.27], point: 0, note: "✅ 関西電力 従量電灯Aと同額" },
      { id: "docomodenki", name: "ドコモでんき Basic", min: 763.81, rates: [20.89, 26.29, 29.27], point: 0.01, note: "⚠ 単価・dポイント還元率は未確認（従量電灯A相当で仮置き）" },
      { id: "rakutendenki", name: "楽天でんき プランS", min: 0, flat: 35.28, point: 0.005, note: "✅ 単価。燃料費調整額の代わりに市場価格調整額がかかります",
        promos: [{ label: "初めての利用特典（楽天ポイント）", once: 5000, src: "⚠", note: "毎月開催のキャンペーン（期間限定ポイント・エントリー要）" }] },
    ],
  },
};
