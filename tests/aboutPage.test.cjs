const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const pagePath = path.join(__dirname, '../miniprogram/pages/about/about.js');
const pageSource = fs.readFileSync(pagePath, 'utf8');

function makeAboutPage() {
  let page;
  let clipboardData = null;
  let toastOptions = null;
  const wx = {
    setClipboardData(opts) {
      clipboardData = opts.data;
      if (opts.success) opts.success();
    },
    showToast(opts) {
      toastOptions = opts;
    }
  };
  vm.runInNewContext(pageSource, {
    Page(def) { page = def; },
    wx
  }, { filename: pagePath });
  page.data = structuredClone(page.data);
  page.setData = function (patch) { Object.assign(this.data, patch); };
  return { page, getClipboard: () => clipboardData, getToast: () => toastOptions };
}

test('about page renders version and provides contact copy handler', () => {
  const { page, getClipboard, getToast } = makeAboutPage();
  assert.equal(page.data.version, '1.0.0');
  page.copyContact();
  assert.equal(getClipboard(), 'support@mangzhuo.app');
  assert.equal(getToast().title, '已复制联系邮箱');

  const wxml = fs.readFileSync(path.join(__dirname, '../miniprogram/pages/about/about.wxml'), 'utf8');
  assert.equal(wxml.includes('about-hero-ticket'), true);
  assert.equal(wxml.includes('warning-ticket'), true);
  assert.equal(wxml.includes('rule-ledger'), true);
  assert.equal(wxml.includes('hero-seal'), true);
});
