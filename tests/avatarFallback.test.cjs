const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadPage(route, wx = {}) {
  let page;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../miniprogram/pages', route, route + '.js'), 'utf8'), {
    Page(definition) { page = definition; },
    wx,
    require() { return {}; }
  });
  page.setData = function (values) { Object.assign(this.data, values); };
  return page;
}

test('failed avatar previews preserve the saved identity and unsaved profile edits', () => {
  for (const route of ['profile', 'mine']) {
    const page = loadPage(route);
    const avatar = 'wxfile://missing-avatar.jpg';
    Object.assign(page.data, { avatar, avatarImg: true, nickname: '保留昵称', pendingAvatar: 'wxfile://pending.jpg', pendingImg: true, user: { avatar, nickname: '原资料' } });
    page.onAvatarError();
    assert.equal(page.data.avatarLoadError, true);
    assert.equal(page.data.avatarImg, true);
    assert.equal(page.data.avatar, avatar);
    assert.equal(page.data.pendingAvatar, 'wxfile://pending.jpg');
    assert.equal(page.data.nickname, '保留昵称');
    assert.equal(page.data.user.avatar, avatar);
  }
});

test('choosing a replacement avatar restores its preview without saving it', () => {
  const page = loadPage('profile', {
    chooseImage(options) { options.success({ tempFilePaths: ['wxfile://new-avatar.jpg'] }); }
  });
  Object.assign(page.data, { avatar: 'wxfile://old-avatar.jpg', avatarLoadError: true });
  page.onChooseAvatar();
  assert.equal(page.data.avatarLoadError, false);
  assert.equal(page.data.pendingAvatar, 'wxfile://new-avatar.jpg');
  assert.equal(page.data.avatar, 'wxfile://old-avatar.jpg');
});
