// 간단한 API 래퍼. 백엔드 준비되면 URL만 맞춰주면 됩니다.
const BASE = '/api';

async function jfetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    credentials: 'include',
    ...opts,
  });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.status === 204 ? null : res.json();
}

// --- Profile ---
export const getProfile = () => jfetch(`${BASE}/me`);
export const updateProfile = (payload) =>
  jfetch(`${BASE}/me`, { method: 'PATCH', body: JSON.stringify(payload) });

// 아바타는 파일 업로드가 편하므로 별도 FormData 예시
export async function uploadAvatar(file) {
  const fd = new FormData();
  fd.append('avatar', file);
  const res = await fetch(`${BASE}/me/avatar`, { method: 'POST', body: fd, credentials: 'include' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// --- Friends ---
export const getFriends = () => jfetch(`${BASE}/friends`);
export const addFriend = (userId) => jfetch(`${BASE}/friends`, { method: 'POST', body: JSON.stringify({ userId }) });
export const removeFriend = (userId) =>
  jfetch(`${BASE}/friends/${userId}`, { method: 'DELETE' });

// --- Posts ---
export const getMyPosts = () => jfetch(`${BASE}/posts?mine=true`);
export const toggleLike = (postId) => jfetch(`${BASE}/posts/${postId}/like`, { method: 'POST' });

// --- Comments ---
export const getComments = (postId) => jfetch(`${BASE}/posts/${postId}/comments`);
export const addComment = (postId, content) =>
  jfetch(`${BASE}/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content }) });
