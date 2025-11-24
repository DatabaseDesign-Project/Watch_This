import { useState, useEffect } from 'react';
import PostCard from './PostCard';
import PostDetail from './PostDetail';
import { getMyPosts } from '../api';

/**
 * 포스트 목록과 상세 조회를 통합한 컴포넌트
 * Home.jsx 등에서 사용할 수 있습니다.
 */
export default function PostListWithDetail() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPostId, setSelectedPostId] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'

    // 포스트 목록 로드
    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        try {
            setLoading(true);
            const data = await getMyPosts();
            setPosts(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Failed to load posts:', e);
        } finally {
            setLoading(false);
        }
    };

    // 포스트 클릭 핸들러
    const handlePostClick = (post) => {
        setSelectedPostId(post.id || post.post_id);
        setViewMode('detail');
    };

    // 뒤로 가기 핸들러
    const handleBack = () => {
        setViewMode('list');
        setSelectedPostId(null);
    };

    // 상세 보기 모드
    if (viewMode === 'detail' && selectedPostId) {
        return (
            <PostDetail 
                postId={selectedPostId}
                onBack={handleBack}
            />
        );
    }

    // 목록 보기 모드
    return (
        <div className="post-list-container">
            <div className="search-header">
                <h2 className="search-title">내 포스트</h2>
            </div>

            <div style={{ padding: '16px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        불러오는 중...
                    </div>
                ) : posts.length > 0 ? (
                    posts.map((post) => (
                                <PostCard
                                    key={post.post_id || post.id}
                                    post={{
                                        id: post.post_id || post.id,
                                        author: post.user?.nickname || '익명',
                                        title: post.title || '',
                                        preview: (post.answers || []).map(a => a.answer).join('\n'),
                                        image: (post.questionMedias && post.questionMedias[0]) 
                                            ? post.questionMedias[0].file_path 
                                            : null,
                                        likes: post.like_cnt || 0,
                                        comments: (post.comments || []).length || 0,
                                        createdAt: post.created_at,
                                        // include liked flag from backend (support both names)
                                        liked: post.liked || post.is_liked || false,
                                    }}
                                    onClick={handlePostClick}
                                />
                    ))
                ) : (
                    <div style={{ textAlign: 'center', color: '#999', padding: '40px 20px' }}>
                        아직 작성한 포스트가 없습니다.
                    </div>
                )}
            </div>
        </div>
    );
}
