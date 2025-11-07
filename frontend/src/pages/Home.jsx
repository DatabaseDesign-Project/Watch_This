// /pages/Home.jsx
import { useState, useEffect } from 'react';
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
    const [posts, setPosts] = useState([]);
    // minimal mode: ?minimal=1 will show only posts (no header/nav)
    const urlParams = new URLSearchParams(window.location.search);
    const minimal = urlParams.get('minimal') === '1';

    // fetch feed helper so it can be called from multiple places
    const fetchFeed = async () => {
        try {
            const uid = localStorage.getItem('user_id') || '1';
            const res = await fetch('/api/v1/posts/feed', {
                headers: { 'X-User-Id': uid },
            });
            if (!res.ok) {
                console.error('feed fetch failed', res.status);
                return;
            }
            const data = await res.json();
            const mapped = (data || []).map((p) => ({
                id: p.post_id,
                category: p.user?.nickname || '익명',
                title: p.title || '',
                description: (p.answers || []).map((a) => a.answer).join('\n'),
                image: (p.questionMedias && p.questionMedias[0]) ? p.questionMedias[0].file_path : null,
                likes: p.like_cnt || 0,
                comments: (p.comments || []).length || 0,
                emoji: p.emoji?.emoji_image || null,
            }));
            setPosts(mapped);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (currentView === 'feed') fetchFeed();
    }, [currentView]);

    // posts are loaded from backend into state; if empty nothing shown

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
    const handleSubmitPost = async (postResponse) => {
        // postResponse is the JSON from server after creating a post
        console.log('포스트 작성 응답:', postResponse);
        setCurrentView('feed');
        setSelectedMovie(null);
        // refresh feed
        await fetchFeed();
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
                                <PostCard key={post.id} post={post} minimal={minimal} />
                            ))}
                        </div>

                        {!minimal && (
                            <>
                                <FloatingActionButton onClick={handleFabClick} />
                                <BottomNavigation
                                    activeTab={activeTab}
                                    onTabChange={setActiveTab}
                                />
                            </>
                        )}
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
