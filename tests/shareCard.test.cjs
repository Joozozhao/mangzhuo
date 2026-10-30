const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function makePage(note, canvasReady = true) {
  const draws = [];
  const ctx = {
    fillRect() {}, drawImage() {},
    measureText(s) { return { width: Array.from(s).length * 26 }; },
    fillText(value, x, y) { draws.push({ value, y }); }
  };
  const canvas = { getContext: () => ctx };
  const identity = {
    getUser: () => ({ nickname: '品鉴客', avatar: '' }),
    hasCompletedProfile: () => true,
    loadCanvasImage: () => Promise.resolve(null),
    drawCanvasAvatar: () => Promise.resolve()
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
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(page.data.busy, false);
  assert.equal(page.data.imagePath, '/tmp/card.png');
  assert.equal(canvas.height, 1200);
  assert(draws.some(d => String(d.value).endsWith('…')));
  const noteLabel = draws.find(d => d.value === '品鉴随记');
  const author = draws.find(d => d.value === '品鉴客');
  assert(noteLabel.y < 1048 && author.y > 1048);
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
