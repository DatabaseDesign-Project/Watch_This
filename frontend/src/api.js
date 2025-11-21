// frontend/src/api.js

// FastAPI 쪽이 전부 /api/... 로 시작하니까 여기까지만 prefix로 두자
const API_ROOT = '/api';

// ⚠️ 지금은 dev 모드라서 헤더로 유저를 구분하고 있음
// 백엔드의 get_current_user_id 참고 (X-User-Id)
// Read dev user id from localStorage so login can change it. Fall back to '1'.
function getDevUserId() {
  try {
    const v = localStorage.getItem('user_id');
    if (v) return String(v);
  } catch (e) {
    // ignore
  }
  return '1';
}

async function jfetch(path, opts = {}) {
  const res = await fetch(`${API_ROOT}${path}`, {
    credentials: 'include',
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': getDevUserId(),
      ...(opts.headers || {}),
    },
  });

  const text = await res.text();

  if (!res.ok) {
    // FastAPI가 {"detail": "..."} 를 주면 그대로 alert 에 찍힘
    throw new Error(text || res.statusText);
  }

  return text ? JSON.parse(text) : null;
}

/* =====================
 *  Profile
 * ===================== */

// GET /api/v1/users/me  → ProfileOut
export async function getProfile() {
  const data = await jfetch('/v1/users/me');
  return {
    id: data.id,
    email: data.email,
    // 백엔드: nickname / profile_image  → 프론트: name / profileImage 로 매핑
    name: data.nickname,
    profileImage: data.profile_image,
    createdAt: data.created_at,
  };
}

// PATCH /api/v1/users/me  (ProfileUpdate: nickname, profile_image 만 수정)
export async function updateProfile({ name, profileImage }) {
  await jfetch('/v1/users/me', {
    method: 'PATCH',
    body: JSON.stringify({
      nickname: name,
      profile_image: profileImage ?? null,
    }),
  });

  // 패치 엔드포인트는 message만 주니까, 다시 내 프로필을 읽어온다
  return getProfile();
}

// POST /api/v1/medias/upload  → { url: "..."}
export async function uploadAvatar(file) {
  const fd = new FormData();
  // 정확한 필드명은 백엔드 구현에 따라 다를 수 있는데,
// 보통 "file" 이나 "media" 를 많이 씀. 필요하면 여기만 맞춰주면 됨.
  fd.append('file', file);

  const res = await fetch(`${API_ROOT}/v1/medias/upload`, {
    method: 'POST',
    body: fd,
    credentials: 'include',
    headers: {
      'X-User-Id': getDevUserId(),
      // FormData 사용할 때는 Content-Type 자동 설정되게 두는 게 중요!
    },
  });

  if (!res.ok) {
    throw new Error(await res.text().catch(() => res.statusText));
  }
  return res.json(); // { url: "..." } 기대
}

/* =====================
 *  Posts
 * ===================== */

// GET /api/v1/posts/users/{user_id}/posts
export const getUserPosts = (userId) =>
  jfetch(`/v1/posts/users/${userId}/posts`);

// "내" 포스트 = 내 프로필에서 id 읽어서 재사용
export const getMyPosts = async () => {
  const me = await getProfile();
  return getUserPosts(me.id);
};

/* =====================
 *  Likes
 * ===================== */

// POST /api/v1/posts/{post_id}/like
// DELETE /api/v1/posts/{post_id}/like
// [수정] 좋아요 토글 (헤더 추가)
export const toggleLike = async (postId, isLiked) => {
    const method = isLiked ? 'DELETE' : 'POST';
    const res = await fetch(`/api/v1/posts/${postId}/like`, {
        method: method,
        headers: {
            'X-User-Id': getUserId(), // 유저 ID 전달
        },
    });
    
    if (!res.ok) {
        throw new Error('좋아요 처리 실패');
    }
    return true; 
};

/* =====================
 *  Comments
 * ===================== */

// GET /api/v1/posts/{post_id}/comments
// [수정] 댓글 목록 조회 (헤더 추가)
export const getComments = async (postId) => {
    const res = await fetch(`/api/v1/posts/${postId}/comments`, {
        headers: {
            'X-User-Id': getUserId(),
        },
    });
    if (!res.ok) {
        return [];
    }
    return await res.json();
};

// POST /api/v1/posts/{post_id}/comments
// [수정] 댓글 작성 (헤더 추가)
export const addComment = async (postId, content) => {
    const res = await fetch(`/api/v1/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-User-Id': getUserId(), // 유저 ID 전달
        },
        body: JSON.stringify({ content }),
    });
    if (!res.ok) {
        throw new Error('댓글 작성 실패');
    }
    return await res.json();
};

/* =====================
 *  Friends (임시 구현)
 * ===================== */

export async function getFriends() {
  // GET /api/v1/friends
  return jfetch('/v1/friends');
}

export async function removeFriend(userId) {
  // DELETE /api/v1/friends/{user_id}
  return jfetch(`/v1/friends/${userId}`, { method: 'DELETE' });
}

export async function addFriend(userId) {
  // For our app we support sending by email. If userId looks like an email, POST { email }
  if (typeof userId === 'string' && userId.includes('@')) {
    return jfetch('/v1/friends/requests', { method: 'POST', body: JSON.stringify({ email: userId }) });
  }
  // otherwise if numeric, send by user_id
  return jfetch('/v1/friends/requests', { method: 'POST', body: JSON.stringify({ user_id: Number(userId) }) });
}

/* =====================
 *  Notifications
 * ===================== */

export async function getNotifications({ is_read = undefined, limit = 20, cursor_id = undefined } = {}) {
  const qs = [];
  if (typeof is_read === 'boolean') qs.push(`is_read=${is_read}`);
  if (limit) qs.push(`limit=${limit}`);
  if (cursor_id) qs.push(`cursor_id=${cursor_id}`);
  const q = qs.length ? `?${qs.join('&')}` : '';
  return jfetch(`/v1/notifications${q}`);
}

/* =====================
 *  Questions
 * ===================== */
// GET /api/v1/questions
export async function getQuestions({ q = undefined, limit = 50, offset = 0, order = 'asc' } = {}) {
  const qs = [];
  if (q) qs.push(`q=${encodeURIComponent(q)}`);
  if (limit) qs.push(`limit=${encodeURIComponent(limit)}`);
  if (offset) qs.push(`offset=${encodeURIComponent(offset)}`);
  if (order) qs.push(`order=${encodeURIComponent(order)}`);
  const qstr = qs.length ? `?${qs.join('&')}` : '';
  return jfetch(`/v1/questions${qstr}`);
}

// GET /api/movies/{movie_id}/posts
export async function getMoviePosts(movieId, { emoji_id = undefined, spoiler = 'show', sort = 'recent', limit = 20, cursor_id = undefined } = {}) {
  const qs = [];
  if (emoji_id !== undefined) qs.push(`emoji_id=${encodeURIComponent(emoji_id)}`);
  if (spoiler) qs.push(`spoiler=${encodeURIComponent(spoiler)}`);
  if (sort) qs.push(`sort=${encodeURIComponent(sort)}`);
  if (limit) qs.push(`limit=${encodeURIComponent(limit)}`);
  if (cursor_id) qs.push(`cursor_id=${encodeURIComponent(cursor_id)}`);
  const q = qs.length ? `?${qs.join('&')}` : '';
  return jfetch(`/movies/${movieId}/posts${q}`);
}

// GET /api/movies/tmdb/{tmdb_id}/posts
export async function getMoviePostsByTmdb(tmdbId, { emoji_id = undefined, spoiler = 'show', sort = 'recent', limit = 20, cursor_id = undefined } = {}) {
  const qs = [];
  if (emoji_id !== undefined) qs.push(`emoji_id=${encodeURIComponent(emoji_id)}`);
  if (spoiler) qs.push(`spoiler=${encodeURIComponent(spoiler)}`);
  if (sort) qs.push(`sort=${encodeURIComponent(sort)}`);
  if (limit) qs.push(`limit=${encodeURIComponent(limit)}`);
  if (cursor_id) qs.push(`cursor_id=${encodeURIComponent(cursor_id)}`);
  const q = qs.length ? `?${qs.join('&')}` : '';
  return jfetch(`/movies/tmdb/${tmdbId}/posts${q}`);
}

// GET /api/v1/movies/highlights → {popular, mostReviewed}
export async function getMovieHighlights() {
  // movies router is mounted at /api/movies on the backend
  return jfetch('/movies/highlights');
}

// POST /api/v1/posts/ - create a post
export async function createPost(payload) {
  return jfetch('/v1/posts/', { method: 'POST', body: JSON.stringify(payload) });
}

// GET /api/movies/search?q=...&page=1
export async function searchMoviesTmdb(q, page = 1) {
  const qs = `?q=${encodeURIComponent(q)}&page=${encodeURIComponent(page)}`;
  return jfetch(`/movies/search${qs}`);
}

export async function markNotificationRead(notiId) {
  return jfetch(`/v1/notifications/${notiId}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead(older_than_id = undefined) {
  return jfetch('/v1/notifications/read', { method: 'POST', body: JSON.stringify({ older_than_id }) });
}

export async function deleteNotification(notiId) {
  return jfetch(`/v1/notifications/${notiId}`, { method: 'DELETE' });
}

/* =====================
 *  Friend requests / friends
 * ===================== */

export async function getFriendRequests(box = 'in') {
  // box: 'in' or 'out'
  return jfetch(`/v1/friends/requests?box=${box}`);
}

export async function acceptFriendRequest(requesterId) {
  return jfetch(`/v1/friends/requests/${requesterId}/accept`, { method: 'POST' });
}

export async function rejectFriendRequest(requesterId) {
  return jfetch(`/v1/friends/requests/${requesterId}/reject`, { method: 'POST' });
}



export const uploadMedia = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/v1/medias/upload', {
        method: 'POST',
        body: formData,
        // Content-Type 헤더는 브라우저가 자동으로 설정하므로 생략
    });

    if (!res.ok) {
        throw new Error('이미지 업로드 실패');
    }
    return await res.json(); // 예상 응답: { id: 1, file_path: "url..." }
};

// src/api.js 파일의 기존 코드 아래에 추가하세요

// [추가] 포스트 상세 조회
// [수정] 포스트 상세 조회 (헤더 추가)
// 유저 ID 가져오는 헬퍼 함수
const getUserId = () => localStorage.getItem('user_id') || '1';

export const getPostDetail = async (postId) => {
    const res = await fetch(`/api/v1/posts/${postId}`, {
        headers: {
            'X-User-Id': getUserId(), // 유저 ID 전달
        },
    });
    if (!res.ok) {
        throw new Error('포스트를 불러오는데 실패했습니다.');
    }
    return await res.json();
};

// [추가] TMDB ID로 영화 상세 정보(포스터, 감독 등) 조회
// GET /api/movies/detail/{tmdb_id}
// src/api.js 파일 맨 아래에 기존 것을 지우고 이걸로 바꿔주세요!

// [수정] TMDB ID로 영화 상세 정보 조회 (jfetch 사용 필수)
export function getMovieDetail(tmdbId) {
  // jfetch가 자동으로 '/api'를 붙여주므로 '/movies/detail/...'로 시작해야 합니다.
  return jfetch(`/movies/detail/${tmdbId}`);
}












  // // 간단한 API 래퍼. 백엔드 준비되면 URL만 맞춰주면 됩니다.
// const BASE = '/api';

// async function jfetch(url, opts = {}) {
//   const res = await fetch(url, {
//     headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
//     credentials: 'include',
//     ...opts,
//   });
//   if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
//   return res.status === 204 ? null : res.json();
// }

// // --- Profile ---
// export const getProfile = () => jfetch(`${BASE}/me`);
// export const updateProfile = (payload) =>
//   jfetch(`${BASE}/me`, { method: 'PATCH', body: JSON.stringify(payload) });

// // 아바타는 파일 업로드가 편하므로 별도 FormData 예시
// export async function uploadAvatar(file) {
//   const fd = new FormData();
//   fd.append('avatar', file);
//   const res = await fetch(`${BASE}/me/avatar`, { method: 'POST', body: fd, credentials: 'include' });
//   if (!res.ok) throw new Error(await res.text());
//   return res.json();
// }

// // --- Friends ---
// export const getFriends = () => jfetch(`${BASE}/friends`);
// export const addFriend = (userId) => jfetch(`${BASE}/friends`, { method: 'POST', body: JSON.stringify({ userId }) });
// export const removeFriend = (userId) =>
//   jfetch(`${BASE}/friends/${userId}`, { method: 'DELETE' });

// // --- Posts ---
// export const getMyPosts = () => jfetch(`${BASE}/posts?mine=true`);
// export const toggleLike = (postId) => jfetch(`${BASE}/posts/${postId}/like`, { method: 'POST' });

// // --- Comments ---
// export const getComments = (postId) => jfetch(`${BASE}/posts/${postId}/comments`);
// export const addComment = (postId, content) =>
//   jfetch(`${BASE}/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content }) });
