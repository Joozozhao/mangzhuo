const storageService = require("../../../../services/storage");
const identity = require("../../../../services/identity");
const { calculateGuessScore } = require("../../../../utils/scoring");

Page({
  data: {
    roomId: "", sampleId: "", currentSample: null, comparisonList: []
  },
  onLoad(options) {
    const roomId = options.roomId || "room_demo_01";
    const samples = storageService.getSamples(roomId);
    const sampleId = options.sampleId || (samples[0] ? samples[0].sampleId : "");
    const currentSample = samples.find(s => s.sampleId === sampleId) || samples[0];

    const members = storageService.getMembers(roomId);
    const guesses = storageService.getGuesses(roomId);
    const ratings = storageService.getRatings(roomId);

    const comparisonList = members.map(m => {
      const g = guesses.find(item => item.userId === m.userId && item.sampleId === currentSample.sampleId);
      const r = ratings.find(item => item.userId === m.userId && item.sampleId === currentSample.sampleId);
      const scoreResult = calculateGuessScore(currentSample, g);
      return {
        userId: m.userId,
        nickname: m.nickname,
        avatar: m.avatar || '🍶',
        avatarImg: identity.isAvatarImage(m.avatar),
        guess: g || {},
        rating: r || null,
        scoreResult
      };
    }).sort((a, b) => b.scoreResult.totalScore - a.scoreResult.totalScore);

    this.setData({ roomId, sampleId: currentSample.sampleId, currentSample, comparisonList });
  }
});
