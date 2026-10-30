Component({
 data: { selected: 0, tabs: [
  {path:'/pages/index/index',text:'首页',image:'/assets/brand/libai-home.png'},
  {path:'/pages/gather/gather',text:'酒局',image:'/assets/brand/libai-gather.png'},
  {path:'/pages/knowledge/knowledge',text:'酒识',image:'/assets/brand/libai-knowledge.png'},
  {path:'/pages/mine/mine',text:'我的',image:'/assets/brand/libai-mine.png'}
 ] },
 lifetimes: { attached() { this.syncSelected(); } },
 pageLifetimes: { show() { this.syncSelected(); } },
 methods: {
  syncSelected() {
   const pages = getCurrentPages();
   const page = pages[pages.length - 1];
   if (!page) return;
   const selected = this.data.tabs.findIndex(tab => tab.path === '/' + page.route);
   if (selected >= 0) this.setData({selected});
  },
  switchPage(e) {
   const index = Number(e.currentTarget.dataset.index);
   const pages = getCurrentPages();
   const current = pages[pages.length - 1];
   if (current && '/' + current.route === this.data.tabs[index].path) return;
   wx.switchTab({url:this.data.tabs[index].path});
  }
 }
});
