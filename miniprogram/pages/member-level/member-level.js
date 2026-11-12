const storage = require('../../services/storage');
const memberLevel = require('../../services/memberLevel');

const ORDINALS = ['壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
const CHAPTERS = [
  { title: '初识', subtitle: '一至三阶 · 循香而来', prelude: '由一缕香气，走进风味的山水。' },
  { title: '入境', subtitle: '四至六阶 · 杯中见真', prelude: '从辨认风味，到读懂它的来处。' },
  { title: '归真', subtitle: '七至九阶 · 知味忘言', prelude: '阅历渐丰，仍为一味清欢驻足。' }
];
const STORIES = [
  '循一线清泉叩问风味，以好奇与真诚写下初页。',
  '沿竹径轻寻香气踪影，让每一份感受各有归处。',
  '在浓淡甘辛之间驻笔，把细微感受留作来日参照。',
  '借一笺风味安放心绪，于从容记录中细看层次。',
  '暂将浮名置于竹外，以如实记录珍重当下所感。',
  '循香气来处缓缓寻迹，让猜想与答案在纸上相逢。',
  '将沿途风味汇成手札，知味亦知未尽之处，常怀谦心。',
  '壶中自有闲云天地，愿在风味之外留一分从容。',
  '借太白一襟清风诗意，历览风味，仍守初来真心。'
];
const RULES = [
  { title: '参局为行，知味为证', body: '参局次数与累计盲猜积分须同时达到门槛，自动评定为已满足的最高品阶。仅有场次或积分达标，仍需补足另一项。' },
  { title: '一局一记，点滴累积', body: '按已加入的酒局去重统计场次。同一酒局只计一次；各局各款酒的盲猜得分相加，未作答的酒样不加分。' },
  { title: '单样百分，各有所据', body: '每款酒盲猜满分 100 分：品牌与产品各 25 分，香型与度数各 10 分，年份与估价各 15 分。对照酒样录入的答案计分。' },
  { title: '喜好由心，自有分寸', body: '喜欢程度记录个人偏好，口感评分记录主观感受，两者都不计入晋升积分。品阶可以不同，喜欢始终由你。' },
  { title: '以本机手札为据', body: '当前依据本机保存的桌上酒局与盲猜记录评定，在线品鉴尚未计入。更换设备或清理本机记录，展示结果也可能随之改变。' }
];

function formatNumber(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function presentLevel(level, currentLevel) {
  return Object.assign({}, level, {
    titleKey: 'level-' + level.level,
    titleSvg: '/assets/member-level/calligraphy/level-' + level.level + '.svg',
    ordinal: ORDINALS[level.level - 1],
    story: STORIES[level.level - 1],
    roomsLabel: formatNumber(level.minRooms),
    scoreLabel: formatNumber(level.minScore),
    state: level.level === currentLevel ? 'current' : (level.level < currentLevel ? 'reached' : 'future'),
    stateLabel: level.level === currentLevel ? '当前品阶' : (level.level < currentLevel ? '已达成' : '待解锁')
  });
}

Page({
  data: {
    membership: null,
    levels: [],
    chapters: [],
    rules: RULES,
    viewMode: 'story',
    calligraphyErrors: {},
    roomCountLabel: '0',
    scoreLabel: '0',
    roomProgress: 0,
    scoreProgress: 0
  },

  onShow() {
    const user = storage.getCurrentUser();
    const info = memberLevel.getUserMemberLevel(user.userId);
    const levels = memberLevel.LEVELS.map(level => presentLevel(level, info.current.level));
    const next = info.next;
    this.setData({
      membership: info,
      levels,
      current: levels[info.current.level - 1],
      next: next ? levels[next.level - 1] : null,
      chapters: CHAPTERS.map((chapter, index) => Object.assign({}, chapter, {
        titleKey: 'chapter-' + (index + 1),
        titleSvg: '/assets/member-level/calligraphy/chapter-' + (index + 1) + '.svg',
        volume: ['上卷', '中卷', '下卷'][index],
        levels: levels.slice(index * 3, index * 3 + 3)
      })),
      roomCountLabel: formatNumber(info.stats.roomCount),
      scoreLabel: formatNumber(info.stats.totalScore),
      needRoomsLabel: formatNumber(info.needRooms),
      needScoreLabel: formatNumber(info.needScore),
      roomProgress: next ? Math.min(info.needRooms > 0 ? 99 : 100, Math.round(info.stats.roomCount / next.minRooms * 100)) : 100,
      scoreProgress: next ? Math.min(info.needScore > 0 ? 99 : 100, Math.round(info.stats.totalScore / next.minScore * 100)) : 100
    });
  },

  onCalligraphyError(e) {
    const key = e && e.currentTarget && e.currentTarget.dataset.calligraphy;
    if (!/^(heading|chapter-[1-3]|level-[1-9])$/.test(key || '')) return;
    this.setData({ calligraphyErrors: Object.assign({}, this.data.calligraphyErrors, { [key]: true }) });
  },

  scrollToSection(e) {
    const section = e && e.currentTarget && e.currentTarget.dataset.section;
    if (['journey', 'levels', 'rules'].indexOf(section) !== -1) this.scrollToId(section);
  },

  scrollToId(id) {
    wx.pageScrollTo({ selector: '#' + id, offsetTop: -64, duration: 280 });
  },

  switchView(e) {
    const mode = e && e.currentTarget && e.currentTarget.dataset.mode;
    if (['story', 'overview'].indexOf(mode) === -1 || mode === this.data.viewMode) return;
    this.setData({ viewMode: mode }, () => this.scrollToId('levels'));
  },

  locateCurrent() {
    if (!this.data.current) return;
    this.setData({ viewMode: 'story' }, () => this.scrollToId('level-' + this.data.current.level));
  },

  goMine() {
    wx.switchTab({ url: '/pages/mine/mine' });
  },

  onShareAppMessage() {
    return {
      title: '盲酌 · 知味九阶，一阶一风景',
      path: '/pages/member-level/member-level',
      imageUrl: '/assets/brand/libai-mine.png'
    };
  }
});
