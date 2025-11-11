import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Avatar, Typography, IconButton, Divider
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import EditProfileDialog from '../components/EditProfileDialog';
import FriendsButton from '../components/FriendsButton';
import PostCard from '../components/PostCard';
import { getProfile, getMyPosts } from '../api';

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [friendCount, setFriendCount] = useState(0);
  const [posts, setPosts] = useState([]);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // 프로필+포스트 로딩
        const me = await getProfile();
        setUser(me);
        const list = await getMyPosts();
        setPosts(list);
      } catch (e) {
        console.error(e);
        // 개발용 fallback (임시 데이터)
        setUser({ name: '서영', email: 'watchthis@mail.com', profileImage: null });
        setPosts([{
          id: 1,
          author: '서영 · 인사이드 아웃 2',
          title: '불안이를 모아라',
          preview: '본문 2줄 미리보기… 본문 2줄 미리보기… 본문 2줄 미리보기…',
          image: 'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
          likes: 1, comments: 1, liked: false, createdAt: '2025.09.19 11:00'
        }]);
      }
    })();
  }, []);

  const handleSettingsClick = () => navigate('/settings');

  if (!user) return null;

  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      <Box
        sx={{
          width: 390, maxWidth: '100%', mx: 'auto', minHeight: '100vh', bgcolor: '#f5f5f5', pb: 9,
          borderRadius: { sm: 3 }, boxShadow: { sm: '0 0 0 1px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.08)' },
        }}
      >
        {/* 헤더 */}
        <Box sx={{ position: 'sticky', top: 0, zIndex: 10, bgcolor: '#fff', borderBottom: '1px solid #eaeaea' }}>
          <Container disableGutters sx={{ px: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.25 }}>
              <Typography sx={{ fontWeight: 800, letterSpacing: -0.2 }}>이거봤어</Typography>
              <IconButton size="small" onClick={handleSettingsClick}><SettingsIcon fontSize="small" /></IconButton>
            </Box>
          </Container>
        </Box>

        <Container disableGutters sx={{ px: 2, pt: 2 }}>
          {/* 프로필 카드 */}
          <Box sx={{ bgcolor: '#fff', borderRadius: 3, p: 2.5, mb: 3, textAlign: 'center' }}>
            <Avatar src={user.profileImage || undefined} sx={{ width: 96, height: 96, mx: 'auto', mb: 1.5 }} />
            <Typography sx={{ fontWeight: 700 }}>{user.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{user.email}</Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              <FriendsButton count={friendCount} onChanged={setFriendCount} />
              <IconButton
                onClick={() => setEditOpen(true)}
                sx={{ border: '1px solid #ff8a8a', borderRadius: 2, px: 1.5, height: 36 }}
              >
                <Typography variant="body2" sx={{ color: '#ff6b6b', fontWeight: 600 }}>프로필 편집</Typography>
              </IconButton>
            </Box>
          </Box>

          {/* 내 포스트 */}
          <Typography sx={{ fontWeight: 700, mb: 1.5, px: .5 }}>내 포스트</Typography>
          {posts.map(p => <PostCard key={p.id} post={p} />)}

          <Divider sx={{ my: 2, opacity: 0 }} />
          {/* 바텀 네비 placeholder */}
          <Box sx={{ position: 'sticky', bottom: 0, bgcolor: '#fff', borderTop: '1px solid #eaeaea', py: 1 }} />
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


// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import {
//   Box,
//   Container,
//   Avatar,
//   Typography,
//   Button,
//   Card,
//   CardMedia,
//   CardContent,
//   IconButton,
//   Grid,
//   Divider,
// } from '@mui/material';
// import {
//   Settings as SettingsIcon,
//   FavoriteBorder as FavoriteIcon,
//   ChatBubbleOutline as CommentIcon,
// } from '@mui/icons-material';

// function Profile() {
//   const navigate = useNavigate();
//   const [user] = useState({
//     name: '서영',
//     email: 'watchthis@mail.com',
//     profileImage: null,
//   });
//   const [posts] = useState([
//     {
//       id: 1,
//       author: '서영 · 일사이드 아웃 2',
//       title: '불안이를 모아라',
//       preview:
//         '본문 2줄 미리보기… 본문 2줄 미리보기… 본문 2줄 미리보기… 본문 2줄 미리보기…',
//       image:
//         'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
//       likes: 1,
//       comments: 1,
//       createdAt: '2025.09.19 11:00',
//       emoji: '🥲',
//     },
//   ]);

//   const handleSettingsClick = () => navigate('/settings');

//   return (
//     <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh' }}>
//       {/* 전체를 아이폰 폭으로 고정 */}
//       <Box
//         sx={{
//           width: 390,
//           maxWidth: '100%',
//           mx: 'auto',
//           minHeight: '100vh',
//           bgcolor: '#f5f5f5',
//           pb: 9,
//           borderRadius: { sm: 3 },
//           boxShadow: { sm: '0 0 0 1px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.08)' },
//         }}
//       >
//         {/* 헤더 */}
//         <Box
//           sx={{
//             position: 'sticky',
//             top: 0,
//             zIndex: 10,
//             bgcolor: '#fff',
//             borderBottom: '1px solid #eaeaea',
//           }}
//         >
//           <Container disableGutters sx={{ px: 2 }}>
//             <Box
//               sx={{
//                 display: 'flex',
//                 alignItems: 'center',
//                 justifyContent: 'space-between',
//                 py: 1.25,
//               }}
//             >
//               <Typography sx={{ fontWeight: 800, letterSpacing: -0.2 }}>
//                 이거봤어
//               </Typography>
//               <IconButton size="small" onClick={handleSettingsClick}>
//                 <SettingsIcon fontSize="small" />
//               </IconButton>
//             </Box>
//           </Container>
//         </Box>

//         <Container disableGutters sx={{ px: 16 / 8, pt: 2 }}>
//           {/* 프로필 카드 */}
//           <Box
//             sx={{
//               bgcolor: '#fff',
//               borderRadius: 3,
//               p: 2.5,
//               mb: 3,
//               boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
//             }}
//           >
//             <Box
//               sx={{
//                 display: 'flex',
//                 flexDirection: 'column',
//                 alignItems: 'center',
//                 gap: 1.5,
//               }}
//             >
//               <Box sx={{ position: 'relative' }}>
//                 <Avatar
//                   sx={{
//                     width: 96,
//                     height: 96,
//                     bgcolor: 'linear-gradient(135deg, #b23a48, #d06b6b)',
//                     background:
//                       'linear-gradient(135deg, rgba(178,58,72,1) 0%, rgba(208,107,107,1) 100%)',
//                   }}
//                 />
//                 <Box
//                   sx={{
//                     position: 'absolute',
//                     right: 6,
//                     bottom: 6,
//                     width: 20,
//                     height: 20,
//                     bgcolor: '#fff',
//                     borderRadius: '50%',
//                     border: '1px solid #eee',
//                   }}
//                 />
//               </Box>
//               <Typography sx={{ fontWeight: 700 }}>{user.name}</Typography>
//               <Typography variant="body2" color="text.secondary">
//                 {user.email}
//               </Typography>
//               <Button
//                 variant="outlined"
//                 size="small"
//                 sx={{
//                   mt: 0.5,
//                   borderRadius: 2,
//                   borderColor: '#ff8a8a',
//                   color: '#ff6b6b',
//                   textTransform: 'none',
//                   px: 2.5,
//                   '&:hover': { borderColor: '#ff6b6b', bgcolor: 'rgba(255,107,107,0.04)' },
//                 }}
//               >
//                 친구 3명
//               </Button>
//             </Box>
//           </Box>

//           {/* 섹션 타이틀 */}
//           <Typography sx={{ fontWeight: 700, mb: 1.5, px: 0.5 }}>내 포스트</Typography>

//           {/* 포스트 리스트 (블로그 카드형) */}
//           {posts.map((post) => (
//             <Card
//               key={post.id}
//               sx={{
//                 mb: 2,
//                 borderRadius: 3,
//                 overflow: 'hidden',
//                 boxShadow: '0 1px 0 rgba(0,0,0,0.02)',
//               }}
//             >
//               <CardContent sx={{ pb: 1.5 }}>
//                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
//                   <Typography variant="caption" color="text.secondary">
//                     {post.author}
//                   </Typography>
//                   <Box
//                     aria-label="emoji"
//                     sx={{ ml: 'auto', fontSize: 18, lineHeight: 1 }}
//                   >
//                     {post.emoji}
//                   </Box>
//                 </Box>
//                 <Typography sx={{ fontWeight: 800, mb: 0.5 }}>{post.title}</Typography>
//                 <Typography
//                   variant="body2"
//                   color="text.secondary"
//                   sx={{
//                     display: '-webkit-box',
//                     WebkitLineClamp: 2,
//                     WebkitBoxOrient: 'vertical',
//                     overflow: 'hidden',
//                     mb: 1.5,
//                   }}
//                 >
//                   {post.preview}
//                 </Typography>
//               </CardContent>

//               <CardMedia
//                 component="img"
//                 height="200"
//                 image={post.image}
//                 alt={post.title}
//                 sx={{ objectFit: 'cover' }}
//               />

//               <CardContent sx={{ pt: 1.25 }}>
//                 <Typography
//                   variant="caption"
//                   color="text.secondary"
//                   sx={{ display: 'block', mb: 0.75 }}
//                 >
//                   {post.createdAt}
//                 </Typography>

//                 <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
//                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
//                     <FavoriteIcon sx={{ fontSize: 18, color: '#9e9e9e' }} />
//                     <Typography variant="body2" color="text.secondary">
//                       {post.likes}
//                     </Typography>
//                   </Box>
//                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
//                     <CommentIcon sx={{ fontSize: 18, color: '#9e9e9e' }} />
//                     <Typography variant="body2" color="text.secondary">
//                       {post.comments}
//                     </Typography>
//                   </Box>
//                 </Box>
//               </CardContent>
//             </Card>
//           ))}

//           {/* 하단 네비게이션 (모바일 느낌) */}
//           <Divider sx={{ my: 2, opacity: 0 }} />
//           <Box
//             sx={{
//               position: 'sticky',
//               bottom: 0,
//               left: 0,
//               right: 0,
//               bgcolor: '#fff',
//               borderTop: '1px solid #eaeaea',
//               py: 1,
//               display: 'flex',
//               justifyContent: 'space-around',
//               borderBottomLeftRadius: { sm: 12 },
//               borderBottomRightRadius: { sm: 12 },
//             }}
//           >
//             <Box sx={{ width: 24, height: 24, bgcolor: 'transparent' }} />
//             <Box sx={{ width: 24, height: 24, bgcolor: 'transparent' }} />
//             <Box sx={{ width: 24, height: 24, bgcolor: 'transparent' }} />
//           </Box>
//         </Container>
//       </Box>
//     </Box>
//   );
// }

// export default Profile;
