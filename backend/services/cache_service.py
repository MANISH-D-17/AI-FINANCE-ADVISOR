import json
from upstash_redis.asyncio import Redis
from config import settings
from typing import Optional, Any

# Initialize Redis client
redis = None
if settings.UPSTASH_REDIS_REST_URL and settings.UPSTASH_REDIS_REST_TOKEN:
    redis = Redis(url=settings.UPSTASH_REDIS_REST_URL, token=settings.UPSTASH_REDIS_REST_TOKEN)

async def get_cached(key: str) -> Optional[Any]:
    if not redis: return None
    try:
        data = await redis.get(key)
        if data:
            return json.loads(data)
    except Exception as e:
        print(f"Cache get error: {e}")
    return None

async def set_cached(key: str, value: Any, expire_seconds: int = 300):
    if not redis: return
    try:
        await redis.set(key, json.dumps(value), ex=expire_seconds)
    except Exception as e:
        print(f"Cache set error: {e}")

async def invalidate_cache(key: str):
    if not redis: return
    try:
        await redis.delete(key)
    except Exception as e:
        print(f"Cache invalidate error: {e}")

async def invalidate_user_cache(user_id: str):
    """Convenience to clear user-specific data."""
    if not redis: return
    try:
        # Clear main keys
        await redis.delete(f"summary_{user_id}")
        await redis.delete(f"health_{user_id}")
    except Exception as e:
        print(f"Cache sweep error: {e}")
