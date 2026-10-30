/**
 * identity.js - 微信身份与品鉴资料服务
 *
 * 职责边界：
 * 1. 身份模式：支持 WeLink 后台与微信云开发双 Provider（由 config.IDENTITY_PROVIDER 控制）。
 *    WeLink 模式默认只同步后台昵称，头像保存在本地，不初始化云开发；云开发模式保留原有云函数/云存储流程。
 * 2. 展示资料：头像与昵称由用户主动选择填写，不静默读取微信头像昵称。
 * 3. 关系稳定：本地 userId 稳定不变，openid / welinkOpenid 仅附加在用户资料上，不破坏房主与评分归属。
 * 4. 健壮降级：服务不可用或会话失效时降级为游客模式，不影响本地手记与离线酒局体验。
 */

const storage = require('./storage');
const { initCloud } = require('./cloudDb');
const welinkClient = require('./welinkClient');
const config = require('../config');

let cloudReady = false;
let welinkListenerInitialized = false;

function initWelinkSessionListener() {
  if (welinkListenerInitialized) return;
  welinkListenerInitialized = true;
  if (welinkClient && welinkClient.addSessionListener) {
    welinkClient.addSessionListener((event, data) => {
      if (config.IDENTITY_PROVIDER !== 'welink') return;
      if (event === 'session_cleared') {
        const user = storage.getCurrentUser();
        if (user && user.loginState === 'wechat') {
          const next = Object.assign({}, user, {
            loginState: 'guest',
            welinkOpenid: '',
            welinkNickname: ''
          });
          storage.setCurrentUser(next);
          syncGlobal(next);
        }
      } else if (event === 'logged_in' && data && data.openid) {
        const user = storage.getCurrentUser();
        const next = Object.assign({}, user, {
          loginState: 'wechat',
          welinkOpenid: data.openid,
          welinkNickname: data.nickname || '',
          loginAt: Date.now()
        });
        storage.setCurrentUser(next);
        syncGlobal(next);
      }
    });
  }
}

// App.onLaunch 时调用：初始化云环境并把当前用户注入 globalData
function bootstrap() {
  initWelinkSessionListener();
  if (config.IDENTITY_PROVIDER === 'welink') {
    cloudReady = false;
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.userInfo = storage.getCurrentUser();
    }
    return false;
  }
  cloudReady = initCloud(config.CLOUD_ENV_ID);
  const app = getApp();
  if (app && app.globalData) {
    app.globalData.userInfo = storage.getCurrentUser();
  }
  return cloudReady;
}

function isCloudReady() {
  return cloudReady;
}

function getUser() {
  return storage.getCurrentUser();
}

function getIdentityProvider() {
  return config.IDENTITY_PROVIDER || 'cloud';
}

function isLoggedIn() {
  initWelinkSessionListener();
  const user = storage.getCurrentUser();
  if (config.IDENTITY_PROVIDER === 'welink') {
    if (!user || !user.welinkOpenid || !welinkClient.hasValidSession()) return false;
    const session = welinkClient.getSession();
    return !!(session && session.openid && user.welinkOpenid === session.openid);
  }
  return !!(user && user.openid && user.loginState === 'wechat');
}

function getActiveOpenid() {
  initWelinkSessionListener();
  const user = storage.getCurrentUser();
  return config.IDENTITY_PROVIDER === 'welink' ? (user.welinkOpenid || '') : (user.openid || '');
}

// 是否已在资料页主动保存过头像昵称（演示默认账号视为未完善）
function hasCompletedProfile(user) {
  const u = user || storage.getCurrentUser();
  return !!u.profileCompleted;
}

// 头像是否为图片路径（云 fileID / wxfile / http / 本地路径），否则按 emoji 文本渲染
function isAvatarImage(avatar) {
  if (typeof avatar !== 'string' || !avatar) return false;
  return /^(https?|cloud|wxfile):\/\//.test(avatar) ||
    avatar.charAt(0) === '/' ||
    /\.(png|jpe?g|gif|webp)$/i.test(avatar);
}

// 列表渲染辅助：为成员/榜单项补充 avatarImg 标记，供 WXML 切换 image/emoji
function withAvatarFlag(item) {
  return Object.assign({}, item, { avatarImg: isAvatarImage(item && item.avatar) });
}

function syncGlobal(user) {
  const app = getApp();
  if (app && app.globalData) app.globalData.userInfo = user;
}

/**
 * 用户主动点击「微信登录」后调用。
 * 成功：把 openid 附加到当前用户（userId 不变），loginState 置为 wechat。
 * 失败：返回 { ok:false, reason, message }，调用方需明确提示，游客不受影响。
 */
async function loginWithWeChat() {
  initWelinkSessionListener();
  if (config.IDENTITY_PROVIDER === 'welink') {
    try {
      const session = await welinkClient.login();
      if (!session || !session.openid) {
        return {
          ok: false,
          reason: 'NO_IDENTITY',
          message: '登录服务暂时未能确认你的微信身份，请稍后再试。'
        };
      }
      const user = storage.getCurrentUser();
      const next = Object.assign({}, user, {
        welinkOpenid: session.openid,
        welinkNickname: session.nickname || '',
        loginState: 'wechat',
        loginAt: Date.now()
      });
      storage.setCurrentUser(next);
      syncGlobal(next);
      return { ok: true, openid: session.openid };
    } catch (e) {
      console.warn('【盲酌】WeLink 微信登录失败', e);
      return {
        ok: false,
        reason: 'CALL_FAILED',
        message: (e && e.message) || '登录服务暂不可用，请检查网络后重试，已保持游客模式。'
      };
    }
  }

  if (!cloudReady || typeof wx === 'undefined' || !wx.cloud || !wx.cloud.callFunction) {
    return {
      ok: false,
      reason: 'CLOUD_NOT_READY',
      message: '登录服务暂不可用，你仍可继续以游客身份使用。'
    };
  }
  try {
    const res = await wx.cloud.callFunction({ name: 'login' });
    const r = (res && res.result) || {};
    if (!r.openid) {
      return {
        ok: false,
        reason: 'NO_IDENTITY',
        message: '登录服务暂时未能确认你的微信身份，请稍后再试。'
      };
    }
    const user = storage.getCurrentUser();
    const next = Object.assign({}, user, {
      openid: r.openid,
      loginState: 'wechat',
      loginAt: Date.now()
    });
    // 服务端已有资料时载入（新设备找回头像昵称）；本地已保存且更新时不覆盖
    const serverProfile = r.profile;
    if (serverProfile && (serverProfile.nickname || serverProfile.avatar)) {
      const serverTime = serverProfile.profileUpdatedAt || 0;
      if (!user.profileCompleted || serverTime > (user.profileUpdatedAt || 0)) {
        if (serverProfile.nickname) next.nickname = serverProfile.nickname;
        if (serverProfile.avatar) next.avatar = serverProfile.avatar;
        next.profileCompleted = true;
        next.profileUpdatedAt = serverTime || Date.now();
        storage.updateMemberProfile(next.userId, { nickname: next.nickname, avatar: next.avatar });
      }
    }
    storage.setCurrentUser(next);
    syncGlobal(next);
    return { ok: true, openid: r.openid };
  } catch (e) {
    console.warn('【盲酌】微信登录云函数调用失败', e);
    return {
      ok: false,
      reason: 'CALL_FAILED',
      message: '登录服务暂不可用，请检查网络后重试，已保持游客模式。'
    };
  }
}

/**
 * 持久化 chooseAvatar 的临时头像路径。
 * 优先上传云存储（返回 cloud:// fileID），云不可用时退回 wx.saveFile 本地持久保存。
 * 两者都失败返回 null，调用方保留原头像。
 */
async function persistAvatar(tempPath, openid) {
  if (cloudReady && wx.cloud && wx.cloud.uploadFile) {
    try {
      const match = /\.(\w+)$/.exec(tempPath);
      const ext = match ? match[1] : 'png';
      const res = await wx.cloud.uploadFile({
        cloudPath: 'avatars/' + (openid || 'guest') + '-' + Date.now() + '.' + ext,
        filePath: tempPath
      });
      if (res && res.fileID) return res.fileID;
    } catch (e) {
      console.warn('【盲酌】头像上传云存储失败，尝试本地持久化', e);
    }
  }
  try {
    const res = await new Promise((resolve, reject) => {
      wx.saveFile({ tempFilePath: tempPath, success: resolve, fail: reject });
    });
    return res.savedFilePath;
  } catch (e) {
    console.warn('【盲酌】头像本地持久化失败', e);
    return null;
  }
}

/**
 * 保存品鉴资料（昵称 + 可选新头像临时路径）。
 * 成功：更新当前用户、globalData、本人已参与酒局的成员名片（本地），
 *       随后 await 同步云端 users / members，结果通过 cloudSynced /
 *       avatarCloudSynced / syncError 如实返回，由页面决定是否提示重试。
 * 失败：仅头像持久化失败会失败返回，且不覆盖任何旧资料。
 */
async function saveProfile(options) {
  const nickname = String((options && options.nickname) || '').trim();
  const avatarTempPath = options && options.avatarTempPath;
  const user = storage.getCurrentUser();
  const next = Object.assign({}, user);
  if (nickname) next.nickname = nickname;
  if (avatarTempPath) {
    const saved = await persistAvatar(avatarTempPath, user.openid);
    if (!saved) {
      return { ok: false, reason: 'AVATAR_PERSIST_FAILED' };
    }
    next.avatar = saved;
  }
  next.profileCompleted = true;
  next.profileUpdatedAt = Date.now();
  storage.setCurrentUser(next);
  // 同步本人已参与酒局的成员名片展示；userId 稳定不变，房主/评分/盲猜关系不受影响
  storage.updateMemberProfile(user.userId, { nickname: next.nickname, avatar: next.avatar });
  syncGlobal(next);
  if (config.IDENTITY_PROVIDER === 'welink') {
    const sync = await syncProfileToWelink(next);
    return {
      ok: true,
      user: next,
      cloudSynced: sync.cloudSynced,
      avatarCloudSynced: false,
      avatarLocalOnly: sync.avatarLocalOnly,
      syncError: sync.error
    };
  }
  const sync = await syncProfileToCloud(next);
  return {
    ok: true,
    user: next,
    cloudSynced: sync.cloudSynced,
    avatarCloudSynced: sync.avatarCloudSynced,
    avatarLocalOnly: sync.avatarLocalOnly,
    syncError: sync.error
  };
}

async function syncProfileToWelink(user) {
  const result = { cloudSynced: false, avatarCloudSynced: false, avatarLocalOnly: true, error: '' };
  if (!welinkClient.hasValidSession()) {
    result.error = 'NOT_LOGGED_IN';
    return result;
  }
  try {
    const updated = await welinkClient.updateProfile(user.nickname);
    if (updated && updated.nickname && updated.nickname !== user.nickname) {
      user.nickname = updated.nickname;
      user.welinkNickname = updated.nickname;
      storage.setCurrentUser(user);
      storage.updateMemberProfile(user.userId, { nickname: user.nickname, avatar: user.avatar });
      syncGlobal(user);
    }
    result.cloudSynced = true;
    result.avatarLocalOnly = true;
  } catch (e) {
    console.warn('【盲酌】WeLink 资料同步失败', e);
    result.error = e.message || 'PROFILE_SYNC_FAILED';
  }
  return result;
}

async function syncProfileToCloud(user) {
  const result = { cloudSynced: false, avatarCloudSynced: false, avatarLocalOnly: false, error: '' };
  // 未确认微信身份或无云环境：无云端同步义务，调用方按游客本地保存处理
  if (!cloudReady || !user.openid) {
    result.error = 'NOT_BOUND';
    return result;
  }
  // 仅同步可跨设备访问的云存储头像；本地 wxfile:// 路径不写入云端资料
  const cloudAvatar = /^cloud:\/\//.test(user.avatar || '') ? user.avatar : '';
  if (!cloudAvatar && isAvatarImage(user.avatar)) result.avatarLocalOnly = true;
  try {
    const data = { action: 'saveProfile', nickname: user.nickname };
    if (cloudAvatar) data.avatar = cloudAvatar;
    const res = await wx.cloud.callFunction({ name: 'login', data });
    if (!res || !res.result || !res.result.ok) {
      throw new Error('saveProfile rejected');
    }
    // 回写服务端权威时间戳，便于多端比较新旧
    if (res.result.profileUpdatedAt) {
      const cur = storage.getCurrentUser();
      cur.profileUpdatedAt = res.result.profileUpdatedAt;
      storage.setCurrentUser(cur);
    }
    result.avatarCloudSynced = !!cloudAvatar;
  } catch (e) {
    console.warn('【盲酌】云端同步用户资料失败（不影响本地）', e);
    result.error = 'PROFILE_SYNC_FAILED';
    return result;
  }
  try {
    // 必须同时限定 _openid，userId（如演示账号 user_master）在不同设备间并不唯一
    const memberData = { nickname: user.nickname };
    if (cloudAvatar) memberData.avatar = cloudAvatar;
    await wx.cloud.database().collection('members')
      .where({ userId: user.userId, _openid: user.openid })
      .update({ data: memberData });
  } catch (e) {
    console.warn('【盲酌】云端同步成员名片失败（不影响本地）', e);
    // 酒局仍使用本地数据时，members 集合可能尚未启用；资料同步结果独立返回。
    result.membersSynced = false;
  }
  result.cloudSynced = true;
  return result;
}

/**
 * 退出微信登录：通知后端失效会话，并清理本地登录态（保留手记等本地数据）。
 * 云开发模式下没有服务端会话，仅重置本地标记。
 */
async function logoutWithWeChat() {
  if (getIdentityProvider() === 'welink') {
    try {
      await welinkClient.logout();
    } catch (e) {
      console.warn('【盲酌】WeLink 退出登录请求失败，仍清理本地会话', e);
    }
  }
  const user = storage.getCurrentUser();
  const next = Object.assign({}, user, {
    welinkOpenid: '',
    welinkNickname: '',
    openid: '',
    loginState: 'guest',
    logoutAt: Date.now()
  });
  storage.setCurrentUser(next);
  syncGlobal(next);
  return { ok: true };
}

// Canvas 头像加载：cloud:// fileID 先换取临时 URL；任何失败或超时都 resolve(null) 走 emoji 降级
function loadCanvasImage(canvas, src) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(v);
      }
    };
    const timer = setTimeout(() => done(null), 8000);
    const finish = (path) => {
      if (!path) return done(null);
      const img = canvas.createImage();
      img.onload = () => done(img);
      img.onerror = () => done(null);
      img.src = path;
    };
    if (/^cloud:\/\//.test(src) && wx.cloud && wx.cloud.getTempFileURL) {
      wx.cloud.getTempFileURL({
        fileList: [src],
        success: (r) => {
          const f = r.fileList && r.fileList[0];
          finish(f && f.status === 0 ? f.tempFileURL : null);
        },
        fail: () => finish(null)
      });
    } else {
      finish(src);
    }
  });
}

// Canvas 圆形头像绘制：图片成功则裁剪绘制，失败或 emoji 头像则绘制圆形底 + emoji
async function drawCanvasAvatar(canvas, ctx, x, y, radius, avatar, isCurrent) {
  const img = isAvatarImage(avatar) ? await loadCanvasImage(canvas, avatar) : null;
  if (isCurrent && !isCurrent()) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = '#f4e7ca';
  ctx.fill();
  if (img) {
    ctx.clip();
    ctx.drawImage(img, x, y, radius * 2, radius * 2);
    ctx.restore();
    return;
  }
  ctx.font = Math.round(radius * 1.1) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#a97832';
  ctx.fillText(isAvatarImage(avatar) ? '🍶' : (avatar || '🍶'), x + radius, y + radius + Math.round(radius * 0.08));
  ctx.restore();
}

module.exports = {
  bootstrap,
  initWelinkSessionListener,
  isCloudReady,
  getIdentityProvider,
  isLoggedIn,
  getActiveOpenid,
  getUser,
  hasCompletedProfile,
  isAvatarImage,
  withAvatarFlag,
  loginWithWeChat,
  logoutWithWeChat,
  persistAvatar,
  saveProfile,
  loadCanvasImage,
  drawCanvasAvatar
};
