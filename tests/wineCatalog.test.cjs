const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../miniprogram/config');
const publicURL = 'https://applet.51welink.com/taste/public/wineType';
const rows = [
  { id: 1, brand: '贵州茅台', product: '飞天茅台 (53%vol)', aromaType: '酱香型', degree: '53°', defaultPrice: '2800' },
  { id: 18, brand: '泸州老窖', product: '国窖1573', aromaType: '浓香型', degree: '52°', defaultPrice: '980' }
];

test('public wine catalogue contracts and consuming pages', async t => {
  const originalBase = config.WELINK_BASE_URL;
  const originalWx = global.wx;
  const originalPage = global.Page;
  let saved;
  let calls;
  let handler;
  function reset() {
    saved = {};
    calls = [];
    config.WELINK_BASE_URL = originalBase;
    global.wx = {
      getStorageSync: key => saved[key],
      setStorageSync: (key, value) => { saved[key] = value; },
      request: options => { calls.push(options); handler(options); },
      showToast() {}
    };
    for (const path of ['../miniprogram/services/wineCatalog', '../miniprogram/utils/liquorDb']) {
      delete require.cache[require.resolve(path)];
    }
    return {
      service: require('../miniprogram/services/wineCatalog'),
      db: require('../miniprogram/utils/liquorDb')
    };
  }
  function succeed(options) {
    options.success({ statusCode: 200, header: { 'Set-Cookie': 'JSESSIONID=PUBLIC_IGNORED' }, data: { code: '00000', count: 0, data: rows } });
  }
  function pageAt(path) {
    let definition;
    global.Page = value => { definition = value; };
    delete require.cache[require.resolve(path)];
    require(path);
    const page = { data: structuredClone(definition.data), setData(value) { Object.assign(this.data, value); } };
    for (const [key, value] of Object.entries(definition)) if (typeof value === 'function') page[key] = value.bind(page);
    return page;
  }
  t.after(() => { config.WELINK_BASE_URL = originalBase; global.wx = originalWx; global.Page = originalPage; });

  await t.test('accepts actual string success code and data length despite count zero; shares one public GET', async () => {
    const { service } = reset();
    handler = options => setImmediate(() => succeed(options));
    saved.mz_welink_session = { cookie: 'JSESSIONID=PRIVATE', openid: 'private-user' };
    const [one, two] = await Promise.all([service.loadWineCatalog(), service.loadWineCatalog()]);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, publicURL);
    assert.equal(calls[0].method, 'GET');
    assert.deepEqual(calls[0].header, { Accept: 'application/json' });
    assert.equal(one.length, 2);
    assert.equal(one[0].defaultPrice, 2800);
    assert.deepEqual(one, two);
    assert.deepEqual(saved.mz_welink_session, { cookie: 'JSESSIONID=PRIVATE', openid: 'private-user' });
    await service.loadWineCatalog();
    assert.equal(calls.length, 1, 'fresh catalogue must not refetch on every page');
  });

  await t.test('failed and malformed refreshes retain last successful catalogue', async () => {
    const { service, db } = reset();
    handler = succeed;
    await service.loadWineCatalog();
    handler = options => options.success({ statusCode: 200, data: { code: '00000', data: [{ brand: 'incomplete' }] } });
    const invalid = await db.refreshLiquors({ force: true });
    assert.equal(invalid.source, 'cache');
    assert.equal(invalid.list.length, 2);
    handler = options => options.fail({ errMsg: 'offline' });
    const offline = await db.refreshLiquors({ force: true });
    assert.equal(offline.source, 'cache');
    assert.equal(db.searchLiquors('国窖')[0].product, '国窖1573');
    assert.ok(offline.error);
  });

  await t.test('first offline use retains manual-entry suggestions and distinguishes builtin source', async () => {
    const { db } = reset();
    handler = options => options.fail({ errMsg: 'offline' });
    const fallback = await db.refreshLiquors();
    assert.equal(fallback.source, 'builtin');
    assert.ok(fallback.list.length > 0);
    assert.ok(db.searchLiquors('茅台').length > 0);
  });

  await t.test('base changes discard late response and never use another base cache', async () => {
    const { service } = reset();
    let old;
    handler = options => { old = options; };
    const request = service.loadWineCatalog();
    config.WELINK_BASE_URL = 'https://other.example';
    succeed(old);
    await assert.rejects(request, /来源已变更/);
    assert.equal(service.getCachedWineCatalog(), null);
    assert.equal(saved.mz_public_wine_catalog_v1, undefined);
  });

  await t.test('empty catalogue stays empty; missing or invalid price stays unknown', async () => {
    const { service, db } = reset();
    handler = options => options.success({ statusCode: 200, data: { code: '00000', data: [] } });
    assert.deepEqual(await service.loadWineCatalog(), []);
    assert.deepEqual(db.searchLiquors('茅台'), []);
    const normalized = service.normalizeWineList(rows.map(row => ({ ...row, defaultPrice: 'unknown' })));
    assert.equal(normalized[0].defaultPrice, null);
    handler = options => options.success({ statusCode: 401, data: { code: '00000', data: rows } });
    await assert.rejects(service.loadWineCatalog({ force: true }));
  });

  await t.test('check-in and online selection use catalogue rows without overwriting another wine', async () => {
    const { service } = reset();
    handler = succeed;
    await service.loadWineCatalog();
    const checkin = pageAt('../miniprogram/pages/checkin/checkin.js');
    checkin.onTitleInput({ detail: { value: '国窖' } });
    assert.equal(checkin.data.suggestions[0].product, '国窖1573');
    checkin.applyWineSuggestion({ currentTarget: { dataset: { item: checkin.data.suggestions[0] } } });
    assert.equal(checkin.data.title, '国窖1573');
    assert.equal(checkin.data.aromas[checkin.data.index], '浓香型');
    const online = pageAt('../miniprogram/packages/online/pages/create/create.js');
    online.data.names = ['第一款手填酒', ''];
    online.onNameInput({ currentTarget: { dataset: { index: 1 } }, detail: { value: '茅台' } });
    online.applyWineSuggestion({ currentTarget: { dataset: { index: 1, item: online.data.suggestions[0] } } });
    assert.equal(online.data.names[0], '第一款手填酒');
    assert.equal(online.data.names[1], '贵州茅台 · 飞天茅台 (53%vol)');
  });
});
