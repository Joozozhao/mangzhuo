// app.js
const storageService = require('./services/storage');
const identity = require('./services/identity');

App({
  onLaunch() {
    // 初始化本地 Mock 数据体系
    storageService.initInitialData();
    // 初始化微信云环境并恢复当前用户资料（云未配置时自动保持游客模式）
    identity.bootstrap();
    console.log('【盲酌】白酒盲品小程序已启动，数据层已就绪');
  },
  globalData: {
    userInfo: null,
    currentRoomId: null,
    appTitle: '盲酌',
    appSlogan: '去掉酒标，只凭味道'
  }
});
