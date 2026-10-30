/**
 * storage.js - 盲酌本地存储与全面 Mock 仿真数据层
 * 预置 3 大真实场景经典酒局（酱浓争霸、次高端百元黑马局、进行中待开奖局）
 * 包含丰富的盲猜推测、五维主观评分、真实对比与高反差趣味数据
 */

const STORAGE_KEYS = {
  CURRENT_USER: 'mz_current_user',
  ROOMS: 'mz_rooms',
  SAMPLES: 'mz_samples',
  MEMBERS: 'mz_members',
  GUESSES: 'mz_guesses',
  RATINGS: 'mz_ratings'
};

const DEFAULT_USER = {
  userId: 'user_master',
  nickname: '品鉴客 Joozo',
  avatar: '🍶',
  avatarBg: '#d6b06a'
};

const AROMA_TYPES = [
  '酱香型', '浓香型', '清香型', '兼香型', '凤香型', '董香型', '米香型', '老白干香型', '芝麻香型', '特香型', '其它'
];

const DEGREE_OPTIONS = ['53°', '52°', '42°', '38°', '60°及以上', '其它'];

const PRICE_RANGES = [
  { label: '百元口粮 (¥0~¥150)', min: 0, max: 150 },
  { label: '大众进阶 (¥150~¥400)', min: 150, max: 400 },
  { label: '商务次高端 (¥400~¥800)', min: 400, max: 800 },
  { label: '高端名酒 (¥800~¥1800)', min: 800, max: 1800 },
  { label: '超高端/收藏 (¥1800以上)', min: 1800, max: 99999 }
];

function initInitialData(forceReset = false) {
  let currentUser = wx.getStorageSync(STORAGE_KEYS.CURRENT_USER);
  if (!currentUser) {
    wx.setStorageSync(STORAGE_KEYS.CURRENT_USER, DEFAULT_USER);
  }

  let rooms = wx.getStorageSync(STORAGE_KEYS.ROOMS);
  if (forceReset || !rooms || rooms.length === 0) {
    seedRichMockData();
  }
}

function seedRichMockData() {
  const now = Date.now();

  // ============================================================
  // 酒局 1：周五酱浓高端盲品争霸赛 (已开奖，数据完整丰富)
  // 4款酒：1号飞天茅台(¥2800)、2号君品习酒(¥980)、3号普五第八代(¥1050)、4号珍酒珍十五(¥420)
  // 趣味反差点：盲饮打分最高的反而是 2号君品习酒(9.3分)，而 4号珍十五被盲猜均估到了¥520，成为全场最大黑马！
  // ============================================================
  const room1 = {
    roomId: 'room_demo_01',
    roomCode: '6888',
    name: '周五酱浓高端盲品争霸赛',
    description: '四款名酒统一醒酒20分钟，撕去酒标，只凭舌尖见真章！',
    ownerId: 'user_master',
    sampleCount: 4,
    maxMembers: 8,
    status: 'revealed',
    statusText: '已开奖',
    createdAt: now - 3600 * 1000 * 4,
    revealAt: now - 3600 * 1000 * 0.5
  };

  const samples1 = [
    {
      sampleId: 's_01_1',
      roomId: 'room_demo_01',
      number: 1,
      bottleTag: '1号酒',
      brand: '贵州茅台',
      product: '飞天茅台 (53%vol)',
      aromaType: '酱香型',
      alcoholDegree: '53°',
      year: '2021',
      marketPrice: 2800,
      notes: '经典茅香，微酸带焦糊香，酱香浓郁突出，空杯留香持久。'
    },
    {
      sampleId: 's_01_2',
      roomId: 'room_demo_01',
      number: 2,
      bottleTag: '2号酒',
      brand: '习酒',
      product: '君品习酒',
      aromaType: '酱香型',
      alcoholDegree: '53°',
      year: '2022',
      marketPrice: 980,
      notes: '极为温雅细腻，入口顺滑如丝，无一丝辛辣杂味，大众盲饮最讨喜。'
    },
    {
      sampleId: 's_01_3',
      roomId: 'room_demo_01',
      number: 3,
      bottleTag: '3号酒',
      brand: '宜宾五粮液',
      product: '第八代五粮液 (普五)',
      aromaType: '浓香型',
      alcoholDegree: '52°',
      year: '2023',
      marketPrice: 1050,
      notes: '多粮复合喷香极其霸道，诸味极其协调，甘冽净爽，回味悠长。'
    },
    {
      sampleId: 's_01_4',
      roomId: 'room_demo_01',
      number: 4,
      bottleTag: '4号酒',
      brand: '贵州珍酒',
      product: '珍十五 (经典版)',
      aromaType: '酱香型',
      alcoholDegree: '53°',
      year: '2022',
      marketPrice: 420,
      notes: '酱味厚实，中后段略带微苦涩感，但风味骨架扎实，性价比极高。'
    }
  ];

  const members1 = [
    { userId: 'user_master', roomId: 'room_demo_01', nickname: '品鉴客 Joozo', avatar: '🍶', role: 'owner', isSubmitted: true },
    { userId: 'user_chen', roomId: 'room_demo_01', nickname: '老陈喝不倒', avatar: '🥃', role: 'member', isSubmitted: true },
    { userId: 'user_lin', roomId: 'room_demo_01', nickname: '微醺小林', avatar: '🍷', role: 'member', isSubmitted: true },
    { userId: 'user_zhao', roomId: 'room_demo_01', nickname: '杯酒言欢老赵', avatar: '🥂', role: 'member', isSubmitted: true }
  ];

  const guesses1 = [
    // Joozo (猜酒高手，总分极高)
    { roomId: 'room_demo_01', userId: 'user_master', sampleId: 's_01_1', brand: '贵州茅台', product: '飞天茅台', aromaType: '酱香型', alcoholDegree: '53°', year: '2021', estimatedPrice: 2700 },
    { roomId: 'room_demo_01', userId: 'user_master', sampleId: 's_01_2', brand: '习酒', product: '君品习酒', aromaType: '酱香型', alcoholDegree: '53°', year: '2022', estimatedPrice: 950 },
    { roomId: 'room_demo_01', userId: 'user_master', sampleId: 's_01_3', brand: '宜宾五粮液', product: '第八代五粮液', aromaType: '浓香型', alcoholDegree: '52°', year: '2023', estimatedPrice: 1000 },
    { roomId: 'room_demo_01', userId: 'user_master', sampleId: 's_01_4', brand: '贵州珍酒', product: '珍十五', aromaType: '酱香型', alcoholDegree: '53°', year: '2022', estimatedPrice: 450 },

    // 老陈喝不倒 (老饕，猜对茅台和五粮液，但把习酒当成了国台)
    { roomId: 'room_demo_01', userId: 'user_chen', sampleId: 's_01_1', brand: '贵州茅台', product: '飞天茅台', aromaType: '酱香型', alcoholDegree: '53°', year: '2020', estimatedPrice: 2800 },
    { roomId: 'room_demo_01', userId: 'user_chen', sampleId: 's_01_2', brand: '国台', product: '国台十五年', aromaType: '酱香型', alcoholDegree: '53°', year: '2021', estimatedPrice: 750 },
    { roomId: 'room_demo_01', userId: 'user_chen', sampleId: 's_01_3', brand: '四川剑南春', product: '珍藏级剑南春', aromaType: '浓香型', alcoholDegree: '52°', year: '2022', estimatedPrice: 650 },
    { roomId: 'room_demo_01', userId: 'user_chen', sampleId: 's_01_4', brand: '四川郎酒', product: '红花郎15', aromaType: '酱香型', alcoholDegree: '53°', year: '2022', estimatedPrice: 580 },

    // 微醺小林 (把君品习酒猜成飞天，把飞天猜成君品)
    { roomId: 'room_demo_01', userId: 'user_lin', sampleId: 's_01_1', brand: '习酒', product: '君品习酒', aromaType: '酱香型', alcoholDegree: '53°', year: '2022', estimatedPrice: 1100 },
    { roomId: 'room_demo_01', userId: 'user_lin', sampleId: 's_01_2', brand: '贵州茅台', product: '飞天茅台', aromaType: '酱香型', alcoholDegree: '53°', year: '2021', estimatedPrice: 2600 },
    { roomId: 'room_demo_01', userId: 'user_lin', sampleId: 's_01_3', brand: '宜宾五粮液', product: '第八代五粮液', aromaType: '浓香型', alcoholDegree: '52°', year: '2022', estimatedPrice: 980 },
    { roomId: 'room_demo_01', userId: 'user_lin', sampleId: 's_01_4', brand: '贵州珍酒', product: '珍十五', aromaType: '酱香型', alcoholDegree: '53°', year: '2022', estimatedPrice: 460 },

    // 杯酒言欢老赵
    { roomId: 'room_demo_01', userId: 'user_zhao', sampleId: 's_01_1', brand: '贵州茅台', product: '飞天茅台', aromaType: '酱香型', alcoholDegree: '53°', year: '2021', estimatedPrice: 2500 },
    { roomId: 'room_demo_01', userId: 'user_zhao', sampleId: 's_01_2', brand: '四川郎酒', product: '青花郎', aromaType: '酱香型', alcoholDegree: '53°', year: '2021', estimatedPrice: 1000 },
    { roomId: 'room_demo_01', userId: 'user_zhao', sampleId: 's_01_3', brand: '宜宾五粮液', product: '五粮春', aromaType: '浓香型', alcoholDegree: '52°', year: '2023', estimatedPrice: 350 },
    { roomId: 'room_demo_01', userId: 'user_zhao', sampleId: 's_01_4', brand: '贵州董酒', product: '董酒密藏', aromaType: '董香型', alcoholDegree: '54°', year: '2020', estimatedPrice: 400 }
  ];

  const ratings1 = [
    // Joozo
    { roomId: 'room_demo_01', userId: 'user_master', sampleId: 's_01_1', aroma: 9.3, entrance: 9.1, richness: 9.4, balance: 9.1, finish: 9.3, overall: 9.2, comment: '经典老酱香，空杯留香非常持久。' },
    { roomId: 'room_demo_01', userId: 'user_master', sampleId: 's_01_2', aroma: 9.4, entrance: 9.6, richness: 9.3, balance: 9.5, finish: 9.4, overall: 9.4, comment: '入口毫无辛辣刺激，极其丝滑温润！' },
    { roomId: 'room_demo_01', userId: 'user_master', sampleId: 's_01_3', aroma: 9.0, entrance: 8.9, richness: 8.9, balance: 8.9, finish: 8.8, overall: 8.9, comment: '浓香粮香喷涌，爆香显著。' },
    { roomId: 'room_demo_01', userId: 'user_master', sampleId: 's_01_4', aroma: 8.6, entrance: 8.4, richness: 8.7, balance: 8.5, finish: 8.5, overall: 8.5, comment: '酒体很足，微带苦涩但劲道够。' },

    // 老陈
    { roomId: 'room_demo_01', userId: 'user_chen', sampleId: 's_01_1', aroma: 9.1, entrance: 9.0, richness: 9.2, balance: 9.0, finish: 9.2, overall: 9.1, comment: '大厂底蕴，沉香明显。' },
    { roomId: 'room_demo_01', userId: 'user_chen', sampleId: 's_01_2', aroma: 9.3, entrance: 9.4, richness: 9.1, balance: 9.3, finish: 9.2, overall: 9.3, comment: '喝着体感最舒适的一杯酒。' },
    { roomId: 'room_demo_01', userId: 'user_chen', sampleId: 's_01_3', aroma: 8.8, entrance: 8.7, richness: 8.8, balance: 8.8, finish: 8.7, overall: 8.8, comment: '浓香甘冽醇正。' },
    { roomId: 'room_demo_01', userId: 'user_chen', sampleId: 's_01_4', aroma: 8.4, entrance: 8.2, richness: 8.5, balance: 8.3, finish: 8.4, overall: 8.4, comment: '性价比非常高的一款。' },

    // 微醺小林
    { roomId: 'room_demo_01', userId: 'user_lin', sampleId: 's_01_1', aroma: 8.9, entrance: 8.8, richness: 9.0, balance: 8.9, finish: 8.9, overall: 8.9, comment: '香气浓郁但略微冲喉。' },
    { roomId: 'room_demo_01', userId: 'user_lin', sampleId: 's_01_2', aroma: 9.5, entrance: 9.5, richness: 9.3, balance: 9.4, finish: 9.3, overall: 9.4, comment: '全场最爱！完全不辣喉咙，下咽极顺。' },
    { roomId: 'room_demo_01', userId: 'user_lin', sampleId: 's_01_3', aroma: 8.7, entrance: 8.8, richness: 8.6, balance: 8.7, finish: 8.6, overall: 8.7, comment: '香气非常讨喜。' },
    { roomId: 'room_demo_01', userId: 'user_lin', sampleId: 's_01_4', aroma: 8.5, entrance: 8.4, richness: 8.6, balance: 8.5, finish: 8.4, overall: 8.5, comment: '很耐喝。' },

    // 老赵
    { roomId: 'room_demo_01', userId: 'user_zhao', sampleId: 's_01_1', aroma: 9.0, entrance: 9.0, richness: 9.1, balance: 9.0, finish: 9.0, overall: 9.0, comment: '酱香很纯正。' },
    { roomId: 'room_demo_01', userId: 'user_zhao', sampleId: 's_01_2', aroma: 9.2, entrance: 9.3, richness: 9.0, balance: 9.2, finish: 9.1, overall: 9.2, comment: '入口圆润丰满。' },
    { roomId: 'room_demo_01', userId: 'user_zhao', sampleId: 's_01_3', aroma: 8.6, entrance: 8.6, richness: 8.7, balance: 8.6, finish: 8.7, overall: 8.6, comment: '标准浓香大曲风格。' },
    { roomId: 'room_demo_01', userId: 'user_zhao', sampleId: 's_01_4', aroma: 8.4, entrance: 8.2, richness: 8.4, balance: 8.2, finish: 8.3, overall: 8.3, comment: '酱香突出。' }
  ];


  // ============================================================
  // 酒局 2：百元级国民口粮盲饮鉴真 (已开奖)
  // 3款酒：1号黄盖玻汾(¥55)、2号红星二锅头蓝瓶(¥45)、3号西凤绿脖(¥55)
  // 真实价格都很亲民，盲品估价却都在 ¥120~¥180 之间，全员大跌眼镜！
  // ============================================================
  const room2 = {
    roomId: 'room_demo_02',
    roomCode: '3188',
    name: '百元级国民口粮盲饮鉴真',
    description: '三款几十元的国民良心口粮酒，究竟谁才是真神？',
    ownerId: 'user_chen',
    sampleCount: 3,
    maxMembers: 6,
    status: 'revealed',
    statusText: '已开奖',
    createdAt: now - 3600 * 1000 * 24 * 2,
    revealAt: now - 3600 * 1000 * 24 * 1.8
  };

  const samples2 = [
    {
      sampleId: 's_02_1',
      roomId: 'room_demo_02',
      number: 1,
      bottleTag: '1号酒',
      brand: '山西汾酒',
      product: '黄盖玻汾 (53%vol)',
      aromaType: '清香型',
      alcoholDegree: '53°',
      year: '2023',
      marketPrice: 55,
      notes: '一清到底，落口甜，净爽利落，毫无杂醇油邪味。'
    },
    {
      sampleId: 's_02_2',
      roomId: 'room_demo_02',
      number: 2,
      bottleTag: '2号酒',
      brand: '北京红星',
      product: '红星二锅头 (蓝瓶绵柔)',
      aromaType: '清香型',
      alcoholDegree: '53°',
      year: '2023',
      marketPrice: 45,
      notes: '绵柔纯粮香，烈而不燥，下咽痛快。'
    },
    {
      sampleId: 's_02_3',
      roomId: 'room_demo_02',
      number: 3,
      bottleTag: '3号酒',
      brand: '陕西西凤酒',
      product: '西凤酒绿脖 (高脖西凤)',
      aromaType: '凤香型',
      alcoholDegree: '55°',
      year: '2023',
      marketPrice: 55,
      notes: '醇香典雅，清而不淡，浓而不酽，挺拔利索。'
    }
  ];

  const members2 = [
    { userId: 'user_master', roomId: 'room_demo_02', nickname: '品鉴客 Joozo', avatar: '🍶', role: 'member', isSubmitted: true },
    { userId: 'user_chen', roomId: 'room_demo_02', nickname: '老陈喝不倒', avatar: '🥃', role: 'owner', isSubmitted: true },
    { userId: 'user_lin', roomId: 'room_demo_02', nickname: '微醺小林', avatar: '🍷', role: 'member', isSubmitted: true }
  ];

  const guesses2 = [
    { roomId: 'room_demo_02', userId: 'user_master', sampleId: 's_02_1', brand: '山西汾酒', product: '老白汾10', aromaType: '清香型', alcoholDegree: '53°', year: '2022', estimatedPrice: 150 },
    { roomId: 'room_demo_02', userId: 'user_master', sampleId: 's_02_2', brand: '北京红星', product: '红星蓝瓶', aromaType: '清香型', alcoholDegree: '53°', year: '2023', estimatedPrice: 80 },
    { roomId: 'room_demo_02', userId: 'user_master', sampleId: 's_02_3', brand: '陕西西凤酒', product: '西凤绿脖', aromaType: '凤香型', alcoholDegree: '55°', year: '2023', estimatedPrice: 120 },

    { roomId: 'room_demo_02', userId: 'user_chen', sampleId: 's_02_1', brand: '山西汾酒', product: '黄盖玻汾', aromaType: '清香型', alcoholDegree: '53°', year: '2023', estimatedPrice: 60 },
    { roomId: 'room_demo_02', userId: 'user_chen', sampleId: 's_02_2', brand: '北京牛栏山', product: '牛栏山陈酿', aromaType: '清香型', alcoholDegree: '42°', year: '2023', estimatedPrice: 35 },
    { roomId: 'room_demo_02', userId: 'user_chen', sampleId: 's_02_3', brand: '陕西西凤酒', product: '西凤华山论剑', aromaType: '凤香型', alcoholDegree: '52°', year: '2022', estimatedPrice: 180 },

    { roomId: 'room_demo_02', userId: 'user_lin', sampleId: 's_02_1', brand: '宝丰酒', product: '宝丰国色清香', aromaType: '清香型', alcoholDegree: '54°', year: '2022', estimatedPrice: 120 },
    { roomId: 'room_demo_02', userId: 'user_lin', sampleId: 's_02_2', brand: '北京红星', product: '红星二锅头', aromaType: '清香型', alcoholDegree: '53°', year: '2023', estimatedPrice: 60 },
    { roomId: 'room_demo_02', userId: 'user_lin', sampleId: 's_02_3', brand: '陕西西凤酒', product: '高脖西凤', aromaType: '凤香型', alcoholDegree: '55°', year: '2023', estimatedPrice: 100 }
  ];

  const ratings2 = [
    { roomId: 'room_demo_02', userId: 'user_master', sampleId: 's_02_1', aroma: 8.8, entrance: 9.0, richness: 8.6, balance: 8.9, finish: 8.7, overall: 8.8, comment: '清爽甘甜，纯粮好酒！' },
    { roomId: 'room_demo_02', userId: 'user_master', sampleId: 's_02_2', aroma: 8.2, entrance: 8.1, richness: 8.3, balance: 8.2, finish: 8.0, overall: 8.2, comment: '劲头十足，带劲。' },
    { roomId: 'room_demo_02', userId: 'user_master', sampleId: 's_02_3', aroma: 8.6, entrance: 8.5, richness: 8.7, balance: 8.6, finish: 8.6, overall: 8.6, comment: '挺拔有力，很有特点。' },

    { roomId: 'room_demo_02', userId: 'user_chen', sampleId: 's_02_1', aroma: 8.9, entrance: 9.1, richness: 8.7, balance: 9.0, finish: 8.8, overall: 8.9, comment: '口粮真神，喝完不上头。' },
    { roomId: 'room_demo_02', userId: 'user_chen', sampleId: 's_02_2', aroma: 8.3, entrance: 8.2, richness: 8.4, balance: 8.1, finish: 8.2, overall: 8.2, comment: '老北京的味道。' },
    { roomId: 'room_demo_02', userId: 'user_chen', sampleId: 's_02_3', aroma: 8.7, entrance: 8.6, richness: 8.8, balance: 8.7, finish: 8.7, overall: 8.7, comment: '凤香非常独特。' },

    { roomId: 'room_demo_02', userId: 'user_lin', sampleId: 's_02_1', aroma: 8.7, entrance: 8.9, richness: 8.5, balance: 8.8, finish: 8.6, overall: 8.7, comment: '入口很柔甜。' },
    { roomId: 'room_demo_02', userId: 'user_lin', sampleId: 's_02_2', aroma: 8.0, entrance: 7.9, richness: 8.1, balance: 7.8, finish: 7.9, overall: 7.9, comment: '有点烈，略呛。' },
    { roomId: 'room_demo_02', userId: 'user_lin', sampleId: 's_02_3', aroma: 8.5, entrance: 8.4, richness: 8.6, balance: 8.5, finish: 8.5, overall: 8.5, comment: '很清爽。' }
  ];


  // ============================================================
  // 酒局 3：今晚正在进行的盲品局 (进行中状态，方便随时体验作答与开奖)
  // 3款酒：1号剑南春水晶剑(¥460)、2号青花郎20(¥1050)、3号汾酒青花20(¥460)
  // ============================================================
  const room3 = {
    roomId: 'room_demo_03',
    roomCode: '9926',
    name: '经典次高端名优盲测 (进行中)',
    description: '浓、酱、清各选一款次高端代表酒款，正在火热盲测中！',
    ownerId: 'user_master',
    sampleCount: 3,
    maxMembers: 6,
    status: 'playing',
    statusText: '进行中',
    createdAt: now - 3600 * 1000 * 1.5,
    revealAt: null
  };

  const samples3 = [
    {
      sampleId: 's_03_1',
      roomId: 'room_demo_03',
      number: 1,
      bottleTag: '1号酒',
      brand: '四川剑南春',
      product: '水晶剑 (剑南春)',
      aromaType: '浓香型',
      alcoholDegree: '52°',
      year: '2023',
      marketPrice: 460,
      notes: '凛冽甘冽，香气纯正，粮香与陈香谐调。'
    },
    {
      sampleId: 's_03_2',
      roomId: 'room_demo_03',
      number: 2,
      bottleTag: '2号酒',
      brand: '四川郎酒',
      product: '青花郎 (二十)',
      aromaType: '酱香型',
      alcoholDegree: '53°',
      year: '2022',
      marketPrice: 1050,
      notes: '赤水河左岸庄园酱酒，酸甜适口，幽雅爆香。'
    },
    {
      sampleId: 's_03_3',
      roomId: 'room_demo_03',
      number: 3,
      bottleTag: '3号酒',
      brand: '山西汾酒',
      product: '青花汾酒20',
      aromaType: '清香型',
      alcoholDegree: '53°',
      year: '2023',
      marketPrice: 460,
      notes: '青花骨肉，清香典雅，回甘绵长清冽。'
    }
  ];

  const members3 = [
    { userId: 'user_master', roomId: 'room_demo_03', nickname: '品鉴客 Joozo', avatar: '🍶', role: 'owner', isSubmitted: false },
    { userId: 'user_chen', roomId: 'room_demo_03', nickname: '老陈喝不倒', avatar: '🥃', role: 'member', isSubmitted: true },
    { userId: 'user_lin', roomId: 'room_demo_03', nickname: '微醺小林', avatar: '🍷', role: 'member', isSubmitted: false }
  ];

  const guesses3 = [
    // 老陈已交卷
    { roomId: 'room_demo_03', userId: 'user_chen', sampleId: 's_03_1', brand: '四川剑南春', product: '水晶剑', aromaType: '浓香型', alcoholDegree: '52°', year: '2022', estimatedPrice: 480 },
    { roomId: 'room_demo_03', userId: 'user_chen', sampleId: 's_03_2', brand: '四川郎酒', product: '青花郎', aromaType: '酱香型', alcoholDegree: '53°', year: '2022', estimatedPrice: 1000 },
    { roomId: 'room_demo_03', userId: 'user_chen', sampleId: 's_03_3', brand: '山西汾酒', product: '青花20', aromaType: '清香型', alcoholDegree: '53°', year: '2023', estimatedPrice: 450 }
  ];

  const ratings3 = [
    { roomId: 'room_demo_03', userId: 'user_chen', sampleId: 's_03_1', aroma: 8.9, entrance: 8.8, richness: 8.9, balance: 8.8, finish: 8.8, overall: 8.8, comment: '剑南春独特的凛冽感！' },
    { roomId: 'room_demo_03', userId: 'user_chen', sampleId: 's_03_2', aroma: 9.3, entrance: 9.2, richness: 9.4, balance: 9.2, finish: 9.3, overall: 9.3, comment: '郎酒爆香很抓人。' },
    { roomId: 'room_demo_03', userId: 'user_chen', sampleId: 's_03_3', aroma: 9.0, entrance: 9.1, richness: 8.8, balance: 9.0, finish: 8.9, overall: 9.0, comment: '清香纯正典雅。' }
  ];

  const allRooms = [room3, room1, room2];
  const allSamples = [...samples1, ...samples2, ...samples3];
  const allMembers = [...members1, ...members2, ...members3];
  const allGuesses = [...guesses1, ...guesses2, ...guesses3];
  const allRatings = [...ratings1, ...ratings2, ...ratings3];

  wx.setStorageSync(STORAGE_KEYS.ROOMS, allRooms);
  wx.setStorageSync(STORAGE_KEYS.SAMPLES, allSamples);
  wx.setStorageSync(STORAGE_KEYS.MEMBERS, allMembers);
  wx.setStorageSync(STORAGE_KEYS.GUESSES, allGuesses);
  wx.setStorageSync(STORAGE_KEYS.RATINGS, allRatings);
  console.log('【盲酌】三组高质感真实测试酒局数据已加载完毕！');
}

module.exports = {
  AROMA_TYPES,
  DEGREE_OPTIONS,
  PRICE_RANGES,
  initInitialData,
  seedRichMockData,

  getCurrentUser() {
    return wx.getStorageSync(STORAGE_KEYS.CURRENT_USER) || DEFAULT_USER;
  },

  setCurrentUser(user) {
    wx.setStorageSync(STORAGE_KEYS.CURRENT_USER, user);
  },

  getRooms() {
    return wx.getStorageSync(STORAGE_KEYS.ROOMS) || [];
  },

  getRoomById(roomId) {
    const rooms = this.getRooms();
    return rooms.find(r => r.roomId === roomId) || null;
  },

  getRoomByCode(code) {
    const rooms = this.getRooms();
    return rooms.find(r => r.roomCode === String(code).trim()) || null;
  },

  saveRoom(room) {
    const rooms = this.getRooms();
    const idx = rooms.findIndex(r => r.roomId === room.roomId);
    if (idx >= 0) {
      rooms[idx] = { ...rooms[idx], ...room };
    } else {
      rooms.unshift(room);
    }
    wx.setStorageSync(STORAGE_KEYS.ROOMS, rooms);
    return room;
  },

  getSamples(roomId) {
    const all = wx.getStorageSync(STORAGE_KEYS.SAMPLES) || [];
    if (!roomId) return all;
    return all.filter(s => s.roomId === roomId).sort((a, b) => a.number - b.number);
  },

  saveSamples(roomId, sampleList) {
    let all = wx.getStorageSync(STORAGE_KEYS.SAMPLES) || [];
    all = all.filter(s => s.roomId !== roomId);
    all = all.concat(sampleList);
    wx.setStorageSync(STORAGE_KEYS.SAMPLES, all);
  },

  getMembers(roomId) {
    const all = wx.getStorageSync(STORAGE_KEYS.MEMBERS) || [];
    if (!roomId) return all;
    return all.filter(m => m.roomId === roomId);
  },

  addMember(roomId, user, role = 'member') {
    let all = wx.getStorageSync(STORAGE_KEYS.MEMBERS) || [];
    const exists = all.find(m => m.roomId === roomId && m.userId === user.userId);
    if (!exists) {
      all.push({
        roomId,
        userId: user.userId,
        nickname: user.nickname,
        avatar: user.avatar || '🍶',
        role,
        isSubmitted: false,
        joinedAt: Date.now()
      });
      wx.setStorageSync(STORAGE_KEYS.MEMBERS, all);
    }
  },

  markMemberSubmitted(roomId, userId) {
    let all = wx.getStorageSync(STORAGE_KEYS.MEMBERS) || [];
    const target = all.find(m => m.roomId === roomId && m.userId === userId);
    if (target) {
      target.isSubmitted = true;
      wx.setStorageSync(STORAGE_KEYS.MEMBERS, all);
    }
  },

  // 资料保存后同步本人所有已参与酒局的成员名片（仅 nickname/avatar，userId 稳定不变）
  updateMemberProfile(userId, profile) {
    let all = wx.getStorageSync(STORAGE_KEYS.MEMBERS) || [];
    let changed = false;
    all = all.map(m => {
      if (m.userId === userId) {
        changed = true;
        return { ...m, nickname: profile.nickname, avatar: profile.avatar };
      }
      return m;
    });
    if (changed) wx.setStorageSync(STORAGE_KEYS.MEMBERS, all);
  },

  getGuesses(roomId, userId) {
    const all = wx.getStorageSync(STORAGE_KEYS.GUESSES) || [];
    return all.filter(g => {
      const matchRoom = roomId ? g.roomId === roomId : true;
      const matchUser = userId ? g.userId === userId : true;
      return matchRoom && matchUser;
    });
  },

  saveUserGuess(guess) {
    let all = wx.getStorageSync(STORAGE_KEYS.GUESSES) || [];
    const idx = all.findIndex(g => g.roomId === guess.roomId && g.userId === guess.userId && g.sampleId === guess.sampleId);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...guess, submittedAt: Date.now() };
    } else {
      all.push({ ...guess, submittedAt: Date.now() });
    }
    wx.setStorageSync(STORAGE_KEYS.GUESSES, all);
  },

  getRatings(roomId, userId) {
    const all = wx.getStorageSync(STORAGE_KEYS.RATINGS) || [];
    return all.filter(r => {
      const matchRoom = roomId ? r.roomId === roomId : true;
      const matchUser = userId ? r.userId === userId : true;
      return matchRoom && matchUser;
    });
  },

  saveUserRating(rating) {
    let all = wx.getStorageSync(STORAGE_KEYS.RATINGS) || [];
    const idx = all.findIndex(r => r.roomId === rating.roomId && r.userId === rating.userId && r.sampleId === rating.sampleId);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...rating, submittedAt: Date.now() };
    } else {
      all.push({ ...rating, submittedAt: Date.now() });
    }
    wx.setStorageSync(STORAGE_KEYS.RATINGS, all);
  }
};
