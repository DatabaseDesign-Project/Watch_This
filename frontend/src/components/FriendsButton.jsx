import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, List, ListItem, ListItemAvatar,
  Avatar, ListItemText, IconButton, Tooltip, TextField, Box
} from '@mui/material';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import { getFriends, removeFriend, addFriend } from '../api';
import { Button } from './Button';

export default function FriendsButton({ count, onChanged }) {
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState([]);

  const load = async () => {
    try {
      const list = await getFriends();
      setFriends(list);
      onChanged?.(list.length);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (open) load(); }, [open]);

  const handleRemove = async (id) => {
    if (!confirm('친구를 삭제할까요?')) return;
    await removeFriend(id);
    await load();
  };

  const [emailInput, setEmailInput] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendByEmail = async () => {
    if (!emailInput || !emailInput.includes('@')) {
      alert('유효한 이메일을 입력해주세요.');
      return;
    }
    try {
      setSending(true);
      await addFriend(emailInput);
      alert('친구 요청을 보냈습니다.');
      setEmailInput('');
      await load();
    } catch (e) {
      console.error(e);
      alert('친구 요청을 보낼 수 없습니다: ' + e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        친구 {count}명
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle>친구 목록</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="이메일로 친구 요청 보내기"
              size="small"
              fullWidth
            />
            <Button variant="contained" disabled={sending} onClick={handleSendByEmail}>보내기</Button>
          </Box>
          <List>
            {friends.map(f => (
              <ListItem
                key={f.id}
                secondaryAction={
                  <Tooltip title="삭제">
                    <IconButton edge="end" onClick={() => handleRemove(f.id)}>
                      <PersonRemoveIcon />
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemAvatar><Avatar src={f.profile_image || f.profileImage || undefined} /></ListItemAvatar>
                <ListItemText primary={f.nickname || f.name} secondary={f.email} />
              </ListItem>
            ))}
            {friends.length === 0 && <ListItem><ListItemText primary="친구가 없습니다" /></ListItem>}
          </List>
        </DialogContent>
      </Dialog>
    </>
  );
}
