(() => {
  'use strict';
  const pages = { home: '首页', gather: '酒局', knowledge: '酒识', mine: '我的' };
  const names = { a: '竹影手札', b: '夜酌俱乐部', c: '白日品鉴室' };
  const isPage = value => typeof value === 'string' && Object.hasOwn(pages, value);
  const isVersion = value => typeof value === 'string' && Object.hasOwn(names, value);
  const storageKey = 'mangzhuo-design-review-20261104';
  const cards = [...document.querySelectorAll('.variant')];
  let selected = {};
  let persistAvailable = true;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    for (const page of Object.keys(pages)) if (isVersion(saved?.[page])) selected[page] = saved[page];
  } catch (_) { persistAvailable = false; }
  let currentPage = new URLSearchParams(location.search).get('page') || 'home';
  if (!isPage(currentPage)) currentPage = 'home';
  let currentVersion = 'a';
  let single = false;
  const sync = document.getElementById('sync');
  const values = document.getElementById('selection-values');
  const status = document.getElementById('selection-status');
  const cardPage = { a: currentPage, b: currentPage, c: currentPage };
  const postOrigin = location.origin === 'null' ? '*' : location.origin;

  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(selected)); }
    catch (_) { persistAvailable = false; }
  }
  function renderSelection(message) {
    values.replaceChildren();
    for (const [key, label] of Object.entries(pages)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'selection-chip';
      button.setAttribute('aria-label', `${label}：${selected[key] ? selected[key].toUpperCase() + ' ' + names[selected[key]] : '尚未选择'}，点击对比`);
      const caption = document.createElement('span');
      caption.textContent = label;
      const choice = document.createElement('strong');
      choice.textContent = selected[key]?.toUpperCase() || '—';
      button.append(caption, choice);
      button.addEventListener('click', () => navigate(key));
      values.append(button);
    }
    document.querySelectorAll('[data-choose]').forEach(button => {
      const version = button.dataset.choose;
      const page = cardPage[version];
      const chosen = selected[page] === version;
      button.setAttribute('aria-pressed', String(chosen));
      button.replaceChildren(document.createTextNode(`${pages[page]}${chosen ? '已选' : '选'} ${version.toUpperCase()} `));
      const mark = document.createElement('span');
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = chosen ? '✓' : '＋';
      button.append(mark);
    });
    const count = Object.keys(selected).length;
    document.getElementById('export').disabled = !count;
    document.getElementById('clear').disabled = !count;
    status.textContent = message || (count ? `已选择 ${count} / 4 个页面。${persistAvailable ? '偏好已保存在此浏览器，可导出后交给我实施。' : '浏览器不支持本地保存，请导出选择留存。'}` : '尚未选择，可以先逛逛。');
  }
  function updateToolbar() {
    document.querySelectorAll('[data-page]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.page === currentPage)));
    cards.forEach(card => {
      const version = card.dataset.version;
      card.querySelector('.open-link').href = `${version}.html?page=${cardPage[version]}`;
      card.classList.toggle('focused', version === currentVersion);
    });
    try {
      const url = new URL(location.href);
      url.searchParams.set('page', currentPage);
      history.replaceState(null, '', url);
    } catch (_) { /* file previews still work without history access */ }
    renderSelection();
  }
  function navigate(page, exceptVersion) {
    if (!isPage(page)) return;
    currentPage = page;
    cards.forEach(card => {
      const version = card.dataset.version;
      cardPage[version] = page;
      if (version !== exceptVersion) card.querySelector('iframe').contentWindow.postMessage({source: 'mangzhuo-review', type: 'navigate', page}, postOrigin);
    });
    updateToolbar();
  }
  cards.forEach(card => {
    const frame = card.querySelector('iframe');
    const version = card.dataset.version;
    if (currentPage !== 'home') frame.src = `${version}.html?page=${currentPage}`;
    frame.addEventListener('load', () => frame.contentWindow.postMessage({source:'mangzhuo-review', type:'navigate', page:cardPage[version]}, postOrigin));
  });
  document.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.page)));
  document.querySelectorAll('[data-choose]').forEach(button => button.addEventListener('click', () => {
    const version = button.dataset.choose;
    const page = cardPage[version];
    if (selected[page] === version) delete selected[page];
    else selected[page] = version;
    persist();
    renderSelection();
  }));
  document.querySelectorAll('[data-suite]').forEach(button => button.addEventListener('click', () => {
    for (const page of Object.keys(pages)) selected[page] = button.dataset.suite;
    persist();
    renderSelection();
  }));
  document.getElementById('view-toggle').addEventListener('click', event => {
    single = !single;
    document.body.dataset.view = single ? 'single' : 'compare';
    const button = event.currentTarget;
    button.setAttribute('aria-pressed', String(single));
    button.textContent = single ? '返回并排对比 ↙' : '单版细看 ↗';
    document.querySelector('.single-picker').hidden = !single;
    updateToolbar();
  });
  document.querySelectorAll('.single-picker [data-version]').forEach(button => button.addEventListener('click', () => {
    currentVersion = button.dataset.version;
    document.querySelectorAll('.single-picker [data-version]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    updateToolbar();
  }));
  sync.addEventListener('change', () => { if (sync.checked) navigate(currentPage); });
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.data?.source !== 'mangzhuo-prototype' || event.data.type !== 'page-change' || !isPage(event.data.page)) return;
    const card = cards.find(item => item.querySelector('iframe').contentWindow === event.source);
    if (!card || event.data.version !== card.dataset.version) return;
    const version = card.dataset.version;
    if (cardPage[version] === event.data.page) return;
    cardPage[version] = event.data.page;
    if (sync.checked) navigate(event.data.page, version);
    else updateToolbar();
  });
  document.getElementById('clear').addEventListener('click', () => { selected = {}; persist(); renderSelection('选择已清空，可以重新组合。'); });
  document.getElementById('export').addEventListener('click', () => {
    const text = ['# 盲酌 · 页面设计选择', '', '设计批次：2026-11-04', '', ...Object.entries(pages).map(([page, label]) => `- ${label}：${selected[page] ? selected[page].toUpperCase() + '「' + names[selected[page]] + '」' : '待选择'}`), '', '这是一份视觉方向选择记录；各页面最终实施时需统一字体、导航、颜色与组件规范。', '交互原型中的示例记录不代表正式业务数据。', ''].join('\n');
    const url = URL.createObjectURL(new Blob([text], {type:'text/markdown;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = '盲酌-设计选择-2026-11-04.md';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = '已导出设计选择，接下来可以据此实施替换。';
  });
  updateToolbar();
})();
