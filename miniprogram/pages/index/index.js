const journal = require('../../services/journal');
const PRIVACY_KEY = 'mz_privacy_ack_v1';

Page({
  data: { notes: [] },
  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setData({ selected: 0 });
    this.refresh();
  },
  onLoad() {
    // 首次启动：展示隐私与理性饮酒提示，同意后不再打扰
    if (!wx.getStorageSync(PRIVACY_KEY)) {
      wx.showModal({
        title: '温馨提示',
        content: '盲酌面向达到法定饮酒年龄的用户：理性饮酒，未成年人请勿饮酒。手记与桌上品鉴记录保存在本机；使用在线品鉴时，活动与评分会保存到品鉴后台。详见「关于盲酌 · 隐私与协议」。',
        confirmText: '知道了',
        cancelText: '查看详情',
        success: (r) => {
          wx.setStorageSync(PRIVACY_KEY, true);
          if (r.cancel) wx.navigateTo({ url: '/pages/about/about' });
        }
      });
    }
  },
  refresh() { this.setData({ notes: journal.all().slice(0, 3) }); },
  onPullDownRefresh() { this.refresh(); wx.stopPullDownRefresh(); },
  checkin() { wx.navigateTo({ url: '/pages/checkin/checkin' }); },
  shareLatest() {
    const note = journal.all()[0];
    if (note) wx.navigateTo({ url: '/pages/card/card?id=' + note.id });
    else wx.showToast({ title: '先记录一杯，再生成酒卡', icon: 'none' });
  },
  openNote(e) { wx.navigateTo({ url: '/pages/card/card?id=' + e.currentTarget.dataset.id }); },
  mine() { wx.switchTab({ url: '/pages/mine/mine' }); },
  onShareAppMessage() {
    return { title: '盲酌 · 去掉酒标，只凭味道', path: '/pages/index/index', imageUrl: '/assets/brand/libai-home.png' };
  },
  onShareTimeline() {
    return { title: '盲酌 · 白酒品鉴手记', query: '' };
  }
});
