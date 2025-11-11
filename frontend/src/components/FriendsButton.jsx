import { useEffect, useState } from 'react';
import {
  Button, Dialog, DialogTitle, DialogContent, List, ListItem, ListItemAvatar,
  Avatar, ListItemText, IconButton, Tooltip
} from '@mui/material';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import { getFriends, removeFriend } from '../api';

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

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        sx={{ borderRadius: 2, borderColor: '#ff8a8a', color: '#ff6b6b', textTransform: 'none', px: 2.5 }}
        onClick={() => setOpen(true)}
      >
        친구 {count}명
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth>
        <DialogTitle>친구 목록</DialogTitle>
        <DialogContent dividers>
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
                <ListItemAvatar><Avatar src={f.avatar || undefined} /></ListItemAvatar>
                <ListItemText primary={f.name} secondary={f.email} />
              </ListItem>
            ))}
            {friends.length === 0 && <ListItem><ListItemText primary="친구가 없습니다" /></ListItem>}
          </List>
        </DialogContent>
      </Dialog>
    </>
  );
}
