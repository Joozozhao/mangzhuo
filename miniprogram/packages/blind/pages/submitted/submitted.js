const storageService = require("../../../../services/storage");
Page({
  data: { roomId: "", room: null, sampleCount: 4 },
  onLoad(options) {
    const roomId = options.roomId || "room_demo_01";
    const room = storageService.getRoomById(roomId);
    const samples = storageService.getSamples(roomId);
    this.setData({ roomId, room, sampleCount: samples.length });
  },
  goToRoom() { wx.redirectTo({ url: "/packages/blind/pages/room/room?roomId=" + this.data.roomId }); },
  goToReveal() { wx.navigateTo({ url: "/packages/blind/pages/reveal/reveal?roomId=" + this.data.roomId }); }
});