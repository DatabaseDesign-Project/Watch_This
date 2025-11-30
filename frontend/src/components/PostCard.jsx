import { useEffect, useState } from 'react';
import {
  Card,
  CardMedia,
  CardContent,
  Typography,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  TextField,
  Button,
} from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { toggleLike, getComments, addComment } from '../api';

export default function PostCard({ post, onClick }) {
  const [liked, setLiked] = useState(post.liked || false);
  const [likes, setLikes] = useState(post.likes || 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [input, setInput] = useState('');
  const [commentCount, setCommentCount] = useState(post.comments ?? 0);

  const onToggleLike = async (e) => {
    e.stopPropagation(); // 카드 클릭 방지
    try {
      await toggleLike(post.id, liked);
      setLiked(prev => {
        setLikes(n => (prev ? Math.max(0, n - 1) : n + 1));
        return !prev;
      });
    } catch (e) {
      console.error('좋아요 실패', e);
    }
  };

  const loadComments = async () => {
    try {
      const list = await getComments(post.id);
      setComments(list);
      setCommentCount(list.length);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { if (commentsOpen) loadComments(); }, [commentsOpen]);

  const onAddComment = async () => {
    if (!input.trim()) return;
    try {
      await addComment(post.id, input.trim());
      setInput('');
      // refresh from server to get canonical comment shape
      await loadComments();
    } catch (e) {
      console.error('댓글 추가 실패', e);
    }
  };

  return (
    <Card 
        sx={{ mb: 2, borderRadius: 3, overflow: 'hidden', boxShadow: '0 1px 0 rgba(0,0,0,0.02)', cursor: 'pointer' }}
        onClick={() => onClick && onClick(post)} // 클릭 시 부모 핸들러 호출
    >
      <CardContent sx={{ pb: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: .5, display:'block' }}>
          {post.category || post.author}
        </Typography>
        <Typography sx={{ fontWeight: 800, mb: .5 }}>{post.title}</Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            mb: 1.5,
          }}
        >
          {post.preview || post.description}
        </Typography>
      </CardContent>

      {post.image && (
        <CardMedia
          component="img"
          height="200"
          image={post.image}
          alt={post.title}
          sx={{ objectFit: 'cover' }}
        />
      )}

      <CardContent sx={{ pt: 1.25 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: .75 }}>
          {post.createdAt || new Date().toLocaleDateString()}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* 좋아요 */}
          <IconButton onClick={onToggleLike} size="small" aria-pressed={liked}>
            {liked ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
          </IconButton>
          <Typography variant="body2" color="text.secondary">
            {likes}
          </Typography>

          {/* 댓글 */}
          <IconButton onClick={(e) => { e.stopPropagation(); setCommentsOpen(true); }} size="small">
            <ChatBubbleOutlineIcon />
          </IconButton>
          <Typography variant="body2" color="text.secondary">
            {commentCount}
          </Typography>
        </Box>
      </CardContent>

      <Drawer anchor="bottom" open={commentsOpen} onClose={() => setCommentsOpen(false)}>
        {/* Drawer 내부는 클릭 이벤트 전파를 막기 위해 Box에 stopPropagation 추가 */}
        <Box sx={{ p: 2, height: '60vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>댓글</Typography>
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            <List>
              {comments.map(c => (
                <ListItem key={c.id} alignItems="flex-start">
                  <ListItemText primary={c.user?.nickname || '익명'} secondary={c.body || c.content} />
                </ListItem>
              ))}
              {comments.length === 0 && (
                <ListItem>
                  <ListItemText primary="첫 댓글을 남겨보세요!" />
                </ListItem>
              )}
            </List>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="댓글을 입력하세요"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button variant="contained" onClick={onAddComment}>
              등록
            </Button>
          </Box>
        </Box>
      </Drawer>
    </Card>
  );
}
