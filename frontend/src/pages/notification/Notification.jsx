import { useState, useEffect } from 'react';
import '../../index.css';
import { MobileStatusBar } from '../../components/MobileStatusBar';
import BottomNavigation from '../../components/BottomNavigation';
import FriendRequest from './FriendRequest';
import Header from '../../components/Header';
import { Button } from '../../components/Button';
import { getNotifications, markNotificationRead, getFriendRequests } from '../../api';

const Notification = () => {
  const [showFriendRequest, setShowFriendRequest] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [friendRequestCount, setFriendRequestCount] = useState(0);

  const handleNotificationClick = async (id, isRead) => {
    // 알림 클릭: 읽음 처리 및 UI 업데이트 (회색 처리)
    if (!isRead) {
      try {
        await markNotificationRead(id);
      } catch (e) {
        console.error('알림 읽음 처리 실패', e);
      }
    }
    setNotifications((prev) => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleFriendRequestClick = () => {
    // 친구 신청 목록으로 이동
    console.log('친구 신청 목록으로 이동');
    setShowFriendRequest(true);
  };

  const refreshFriendRequestCount = async () => {
    try {
      const reqs = await getFriendRequests('in');
      setFriendRequestCount(Array.isArray(reqs) ? reqs.length : 0);
    } catch (e) {
      console.error('친구 요청 수 로드 실패', e);
    }
  };

  const handleBackToNotifications = () => {
    setShowFriendRequest(false);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rows = await getNotifications({ limit: 50 });
        if (!mounted) return;
        // rows shape: { id, type, message, is_read, created_at, sender }
        setNotifications(rows.map(r => ({
          id: r.id,
          type: r.type,
          message: r.message,
          isRead: !!r.is_read,
          created_at: r.created_at,
          sender: r.sender || null,
        })));
      } catch (e) {
        console.error('알림 로드 실패', e);
      }
    })();
    return () => { mounted = false };
  }, []);

  useEffect(() => {
    // 초기 친구 요청 수 로드
    refreshFriendRequestCount();
  }, []);

  // 친구 신청 화면이 활성화된 경우
  if (showFriendRequest) {
    return <FriendRequest onBack={handleBackToNotifications} onChanged={refreshFriendRequestCount} />;
  }

  return (
    <div className="fullscreen">
      <div className="mobile-container">
        <MobileStatusBar />

        <div className="page-container notification-container scrollable-container">
          {/* 상단 헤더 */}
          <Header title="이거봤어" variant="search" />

          {/* 친구 신청 배너 */}
          <Button
            variant="outline"
            className="friend-request-banner"
            onClick={handleFriendRequestClick}
          >
            <span className="friend-request-banner-text">
              친구 신청 {friendRequestCount > 0 ? `${friendRequestCount}명` : '0명'}
            </span>
          </Button>

          {/* 알림 목록 */}
          <div className="notification-list">
                {notifications.length > 0 ? (
              notifications.map((notification) => {
                const senderName = notification.sender?.nickname || '익명';
                const ts = notification.created_at ? new Date(notification.created_at).toLocaleString('ko-KR') : '';
                return (
                  <div
                    key={notification.id}
                    className={`list-item notification-item ${notification.isRead ? 'read' : 'unread'} ${notification.message ? 'with-message' : ''}`}
                    onClick={() => {
                      handleNotificationClick(notification.id, notification.isRead);
                      // if it's a friend request notification, open the friend request view
                      if (notification.type === 'friend_request') {
                        handleFriendRequestClick();
                      }
                    }}
                  >
                    <div className="notification-content">
                      {notification.type === 'comment' ? (
                        <>
                          <p className="notification-main-text text-base font-inter">
                            {senderName}님이 댓글을 달았어요.
                          </p>
                          {notification.message && (
                            <p className="notification-message text-base font-inter">
                              {notification.message}
                            </p>
                          )}
                        </>
                      ) : notification.type === 'friend_request' ? (
                        <p className="notification-friend text-base font-semibold font-pretendard">
                          {senderName}님이 친구 요청을 보냈어요.
                        </p>
                      ) : notification.type === 'like' ? (
                        <p className="notification-like text-base font-semibold font-pretendard">
                          {senderName}님이 좋아요를 눌렀어요.
                        </p>
                      ) : (
                        // fallback: show provided message or a generic text
                        <p className="notification-generic text-base font-inter">
                          {notification.message || `${senderName}님으로부터 알림이 있습니다.`}
                        </p>
                      )}
                    </div>
                    <p className="notification-timestamp item-timestamp text-sm font-pretendard">
                      {ts}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="notification-empty">
                <p className="text-base font-inter">받은 알림이 없습니다.</p>
              </div>
            )}
          </div>

          {/* 하단 네비게이션 */}
          <BottomNavigation activeTab="notifications" />
        </div>
      </div>
    </div>
  );
};

export default Notification;
