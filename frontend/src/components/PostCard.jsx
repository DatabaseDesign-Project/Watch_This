// PostCard.jsx

export default function PostCard({ post, minimal = false }) {
    return (
        <div className="post-card">
            {!minimal && (
                <div className="post-header" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                    <span className="post-category">{post.category}</span>
                    {post.emoji ? (
                        <span style={{ fontSize: 18 }}>{post.emoji}</span>
                    ) : (
                        <span style={{ fontSize: 16 }}>😊</span>
                    )}
                </div>
            )}

            {post.title && <h3 className="post-title">{post.title}</h3>}

            {post.description && (
                <p className="post-description">{post.description}</p>
            )}

            {post.image && (
                // use proper img tag
                <img className="post-image" src={post.image} alt="post media" />
            )}

            {!minimal && (
                <div className="post-actions">
                    <div className="post-action">
                        <span>♡</span>
                        <span>{post.likes}</span>
                    </div>
                    <div className="post-action">
                        <span>💬</span>
                        <span>{post.comments}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
