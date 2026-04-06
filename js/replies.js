/**
 * Replies Page Logic - Infinite Scroll Version
 */

// State for replies page
const repliesState = {
  currentPage: 1,
  totalPages: 1,
  replies: [],
  filteredReplies: [],
  isLoading: false,
  isAppending: false,
  searchMode: false,
  searchPages: [],
  searchResults: [],
  fanFilterMode: false,
  fanFilterPages: [],
  fanFilterResults: [],
  fanFilterIds: [],
  imageFilterMode: false,
  imageFilterPages: [],
  imageFilterResults: [],
  imageFilterIds: [],
  hasMore: true,
};

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  // Init common functionality
  IUApp.initCommon();

  // Render header
  const headerContainer = document.getElementById('header-container');
  if (headerContainer) {
    headerContainer.appendChild(IUApp.renderHeader());
  }

  // Render stats bar
  const statsContainer = document.getElementById('stats-container');
  if (statsContainer) {
    const statsBar = await IUApp.renderStatsBar();
    statsContainer.appendChild(statsBar);
  }

  // Render fans wall
  const fansContainer = document.getElementById('fans-container');
  if (fansContainer) {
    const fansWall = await IUApp.renderFansWall(async (fanName) => {
      IUApp.state.selectedFan = fanName;
      repliesState.currentPage = 1;

      if (fanName) {
        // Enter fan filter mode (exit other modes)
        const result = await IUApp.DataAPI.filterByFan(fanName);
        repliesState.fanFilterMode = true;
        repliesState.fanFilterPages = result.pages;
        repliesState.fanFilterIds = result.ids;
        repliesState.fanFilterResults = [];
        repliesState.searchMode = false;
        repliesState.searchQuery = '';
        repliesState.imageFilterMode = false;
        repliesState.imageFilterPages = [];
        repliesState.imageFilterResults = [];
        repliesState.imageFilterIds = [];
        IUApp.state.hasImageFilter = false;
        repliesState.hasMore = result.pages.length > 0;
      } else {
        // Exit fan filter mode
        repliesState.fanFilterMode = false;
        repliesState.fanFilterPages = [];
        repliesState.fanFilterResults = [];
        repliesState.fanFilterIds = [];
        // Reset to page 1 and check if there are more pages
        const stats = await IUApp.DataAPI.getStats();
        repliesState.totalPages = stats?.totalPages || 1;
        repliesState.hasMore = repliesState.currentPage < repliesState.totalPages;
      }

      // Clear content and reload
      clearContent();
      await loadReplies();
    });
    fansContainer.appendChild(fansWall);
  }

  // Render nav tabs
  const navContainer = document.getElementById('nav-container');
  if (navContainer) {
    navContainer.appendChild(IUApp.renderNavTabs('replies'));
  }

  // Render controls
  const controlsContainer = document.getElementById('controls-container');
  if (controlsContainer) {
    controlsContainer.appendChild(IUApp.renderControls(
      (query) => handleSearch(query),
      (hasImage) => handleImageFilter(hasImage)
    ));
  }

  // Render footer
  const footerContainer = document.getElementById('footer-container');
  if (footerContainer) {
    footerContainer.appendChild(IUApp.renderFooter());
  }

  // Load initial data
  await loadReplies();

  // Setup infinite scroll
  setupInfiniteScroll();

  // Check URL params for fan filter
  const urlParams = new URLSearchParams(window.location.search);
  const fanParam = urlParams.get('fan');
  if (fanParam) {
    IUApp.state.selectedFan = fanParam;
    IUApp.state.searchQuery = '';

    // Enter fan filter mode
    const result = await IUApp.DataAPI.filterByFan(fanParam);
    repliesState.fanFilterMode = true;
    repliesState.fanFilterPages = result.pages;
    repliesState.fanFilterIds = result.ids;
    repliesState.fanFilterResults = [];
    repliesState.currentPage = 1;
    repliesState.hasMore = result.pages.length > 0;

    clearContent();
    await loadReplies();
  }
});

// Clear content container
function clearContent() {
  const contentContainer = document.getElementById('content-container');
  if (contentContainer) {
    contentContainer.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'masonry-grid';
    grid.id = 'replies-grid';
    contentContainer.appendChild(grid);
  }
}

// Setup infinite scroll
function setupInfiniteScroll() {
  const paginationContainer = document.getElementById('pagination-container');
  if (paginationContainer) {
    paginationContainer.innerHTML = '';
    // Create infinite scroll sentinel
    const sentinel = document.createElement('div');
    sentinel.id = 'infinite-sentinel';
    paginationContainer.appendChild(sentinel);
  }

  // Intersection Observer for infinite scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && repliesState.hasMore && !repliesState.isLoading && !repliesState.isAppending) {
        loadMoreReplies();
      }
    });
  }, {
    rootMargin: '200px',
    threshold: 0.1
  });

  const sentinel = document.getElementById('infinite-sentinel');
  if (sentinel) {
    observer.observe(sentinel);
  }
}

// Load more replies (for infinite scroll)
async function loadMoreReplies() {
  if (!repliesState.hasMore || repliesState.isAppending) return;

  repliesState.isAppending = true;
  showInfiniteLoading();

  try {
    repliesState.currentPage++;
    let newData = [];

    if (repliesState.searchMode && IUApp.state.searchQuery) {
      newData = await loadSearchResultsPage();
    } else if (repliesState.fanFilterMode && IUApp.state.selectedFan) {
      newData = await loadFanFilterResultsPage();
    } else if (repliesState.imageFilterMode && IUApp.state.hasImageFilter) {
      newData = await loadImageFilterResultsPage();
    } else {
      const result = await IUApp.DataAPI.getReplies(repliesState.currentPage);
      newData = result?.data || [];
      repliesState.hasMore = repliesState.currentPage < repliesState.totalPages;
    }

    if (newData.length > 0) {
      appendReplies(newData);
    } else {
      repliesState.hasMore = false;
    }

  } catch (error) {
    console.error('Failed to load more replies:', error);
  } finally {
    repliesState.isAppending = false;
    hideInfiniteLoading();
    if (!repliesState.hasMore) {
      showInfiniteEnd();
    }
  }
}

// Show infinite scroll loading indicator
function showInfiniteLoading() {
  let loader = document.getElementById('infinite-loading');
  if (!loader) {
    const paginationContainer = document.getElementById('pagination-container');
    if (paginationContainer) {
      loader = document.createElement('div');
      loader.id = 'infinite-loading';
      loader.className = 'infinite-loading';
      loader.innerHTML = '<div class="infinite-spinner"></div>';
      paginationContainer.insertBefore(loader, paginationContainer.firstChild);
    }
  }
}

// Hide infinite scroll loading indicator
function hideInfiniteLoading() {
  const loader = document.getElementById('infinite-loading');
  if (loader) {
    loader.remove();
  }
}

// Show end of content message
function showInfiniteEnd() {
  let endMsg = document.getElementById('infinite-end');
  if (!endMsg) {
    const paginationContainer = document.getElementById('pagination-container');
    if (paginationContainer) {
      endMsg = document.createElement('div');
      endMsg.id = 'infinite-end';
      endMsg.className = 'infinite-end';
      endMsg.innerHTML = IUApp.state.currentLang === 'zh'
        ? '— 已加载全部内容 —'
        : '— 모든 내용을 로드했습니다 —';
      paginationContainer.appendChild(endMsg);
    }
  }
}

// Append new replies to existing grid
function appendReplies(newReplies) {
  const grid = document.getElementById('replies-grid');
  if (!grid) return;

  const startIndex = repliesState.replies.length;
  newReplies.forEach((reply, i) => {
    const item = document.createElement('div');
    item.className = 'masonry-item';
    item.appendChild(IUApp.renderReplyCard(reply, startIndex + i));
    grid.appendChild(item);
  });

  repliesState.replies.push(...newReplies);
}

// Load replies data
async function loadReplies() {
  const contentContainer = document.getElementById('content-container');
  if (!contentContainer) return;

  // Show skeleton loading
  repliesState.isLoading = true;
  contentContainer.innerHTML = '';
  contentContainer.appendChild(IUApp.renderSkeletonCards(6));

  try {
    let data;

    // If in search mode
    if (repliesState.searchMode && IUApp.state.searchQuery) {
      // Load all search results
      data = await loadAllSearchResults();
    } else if (repliesState.fanFilterMode && IUApp.state.selectedFan) {
      // Load all fan filter results
      data = await loadAllFanFilterResults();
    } else if (repliesState.imageFilterMode && IUApp.state.hasImageFilter) {
      // Load all image filter results
      data = await loadAllImageFilterResults();
    } else {
      // Load normal page
      const result = await IUApp.DataAPI.getReplies(repliesState.currentPage);
      data = result?.data || [];
      repliesState.totalPages = result?.totalPages || 1;
      repliesState.hasMore = repliesState.currentPage < repliesState.totalPages;
    }

    repliesState.replies = data;

    // Render content with masonry grid
    contentContainer.innerHTML = '';

    if (data.length === 0) {
      contentContainer.appendChild(IUApp.renderEmpty());
      repliesState.hasMore = false;
    } else {
      const grid = document.createElement('div');
      grid.className = 'masonry-grid';
      grid.id = 'replies-grid';

      data.forEach((reply, index) => {
        const item = document.createElement('div');
        item.className = 'masonry-item';
        item.appendChild(IUApp.renderReplyCard(reply, index));
        grid.appendChild(item);
      });

      contentContainer.appendChild(grid);
    }

  } catch (error) {
    console.error('Failed to load replies:', error);
    contentContainer.innerHTML = `<div class="empty-state"><p>Error loading data</p></div>`;
  } finally {
    repliesState.isLoading = false;
  }
}

// Handle search
async function handleSearch(query) {
  IUApp.state.searchQuery = query;
  repliesState.currentPage = 1;

  if (!query.trim()) {
    repliesState.searchMode = false;
    repliesState.searchPages = [];
    repliesState.searchResults = [];
    // Reset pagination info
    const stats = await IUApp.DataAPI.getStats();
    repliesState.totalPages = stats?.totalPages || 1;
    repliesState.hasMore = repliesState.currentPage < repliesState.totalPages;
    clearContent();
    await loadReplies();
    return;
  }

  // Enter search mode (exit fan filter and image filter modes)
  repliesState.searchMode = true;
  repliesState.fanFilterMode = false;
  repliesState.fanFilterPages = [];
  repliesState.fanFilterResults = [];
  repliesState.fanFilterIds = [];
  repliesState.imageFilterMode = false;
  repliesState.imageFilterPages = [];
  repliesState.imageFilterResults = [];
  repliesState.imageFilterIds = [];
  IUApp.state.selectedFan = null;
  IUApp.state.hasImageFilter = false;

  // Get matching pages from search index
  const matchingPages = await IUApp.DataAPI.searchReplies(query);
  repliesState.searchPages = matchingPages;
  repliesState.searchResults = [];
  repliesState.hasMore = matchingPages.length > 0;

  clearContent();
  await loadReplies();
}

// Load all search results (initial load)
async function loadAllSearchResults() {
  if (repliesState.searchPages.length === 0) {
    repliesState.hasMore = false;
    return [];
  }

  // Load first batch of matching pages
  const allResults = [];
  const lowerQuery = IUApp.state.searchQuery.toLowerCase();

  // Load pages progressively for initial display
  const initialPages = repliesState.searchPages.slice(0, 3);
  for (const pageNum of initialPages) {
    const result = await IUApp.DataAPI.getReplies(pageNum);
    if (result?.data) {
      const matching = result.data.filter(r => {
        const text = `${r.content_ko || ''} ${r.content_zh || ''} ${r.fan_username || ''} ${r.fan_comment_ko || ''} ${r.fan_comment_zh || ''}`.toLowerCase();
        return text.includes(lowerQuery);
      });
      allResults.push(...matching);
    }
  }

  // Store for infinite scroll continuation
  repliesState.searchResults = allResults;
  repliesState.hasMore = repliesState.searchPages.length > 3 || allResults.length >= 50;

  // Sort by replied_at descending
  allResults.sort((a, b) => new Date(b.replied_at) - new Date(a.replied_at));

  return allResults.slice(0, 50);
}

// Load more search results for infinite scroll
async function loadSearchResultsPage() {
  const lowerQuery = IUApp.state.searchQuery.toLowerCase();
  const pageBatch = Math.floor(repliesState.currentPage / 3);
  const startPageIndex = pageBatch * 3;
  const endPageIndex = startPageIndex + 3;

  if (startPageIndex >= repliesState.searchPages.length) {
    repliesState.hasMore = false;
    return [];
  }

  const pagesToLoad = repliesState.searchPages.slice(startPageIndex, endPageIndex);
  const newResults = [];

  for (const pageNum of pagesToLoad) {
    const result = await IUApp.DataAPI.getReplies(pageNum);
    if (result?.data) {
      const matching = result.data.filter(r => {
        const text = `${r.content_ko || ''} ${r.content_zh || ''} ${r.fan_username || ''} ${r.fan_comment_ko || ''} ${r.fan_comment_zh || ''}`.toLowerCase();
        return text.includes(lowerQuery);
      });
      newResults.push(...matching);
    }
  }

  newResults.sort((a, b) => new Date(b.replied_at) - new Date(a.replied_at));
  repliesState.hasMore = endPageIndex < repliesState.searchPages.length;

  return newResults.slice(0, 50);
}

// Load all fan filter results (initial load)
async function loadAllFanFilterResults() {
  if (repliesState.fanFilterPages.length === 0) {
    repliesState.hasMore = false;
    return [];
  }

  const allResults = [];
  const fanName = IUApp.state.selectedFan;

  // Load first batch
  const initialPages = repliesState.fanFilterPages.slice(0, 3);
  for (const pageNum of initialPages) {
    const result = await IUApp.DataAPI.getReplies(pageNum);
    if (result?.data) {
      const matching = result.data.filter(r => r.fan_username === fanName);
      allResults.push(...matching);
    }
  }

  repliesState.fanFilterResults = allResults;
  repliesState.hasMore = repliesState.fanFilterPages.length > 3;

  allResults.sort((a, b) => new Date(b.replied_at) - new Date(a.replied_at));

  return allResults.slice(0, 50);
}

// Load more fan filter results for infinite scroll
async function loadFanFilterResultsPage() {
  const fanName = IUApp.state.selectedFan;
  const pageBatch = Math.floor(repliesState.currentPage / 3);
  const startPageIndex = pageBatch * 3;
  const endPageIndex = startPageIndex + 3;

  if (startPageIndex >= repliesState.fanFilterPages.length) {
    repliesState.hasMore = false;
    return [];
  }

  const pagesToLoad = repliesState.fanFilterPages.slice(startPageIndex, endPageIndex);
  const newResults = [];

  for (const pageNum of pagesToLoad) {
    const result = await IUApp.DataAPI.getReplies(pageNum);
    if (result?.data) {
      const matching = result.data.filter(r => r.fan_username === fanName);
      newResults.push(...matching);
    }
  }

  newResults.sort((a, b) => new Date(b.replied_at) - new Date(a.replied_at));
  repliesState.hasMore = endPageIndex < repliesState.fanFilterPages.length;

  return newResults.slice(0, 50);
}

// Load all image filter results (initial load)
async function loadAllImageFilterResults() {
  if (repliesState.imageFilterPages.length === 0) {
    repliesState.hasMore = false;
    return [];
  }

  const allResults = [];

  // Load first batch
  const initialPages = repliesState.imageFilterPages.slice(0, 3);
  for (const pageNum of initialPages) {
    const result = await IUApp.DataAPI.getReplies(pageNum);
    if (result?.data) {
      const matching = result.data.filter(r =>
        (r.image_count > 0) || (r.fan_image_count > 0)
      );
      allResults.push(...matching);
    }
  }

  repliesState.imageFilterResults = allResults;
  repliesState.hasMore = repliesState.imageFilterPages.length > 3;

  allResults.sort((a, b) => new Date(b.replied_at) - new Date(a.replied_at));

  return allResults.slice(0, 50);
}

// Load more image filter results for infinite scroll
async function loadImageFilterResultsPage() {
  const pageBatch = Math.floor(repliesState.currentPage / 3);
  const startPageIndex = pageBatch * 3;
  const endPageIndex = startPageIndex + 3;

  if (startPageIndex >= repliesState.imageFilterPages.length) {
    repliesState.hasMore = false;
    return [];
  }

  const pagesToLoad = repliesState.imageFilterPages.slice(startPageIndex, endPageIndex);
  const newResults = [];

  for (const pageNum of pagesToLoad) {
    const result = await IUApp.DataAPI.getReplies(pageNum);
    if (result?.data) {
      const matching = result.data.filter(r =>
        (r.image_count > 0) || (r.fan_image_count > 0)
      );
      newResults.push(...matching);
    }
  }

  newResults.sort((a, b) => new Date(b.replied_at) - new Date(a.replied_at));
  repliesState.hasMore = endPageIndex < repliesState.imageFilterPages.length;

  return newResults.slice(0, 50);
}

// Handle image filter
async function handleImageFilter(hasImage) {
  IUApp.state.hasImageFilter = hasImage;
  repliesState.currentPage = 1;

  if (hasImage) {
    // Enter image filter mode (exit other modes)
    const result = await IUApp.DataAPI.filterByImage();
    repliesState.imageFilterMode = true;
    repliesState.imageFilterPages = result.pages;
    repliesState.imageFilterIds = result.ids;
    repliesState.imageFilterResults = [];
    repliesState.searchMode = false;
    repliesState.searchQuery = '';
    repliesState.fanFilterMode = false;
    repliesState.fanFilterPages = [];
    repliesState.fanFilterResults = [];
    repliesState.fanFilterIds = [];
    IUApp.state.selectedFan = null;
    repliesState.hasMore = result.pages.length > 0;
  } else {
    // Exit image filter mode
    repliesState.imageFilterMode = false;
    repliesState.imageFilterPages = [];
    repliesState.imageFilterResults = [];
    repliesState.imageFilterIds = [];
    // Reset pagination info
    const stats = await IUApp.DataAPI.getStats();
    repliesState.totalPages = stats?.totalPages || 1;
    repliesState.hasMore = repliesState.currentPage < repliesState.totalPages;
  }

  clearContent();
  await loadReplies();
}
