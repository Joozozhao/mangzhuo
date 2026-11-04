const storageService = require("../../../../services/storage");
const { searchLiquors, refreshLiquors } = require("../../../../utils/liquorDb");

Page({
  data: {
    roomId: "", currentIndex: 0, samples: [], currentSample: null,
    aromaOptions: storageService.AROMA_TYPES, degreeOptions: storageService.DEGREE_OPTIONS,
    catalogLoading: false, catalogSource: 'builtin', catalogError: '', suggestions: [], photoSaving: false
  },
  onLoad(options) {
    this._disposed = false;
    const roomId = options.roomId || "room_demo_01";
    const count = parseInt(options.count, 10) || 4;
    let samples = storageService.getSamples(roomId);
    if (!samples || samples.length === 0) {
      samples = [];
      for (let i = 1; i <= count; i++) {
        samples.push({
          sampleId: "s_" + roomId + "_" + i, roomId, number: i, bottleTag: i + "号酒",
          brand: "", product: "", aromaType: "酱香型", alcoholDegree: "53°", year: "2022", marketPrice: 500, notes: "", photo: ""
        });
      }
    }
    this.setData({ roomId, samples, currentIndex: 0, currentSample: samples[0] });
    this.loadWineCatalog();
  },
  switchTab(e) {
    const idx = e.currentTarget.dataset.index;
    this.setData({ currentIndex: idx, currentSample: this.data.samples[idx], suggestions: [] });
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
    const { samples, currentIndex } = this.data;
    samples[currentIndex].brand = val;
    const suggestions = searchLiquors(val);
    this.setData({ samples, currentSample: samples[currentIndex], suggestions });
  },
  applySuggestion(e) {
    this._suggestionQuery = '';
    const item = e.currentTarget.dataset.item;
    const { samples, currentIndex } = this.data;
    samples[currentIndex].brand = item.brand;
    samples[currentIndex].product = item.product;
    if (item.aromaType) samples[currentIndex].aromaType = item.aromaType;
    if (item.degree) samples[currentIndex].alcoholDegree = item.degree;
    if (item.defaultPrice !== null) samples[currentIndex].marketPrice = item.defaultPrice;
    this.setData({ samples, currentSample: samples[currentIndex], suggestions: [] });
    wx.showToast({ title: "已匹配名酒配置", icon: "none" });
  },
  onInput(e) {
    const f = e.currentTarget.dataset.f;
    const val = e.detail.value;
    const { samples, currentIndex } = this.data;
    samples[currentIndex][f] = val;
    this.setData({ samples, currentSample: samples[currentIndex] });
  },
  selectAroma(e) {
    const { samples, currentIndex } = this.data;
    samples[currentIndex].aromaType = e.currentTarget.dataset.val;
    this.setData({ samples, currentSample: samples[currentIndex] });
  },
  selectDegree(e) {
    const { samples, currentIndex } = this.data;
    samples[currentIndex].alcoholDegree = e.currentTarget.dataset.val;
    this.setData({ samples, currentSample: samples[currentIndex] });
  },
  async choosePhoto(e) {
    if (this.data.photoSaving) return;
    const sourceType = e.currentTarget.dataset.source === 'camera' ? ['camera'] : ['album'];
    const { samples, currentIndex } = this.data;
    const sample = samples[currentIndex];
    const previousPhoto = sample.photo;
    this.setData({ photoSaving: true });
    try {
      const chosen = await new Promise((resolve, reject) => {
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType,
          sizeType: ['compressed'],
          success: resolve,
          fail: reject
        });
      });
      const file = chosen.tempFiles && chosen.tempFiles[0];
      if (!file || !file.tempFilePath) throw new Error('未获取到照片');
      const saved = await new Promise((resolve, reject) => {
        wx.saveFile({ tempFilePath: file.tempFilePath, success: resolve, fail: reject });
      });
      if (!saved || !saved.savedFilePath) throw new Error('照片保存失败');
      sample.photo = saved.savedFilePath;
      this.setData({ samples, currentSample: sample });
      if (previousPhoto && previousPhoto.indexOf('wxfile://') === 0) {
        wx.removeSavedFile({ filePath: previousPhoto, fail: () => {} });
      }
    } catch (err) {
      if (!err || !/cancel/i.test(err.errMsg || '')) {
        wx.showToast({ title: '照片未能保存，请重试', icon: 'none' });
      }
    } finally {
      this.setData({ photoSaving: false });
    }
  },
  previewPhoto() {
    const photo = this.data.currentSample.photo;
    if (photo) wx.previewImage({ urls: [photo] });
  },
  removePhoto() {
    if (this.data.photoSaving) return;
    const { samples, currentIndex } = this.data;
    const photo = samples[currentIndex].photo;
    samples[currentIndex].photo = '';
    this.setData({ samples, currentSample: samples[currentIndex] });
    if (photo && photo.indexOf('wxfile://') === 0) {
      wx.removeSavedFile({ filePath: photo, fail: () => {} });
    }
  },
  quickFillDemo() {
    const presets = [
      { brand: "贵州茅台", product: "飞天茅台53度", aromaType: "酱香型", alcoholDegree: "53°", year: "2021", marketPrice: 2800, notes: "空杯留香，酱香浓郁" },
      { brand: "习酒", product: "君品习酒", aromaType: "酱香型", alcoholDegree: "53°", year: "2022", marketPrice: 980, notes: "温雅细腻，适口顺滑" },
      { brand: "五粮液", product: "普五第八代", aromaType: "浓香型", alcoholDegree: "52°", year: "2023", marketPrice: 1050, notes: "香气喷涌，绵甜劲爽" },
      { brand: "珍酒", product: "珍十五", aromaType: "酱香型", alcoholDegree: "53°", year: "2022", marketPrice: 420, notes: "高性价比，酒体厚重" }
    ];
    const samples = this.data.samples.map((s, idx) => ({ ...s, ...presets[idx % presets.length] }));
    this.setData({ samples, currentSample: samples[this.data.currentIndex], suggestions: [] });
    wx.showToast({ title: "已填入经典酒款", icon: "success" });
  },
  saveAndGoRoom() {
    if (this.data.photoSaving) return;
    storageService.saveSamples(this.data.roomId, this.data.samples);
    wx.showToast({ title: "标准答案已就绪", icon: "success" });
    setTimeout(() => {
      wx.redirectTo({ url: "/packages/blind/pages/room/room?roomId=" + this.data.roomId });
    }, 500);
  }
});
