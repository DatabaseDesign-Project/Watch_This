import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

function PrivacyDelete() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  const handleDelete = () => {
    if (window.confirm('정말로 회원탈퇴 하시겠습니까?')) {
      // TODO: API 호출
      console.log('회원탈퇴');
      alert('회원탈퇴가 완료되었습니다.');
      navigate('/');
    }
  };

  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      {/* 헤더 */}
      <Box
        sx={{
          bgcolor: 'white',
          borderBottom: '1px solid #e0e0e0',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Container maxWidth="sm">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              py: 1.5,
            }}
          >
            <IconButton onClick={handleBack} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              회원탈퇴
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ pt: 3 }}>
        <Box sx={{ bgcolor: 'white', borderRadius: 2, p: 3, mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            회원 탈퇴 시 아래 사항에 유의하세요.
          </Typography>

          <List>
            <ListItem sx={{ px: 0 }}>
              <ListItemText
                primary="- 탈퇴시 회원정보 및 작성하신 게시물은 모두 삭제되며 탈퇴 이후엔 복구가 불가능합니다."
                primaryTypographyProps={{
                  variant: 'body2',
                  color: 'text.secondary',
                }}
              />
            </ListItem>
            <ListItem sx={{ px: 0 }}>
              <ListItemText
                primary="- 탈퇴시 회원님의 좋아요, 댓글 또한 모두 삭제됩니다."
                primaryTypographyProps={{
                  variant: 'body2',
                  color: 'text.secondary',
                }}
              />
            </ListItem>
          </List>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 2, fontStyle: 'italic' }}
          >
            지금까지 이용해 주셔서 감사합니다. 더욱 좋은 서비스로 다시 찾아뵙겠습니다.
          </Typography>
        </Box>

        <Button
          fullWidth
          variant="contained"
          onClick={handleDelete}
          sx={{
            py: 1.5,
            bgcolor: '#e57373',
            '&:hover': {
              bgcolor: '#d32f2f',
            },
          }}
        >
          탈퇴하기
        </Button>
      </Container>
    </Box>
  );
}

export default PrivacyDelete;