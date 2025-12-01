import asyncio
from app.db import db

async def check():
    await db.connect()
    
    # 매트릭스 관련 영화 찾기
    movies = await db.movies.find_many(
        where={
            'OR': [
                {'title': {'contains': '매트릭스'}},
                {'title': {'contains': 'Matrix'}},
                {'original_title': {'contains': 'Matrix'}}
            ]
        }
    )
    
    print(f'\n매트릭스 관련 영화: {len(movies)}개')
    for m in movies:
        print(f'ID: {m.id}, Title: {m.title}, Original: {m.original_title}, Release: {m.release_date}')
    
    # 매트릭스 관련 포스트 찾기
    if movies:
        movie_ids = [int(m.id) for m in movies]
        posts = await db.posts.find_many(
            where={'movie_id': {'in': movie_ids}},
            include={'user': True, 'movie': True}
        )
        print(f'\n매트릭스 관련 포스트: {len(posts)}개')
        for p in posts:
            print(f'Post ID: {p.post_id}, Movie ID: {p.movie_id}, User: {p.user.nickname if p.user else "Unknown"}, Title: {p.title}')
    
    await db.disconnect()

asyncio.run(check())
