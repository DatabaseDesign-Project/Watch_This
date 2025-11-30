// /pages/Home.jsx
import { useState, useEffect } from 'react';
import '../../index.css';
import { MobileStatusBar } from '../../components/MobileStatusBar';
import Header from '../../components/Header';
import PostCard from '../../components/PostCard';
import BottomNavigation from '../../components/BottomNavigation';
import FloatingActionButton from '../../components/FloatingActionButton';
import MovieSearch from '../../components/MovieSearch';
import PostWriting from '../../components/PostWriting';
import PostDetail from '../../components/PostDetail'; // [추가]

export default function App() {
    const [currentView, setCurrentView] = useState('feed'); // 'feed' | 'movieSearch' | 'postWriting' | 'postDetail'
    const [activeTab, setActiveTab] = useState('home');
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [selectedPostId, setSelectedPostId] = useState(null); // [추가] 선택된 포스트 ID
    const [posts, setPosts] = useState([]);
    
    const urlParams = new URLSearchParams(window.location.search);
    const minimal = urlParams.get('minimal') === '1';

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
            console.log('Feed data:', data); // 디버깅을 위한 로그
            const mapped = (data || []).map((p) => {
                // 영화 포스터 처리
                let posterImage = null;
                if (p.movie?.poster_image) {
                    posterImage = p.movie.poster_image;
                } else if (p.questionMedias && p.questionMedias[0]) {
                    posterImage = p.questionMedias[0].file_path;
                }

                return {
                    id: p.post_id,
                    category: p.user?.nickname || '익명',
                    title: p.title || '',
                    description: (p.answers || []).map((a) => a.answer).join('\n'),
                    image: posterImage,
                    likes: p.like_cnt || 0,
                    comments: (p.comments || []).length || 0,
                    liked: p.liked || p.is_liked || false,
                    emoji: p.emoji?.emoji_image || null,
                };
            });
            setPosts(mapped);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (currentView === 'feed') fetchFeed();
    }, [currentView]);

    const handleFabClick = () => {
        setCurrentView('movieSearch');
    };

    const handleBackToFeed = () => {
        setCurrentView('feed');
        setSelectedMovie(null);
        setSelectedPostId(null);
    };

    // [추가] 포스트 클릭 시 상세 페이지로 이동
    const handlePostClick = (post) => {
        setSelectedPostId(post.id);
        setCurrentView('postDetail');
    };

    const handleMovieSelect = (movie) => {
        setSelectedMovie(movie);
        setCurrentView('postWriting');
    };

    const handleBackToSearch = () => {
        setCurrentView('movieSearch');
    };

    const handleSubmitPost = async (postResponse) => {
        console.log('포스트 작성 응답:', postResponse);
        setCurrentView('feed');
        setSelectedMovie(null);
        await fetchFeed();
    };

    return (
        <div className="fullscreen">
            <div className="mobile-container">
                <MobileStatusBar />

                {currentView === 'feed' && (
                    <>
                        <Header title="이거봤어" variant="search" />

                        <div className="content-container main-content scrollable-container" style={{
                            height: 'calc(100vh - 60px - 60px)', 
                            overflowY: 'auto',
                            paddingBottom: '20px'
                        }}>
                            {posts.map((post) => (
                                <PostCard 
                                    key={post.id} 
                                    post={post} 
                                    minimal={minimal} 
                                    onClick={handlePostClick} // [추가] 핸들러 전달
                                />
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

                {/* [추가] 상세 페이지 렌더링 */}
                {currentView === 'postDetail' && selectedPostId && (
                    <PostDetail
                        postId={selectedPostId}
                        onBack={handleBackToFeed}
                    />
                )}
            </div>
        </div>
    );
}
