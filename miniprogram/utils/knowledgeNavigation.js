const catalog = require('./liquorKnowledge');
const KEY = 'mz_pending_knowledge';

function open(type, id) {
  if (!catalog.getDetail(type, id)) return;
  wx.setStorageSync(KEY, { type, id });
  wx.switchTab({
    url: '/pages/knowledge/knowledge',
    fail() {
      wx.removeStorageSync(KEY);
      wx.showToast({ title: '酒识暂时无法打开，请重试', icon: 'none' });
    }
  });
}

function consume() {
  const entry = wx.getStorageSync(KEY);
  if (!entry) return null;
  wx.removeStorageSync(KEY);
  return catalog.getDetail(entry.type, entry.id) ? { type: entry.type, id: entry.id } : null;
}

module.exports = { open, consume };
