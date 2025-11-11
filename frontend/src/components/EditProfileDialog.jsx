import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Avatar, Stack
} from '@mui/material';
import { updateProfile, uploadAvatar } from '../api';

export default function EditProfileDialog({ open, onClose, user, onUpdated }) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(user?.profileImage || null);
  const [saving, setSaving] = useState(false);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      let avatarUrl = user.profileImage;
      if (file) {
        const up = await uploadAvatar(file); // {url: "..."}
        avatarUrl = up.url;
      }
      const updated = await updateProfile({ name, email, profileImage: avatarUrl });
      onUpdated(updated);
      onClose();
    } catch (e) {
      alert(e.message || '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>프로필 편집</DialogTitle>
      <DialogContent dividers>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Avatar src={preview || undefined} sx={{ width: 72, height: 72 }} />
          <Button component="label" variant="outlined">이미지 변경
            <input type="file" hidden accept="image/*" onChange={handleFile} />
          </Button>
        </Stack>
        <TextField fullWidth label="이름" sx={{ mb: 2 }} value={name} onChange={(e)=>setName(e.target.value)} />
        <TextField fullWidth label="이메일" value={email} onChange={(e)=>setEmail(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>저장</Button>
      </DialogActions>
    </Dialog>
  );
}
