const storageService = require("../../../../services/storage");
const identity = require("../../../../services/identity");
Page({
  data: { roomCode: "", availableRooms: [], profileCompleted: true },
  onLoad() { this.setData({ availableRooms: storageService.getRooms() }); },
  onShow() {
    this.setData({ profileCompleted: identity.hasCompletedProfile() });
  },
  goProfile() {
    wx.navigateTo({ url: "/pages/profile/profile" });
  },
  onInputCode(e) {
    const val = e.detail.value.trim();
    this.setData({ roomCode: val });
    if (val.length === 4) { this.submitJoin(); }
  },
  joinQuick(e) {
    const code = e.currentTarget.dataset.code;
    this.setData({ roomCode: code }, () => { this.submitJoin(); });
  },
  submitJoin() {
    const { roomCode } = this.data;
    if (!roomCode) { wx.showToast({ title: "请输入4位房间码", icon: "none" }); return; }
    const room = storageService.getRoomByCode(roomCode);
    if (!room) { wx.showToast({ title: "未找到该房间", icon: "none" }); return; }
    const user = storageService.getCurrentUser();
    storageService.addMember(room.roomId, user, "member");
    wx.navigateTo({ url: "/packages/blind/pages/room/room?roomId=" + room.roomId });
  }
});
