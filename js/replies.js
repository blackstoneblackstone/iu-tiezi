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
    const fansWall = await IUApp.renderFansWall((fanName) => {
      IUApp.state.selectedFan = fanName;
      repliesState.currentPage = 1;
      loadReplies();
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
    } else {
      // Load normal page
      const result = await IUApp.DataAPI.getReplies(repliesState.currentPage);
      data = result?.data || [];
      repliesState.totalPages = result?.totalPages || 1;
    }

    repliesState.replies = data;

    // Apply client-side filters
    let filtered = [...repliesState.replies];

    // Filter by fan
    if (IUApp.state.selectedFan) {
      filtered = filtered.filter(r => r.fan_username === IUApp.state.selectedFan);
    }

    // Filter by has image
    if (IUApp.state.hasImageFilter) {
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

    // Render pagination (only if not in search mode)
    if (paginationContainer && !repliesState.searchMode) {
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

  // Enter search mode
  repliesState.searchMode = true;

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

// Handle image filter
async function handleImageFilter(hasImage) {
  IUApp.state.hasImageFilter = hasImage;
  repliesState.currentPage = 1;
  await loadReplies();
}
