const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { calculateGuessScore } = require('../miniprogram/utils/scoring');

function makePage(existing = null) {
  let page;
  const saved = [], navigations = [];
  const storage = {
    AROMA_TYPES: ['清香型'], DEGREE_OPTIONS: ['53°'],
    getSamples: () => [{ sampleId: 'sample-1', number: 1 }],
    getCurrentUser: () => ({ userId: 'user-1' }),
    getGuesses: () => existing ? [existing] : [],
    saveUserGuess(value) { saved.push(value); }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../miniprogram/packages/blind/pages/tasting/tasting.js'), 'utf8'), {
    Page(definition) { page = definition; },
    wx: { navigateTo(options) { navigations.push(options); } },
    require(name) {
      return name.includes('storage') ? storage : { searchLiquors: () => [], refreshLiquors: async () => ({ source: 'builtin', error: '' }) };
    }
  });
  page.setData = function (values) { Object.assign(this.data, values); };
  page.onLoad({ roomId: 'room-1', sampleIndex: '0' });
  return { page, saved, navigations };
}

test('stars select 1-10 independently and save with the sample without changing guessing fields', () => {
  const { page, saved, navigations } = makePage();
  page.selectAroma({ currentTarget: { dataset: { val: '清香型' } } });
  page.selectLikeLevel({ currentTarget: { dataset: { value: 8 } } });
  assert.equal(page.data.guess.likeLevel, 8);
  page.selectLikeLevel({ currentTarget: { dataset: { value: 8 } } });
  assert.equal(page.data.guess.likeLevel, 7.5);
  page.selectLikeLevel({ currentTarget: { dataset: { value: 8 } } });
  assert.equal(page.data.guess.likeLevel, 8);
  page.selectLikeLevel({ currentTarget: { dataset: { value: 7.5, exact: true } } });
  assert.equal(page.data.guess.likeLevel, 7.5);
  assert.equal(page.data.guess.aromaType, '清香型');
  assert.equal(page.data.guess.year, '2022');
  page.selectLikeLevel({ currentTarget: { dataset: { value: 3 } } });
  assert.equal(page.data.guess.likeLevel, 3);
  for (const invalid of [0, 10.5, 11, 1.3, 'bad']) {
    page.selectLikeLevel({ currentTarget: { dataset: { value: invalid } } });
    assert.equal(page.data.guess.likeLevel, 3);
  }
  page.nextToScoring();
  assert.equal(saved.length, 1);
  assert.equal(saved[0].likeLevel, 3);
  assert.equal(saved[0].aromaType, '清香型');
  assert.equal(saved[0].overall, undefined);
  assert.match(navigations[0].url, /scoring\/scoring\?roomId=room-1&sampleIndex=0/);
});

test('a previously saved preference is restored when revisiting the same sample', () => {
  const { page } = makePage({ sampleId: 'sample-1', brand: '汾酒', likeLevel: 7.5 });
  assert.equal(page.data.guess.likeLevel, 7.5);
  assert.equal(page.data.guess.brand, '汾酒');
  const other = makePage({ sampleId: 'another-sample', likeLevel: 10 });
  assert.equal(other.page.data.guess.likeLevel, 0);
});

test('preference does not affect the existing guess score', () => {
  const real = { brand: '汾酒', product: '青花20', aromaType: '清香型', alcoholDegree: '53°', year: '2022', marketPrice: 500 };
  const guess = { brand: '汾酒', product: '青花20', aromaType: '清香型', alcoholDegree: '53°', year: '2022', estimatedPrice: 500 };
  const baseline = calculateGuessScore(real, guess);
  assert.equal(calculateGuessScore(real, { ...guess, likeLevel: 1 }).totalScore, baseline.totalScore);
  assert.equal(calculateGuessScore(real, { ...guess, likeLevel: 7.5 }).totalScore, baseline.totalScore);
  assert.equal(calculateGuessScore(real, { ...guess, likeLevel: 10 }).totalScore, baseline.totalScore);
  assert.equal(baseline.totalScore, 100);
});
