import React, { useState, useEffect } from 'react';
import '../../index.css';
import { MobileStatusBar } from '../../components/MobileStatusBar';
import { Button } from '../../components/Button';
import { getFriendRequests, acceptFriendRequest, rejectFriendRequest } from '../../api';

const FriendRequest = ({ onBack, onChanged }) => {
  const [friendRequests, setFriendRequests] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rows = await getFriendRequests('in');
        if (!mounted) return;
        // rows: array of { requester, addressee, status, created_at, responded_at }
        const mapped = (rows || []).map(r => ({
          requesterId: r.requester?.id,
          name: r.requester?.nickname || '익명',
          profileImage: r.requester?.profile_image || null,
          timestamp: r.created_at,
        }));
        setFriendRequests(mapped);
      } catch (e) {
        console.error('친구 요청 로드 실패', e);
      }
    })();
    return () => { mounted = false };
  }, []);

  const handleAccept = async (requesterId, name) => {
    if (!confirm(`${name}님의 친구 요청을 수락하시겠습니까?`)) return;
    try {
      await acceptFriendRequest(requesterId);
      setFriendRequests(prev => prev.filter(r => r.requesterId !== requesterId));
      if (onChanged) onChanged();
    } catch (e) {
      console.error('수락 실패', e);
      alert('수락 실패: ' + e.message);
    }
  };

  const handleReject = async (requesterId, name) => {
    if (!confirm(`${name}님의 친구 요청을 거절하시겠습니까?`)) return;
    try {
      await rejectFriendRequest(requesterId);
      setFriendRequests(prev => prev.filter(r => r.requesterId !== requesterId));
      if (onChanged) onChanged();
    } catch (e) {
      console.error('거절 실패', e);
      alert('거절 실패: ' + e.message);
    }
  };

  const handleBack = () => {
    // 이전 화면(알림)으로 돌아가기
    console.log('뒤로 가기');
    if (onBack) {
      onBack();
    }
  };

  return (
    <div className="fullscreen">
      <div className="mobile-container">
        <MobileStatusBar />

        <div className="page-container friend-request-container scrollable-container">
          {/* 상단 헤더 */}
          <header className="friend-request-header">
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
            <h1 className="friend-request-title">친구 신청 목록</h1>
          </header>

          {/* 친구 신청 목록 */}
          <div className="friend-request-list">
            {friendRequests.length > 0 ? (
              friendRequests.map((request) => (
                <div key={request.requesterId} className="list-item friend-request-item">
                  <div className="item-info friend-request-info">
                    <p className="friend-request-item-text text-base font-semibold font-pretendard text-primary">
                      {request.name}님이 친구신청을 보냈어요.
                    </p>
                    <p className="friend-request-timestamp item-timestamp text-sm font-pretendard">
                      {request.timestamp ? new Date(request.timestamp).toLocaleString('ko-KR') : ''}
                    </p>
                  </div>
                  <div className="friend-request-buttons">
                    <Button 
                      variant="outline"
                      size="md"
                      className="friend-accept-button"
                      onClick={() => handleAccept(request.requesterId, request.name)}
                    >
                      수락
                    </Button>
                    <Button 
                      variant="outline"
                      size="md"
                      className="friend-reject-button"
                      onClick={() => handleReject(request.requesterId, request.name)}
                    >
                      거절
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="friend-request-empty">
                <p>새로운 친구 신청이 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FriendRequest;