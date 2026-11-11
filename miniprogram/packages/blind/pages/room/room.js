const storageService = require("../../../../services/storage");
const identity = require("../../../../services/identity");
Page({
  data: {
    roomId: "", room: null, samples: [], members: [], myStatusMap: {}, mySubmittedCount: 0, isAllSubmitted: false
  },
  onLoad(options) {
    this.setData({ roomId: options.roomId || "room_demo_01" });
  },
  onShow() { this.refreshRoom(); },
  onPullDownRefresh() { this.refreshRoom(); wx.stopPullDownRefresh(); },
  onShareAppMessage() {
    const { room } = this.data;
    return {
      title: "【盲酌】邀请你加入盲品局：" + (room ? room.name : "白酒盲测"),
      path: "/packages/blind/pages/join/join?roomCode=" + (room ? room.roomCode : "")
    };
  },
  copyRoomCode() {
    if (!this.data.room) return;
    wx.setClipboardData({
      data: this.data.room.roomCode,
      success: () => {
        wx.showToast({ title: "房间码已复制", icon: "success" });
      }
    });
  },
  refreshRoom() {
    const { roomId } = this.data;
    const room = storageService.getRoomById(roomId);
    const samples = storageService.getSamples(roomId);
    const members = storageService.getMembers(roomId).map(identity.withAvatarFlag);
    const user = storageService.getCurrentUser();
    const guesses = storageService.getGuesses(roomId, user.userId);
    const myStatusMap = {};
    let mySubmittedCount = 0;
    samples.forEach(s => {
      const g = guesses.find(item => item.sampleId === s.sampleId);
      if (g) { myStatusMap[s.sampleId] = true; mySubmittedCount++; }
    });
    const isAllSubmitted = members.length > 0 && members.every(m => m.isSubmitted);
    this.setData({ room, samples, members, myStatusMap, mySubmittedCount, isAllSubmitted });
  },
  startSampleTasting(e) {
    const idx = e.currentTarget.dataset.index;
    wx.navigateTo({ url: "/packages/blind/pages/tasting/tasting?roomId=" + this.data.roomId + "&sampleIndex=" + idx });
  },
  triggerReveal() {
    const { room, roomId } = this.data;
    wx.showModal({
      title: "确定揭晓答案？",
      content: "公布真实酒款后，将自动根据计分规则计算排行榜并生成酒局报告！",
      confirmText: "立即揭晓",
      confirmColor: "#274d3b",
      success: (res) => {
        if (res.confirm) {
          room.status = "revealed";
          room.statusText = "已开奖";
          room.revealAt = Date.now();
          storageService.saveRoom(room);
          wx.navigateTo({ url: "/packages/blind/pages/reveal/reveal?roomId=" + roomId });
        }
      }
    });
  },
  goToReveal() {
    wx.navigateTo({ url: "/packages/blind/pages/reveal/reveal?roomId=" + this.data.roomId });
  }
});
