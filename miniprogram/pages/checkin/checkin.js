const journal = require('../../services/journal');
const journalContext = require('../../services/journalContext');
const storage = require('../../services/storage');
const kb = require('../../utils/liquorKnowledge');
const { searchLiquors, refreshLiquors } = require('../../utils/liquorDb');

const aromas = ['暂不判断', ...kb.aromaOptions, '其他'];
const placeholders = { aroma: '你闻到了什么？', taste: '写下第一口的感受', finish: '咽下后，留下了什么？' };

function mergeField(text, words) {
  return text
    ? (words.length ? text + '；' + words.join('、') : text)
    : words.join('、');
}

Page({
  data: { aromas, index: 0, saving: false, groups: [], placeholders, title: '', titleError: '', titleFocused: false, note: '', suggestions: [], catalogLoading: false, catalogSource: 'builtin', catalogError: '', roomOptions: [], roomIndex: -1, selectedRoom: null, sampleOptions: [], sampleIndex: -1, selectedSample: null },
  onLoad(options = {}) {
    this._disposed = false;
    const roomOptions = journalContext.getRoomOptions(storage.getCurrentUser().userId);
    const roomIndex = roomOptions.findIndex(room => room.roomId === options.roomId);
    const selectedRoom = roomIndex >= 0 ? roomOptions[roomIndex] : null;
    const sampleOptions = selectedRoom ? selectedRoom.samples : [];
    const sampleIndex = sampleOptions.findIndex(sample => sample.sampleId === options.sampleId);
    const selectedSample = sampleIndex >= 0 ? sampleOptions[sampleIndex] : null;
    const sampleAroma = selectedSample && selectedSample.aromaType;
    this.setData({
      groups: kb.getFlavorGroups().map(group => ({ ...group, selectedCount: 0 })),
      roomOptions, roomIndex, selectedRoom, sampleOptions, sampleIndex, selectedSample,
      title: selectedSample ? selectedSample.label : '',
      index: sampleAroma && aromas.includes(sampleAroma) ? aromas.indexOf(sampleAroma) : 0
    });
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
  onTitleInput(e) {
    this._titleEdited = true;
    this._suggestionQuery = e.detail.value;
    this.setData({ title: e.detail.value, titleError: '', suggestions: searchLiquors(e.detail.value) });
  },
  onTitleBlur() { this.setData({ titleFocused: false }); },
  onNoteInput(e) { this.setData({ note: e.detail.value }); },
  applyWineSuggestion(e) {
    const wine = e.currentTarget.dataset.item;
    const title = wine.product;
    if (title.length > 40) { wx.showToast({ title: '酒名较长，请手动填写简称', icon: 'none' }); return; }
    this._suggestionQuery = '';
    this._titleEdited = true;
    const index = this.data.aromas.indexOf(wine.aromaType);
    this.setData({ title, titleError: '', suggestions: [], index: index >= 0 ? index : this.data.index });
  },
  chooseRoom(e) {
    const roomIndex = Number(e.detail.value);
    const selectedRoom = this.data.roomOptions[roomIndex] || null;
    this.setData({ roomIndex: selectedRoom ? roomIndex : -1, selectedRoom, sampleOptions: selectedRoom ? selectedRoom.samples : [], sampleIndex: -1, selectedSample: null });
  },
  chooseSample(e) {
    const sampleIndex = Number(e.detail.value);
    const selectedSample = this.data.sampleOptions[sampleIndex] || null;
    const patch = { sampleIndex: selectedSample ? sampleIndex : -1, selectedSample };
    if (selectedSample && !this._titleEdited) patch.title = selectedSample.label;
    if (selectedSample && selectedSample.aromaType) {
      const index = this.data.aromas.indexOf(selectedSample.aromaType);
      if (index >= 0) patch.index = index;
    }
    this.setData(patch);
  },
  choose(e) {
    this.setData({ index: Number(e.detail.value) });
  },
  toggleTerm(e) {
    const { group, id } = e.currentTarget.dataset;
    const groups = this.data.groups.map(g => {
      if (g.id !== group) return g;
      const terms = g.terms.map(t => (t.id === id ? { ...t, selected: !t.selected } : t));
      return { ...g, terms, selectedCount: terms.filter(t => t.selected).length };
    });
    this.setData({ groups });
  },
  submit(e) {
    if (this.data.saving) return;
    if (!String(e.detail.value.title || '').trim()) {
      this.setData({ titleError: '先为这一杯写下酒名或盲样编号', titleFocused: true });
      wx.pageScrollTo({ selector: '#wine-section', duration: 250 });
      return;
    }
    this.setData({ saving: true });
    try {
      const value = e.detail.value;
      const flavorTagIds = { aroma: [], taste: [], finish: [] };
      const merged = {};
      this.data.groups.forEach(group => {
        const picked = group.terms.filter(t => t.selected);
        flavorTagIds[group.id] = picked.map(t => t.id);
        merged[group.id] = mergeField(
          String(value[group.id] || '').trim(),
          picked.map(t => t.label)
        );
      });
      const row = journal.save({
        ...value,
        roomId: this.data.selectedRoom ? this.data.selectedRoom.roomId : '',
        sampleId: this.data.selectedSample ? this.data.selectedSample.sampleId : '',
        sampleLabel: this.data.selectedSample ? this.data.selectedSample.label : '',
        roomSnapshot: this.data.selectedRoom ? {
          roomId: this.data.selectedRoom.roomId,
          name: this.data.selectedRoom.name,
          sampleCount: this.data.selectedRoom.sampleCount,
          memberCount: this.data.selectedRoom.memberCount
        } : null,
        aroma: merged.aroma || '',
        taste: merged.taste || '',
        finish: merged.finish || '',
        aromaType: this.data.aromas[this.data.index],
        flavorTagIds
      });
      wx.redirectTo({ url: '/pages/card/card?id=' + row.id });
    } catch (err) {
      wx.showToast({ title: err.message || '保存失败，请重试', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  }
});
