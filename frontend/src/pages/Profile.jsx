import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Avatar, Typography, IconButton,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import EditProfileDialog from '../components/EditProfileDialog';
import FriendsButton from '../components/FriendsButton';
import PostCard from '../components/PostCard';
import { getProfile, getUserPosts } from '../api';

// =========================
// ✨ 샘플 포스트 설정
// =========================
const USE_SAMPLE_POSTS = true; // 나중에 실제 데이터만 보고 싶으면 false 로 바꿔!

const SAMPLE_POSTS = [
  {
    id: 1,
    author: '민수 · 인사이드 아웃 2',
    title: '불안이를 모아라',
    preview: '감정이라는 캐릭터가 이렇게 귀엽고 설득력 있게 나올 줄은… 다시 생각하게 된 성장 영화.',
    image: 'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
    likes: 12,
    comments: 3,
    liked: true,
    createdAt: '2025.11.13 21:00',
  },
  {
    id: 2,
    author: '민수 · 웡카',
    title: '달콤하지만 조금은 씁쓸한 이야기',
    preview: '동심 가득한 음악 영화인 줄 알았는데, 자본과 꿈 사이에서 고민하는 이야기라 더 좋았다.',
    image: 'https://image.tmdb.org/t/p/w500/qhb1qOilapbapxWQn9jtRCMwXJF.jpg',
    likes: 5,
    comments: 0,
    liked: false,
    createdAt: '2025.11.10 18:30',
  },
];

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [friendCount, setFriendCount] = useState(0);
  const [posts, setPosts] = useState([]);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await getProfile();
        setUser(me);

        const list = await getUserPosts(me.id);
        // 실제 포스트가 하나도 없고, 샘플을 보고 싶을 때만 SAMPLE_POSTS 사용
        if (USE_SAMPLE_POSTS && (!list || list.length === 0)) {
          setPosts(SAMPLE_POSTS);
        } else {
          setPosts(list);
        }
      } catch (e) {
        console.error('프로필 로딩 실패', e);
      }
    })();
  }, []);

  const handleSettingsClick = () => navigate('/settings');

  if (!user) return null;

  // 화면에 보여줄 포스트 배열 (지금은 posts 그대로)
  const postsForDisplay = posts;

  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <Box
        sx={{
          width: 390,
          maxWidth: '100%',
          mx: 'auto',
          minHeight: '100vh',
          bgcolor: '#f5f5f5',
          pb: 9,
          borderRadius: { sm: 3 },
          boxShadow: {
            sm: '0 0 0 1px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.08)',
          },
        }}
      >
        {/* 헤더 */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            bgcolor: '#fff',
            borderBottom: '1px solid #eaeaea',
          }}
        >
          <Container disableGutters sx={{ px: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1.25,
              }}
            >
              <Typography sx={{ fontWeight: 800, letterSpacing: -0.2 }}>
                이거봤어
              </Typography>
              <IconButton size="small" onClick={handleSettingsClick}>
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Box>
          </Container>
        </Box>

        <Container disableGutters sx={{ px: 2, pt: 2 }}>
          {/* 프로필 카드 */}
          <Box
            sx={{
              bgcolor: '#fff',
              borderRadius: 3,
              p: 2.5,
              mb: 3,
              textAlign: 'center',
            }}
          >
            <Avatar
              src={user.profileImage || undefined}
              sx={{ width: 96, height: 96, mx: 'auto', mb: 1.5 }}
            />
            <Typography sx={{ fontWeight: 700 }}>{user.name}</Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2 }}
            >
              {user.email}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              <FriendsButton count={friendCount} onChanged={setFriendCount} />
              <IconButton
                onClick={() => setEditOpen(true)}
                sx={{
                  border: '1px solid #ff8a8a',
                  borderRadius: 2,
                  px: 1.5,
                  height: 36,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ color: '#ff6b6b', fontWeight: 600 }}
                >
                  프로필 편집
                </Typography>
              </IconButton>
            </Box>
          </Box>

          {/* 내 포스트 */}
          <Typography
            sx={{ fontWeight: 700, mb: 1.5, px: 0.5 }}
          >
            내 포스트
          </Typography>

          {postsForDisplay.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ px: 0.5, py: 2 }}
            >
              아직 작성한 포스트가 없습니다.
            </Typography>
          ) : (
            postsForDisplay.map((p) => <PostCard key={p.id} post={p} />)
          )}
        </Container>
      </Box>

      <EditProfileDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        user={user}
        onUpdated={(u) => setUser(u)}
      />
    </Box>
  );
}

export default Profile;
