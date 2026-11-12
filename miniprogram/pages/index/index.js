const journal = require('../../services/journal');
const storage = require('../../services/storage');
const journalContext = require('../../services/journalContext');
const homeProgress = require('../../services/homeProgress');
const knowledgeNav = require('../../utils/knowledgeNavigation');
const knowledge = require('../../utils/liquorKnowledge');
const PRIVACY_KEY = 'mz_privacy_ack_v1';

function withDatePresentation(note) {
  const dateLabel = typeof note.date === 'string' ? note.date : '';
  const displayed = { ...note, dateMonthDay: '未记日期', dateYear: '', dateLabel };
  const match = /^(\d{4})([./-])(\d{2})\2(\d{2})$/.exec(dateLabel);
  if (!match || match[0] !== dateLabel) return displayed;
  const year = Number(match[1]), month = Number(match[3]), day = Number(match[4]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) return displayed;
  displayed.dateMonthDay = match[3] + '.' + match[4];
  displayed.dateYear = match[1];
  return displayed;
}

function formatNumber(value) { return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

function presentMembership(info) {
  if (!info || !info.current) return null;
  const needs = [];
  if (info.needRooms > 0) needs.push(info.needRooms + ' 场');
  if (info.needScore > 0) needs.push(formatNumber(info.needScore) + ' 分');
  return {
    rank: info.current.rank,
    title: info.current.title,
    titleSvg: '/assets/member-level/calligraphy/level-' + info.current.level + '.svg',
    roomCount: info.stats.roomCount,
    scoreLabel: formatNumber(info.stats.totalScore),
    progressPercent: info.progressPercent,
    nextText: info.next ? '距「' + info.next.title + '」' + (needs.length ? '还差 ' + needs.join(' · ') : '仅一步之遥') : '九阶已至 · 知味无涯'
  };
}

Page({
  data: { notes: [], active: null, latestResult: null, levelCard: null, knowledge: null },
  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setData({ selected: 0 });
    this.refresh();
  },
  onLoad() {
    if (!wx.getStorageSync(PRIVACY_KEY)) {
      wx.showModal({
        title: '温馨提示',
        content: '盲酌面向达到法定饮酒年龄的用户：理性饮酒，未成年人请勿饮酒。手记与桌上品鉴记录保存在本机；使用在线品鉴时，活动与评分会保存到品鉴后台。详见「关于盲酌 · 隐私与协议」。',
        confirmText: '知道了', cancelText: '查看详情',
        success: r => { wx.setStorageSync(PRIVACY_KEY, true); if (r.cancel) wx.navigateTo({ url: '/pages/about/about' }); }
      });
    }
  },
  refresh() {
    const user = storage.getCurrentUser();
    const overview = homeProgress.getHomeOverview(user.userId);
    this.setData({
      active: overview.active,
      latestResult: overview.latestResult,
      levelCard: presentMembership(overview.membership),
      notes: journal.all().slice(0, 2).map(note => journalContext.presentNote(withDatePresentation(note))),
      knowledge: knowledge.articles[0] || null
    });
  },
  onPullDownRefresh() { this.refresh(); wx.stopPullDownRefresh(); },
  checkin() { wx.navigateTo({ url: '/pages/checkin/checkin' }); },
  goToCreate() { wx.navigateTo({ url: '/packages/blind/pages/create/create' }); },
  goToJoin() { wx.navigateTo({ url: '/packages/blind/pages/join/join' }); },
  openDemoRoom() { wx.navigateTo({ url: '/packages/blind/pages/reveal/reveal?roomId=room_demo_01' }); },
  goToGather() { wx.switchTab({ url: '/pages/gather/gather' }); },
  openActive() {
    const active = this.data.active;
    if (!active) return;
    if (active.kind === 'multiple') this.goToGather();
    else if (active.room && active.room.url) wx.navigateTo({ url: active.room.url });
  },
  openLatestResult() {
    if (this.data.latestResult) wx.navigateTo({ url: this.data.latestResult.url });
  },
  openMemberLevels() { wx.navigateTo({ url: '/pages/member-level/member-level' }); },
  openNote(e) { wx.navigateTo({ url: '/pages/card/card?id=' + e.currentTarget.dataset.id }); },
  mine() { wx.switchTab({ url: '/pages/mine/mine' }); },
  readKnowledge() { if (this.data.knowledge) knowledgeNav.open('article', this.data.knowledge.id); },
  onShareAppMessage() { return { title: '盲酌 · 去掉酒标，只凭味道', path: '/pages/index/index', imageUrl: '/assets/brand/libai-home.png' }; },
  onShareTimeline() { return { title: '盲酌 · 白酒品鉴手记', query: '' }; }
});
