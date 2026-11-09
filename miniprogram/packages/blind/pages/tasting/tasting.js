const storageService = require("../../../../services/storage");
const { searchLiquors, refreshLiquors } = require("../../../../utils/liquorDb");

Page({
  data: {
    roomId: "", sampleIndex: 0, samples: [], currentSample: null,
    aromaOptions: storageService.AROMA_TYPES, degreeOptions: storageService.DEGREE_OPTIONS,
    guess: { brand: "", product: "", aromaType: "酱香型", alcoholDegree: "53°", year: "2022", estimatedPrice: 500, likeLevel: 0 },
    likeLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    catalogLoading: false, catalogSource: 'builtin', catalogError: '', suggestions: []
  },
  onLoad(options) {
    this._disposed = false;
    const roomId = options.roomId || "room_demo_01";
    const sampleIndex = parseInt(options.sampleIndex, 10) || 0;
    const samples = storageService.getSamples(roomId);
    const currentSample = samples[sampleIndex] || null;
    const user = storageService.getCurrentUser();
    let guess = { brand: "", product: "", aromaType: "酱香型", alcoholDegree: "53°", year: "2022", estimatedPrice: 500, likeLevel: 0 };
    if (currentSample) {
      const existing = storageService.getGuesses(roomId, user.userId).find(g => g.sampleId === currentSample.sampleId);
      if (existing) { guess = { ...guess, ...existing }; }
    }
    this.setData({ roomId, sampleIndex, samples, currentSample, guess });
    this.loadWineCatalog();
  },
  async loadWineCatalog(force = false) {
    this.setData({ catalogLoading: true });
    const result = await refreshLiquors({ force: force === true });
    if (this._disposed) return;
    this.setData({ catalogLoading: false, catalogSource: result.source, catalogError: result.error, suggestions: searchLiquors(this._suggestionQuery || '') });
  },
  retryWineCatalog() { this.loadWineCatalog(true); },
  onUnload() { this._disposed = true; },
  onInputBrand(e) {
    const val = e.detail.value;
    this._suggestionQuery = val;
    const guess = { ...this.data.guess, brand: val };
    const suggestions = searchLiquors(val);
    this.setData({ guess, suggestions });
  },
  applySuggestion(e) {
    this._suggestionQuery = '';
    const item = e.currentTarget.dataset.item;
    const guess = {
      ...this.data.guess,
      brand: item.brand,
      product: item.product,
      aromaType: item.aromaType || this.data.guess.aromaType,
      alcoholDegree: item.degree || this.data.guess.alcoholDegree,
      estimatedPrice: item.defaultPrice === null ? this.data.guess.estimatedPrice : item.defaultPrice
    };
    this.setData({ guess, suggestions: [] });
    wx.showToast({ title: "已自动填入酒款", icon: "none" });
  },
  onInput(e) {
    const f = e.currentTarget.dataset.f;
    const val = e.detail.value;
    const guess = { ...this.data.guess, [f]: val };
    this.setData({ guess });
  },
  selectAroma(e) {
    const guess = { ...this.data.guess, aromaType: e.currentTarget.dataset.val };
    this.setData({ guess });
  },
  selectDegree(e) {
    const guess = { ...this.data.guess, alcoholDegree: e.currentTarget.dataset.val };
    this.setData({ guess });
  },
  selectLikeLevel(e) {
    const raw = Number(e.currentTarget.dataset.value);
    if (!Number.isFinite(raw) || raw < 0.5 || raw > 10 || Math.round(raw * 2) !== raw * 2) return;
    const current = Number(this.data.guess.likeLevel) || 0;
    let likeLevel = raw;
    if (Number.isInteger(raw) && !e.currentTarget.dataset.exact) {
      likeLevel = current === raw ? raw - 0.5 : raw;
    }
    this.setData({ guess: { ...this.data.guess, likeLevel } });
  },
  nextToScoring() {
    const user = storageService.getCurrentUser();
    const { roomId, currentSample, guess, sampleIndex } = this.data;
    storageService.saveUserGuess({
      roomId, userId: user.userId, sampleId: currentSample.sampleId, ...guess
    });
    wx.navigateTo({
      url: "/packages/blind/pages/scoring/scoring?roomId=" + roomId + "&sampleIndex=" + sampleIndex
    });
  }
});
