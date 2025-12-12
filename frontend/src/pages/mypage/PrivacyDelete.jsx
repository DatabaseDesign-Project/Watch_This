import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../index.css';
import { MobileStatusBar } from '../../components/MobileStatusBar';
import { Button as CustomButton } from '../../components/Button';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';

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
    <div className="fullscreen">
      <div className="mobile-container">
        <MobileStatusBar />
        
        <div className="page-container settings-container scrollable-container">
          {/* 상단 헤더 */}
          <header className="settings-header">
            <CustomButton variant="ghost" className="back-button" onClick={handleBack}>
              <svg className="back-icon" viewBox="0 0 29 29" fill="none">
                <path 
                  d="M18.125 21.75L10.875 14.5L18.125 7.25" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </CustomButton>
            <h1 className="settings-title">회원탈퇴</h1>
          </header>

          {/* 스크롤 가능한 콘텐츠 영역 */}
          <div className="settings-content" style={{ backgroundColor: '#f5f5f5' }}>
            <Box sx={{ pt: 3, px: 2 }}>
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
            </Box>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrivacyDelete;
