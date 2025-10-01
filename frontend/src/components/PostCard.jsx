// PostCard.jsx

export default function PostCard({ post }) {
    return (
        <div className="post-card">
            <div className="post-header">
                <span className="post-category">{post.category}</span>
                <span style={{ fontSize: '16px' }}>😊</span>
            </div>

            <h3 className="post-title">{post.title}</h3>

            <p className="post-description">{post.description}</p>

            <image className="post-image">{post.image}</image>

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
        </div>
    );
}
