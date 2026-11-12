const storageService = require("../../../../services/storage");
const identity = require("../../../../services/identity");
const { generateRoomAnalysis } = require("../../../../utils/scoring");
const memberLevel = require("../../../../services/memberLevel");

Page({
  data: {
    roomId: "", activeTab: "guess", guessRanking: [], tasteRanking: []
  },
  onLoad(options) {
    const roomId = options.roomId || "room_demo_01";
    this.setData({ roomId });
    this.loadData();
  },
  loadData() {
    const { roomId } = this.data;
    const room = storageService.getRoomById(roomId);
    const samples = storageService.getSamples(roomId);
    const members = storageService.getMembers(roomId);
    const guesses = storageService.getGuesses(roomId);
    const ratings = storageService.getRatings(roomId);

    const res = generateRoomAnalysis(room, samples, members, guesses, ratings);
    const enrichedGuessRanking = (res.guessRanking || []).map(item => {
      const flagged = identity.withAvatarFlag(item);
      if (memberLevel && memberLevel.getUserMemberLevel) {
        const lvl = memberLevel.getUserMemberLevel(item.userId);
        if (lvl && lvl.current) {
          flagged.levelTitle = lvl.current.title;
          flagged.levelBadge = lvl.current.badge;
          flagged.levelRank = lvl.current.rank;
        }
      }
      return flagged;
    });
    this.setData({
      guessRanking: enrichedGuessRanking,
      tasteRanking: res.tasteRanking
    });
  },
  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },
  goToReport() {
    wx.navigateTo({ url: "/packages/blind/pages/report/report?roomId=" + this.data.roomId });
  }
});
