import asyncio
import httpx
import os

TMDB = os.environ.get("TMDB_BASE_URL", "https://api.themoviedb.org/3")
TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "")

async def find_movie():
    # 영화 "1" 검색
    url = f"{TMDB}/search/movie"
    params = {
        "api_key": TMDB_API_KEY,
        "query": "1",
        "language": "ko-KR",
        "include_adult": "false",
        "page": "1"
    }
    
    async with httpx.AsyncClient(timeout=10) as c:
        resp = await c.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
    
    results = data.get("results", [])
    print(f"\n검색 결과: {len(results)}개")
    
    # 2009년 11월 5일 개봉 영화 찾기
    for movie in results[:10]:
        release = movie.get("release_date", "")
        if "2009-11-05" in release:
            print(f"\n찾음!")
            print(f"TMDB ID: {movie.get('id')}")
            print(f"Title: {movie.get('title')}")
            print(f"Original Title: {movie.get('original_title')}")
            print(f"Release Date: {release}")
            
            # 상세 정보 가져오기
            detail_url = f"{TMDB}/movie/{movie.get('id')}"
            detail_params = {
                "api_key": TMDB_API_KEY,
                "append_to_response": "credits",
                "language": "ko-KR"
            }
            
            async with httpx.AsyncClient(timeout=10) as c:
                detail_resp = await c.get(detail_url, params=detail_params)
                detail_resp.raise_for_status()
                detail_data = detail_resp.json()
            
            director = None
            for crew in detail_data.get("credits", {}).get("crew", []):
                if crew.get("job") == "Director":
                    director = crew.get("name")
                    break
            
            print(f"Director: {director}")
            return movie.get('id')
    
    print("\n2009-11-05 개봉 영화를 찾지 못했습니다.")
    return None

asyncio.run(find_movie())
