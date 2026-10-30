const data = require('../data/liquor-knowledge.js');
const articles = require('./knowledge');

const sourceMap = {};
data.sources.forEach(source => { sourceMap[source.id] = source; });
const aromaMap = {};
data.aromas.forEach(aroma => { aromaMap[aroma.id] = aroma; });
const flavors = [];
data.flavorGroups.forEach(group => {
  group.terms.forEach(term => { flavors.push({ ...term, field: group.id, category: group.title }); });
});

function aromaForName(name) {
  const value = String(name || '').trim();
  return data.aromas.find(row => row.name === value || row.aliases.includes(value)) || null;
}

function sourcesFor(ids) {
  return (ids || []).map(id => sourceMap[id]).filter(Boolean).map(source => ({
    title: source.title,
    url: source.url,
    kind: source.kind,
    checkedAt: source.checkedAt
  }));
}

function listEntry(type, row) {
  if (type === 'aroma') return {
    type, id: row.id, title: row.name, category: '香型入门', desc: row.summary,
    meta: row.standard.code + ' · ' + row.standard.status
  };
  if (type === 'brand') return {
    type, id: row.id, title: row.name, category: '名酒档案', desc: row.summary,
    meta: row.region + ' · ' + aromaMap[row.aromaId].name
  };
  if (type === 'flavor') return {
    type, id: row.id, title: row.label, category: row.category, desc: row.desc,
    meta: row.category + ' · 感受记录词'
  };
  return {
    type: 'article', id: row.id, title: row.title, category: row.category, desc: row.desc,
    meta: row.category + ' · ' + row.minutes + ' 分钟阅读'
  };
}

const collections = {
  aromas: { type: 'aroma', rows: data.aromas },
  flavors: { type: 'flavor', rows: flavors },
  brands: { type: 'brand', rows: data.brands },
  articles: { type: 'article', rows: articles }
};

function search(section, query) {
  const collection = collections[section] || collections.aromas;
  const keyword = String(query || '').trim().toLowerCase();
  return collection.rows.filter(row => !keyword || JSON.stringify(row).toLowerCase().includes(keyword))
    .map(row => listEntry(collection.type, row));
}

function getDetail(type, id) {
  const collection = Object.keys(collections).map(key => collections[key]).find(item => item.type === type);
  if (!collection) return null;
  const row = collection.rows.find(item => item.id === id);
  if (!row) return null;
  const detail = {
    ...listEntry(type, row), paragraphs: row.paragraphs || [], facts: [],
    sources: sourcesFor(row.sourceIds), tip: row.tip || '', updated: data.updated, related: []
  };
  if (type === 'aroma') {
    detail.facts = [
      { label: '对应标准', value: row.standard.code },
      { label: '实施日期', value: row.standard.effective },
      { label: '核验状态', value: row.standard.status + '（' + data.updated + ' 核验）' }
    ];
    if (row.standard.previous) detail.facts.push({ label: '替代标准', value: row.standard.previous });
    if (row.standard.note) detail.paragraphs = [...detail.paragraphs, row.standard.note];
    detail.related = data.brands.filter(brand => brand.aromaId === row.id).map(brand => listEntry('brand', brand));
  } else if (type === 'brand') {
    const aroma = aromaMap[row.aromaId];
    detail.facts = [
      { label: '产地线索', value: row.region },
      { label: '学习酒款', value: row.products.join('、') },
      { label: '样例香型', value: aroma.name }
    ];
    detail.related = [listEntry('aroma', aroma)];
  } else if (type === 'flavor') {
    detail.paragraphs = [row.desc, row.example, '这是一种描述感受的词语。相似的气味联想不等于配料、品牌或香型鉴定。'];
    detail.tip = '实际感受到再选择，也可以使用自己的语言。';
  } else {
    detail.sources = row.sources;
    detail.updated = row.updated;
  }
  return detail;
}

function getFlavorGroups(selected) {
  const selection = selected || {};
  return data.flavorGroups.map(group => ({
    id: group.id, title: group.title, desc: group.desc,
    terms: group.terms.map(term => ({ id: term.id, label: term.label, selected: (selection[group.id] || []).includes(term.id) }))
  }));
}

function findForSample(sample) {
  const aroma = aromaForName(sample.aromaType);
  const brandName = String(sample.brand || '').replace(/\s+/g, '');
  // Use known brand names, not substrings such as "茅台镇". Also require the disclosed aroma to agree.
  const brand = aroma && data.brands.find(row => row.aromaId === aroma.id &&
    [row.name, ...row.aliases].some(alias => brandName === alias.replace(/\s+/g, '')));
  if (brand) return { type: 'brand', id: brand.id, title: brand.name + ' · 品牌酒识' };
  return aroma ? { type: 'aroma', id: aroma.id, title: aroma.name + ' · 香型酒识' } : null;
}

module.exports = {
  sections: [
    { id: 'aromas', step: '01', title: '认识香型', shortTitle: '香型入门', count: data.aromas.length, caption: '从酒标与酿造线索，认识不同香型' },
    { id: 'flavors', step: '02', title: '记录风味', shortTitle: '盲品风味', count: flavors.length, caption: '把闻香、入口、回味写成自己的话' },
    { id: 'brands', step: '03', title: '读具体酒款', shortTitle: '名酒档案', count: data.brands.length, caption: '用品牌与产品资料作学习样例' }
  ],
  articles,
  aromaOptions: data.aromas.map(row => row.name),
  updated: data.updated,
  scope: data.scope,
  search, getDetail, getFlavorGroups, findForSample
};
