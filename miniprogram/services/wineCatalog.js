/** Public wine catalogue. Deliberately independent of authenticated /applet requests. */
const welinkClient = require('./welinkClient');
const PATH = '/taste/public/wineType';
const CACHE_KEY = 'mz_public_wine_catalog_v1';
const FRESH_FOR = 10 * 60 * 1000;
const memory = new Map();
const pending = new Map();

function normalizeWineList(data) {
  if (!Array.isArray(data)) throw new Error('酒款目录格式异常，请稍后重试');
  const wines = [];
  const seen = new Set();
  data.forEach(row => {
    if (!row || typeof row.brand !== 'string' || typeof row.product !== 'string') return;
    const brand = row.brand.trim();
    const product = row.product.trim();
    if (!brand || !product || brand.length > 100 || product.length > 100) return;
    const key = JSON.stringify([brand, product]);
    if (seen.has(key)) return;
    seen.add(key);
    const rawPrice = typeof row.defaultPrice === 'number' || typeof row.defaultPrice === 'string'
      ? String(row.defaultPrice).trim() : '';
    const price = /^\d+(?:\.\d+)?$/.test(rawPrice) ? Number(rawPrice) : NaN;
    wines.push({
      id: Number.isSafeInteger(row.id) && row.id > 0 ? row.id : null,
      brand,
      product,
      aromaType: typeof row.aromaType === 'string' ? row.aromaType.trim().slice(0, 40) : '',
      degree: typeof row.degree === 'string' ? row.degree.trim().slice(0, 40) : '',
      defaultPrice: Number.isFinite(price) && price >= 0 ? price : null
    });
  });
  if (data.length && !wines.length) throw new Error('酒款目录内容异常，请稍后重试');
  return wines;
}

function getCachedWineCatalog() {
  const baseUrl = welinkClient.resolveBaseUrl();
  if (memory.has(baseUrl)) return memory.get(baseUrl);
  try {
    const saved = wx.getStorageSync(CACHE_KEY);
    if (saved && saved.baseUrl === baseUrl && Array.isArray(saved.list)) {
      const entry = { list: normalizeWineList(saved.list), updatedAt: 0 };
      memory.set(baseUrl, entry);
      return entry;
    }
  } catch (_) { /* Storage may be unavailable; network/manual entry remain usable. */ }
  return null;
}

function loadWineCatalog({ force = false } = {}) {
  const baseUrl = welinkClient.resolveBaseUrl();
  const cached = getCachedWineCatalog();
  if (!force && cached && Date.now() - cached.updatedAt < FRESH_FOR) {
    return Promise.resolve(cached.list);
  }
  if (pending.has(baseUrl)) return pending.get(baseUrl);
  const task = new Promise((resolve, reject) => {
    if (typeof wx === 'undefined' || !wx.request) return reject(new Error('当前无法加载酒款目录'));
    wx.request({
      url: baseUrl + PATH,
      method: 'GET',
      timeout: 10000,
      header: { Accept: 'application/json' },
      success(res) {
        if (baseUrl !== welinkClient.resolveBaseUrl()) return reject(new Error('数据来源已变更，请重新加载'));
        const body = res.data;
        if (!Number.isInteger(res.statusCode) || res.statusCode < 200 || res.statusCode >= 300 || !body ||
            (body.code !== '00000' && body.code !== 0)) {
          return reject(new Error('酒款目录暂时无法加载，请稍后重试'));
        }
        try {
          const list = normalizeWineList(body.data);
          const entry = { list, updatedAt: Date.now() };
          memory.set(baseUrl, entry);
          try { wx.setStorageSync(CACHE_KEY, { baseUrl, list, updatedAt: entry.updatedAt }); } catch (_) {}
          resolve(list);
        } catch (err) { reject(err); }
      },
      fail() { reject(new Error('网络连接不可用，可继续手动填写')); }
    });
  });
  const tracked = task.finally(() => {
    if (pending.get(baseUrl) === tracked) pending.delete(baseUrl);
  });
  pending.set(baseUrl, tracked);
  return tracked;
}

module.exports = { loadWineCatalog, getCachedWineCatalog, normalizeWineList };
