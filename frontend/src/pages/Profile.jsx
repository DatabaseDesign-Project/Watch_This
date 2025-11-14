import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css';
import { MobileStatusBar } from '../components/MobileStatusBar';
import BottomNavigation from '../components/BottomNavigation';
import Header from '../components/Header';
import { Button } from '../components/Button';
import FriendsButton from '../components/FriendsButton';
import PostCard from '../components/PostCard';
import { getProfile, getUserPosts } from '../api';

// =========================
// ✨ 샘플 포스트 설정
// =========================
const USE_SAMPLE_POSTS = true; // 나중에 실제 데이터만 보고 싶으면 false 로 바꿔!

const SAMPLE_POSTS = [
  {
    id: 1,
    author: '민수 · 인사이드 아웃 2',
    title: '불안이를 모아라',
    preview: '감정이라는 캐릭터가 이렇게 귀엽고 설득력 있게 나올 줄은… 다시 생각하게 된 성장 영화.',
    image: 'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
    likes: 12,
    comments: 3,
    liked: true,
    createdAt: '2025.11.13 21:00',
  },
  {
    id: 2,
    author: '민수 · 웡카',
    title: '달콤하지만 조금은 씁쓸한 이야기',
    preview: '동심 가득한 음악 영화인 줄 알았는데, 자본과 꿈 사이에서 고민하는 이야기라 더 좋았다.',
    image: 'https://image.tmdb.org/t/p/w500/qhb1qOilapbapxWQn9jtRCMwXJF.jpg',
    likes: 5,
    comments: 0,
    liked: false,
    createdAt: '2025.11.10 18:30',
  },
];

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [friendCount, setFriendCount] = useState(0);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        
        // 현재 로그인한 유저 프로필 가져오기
        const currentUser = await getProfile();
        setUser(currentUser);
        
        // 유저의 포스트 가져오기
        const userPosts = await getUserPosts(currentUser.id);
        
        // 실제 포스트가 없고 샘플을 보고 싶을 때만 SAMPLE_POSTS 사용
        if (USE_SAMPLE_POSTS && (!userPosts || userPosts.length === 0)) {
          setPosts(SAMPLE_POSTS);
        } else {
          setPosts(userPosts || []);
        }
        
        // 친구 수는 실제 데이터가 없으면 기본값 사용
        setFriendCount(currentUser.friendCount || 15);
        
      } catch (error) {
        console.error('프로필 로딩 실패:', error);
        
        // 에러 발생 시 샘플 데이터로 대체 (개발용)
        setUser({
          id: 1,
          name: '민수',
          email: 'minsu@example.com',
          profileImage: null
        });
        setPosts(SAMPLE_POSTS);
        setFriendCount(15);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSettingsClick = () => navigate('/settings');
  
  const handleEditProfile = () => {
    // 프로필 편집 로직 (임시로 alert)
    alert('프로필 편집 기능은 준비중입니다.');
  };



  // 로딩 중일 때 표시할 컴포넌트
  if (loading) {
    return (
      <div className="fullscreen">
        <div className="mobile-container">
          <MobileStatusBar />
          <div className="page-container">
            <Header title="이거봤어" variant="search" />
            <div className="content-container profile-content">
              <div className="loading-container">
                <p className="text-base font-pretendard text-ghost">프로필을 불러오는 중...</p>
              </div>
            </div>
            <BottomNavigation activeTab="profile" />
          </div>
        </div>
      </div>
    );
  }

  // 유저 정보가 없을 때 (에러 상태)
  if (!user) {
    return (
      <div className="fullscreen">
        <div className="mobile-container">
          <MobileStatusBar />
          <div className="page-container">
            <Header title="이거봤어" variant="search" />
            <div className="content-container profile-content">
              <div className="error-container">
                <p className="text-base font-pretendard text-ghost">프로필을 불러올 수 없습니다.</p>
                <Button variant="primary" onClick={() => window.location.reload()}>
                  다시 시도
                </Button>
              </div>
            </div>
            <BottomNavigation activeTab="profile" />
          </div>
        </div>
      </div>
    );
  }

  // 화면에 보여줄 포스트 배열
  const postsForDisplay = posts;

  return (
    <div className="fullscreen">
      <div className="mobile-container">
        <MobileStatusBar />

        {/* 상단 헤더 */}
        <Header 
          title="이거봤어" 
          variant="search"
          rightAction={
            <Button variant="ghost" onClick={handleSettingsClick}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          }
        />

        <div className="page-container">
          {/* 스크롤 가능한 콘텐츠 영역 */}
          <div className="content-container profile-content scrollable-container">
            {/* 프로필 카드 */}
            <div className="profile-card">
              <div className="profile-avatar">
                {user.profileImage ? (
                  <img src={user.profileImage} alt="프로필" className="avatar-image" />
                ) : (
                  <div className="avatar-placeholder">
                    <span className="avatar-initial">{user.name?.charAt(0) || 'U'}</span>
                  </div>
                )}
              </div>
              
              <h2 className="profile-name text-lg font-semibold font-pretendard text-primary">
                {user.name}
              </h2>
              
              <p className="profile-email text-base font-pretendard text-ghost">
                {user.email}
              </p>

              <div className="profile-actions">
                <FriendsButton 
                  count={friendCount}
                  onChanged={setFriendCount}
                />
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleEditProfile}
                >
                  프로필 편집
                </Button>
              </div>
            </div>

            {/* 내 포스트 섹션 */}
            <div className="posts-section">
              <h3 className="posts-title text-md font-bold font-pretendard text-primary">
                내 포스트
              </h3>

              {postsForDisplay.length === 0 ? (
                <div className="empty-posts">
                  <p className="text-base font-pretendard text-ghost">
                    아직 작성한 포스트가 없습니다.
                  </p>
                </div>
              ) : (
                <div className="posts-list">
                  {postsForDisplay.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 하단 네비게이션 */}
        <BottomNavigation activeTab="profile" />
      </div>
    </div>
  );
}

export default Profile;
