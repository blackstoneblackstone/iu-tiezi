/**
 * IU Community - Common JavaScript Module
 * Shared functions for all pages
 */

// ===== Translations =====
const translations = {
  zh: {
    // Header
    siteTitle: 'IU 回帖合集',
    siteSubtitle: '아이유 커뮤니티 / IU 社区',

    // Stats
    totalReplies: '总回帖数',
    totalFans: 'Uaena',
    lastActive: '最后更新时间',

    // Controls
    searchPlaceholder: '搜索昵称、内容...',
    hasImage: '有图片',
    filterByFan: '筛选粉丝',
    clearFilter: '清除筛选',

    // Tabs
    allReplies: '全部帖子',
    fromIU: 'From. IU',
    dearIU: 'Dear. IU',
    freeBoard: 'Free',

    // Replies
    loading: '正在加载数据...',
    noResults: '没有找到匹配的结果',
    emptyIcon: '💌',
    originalPost: '查看原帖',

    // Pagination
    prev: '上一页',
    next: '下一页',

    // Footer
    footerText: '网站由 黑石大师 基于公开信息整理而成，纯为了方便 Uaena 们，为爱发电。',
    copyright: '© 2025 Dear IU · Made with love for 아이유 & Uaena',

    // Board names
    boardReplies: '回帖',
    boardFromIU: 'From IU',
    boardDearIU: 'Dear IU',
    boardFree: 'Free',
  },
  ko: {
    // Header
    siteTitle: 'IU 回帖合集',
    siteSubtitle: '아이유 커뮤니티 / IU Community',

    // Stats
    totalReplies: '총 댓글 수',
    totalFans: 'Uaena',
    lastActive: '마지막 업데이트',

    // Controls
    searchPlaceholder: '닉네임, 내용 검색...',
    hasImage: '이미지 있음',
    filterByFan: '팬 필터',
    clearFilter: '필터 해제',

    // Tabs
    allReplies: '전체 게시글',
    fromIU: 'From. IU',
    dearIU: 'Dear. IU',
    freeBoard: 'Free',

    // Replies
    loading: '데이터 로딩 중...',
    noResults: '일치하는 결과가 없습니다',
    emptyIcon: '💌',
    originalPost: '원문 보기',

    // Pagination
    prev: '이전',
    next: '다음',

    // Footer
    footerText: '이 사이트는 공개 정보를 바탕으로 黑石大师가 정리했으며, Uaena들의 편의를 위해 만들었습니다.',
    copyright: '© 2025 Dear IU · Made with love for 아이유 & Uaena',

    // Board names
    boardReplies: '답글',
    boardFromIU: 'From IU',
    boardDearIU: 'Dear IU',
    boardFree: 'Free',
  }
};

const IU_AVATAR = 'image/iu-avator.png';

// ===== State =====
const state = {
  currentLang: localStorage.getItem('iu-lang') || 'zh',
  stats: null,
  fans: [],
  selectedFan: null,
  hasImageFilter: false,
  searchQuery: '',
  onSelectFanCallback: null,
};

// ===== Data API =====
const DataAPI = {
  cache: new Map(),

  async loadJson(url) {
    if (this.cache.has(url)) {
      return this.cache.get(url);
    }
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      this.cache.set(url, data);
      return data;
    } catch (error) {
      console.error('Failed to load:', url, error);
      return null;
    }
  },

  async getStats() {
    if (state.stats) return state.stats;
    const data = await this.loadJson('data/stats.json');
    state.stats = data;
    return data;
  },

  async getFans() {
    if (state.fans.length > 0) return state.fans;
    const data = await this.loadJson('data/fans.json');
    state.fans = data || [];
    return state.fans;
  },

  async getReplies(page = 1) {
    return this.loadJson(`data/replies/page-${page}.json`);
  },

  async getFromIUPosts(page = 1) {
    return this.loadJson(`data/from-iu/page-${page}.json`);
  },

  async getDearIUPosts(page = 1) {
    return this.loadJson(`data/dear-iu/page-${page}.json`);
  },

  async getFreePosts(page = 1) {
    return this.loadJson(`data/free/page-${page}.json`);
  },

  async searchReplies(query) {
    // Load search index and find matching pages
    const indexData = await this.loadJson('data/search-index.json');
    if (!indexData || !indexData.index) return [];

    const lowerQuery = query.toLowerCase();
    const matchingPages = new Set();

    indexData.index.forEach(item => {
      if (
        (item.content_ko && item.content_ko.toLowerCase().includes(lowerQuery)) ||
        (item.content_zh && item.content_zh.toLowerCase().includes(lowerQuery)) ||
        (item.fan_username && item.fan_username.toLowerCase().includes(lowerQuery)) ||
        (item.fan_comment_ko && item.fan_comment_ko.toLowerCase().includes(lowerQuery)) ||
        (item.fan_comment_zh && item.fan_comment_zh.toLowerCase().includes(lowerQuery))
      ) {
        matchingPages.add(item.page);
      }
    });

    return Array.from(matchingPages);
  },

  async filterByFan(fanName) {
    const indexData = await this.loadJson('data/search-index.json');
    if (!indexData || !indexData.index) return { pages: [], ids: [] };

    const matchingPages = new Set();
    const matchingIds = new Set();

    indexData.index.forEach(item => {
      if (item.fan_username === fanName) {
        matchingPages.add(item.page);
        matchingIds.add(item.id);
      }
    });

    return {
      pages: Array.from(matchingPages),
      ids: Array.from(matchingIds)
    };
  },

  async filterByImage() {
    const indexData = await this.loadJson('data/search-index.json');
    if (!indexData || !indexData.index) return { pages: [], ids: [] };

    const matchingPages = new Set();
    const matchingIds = new Set();

    indexData.index.forEach(item => {
      if ((item.image_count > 0) || (item.fan_image_count > 0)) {
        matchingPages.add(item.page);
        matchingIds.add(item.id);
      }
    });

    return {
      pages: Array.from(matchingPages),
      ids: Array.from(matchingIds)
    };
  },

  clearCache() {
    this.cache.clear();
  }
};

// ===== Utility Functions =====
function t(key) {
  return translations[state.currentLang][key] || key;
}

function formatDate(dateStr, useRelative = true) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  // Relative time formatting
  if (useRelative) {
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes <= 1
          ? state.currentLang === 'zh' ? '刚刚' : '방금'
          : `${minutes}${state.currentLang === 'zh' ? '分钟前' : '분 전'}`;
      }
      return `${hours}${state.currentLang === 'zh' ? '小时前' : '시간 전'}`;
    } else if (days === 1) {
      return state.currentLang === 'zh' ? '昨天' : '어제';
    } else if (days < 7) {
      return `${days}${state.currentLang === 'zh' ? '天前' : '일 전'}`;
    }
  }

  // Absolute date formatting
  return date.toLocaleDateString(state.currentLang === 'zh' ? 'zh-CN' : 'ko-KR', {
    month: 'short',
    day: 'numeric',
  });
}

function formatFullDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString(state.currentLang === 'zh' ? 'zh-CN' : 'ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Helper: Get images from URLs or local paths
function getImages(urls, localPaths, count) {
  if (!count || count === 0) return [];
  // Prioritize local paths
  if (localPaths && localPaths.trim()) {
    return localPaths.split(/[,|]/).map(p => p.trim()).filter(Boolean);
  }
  if (!urls) return [];
  return urls.split(/[,|]/).map(u => u.trim()).filter(Boolean);
}

function setLanguage(lang) {
  state.currentLang = lang;
  localStorage.setItem('iu-lang', lang);
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'ko-KR';
  updatePageLanguage();
}

function updatePageLanguage() {
  // Update all elements with data-t attribute
  document.querySelectorAll('[data-t]').forEach(el => {
    const key = el.getAttribute('data-t');
    if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
      el.placeholder = t(key);
    } else {
      el.textContent = t(key);
    }
  });

  // Update language buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === state.currentLang);
  });
}

// ===== Render Functions =====
function renderHeader() {
  const header = document.createElement('header');
  header.className = 'header';
  header.innerHTML = `
    <div class="container header-content">
      <a href="index.html" class="logo">
        <img src="${IU_AVATAR}" alt="IU">
        <div>
          <div class="logo-text">IU 回帖合集</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); letter-spacing: 0.1em;">
            아이유 커뮤니티 · IU 社区
          </div>
        </div>
      </a>
      <div class="lang-switcher">
        <button class="lang-btn ${state.currentLang === 'zh' ? 'active' : ''}" data-lang="zh" onclick="setLanguage('zh')">中文</button>
        <button class="lang-btn ${state.currentLang === 'ko' ? 'active' : ''}" data-lang="ko" onclick="setLanguage('ko')">한국어</button>
      </div>
    </div>
  `;
  return header;
}

async function renderStatsBar() {
  const stats = await DataAPI.getStats();
  const div = document.createElement('div');
  div.className = 'stats-bar';
  div.innerHTML = `
    <div class="container stats-content">
      <div style="display: flex; gap: 32px; flex-wrap: wrap; flex: 1;">
        <div class="stat-item">
          <span class="stat-label" data-t="totalReplies">${t('totalReplies')}</span>
          <span class="stat-value">${stats?.totalReplies?.toLocaleString() || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label" style="text-transform: uppercase; letter-spacing: 0.08em;">Uaena</span>
          <span class="stat-value">${stats?.totalFans?.toLocaleString() || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label" data-t="lastActive">${t('lastActive')}</span>
          <span class="stat-value">${formatDate(stats?.lastActive)}</span>
        </div>
      </div>
      <div style="flex-shrink: 0;">
        <img src="image/coffee-qr.png" alt="${state.currentLang === 'zh' ? '赞助一杯咖啡' : '커피 한 잔 후원'}"
             style="width: 70px; height: 70px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); cursor: pointer; transition: transform 0.3s;"
             onmouseover="this.style.transform='scale(1.05)'"
             onmouseout="this.style.transform='scale(1)'"
             title="${state.currentLang === 'zh' ? '赞助一杯咖啡' : '커피 한 잔 후원'}">
      </div>
    </div>
  `;
  return div;
}

async function renderFansWall(onSelectFan) {
  const fans = await DataAPI.getFans();
  const div = document.createElement('div');
  div.className = 'fans-wall';

  const fansWithAvatar = fans.filter(f => f.avatar_url);
  const initialDisplayCount = 20;
  const initialFans = fansWithAvatar.slice(0, initialDisplayCount);
  const hasMore = fansWithAvatar.length > initialDisplayCount;

  div.innerHTML = `
    <div class="fans-wall-content" id="fans-wall-content">
      ${initialFans.map(fan => `
        <div class="fan-avatar ${state.selectedFan === fan.username ? 'selected' : ''}"
             data-fan="${escapeHtml(fan.username)}"
             title="${escapeHtml(fan.username)} (${fan.reply_count})">
          <img src="${fan.avatar_url}" alt="${escapeHtml(fan.username)}" loading="lazy" onload="this.classList.add('loaded')">
          <span class="reply-count">${fan.reply_count}</span>
        </div>
      `).join('')}
    </div>
    ${hasMore ? `
      <div class="fans-wall-more" id="fans-wall-more">
        <button class="fans-more-btn" onclick="IUApp.toggleMoreFans(this)">
          <span class="more-text">${state.currentLang === 'zh' ? '更多' : '더보기'}</span>
          <span class="more-icon">▼</span>
        </button>
      </div>
    ` : ''}
  `;

  // Store remaining fans data for expansion
  if (hasMore) {
    const remainingFans = fansWithAvatar.slice(initialDisplayCount);
    div.dataset.remainingFans = JSON.stringify(remainingFans);
  }

  // Add click handlers
  div.querySelectorAll('.fan-avatar').forEach(avatar => {
    avatar.addEventListener('click', () => {
      const fanName = avatar.dataset.fan;
      if (state.selectedFan === fanName) {
        state.selectedFan = null;
      } else {
        state.selectedFan = fanName;
      }
      // Update all avatar selections
      div.querySelectorAll('.fan-avatar').forEach(a => {
        a.classList.toggle('selected', a.dataset.fan === state.selectedFan);
      });
      if (onSelectFan) {
        state.onSelectFanCallback = onSelectFan;
        onSelectFan(state.selectedFan);
      }
    });
  });

  return div;
}

// Toggle more fans
function toggleMoreFans(btn) {
  const fansWall = btn.closest('.fans-wall');
  const contentDiv = fansWall.querySelector('#fans-wall-content');
  const moreIcon = btn.querySelector('.more-icon');
  const moreText = btn.querySelector('.more-text');

  // Check current state by text content (more reliable)
  const currentLang = state.currentLang;
  const collapseText = currentLang === 'zh' ? '收起' : '접기';
  const isExpanded = moreText.textContent === collapseText;

  if (!isExpanded) {
    // Expand - show all fans
    const remainingFans = JSON.parse(fansWall.dataset.remainingFans || '[]');

    remainingFans.forEach(fan => {
      const avatarDiv = document.createElement('div');
      avatarDiv.className = `fan-avatar ${state.selectedFan === fan.username ? 'selected' : ''}`;
      avatarDiv.dataset.fan = fan.username;
      avatarDiv.title = `${fan.username} (${fan.reply_count})`;
      avatarDiv.innerHTML = `
        <img src="${fan.avatar_url}" alt="${fan.username}" loading="lazy" onload="this.classList.add('loaded')">
        <span class="reply-count">${fan.reply_count}</span>
      `;
      avatarDiv.addEventListener('click', () => {
        if (state.selectedFan === fan.username) {
          state.selectedFan = null;
        } else {
          state.selectedFan = fan.username;
        }
        // Update all avatar selections
        fansWall.querySelectorAll('.fan-avatar').forEach(a => {
          a.classList.toggle('selected', a.dataset.fan === state.selectedFan);
        });
        // Call the callback if exists
        if (state.onSelectFanCallback) {
          state.onSelectFanCallback(state.selectedFan);
        }
      });
      contentDiv.appendChild(avatarDiv);
    });

    moreText.textContent = collapseText;
    moreIcon.style.transform = 'rotate(180deg)';
  } else {
    // Collapse - show only first 20
    const allAvatars = contentDiv.querySelectorAll('.fan-avatar');
    for (let i = 20; i < allAvatars.length; i++) {
      allAvatars[i].remove();
    }

    moreText.textContent = currentLang === 'zh' ? '更多' : '더보기';
    moreIcon.style.transform = 'rotate(0deg)';
  }
}

function renderNavTabs(activeTab) {
  const nav = document.createElement('nav');
  nav.className = 'nav-tabs';
  nav.innerHTML = `
    <a href="index.html" class="nav-tab ${activeTab === 'replies' ? 'active' : ''}" data-t="allReplies">${t('allReplies')}</a>
    <a href="from-iu.html" class="nav-tab ${activeTab === 'fromIU' ? 'active' : ''}" data-t="fromIU">${t('fromIU')}</a>
    <a href="dear-iu.html" class="nav-tab ${activeTab === 'dearIU' ? 'active' : ''}" data-t="dearIU">${t('dearIU')}</a>
    <a href="free.html" class="nav-tab ${activeTab === 'free' ? 'active' : ''}" data-t="freeBoard">${t('freeBoard')}</a>
  `;
  return nav;
}

function renderControls(onSearch, onFilterImage) {
  const div = document.createElement('div');
  div.className = 'controls';
  div.innerHTML = `
    <div class="search-box">
      <input type="text"
             placeholder="${t('searchPlaceholder')}"
             value="${escapeHtml(state.searchQuery)}"
             id="searchInput">
    </div>
    <div class="filter-group">
      <button class="filter-btn ${state.hasImageFilter ? 'active' : ''}" id="imageFilterBtn">
        📷 ${t('hasImage')}
      </button>
      ${state.selectedFan ? `
        <button class="filter-btn active" id="clearFanBtn">
          👤 ${state.selectedFan} ✕
        </button>
      ` : ''}
    </div>
  `;

  // Add event listeners
  const searchInput = div.querySelector('#searchInput');
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      if (onSearch) onSearch(state.searchQuery);
    }, 300);
  });

  const imageFilterBtn = div.querySelector('#imageFilterBtn');
  if (imageFilterBtn) {
    imageFilterBtn.addEventListener('click', () => {
      state.hasImageFilter = !state.hasImageFilter;
      imageFilterBtn.classList.toggle('active', state.hasImageFilter);
      if (onFilterImage) onFilterImage(state.hasImageFilter);
    });
  }

  const clearFanBtn = div.querySelector('#clearFanBtn');
  if (clearFanBtn) {
    clearFanBtn.addEventListener('click', () => {
      state.selectedFan = null;
      if (onSearch) onSearch(state.searchQuery);
    });
  }

  return div;
}

function renderPagination(currentPage, totalPages, onPageChange) {
  const div = document.createElement('div');
  div.className = 'pagination';

  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);

  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }

  // Prev button
  pages.push(`<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">${t('prev')}</button>`);

  // First page + ellipsis
  if (start > 1) {
    pages.push(`<button class="page-btn" data-page="1">1</button>`);
    if (start > 2) pages.push(`<span class="page-btn" disabled>...</span>`);
  }

  // Page numbers
  for (let i = start; i <= end; i++) {
    pages.push(`<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`);
  }

  // Last page + ellipsis
  if (end < totalPages) {
    if (end < totalPages - 1) pages.push(`<span class="page-btn" disabled>...</span>`);
    pages.push(`<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`);
  }

  // Next button
  pages.push(`<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">${t('next')}</button>`);

  div.innerHTML = pages.join('');

  // Add click handlers
  div.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.page);
      if (page && page !== currentPage && onPageChange) {
        onPageChange(page);
      }
    });
  });

  return div;
}

function renderReplyCard(reply, index) {
  const div = document.createElement('article');
  div.className = 'reply-card fade-in';
  div.style.animationDelay = `${index * 0.03}s`;

  // Determine display info
  const isFromIU = !reply.fan_username;
  const fanDisplayName = isFromIU ? (state.currentLang === 'zh' ? 'IU 来信' : 'From IU') : (reply.fan_username || 'Unknown');
  const fanInitial = reply.fan_username ? reply.fan_username.charAt(0).toUpperCase() : '💌';

  // Get display text based on language
  const displayText = state.currentLang === 'zh' && reply.content_zh
    ? reply.content_zh
    : (reply.content_ko || reply.content_zh || '');

  const fanDisplayText = state.currentLang === 'zh' && reply.fan_comment_zh
    ? reply.fan_comment_zh
    : (reply.fan_comment_ko || reply.fan_comment_zh || '');

  // Get images using helper function
  const iuImages = getImages(reply.image_urls, reply.iu_local_image_paths, reply.image_count);
  const fanImages = getImages(reply.fan_image_urls, reply.fan_local_image_paths, reply.fan_image_count);

  // Get avatar (prioritize local)
  const fanAvatarSrc = reply.fan_local_avatar || reply.fan_avatar;

  // Build image grid class based on count
  const getImageGridClass = (count) => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    return 'grid-cols-2 md:grid-cols-3';
  };

  div.innerHTML = `
    <!-- Header -->
    <div class="reply-card-header">
      ${fanAvatarSrc ? `
        <div class="reply-card-avatar-wrapper">
          <img src="${fanAvatarSrc}" alt="${escapeHtml(fanDisplayName)}" class="reply-card-avatar" onload="this.classList.add('loaded')">
        </div>
      ` : `
        <div class="reply-card-avatar-fallback">
          ${isFromIU ? '💌' : fanInitial}
        </div>
      `}
      <div class="reply-card-header-info">
        <div class="reply-card-author">${escapeHtml(fanDisplayName)}</div>
        <div class="reply-card-date">${formatDate(reply.post_time)}</div>
      </div>
    </div>

    <!-- Body -->
    <div class="reply-card-body">
      <!-- Fan Comment -->
      ${fanDisplayText ? `
        <div class="fan-comment-box">
          <div class="fan-comment-text">${escapeHtml(fanDisplayText)}</div>
          ${fanImages.length > 0 ? `
            <div class="images-grid ${getImageGridClass(fanImages.length)}">
              ${fanImages.map((img, i) => `
                <div class="image-thumbnail" onclick="IUApp.openImageViewer('${escapeHtml(img)}', ${i}, '${escapeHtml(JSON.stringify(fanImages).replace(/'/g, "&#39;"))}')">
                  <img src="${img}" alt="" loading="lazy" onload="this.classList.add('loaded')">
                  <div class="image-loading"></div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- IU Reply -->
      <div class="iu-reply-box">
        <div class="iu-reply-avatar-wrapper">
          <img src="${IU_AVATAR}" alt="IU" class="iu-reply-avatar">
        </div>
        <div class="iu-reply-content-wrapper">
          <div class="iu-reply-bubble">
            <div class="iu-reply-header-row">
              <span class="iu-reply-name">IU</span>
              <span class="iu-reply-badge">✓</span>
              ${reply.fan_username ? `<span class="iu-reply-to">回复 @${escapeHtml(reply.fan_username)}</span>` : ''}
              <span class="iu-reply-date">${formatDate(reply.replied_at)}</span>
            </div>
            <div class="iu-reply-text">${escapeHtml(displayText)}</div>
            ${iuImages.length > 0 ? `
              <div class="images-grid ${getImageGridClass(iuImages.length)}">
                ${iuImages.map((img, i) => `
                  <div class="image-thumbnail" onclick="IUApp.openImageViewer('${escapeHtml(img)}', ${i}, '${escapeHtml(JSON.stringify(iuImages).replace(/'/g, "&#39;"))}')">
                    <img src="${img}" alt="" loading="lazy" onload="this.classList.add('loaded')">
                    <div class="image-loading"></div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;

  return div;
}

function renderLoading() {
  const div = document.createElement('div');
  div.className = 'loading';
  div.innerHTML = `
    <div class="spinner"></div>
    <p data-t="loading">${t('loading')}</p>
  `;
  return div;
}

function renderEmpty() {
  const div = document.createElement('div');
  div.className = 'empty-state';
  div.innerHTML = `
    <div class="empty-icon">💌</div>
    <p data-t="noResults">${t('noResults')}</p>
  `;
  return div;
}

function renderFooter() {
  const footer = document.createElement('footer');
  footer.className = 'footer';
  footer.innerHTML = `
    <div class="container footer-content">
      <img src="image/xiaohongshu-qr.png" alt="小红书" class="footer-qr" onerror="this.style.display='none'">
      <div class="footer-text">
        💜 <span data-t="footerText">${t('footerText')}</span>
      </div>
      <div class="footer-copyright" data-t="copyright">${t('copyright')}</div>
    </div>
  `;
  return footer;
}

// ===== Image Viewer =====
function initImageViewer() {
  let modal = document.getElementById('imageModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'imageModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" onclick="closeImageViewer()">&times;</button>
        <div class="modal-image-container">
          <img src="" alt="" id="modalImage">
          <div class="modal-image-loading" id="modalImageLoading"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeImageViewer();
    });

    // Add load handler for modal image
    const modalImg = document.getElementById('modalImage');
    if (modalImg) {
      modalImg.onload = function() {
        this.classList.add('loaded');
        const loading = document.getElementById('modalImageLoading');
        if (loading) loading.style.display = 'none';
      };
    }
  }
}

function openImageViewer(src) {
  const modal = document.getElementById('imageModal');
  const img = document.getElementById('modalImage');
  const loading = document.getElementById('modalImageLoading');
  if (modal && img) {
    img.src = src;
    img.classList.remove('loaded');
    if (loading) loading.style.display = 'block';
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeImageViewer() {
  const modal = document.getElementById('imageModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// ===== Initialization =====
function initCommon() {
  initImageViewer();
  document.documentElement.lang = state.currentLang === 'zh' ? 'zh-CN' : 'ko-KR';
}

// Export for global access
window.IUApp = {
  state,
  DataAPI,
  t,
  IU_AVATAR,
  formatDate,
  escapeHtml,
  setLanguage,
  renderHeader,
  renderStatsBar,
  renderFansWall,
  renderNavTabs,
  renderControls,
  renderPagination,
  renderReplyCard,
  renderLoading,
  renderEmpty,
  renderFooter,
  openImageViewer,
  closeImageViewer,
  initCommon,
  toggleMoreFans,
};
