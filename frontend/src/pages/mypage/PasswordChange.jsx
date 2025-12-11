import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../index.css';
import { MobileStatusBar } from '../../components/MobileStatusBar';
import { Button as CustomButton } from '../../components/Button';
import {
  Box,
  TextField,
  Button,
} from '@mui/material';

function PasswordChange() {
  const navigate = useNavigate();
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const handleBack = () => {
    navigate(-1);
  };

  const handleChange = (field) => (event) => {
    setPasswords({
      ...passwords,
      [field]: event.target.value,
    });
  };

  const handleSubmit = () => {
    // TODO: API 호출
    console.log('비밀번호 변경:', passwords);
    alert('비밀번호가 변경되었습니다.');
    navigate('/profile');
  };

  const isFormValid =
    passwords.current &&
    passwords.new &&
    passwords.confirm &&
    passwords.new === passwords.confirm;

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
            <h1 className="settings-title">비밀번호 변경</h1>
          </header>

          {/* 스크롤 가능한 콘텐츠 영역 */}
          <div className="settings-content" style={{ backgroundColor: '#f5f5f5' }}>
            <Box sx={{ pt: 3, px: 2 }}>
              <Box sx={{ bgcolor: 'white', borderRadius: 2, p: 3 }}>
                <TextField
                  fullWidth
                  type="password"
                  label="기존 비밀번호"
                  value={passwords.current}
                  onChange={handleChange('current')}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  type="password"
                  label="새 비밀번호"
                  value={passwords.new}
                  onChange={handleChange('new')}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  type="password"
                  label="새 비밀번호 확인"
                  value={passwords.confirm}
                  onChange={handleChange('confirm')}
                  error={passwords.confirm && passwords.new !== passwords.confirm}
                  helperText={
                    passwords.confirm && passwords.new !== passwords.confirm
                      ? '비밀번호가 일치하지 않습니다'
                      : ''
                  }
                />
              </Box>

              <Button
                fullWidth
                variant="contained"
                onClick={handleSubmit}
                disabled={!isFormValid}
                sx={{
                  mt: 2,
                  py: 1.5,
                  bgcolor: '#e57373',
                  '&:hover': {
                    bgcolor: '#d32f2f',
                  },
                  '&.Mui-disabled': {
                    bgcolor: '#ccc',
                  },
                }}
              >
                변경
              </Button>
            </Box>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PasswordChange;