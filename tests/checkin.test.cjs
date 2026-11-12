const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const kb = require('../miniprogram/utils/liquorKnowledge');

function makePage({ offline = false, saveError = false, rooms = [] } = {}) {
  let page;
  const saved = [], navigations = [], scrolls = [], toasts = [];
  const catalogue = [{ product: '青花汾酒', brand: '汾酒', aromaType: '清香型' }];
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../miniprogram/pages/checkin/checkin.js'), 'utf8'), {
    Page(definition) { page = definition; },
    wx: {
      pageScrollTo(options) { scrolls.push(options); },
      redirectTo(options) { navigations.push(options); },
      showToast(options) { toasts.push(options); }
    },
    require(name) {
      if (name === '../../services/journal') return { save(value) {
        if (saveError) throw new Error('存储空间不足');
        saved.push(value);
        return { id: 'saved-note' };
      } };
      if (name === '../../services/journalContext') return { getRoomOptions: () => rooms };
      if (name === '../../services/storage') return { getCurrentUser: () => ({ userId: 'me' }) };
      if (name.includes('liquorKnowledge')) return kb;
      return {
        searchLiquors(query) { return query ? catalogue : []; },
        async refreshLiquors() { return { source: offline ? 'builtin' : 'remote', error: offline ? '网络不可用' : '' }; }
      };
    }
  });
  page.setData = function (values) { Object.assign(this.data, values); };
  page.onLoad();
  return { page, saved, navigations, scrolls, toasts, catalogue };
}

function toggle(page, group, id) {
  page.toggleTerm({ currentTarget: { dataset: { group, id } } });
}

test('blank wine name stays in the form and points back to the required field', () => {
  const { page, saved, navigations, scrolls } = makePage();
  page.submit({ detail: { value: { title: '   ', note: '保留已填内容' } } });
  assert.equal(saved.length, 0);
  assert.equal(navigations.length, 0);
  assert.equal(page.data.saving, false);
  assert.equal(page.data.titleFocused, true);
  assert.match(page.data.titleError, /酒名或盲样编号/);
  assert.equal(scrolls[0].selector, '#wine-section');
  page.onTitleInput({ detail: { value: '01 号盲样' } });
  assert.equal(page.data.titleError, '');
});

test('multi-select and deselect keep counts and saved flavour words consistent', () => {
  const { page, saved, navigations } = makePage();
  const first = page.data.groups[0];
  const [one, two] = first.terms;
  toggle(page, first.id, one.id);
  toggle(page, first.id, two.id);
  assert.equal(page.data.groups[0].selectedCount, 2);
  toggle(page, first.id, one.id);
  assert.equal(page.data.groups[0].selectedCount, 1);
  assert.equal(page.data.groups[1].selectedCount, 0);
  page.submit({ detail: { value: { title: '01 号盲样', [first.id]: '自己的描述', note: '今夜小聚' } } });
  assert.equal(saved.length, 1);
  assert.equal(saved[0][first.id], '自己的描述；' + two.label);
  assert.deepEqual(Array.from(saved[0].flavorTagIds[first.id]), [two.id]);
  assert.equal(saved[0].note, '今夜小聚');
  assert.equal(navigations[0].url, '/pages/card/card?id=saved-note');
});

test('offline manual entry can save with all optional fields empty', async () => {
  const { page, saved } = makePage({ offline: true });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(page.data.catalogSource, 'builtin');
  assert.equal(page.data.catalogLoading, false);
  page.submit({ detail: { value: { title: '我的盲样' } } });
  assert.equal(saved.length, 1);
  assert.equal(saved[0].aroma, '');
  assert.equal(saved[0].taste, '');
  assert.equal(saved[0].finish, '');
});

test('catalogue choice clears required-field error and fills aroma without changing selections', () => {
  const { page, catalogue } = makePage();
  const first = page.data.groups[0];
  toggle(page, first.id, first.terms[0].id);
  page.setData({ titleError: '必填', suggestions: catalogue });
  page.applyWineSuggestion({ currentTarget: { dataset: { item: catalogue[0] } } });
  assert.equal(page.data.title, '青花汾酒');
  assert.equal(page.data.aromas[page.data.index], '清香型');
  assert.equal(page.data.titleError, '');
  assert.equal(page.data.suggestions.length, 0);
  assert.equal(page.data.groups[0].selectedCount, 1);
});

test('storage failure releases saving state and never leaves the form', () => {
  const { page, navigations, toasts } = makePage({ saveError: true });
  page.submit({ detail: { value: { title: '01 号盲样' } } });
  assert.equal(page.data.saving, false);
  assert.equal(navigations.length, 0);
  assert.equal(toasts[0].title, '存储空间不足');
});

test('a room and blind sample stay attached to the note with a truthful room snapshot', () => {
  const rooms = [{
    roomId: 'room_real', name: '春夜品鉴', status: 'playing', sampleCount: 2, memberCount: 4,
    samples: [{ sampleId: 'sample-1', label: '01号盲样', product: '', aromaType: '' }, { sampleId: 'sample-2', label: '02号盲样', product: '', aromaType: '' }]
  }];
  const { page, saved } = makePage({ rooms });
  assert.equal(page.data.roomIndex, -1);
  page.chooseRoom({ detail: { value: 0 } });
  page.chooseSample({ detail: { value: 0 } });
  assert.equal(page.data.title, '01号盲样');
  assert.equal(page.data.selectedSample.product, '', 'Writing a note must not reveal a blind sample');
  page.submit({ detail: { value: { title: page.data.title, note: '与同席朋友一起记录' } } });
  assert.equal(saved[0].roomId, 'room_real');
  assert.equal(saved[0].sampleId, 'sample-1');
  assert.deepEqual({ ...saved[0].roomSnapshot }, { roomId: 'room_real', name: '春夜品鉴', sampleCount: 2, memberCount: 4 });
});

test('an explicit room route preselects context and manual wine names are preserved', () => {
  const rooms = [{ roomId: 'room_real', name: '春夜品鉴', status: 'revealed', sampleCount: 1, memberCount: 3,
    samples: [{ sampleId: 'sample-1', label: '01号酒', product: '已揭晓酒款', aromaType: '清香型' }] }];
  const { page } = makePage({ rooms });
  page.onLoad({ roomId: 'room_real', sampleId: 'sample-1' });
  assert.equal(page.data.selectedRoom.roomId, 'room_real');
  assert.equal(page.data.selectedSample.sampleId, 'sample-1');
  assert.equal(page.data.aromas[page.data.index], '清香型');
  page.onTitleInput({ detail: { value: '我的这杯' } });
  page.chooseSample({ detail: { value: 0 } });
  assert.equal(page.data.title, '我的这杯');
});
