// /pages/Home.jsx

import { useState } from 'react';
import '../index.css';
import { MobileStatusBar } from '../components/MobileStatusBar';
import Header from '../components/Header';
import PostCard from '../components/PostCard';
import BottomNavigation from '../components/BottomNavigation';
import FloatingActionButton from '../components/FloatingActionButton';
import MovieSearch from '../components/MovieSearch';
import PostWriting from '../components/PostWriting';

export default function App() {
    const [currentView, setCurrentView] = useState('feed'); // 'feed' | 'movieSearch' | 'postWriting'
    const [activeTab, setActiveTab] = useState('home');
    const [selectedMovie, setSelectedMovie] = useState(null);

    // 목업 데이터
    const posts = [
        {
            id: 1,
            category: '닉네임',
            title: '이게뭐야',
            description:
                '아직 2편 나오지도 않았는데... 벌써 2편 기대되는... 벌써 2편 기대되는... 벌써 2편 기대되는...',
            image: 'https://images.unsplash.com/photo-1684900645515-2f5a6a6b40f1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3ZpZSUyMHBvc3RlciUyMGRhcmslMjBncmFkaWVudHxlbnwxfHx8fDE3NTkyODgxNzh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
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
        setSelectedMovie(null);
    };

    // ✅ 추가: MovieCard 클릭 시 호출되어 PostWriting으로 전환
    const handleMovieSelect = (movie) => {
        setSelectedMovie(movie);
        setCurrentView('postWriting');
    };

    // ✅ 추가: PostWriting에서 뒤로가기 → 영화 검색으로
    const handleBackToSearch = () => {
        setCurrentView('movieSearch');
    };

    // ✅ 추가: PostWriting 제출 완료 → 피드로 이동 (필요 시 서버 전송 로직 연결)
    const handleSubmitPost = (postData) => {
        console.log('작성된 포스트 데이터:', postData);
        setCurrentView('feed');
        setSelectedMovie(null);
    };

    return (
        <div className="fullscreen">
            <div className="mobile-container">
                <MobileStatusBar />

                {currentView === 'feed' && (
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
                )}

                {currentView === 'movieSearch' && (
                    <MovieSearch
                        onBack={handleBackToFeed}
                        onMovieSelect={handleMovieSelect}
                    />
                )}

                {currentView === 'postWriting' && selectedMovie && (
                    <PostWriting
                        movie={selectedMovie}
                        onBack={handleBackToSearch}
                        onSubmit={handleSubmitPost}
                    />
                )}
            </div>
        </div>
    );
}
