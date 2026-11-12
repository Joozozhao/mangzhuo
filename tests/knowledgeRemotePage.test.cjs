const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function loadPage(remoteResult, wxOverrides = {}) {
  let definition;
  global.wx = {
    getStorageSync: () => null, setStorageSync() {}, pageScrollTo() {}, showToast() {}, ...wxOverrides
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../miniprogram/pages/knowledge/knowledge.js'), 'utf8'), {
    Page(value) { definition = value; }, wx: global.wx, console,
    require(name) {
      if (name.endsWith('knowledgeCatalog')) return {
        loadKnowledge: () => remoteResult instanceof Error ? Promise.reject(remoteResult) : Promise.resolve(remoteResult),
        getCachedKnowledge: () => null
      };
      if (name.endsWith('liquorDb')) return { refreshLiquors: () => Promise.resolve({ list: [], source: 'builtin', error: '' }) };
      return require(require('node:path').join(__dirname, '../miniprogram/pages/knowledge', name));
    }
  });
  definition.data = JSON.parse(JSON.stringify(definition.data));
  definition.setData = function (value, callback) {
    Object.assign(this.data, value);
    if (callback) callback();
  };
  return definition;
}

test('knowledge page displays remote public articles and opens their detail', async () => {
  const page = loadPage({ items: [{ type: 'remote-article', id: 'a1', title: '公开酒文化', category: '酒文化', desc: '摘要', meta: '酒文化', paragraphs: ['正文'], facts: [], sources: [], related: [], tip: '', updated: '' }], page: 1, size: 20, total: 1 });
  page.onLoad();
  await new Promise(resolve => setImmediate(resolve));
  page.openArticles();
  assert.equal(page.data.results[0].title, '公开酒文化');
  page.openDetail('remote-article', 'a1');
  assert.equal(page.data.selected.paragraphs[0], '正文');
});

test('knowledge page retains local articles when the public endpoint is unavailable', async () => {
  const page = loadPage(new Error('403'));
  page.onLoad();
  await new Promise(resolve => setImmediate(resolve));
  page.openArticles();
  assert(page.data.results.length > 0);
  assert(page.data.results.every(item => item.type !== 'remote-article'));
  assert.match(page.data.remoteError, /暂不可用/);
});

test('closing an article restores the filtered list position and keeps its search', () => {
  const scrolls = [];
  const page = loadPage(null, { pageScrollTo: options => scrolls.push(options.scrollTop) });
  page.openArticles();
  page.search({ detail: { value: '曲' } });
  page.chooseCategory({ currentTarget: { dataset: { category: '酿造工艺' } } });
  const ids = page.data.results.map(row => row.id);
  assert(ids.includes('qu_starter'));
  page.onPageScroll({ scrollTop: 640 });
  page.openDetail('article', 'qu_starter');
  assert.equal(scrolls.at(-1), 0);
  page.onPageScroll({ scrollTop: 120 });
  page.close();
  assert.equal(scrolls.at(-1), 640);
  assert.equal(page.data.query, '曲');
  assert.equal(page.data.articleCategory, '酿造工艺');
  assert.deepEqual(page.data.results.map(row => row.id), ids);
});

test('following related reading preserves the original list position', () => {
  const scrolls = [];
  const page = loadPage(null, { pageScrollTo: options => scrolls.push(options.scrollTop) });
  page.onPageScroll({ scrollTop: 420 });
  page.openDetail('brand', 'moutai');
  const related = page.data.selected.related[0];
  page.onPageScroll({ scrollTop: 900 });
  page.openRelated({ currentTarget: { dataset: related } });
  assert.equal(page.data.selected.id, related.id);
  page.onPageScroll({ scrollTop: 180 });
  page.close();
  assert.equal(scrolls.at(-1), 420);
});

test('closing a catalogue wine restores its list position', () => {
  const scrolls = [];
  const page = loadPage(null, { pageScrollTo: options => scrolls.push(options.scrollTop) });
  const wine = { brand: '测试品牌', product: '酒样 A' };
  page._catalogRows = [wine];
  page.onPageScroll({ scrollTop: 310 });
  page.openWine({ currentTarget: { dataset: wine } });
  assert.equal(page.data.selectedWine.product, wine.product);
  assert.equal(scrolls.at(-1), 0);
  page.onPageScroll({ scrollTop: 86 });
  page.close();
  assert.equal(page.data.selectedWine, null);
  assert.equal(scrolls.at(-1), 310);
});

test('reaching the bottom loads more articles only in the list', () => {
  const page = loadPage(null);
  page.openArticles();
  page.data.remoteHasMore = true;
  let loads = 0;
  page.loadRemoteKnowledge = () => { loads++; };
  page.onReachBottom();
  assert.equal(loads, 1);
  page.openDetail('article', 'qu_starter');
  page.onReachBottom();
  assert.equal(loads, 1);
  page.close();
  page.onReachBottom();
  assert.equal(loads, 2);
});
