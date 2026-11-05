/**
 * profile.js - 品鉴资料页（微信身份登录 + 头像昵称编辑）
 *
 * - 头像：用户主动从相册选择，返回临时路径，
 *   保存时由 identity.persistAvatar 持久化（云存储或本地 saveFile）。
 * - 昵称：普通文本输入，用户完全自定义，不触发微信资料接口。
 * - 登录：主动点击后按配置交由品鉴后台或云函数校验身份，失败保持游客可用。
 * - 保存成功返回上一页继续原操作；取消不覆盖旧资料。
 */
const identity = require('../../services/identity');

Page({
  data: {
    avatar: '',
    pendingAvatar: '',
    nickname: '',
    avatarImg: false,
    pendingImg: false,
    loginState: 'guest',
    cloudReady: false,
    provider: '',
    saving: false,
    loggingIn: false
  },

  onLoad() {
    const user = identity.getUser();
    const isWechat = identity.isLoggedIn();
    this.setData({
      avatar: user.avatar || '🍶',
      avatarImg: identity.isAvatarImage(user.avatar),
      // 未完善资料时不预填演示昵称，交给用户点选微信昵称建议或自定义
      nickname: user.profileCompleted ? (user.nickname || '') : '',
      loginState: isWechat ? 'wechat' : 'guest',
      provider: identity.getIdentityProvider(),
      cloudReady: identity.isCloudReady()
    });
  },
  onShow() { this.setData({loginState: identity.isLoggedIn() ? 'wechat' : 'guest'}); },

  onChooseAvatar(e) {
    if (!wx.chooseImage) {
      wx.showToast({ title: '当前环境暂不支持选择头像', icon: 'none' });
      return;
    }
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        const temp = res && res.tempFilePaths && res.tempFilePaths[0];
        if (temp) this.setData({ pendingAvatar: temp, pendingImg: true });
      },
      fail: (err) => {
        const message = (err && err.errMsg) || '';
        if (message.indexOf('cancel') !== -1) return;
        wx.showToast({ title: '未能选择头像，请重试', icon: 'none' });
      }
    });
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  async onLogin() {
    if (identity.isLoggedIn() || this.data.loggingIn || this.data.saving) return;
    this.setData({ loggingIn: true });
    try {
      const fallbackProfile = {
        avatarUrl: this.data.pendingAvatar || (this.data.avatarImg ? this.data.avatar : ''),
        nickName: this.data.nickname.trim()
      };
      const res = await identity.loginWithWeChat(fallbackProfile);
      if (res.ok) {
        // 载入服务端找回或授权同步的资料，但保留用户尚未保存的昵称输入与已选头像
        const u = identity.getUser();
        const patch = { loginState: 'wechat' };
        if (!this.data.pendingAvatar) {
          patch.avatar = u.avatar || '🍶';
          patch.avatarImg = identity.isAvatarImage(patch.avatar);
        }
        if (!this.data.nickname.trim() && (u.profileCompleted || u.nickname)) {
          patch.nickname = u.nickname || '';
        }
        this.setData(patch);
        wx.showToast({ title: '注册登录成功', icon: 'success' });
      } else {
        if (res.message && (res.message.includes('已取消授权') || res.message.includes('auth deny') || res.message.includes('cancel'))) {
          wx.showToast({ title: '已取消授权', icon: 'none' });
          return;
        }
        wx.showModal({
          title: '微信登录未完成',
          content: res.message + ' 本地资料可正常保存，游客功能不受影响。',
          showCancel: false,
          confirmText: '知道了',
          confirmColor: '#a97832'
        });
      }
    } catch (e) {
      wx.showModal({
        title: '微信登录未完成',
        content: ((e && e.message) || '登录服务暂不可用，请稍后再试') + '。本地资料可正常保存，游客功能不受影响。',
        showCancel: false,
        confirmText: '知道了',
        confirmColor: '#a97832'
      });
    } finally {
      this.setData({ loggingIn: false });
    }
  },

  async onSave() {
    if (this.data.saving || this.data.loggingIn) return;
    const nickname = this.data.nickname.trim();
    if (!nickname) {
      wx.showToast({ title: '请填写品鉴昵称', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    try {
      const res = await identity.saveProfile({
        nickname,
        avatarTempPath: this.data.pendingAvatar
      });
      if (!res.ok) {
        if (res.reason === 'AVATAR_PERSIST_FAILED') {
          wx.showModal({
            title: '头像保存失败',
            content: '头像未能保存，请重新选择头像后再保存。原头像与资料未改动。',
            showCancel: false,
            confirmText: '知道了',
            confirmColor: '#a97832'
          });
        }
        return;
      }
      // saveFile 会移动临时文件，重试应使用已保存资料，不能再读取旧临时路径。
      this.setData({pendingAvatar:'',pendingImg:false,avatar:res.user.avatar,avatarImg:identity.isAvatarImage(res.user.avatar)});
      // 已确认微信身份但云端同步未成功：如实告知并允许重试，不谎称完成
      if (identity.isLoggedIn() && !res.cloudSynced) {
        wx.showModal({
          title: '已保存到本机',
          content: '后台昵称同步未完成，资料已保存在本机。要重试同步吗？',
          confirmText: '重试保存',
          cancelText: '先这样',
          confirmColor: '#a97832',
          success: (r) => {
            if (r.confirm) {
              this.onSave();
            } else {
              this.goBack();
            }
          }
        });
        return;
      }
      if (res.avatarLocalOnly) {
        const content = identity.isLoggedIn() && res.cloudSynced ? '昵称已同步，头像仅保存在本机。' : '昵称与头像已保存在本机。';
        wx.showModal({title:'资料已保存',content,showCancel:false,confirmText:'知道了',success:()=>this.goBack()});
        return;
      }
      wx.showToast({ title: '资料已保存', icon: 'success' });
      setTimeout(() => this.goBack(), 600);
    } catch (e) {
      wx.showModal({
        title: '资料保存失败',
        content: '保存未完成，请返回资料页核对本机资料后重试。',
        showCancel: false,
        confirmText: '知道了',
        confirmColor: '#a97832'
      });
    } finally {
      this.setData({ saving: false });
    }
  },

  onCancel() {
    this.goBack();
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({ url: '/pages/mine/mine' });
    }
  }
});
