Page({
  data: { version: '1.0.0' },
  copyContact() {
    wx.setClipboardData({ data: 'support@mangzhuo.app', success: () => wx.showToast({ title: '已复制联系邮箱' }) });
  }
});
