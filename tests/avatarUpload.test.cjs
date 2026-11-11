const test = require('node:test');
const assert = require('node:assert/strict');
const client = require('../miniprogram/services/welinkClient');

// Isolated images and identities; never upload test content to the real service.
test('avatar upload prepares large photos and preserves HTTP/session error handling', async (t) => {
  const originalWx = global.wx;
  const originalGetApp = global.getApp;
  t.after(() => {
    client.clearSession();
    global.wx = originalWx;
    global.getApp = originalGetApp;
  });
  const originalPath = 'wxfile://chosen-avatar.png';
  const compressedPath = 'wxfile://compressed-avatar.jpg';
  const avatarUrl = 'https://cdn.example.test/saved-avatar.jpg';

  async function fixture({
    size = 1264817, compressedSize = 63468, width = 2048, height = 2048,
    response = { statusCode: 200, data: JSON.stringify({ code: '00000', data: { file_url: avatarUrl } }) }
  } = {}) {
    const storage = {}, uploads = [], compressions = [];
    global.getApp = () => ({ globalData: {} });
    global.wx = {
      getStorageSync: key => storage[key],
      setStorageSync: (key, value) => { storage[key] = value; },
      removeStorageSync: key => { delete storage[key]; },
      login: ({ success }) => success({ code: 'isolated_code' }),
      request: ({ success }) => success({ statusCode: 200, data: {
        code: '00000', data: { openId: 'isolated_openid', accessToken: 'isolated_token', userId: 37 }
      } }),
      getFileSystemManager: () => ({
        statSync: path => ({ size: path === originalPath ? size : compressedSize })
      }),
      getImageInfo: ({ success }) => success({ width, height }),
      compressImage(options) {
        compressions.push(options);
        options.success({ tempFilePath: compressedPath });
      },
      uploadFile(options) {
        uploads.push(options);
        options.success(response);
      }
    };
    client.clearSession();
    await client.login();
    return { storage, uploads, compressions };
  }

  await t.test('the rejected 1.2 MB photo is compressed before upload with the same identity', async () => {
    const { uploads, compressions } = await fixture();
    assert.equal(await client.uploadAvatar(originalPath), avatarUrl);
    assert.equal(compressions.length, 1);
    assert.equal(compressions[0].src, originalPath);
    assert.equal(compressions[0].quality, 70);
    assert.equal(compressions[0].compressedWidth, 800);
    assert.equal(compressions[0].compressedHeight, undefined);
    assert.equal(uploads.length, 1);
    assert.equal(uploads[0].filePath, compressedPath);
    assert.equal(uploads[0].name, 'file');
    assert.deepEqual(uploads[0].formData, { openid: 'isolated_openid' });
    assert.equal(uploads[0].header.Authorization, 'Bearer isolated_token');
    assert.equal(client.getSession().avatarUrl, avatarUrl);
  });

  await t.test('portrait photos shrink by height and retain their proportions', async () => {
    const { compressions } = await fixture({ width: 1500, height: 3000 });
    await client.uploadAvatar(originalPath);
    assert.equal(compressions[0].compressedHeight, 800);
    assert.equal(compressions[0].compressedWidth, undefined);
  });

  await t.test('small avatars upload directly without an unnecessary recompression', async () => {
    const { uploads, compressions } = await fixture({ size: 60 * 1024 });
    await client.uploadAvatar(originalPath);
    assert.equal(compressions.length, 0);
    assert.equal(uploads[0].filePath, originalPath);
  });

  await t.test('photos with unavailable metadata are still compressed before upload', async () => {
    const { uploads } = await fixture();
    global.wx.getFileSystemManager = () => ({ statSync() { throw new Error('unavailable'); } });
    await client.uploadAvatar(originalPath);
    assert.equal(uploads[0].filePath, compressedPath);
  });

  await t.test('oversized or failed compression never sends an upload or changes the session avatar', async () => {
    for (const mode of ['still-large', 'failed', 'missing-path', 'unsupported']) {
      const { uploads } = await fixture({ compressedSize: 2 * 1024 * 1024 });
      if (mode === 'failed') global.wx.compressImage = options => options.fail({});
      if (mode === 'missing-path') global.wx.compressImage = options => options.success({});
      if (mode === 'unsupported') delete global.wx.compressImage;
      await assert.rejects(client.uploadAvatar(originalPath), /头像图片过大|头像处理失败/);
      assert.equal(uploads.length, 0, mode);
      assert.equal(client.getSession().avatarUrl, '', mode);
      assert.equal(client.hasValidSession(), true, mode);
    }
  });

  await t.test('a session change during compression prevents sending the old identity', async () => {
    const { uploads } = await fixture();
    let finishCompression;
    global.wx.compressImage = options => { finishCompression = options.success; };
    const pending = client.uploadAvatar(originalPath);
    await new Promise(resolve => setImmediate(resolve));
    client.clearSession();
    finishCompression({ tempFilePath: compressedPath });
    await assert.rejects(pending, /登录状态已变更/);
    assert.equal(uploads.length, 0);
  });

  await t.test('empty or HTML authentication responses report login failure before JSON parsing', async () => {
    for (const statusCode of [401]) {
      for (const data of ['', '<html>Forbidden</html>']) {
        await fixture({ response: { statusCode, data } });
        await assert.rejects(client.uploadAvatar(originalPath), /登录已失效/);
        assert.equal(client.hasValidSession(), false);
      }
    }
  });

  await t.test('403, 413 and gateway text report upload errors without clearing the login', async () => {
    for (const [statusCode, expected] of [[403, /暂时无法上传头像/], [413, /头像图片过大/], [502, /HTTP 502/]]) {
      await fixture({ response: { statusCode, data: '<html>Upload failed</html>' } });
      await assert.rejects(client.uploadAvatar(originalPath), expected);
      assert.equal(client.hasValidSession(), true);
      assert.equal(client.getSession().avatarUrl, '');
    }
  });

  await t.test('JSON with BOM/whitespace accepts the real file_url response', async () => {
    await fixture({ response: { statusCode: 200, data: '\uFEFF  ' + JSON.stringify({ code: '00000', data: { file_url: avatarUrl } }) + '\n' } });
    assert.equal(await client.uploadAvatar(originalPath), avatarUrl);
  });

  await t.test('malformed success and rejected business responses never persist a false avatar URL', async () => {
    for (const [data, expected] of [
      ['<html>not JSON</html>', /头像上传响应格式异常/],
      [JSON.stringify({ code: '500', msg: '图片处理失败' }), /图片处理失败/],
      [JSON.stringify({ code: '00000', data: { file_url: 'http://unsafe.example.test/avatar.png' } }), /有效图片地址/]
    ]) {
      await fixture({ response: { statusCode: 200, data } });
      await assert.rejects(client.uploadAvatar(originalPath), expected);
      assert.equal(client.getSession().avatarUrl, '');
    }
  });

  await t.test('a failed avatar upload leaves the saved nickname/avatar and local identity intact', async () => {
    const { storage } = await fixture({ response: { statusCode: 413, data: '' } });
    const identity = require('../miniprogram/services/identity');
    const savedUser = {
      userId: 'stable_local_user', loginState: 'wechat', welinkOpenid: 'isolated_openid',
      nickname: '原昵称', avatar: avatarUrl, profileCompleted: true
    };
    storage.mz_current_user = savedUser;
    await assert.rejects(identity.saveProfile({ nickname: '尚未保存的昵称', avatarTempPath: originalPath }), /头像图片过大/);
    assert.deepEqual(storage.mz_current_user, savedUser);
  });
});
