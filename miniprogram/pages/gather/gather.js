const storageService = require("../../services/storage");
const welinkClient = require("../../services/welinkClient");
const identity = require("../../services/identity");

const ROOM_FILTERS = ['all', 'playing', 'finished', 'revealed'];
const ROOM_PRESENTATION = {
  playing: { statusLabel: '进行中', statusClass: 'is-playing', actionLabel: '进入酒局' },
  finished: { statusLabel: '品评结束', statusClass: 'is-finished', actionLabel: '查看酒局' },
  revealed: { statusLabel: '已揭晓', statusClass: 'is-revealed', actionLabel: '查看结果' }
};

function formatRoomDisplayName(room) {
  const name = typeof room.name === 'string' ? room.name : '';
  const withoutStatus = name.replace(/\s*(?:\((?:进行中|已揭晓|品评结束)\)|（(?:进行中|已揭晓|品评结束)）)$/, '');
  const displayName = withoutStatus.trim() ? withoutStatus : name;
  const genericName = /^盲酌酒局\s+(\S+)$/.exec(displayName);
  if (room.roomCode != null && genericName && genericName[1] === String(room.roomCode)) return '盲酌酒局';
  return displayName;
}

// 后端 createTime 可能是时间戳或 ISO 字符串，统一格式化为本地可读时间
function pad(n) { return n < 10 ? '0' + n : String(n); }
function formatTime(value) {
  if (!value) return '';
  let d;
  if (typeof value === 'number') {
    d = new Date(value > 1e12 ? value : value * 1000);
  } else {
    d = new Date(value);
  }
  if (isNaN(d.getTime())) return '';
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

Page({
  data: {
    currentTab: 'local', // 'local' | 'online'
    rooms: [],
    roomFilter: 'all',
    filteredRooms: [],
    roomCounts: { all: 0, playing: 0, finished: 0, revealed: 0 },
    // 在线品鉴状态
    isLoggedIn: false,
    onlineList: [],
    onlineListCount: 0,
    onlineCount: 0,
    onlinePage: 1,
    onlineLimit: 15,
    onlineLoading: false,
    onlineError: '',
    hasMoreOnline: false,
    inputOnlineId: ''
  },
  onLoad() {
    this.loadRooms();
  },
  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setData({ selected: 1 });
    this.loadRooms();
    const loggedIn = identity.isLoggedIn();
    const owner = loggedIn ? identity.getActiveOpenid() : '';
    if (owner !== this._onlineOwner || !loggedIn) this.clearOnline();
    this._onlineOwner = owner;
    this.setData({ isLoggedIn: loggedIn });
    if (this.data.currentTab === 'online') {
      if (loggedIn) {
        this.loadOnlineTastes(1);
      }
    }
  },
  onPullDownRefresh() {
    if (this.data.currentTab === 'online') {
      if (this.data.isLoggedIn) {
        this.loadOnlineTastes(1).finally(() => {
          wx.stopPullDownRefresh();
        });
      } else {
        wx.stopPullDownRefresh();
      }
    } else {
      this.loadRooms();
      wx.stopPullDownRefresh();
    }
  },
  onReachBottom() {
    if (this.data.currentTab === 'online' && this.data.hasMoreOnline && !this.data.onlineLoading) {
      this.loadOnlineTastes(this.data.onlinePage + 1);
    }
  },
  switchTabMode(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.currentTab) return;
    this.setData({ currentTab: tab });
    if (tab === 'online') {
      const loggedIn = identity.isLoggedIn();
      const owner = loggedIn ? identity.getActiveOpenid() : '';
      if (owner !== this._onlineOwner || !loggedIn) this.clearOnline();
      this._onlineOwner = owner;
      this.setData({ isLoggedIn: loggedIn });
      if (loggedIn && this.data.onlineList.length === 0) {
        this.loadOnlineTastes(1);
      }
    }
  },
  loadRooms() {
    const roomCounts = { all: 0, playing: 0, finished: 0, revealed: 0 };
    const rooms = storageService.getRooms().map(room => {
      const knownStatus = ROOM_FILTERS.indexOf(room.status) > 0;
      if (knownStatus) roomCounts[room.status] += 1;
      const presentation = knownStatus
        ? ROOM_PRESENTATION[room.status]
        : { statusLabel: '待确认', statusClass: 'is-unknown', actionLabel: '查看酒局' };
      return {
        ...room,
        memberCount: storageService.getMembers(room.roomId).length,
        displayName: formatRoomDisplayName(room),
        ...presentation
      };
    });
    roomCounts.all = rooms.length;
    this.setData({
      rooms,
      roomCounts,
      filteredRooms: this.data.roomFilter === 'all' ? rooms : rooms.filter(room => room.status === this.data.roomFilter)
    });
  },
  selectRoomFilter(e) {
    const roomFilter = e.currentTarget.dataset.filter;
    if (ROOM_FILTERS.indexOf(roomFilter) < 0) return;
    this.setData({
      roomFilter,
      filteredRooms: roomFilter === 'all' ? this.data.rooms : this.data.rooms.filter(room => room.status === roomFilter)
    });
  },
  goToCreate() { wx.navigateTo({ url: "/packages/blind/pages/create/create" }); },
  goToJoin() { wx.navigateTo({ url: "/packages/blind/pages/join/join" }); },
  goToMine() { wx.switchTab({ url: "/pages/mine/mine" }); },
  openDemoRoom() { wx.navigateTo({ url: "/packages/blind/pages/reveal/reveal?roomId=room_demo_01" }); },
  onTapRoom(e) {
    const roomId = e.currentTarget.dataset.roomId;
    const room = storageService.getRoomById(roomId);
    if (!room) return;
    if (room.status === "revealed") {
      wx.navigateTo({ url: "/packages/blind/pages/reveal/reveal?roomId=" + roomId });
    } else {
      wx.navigateTo({ url: "/packages/blind/pages/room/room?roomId=" + roomId });
    }
  },

  // 在线品鉴方法
  goToProfileLogin() {
    wx.navigateTo({ url: "/pages/profile/profile" });
  },
  goToOnlineCreate() {
    if (!this.data.isLoggedIn) {
      this.goToProfileLogin();
      return;
    }
    wx.navigateTo({ url: "/packages/online/pages/create/create" });
  },
  onInputOnlineId(e) {
    this.setData({ inputOnlineId: e.detail.value });
  },
  onJoinOnlineById() {
    const id = this.data.inputOnlineId.trim();
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
      wx.showToast({ title: "请输入有效的活动编号", icon: "none" });
      return;
    }
    wx.navigateTo({ url: "/packages/online/pages/detail/detail?id=" + Number(id) });
  },
  clearOnline() {
    this._onlineRequest = (this._onlineRequest || 0) + 1;
    this.setData({onlineList: [], onlineListCount: 0, onlineCount: 0, onlinePage: 1, hasMoreOnline: false, onlineLoading: false, onlineError: ''});
  },
  onUnload() { this._onlineRequest = (this._onlineRequest || 0) + 1; },
  async loadOnlineTastes(page = 1) {
    if (!identity.isLoggedIn()) {
      this.clearOnline();
      this.setData({isLoggedIn: false});
      return;
    }
    // bindtap 传入的是事件对象，重试始终从第一页开始。
    if (!Number.isInteger(page) || page < 1) page = 1;
    const owner = identity.getActiveOpenid();
    if (owner !== this._onlineOwner) { this.clearOnline(); this._onlineOwner = owner; }
    if (this.data.onlineLoading) return;
    const seq = this._onlineRequest = (this._onlineRequest || 0) + 1;
    this.setData({ onlineLoading: true, onlineError: '' });
    try {
      const res = await welinkClient.getTasteList(page, this.data.onlineLimit);
      if (seq !== this._onlineRequest) return;
      if (!identity.isLoggedIn() || owner !== identity.getActiveOpenid()) { this.clearOnline(); this.setData({isLoggedIn: identity.isLoggedIn()}); return; }
      if (!res || !Array.isArray(res.list) || !Number.isInteger(res.count) || res.count < 0) throw new Error('在线品鉴列表格式无效');
      const rows = (res.list || []).map(item => Object.assign({}, item, { createdAtText: formatTime(item.createdAt) }));
      const list = page === 1 ? rows : [...this.data.onlineList, ...rows];
      const count = res.count || 0;
      const hasMore = list.length < count;
      this.setData({
        onlineList: list,
        onlineListCount: list.length,
        onlineCount: count,
        onlinePage: page,
        hasMoreOnline: hasMore,
        onlineLoading: false
      });
    } catch (err) {
      if (seq !== this._onlineRequest) return;
      if (err.statusCode === 401 || !identity.isLoggedIn()) {
        this.clearOnline(); this.setData({isLoggedIn: false}); return;
      }
      this.setData({
        onlineLoading: false,
        onlineError: err.message || '获取在线品鉴列表失败'
      });
    }
  },
  onTapOnlineItem(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: "/packages/online/pages/detail/detail?id=" + id });
  }
});
