Component({
 data: { statusHeight: 24, navHeight: 44 },
 lifetimes: {
  attached() {
   const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
   const capsule = wx.getMenuButtonBoundingClientRect();
   const statusHeight = info.statusBarHeight || 24;
   const navHeight = capsule && capsule.height ? (capsule.top - statusHeight) * 2 + capsule.height : 44;
   this.setData({ statusHeight, navHeight });
  }
 }
});
