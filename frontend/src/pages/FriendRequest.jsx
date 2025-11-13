import React, { useState } from 'react';
import '../index.css';
import { MobileStatusBar } from '../components/MobileStatusBar';

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

        <div className="friend-request-container">
          {/* 상단 헤더 */}
          <header className="friend-request-header">
            <button className="back-button" onClick={handleBack}>
              <svg className="back-icon" viewBox="0 0 29 29" fill="none">
                <path 
                  d="M18.125 21.75L10.875 14.5L18.125 7.25" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <h1 className="friend-request-title">친구 신청 목록</h1>
          </header>

          {/* 친구 신청 목록 */}
          <div className="friend-request-list">
            {friendRequests.length > 0 ? (
              friendRequests.map((request) => (
                <div key={request.id} className="friend-request-item">
                  <div className="friend-request-info">
                    <p className="friend-request-item-text">
                      {request.name}님이 친구신청을 보냈어요.
                    </p>
                    <p className="friend-request-timestamp">
                      {request.timestamp}
                    </p>
                  </div>
                  <div className="friend-request-buttons">
                    <button 
                      className="friend-accept-button"
                      onClick={() => handleAccept(request.id, request.name)}
                    >
                      수락
                    </button>
                    <button 
                      className="friend-reject-button"
                      onClick={() => handleReject(request.id, request.name)}
                    >
                      거절
                    </button>
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