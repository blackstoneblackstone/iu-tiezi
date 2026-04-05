/**
 * Replies Page Logic
 */

// State for replies page
const repliesState = {
  currentPage: 1,
  totalPages: 1,
  replies: [],
  filteredReplies: [],
  isLoading: false,
  searchMode: false,
  searchPages: [],
  fanFilterMode: false,
  fanFilterPages: [],
  fanFilterIds: [],
  imageFilterMode: false,
  imageFilterPages: [],
  imageFilterIds: [],
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
        repliesState.searchMode = false;
        repliesState.searchQuery = '';
        repliesState.imageFilterMode = false;
        repliesState.imageFilterPages = [];
        repliesState.imageFilterIds = [];
        IUApp.state.hasImageFilter = false;
      } else {
        // Exit fan filter mode
        repliesState.fanFilterMode = false;
        repliesState.fanFilterPages = [];
        repliesState.fanFilterIds = [];
      }

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
    repliesState.currentPage = 1;

    await loadReplies();
  }
});

// Load replies data
async function loadReplies() {
  const contentContainer = document.getElementById('content-container');
  const paginationContainer = document.getElementById('pagination-container');

  if (!contentContainer) return;

  // Show loading
  repliesState.isLoading = true;
  contentContainer.innerHTML = '';
  contentContainer.appendChild(IUApp.renderLoading());

  try {
    let data;

    // If in search mode
    if (repliesState.searchMode && IUApp.state.searchQuery) {
      // Load from search results
      data = await loadSearchResults();
    } else if (repliesState.fanFilterMode && IUApp.state.selectedFan) {
      // Load from fan filter results
      data = await loadFanFilterResults();
    } else if (repliesState.imageFilterMode && IUApp.state.hasImageFilter) {
      // Load from image filter results
      data = await loadImageFilterResults();
    } else {
      // Load normal page
      const result = await IUApp.DataAPI.getReplies(repliesState.currentPage);
      data = result?.data || [];
      repliesState.totalPages = result?.totalPages || 1;
    }

    repliesState.replies = data;

    // Apply client-side filters (only for normal mode)
    let filtered = [...repliesState.replies];

    // Filter by fan (only in normal mode, not in fan filter mode)
    if (IUApp.state.selectedFan && !repliesState.fanFilterMode) {
      filtered = filtered.filter(r => r.fan_username === IUApp.state.selectedFan);
    }

    // Filter by has image (only in normal mode, not in image filter mode)
    if (IUApp.state.hasImageFilter && !repliesState.imageFilterMode) {
      filtered = filtered.filter(r =>
        (r.image_count > 0) || (r.fan_image_count > 0)
      );
    }

    repliesState.filteredReplies = filtered;

    // Render content
    contentContainer.innerHTML = '';

    if (filtered.length === 0) {
      contentContainer.appendChild(IUApp.renderEmpty());
    } else {
      const grid = document.createElement('div');
      grid.className = 'masonry-grid';

      filtered.forEach((reply, index) => {
        const item = document.createElement('div');
        item.className = 'masonry-item';
        item.appendChild(IUApp.renderReplyCard(reply, index));
        grid.appendChild(item);
      });

      contentContainer.appendChild(grid);
    }

    // Render pagination (only if not in search/fan-filter/image-filter mode)
    if (paginationContainer && !repliesState.searchMode && !repliesState.fanFilterMode && !repliesState.imageFilterMode) {
      paginationContainer.innerHTML = '';
      paginationContainer.appendChild(IUApp.renderPagination(
        repliesState.currentPage,
        repliesState.totalPages,
        (page) => {
          repliesState.currentPage = page;
          loadReplies();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      ));
    } else if (paginationContainer) {
      paginationContainer.innerHTML = '';
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
    await loadReplies();
    return;
  }

  // Enter search mode (exit fan filter and image filter modes)
  repliesState.searchMode = true;
  repliesState.fanFilterMode = false;
  repliesState.fanFilterPages = [];
  repliesState.fanFilterIds = [];
  repliesState.imageFilterMode = false;
  repliesState.imageFilterPages = [];
  repliesState.imageFilterIds = [];
  IUApp.state.selectedFan = null;
  IUApp.state.hasImageFilter = false;

  // Get matching pages from search index
  const matchingPages = await IUApp.DataAPI.searchReplies(query);
  repliesState.searchPages = matchingPages;

  await loadReplies();
}

// Load search results
async function loadSearchResults() {
  if (repliesState.searchPages.length === 0) {
    return [];
  }

  // Load all matching pages
  const allResults = [];
  const lowerQuery = IUApp.state.searchQuery.toLowerCase();

  for (const pageNum of repliesState.searchPages) {
    const result = await IUApp.DataAPI.getReplies(pageNum);
    if (result?.data) {
      // Filter matching items
      const matching = result.data.filter(r => {
        const text = `${r.content_ko || ''} ${r.content_zh || ''} ${r.fan_username || ''} ${r.fan_comment_ko || ''} ${r.fan_comment_zh || ''}`.toLowerCase();
        return text.includes(lowerQuery);
      });
      allResults.push(...matching);
    }
  }

  // Simple pagination for search results
  const pageSize = 50;
  const start = (repliesState.currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageData = allResults.slice(start, end);

  repliesState.totalPages = Math.ceil(allResults.length / pageSize);

  return pageData;
}

// Load fan filter results
async function loadFanFilterResults() {
  if (repliesState.fanFilterPages.length === 0) {
    return [];
  }

  // Load all matching pages
  const allResults = [];
  const fanName = IUApp.state.selectedFan;

  for (const pageNum of repliesState.fanFilterPages) {
    const result = await IUApp.DataAPI.getReplies(pageNum);
    if (result?.data) {
      // Filter matching items
      const matching = result.data.filter(r => r.fan_username === fanName);
      allResults.push(...matching);
    }
  }

  // Sort by replied_at descending
  allResults.sort((a, b) => new Date(b.replied_at) - new Date(a.replied_at));

  // Simple pagination for fan filter results
  const pageSize = 50;
  const start = (repliesState.currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageData = allResults.slice(start, end);

  repliesState.totalPages = Math.ceil(allResults.length / pageSize);

  return pageData;
}

// Load image filter results
async function loadImageFilterResults() {
  if (repliesState.imageFilterPages.length === 0) {
    return [];
  }

  // Load all matching pages
  const allResults = [];

  for (const pageNum of repliesState.imageFilterPages) {
    const result = await IUApp.DataAPI.getReplies(pageNum);
    if (result?.data) {
      // Filter matching items
      const matching = result.data.filter(r =>
        (r.image_count > 0) || (r.fan_image_count > 0)
      );
      allResults.push(...matching);
    }
  }

  // Sort by replied_at descending
  allResults.sort((a, b) => new Date(b.replied_at) - new Date(a.replied_at));

  // Simple pagination for image filter results
  const pageSize = 50;
  const start = (repliesState.currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageData = allResults.slice(start, end);

  repliesState.totalPages = Math.ceil(allResults.length / pageSize);

  return pageData;
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
    repliesState.searchMode = false;
    repliesState.searchQuery = '';
    repliesState.fanFilterMode = false;
    repliesState.fanFilterPages = [];
    repliesState.fanFilterIds = [];
    IUApp.state.selectedFan = null;
  } else {
    // Exit image filter mode
    repliesState.imageFilterMode = false;
    repliesState.imageFilterPages = [];
    repliesState.imageFilterIds = [];
  }

  await loadReplies();
}
