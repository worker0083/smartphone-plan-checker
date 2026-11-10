// 料金プランのデータ（参考値・税込/月）
// 実際の料金は各社の公式サイトで確認し、ここを更新してください。
// tiers: [データ容量GB, 月額円]  ※ 容量 Infinity = 無制限
// call5: 5分かけ放題オプション / callFree: 完全かけ放題オプション（0 = 標準で込み）
// familyDiscount: 2回線以上のときの1回線あたり割引額
// homeSetDiscount: 自宅の光回線などとのセット割（1回線あたり）
window.PLAN_CATEGORIES = [
  {
    id: "major-unlimited",
    name: "大手キャリア 無制限プラン",
    examples: "docomo / au / SoftBank の大容量プラン",
    tiers: [[Infinity, 7700]],
    call5: 880, callFree: 1980,
    familyDiscount: 1100, homeSetDiscount: 1100,
    quality: 3, store: true,
    note: "通信品質と店舗サポートが手厚い。割引条件が多く、条件を満たさないと割高。"
  },
  {
    id: "major-step",
    name: "大手キャリア 段階制プラン",
    examples: "使った分だけ課金される大手の小容量プラン",
    tiers: [[1, 3850], [3, 5000], [7, 6500]],
    call5: 880, callFree: 1980,
    familyDiscount: 550, homeSetDiscount: 1100,
    quality: 3, store: true,
    note: "使用量が少ない月は安くなるが、格安系と比べると割高になりやすい。"
  },
  {
    id: "online",
    name: "大手のオンライン専用プラン",
    examples: "ahamo / povo / LINEMO など",
    tiers: [[3, 990], [20, 2970], [30, 2970], [100, 4950]],
    call5: 0, callFree: 1100,
    familyDiscount: 0, homeSetDiscount: 0,
    quality: 3, store: false,
    note: "大手と同じ回線品質で安い。申込みやサポートは基本オンライン。"
  },
  {
    id: "subbrand",
    name: "サブブランド",
    examples: "Y!mobile / UQ mobile など",
    tiers: [[4, 2365], [20, 3465], [30, 4015]],
    call5: 880, callFree: 1980,
    familyDiscount: 1100, homeSetDiscount: 1100,
    quality: 3, store: true,
    note: "店舗サポートありで価格は中間。家族割・セット割が効くとかなり安くなる。"
  },
  {
    id: "rakuten-type",
    name: "従量制ワンプラン",
    examples: "楽天モバイル など",
    tiers: [[3, 1078], [20, 2178], [Infinity, 3278]],
    call5: 0, callFree: 0,
    familyDiscount: 110, homeSetDiscount: 0,
    quality: 2, store: true,
    note: "専用アプリで国内通話無料。エリアによってはつながりにくい場合あり。"
  },
  {
    id: "mvno",
    name: "格安SIM（MVNO）",
    examples: "IIJmio / mineo / 日本通信 など",
    tiers: [[2, 850], [5, 950], [10, 1400], [15, 1800], [25, 2000], [35, 2400]],
    call5: 500, callFree: 1400,
    familyDiscount: 0, homeSetDiscount: 0,
    quality: 1, store: false,
    note: "とにかく安い。昼休みや夕方は速度が落ちやすい。"
  }
];
