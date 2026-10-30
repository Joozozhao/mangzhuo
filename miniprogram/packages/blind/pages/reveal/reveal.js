const storageService = require("../../../../services/storage");
const { generateRoomAnalysis } = require("../../../../utils/scoring");
const knowledge = require("../../../../utils/liquorKnowledge");
const knowledgeNavigation = require("../../../../utils/knowledgeNavigation");

Page({
  data: {
    roomId: "", room: null, samples: [], members: [], sampleStats: []
  },
  onLoad(options) {
    this.setData({ roomId: options.roomId || "room_demo_01" });
    this.loadData();
  },
  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  },
  loadData() {
    const { roomId } = this.data;
    const room = storageService.getRoomById(roomId);
    const samples = storageService.getSamples(roomId);
    const members = storageService.getMembers(roomId);
    const guesses = storageService.getGuesses(roomId);
    const ratings = storageService.getRatings(roomId);

    const analysis = generateRoomAnalysis(room, samples, members, guesses, ratings);
    this.setData({
      room, samples, members,
      sampleStats: analysis.sampleRatingStats.map(sample => ({
        ...sample,
        knowledgeEntry: room && room.status === 'revealed' ? knowledge.findForSample(sample) : null,
        photo: room && room.status === 'revealed' ? (sample.photo || '') : ''
      }))
    });
  },
  goToRanking() { wx.navigateTo({ url: "/packages/blind/pages/ranking/ranking?roomId=" + this.data.roomId }); },
  goToReport() { wx.navigateTo({ url: "/packages/blind/pages/report/report?roomId=" + this.data.roomId }); },
  previewPhoto(e) {
    const photo = e.currentTarget.dataset.photo;
    if (photo) wx.previewImage({ urls: [photo] });
  },
  goToKnowledge(e) {
    const { type, id } = e.currentTarget.dataset;
    knowledgeNavigation.open(type, id);
  },
  goToCompare(e) {
    const sId = e.currentTarget.dataset.sampleId;
    wx.navigateTo({ url: "/packages/blind/pages/compare/compare?roomId=" + this.data.roomId + "&sampleId=" + sId });
  }
});
