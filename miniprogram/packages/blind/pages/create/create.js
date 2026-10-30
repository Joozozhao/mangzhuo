const storageService = require("../../../../services/storage");
const identity = require("../../../../services/identity");
Page({
  data: { name: "", description: "", sampleCount: 4, maxMembers: 8, profileCompleted: true },
  onShow() {
    this.setData({ profileCompleted: identity.hasCompletedProfile() });
  },
  goProfile() {
    wx.navigateTo({ url: "/pages/profile/profile" });
  },
  onInputName(e) { this.setData({ name: e.detail.value }); },
  onInputDesc(e) { this.setData({ description: e.detail.value }); },
  selectCount(e) { this.setData({ sampleCount: Number(e.currentTarget.dataset.val) }); },
  selectMembers(e) { this.setData({ maxMembers: Number(e.currentTarget.dataset.val) }); },
  submitCreate() {
    const user = storageService.getCurrentUser();
    const roomId = "room_" + Date.now();
    const roomCode = String(Math.floor(1000 + Math.random() * 9000));
    const room = {
      roomId, roomCode,
      name: this.data.name.trim() || ("盲酌酒局 " + roomCode),
      description: this.data.description.trim() || "去掉酒标，只凭味道。",
      ownerId: user.userId,
      sampleCount: this.data.sampleCount,
      maxMembers: this.data.maxMembers,
      status: "playing", statusText: "进行中", createdAt: Date.now()
    };
    storageService.saveRoom(room);
    storageService.addMember(roomId, user, "owner");
    wx.navigateTo({ url: "/packages/blind/pages/setup/setup?roomId=" + roomId + "&count=" + this.data.sampleCount });
  }
});
