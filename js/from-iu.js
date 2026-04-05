/**
 * From IU Page Logic
 */

const fromIUState = {
  currentPage: 1,
  totalPages: 1,
  posts: [],
  isLoading: false,
  expandedPosts: new Set(),
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
  document.getElementById('nav-container').appendChild(IUApp.renderNavTabs('fromIU'));
  document.getElementById('footer-container').appendChild(IUApp.renderFooter());

  // Load stats for header
  await IUApp.DataAPI.getStats();
  fromIUState.iuAvatar = IUApp.IU_AVATAR;

  await loadFromIUPosts();
});

// Load From IU posts
async function loadFromIUPosts() {
  const contentContainer = document.getElementById('content-container');
  const paginationContainer = document.getElementById('pagination-container');

  if (!contentContainer) return;

  fromIUState.isLoading = true;
  contentContainer.innerHTML = '';
  contentContainer.appendChild(IUApp.renderLoading());

  try {
    const result = await IUApp.DataAPI.getFromIUPosts(fromIUState.currentPage);
    const posts = result?.data || [];
    fromIUState.totalPages = result?.totalPages || 1;
    fromIUState.posts = posts;

    contentContainer.innerHTML = '';

    if (posts.length === 0) {
      contentContainer.appendChild(IUApp.renderEmpty());
    } else {
      const grid = document.createElement('div');
      grid.className = 'masonry-grid';

      posts.forEach((post, index) => {
        const item = document.createElement('div');
        item.className = 'masonry-item';
        item.appendChild(renderFromIUPostCard(post, index));
        grid.appendChild(item);
      });

      contentContainer.appendChild(grid);
    }

    // Pagination
    if (paginationContainer) {
      paginationContainer.innerHTML = '';
      paginationContainer.appendChild(IUApp.renderPagination(
        fromIUState.currentPage,
        fromIUState.totalPages,
        (page) => {
          fromIUState.currentPage = page;
          loadFromIUPosts();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      ));
    }

  } catch (error) {
    console.error('Failed to load From IU posts:', error);
    contentContainer.innerHTML = `<div class="empty-state"><p>Error loading data</p></div>`;
  } finally {
    fromIUState.isLoading = false;
  }
}

// Toggle post expansion
function togglePost(postId) {
  if (fromIUState.expandedPosts.has(postId)) {
    fromIUState.expandedPosts.delete(postId);
  } else {
    fromIUState.expandedPosts.add(postId);
  }
  // Re-render the specific post
  const postCard = document.getElementById(`post-${postId}`);
  if (postCard) {
    const post = fromIUState.posts.find(p => p.id === postId);
    if (post) {
      const newCard = renderFromIUPostCard(post, fromIUState.posts.indexOf(post));
      postCard.replaceWith(newCard);
    }
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

// Render From IU post card
function renderFromIUPostCard(post, index) {
  const div = document.createElement('div');
  div.id = `post-${post.id}`;
  div.className = 'post-card fade-in';
  div.style.animationDelay = `${index * 0.05}s`;

  const isExpanded = fromIUState.expandedPosts.has(post.id);
  const images = getImages(post.image_urls, post.local_image_paths);
  const totalComments = post.fan_comments?.length || 0;
  const totalReplies = post.fan_comments?.reduce((sum, c) => sum + (c.iu_replies?.length || 0), 0) || 0;

  // Get display text based on language
  const displayContent = IUApp.state.currentLang === 'zh'
    ? (post.content_zh || post.content_ko)
    : (post.content_ko || post.content_zh);

  const displayTitle = IUApp.state.currentLang === 'zh'
    ? (post.title_zh || post.title_ko)
    : (post.title_ko || post.title_zh);

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

  // Build fan comments HTML
  let commentsHtml = '';
  if (isExpanded && post.fan_comments && post.fan_comments.length > 0) {
    commentsHtml = post.fan_comments.map(comment => {
      const commentImages = getImages(comment.image_urls, comment.local_image_paths);
      const commentDisplayContent = IUApp.state.currentLang === 'zh'
        ? (comment.content_zh || comment.content_ko)
        : (comment.content_ko || comment.content_zh);

      // Build IU replies for this comment
      const iuRepliesHtml = comment.iu_replies?.map(reply => {
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
                  <img src="${fromIUState.iuAvatar}" alt="IU">
                </div>
                <div>
                  <div class="iu-comment-reply-name">
                    <span class="iu-name">IU</span>
                    <span class="reply-label">${replyLabel}</span>
                    <span class="reply-target">@${IUApp.escapeHtml(comment.fan_username || '')}</span>
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

      return `
        <div class="comment-card">
          <div class="comment-card-fan">
            <div class="comment-card-header">
              <div class="comment-card-avatar">
                ${comment.fan_avatar ? `<img src="${comment.fan_avatar}">` : (comment.fan_username?.[0] || '?')}
              </div>
              <div>
                <div class="comment-card-author">${IUApp.escapeHtml(comment.fan_username || '')}</div>
                <div class="comment-card-time">${formatFullDate(comment.commented_at)}</div>
              </div>
            </div>
            <div class="comment-card-content">${IUApp.escapeHtml(commentDisplayContent || '')}</div>
            ${commentImages.length > 0 ? `
              <div class="comment-card-images">
                ${commentImages.map(img => `
                  <div class="comment-image-wrapper">
                    <img src="${img}" onclick="IUApp.openImageViewer('${IUApp.escapeHtml(img)}')" onload="this.classList.add('loaded')">
                    <div class="comment-image-loading"></div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
          ${iuRepliesHtml}
        </div>
      `;
    }).join('');
  }

  div.innerHTML = `
    <!-- IU Post Header -->
    <div class="post-card-header">
      <div class="post-card-author">
        <div class="post-card-avatar">
          <img src="${fromIUState.iuAvatar}" alt="IU">
        </div>
        <div class="post-card-author-info">
          <div class="post-card-author-name">
            <span>IU (아이유)</span>
            ${post.board ? `<span class="post-card-board-badge">${post.board}</span>` : ''}
          </div>
          <div class="post-card-time">${formatFullDate(post.post_time)}</div>
        </div>
      </div>

      <!-- Post Title -->
      ${displayTitle ? `<h3 class="post-card-title">${IUApp.escapeHtml(displayTitle)}</h3>` : ''}

      <!-- Post Content -->
      <p class="post-card-content">${IUApp.escapeHtml(displayContent || '')}</p>

      ${imagesHtml}

      <!-- Post Stats -->
      <div class="post-card-stats">
        <span>❤️ ${(post.likes || 0).toLocaleString()}</span>
        <span>💬 ${totalComments}</span>
        <span>👁️ ${(post.views || 0).toLocaleString()}</span>
      </div>
    </div>

    <!-- Comments Section -->
    <div class="post-card-comments">
      <button class="post-card-toggle-btn" onclick="togglePost(${post.id})">
        <span>${IUApp.state.currentLang === 'zh'
          ? `${totalComments} 条粉丝评论 · ${totalReplies} 条 IU 回复`
          : `팬 댓글 ${totalComments}개 · IU 답글 ${totalReplies}개`}</span>
        <span class="post-card-toggle-icon ${isExpanded ? 'expanded' : ''}">▼</span>
      </button>

      ${isExpanded ? `
        <div style="margin-top: 16px;">
          ${commentsHtml}

          ${!post.fan_comments?.length ? `
            <div class="empty-state" style="padding: 24px;">
              ${IUApp.state.currentLang === 'zh' ? '暂无评论' : '댓글이 없습니다'}
            </div>
          ` : ''}
        </div>
      ` : ''}
    </div>
  `;

  return div;
}
