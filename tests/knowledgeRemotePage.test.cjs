const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function loadPage(remoteResult) {
  let definition;
  global.wx = {
    getStorageSync: () => null, setStorageSync() {}, pageScrollTo() {}, showToast() {}
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
  definition.setData = function (value) { Object.assign(this.data, value); };
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
