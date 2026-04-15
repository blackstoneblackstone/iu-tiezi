/**
 * Dear IU Page Logic - Infinite Scroll Version
 */

const dearIUState = {
  currentPage: 1,
  totalPages: 1,
  posts: [],
  isLoading: false,
  isAppending: false,
  iuAvatar: '',
  hasMore: true
};

document.addEventListener('DOMContentLoaded', async () => {
  IUApp.initCommon();

  document.getElementById('header-container').appendChild(IUApp.renderHeader());
  document.getElementById('stats-container').appendChild(await IUApp.renderStatsBar());
  document.getElementById('fans-container').appendChild(await IUApp.renderFansWall((fanName) => {
    if (fanName) {
      window.location.href = `index.html?fan=${encodeURIComponent(fanName)}`;
    }
  }));
  document.getElementById('nav-container').appendChild(IUApp.renderNavTabs('dearIU'));
  document.getElementById('footer-container').appendChild(IUApp.renderFooter());

  await IUApp.DataAPI.getStats();
  dearIUState.iuAvatar = IUApp.IU_AVATAR;

  await loadDearIUPosts();
  setupInfiniteScroll();

  // Set language change callback to re-render content
  IUApp.state.onLanguageChangeCallback = async () => {
    dearIUState.currentPage = 1;
    const contentContainer = document.getElementById('content-container');
    if (contentContainer) {
      contentContainer.innerHTML = '';
      contentContainer.appendChild(IUApp.renderSkeletonCards(6));
    }
    await loadDearIUPosts();
  };
});

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
      if (entry.isIntersecting && dearIUState.hasMore && !dearIUState.isLoading && !dearIUState.isAppending) {
        loadMoreDearIUPosts();
      }
    });
  }, { rootMargin: '200px', threshold: 0.1 });

  const sentinel = document.getElementById('infinite-sentinel');
  if (sentinel) observer.observe(sentinel);
}

async function loadMoreDearIUPosts() {
  if (!dearIUState.hasMore || dearIUState.isAppending) return;

  dearIUState.isAppending = true;
  showInfiniteLoading();

  try {
    dearIUState.currentPage++;
    const result = await IUApp.DataAPI.getDearIUPosts(dearIUState.currentPage);
    const newPosts = result?.data || [];
    dearIUState.hasMore = dearIUState.currentPage < dearIUState.totalPages;

    if (newPosts.length > 0) {
      appendPosts(newPosts);
      dearIUState.posts.push(...newPosts);
    } else {
      dearIUState.hasMore = false;
    }
  } catch (error) {
    console.error('Failed to load more posts:', error);
  } finally {
    dearIUState.isAppending = false;
    hideInfiniteLoading();
    if (!dearIUState.hasMore) showInfiniteEnd();
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

  const startIndex = dearIUState.posts.length;
  newPosts.forEach((post, i) => {
    const item = document.createElement('div');
    item.className = 'masonry-item';
    item.appendChild(renderDearIUPostCard(post, startIndex + i));
    grid.appendChild(item);
  });
}

async function loadDearIUPosts() {
  const contentContainer = document.getElementById('content-container');
  if (!contentContainer) return;

  dearIUState.isLoading = true;
  contentContainer.innerHTML = '';
  contentContainer.appendChild(IUApp.renderSkeletonCards(6));

  try {
    const result = await IUApp.DataAPI.getDearIUPosts(dearIUState.currentPage);
    const posts = result?.data || [];
    dearIUState.totalPages = result?.totalPages || 1;
    dearIUState.posts = posts;
    dearIUState.hasMore = dearIUState.currentPage < dearIUState.totalPages;

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
        item.appendChild(renderDearIUPostCard(post, index));
        grid.appendChild(item);
      });

      contentContainer.appendChild(grid);
    }

  } catch (error) {
    console.error('Failed to load Dear IU posts:', error);
    contentContainer.innerHTML = `<div class="empty-state"><p>Error loading data</p></div>`;
  } finally {
    dearIUState.isLoading = false;
  }
}

function getImages(urls, localPaths) {
  if (localPaths && localPaths.trim()) {
    return localPaths.split(/[,|]/).map(p => p.trim()).filter(Boolean);
  }
  if (!urls) return [];
  return urls.split(/[,|]/).map(u => u.trim()).filter(Boolean);
}

function renderDearIUPostCard(post, index) {
  const div = document.createElement('div');
  div.className = 'post-card fade-in';
  div.style.animationDelay = `${index * 0.05}s`;

  const images = getImages(post.image_urls, post.local_image_paths);
  const displayContent = IUApp.state.currentLang === 'zh'
    ? (post.content_zh || post.content_ko)
    : (post.content_ko || post.content_zh);
  const displayTitle = IUApp.state.currentLang === 'zh'
    ? (post.title_zh || post.title_ko)
    : (post.title_ko || post.title_zh);
  const authorAvatar = post.author_local_avatar || post.author_avatar;

  // Create image grid with proper event binding
  const createImageGrid = (imgs) => {
    const grid = document.createElement('div');
    grid.className = `images-grid ${imgs.length === 1 ? 'grid-cols-1' : imgs.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`;

    imgs.forEach((img, i) => {
      const thumb = document.createElement('div');
      thumb.className = 'image-thumbnail';
      thumb.dataset.images = JSON.stringify(imgs);
      thumb.dataset.index = i;
      thumb.innerHTML = `<img src="${img}" alt="" loading="lazy" onload="this.classList.add('loaded')" onerror="this.classList.add('loaded');this.classList.add('image-error')"><div class="image-loading"></div>`;
      thumb.addEventListener('click', () => IUApp.handleImageClick(thumb));
      grid.appendChild(thumb);
    });

    return grid;
  };

  // Header
  const headerDiv = document.createElement('div');
  headerDiv.className = 'post-card-header';
  headerDiv.innerHTML = `
    <div class="post-card-author">
      <div class="post-card-avatar">
        ${authorAvatar ? `<img src="${authorAvatar}" alt="" referrerpolicy="no-referrer" decoding="async" onload="this.classList.add('loaded')" onerror="this.classList.add('loaded')">` : (post.author_username?.[0] || '?')}
      </div>
      <div class="post-card-author-info">
        <div class="post-card-author-name" style="color: var(--text-primary);">
          <span>${IUApp.escapeHtml(post.author_username || 'Unknown')}</span>
          <span class="post-card-board-badge" style="background: rgba(255,107,157,0.15); color: #ff6b9d;">Dear. IU</span>
        </div>
        <div class="post-card-time">${IUApp.formatFullDate(post.post_time)}</div>
      </div>
    </div>
    ${displayTitle ? `<h3 class="post-card-title">${IUApp.escapeHtml(displayTitle)}</h3>` : ''}
    <p class="post-card-content">${IUApp.escapeHtml(displayContent || '')}</p>
  `;

  if (images.length > 0) {
    headerDiv.appendChild(createImageGrid(images));
  }
  const headerAuthorImg = headerDiv.querySelector('.post-card-avatar img');
  if (headerAuthorImg) IUApp.ensureImgVisible(headerAuthorImg);

  div.appendChild(headerDiv);

  // IU Replies
  if (post.direct_iu_replies?.length > 0) {
    const commentsDiv = document.createElement('div');
    commentsDiv.className = 'post-card-comments';

    post.direct_iu_replies.forEach(reply => {
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
              <img src="${dearIUState.iuAvatar}" alt="IU" onload="this.classList.add('loaded')" onerror="this.classList.add('loaded')">
            </div>
            <div>
              <div class="iu-comment-reply-name">
                <span class="iu-name">IU</span>
                <span class="reply-label">${IUApp.state.currentLang === 'zh' ? '回复' : '답글'}</span>
                <span class="reply-target">@${IUApp.escapeHtml(post.author_username || '')}</span>
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

      commentsDiv.appendChild(replyDiv);
    });

    div.appendChild(commentsDiv);
  }

  IUApp.finalizeProgressiveImages(div);
  return div;
}