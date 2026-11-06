/**
 * 公开酒文化知识适配层
 * 适配 POST /taste/public/knowledge
 * 返回业务结构：{ items, page, size, total }
 */
const welinkClient = require('./welinkClient');

const PATH = '/taste/public/knowledge';
const CACHE_PREFIX = 'mz_public_knowledge_catalog_v1_';
const FRESH_FOR = 10 * 60 * 1000; // 10分钟新鲜度
const memory = new Map(); // key: baseUrl + '_' + page + '_' + size -> { result, updatedAt }
const pending = new Map(); // key: baseUrl + '_' + page + '_' + size -> Promise

function sanitizePagination(page, size) {
  let p = parseInt(page, 10);
  let s = parseInt(size, 10);
  if (!Number.isFinite(p) || p < 1) p = 1;
  if (!Number.isFinite(s) || s < 1) s = 20;
  if (s > 100) s = 100;
  return { page: p, size: s };
}

function stripHtml(html) {
  if (typeof html !== 'string') return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeParagraphs(content) {
  if (Array.isArray(content)) {
    return content
      .map(item => (typeof item === 'string' ? stripHtml(item) : ''))
      .filter(Boolean);
  }
  if (typeof content === 'string') {
    const plain = stripHtml(content);
    if (!plain) return [];
    return plain
      .split('\n')
      .map(p => p.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeKnowledgeItem(row, index) {
  if (!row || typeof row !== 'object') return null;

  const rawTitle = typeof row.title === 'string' ? row.title : (typeof row.name === 'string' ? row.name : '');
  const title = stripHtml(rawTitle).slice(0, 100);
  if (!title) return null;

  const id = row.id != null && String(row.id).trim() ? String(row.id).trim() : 'remote_' + (index + 1);

  const rawCategory = typeof row.category === 'string' ? row.category : (typeof row.type === 'string' ? row.type : '');
  const category = stripHtml(rawCategory).slice(0, 40) || '酒文化';

  const rawContent = row.content != null ? row.content : (row.paragraphs != null ? row.paragraphs : (row.text != null ? row.text : (row.body != null ? row.body : '')));
  const paragraphs = normalizeParagraphs(rawContent);

  const rawDesc = typeof row.desc === 'string' ? row.desc : (typeof row.summary === 'string' ? row.summary : (typeof row.description === 'string' ? row.description : ''));
  let desc = stripHtml(rawDesc).slice(0, 200);
  if (!desc && paragraphs.length > 0) {
    desc = paragraphs[0].slice(0, 100);
  }

  const rawDate = typeof row.updated === 'string' ? row.updated : (typeof row.updateDate === 'string' ? row.updateDate : (typeof row.updatedAt === 'string' ? row.updatedAt : (typeof row.createTime === 'string' ? row.createTime : '')));
  const updated = stripHtml(rawDate).slice(0, 30);

  const minutes = Number.isSafeInteger(row.minutes) && row.minutes > 0 && row.minutes < 1000 ? row.minutes : null;
  const meta = category + (minutes ? ' · ' + minutes + ' 分钟阅读' : (updated ? ' · ' + updated : ' · 慢读酒识'));

  let rawSources = row.sources;
  if (typeof rawSources === 'string') {
    try { rawSources = JSON.parse(rawSources); } catch (_) { rawSources = []; }
  }
  const sources = (Array.isArray(rawSources) ? rawSources : []).filter(source =>
    source && typeof source.title === 'string' && source.title.trim() &&
    typeof source.url === 'string' && /^https:\/\//i.test(source.url.trim())
  ).map(source => ({ title: stripHtml(source.title).slice(0, 150), url: source.url.trim() }));

  const coverUrl = typeof row.coverUrl === 'string' && /^https?:\/\//i.test(row.coverUrl.trim()) ? row.coverUrl.trim() : (
    typeof row.imageUrl === 'string' && /^https?:\/\//i.test(row.imageUrl.trim()) ? row.imageUrl.trim() : null
  );

  const item = {
    type: 'remote-article',
    id,
    title,
    category,
    desc,
    meta,
    paragraphs,
    facts: [],
    sources,
    related: [],
    tip: typeof row.tip === 'string' ? stripHtml(row.tip).slice(0, 500) : '',
    updated
  };

  if (coverUrl) {
    item.coverUrl = coverUrl;
  }

  return item;
}

function normalizeKnowledgeResponse(body, page, size) {
  if (!body || (body.code !== '00000' && body.code !== 0)) {
    throw new Error((body && body.msg) || '酒文化知识暂时无法加载，请稍后重试');
  }

  const rawData = body.data;
  let rawList = [];
  let total = 0;

  if (Array.isArray(rawData)) {
    rawList = rawData;
    total = Number.isFinite(body.total) ? body.total : (Number.isFinite(body.count) ? body.count : rawList.length);
  } else if (rawData && typeof rawData === 'object') {
    if (Array.isArray(rawData.records)) rawList = rawData.records;
    else if (Array.isArray(rawData.list)) rawList = rawData.list;
    else if (Array.isArray(rawData.content)) rawList = rawData.content;
    else if (Array.isArray(rawData.items)) rawList = rawData.items;
    else if (Array.isArray(rawData.rows)) rawList = rawData.rows;

    const possibleTotal = rawData.total != null ? rawData.total : (rawData.totalCount != null ? rawData.totalCount : (body.total != null ? body.total : (body.count != null ? body.count : rawList.length)));
    total = Number.isFinite(Number(possibleTotal)) ? Number(possibleTotal) : rawList.length;
  } else if (rawData == null && (Array.isArray(body.records) || Array.isArray(body.list))) {
    rawList = body.records || body.list;
    total = Number.isFinite(body.total) ? body.total : rawList.length;
  } else if (rawData == null) {
    rawList = [];
    total = 0;
  } else {
    throw new Error('酒文化知识格式异常，请稍后重试');
  }

  const items = [];
  rawList.forEach((row, index) => {
    const norm = normalizeKnowledgeItem(row, index);
    if (norm) items.push(norm);
  });

  return {
    items,
    page,
    size,
    total: Math.max(total, items.length)
  };
}

function getCacheKey(baseUrl, page, size) {
  return CACHE_PREFIX + baseUrl + '_' + page + '_' + size;
}

function getCachedKnowledge({ page = 1, size = 20 } = {}) {
  const { page: p, size: s } = sanitizePagination(page, size);
  const baseUrl = welinkClient.resolveBaseUrl ? welinkClient.resolveBaseUrl() : '';
  const memKey = baseUrl + '_' + p + '_' + s;

  if (memory.has(memKey)) {
    return memory.get(memKey);
  }

  try {
    if (typeof wx !== 'undefined' && wx.getStorageSync) {
      const saved = wx.getStorageSync(getCacheKey(baseUrl, p, s));
      if (saved && saved.baseUrl === baseUrl && saved.result && Array.isArray(saved.result.items)) {
        const entry = { result: saved.result, updatedAt: saved.updatedAt || 0 };
        memory.set(memKey, entry);
        return entry;
      }
    }
  } catch (_) {
    // Storage 异常不阻断
  }
  return null;
}

function loadKnowledge({ page = 1, size = 20, force = false } = {}) {
  const { page: p, size: s } = sanitizePagination(page, size);
  const baseUrl = welinkClient.resolveBaseUrl ? welinkClient.resolveBaseUrl() : '';
  const memKey = baseUrl + '_' + p + '_' + s;

  const cached = getCachedKnowledge({ page: p, size: s });
  if (!force && cached && Date.now() - cached.updatedAt < FRESH_FOR) {
    return Promise.resolve(cached.result);
  }

  if (pending.has(memKey)) {
    return pending.get(memKey);
  }

  const task = new Promise((resolve, reject) => {
    if (typeof welinkClient.requestPublic !== 'function') {
      return reject(new Error('welinkClient.requestPublic 未就绪'));
    }

    welinkClient.requestPublic({
      url: PATH,
      method: 'POST',
      data: { page: p, size: s },
      raw: true
    }).then(body => {
      const currentBase = welinkClient.resolveBaseUrl ? welinkClient.resolveBaseUrl() : '';
      if (currentBase !== baseUrl) {
        return reject(new Error('数据来源已变更，请重新加载'));
      }

      try {
        const result = normalizeKnowledgeResponse(body, p, s);
        const entry = { result, updatedAt: Date.now() };
        memory.set(memKey, entry);
        try {
          if (typeof wx !== 'undefined' && wx.setStorageSync) {
            wx.setStorageSync(getCacheKey(baseUrl, p, s), {
              baseUrl,
              result,
              updatedAt: entry.updatedAt
            });
          }
        } catch (_) {}
        resolve(result);
      } catch (normErr) {
        reject(normErr);
      }
    }).catch(err => {
      reject(err);
    });
  });

  const tracked = task.finally(() => {
    if (pending.get(memKey) === tracked) {
      pending.delete(memKey);
    }
  });

  pending.set(memKey, tracked);
  return tracked;
}

module.exports = {
  loadKnowledge,
  getCachedKnowledge,
  normalizeKnowledgeItem,
  normalizeKnowledgeResponse,
  stripHtml,
  sanitizePagination
};
