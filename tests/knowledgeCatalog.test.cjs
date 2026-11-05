const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../miniprogram/config');

test('knowledgeCatalog public service unit tests', async t => {
  const originalBase = config.WELINK_BASE_URL;
  const originalWx = global.wx;
  let savedStorage;
  let publicCalls;
  let publicHandler;

  function reset() {
    savedStorage = {};
    publicCalls = [];
    config.WELINK_BASE_URL = originalBase;

    global.wx = {
      getStorageSync: key => savedStorage[key],
      setStorageSync: (key, val) => { savedStorage[key] = val; }
    };

    const welinkClientPath = require.resolve('../miniprogram/services/welinkClient');
    delete require.cache[welinkClientPath];
    const welinkClient = require('../miniprogram/services/welinkClient');

    welinkClient.requestPublic = options => {
      publicCalls.push(options);
      return new Promise((resolve, reject) => {
        if (!publicHandler) return reject(new Error('No handler set'));
        publicHandler(options, resolve, reject);
      });
    };

    const servicePath = require.resolve('../miniprogram/services/knowledgeCatalog');
    delete require.cache[servicePath];
    const service = require('../miniprogram/services/knowledgeCatalog');

    return { service, welinkClient };
  }

  t.after(() => {
    config.WELINK_BASE_URL = originalBase;
    global.wx = originalWx;
  });

  await t.test('1. sanitizePagination handles bounds and illegal inputs safely', () => {
    const { service } = reset();
    assert.deepEqual(service.sanitizePagination('1', '20'), { page: 1, size: 20 });
    assert.deepEqual(service.sanitizePagination(0, -5), { page: 1, size: 20 });
    assert.deepEqual(service.sanitizePagination('abc', null), { page: 1, size: 20 });
    assert.deepEqual(service.sanitizePagination(2, 200), { page: 2, size: 100 });
  });

  await t.test('2. stripHtml cleans script, style, html tags, entities safely', () => {
    const { service } = reset();
    const raw = '<p>第一段 &nbsp; &amp; &lt;测试&gt;</p><script>alert(1)</script><style>body { color: red; }</style><p>第二段</p>';
    const cleaned = service.stripHtml(raw);
    assert.ok(!cleaned.includes('<p>'));
    assert.ok(!cleaned.includes('alert'));
    assert.ok(!cleaned.includes('color: red'));
    assert.ok(cleaned.includes('第一段   & <测试>'));
    assert.ok(cleaned.includes('第二段'));
  });

  await t.test('3. normalizeKnowledgeItem produces exact target schema and does not invent facts', () => {
    const { service } = reset();
    const raw = {
      id: 123,
      title: '<b>白酒酿造的奥秘</b>',
      category: '酿造工艺',
      content: '<p>高粱是主要原料。</p><p>经过发酵蒸馏而成。</p>',
      summary: '揭开酿造的面纱',
      createTime: '2026-11-01',
      coverUrl: 'https://example.com/cover.png'
    };
    const item = service.normalizeKnowledgeItem(raw, 0);
    assert.equal(item.type, 'remote-article');
    assert.equal(item.id, '123');
    assert.equal(item.title, '白酒酿造的奥秘');
    assert.equal(item.category, '酿造工艺');
    assert.equal(item.desc, '揭开酿造的面纱');
    assert.deepEqual(item.paragraphs, ['高粱是主要原料。', '经过发酵蒸馏而成。']);
    assert.deepEqual(item.facts, []);
    assert.deepEqual(item.sources, []);
    assert.deepEqual(item.related, []);
    assert.equal(item.tip, '');
    assert.equal(item.updated, '2026-11-01');
    assert.equal(item.coverUrl, 'https://example.com/cover.png');

    // Invalid item without title returns null
    assert.equal(service.normalizeKnowledgeItem({ category: '无标题' }, 1), null);
    assert.equal(service.normalizeKnowledgeItem(null, 2), null);
  });

  await t.test('4. normalizeKnowledgeResponse supports 00000 with records / list / array formats and empty page', () => {
    const { service } = reset();

    // array format
    const respArray = {
      code: '00000',
      data: [{ id: 'a1', title: '文章1', content: '内容1' }],
      total: 10
    };
    const res1 = service.normalizeKnowledgeResponse(respArray, 1, 20);
    assert.equal(res1.items.length, 1);
    assert.equal(res1.items[0].title, '文章1');
    assert.equal(res1.total, 10);

    // object with records
    const respRecords = {
      code: '00000',
      data: {
        records: [{ id: 'r1', name: '文章R', description: '描述R', text: '正文R' }],
        total: 50
      }
    };
    const res2 = service.normalizeKnowledgeResponse(respRecords, 2, 10);
    assert.equal(res2.items.length, 1);
    assert.equal(res2.items[0].title, '文章R');
    assert.equal(res2.items[0].desc, '描述R');
    assert.equal(res2.page, 2);
    assert.equal(res2.size, 10);
    assert.equal(res2.total, 50);

    // empty list does not throw error
    const respEmpty = { code: '00000', data: [] };
    const res3 = service.normalizeKnowledgeResponse(respEmpty, 1, 20);
    assert.deepEqual(res3.items, []);
    assert.equal(res3.total, 0);

    // error code throws and does not forge success
    assert.throws(() => {
      service.normalizeKnowledgeResponse({ code: '99999', msg: '失败' }, 1, 20);
    }, /失败/);
  });

  await t.test('5. loadKnowledge calls welinkClient.requestPublic with safe params and handles 00000 success', async () => {
    const { service } = reset();
    publicHandler = (opts, resolve) => {
      resolve({
        code: '00000',
        data: {
          records: [
            { id: 101, title: '酱香型白酒酿造', category: '香型', content: '<p>坤沙工艺详解</p>' }
          ],
          total: 1
        }
      });
    };

    const result = await service.loadKnowledge({ page: 1, size: 20 });
    assert.equal(publicCalls.length, 1);
    assert.equal(publicCalls[0].url, '/taste/public/knowledge');
    assert.equal(publicCalls[0].method, 'GET');
    assert.deepEqual(publicCalls[0].data, { page: 1, size: 20 });
    assert.equal(publicCalls[0].raw, true);

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].id, '101');
    assert.equal(result.items[0].title, '酱香型白酒酿造');
    assert.equal(result.items[0].type, 'remote-article');

    // Second call uses memory cache
    const cachedResult = await service.loadKnowledge({ page: 1, size: 20 });
    assert.equal(publicCalls.length, 1);
    assert.deepEqual(cachedResult, result);

    // getCachedKnowledge can read cached value
    const syncCached = service.getCachedKnowledge({ page: 1, size: 20 });
    assert.ok(syncCached);
    assert.deepEqual(syncCached.result.items, result.items);
  });

  await t.test('6. backend error or non-00000 code does not forge success', async () => {
    const { service } = reset();
    publicHandler = (opts, resolve, reject) => {
      const err = new Error('HTTP 403 Forbidden');
      err.statusCode = 403;
      reject(err);
    };

    await assert.rejects(
      () => service.loadKnowledge({ page: 1, size: 20 }),
      /403/
    );

    // Cache remains empty
    assert.equal(service.getCachedKnowledge({ page: 1, size: 20 }), null);
  });

  await t.test('7. baseUrl change isolates cache and discards inflight responses', async () => {
    const { service } = reset();
    let inflightResolve;
    publicHandler = (opts, resolve) => {
      inflightResolve = resolve;
    };

    const task = service.loadKnowledge({ page: 1, size: 20 });

    config.WELINK_BASE_URL = 'https://other.51welink.com';

    inflightResolve({
      code: '00000',
      data: [{ id: 1, title: '旧域名响应' }]
    });

    await assert.rejects(task, /数据来源已变更/);

    assert.equal(service.getCachedKnowledge({ page: 1, size: 20 }), null);
  });
});
