import { useEffect, useState } from 'react';
import {
  Card, CardMedia, CardContent, Typography, Box, IconButton, Badge, Drawer,
  List, ListItem, ListItemText, TextField, Button
} from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { toggleLike, getComments, addComment } from '../api';

export default function PostCard({ post }) {
  const [liked, setLiked] = useState(post.liked || false);
  const [likes, setLikes] = useState(post.likes || 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [input, setInput] = useState('');

  const onToggleLike = async () => {
    try {
      const res = await toggleLike(post.id); // {liked:boolean, likes:number}
      setLiked(res.liked);
      setLikes(res.likes);
    } catch {
      // 옵티미스틱 업데이트로도 가능
      setLiked(v => !v);
      setLikes(n => (liked ? n - 1 : n + 1));
    }
  };

  const loadComments = async () => {
    try {
      const list = await getComments(post.id);
      setComments(list);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (commentsOpen) loadComments(); }, [commentsOpen]);

  const onAddComment = async () => {
    if (!input.trim()) return;
    const newC = await addComment(post.id, input.trim());
    setInput('');
    setComments(prev => [...prev, newC]);
  };

  return (
    <Card sx={{ mb: 2, borderRadius: 3, overflow: 'hidden', boxShadow: '0 1px 0 rgba(0,0,0,0.02)' }}>
      <CardContent sx={{ pb: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: .5, display:'block' }}>
          {post.author}
        </Typography>
        <Typography sx={{ fontWeight: 800, mb: .5 }}>{post.title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: 1.5
        }}>
          {post.preview || post.content}
        </Typography>
      </CardContent>

      {post.image && (
        <CardMedia component="img" height="200" image={post.image} alt={post.title} sx={{ objectFit: 'cover' }} />
      )}

      <CardContent sx={{ pt: 1.25 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: .75 }}>
          {post.createdAt}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={onToggleLike} size="small">
            {liked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </IconButton>
          <Typography variant="body2" color="text.secondary">{likes}</Typography>

          <IconButton onClick={() => setCommentsOpen(true)} size="small">
            <Badge badgeContent={post.comments ?? 0} color="primary">
              <ChatBubbleOutlineIcon />
            </Badge>
          </IconButton>
        </Box>
      </CardContent>

      <Drawer anchor="bottom" open={commentsOpen} onClose={() => setCommentsOpen(false)}>
        <Box sx={{ p: 2, height: '60vh', display: 'flex', flexDirection: 'column' }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>댓글</Typography>
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            <List>
              {comments.map(c => (
                <ListItem key={c.id} alignItems="flex-start">
                  <ListItemText primary={c.author?.name || '익명'} secondary={c.content} />
                </ListItem>
              ))}
              {comments.length === 0 && <ListItem><ListItemText primary="첫 댓글을 남겨보세요!" /></ListItem>}
            </List>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth size="small" placeholder="댓글을 입력하세요"
              value={input} onChange={(e)=>setInput(e.target.value)}
            />
            <Button variant="contained" onClick={onAddComment}>등록</Button>
          </Box>
        </Box>
      </Drawer>
    </Card>
  );
}


// // PostCard.jsx

// export default function PostCard({ post, minimal = false }) {
//     return (
//         <div className="post-card">
//             {!minimal && (
//                 <div className="post-header" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
//                     <span className="post-category">{post.category}</span>
//                     {post.emoji ? (
//                         <span style={{ fontSize: 18 }}>{post.emoji}</span>
//                     ) : (
//                         <span style={{ fontSize: 16 }}>😊</span>
//                     )}
//                 </div>
//             )}

//             {post.title && <h3 className="post-title">{post.title}</h3>}

//             {post.description && (
//                 <p className="post-description">{post.description}</p>
//             )}

//             {post.image && (
//                 // use proper img tag
//                 <img className="post-image" src={post.image} alt="post media" />
//             )}

//             {!minimal && (
//                 <div className="post-actions">
//                     <div className="post-action">
//                         <span>♡</span>
//                         <span>{post.likes}</span>
//                     </div>
//                     <div className="post-action">
//                         <span>💬</span>
//                         <span>{post.comments}</span>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }


