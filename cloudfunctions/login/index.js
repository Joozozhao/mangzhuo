// 云函数 login/index.js
// 职责：
// 1. 默认调用：通过 cloud.getWXContext() 确认调用者真实微信身份（OPENID），
//    并返回该微信身份已保存的展示资料（若有），供新设备找回头像昵称。
// 2. action=saveProfile：保存/更新当前调用者的展示资料（昵称、云存储头像）。
//
// 安全约定：
// - 身份只信任服务端 getWXContext()，前端不传 openid、不持有 secret/session_key；
// - 资料记录按调用者 _openid 归属，任何人只能读写自己的资料；
// - 头像仅接受 cloud:// 云存储 fileID，拒绝本地 wxfile:// 等不可跨设备路径。

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  if (!openid) {
    return { ok: false, error: 'NO_OPENID' };
  }

  const users = db.collection('users');

  if (event && event.action === 'saveProfile') {
    // 时间戳以服务端时钟为准，不信任客户端时间
    const now = Date.now();
    // 显式写入 _openid：云函数内 add/set 不会自动填充客户端 _openid；
    // 以 openid 作为确定 doc ID，天然幂等，避免并发重复建档
    let previous = {};
    try { const old = await users.doc(openid).get(); previous = old.data || {}; } catch (e) { /* 首次建档 */ }
    const data = { _openid: openid, nickname: previous.nickname || '', avatar: previous.avatar || '', updatedAt: db.serverDate(), profileUpdatedAt: now };
    if (typeof event.nickname === 'string' && event.nickname.trim()) {
      data.nickname = event.nickname.trim().slice(0, 20);
    }
    if (typeof event.avatar === 'string' && event.avatar.indexOf('cloud://') === 0) {
      data.avatar = event.avatar;
    }
    try {
      await users.doc(openid).set({ data });
    } catch (e) {
      return { ok: false, openid, error: 'PROFILE_SAVE_FAILED' };
    }
    return { ok: true, openid, appid: wxContext.APPID, unionid: wxContext.UNIONID || '', profileUpdatedAt: now };
  }

  // 默认：确认身份 + 读取已有资料（集合不存在/无记录时 profile 为 null）
  let profile = null;
  try {
    const doc = await users.doc(openid).get();
    const d = doc.data;
    profile = {
      nickname: d.nickname || '',
      avatar: d.avatar || '',
      profileUpdatedAt: d.profileUpdatedAt || 0
    };
  } catch (e) {
    profile = null;
  }
  return { ok: true, openid, appid: wxContext.APPID, unionid: wxContext.UNIONID || '', profile };
};
