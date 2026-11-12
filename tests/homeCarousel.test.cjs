const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const pagePath = path.join(__dirname, '../miniprogram/pages/index/index.js');
const pageSource = fs.readFileSync(pagePath, 'utf8');

function makeHomePage(notes = []) {
  let page;
  const wx = {
    getStorageSync(k) { return k === 'mz_privacy_ack_v1' ? true : notes; },
    setStorageSync() {},
    navigateTo() {},
    switchTab() {},
    stopPullDownRefresh() {},
    showToast() {},
    showModal() {}
  };
  vm.runInNewContext(pageSource, {
    Page(def) { page = def; },
    wx,
    require(id) {
      if (id === '../../services/storage') return { getCurrentUser: () => ({ userId: 'u1' }) };
      if (id === '../../services/journalContext') return { presentNote: note => note };
      if (id === '../../services/homeProgress') return { getHomeOverview: () => ({ active: null, latestResult: null, membership: null }) };
      if (id === '../../utils/knowledgeNavigation') return { open: () => {} };
      if (id === '../../utils/liquorKnowledge') return { articles: [] };
      if (id === '../../services/journal') return { all: () => notes };
      throw new Error('Unexpected dependency: ' + id);
    }
  }, { filename: pagePath });
  page.data = structuredClone(page.data);
  page.setData = function (patch) { Object.assign(this.data, patch); };
  return page;
}

test('home hero displays single enlarged SVG Li Bai pose (libai-home.svg) with calligraphy title', () => {
  const page = makeHomePage([{ id: 'n1', title: '55', date: '2026.10.27', aromaType: '董香型' }]);
  page.onShow();
  const homeWxml = fs.readFileSync(path.join(__dirname, '../miniprogram/pages/index/index.wxml'), 'utf8');
  assert.equal(homeWxml.includes('/assets/brand/home-hero-title.svg'), true);
  assert.equal(homeWxml.includes('/assets/brand/libai-home.svg'), true);
  assert.equal(homeWxml.includes('swiper'), false);

  const pageChecks = [
    ['gather/gather.wxml', '/assets/brand/gather-hero-title.svg', '/assets/brand/libai-gather.svg'],
    ['knowledge/knowledge.wxml', '/assets/brand/knowledge-hero-title.svg', '/assets/brand/libai-knowledge.svg'],
    ['mine/mine.wxml', '/assets/brand/mine-hero-title.svg', '/assets/brand/libai-mine.svg']
  ];
  for (const [wxmlRel, titleAsset, poseAsset] of pageChecks) {
    const wxml = fs.readFileSync(path.join(__dirname, '../miniprogram/pages', wxmlRel), 'utf8');
    assert.equal(wxml.includes(titleAsset), true, wxmlRel + ' missing ' + titleAsset);
    assert.equal(wxml.includes(poseAsset), true, wxmlRel + ' missing ' + poseAsset);
    assert.equal(fs.existsSync(path.join(__dirname, '../miniprogram', titleAsset)), true, titleAsset);
    assert.equal(fs.existsSync(path.join(__dirname, '../miniprogram', poseAsset)), true, poseAsset);
  }
});
