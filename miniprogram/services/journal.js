const KEY = 'mz_tasting_journal_v1';
function all() { const rows = wx.getStorageSync(KEY); return Array.isArray(rows) ? rows : []; }
function save(data) {
 const title = String(data.title || '').trim();
 if (!title) throw new Error('请填写酒款或盲样名称');
 const now = new Date();
 const row = { ...data, title, id: 'note_' + now.getTime() + '_' + Math.random().toString(36).slice(2,7), date: [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('.'), createdAt: now.getTime() };
 wx.setStorageSync(KEY, [row, ...all()]); return row;
}
module.exports = { all, save, get: id => all().find(row => row.id === id) };
