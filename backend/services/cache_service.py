import json
from upstash_redis import Redis
from config import settings
from typing import Optional, Any

# Initialize Redis client
redis = None
if settings.UPSTASH_REDIS_REST_URL and settings.UPSTASH_REDIS_REST_TOKEN:
    redis = Redis(url=settings.UPSTASH_REDIS_REST_URL, token=settings.UPSTASH_REDIS_REST_TOKEN)

def get_cached(key: str) -> Optional[Any]:
    if not redis: return None
    try:
        data = redis.get(key)
        if data:
            return json.loads(data)
    except Exception as e:
        print(f"Cache get error: {e}")
    return None

def set_cached(key: str, value: Any, expire_seconds: int = 300):
    if not redis: return
    try:
        redis.set(key, json.dumps(value), ex=expire_seconds)
    except Exception as e:
        print(f"Cache set error: {e}")

def invalidate_cache(key: str):
    if not redis: return
    try:
        redis.delete(key)
    except Exception as e:
        print(f"Cache invalidate error: {e}")

def invalidate_user_cache(user_id: str):
    """Convenience to clear user-specific data."""
    if not redis: return
    try:
        # We can use patterns if needed, but for now we'll just clear main keys
        redis.delete(f"summary_{user_id}")
        redis.delete(f"health_{user_id}")
    except Exception as e:
        print(f"Cache sweep error: {e}")
