/**
 * From IU Page Logic - Infinite Scroll Version
 */

const fromIUState = {
  currentPage: 1,
  totalPages: 1,
  posts: [],
  isLoading: false,
  isAppending: false,
  expandedPosts: new Set(),
  iuAvatar: '',
  hasMore: true
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

  await IUApp.DataAPI.getStats();
  fromIUState.iuAvatar = IUApp.IU_AVATAR;

  await loadFromIUPosts();
  setupInfiniteScroll();

  // Set language change callback to re-render content
  IUApp.state.onLanguageChangeCallback = async () => {
    fromIUState.currentPage = 1;
    fromIUState.expandedPosts.clear();
    const contentContainer = document.getElementById('content-container');
    if (contentContainer) {
      contentContainer.innerHTML = '';
      contentContainer.appendChild(IUApp.renderSkeletonCards(6));
    }
    await loadFromIUPosts();
  };
});

// Setup infinite scroll
function setupInfiniteScroll() {
  const paginationContainer = document.getElementById('pagination-container');
  if (paginationContainer) {
    paginationContainer.innerHTML = '';
    const sentinel = document.createElement('div');
    sentinel.id = 'infinite-sentinel';
    paginationContainer.appendChild(sentinel);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && fromIUState.hasMore && !fromIUState.isLoading && !fromIUState.isAppending) {
        loadMoreFromIUPosts();
      }
    });
  }, { rootMargin: '200px', threshold: 0.1 });

  const sentinel = document.getElementById('infinite-sentinel');
  if (sentinel) observer.observe(sentinel);
}

async function loadMoreFromIUPosts() {
  if (!fromIUState.hasMore || fromIUState.isAppending) return;

  fromIUState.isAppending = true;
  showInfiniteLoading();

  try {
    fromIUState.currentPage++;
    const result = await IUApp.DataAPI.getFromIUPosts(fromIUState.currentPage);
    const newPosts = result?.data || [];
    fromIUState.hasMore = fromIUState.currentPage < fromIUState.totalPages;

    if (newPosts.length > 0) {
      appendPosts(newPosts);
      fromIUState.posts.push(...newPosts);
    } else {
      fromIUState.hasMore = false;
    }
  } catch (error) {
    console.error('Failed to load more posts:', error);
  } finally {
    fromIUState.isAppending = false;
    hideInfiniteLoading();
    if (!fromIUState.hasMore) showInfiniteEnd();
  }
}

function showInfiniteLoading() {
  let loader = document.getElementById('infinite-loading');
  if (!loader) {
    const container = document.getElementById('pagination-container');
    if (container) {
      loader = document.createElement('div');
      loader.id = 'infinite-loading';
      loader.className = 'infinite-loading';
      loader.innerHTML = '<div class="infinite-spinner"></div>';
      container.insertBefore(loader, container.firstChild);
    }
  }
}

function hideInfiniteLoading() {
  const loader = document.getElementById('infinite-loading');
  if (loader) loader.remove();
}

function showInfiniteEnd() {
  let endMsg = document.getElementById('infinite-end');
  if (!endMsg) {
    const container = document.getElementById('pagination-container');
    if (container) {
      endMsg = document.createElement('div');
      endMsg.id = 'infinite-end';
      endMsg.className = 'infinite-end';
      endMsg.innerHTML = IUApp.state.currentLang === 'zh' ? '— 已加载全部内容 —' : '— 모든 내용을 로드했습니다 —';
      container.appendChild(endMsg);
    }
  }
}

function appendPosts(newPosts) {
  const grid = document.getElementById('posts-grid');
  if (!grid) return;

  const startIndex = fromIUState.posts.length;
  newPosts.forEach((post, i) => {
    const item = document.createElement('div');
    item.className = 'masonry-item';
    item.appendChild(renderFromIUPostCard(post, startIndex + i));
    grid.appendChild(item);
  });
}

async function loadFromIUPosts() {
  const contentContainer = document.getElementById('content-container');
  if (!contentContainer) return;

  fromIUState.isLoading = true;
  contentContainer.innerHTML = '';
  contentContainer.appendChild(IUApp.renderSkeletonCards(6));

  try {
    const result = await IUApp.DataAPI.getFromIUPosts(fromIUState.currentPage);
    const posts = result?.data || [];
    fromIUState.totalPages = result?.totalPages || 1;
    fromIUState.posts = posts;
    fromIUState.hasMore = fromIUState.currentPage < fromIUState.totalPages;

    contentContainer.innerHTML = '';

    if (posts.length === 0) {
      contentContainer.appendChild(IUApp.renderEmpty());
    } else {
      const grid = document.createElement('div');
      grid.className = 'masonry-grid';
      grid.id = 'posts-grid';

      posts.forEach((post, index) => {
        const item = document.createElement('div');
        item.className = 'masonry-item';
        item.appendChild(renderFromIUPostCard(post, index));
        grid.appendChild(item);
      });

      contentContainer.appendChild(grid);
    }

  } catch (error) {
    console.error('Failed to load From IU posts:', error);
    contentContainer.innerHTML = `<div class="empty-state"><p>Error loading data</p></div>`;
  } finally {
    fromIUState.isLoading = false;
  }
}

function togglePost(postId) {
  if (fromIUState.expandedPosts.has(postId)) {
    fromIUState.expandedPosts.delete(postId);
  } else {
    fromIUState.expandedPosts.add(postId);
  }
  const postCard = document.getElementById(`post-${postId}`);
  if (postCard) {
    const post = fromIUState.posts.find(p => p.id === postId);
    if (post) {
      const newCard = renderFromIUPostCard(post, fromIUState.posts.indexOf(post));
      postCard.replaceWith(newCard);
    }
  }
}

function getImages(urls, localPaths) {
  // Handle localPaths: could be string, array, or null/undefined
  if (localPaths) {
    if (Array.isArray(localPaths)) {
      return localPaths.map(p => String(p).trim()).filter(Boolean);
    }
    if (typeof localPaths === 'string' && localPaths.trim()) {
      return localPaths.split(/[,|]/).map(p => p.trim()).filter(Boolean);
    }
  }
  // Handle urls: could be string, array, or null/undefined
  if (!urls) return [];
  if (Array.isArray(urls)) {
    return urls.map(u => String(u).trim()).filter(Boolean);
  }
  if (typeof urls === 'string') {
    return urls.split(/[,|]/).map(u => u.trim()).filter(Boolean);
  }
  return [];
}

function renderFromIUPostCard(post, index) {
  const div = document.createElement('div');
  div.id = `post-${post.id}`;
  div.className = 'post-card fade-in';
  div.style.animationDelay = `${index * 0.05}s`;

  const isExpanded = fromIUState.expandedPosts.has(post.id);
  const images = getImages(post.image_urls, post.local_image_paths);
  const totalComments = post.fan_comments?.length || 0;
  const totalReplies = post.fan_comments?.reduce((sum, c) => sum + (c.iu_replies?.length || 0), 0) || 0;

  const displayContent = IUApp.state.currentLang === 'zh'
    ? (post.content_zh || post.content_ko)
    : (post.content_ko || post.content_zh);

  const displayTitle = IUApp.state.currentLang === 'zh'
    ? (post.title_zh || post.title_ko)
    : (post.title_ko || post.title_zh);

  // Create image elements with proper event binding
  const createImageGrid = (imgs) => {
    const grid = document.createElement('div');
    grid.className = `images-grid ${imgs.length === 1 ? 'grid-cols-1' : imgs.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`;

    imgs.forEach((img, i) => {
      const thumb = document.createElement('div');
      thumb.className = 'image-thumbnail';
      thumb.dataset.images = JSON.stringify(imgs);
      thumb.dataset.index = i;
      thumb.innerHTML = `
        <img src="${img}" alt="" loading="eager" decoding="async" referrerpolicy="no-referrer" onload="this.classList.add('loaded')" onerror="this.classList.add('loaded');this.classList.add('image-error')">
        <div class="image-loading"></div>
      `;
      thumb.addEventListener('click', () => IUApp.handleImageClick(thumb));
      grid.appendChild(thumb);
    });
    IUApp.finalizeProgressiveImages(grid);

    return grid;
  };

  // Build card content
  const headerDiv = document.createElement('div');
  headerDiv.className = 'post-card-header';
  headerDiv.innerHTML = `
    <div class="post-card-author">
      <div class="post-card-avatar">
        <img src="${fromIUState.iuAvatar}" alt="IU" onload="this.classList.add('loaded')" onerror="this.classList.add('loaded')">
      </div>
      <div class="post-card-author-info">
        <div class="post-card-author-name">
          <span>IU (아이유)</span>
          ${post.board ? `<span class="post-card-board-badge">${post.board}</span>` : ''}
        </div>
        <div class="post-card-time">${IUApp.formatFullDate(post.post_time)}</div>
      </div>
    </div>
    ${displayTitle ? `<h3 class="post-card-title">${IUApp.escapeHtml(displayTitle)}</h3>` : ''}
    <p class="post-card-content">${IUApp.escapeHtml(displayContent || '')}</p>
    <div class="post-card-stats">
      <span>❤️ ${(post.likes || 0).toLocaleString()}</span>
      <span>💬 ${totalComments}</span>
      <span>👁️ ${(post.views || 0).toLocaleString()}</span>
    </div>
  `;

  // Add images to header
  if (images.length > 0) {
    headerDiv.appendChild(createImageGrid(images));
  }
  const headerAvImg = headerDiv.querySelector('.post-card-avatar img');
  if (headerAvImg) IUApp.ensureImgVisible(headerAvImg);

  div.appendChild(headerDiv);

  // Interpretation section (only for IU posts with interpretation data in Chinese mode)
  if (post.interpretation_zh && IUApp.state.currentLang === 'zh') {
    const interpDiv = document.createElement('div');
    interpDiv.className = 'post-interpretation';

    const interpTitle = post.interpretation_zh.title || '帖子看点';
    const points = post.interpretation_zh.points || [];

    // Build tags HTML for collapsed state
    let tagsHtml = '';
    points.forEach(point => {
      tagsHtml += `<span class="interpretation-tag">${point.label}</span>`;
    });

    // Build points HTML for expanded state
    let pointsHtml = '';
    points.forEach(point => {
      pointsHtml += `
        <div class="interpretation-point">
          <div class="label">${point.label}</div>
          <div class="text">${point.text}</div>
        </div>
      `;
    });

    interpDiv.innerHTML = `
      <div class="interpretation-header">
        <span class="interpretation-title">${interpTitle}</span>
        <button class="interpretation-toggle-btn" data-post-id="${post.id}" title="收起/展开">
          <span class="toggle-icon expanded">▲</span>
        </button>
      </div>
      <div class="interpretation-tags">
        ${tagsHtml}
      </div>
      <div class="interpretation-content expanded">
        <div class="interpretation-inner">
          ${pointsHtml}
        </div>
      </div>
    `;

    div.appendChild(interpDiv);

    // Bind toggle event
    const toggleBtn = interpDiv.querySelector('.interpretation-toggle-btn');
    const contentDiv = interpDiv.querySelector('.interpretation-content');
    const tagsDiv = interpDiv.querySelector('.interpretation-tags');
    const icon = toggleBtn.querySelector('.toggle-icon');

    function toggleInterpretation() {
      const isExpanded = contentDiv.classList.contains('expanded');
      if (isExpanded) {
        contentDiv.classList.remove('expanded');
        contentDiv.classList.add('collapsed');
        tagsDiv.style.display = 'flex';
        icon.classList.remove('expanded');
        icon.textContent = '▼';
      } else {
        contentDiv.classList.remove('collapsed');
        contentDiv.classList.add('expanded');
        tagsDiv.style.display = 'none';
        icon.classList.add('expanded');
        icon.textContent = '▲';
      }
    }

    toggleBtn.addEventListener('click', toggleInterpretation);

    // Tags are also clickable to expand
    tagsDiv.addEventListener('click', toggleInterpretation);
  }

  // Comments section
  const commentsDiv = document.createElement('div');
  commentsDiv.className = 'post-card-comments';

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'post-card-toggle-btn';
  toggleBtn.innerHTML = `
    <span>${IUApp.state.currentLang === 'zh'
      ? `${totalComments} 条粉丝评论 · ${totalReplies} 条 IU 回复`
      : `팬 댓글 ${totalComments}개 · IU 답글 ${totalReplies}개`}</span>
    <span class="post-card-toggle-icon ${isExpanded ? 'expanded' : ''}">▼</span>
  `;
  toggleBtn.addEventListener('click', () => togglePost(post.id));
  commentsDiv.appendChild(toggleBtn);

  if (isExpanded && post.fan_comments?.length > 0) {
    const commentsList = document.createElement('div');
    commentsList.style.marginTop = '16px';

    post.fan_comments.forEach(comment => {
      const commentDiv = document.createElement('div');
      commentDiv.className = 'comment-card';

      const commentImages = getImages(comment.image_urls, comment.local_image_paths);
      const commentDisplayContent = IUApp.state.currentLang === 'zh'
        ? (comment.content_zh || comment.content_ko)
        : (comment.content_ko || comment.content_zh);

      const fanCommentDiv = document.createElement('div');
      fanCommentDiv.className = 'comment-card-fan';
      const fanAvatarSrc = comment.fan_local_avatar || comment.fan_avatar;
      fanCommentDiv.innerHTML = `
        <div class="comment-card-header">
          <div class="comment-card-avatar">
            ${fanAvatarSrc ? `<img src="${fanAvatarSrc}" alt="" referrerpolicy="no-referrer" decoding="async" onload="this.classList.add('loaded')" onerror="this.classList.add('loaded')">` : (comment.fan_username?.[0] || '?')}
          </div>
          <div>
            <div class="comment-card-author">${IUApp.escapeHtml(comment.fan_username || '')}</div>
            <div class="comment-card-time">${IUApp.formatFullDate(comment.commented_at)}</div>
          </div>
        </div>
        <div class="comment-card-content">${IUApp.escapeHtml(commentDisplayContent || '')}</div>
      `;
      const fanAvImg = fanCommentDiv.querySelector('.comment-card-avatar img');
      if (fanAvImg) IUApp.ensureImgVisible(fanAvImg);

      // Add comment images
      if (commentImages.length > 0) {
        const imgGrid = document.createElement('div');
        imgGrid.className = 'comment-card-images';
        commentImages.forEach((imgSrc, i) => {
          const wrapper = document.createElement('div');
          wrapper.className = 'comment-image-wrapper';
          wrapper.dataset.images = JSON.stringify(commentImages);
          wrapper.dataset.index = String(i);
          wrapper.innerHTML = `<img src="${imgSrc}" alt="" loading="eager" decoding="async" referrerpolicy="no-referrer" onload="this.classList.add('loaded')" onerror="this.classList.add('loaded');this.classList.add('image-error')"><div class="comment-image-loading"></div>`;
          wrapper.addEventListener('click', () => IUApp.handleImageClick(wrapper));
          imgGrid.appendChild(wrapper);
        });
        fanCommentDiv.appendChild(imgGrid);
        IUApp.finalizeProgressiveImages(imgGrid);
      }

      commentDiv.appendChild(fanCommentDiv);

      // IU replies
      if (comment.iu_replies?.length > 0) {
        comment.iu_replies.forEach(reply => {
          const replyImages = getImages(reply.image_urls, reply.local_image_paths);
          const replyDisplayContent = IUApp.state.currentLang === 'zh'
            ? (reply.content_zh || reply.content_ko)
            : (reply.content_ko || reply.content_zh);

          const replyDiv = document.createElement('div');
          replyDiv.className = 'iu-reply-thread';
          replyDiv.innerHTML = `
            <div class="thread-line"></div>
            <div class="iu-comment-reply">
              <div class="iu-comment-reply-header">
                <div class="iu-comment-reply-avatar">
                  <img src="${fromIUState.iuAvatar}" alt="IU" onload="this.classList.add('loaded')" onerror="this.classList.add('loaded')">
                </div>
                <div>
                  <div class="iu-comment-reply-name">
                    <span class="iu-name">IU</span>
                    <span class="reply-label">${IUApp.state.currentLang === 'zh' ? '回复' : '답글'}</span>
                    <span class="reply-target">@${IUApp.escapeHtml(comment.fan_username || '')}</span>
                  </div>
                  <div class="iu-comment-reply-time">${IUApp.formatFullDate(reply.replied_at)}</div>
                </div>
              </div>
              <div class="iu-comment-reply-content">${IUApp.escapeHtml(replyDisplayContent || '')}</div>
            </div>
          `;

          if (replyImages.length > 0) {
            const imgGrid = document.createElement('div');
            imgGrid.className = 'comment-card-images';
            replyImages.forEach((imgSrc, i) => {
              const wrapper = document.createElement('div');
              wrapper.className = 'comment-image-wrapper';
              wrapper.dataset.images = JSON.stringify(replyImages);
              wrapper.dataset.index = String(i);
              wrapper.innerHTML = `<img src="${imgSrc}" alt="" loading="eager" decoding="async" referrerpolicy="no-referrer" onload="this.classList.add('loaded')" onerror="this.classList.add('loaded');this.classList.add('image-error')"><div class="comment-image-loading"></div>`;
              wrapper.addEventListener('click', () => IUApp.handleImageClick(wrapper));
              imgGrid.appendChild(wrapper);
            });
            replyDiv.querySelector('.iu-comment-reply').appendChild(imgGrid);
            IUApp.finalizeProgressiveImages(imgGrid);
          }

          commentDiv.appendChild(replyDiv);
        });
      }

      commentsList.appendChild(commentDiv);
    });

    commentsDiv.appendChild(commentsList);
  } else if (isExpanded && (!post.fan_comments || post.fan_comments.length === 0)) {
    // No comments - show "IU has not replied" message
    const emptyDiv = document.createElement('div');
    emptyDiv.style.cssText = 'margin-top: 16px; padding: 16px; text-align: center; color: var(--text-muted, #8b8b9e); font-size: 13px;';
    emptyDiv.textContent = IUApp.state.currentLang === 'zh' ? 'IU 没有回复' : 'IU 답글 없음';
    commentsDiv.appendChild(emptyDiv);
  }

  div.appendChild(commentsDiv);
  IUApp.finalizeProgressiveImages(div);
  return div;
}