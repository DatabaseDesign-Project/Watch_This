// /pages/Home.jsx

import { useState } from 'react';
import '../index.css';
import { MobileStatusBar } from '../components/MobileStatusBar';
import Header from '../components/Header';
import PostCard from '../components/PostCard';
import BottomNavigation from '../components/BottomNavigation';
import FloatingActionButton from '../components/FloatingActionButton';
import MovieSearch from '../components/MovieSearch';

export default function App() {
    const [currentView, setCurrentView] = useState('feed');
    const [activeTab, setActiveTab] = useState('home');

    // 목업 데이터
    const posts = [
        {
            id: 1,
            category: '닉네임',
            title: '이게뭐야',
            description:
                '아직 2편 나오지도 않았는데... 벌써 2편 기대되는... 벌써 2편 기대되는... 벌써 2편 기대되는...',
            image: 'https://images.unsplash.com/photo-1684900645515-2f5a6a6b40f1?crop=entropy&cs=tinysrgb&',
            likes: 1,
            comments: 1,
        },
        {
            id: 2,
            category: '닉네임',
            title: '인사이드 아웃 2',
            description:
                '아직 2편 나오지도 않았는데... 벌써 2편 기대되는... 벌써 2편 기대되는... 벌써 2편 기대되는...',
            image: 'https://images.unsplash.com/photo-1733794468538-467f5529154a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg',
            likes: 1,
            comments: 1,
        },
        {
            id: 3,
            category: '닉네임',
            title: '영화제목',
            description:
                '아직 2편 나오지도 않았는데... 벌써 2편 기대되는... 벌써 2편 기대되는...',
            likes: 1,
            comments: 1,
        },
    ];

    const handleFabClick = () => {
        setCurrentView('movieSearch');
    };

    const handleBackToFeed = () => {
        setCurrentView('feed');
    };

    return (
        <div className="fullscreen">
            <div className="mobile-container">
                <MobileStatusBar />

                {currentView === 'feed' ? (
                    <>
                        <Header title="이거 봤어?" />

                        <div className="main-content">
                            {posts.map((post) => (
                                <PostCard key={post.id} post={post} />
                            ))}
                        </div>

                        <FloatingActionButton onClick={handleFabClick} />
                        <BottomNavigation
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                        />
                    </>
                ) : (
                    <MovieSearch onBack={handleBackToFeed} />
                )}
            </div>
        </div>
    );
}
