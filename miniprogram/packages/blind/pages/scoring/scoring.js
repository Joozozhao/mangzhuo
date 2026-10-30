const storageService = require("../../../../services/storage");
Page({
  data: {
    roomId: "", sampleIndex: 0, samples: [], currentSample: null, isLastSample: false,
    dimensions: [
      { key: "aroma", name: "香气幽雅度", sub: "是否纯正幽雅、无杂气" },
      { key: "entrance", name: "入口顺滑度", sub: "是否爆辣或容易下咽" },
      { key: "richness", name: "酒体醇厚度", sub: "水味轻薄还是丰满饱满" },
      { key: "balance", name: "诸味协调度", sub: "酸甜苦辣涩各味是否平衡" },
      { key: "finish", name: "回味与余香", sub: "回甘与空杯留香长短" }
    ],
    rating: { aroma: 9.0, entrance: 9.0, richness: 9.0, balance: 9.0, finish: 9.0, comment: "" },
    overallScore: "9.0"
  },
  onLoad(options) {
    const roomId = options.roomId || "room_demo_01";
    const sampleIndex = parseInt(options.sampleIndex, 10) || 0;
    const samples = storageService.getSamples(roomId);
    const currentSample = samples[sampleIndex] || null;
    const isLastSample = sampleIndex >= samples.length - 1;
    const user = storageService.getCurrentUser();
    let rating = { aroma: 9.0, entrance: 9.0, richness: 9.0, balance: 9.0, finish: 9.0, comment: "" };
    if (currentSample) {
      const existing = storageService.getRatings(roomId, user.userId).find(r => r.sampleId === currentSample.sampleId);
      if (existing) { rating = { ...rating, ...existing }; }
    }
    this.setData({ roomId, sampleIndex, samples, currentSample, isLastSample, rating });
    this.calcOverall();
  },
  onSliderChange(e) {
    const dim = e.currentTarget.dataset.dim;
    const val = parseFloat(e.detail.value);
    const rating = { ...this.data.rating, [dim]: val };
    this.setData({ rating }, () => { this.calcOverall(); });
  },
  onInputComment(e) {
    const rating = { ...this.data.rating, comment: e.detail.value };
    this.setData({ rating });
  },
  calcOverall() {
    const { aroma, entrance, richness, balance, finish } = this.data.rating;
    const avg = ((aroma + entrance + richness + balance + finish) / 5).toFixed(1);
    this.setData({ overallScore: avg });
  },
  submitRating() {
    const user = storageService.getCurrentUser();
    const { roomId, currentSample, rating, overallScore, sampleIndex, samples, isLastSample } = this.data;
    storageService.saveUserRating({
      roomId, userId: user.userId, sampleId: currentSample.sampleId,
      ...rating, overall: parseFloat(overallScore)
    });
    if (isLastSample) {
      storageService.markMemberSubmitted(roomId, user.userId);
      wx.redirectTo({ url: "/packages/blind/pages/submitted/submitted?roomId=" + roomId });
    } else {
      wx.redirectTo({ url: "/packages/blind/pages/tasting/tasting?roomId=" + roomId + "&sampleIndex=" + (sampleIndex + 1) });
    }
  }
});