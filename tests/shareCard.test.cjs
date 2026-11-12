const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function makePage(note, canvasReady = true) {
  const draws = [];
  const ctx = {
    fillRect() {}, strokeRect() {}, drawImage() {},
    measureText(s) { return { width: Array.from(s).length * 26 }; },
    fillText(value, x, y) { draws.push({ value, y }); }
  };
  const canvas = { getContext: () => ctx };
  const identity = {
    getUser: () => ({ nickname: '品鉴客', avatar: '' }),
    hasCompletedProfile: () => true,
    loadCanvasImage: (canvas, path) => Promise.resolve({ width: 100, height: 100 }),
    drawCanvasAvatar: (canvas, ctx, x, y, r, avatar, check) => Promise.resolve()
  };
  const wx = {
    canvasToTempFilePath({ success }) { success({ tempFilePath: '/tmp/card.png' }); },
    showToast() {}, switchTab() {}, navigateTo() {}, previewImage() {}
  };
  let page;
  const source = fs.readFileSync(path.join(__dirname, '../miniprogram/pages/card/card.js'), 'utf8');
  vm.runInNewContext(source, {
    Page(definition) { page = definition; }, wx,
    require(name) { return name.includes('journal') ? { get: () => note } : identity; }
  });
  page.data = { ...page.data, note };
  page.setData = function (updates) { Object.assign(this.data, updates); };
  page.createSelectorQuery = () => ({ select: () => ({ fields: () => ({ exec: cb => cb(canvasReady ? [{ node: canvas }] : []) }) }) });
  return { page, draws, canvas, wx };
}

test('long tasting notes generate a bounded card with clear truncation and share the home page', async () => {
  const long = '酱香和果香'.repeat(45);
  const { page, draws, canvas } = makePage({ title: long, date: '2026.10.30', aromaType: '酱香型', aroma: long, taste: long, finish: long, note: long });
  page.renderCard();
  await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal(page.data.busy, false);
  assert.equal(page.data.imagePath, '/tmp/card.png');
  assert.equal(canvas.height, 1200);
  assert(draws.some(d => String(d.value).endsWith('…')));
  const noteLabel = draws.find(d => d.value === '此刻的手记');
  const author = draws.find(d => d.value === '品鉴客');
  assert(noteLabel.y < 1034 && author.y > 1034);
  const share = page.onShareAppMessage();
  assert.equal(share.path, '/pages/index/index');
  assert.equal(share.imageUrl, '/tmp/card.png');
});

test('failed canvas setup releases loading and exposes retry state', () => {
  const { page } = makePage({ title: '酒' }, false);
  page.renderCard();
  assert.equal(page.data.busy, false);
  assert.equal(page.data.renderError, true);
  assert.equal(page.data.imagePath, '');
});

test('saving uses the generated image and opens settings only after confirmation', () => {
  const { page, wx } = makePage({ title: '酒' });
  page.data.imagePath = '/tmp/card.png';
  let savedPath, modal, opened = 0;
  wx.saveImageToPhotosAlbum = options => { savedPath = options.filePath; options.fail(); };
  wx.showModal = options => { modal = options; };
  wx.openSetting = () => { opened++; };
  page.save();
  assert.equal(savedPath, '/tmp/card.png');
  assert.equal(opened, 0);
  modal.success({ confirm: false });
  assert.equal(opened, 0);
  modal.success({ confirm: true });
  assert.equal(opened, 1);
});

test('room posters keep long wine names and nicknames within their cards and preserve the score', async () => {
  let page;
  const draws = [];
  const ctx = {
    scale() {}, fillRect() {}, strokeRect() {},
    measureText(value) { return { width: Array.from(String(value)).length * 8 }; },
    fillText(value, x, y) { draws.push({ value, x, y, width: this.measureText(value).width }); }
  };
  const canvas = { getContext: () => ctx };
  const selector = { select() { return this; }, fields() { return this; }, exec(cb) { cb([{ node: canvas }]); } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../miniprogram/packages/blind/pages/report/report.js'), 'utf8'), {
    Page(definition) { page = definition; },
    wx: {
      showLoading() {}, hideLoading() {}, getSystemInfoSync: () => ({ pixelRatio: 2 }),
      createSelectorQuery: () => selector,
      canvasToTempFilePath(options) { options.success({ tempFilePath: '/tmp/report.png' }); }
    },
    require(name) { return name.includes('identity') ? { drawCanvasAvatar: async () => {} } : {}; }
  });
  page.setData = function (values) { Object.assign(this.data, values); };
  const long = '长酒款名称🍶'.repeat(20);
  page.data.room = { name: long };
  page.data.insights = {
    mostPopular: { brand: long, product: long, avgOverall: 9.3 },
    biggestDarkHorse: { brand: long, product: long, marketPrice: 1499, avgEstimatedPrice: 1600 },
    topGuesser: { nickname: long, totalScore: 256 }
  };
  page.generatePoster();
  await new Promise(resolve => setImmediate(resolve));
  for (const y of [74, 194, 309, 424]) {
    const draw = draws.find(row => row.y === y);
    assert(draw.x + draw.width <= 304, 'poster text exceeds its card at y=' + y);
    assert(draw.value.includes('…'));
  }
  assert(draws.find(row => row.y === 424).value.endsWith('(得分: 256分)'));
  assert.equal(page.data.posterUrl, '/tmp/report.png');
});
