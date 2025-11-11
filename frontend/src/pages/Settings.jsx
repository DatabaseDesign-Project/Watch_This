import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Divider,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';

function Settings() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  const handlePasswordChange = () => {
    navigate('/settings/password');
  };

  const handleLogout = () => {
    navigate('/settings/logout-confirm');
  };

  const handlePrivacy = () => {
    navigate('/settings/privacy');
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
              설정
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ pt: 2 }}>
        <Box sx={{ bgcolor: 'white', borderRadius: 2 }}>
          <List sx={{ p: 0 }}>
            <ListItem disablePadding>
              <ListItemButton onClick={handlePasswordChange}>
                <ListItemText 
                  primary="비밀번호 변경" 
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
                <ChevronRightIcon sx={{ color: '#999' }} />
              </ListItemButton>
            </ListItem>
            <Divider />
            <ListItem disablePadding>
              <ListItemButton onClick={handleLogout}>
                <ListItemText 
                  primary="로그아웃" 
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
                <ChevronRightIcon sx={{ color: '#999' }} />
              </ListItemButton>
            </ListItem>
            <Divider />
            <ListItem disablePadding>
              <ListItemButton onClick={handlePrivacy}>
                <ListItemText 
                  primary="회원탈퇴" 
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
                <ChevronRightIcon sx={{ color: '#999' }} />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Container>
    </Box>
  );
}

export default Settings;