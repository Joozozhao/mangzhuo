const test = require('node:test');
const assert = require('node:assert/strict');

// These tests use only isolated fake identities and never call the production service.
test('userInfo Bearer API contracts', async (t) => {
  const saved = {};
  const requests = [];
  global.wx = {
    getStorageSync: key => saved[key],
    setStorageSync: (key, value) => { saved[key] = value; },
    removeStorageSync: key => { delete saved[key]; },
    login({ success }) { success({ code: 'isolated_test_code' }); },
    request(options) {
      requests.push(options);
      if (options.url.endsWith('/wxLogin')) {
        return options.success({ statusCode: 200, data: { code: '00000', msg: '成功', data: {
          accessToken: 'isolated_access_token', openId: 'isolated_openid', userId: 28
        } } });
      }
      if (options.url.endsWith('/isolated_openid/get')) {
        return options.success({ statusCode: 200, data: { code: '00000', data: {
          id: 28, openId: 'isolated_openid', unionId: 'isolated_union', nickName: '隔离测试昵称', sex: 0,
          headerUrl: 'https://cdn.example.test/avatar.png'
        } } });
      }
      options.success({ statusCode: 200, data: { code: '00000', msg: '成功', data: null } });
    },
    uploadFile(options) {
      requests.push(options);
      options.success({ statusCode: 200, data: JSON.stringify({ code: '00000', data: { file_url: 'https://cdn.example.test/new-avatar.png' } }) });
    }
  };
  const client = require('../miniprogram/services/welinkClient');
  client.clearSession();

  await t.test('login accepts openId/accessToken and get returns authoritative profile', async () => {
    const session = await client.login({ nickName: '测试', avatarUrl: 'wxfile://not-a-public-avatar', sex: 0 });
    assert.equal(session.openid, 'isolated_openid');
    assert.equal(session.accessToken, 'isolated_access_token');
    assert.equal(session.userId, 28);
    assert.equal(requests[0].data.avatarUrl, '', 'Local file paths must not be sent as avatar URLs');
    const profile = await client.getUserInfo();
    assert.equal(profile.nickName, '隔离测试昵称');
    const get = requests[1];
    assert.equal(get.header.Authorization, 'Bearer isolated_access_token');
    assert.equal(get.method, 'GET');
  });

  await t.test('nickname uses updateNick once without requesting a new wx code', async () => {
    const result = await client.updateProfile('  新昵称  ');
    assert.deepEqual(result, { nickname: '新昵称' });
    const update = requests[2];
    assert(update.url.endsWith('/taste/userInfo/updateNick'));
    assert.equal(update.method, 'POST');
    assert.deepEqual(update.data, { openid: 'isolated_openid', nickname: '新昵称' });
    assert.equal(update.header.Authorization, 'Bearer isolated_access_token');
  });

  await t.test('avatar upload sends file/openid with Bearer and accepts file_url', async () => {
    const url = await client.uploadAvatar('http://tmp/chosen-avatar.png');
    assert.equal(url, 'https://cdn.example.test/new-avatar.png');
    const upload = requests[3];
    assert.equal(upload.name, 'file');
    assert.deepEqual(upload.formData, { openid: 'isolated_openid' });
    assert.equal(upload.header.Authorization, 'Bearer isolated_access_token');
    assert.equal(client.getSession().avatarUrl, url);
  });

  await t.test('public requests carry no credentials and cannot clear login on 403', async () => {
    let sent;
    global.wx.request = options => {
      sent = options;
      options.success({ statusCode: 403, data: { code: 403, msg: 'not deployed' } });
    };
    await assert.rejects(client.requestPublic({ url: '/taste/public/knowledge', data: { page: 1, size: 2 } }));
    assert.equal(sent.header.Authorization, undefined);
    assert.equal(sent.header.Cookie, undefined);
    assert.equal(client.hasValidSession(), true);
  });
});
