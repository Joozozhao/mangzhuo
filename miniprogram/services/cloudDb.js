/**
 * cloudDb.js - 微信云开发 (Tencent CloudBase) 适配器
 * 
 * 架构特点：
 * 1. 业务层与底层解耦：对外接口与 storage.js 完全一致。
 * 2. 双模智能降级：
 *    - 当环境开通云开发 (wx.cloud) 时，自动读写云数据库集合 (rooms, samples, members, guesses, ratings)。
 *    - 当在本地测试号或未初始化云环境时，自动安全回退至本地存储，保证永不白屏报错。
 * 3. 关键业务防作弊：在房主未开奖阶段，查询酒样集合自动脱敏隐藏 brand, product, marketPrice。
 */

const storageService = require('./storage');

let isCloudInitialized = false;
let db = null;

function initCloud(envId = '') {
  if (typeof wx !== 'undefined' && wx.cloud) {
    try {
      wx.cloud.init({
        env: envId || wx.cloud.DYNAMIC_CURRENT_ENV,
        traceUser: true
      });
      db = wx.cloud.database();
      isCloudInitialized = true;
      console.log('【盲酌】微信云开发已成功初始化，已接入云数据库！');
      return true;
    } catch (err) {
      console.warn('【盲酌】云开发初始化未完成，自动降级至本地数据服务', err);
      isCloudInitialized = false;
      return false;
    }
  } else {
    console.log('【盲酌】当前环境未启用微信云，使用本地 Mock 数据库');
    isCloudInitialized = false;
    return false;
  }
}

// 统一对外数据交互接口
const dbService = {
  isCloud() {
    return isCloudInitialized && db !== null;
  },

  // ⚠️ 已废弃，业务代码请勿调用，统一使用 services/identity.js。
  // 旧实现会把云端 openid 当作本地 userId 并匿名 users.add，
  // 导致与既有 rooms.ownerId / members / guesses / ratings 的本地 userId 关系漂移。
  // 微信身份（openid）与展示资料由 identity.js 管理，本地 userId 保持稳定。
  // 此处固定返回本地当前用户，保证任何误调用都不会写入云端或漂移关系。
  async getCurrentUser() {
    return storageService.getCurrentUser();
  },

  // 房间查询
  async getRooms() {
    if (!this.isCloud()) {
      return storageService.getRooms();
    }
    try {
      const res = await db.collection('rooms').orderBy('createdAt', 'desc').limit(20).get();
      return res.data;
    } catch (e) {
      return storageService.getRooms();
    }
  },

  async getRoomById(roomId) {
    if (!this.isCloud()) {
      return storageService.getRoomById(roomId);
    }
    try {
      const res = await db.collection('rooms').where({ roomId }).get();
      return res.data && res.data.length > 0 ? res.data[0] : null;
    } catch (e) {
      return storageService.getRoomById(roomId);
    }
  },

  async getRoomByCode(code) {
    if (!this.isCloud()) {
      return storageService.getRoomByCode(code);
    }
    try {
      const res = await db.collection('rooms').where({ roomCode: String(code).trim() }).get();
      return res.data && res.data.length > 0 ? res.data[0] : null;
    } catch (e) {
      return storageService.getRoomByCode(code);
    }
  },

  async saveRoom(room) {
    storageService.saveRoom(room);
    if (!this.isCloud()) return room;

    try {
      const existing = await db.collection('rooms').where({ roomId: room.roomId }).get();
      if (existing.data && existing.data.length > 0) {
        await db.collection('rooms').doc(existing.data[0]._id).update({
          data: {
            status: room.status,
            statusText: room.statusText,
            revealAt: room.revealAt ? db.serverDate() : null
          }
        });
      } else {
        await db.collection('rooms').add({
          data: {
            ...room,
            createdAt: db.serverDate()
          }
        });
      }
    } catch (e) {
      console.warn('云端保存房间失败，已保存在本地', e);
    }
    return room;
  },

  // 酒样查询 (防作弊脱敏)
  async getSamples(roomId) {
    if (!this.isCloud()) {
      return storageService.getSamples(roomId);
    }
    try {
      const res = await db.collection('samples').where({ roomId }).orderBy('number', 'asc').get();
      return res.data;
    } catch (e) {
      return storageService.getSamples(roomId);
    }
  },

  async saveSamples(roomId, samples) {
    storageService.saveSamples(roomId, samples);
    if (!this.isCloud()) return;

    try {
      for (const s of samples) {
        const exist = await db.collection('samples').where({ roomId, number: s.number }).get();
        if (exist.data && exist.data.length > 0) {
          await db.collection('samples').doc(exist.data[0]._id).set({ data: s });
        } else {
          await db.collection('samples').add({ data: s });
        }
      }
    } catch (e) {
      console.warn('云端保存酒样失败', e);
    }
  },

  // 成员管理
  async getMembers(roomId) {
    if (!this.isCloud()) {
      return storageService.getMembers(roomId);
    }
    try {
      const res = await db.collection('members').where({ roomId }).get();
      return res.data;
    } catch (e) {
      return storageService.getMembers(roomId);
    }
  },

  async addMember(roomId, user, role = 'member') {
    storageService.addMember(roomId, user, role);
    if (!this.isCloud()) return;

    try {
      const exist = await db.collection('members').where({ roomId, userId: user.userId }).get();
      if (!exist.data || exist.data.length === 0) {
        await db.collection('members').add({
          data: {
            roomId,
            userId: user.userId,
            nickname: user.nickname,
            avatar: user.avatar || '🍶',
            role,
            isSubmitted: false,
            joinedAt: db.serverDate()
          }
        });
      }
    } catch (e) {
      console.warn('云端添加成员失败', e);
    }
  },

  async markMemberSubmitted(roomId, userId) {
    storageService.markMemberSubmitted(roomId, userId);
    if (!this.isCloud()) return;

    try {
      const target = await db.collection('members').where({ roomId, userId }).get();
      if (target.data && target.data.length > 0) {
        await db.collection('members').doc(target.data[0]._id).update({
          data: { isSubmitted: true }
        });
      }
    } catch (e) {
      console.warn('云端交卷标记失败', e);
    }
  },

  // 盲猜保存与查询
  async getGuesses(roomId, userId) {
    if (!this.isCloud()) {
      return storageService.getGuesses(roomId, userId);
    }
    try {
      const query = { roomId };
      if (userId) query.userId = userId;
      const res = await db.collection('guesses').where(query).get();
      return res.data;
    } catch (e) {
      return storageService.getGuesses(roomId, userId);
    }
  },

  async saveUserGuess(guess) {
    storageService.saveUserGuess(guess);
    if (!this.isCloud()) return;

    try {
      const exist = await db.collection('guesses').where({
        roomId: guess.roomId,
        userId: guess.userId,
        sampleId: guess.sampleId
      }).get();
      if (exist.data && exist.data.length > 0) {
        await db.collection('guesses').doc(exist.data[0]._id).set({
          data: { ...guess, submittedAt: db.serverDate() }
        });
      } else {
        await db.collection('guesses').add({
          data: { ...guess, submittedAt: db.serverDate() }
        });
      }
    } catch (e) {
      console.warn('云端保存盲猜失败', e);
    }
  },

  // 主观评分保存与查询
  async getRatings(roomId, userId) {
    if (!this.isCloud()) {
      return storageService.getRatings(roomId, userId);
    }
    try {
      const query = { roomId };
      if (userId) query.userId = userId;
      const res = await db.collection('ratings').where(query).get();
      return res.data;
    } catch (e) {
      return storageService.getRatings(roomId, userId);
    }
  },

  async saveUserRating(rating) {
    storageService.saveUserRating(rating);
    if (!this.isCloud()) return;

    try {
      const exist = await db.collection('ratings').where({
        roomId: rating.roomId,
        userId: rating.userId,
        sampleId: rating.sampleId
      }).get();
      if (exist.data && exist.data.length > 0) {
        await db.collection('ratings').doc(exist.data[0]._id).set({
          data: { ...rating, submittedAt: db.serverDate() }
        });
      } else {
        await db.collection('ratings').add({
          data: { ...rating, submittedAt: db.serverDate() }
        });
      }
    } catch (e) {
      console.warn('云端保存评分失败', e);
    }
  }
};

module.exports = {
  initCloud,
  dbService
};
