const kb = require('../../utils/liquorKnowledge');
const knowledgeNav = require('../../utils/knowledgeNavigation');
const LAST_READ_KEY = 'mz_knowledge_last_read_v1';

const sections = kb.sections;
const articles = kb.articles;
const articlesSection = {
  id: 'articles',
  title: '慢读文章',
  count: articles.length,
  caption: '香型、原料、酿造，从一篇慢慢读起。'
};
const categories = ['全部', ...new Set(articles.map(a => a.category))];

Page({
  data: {
    sections,
    articlesSection,
    section: sections[0] ? sections[0].id : '',
    activeSection: sections[0] || null,
    query: '',
    results: [],
    categories,
    articleCategory: '全部',
    selected: null,
    lastRead: null
  },
  onLoad() {
    try {
      this.setData({ lastRead: wx.getStorageSync(LAST_READ_KEY) || null });
    } catch (err) {
      this.setData({ lastRead: null });
    }
    this.refresh();
  },
  onShow() {
    const tabBar = this.getTabBar && this.getTabBar();
    if (tabBar) tabBar.setData({ selected: 2 });
    const pending = knowledgeNav.consume();
    if (pending) this.openDetail(pending.type, pending.id);
  },
  refresh() {
    let results = kb.search(this.data.section, this.data.query) || [];
    if (this.data.section === 'articles' && this.data.articleCategory !== '全部') {
      results = results.filter(item => item.category === this.data.articleCategory);
    }
    this.setData({ results });
  },
  search(e) {
    this.setData({ query: e.detail.value.trim() });
    this.refresh();
  },
  clearSearch() {
    this.setData({ query: '' });
    this.refresh();
  },
  setSection(id) {
    if (id === this.data.section) return;
    const activeSection = id === 'articles'
      ? articlesSection
      : (sections.find(s => s.id === id) || null);
    this.setData({ section: id, activeSection });
    this.refresh();
  },
  switchSection(e) {
    this.setSection(e.currentTarget.dataset.id);
  },
  openArticles() {
    this.setSection('articles');
  },
  chooseCategory(e) {
    this.setData({ articleCategory: e.currentTarget.dataset.category });
    this.refresh();
  },
  openDetail(type, id) {
    const detail = kb.getDetail(type, id);
    if (!detail) {
      wx.showToast({ title: '这篇内容还在整理中', icon: 'none' });
      return;
    }
    this.setData({ selected: detail });
    const lastRead = {
      type: detail.type,
      id: detail.id,
      title: detail.title,
      category: detail.category
    };
    this.setData({ lastRead });
    try {
      wx.setStorageSync(LAST_READ_KEY, lastRead);
    } catch (err) {
      // Keep the current session usable when device storage is unavailable.
    }
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },
  open(e) {
    const { type, id } = e.currentTarget.dataset;
    this.openDetail(type, id);
  },
  openRelated(e) {
    const { type, id } = e.currentTarget.dataset;
    this.openDetail(type, id);
  },
  openLastRead() {
    const item = this.data.lastRead;
    if (item) this.openDetail(item.type, item.id);
  },
  close() {
    this.setData({ selected: null });
  },
  copy(e) {
    wx.setClipboardData({ data: e.currentTarget.dataset.url });
  },
  practice() {
    wx.navigateTo({ url: '/pages/checkin/checkin' });
  },
  onShareAppMessage() {
    const s = this.data.selected;
    if (s) {
      return { title: s.title + ' · 盲酌酒识', path: '/pages/knowledge/knowledge', imageUrl: '/assets/brand/libai-knowledge.png' };
    }
    return { title: '盲酌酒识 · 白酒香型、原料与酿造', path: '/pages/knowledge/knowledge', imageUrl: '/assets/brand/libai-knowledge.png' };
  },
  onShareTimeline() {
    return { title: '盲酌酒识 · 白酒品鉴知识', query: '' };
  }
});
