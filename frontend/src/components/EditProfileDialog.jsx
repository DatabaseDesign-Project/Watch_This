import { useEffect, useState } from 'react';

import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Avatar, Stack
} from '@mui/material';
import { updateProfile, uploadAvatar } from '../api';

// 이미지 URL 처리 함수
function getImageUrl(path) {
  if (!path) return null;
  // /static 경로는 Vite 프록시가 처리하므로 그대로 반환
  return path;
}

export default function EditProfileDialog({ open, onClose, user, onUpdated }) {
  const [name, setName] = useState(user?.name || '');
  // const [email, setEmail] = useState(user?.email || '');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(user?.profileImage || null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && open) {
      setName(user.name || '');
      setPreview(getImageUrl(user.profileImage) || null);
      setFile(null);
    }
  }, [user, open]);

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
      
      // 닉네임 유효성 검사
      const trimmedName = name.trim();
      if (!trimmedName) {
        alert('닉네임을 입력해주세요.');
        setSaving(false);
        return;
      }
      
      let avatarUrl = user.profileImage;
      if (file) {
        const up = await uploadAvatar(file); // {url: "..."}
        avatarUrl = up.url;
      }
      // const updated = await updateProfile({ name, email, profileImage: avatarUrl });
      const updated = await updateProfile({ name: trimmedName, profileImage: avatarUrl });

      onUpdated(updated);
      onClose();
    } catch (e) {
      console.error('프로필 저장 오류:', e);
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
        {/* <TextField fullWidth label="이름" sx={{ mb: 2 }} value={name} onChange={(e)=>setName(e.target.value)} /> */}
        {/* <TextField fullWidth label="이메일" value={email} onChange={(e)=>setEmail(e.target.value)} /> */}        <TextField
          fullWidth
          label="닉네임"
          sx={{ mb: 2 }}
          value={name}
          onChange={(e)=>setName(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>저장</Button>
      </DialogActions>
    </Dialog>
  );
}
