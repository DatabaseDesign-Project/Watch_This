import React, { useState } from 'react';
import '../index.css';
import { MobileStatusBar } from '../components/MobileStatusBar';
import { Button } from '../components/Button';

const FriendRequest = ({ onBack }) => {
  const [friendRequests, setFriendRequests] = useState([
    {
      id: 1,
      name: '민수',
      timestamp: '2025.09.19 11:00'
    },
    {
      id: 2,
      name: '혜령',
      timestamp: '2025.09.19 11:00'
    },
    {
      id: 3,
      name: '종하',
      timestamp: '2025.09.19 11:00'
    }
  ]);

  const handleAccept = (id, name) => {
    console.log(`${name}님의 친구 신청 수락`);
    // 친구 수락 API 호출
    setFriendRequests(friendRequests.filter(request => request.id !== id));
  };

  const handleReject = (id, name) => {
    console.log(`${name}님의 친구 신청 거절`);
    // 친구 거절 API 호출
    setFriendRequests(friendRequests.filter(request => request.id !== id));
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
                <div key={request.id} className="list-item friend-request-item">
                  <div className="item-info friend-request-info">
                    <p className="friend-request-item-text text-base font-semibold font-pretendard text-primary">
                      {request.name}님이 친구신청을 보냈어요.
                    </p>
                    <p className="friend-request-timestamp item-timestamp text-sm font-pretendard">
                      {request.timestamp}
                    </p>
                  </div>
                  <div className="friend-request-buttons">
                    <Button 
                      variant="outline"
                      size="md"
                      className="friend-accept-button"
                      onClick={() => handleAccept(request.id, request.name)}
                    >
                      수락
                    </Button>
                    <Button 
                      variant="outline"
                      size="md"
                      className="friend-reject-button"
                      onClick={() => handleReject(request.id, request.name)}
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