const journal = require('../../services/journal');
const kb = require('../../utils/liquorKnowledge');

const aromas = ['暂不判断', ...kb.aromaOptions, '其他'];
const placeholders = { aroma: '你闻到了什么？', taste: '写下第一口的感受', finish: '咽下后，留下了什么？' };

function mergeField(text, words) {
  return text
    ? (words.length ? text + '；' + words.join('、') : text)
    : words.join('、');
}

Page({
  data: { aromas, index: 0, saving: false, groups: [], placeholders },
  onLoad() {
    this.setData({ groups: kb.getFlavorGroups() });
  },
  choose(e) {
    this.setData({ index: Number(e.detail.value) });
  },
  toggleTerm(e) {
    const { group, id } = e.currentTarget.dataset;
    const groups = this.data.groups.map(g => {
      if (g.id !== group) return g;
      return { ...g, terms: g.terms.map(t => (t.id === id ? { ...t, selected: !t.selected } : t)) };
    });
    this.setData({ groups });
  },
  submit(e) {
    if (this.data.saving) return;
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
        aroma: merged.aroma || '',
        taste: merged.taste || '',
        finish: merged.finish || '',
        aromaType: aromas[this.data.index],
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
