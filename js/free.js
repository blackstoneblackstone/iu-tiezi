/**
 * Free Board Page Logic
 */

const freeState = {
  currentPage: 1,
  totalPages: 1,
  posts: [],
  isLoading: false,
  iuAvatar: ''
};

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  IUApp.initCommon();

  document.getElementById('header-container').appendChild(IUApp.renderHeader());
  document.getElementById('stats-container').appendChild(await IUApp.renderStatsBar());
  document.getElementById('fans-container').appendChild(await IUApp.renderFansWall((fanName) => {
    if (fanName) {
      window.location.href = `index.html?fan=${encodeURIComponent(fanName)}`;
    }
  }));
  document.getElementById('nav-container').appendChild(IUApp.renderNavTabs('free'));
  document.getElementById('footer-container').appendChild(IUApp.renderFooter());

  // Load stats for header
  await IUApp.DataAPI.getStats();
  freeState.iuAvatar = IUApp.IU_AVATAR;

  await loadFreePosts();
});

// Load Free posts
async function loadFreePosts() {
  const contentContainer = document.getElementById('content-container');
  const paginationContainer = document.getElementById('pagination-container');

  if (!contentContainer) return;

  freeState.isLoading = true;
  contentContainer.innerHTML = '';
  contentContainer.appendChild(IUApp.renderLoading());

  try {
    const result = await IUApp.DataAPI.getFreePosts(freeState.currentPage);
    const posts = result?.data || [];
    freeState.totalPages = result?.totalPages || 1;
    freeState.posts = posts;

    contentContainer.innerHTML = '';

    if (posts.length === 0) {
      contentContainer.appendChild(IUApp.renderEmpty());
    } else {
      const grid = document.createElement('div');
      grid.className = 'masonry-grid';

      posts.forEach((post, index) => {
        const item = document.createElement('div');
        item.className = 'masonry-item';
        item.appendChild(renderFreePostCard(post, index));
        grid.appendChild(item);
      });

      contentContainer.appendChild(grid);
    }

    // Pagination
    if (paginationContainer) {
      paginationContainer.innerHTML = '';
      paginationContainer.appendChild(IUApp.renderPagination(
        freeState.currentPage,
        freeState.totalPages,
        (page) => {
          freeState.currentPage = page;
          loadFreePosts();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      ));
    }

  } catch (error) {
    console.error('Failed to load Free posts:', error);
    contentContainer.innerHTML = `<div class="empty-state"><p>Error loading data</p></div>`;
  } finally {
    freeState.isLoading = false;
  }
}

// Get images helper
function getImages(urls, localPaths) {
  if (localPaths && localPaths.trim()) {
    return localPaths.split(/[,|]/).map(p => p.trim()).filter(Boolean);
  }
  if (!urls) return [];
  return urls.split(/[,|]/).map(u => u.trim()).filter(Boolean);
}

// Format full date
function formatFullDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString(IUApp.state.currentLang === 'zh' ? 'zh-CN' : 'ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Render Free post card
function renderFreePostCard(post, index) {
  const div = document.createElement('div');
  div.className = 'post-card fade-in';
  div.style.animationDelay = `${index * 0.05}s`;

  const hasIUReply = post.direct_iu_replies && post.direct_iu_replies.length > 0;
  const images = getImages(post.image_urls, post.local_image_paths);

  // Get display text based on language
  const displayContent = IUApp.state.currentLang === 'zh'
    ? (post.content_zh || post.content_ko)
    : (post.content_ko || post.content_zh);

  const displayTitle = IUApp.state.currentLang === 'zh'
    ? (post.title_zh || post.title_ko)
    : (post.title_ko || post.title_zh);

  // Get avatar (prioritize local)
  const authorAvatar = post.author_local_avatar || post.author_avatar;

  // Build images HTML
  const getImageGridClass = (count) => {
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    return 'grid-cols-2 md:grid-cols-3';
  };

  const imagesHtml = images.length > 0 ? `
    <div class="images-grid ${getImageGridClass(images.length)}">
      ${images.map((img, i) => `
        <div class="image-thumbnail" onclick="IUApp.openImageViewer('${IUApp.escapeHtml(img)}')">
          <img src="${img}" alt="" loading="lazy" onload="this.classList.add('loaded')">
          <div class="image-loading"></div>
        </div>
      `).join('')}
    </div>
  ` : '';

  // Build IU replies HTML
  const iuRepliesHtml = post.direct_iu_replies?.map(reply => {
    const replyImages = getImages(reply.image_urls, reply.local_image_paths);
    const replyDisplayContent = IUApp.state.currentLang === 'zh'
      ? (reply.content_zh || reply.content_ko)
      : (reply.content_ko || reply.content_zh);

    const replyLabel = IUApp.state.currentLang === 'zh' ? '回复' : '답글';

    return `
      <div class="iu-reply-thread">
        <div class="thread-line"></div>
        <div class="iu-comment-reply">
          <div class="iu-comment-reply-header">
            <div class="iu-comment-reply-avatar">
              <img src="${freeState.iuAvatar}" alt="IU">
            </div>
            <div>
              <div class="iu-comment-reply-name">
                <span class="iu-name">IU</span>
                <span class="reply-label">${replyLabel}</span>
                <span class="reply-target">@${IUApp.escapeHtml(post.author_username || '')}</span>
              </div>
              <div class="iu-comment-reply-time">${formatFullDate(reply.replied_at)}</div>
            </div>
          </div>
          <div class="iu-comment-reply-content">${IUApp.escapeHtml(replyDisplayContent || '')}</div>
          ${replyImages.length > 0 ? `
            <div class="comment-card-images">
              ${replyImages.map(img => `
                <div class="comment-image-wrapper">
                  <img src="${img}" onclick="IUApp.openImageViewer('${IUApp.escapeHtml(img)}')" onload="this.classList.add('loaded')">
                  <div class="comment-image-loading"></div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('') || '';

  div.innerHTML = `
    <!-- Author Post Header -->
    <div class="post-card-header">
      <div class="post-card-author">
        <div class="post-card-avatar">
          ${authorAvatar ? `<img src="${authorAvatar}">` : (post.author_username?.[0] || '?')}
        </div>
        <div class="post-card-author-info">
          <div class="post-card-author-name" style="color: var(--text-primary);">
            <span>${IUApp.escapeHtml(post.author_username || 'Unknown')}</span>
            <span class="post-card-board-badge">Free</span>
          </div>
          <div class="post-card-time">${formatFullDate(post.post_time)}</div>
        </div>
      </div>

      <!-- Post Title -->
      ${displayTitle ? `<h3 class="post-card-title">${IUApp.escapeHtml(displayTitle)}</h3>` : ''}

      <!-- Post Content -->
      <p class="post-card-content">${IUApp.escapeHtml(displayContent || '')}</p>

      ${imagesHtml}
    </div>

    <!-- IU Replies Section -->
    ${hasIUReply ? `
      <div class="post-card-comments">
        ${iuRepliesHtml}
      </div>
    ` : ''}
  `;

  return div;
}
