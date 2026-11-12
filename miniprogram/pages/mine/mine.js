const storage = require('../../services/storage');
const journal = require('../../services/journal');
const journalContext = require('../../services/journalContext');
const identity = require('../../services/identity');
const memberLevel = require('../../services/memberLevel');

function withDatePresentation(note) {
  const dateLabel = typeof note.date === 'string' ? note.date : '';
  const displayed = { ...note, dateMonthDay: '未记日期', dateYear: '', dateLabel };
  const match = /^(\d{4})([./-])(\d{2})\2(\d{2})$/.exec(dateLabel);
  if (!match || match[0] !== dateLabel) return displayed;

  const year = Number(match[1]);
  const month = Number(match[3]);
  const day = Number(match[4]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) return displayed;

  displayed.dateMonthDay = match[3] + '.' + match[4];
  displayed.dateYear = match[1];
  return displayed;
}

function resolveDisplayNickname(user, isWechat) {
  if (!user) return isWechat ? '设置昵称' : '知味';
  const raw = typeof user.nickname === 'string' ? user.nickname.trim() : '';
  const welinkNick = typeof user.welinkNickname === 'string' ? user.welinkNickname.trim() : '';
  if (raw && raw !== '微信昵称') return raw;
  if (welinkNick && welinkNick !== '微信昵称') return welinkNick;
  return isWechat ? '设置昵称' : '知味';
}

Page({
  data: {
    user: null,
    displayNickname: '知味',
    avatarImg: false,
    avatarLoadError: false,
    isWechat: false,
    profileCompleted: false,
    registering: false,
    showProfileModal: false,
    modalFocusField: '',
    modalNickname: '',
    modalPendingAvatar: '',
    modalPendingImg: false,
    modalAvatarLoadError: false,
    modalSaving: false,
    memberLevel: null,
    notes: [],
    count: 0,
    roomCount: 0
  },

  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setData({ selected: 3 });

    const user = storage.getCurrentUser();
    const notes = journal.all().map(note => journalContext.presentNote(withDatePresentation(note)));
    const roomIds = new Set(storage.getMembers()
      .filter(member => member.userId === user.userId)
      .map(member => member.roomId));
    const isWechat = identity.isLoggedIn();
    const levelInfo = (memberLevel.getUserMemberLevel && user && user.userId)
      ? memberLevel.getUserMemberLevel(user.userId)
      : (memberLevel.calculateMemberLevel ? memberLevel.calculateMemberLevel({ roomCount: roomIds.size, totalScore: 0 }) : null);

    this.setData({
      user,
      displayNickname: resolveDisplayNickname(user, isWechat),
      avatarImg: identity.isAvatarImage(user.avatar),
      avatarLoadError: false,
      isWechat,
      profileCompleted: identity.hasCompletedProfile(user),
      memberLevel: levelInfo,
      notes,
      count: notes.length,
      roomCount: roomIds.size
    });
  },

  onAvatarError() {
    this.setData({ avatarLoadError: true });
  },

  onModalAvatarError() {
    this.setData({ modalAvatarLoadError: true });
  },

  editProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' });
  },

  openProfileModal(e) {
    const field = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.field) || 'all';
    const user = this.data.user || storage.getCurrentUser() || {};
    const currentNick = resolveDisplayNickname(user, this.data.isWechat);
    this.setData({
      showProfileModal: true,
      modalFocusField: field,
      modalNickname: currentNick === '设置昵称' || currentNick === '知味' ? '' : currentNick,
      modalPendingAvatar: '',
      modalPendingImg: false,
      modalAvatarLoadError: false
    });
  },

  openAvatarModal() {
    this.openProfileModal({ currentTarget: { dataset: { field: 'avatar' } } });
  },

  openNicknameModal() {
    this.openProfileModal({ currentTarget: { dataset: { field: 'nickname' } } });
  },

  openMemberLevels() {
    wx.navigateTo({ url: '/pages/member-level/member-level' });
  },

  closeProfileModal() {
    if (this.data.modalSaving) return;
    this.setData({
      showProfileModal: false,
      modalFocusField: '',
      modalPendingAvatar: '',
      modalPendingImg: false
    });
  },

  noop() {},

  onModalNicknameInput(e) {
    this.setData({ modalNickname: (e && e.detail && e.detail.value) || '' });
  },

  onModalChooseAvatar() {
    if (!wx.chooseImage) {
      wx.showToast({ title: '当前环境暂不支持选择头像', icon: 'none' });
      return;
    }
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        const temp = res && res.tempFilePaths && res.tempFilePaths[0];
        if (temp) {
          this.setData({
            modalPendingAvatar: temp,
            modalPendingImg: true,
            modalAvatarLoadError: false
          });
        }
      },
      fail: (err) => {
        const message = (err && err.errMsg) || '';
        if (message.indexOf('cancel') !== -1) return;
        wx.showToast({ title: '未能选择头像，请重试', icon: 'none' });
      }
    });
  },

  async saveProfileModal() {
    if (this.data.modalSaving) return;
    const nickname = String(this.data.modalNickname || '').trim();
    if (!nickname) {
      wx.showToast({ title: '请填写品鉴昵称', icon: 'none' });
      return;
    }
    this.setData({ modalSaving: true });
    try {
      const res = await identity.saveProfile({
        nickname,
        avatarTempPath: this.data.modalPendingAvatar
      });
      if (!res || !res.ok) {
        wx.showToast({ title: '头像未能保存，请重试', icon: 'none' });
        return;
      }
      this.setData({
        showProfileModal: false,
        modalFocusField: '',
        modalPendingAvatar: '',
        modalPendingImg: false
      });
      this.onShow();
      wx.showToast({ title: '资料已更新', icon: 'success' });
    } catch (e) {
      wx.showToast({ title: (e && e.message) || '保存失败，请重试', icon: 'none' });
    } finally {
      this.setData({ modalSaving: false });
    }
  },

  async register() {
    if (this.data.isWechat || this.data.registering) return;
    this.setData({ registering: true });
    try {
      wx.showLoading({ title: '正在注册登录…', mask: true });
      const res = await identity.loginWithWeChat();
      if (res.ok) {
        this.onShow();
        wx.showToast({ title: '注册登录成功', icon: 'success' });
      } else {
        wx.navigateTo({ url: '/pages/profile/profile' });
      }
    } catch (e) {
      wx.navigateTo({ url: '/pages/profile/profile' });
    } finally {
      this.setData({ registering: false });
      wx.hideLoading();
    }
  },

  openNote(e) {
    wx.navigateTo({ url: '/pages/card/card?id=' + e.currentTarget.dataset.id });
  },

  checkin() {
    wx.navigateTo({ url: '/pages/checkin/checkin' });
  },

  rooms() {
    wx.switchTab({ url: '/pages/gather/gather' });
  },

  goAbout() {
    wx.navigateTo({ url: '/pages/about/about' });
  },

  logout() {
    wx.showModal({
      title: '退出微信登录',
      content: '退出后在线品鉴将不可用，本机手记与酒卡不受影响。',
      confirmText: '退出登录',
      confirmColor: '#274d3b',
      success: async (r) => {
        if (!r.confirm) return;
        wx.showLoading({ title: '正在退出', mask: true });
        try {
          await identity.logoutWithWeChat();
        } catch (e) {
        } finally {
          wx.hideLoading();
          this.onShow();
          wx.showToast({ title: '已退出登录', icon: 'none' });
        }
      }
    });
  },

  onShareAppMessage() {
    return {
      title: '盲酌 · 去掉酒标，只凭味道',
      path: '/pages/index/index',
      imageUrl: '/assets/brand/libai-home.png'
    };
  }
});
