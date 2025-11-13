import { useState } from 'react';
import '../index.css';
import { MobileStatusBar } from '../components/MobileStatusBar';
import BottomNavigation from '../components/BottomNavigation';

const Notification = () => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'comment',
      user: 'ㅁㅁ',
      message: '좋은 포스트 감사합니다',
      timestamp: '2025.09.19 11:00',
      isRead: false
    },
    {
      id: 2,
      type: 'like',
      user: 'ㅇㅇ',
      message: null,
      timestamp: '2025.09.19 11:00',
      isRead: false
    },
    {
      id: 3,
      type: 'comment',
      user: 'ㅁㅁ',
      message: '저는 이 영화 ~~점이 별로였씁니다. 어쩌구저쩌구이러쿵저러쿵길어지면이렇게...으로 넘어가게합시다 2줄까지!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! 표시...',
      timestamp: '2025.09.19 11:00',
      isRead: false
    },
    {
      id: 4,
      type: 'like',
      user: 'ㅇㅇ',
      message: null,
      timestamp: '2025.09.19 11:00',
      isRead: true
    },
    {
      id: 5,
      type: 'like',
      user: 'ㅇㅇ',
      message: null,
      timestamp: '2025.09.19 11:00',
      isRead: true
    },
    {
      id: 6,
      type: 'comment',
      user: 'ㅁㅁ',
      message: '좋은 포스트 감사합니다',
      timestamp: '2025.09.19 11:00',
      isRead: true
    }
  ]);

  const [friendRequestCount] = useState(3);

  const handleNotificationClick = (id) => {
    // 알림 클릭 시 해당 포스트로 이동하는 로직
    console.log('알림 클릭:', id);

    // 읽음 처리
    setNotifications(notifications.map(notif =>
      notif.id === id ? { ...notif, isRead: true } : notif
    ));
  };

  const handleFriendRequestClick = () => {
    // 친구 신청 목록으로 이동
    console.log('친구 신청 목록으로 이동');
  };

  return (
    <div className="fullscreen">
      <div className="mobile-container">
        <MobileStatusBar />

        <div className="notification-container">
          {/* 상단 헤더 */}
          <header className="search-page-header">
            <h1 className="search-app-title">이거봤어</h1>
          </header>

          {/* 친구 신청 배너 */}
          {friendRequestCount > 0 && (
            <button
              className="friend-request-banner"
              onClick={handleFriendRequestClick}
            >
              <span className="friend-request-text">
                친구 신청 {friendRequestCount}명
              </span>
            </button>
          )}

          {/* 알림 목록 */}
          <div className="notification-list">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${notification.isRead ? 'read' : 'unread'} ${notification.message ? 'with-message' : ''}`}
                onClick={() => handleNotificationClick(notification.id)}
              >
                <div className="notification-content">
                  {notification.type === 'comment' ? (
                    <>
                      <p className="notification-main-text">
                        {notification.user}님이 댓글을 달았어요.
                      </p>
                      {notification.message && (
                        <p className="notification-message">
                          {notification.message}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="notification-like">
                      {notification.user}님이 좋아요를 눌렀어요.
                    </p>
                  )}
                </div>
                <p className="notification-timestamp">
                  {notification.timestamp}
                </p>
              </div>
            ))}
          </div>

          {/* 하단 네비게이션 */}
          <BottomNavigation activeTab="notifications" />
        </div>
      </div>
    </div>
  );
};

export default Notification;
