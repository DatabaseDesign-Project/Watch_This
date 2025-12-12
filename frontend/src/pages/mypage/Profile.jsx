import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../index.css';
import { MobileStatusBar } from '../../components/MobileStatusBar';
import BottomNavigation from '../../components/BottomNavigation';
import Header from '../../components/Header';
import { Button } from '../../components/Button';
import FriendsButton from '../../components/FriendsButton';
import PostCard from '../../components/PostCard';
import EditProfileDialog from '../../components/EditProfileDialog';
import { getProfile, getUserPosts, getFriends } from '../../api';

// 이미지 URL 처리 함수
function getImageUrl(path) {
  if (!path) return null;
  // /static 경로는 Vite 프록시가 처리하므로 그대로 반환
  return path;
}

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
        
        // 병렬로 프로필 가져오기
        const currentUser = await getProfile();
        setUser(currentUser);
        setLoading(false); // 프로필은 바로 표시
        
        // 포스트와 친구 정보는 병렬로 가져오기 (프로필 표시를 막지 않음)
        Promise.all([
          getUserPosts(currentUser.id).catch(err => {
            console.error('포스트 로드 실패:', err);
            return [];
          }),
          getFriends().catch(err => {
            console.error('친구 로드 실패:', err);
            return [];
          })
        ]).then(([userPosts, friends]) => {
          // 포스트 매핑
          const mapped = Array.isArray(userPosts)
            ? userPosts.map(p => {
                const posterImage = p.movie?.poster_image || p.movie?.poster || null;
                const questionMedia = Array.isArray(p.questionMedias) && p.questionMedias[0]?.file_path;
                const image = posterImage || questionMedia || null;
                const description = Array.isArray(p.answers) ? p.answers.map((a) => a.answer).join('\n') : '';

                return {
                  id: p.post_id || p.id,
                  category: p.user?.nickname || p.nickname || currentUser?.name || '익명',
                  movieTitle: p.movie?.title || p.movie?.korean_title || p.movie_title || '',
                  title: p.title || '',
                  description,
                  image,
                  likes: p.like_cnt || 0,
                  comments: (p.comments || []).length || 0,
                  createdAt: p.created_at || p.createdAt,
                  liked: p.liked || p.is_liked || false,
                  emoji: p.emoji?.emoji_image || p.emoji_image || null,
                  isSpoiler: Boolean(p.is_spoiler),
                  showPlaceholderImage: !image,
                };
              })
            : [];
          setPosts(mapped);
          
          // 친구 수 설정
          setFriendCount(Array.isArray(friends) ? friends.length : (currentUser.friendCount || 0));
        });
        
      } catch (error) {
        console.error('프로필 로딩 실패:', error);
        setUser(null);
        setPosts([]);
        setFriendCount(0);
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSettingsClick = () => navigate('/settings');
  
  const handleEditProfile = () => {
    setEditOpen(true);
  };

  const handleProfileUpdated = (updatedUser) => {
    setUser(updatedUser);
  };

  const handlePostClick = (post) => {
    navigate(`/post/${post.id}`);
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
                  <img src={getImageUrl(user.profileImage)} alt="프로필" className="avatar-image" />
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
                    <PostCard key={post.id} post={post} onClick={handlePostClick} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 하단 네비게이션 */}
        <BottomNavigation activeTab="profile" />
        
        {/* 프로필 편집 다이얼로그 */}
        <EditProfileDialog 
          open={editOpen}
          onClose={() => setEditOpen(false)}
          user={user}
          onUpdated={handleProfileUpdated}
        />
      </div>
    </div>
  );
}

export default Profile;
