import { useNavigate } from 'react-router-dom';
import '../../index.css';
import { MobileStatusBar } from '../../components/MobileStatusBar';
import { Button } from '../../components/Button';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
} from '@mui/material';
import {
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
    // 필요하다면 여기서 localStorage / cookie 정리도 같이 해줘도 됨
    alert('로그아웃되었습니다.');
    navigate('/', { replace: true });
  };

  const handlePrivacy = () => {
    navigate('/settings/privacy');
  };

  return (
    <div className="fullscreen">
      <div className="mobile-container">
        <MobileStatusBar />
        
        <div className="page-container settings-container scrollable-container">
          {/* 상단 헤더 */}
          <header className="settings-header">
            <Button variant="ghost" className="back-button" onClick={handleBack}>
              <svg className="back-icon" viewBox="0 0 29 29" fill="none">
                <path 
                  d="M18.125 21.75L10.875 14.5L18.125 7.25" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
            <h1 className="settings-title">설정</h1>
          </header>

          {/* 스크롤 가능한 콘텐츠 영역 */}
          <div className="settings-content" style={{ backgroundColor: '#f5f5f5' }}>
            <Box sx={{ pt: 2, px: 2 }}>
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
            </Box>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;


// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import {
//   Box,
//   Container,
//   Typography,
//   List,
//   ListItem,
//   ListItemButton,
//   ListItemText,
//   IconButton,
//   Divider,
// } from '@mui/material';
// import {
//   ArrowBack as ArrowBackIcon,
//   ChevronRight as ChevronRightIcon,
// } from '@mui/icons-material';

// function Settings() {
//   const navigate = useNavigate();

//   const handleBack = () => {
//     navigate(-1);
//   };

//   const handlePasswordChange = () => {
//     navigate('/settings/password');
//   };

//   const handleLogout = () => {
//     navigate('/settings/logout-confirm');
//   };

//   const handlePrivacy = () => {
//     navigate('/settings/privacy');
//   };

//   return (
//     <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh' }}>
//       {/* 헤더 */}
//       <Box
//         sx={{
//           bgcolor: 'white',
//           borderBottom: '1px solid #e0e0e0',
//           position: 'sticky',
//           top: 0,
//           zIndex: 10,
//         }}
//       >
//         <Container maxWidth="sm">
//           <Box
//             sx={{
//               display: 'flex',
//               alignItems: 'center',
//               py: 1.5,
//             }}
//           >
//             <IconButton onClick={handleBack} sx={{ mr: 1 }}>
//               <ArrowBackIcon />
//             </IconButton>
//             <Typography variant="h6" sx={{ fontWeight: 600 }}>
//               설정
//             </Typography>
//           </Box>
//         </Container>
//       </Box>

//       <Container maxWidth="sm" sx={{ pt: 2 }}>
//         <Box sx={{ bgcolor: 'white', borderRadius: 2 }}>
//           <List sx={{ p: 0 }}>
//             <ListItem disablePadding>
//               <ListItemButton onClick={handlePasswordChange}>
//                 <ListItemText 
//                   primary="비밀번호 변경" 
//                   primaryTypographyProps={{ fontWeight: 500 }}
//                 />
//                 <ChevronRightIcon sx={{ color: '#999' }} />
//               </ListItemButton>
//             </ListItem>
//             <Divider />
//             <ListItem disablePadding>
//               <ListItemButton onClick={handleLogout}>
//                 <ListItemText 
//                   primary="로그아웃" 
//                   primaryTypographyProps={{ fontWeight: 500 }}
//                 />
//                 <ChevronRightIcon sx={{ color: '#999' }} />
//               </ListItemButton>
//             </ListItem>
//             <Divider />
//             <ListItem disablePadding>
//               <ListItemButton onClick={handlePrivacy}>
//                 <ListItemText 
//                   primary="회원탈퇴" 
//                   primaryTypographyProps={{ fontWeight: 500 }}
//                 />
//                 <ChevronRightIcon sx={{ color: '#999' }} />
//               </ListItemButton>
//             </ListItem>
//           </List>
//         </Box>
//       </Container>
//     </Box>
//   );
// }

// export default Settings;