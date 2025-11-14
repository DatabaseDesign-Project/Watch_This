import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  IconButton,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

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
              비밀번호 변경
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="sm" sx={{ pt: 3 }}>
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
      </Container>
    </Box>
  );
}

export default PasswordChange;