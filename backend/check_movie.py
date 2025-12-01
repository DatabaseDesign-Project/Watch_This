import asyncio
from app.db import db

async def check():
    await db.connect()
    
    # 감독 이름으로 영화 찾기
    from datetime import datetime
    movies = await db.movies.find_many(
        where={
            'OR': [
                {'director': {'contains': 'Sparrow'}},
                {'release_date': {'gte': datetime(2009, 11, 1), 'lte': datetime(2009, 11, 30)}}
            ]
        }
    )
    
    print(f'\n찾은 영화: {len(movies)}개')
    for m in movies:
        print(f'\nID: {m.id}')
        print(f'Title: {m.title}')
        print(f'Original: {m.original_title}')
        print(f'Director: {m.director}')
        print(f'Release: {m.release_date}')
        print(f'Poster: {m.poster_image}')
        
        # 해당 영화의 포스트 찾기
        posts = await db.posts.find_many(
            where={'movie_id': int(m.id)},
            include={'user': True}
        )
        print(f'포스트 개수: {len(posts)}')
        for p in posts:
            print(f'  - Post ID: {p.post_id}, User: {p.user.nickname if p.user else "Unknown"}, Title: {p.title}, Visibility: {p.visibility}')
    
    await db.disconnect()

asyncio.run(check())
