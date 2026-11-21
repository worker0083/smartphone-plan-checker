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
// キャンペーン（promos）の書き方 ※料金が下がる月額割引だけ。ポイント還元・キャッシュバックは入れない
//   乗り換え・新規で契約したときだけ計算に入ります
//   carriers[].promos : そのキャリアの全プラン共通 / plans[].promos があればそちらを使う
//   internet[].promos / electricity.plans[].promos : 回線・でんきのキャンペーン
//   { label: 名前,
//     amt: 毎月の割引額, months: 割引が続く月数,       ← 月額割引
//     rate: 基本料金に対する割引率（0.5 = 半額）, tiers: 対象のデータ容量,
//     byTier: { データ容量: 割引額 },                  ← 容量ごとに割引額が違う場合
//     until: 申込期限 "YYYY-MM-DD"（過ぎると自動で表示・計算から外れる。未定なら書かない）,
//     excludeFrom: 対象外の乗り換え元キャリアid, house: "home"/"mansion" だけ対象,
//     src: "✅" 公式で確認 / "⚠" まとめサイト等の参考値, note: 条件など }
//
// 学割（student）の書き方：carriers[].student
//   { label: 名前, desc: 画面の比較表に出す説明,
//     ages: 対象の年齢区分（"u12" 12歳以下 / "u18" 13〜18歳 / "u22" 19〜22歳）,
//     family: true なら対象の子どもがいると同じキャリアの家族全員が割引,
//     plans: 対象プラン名, amt / byTier / byNeed: 割引額（byNeed は [[使うGB以下, 割引額], ...]）,
//     months: 割引が続く月数（書かない = 対象年齢のあいだずっと）,
//     start / until: 受付開始日・申込期限, calc: false なら比較表に出すだけで計算には入れない, src, note }
//   plans[].studentOnly : その年齢区分の人しか入れない学生向けプラン
window.DATA = {
  updated: "2026年11月",
  promoChecked: "2026年11月21日", // キャンペーンを確認した日

  carriers: [
    {
      id: "docomo", name: "ドコモ", card: 220, cardName: "dカード払い",
      net: { ids: ["docomo"], amt: 1210, per: "line" },          // ✅ ドコモ光セット割
      denki: { id: "docomodenki", amt: 110, per: "line" },        // ✅ ドコモでんきセット割
      student: [{ label: "ドコモU22割", ages: ["u12", "u18", "u22"], plans: ["ドコモMAX"], byNeed: [[28, 2728], [30, 3828], [Infinity, 550]], months: 7, src: "⚠",
        desc: "22歳以下。ドコモMAXが最大7か月、月2,728円引き（28〜30GBは3,828円・30GB超は550円引き）", note: "2025年11月27日開始。2026年11月時点で受付中との情報" }],
      stack: true, famWithSet: true,
      plans: [
        { name: "ドコモMAX", tiers: [[1, 5698], [3, 6798], [Infinity, 8448]], fam2: 550, fam3: 1210, callShort: 880, callLong: 1980 }, // ✅
        { name: "ドコモmini2（12月〜）", tiers: [[6, 3278], [12, 4598]], fam2: 550, fam3: 550, callShort: 880, callLong: 1980 },    // ✅
        { name: "ahamo（12月〜）", tiers: [[40, 3135], [60, 4125], [120, 5115]], card: false, set: false, callShort: 0, callLong: 1100 }, // ✅ 5分込み / かけ放題⚠
      ],
    },
    {
      id: "au", name: "au", card: 220, cardName: "au PAYカード払い",
      net: { ids: ["eo", "auhikari"], amt: 1100, per: "line" },   // ✅ auスマートバリュー（auでんき単体は対象外）
      student: [{ label: "U18バリュープラン", ages: ["u12", "u18"], calc: false, src: "⚠",
        desc: "5〜18歳が入れる専用プラン。3GBまで2,398円・20GBまで4,048円（割引前）で、23歳になる月まで同じ料金", note: "プランとして比較に入っています。U18ギガ増量キャンペーンは2026年5月で終了" }],
      stack: true, famWithSet: true,
      plans: [
        { name: "使い放題MAX＋ 5G/4G", tiers: [[Infinity, 7788]], fam2: 660, fam3: 1210, callShort: 880, callLong: 1980 },                // ✅
        { name: "スマホミニプラン＋ 5G/4G", tiers: [[1, 4928], [3, 6578], [5, 8228]], fam2: 660, fam3: 1210, callShort: 880, callLong: 1980 }, // ✅（家族割2回線は⚠）
        { name: "U18バリュープラン", studentOnly: ["u12", "u18"], tiers: [[3, 2398], [20, 4048]], callShort: 880, callLong: 1980 }, // ⚠ 家族割は対象外として計算
      ],
    },
    {
      id: "uq", name: "UQ mobile", card: 220, cardName: "au PAYカード払い",
      net: { ids: ["eo", "auhikari"], amt: 1100, per: "line" },   // ✅ 自宅セット割 インターネットコース
      denki: { id: "audenki", amt: 1100, per: "line" },           // ✅ 自宅セット割 でんきコース
      stack: false, famWithSet: false,                            // ✅ 家族セット割(550)とは併用不可
      student: [{ label: "UQ親子応援割", ages: ["u12", "u18"], family: true, plans: ["トクトクプラン2", "コミコミプランバリュー"], byTier: { 5: 0, 30: 1100, 35: 1100 }, months: 12, start: "2026-11-19", src: "⚠",
        desc: "18歳以下の子どもと家族がそれぞれ12か月、月1,100円引き", note: "トクトクプラン2の5GB以下割引（1,100円）とは併用不可" }],
      plans: [
        { name: "トクトクプラン2", tiers: [[5, 2948], [30, 4048]], fam2: 550, fam3: 550, callShort: 880, callLong: 1980 }, // ✅ 5GB以下は-1,100込み / 通話⚠
        { name: "コミコミプランバリュー", tiers: [[35, 3828]], card: false, set: false, callShort: 0, callLong: 1100 },   // ✅ 10分かけ放題込み
      ],
    },
    {
      id: "softbank", name: "ソフトバンク", card: 187, cardName: "PayPayカード払い",   // カード割⚠（ゴールドは550）
      net: { ids: ["softbank"], amt: 1100, per: "line", extra: 550 },  // ✅ おうち割 光セット（オプションパック550円が必要）
      denki: { id: "ouchidenki", amt: 110, per: "line" },              // ✅ おうち割 でんきセット(M)
      student: [{ label: "ソフトバンクデビュー割", ages: ["u12", "u18"], calc: false, start: "2026-11-18", src: "⚠",
        desc: "親が対象プランなら、子どものスマホデビュープラン2（30GBまで）が翌月から半年0円", note: "プランの料金を確認できていないため計算には入れていません" }],
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
      stack: false, famWithSet: false,
      student: [{ label: "ワイモバ親子割", ages: ["u12", "u18"], family: true, plans: ["シンプル3 M", "シンプル3 L"], amt: 1100, months: 12, start: "2026-11-18", src: "✅",
        desc: "5〜18歳の子どもと家族がシンプル3 M/Lで1年間、月1,100円引き（シンプル3 Sは対象外）",
        note: "公式で確認。PayPayカード ゴールド払い＋おうち割 光セット（A）なら1年間 月858円・14か月目以降 月1,958円（シンプル3 M）。期間は公式ページでは「13か月目まで」の表記もあり" }],
      plans: [
        { name: "シンプル3 S", tiers: [[5, 3058]], famFrom2nd: 1100, setAmt: 1100, denkiAmt: 0, callShort: 880, callLong: 1980 }, // ⚠
        { name: "シンプル3 M", tiers: [[30, 4158]], famFrom2nd: 1100, callShort: 880, callLong: 1980 },                           // ⚠
        { name: "シンプル3 L", tiers: [[35, 5258]], famFrom2nd: 1100, callShort: 880, callLong: 1980 },                           // ⚠
      ],
    },
    {
      id: "linemo", name: "LINEMO", card: 0,
      plans: [
        { name: "ベストプラン", tiers: [[3, 990], [10, 2090]], callShort: 550, callLong: 1650 },          // ⚠
        { name: "ベストプランV", tiers: [[30, 2970]], callShort: 0, callLong: 1100 },                    // ⚠ 5分込み
      ],
    },
    {
      id: "rakuten", name: "楽天モバイル", card: 0,
      net: { ids: ["rakuten"], amt: 1000, per: "home", label: "最強おうちプログラム（ポイント）" }, // ✅ 1,000pt/月（条件あり）
      stack: true, famWithSet: true,
      student: [
        { label: "最強こども割", ages: ["u12"], byNeed: [[3, 440], [Infinity, 110]], src: "⚠", desc: "12歳以下。3GBまで月440円引き・3GB超は110円引き（12歳のあいだずっと）" },
        { label: "最強青春割", ages: ["u18", "u22"], amt: 110, src: "⚠", desc: "13〜22歳。月110円引き（22歳のあいだずっと）" },
      ],
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
      { id: "audenki", name: "auでんき（でんきM 関西）", min: 763.80, rates: [20.88, 26.29, 29.26], point: [[5000, 0.01], [8000, 0.03], [Infinity, 0.05]], note: "単価✅ / Ponta還元率⚠" },
      { id: "ouchidenki", name: "おうちでんき（ソフトバンク）", min: 763.81, rates: [20.89, 26.29, 29.27], point: 0, note: "✅ 関西電力 従量電灯Aと同額" },
      { id: "docomodenki", name: "ドコモでんき Basic", min: 763.81, rates: [20.89, 26.29, 29.27], point: 0.01, note: "⚠ 単価・dポイント還元率は未確認（従量電灯A相当で仮置き）" },
      { id: "rakutendenki", name: "楽天でんき プランS", min: 0, flat: 35.28, point: 0.005, note: "✅ 単価。燃料費調整額の代わりに市場価格調整額がかかります" },
    ],
  },
};
