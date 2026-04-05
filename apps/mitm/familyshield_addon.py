"""
FamilyShield mitmproxy Addon
============================
Extracts structured content events from intercepted HTTPS traffic.
Pushes events to Redis queue for enrichment by the API worker.

Platforms supported:
  - YouTube / YouTube Shorts  → video_id
  - Roblox                    → game_place_id
  - Discord                   → guild_id, channel_id
  - Twitch                    → channel_name
  - Instagram                 → reel_id (browser only — app uses cert pinning)
  - TikTok                    → blocked / DNS only

Author: FamilyShield / Everythingcloudsolutions
Year:   2026
"""

import json
import logging
import os
import re
import time
from dataclasses import asdict, dataclass
from typing import Optional

import redis
from mitmproxy import http

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [FamilyShield] %(levelname)s %(message)s",
)
log = logging.getLogger("familyshield")

# ── Redis connection ──────────────────────────────────────────────────────────
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
QUEUE_KEY = "familyshield:content_events"
ENVIRONMENT = os.getenv("ENVIRONMENT", "dev")

_redis: Optional[redis.Redis] = None


def get_redis() -> redis.Redis:
    global _redis
    if _redis is None:
        _redis = redis.from_url(REDIS_URL, decode_responses=True)
    return _redis


# ── Event data model ──────────────────────────────────────────────────────────
@dataclass
class ContentEvent:
    platform: str          # youtube | roblox | discord | twitch | instagram
    content_type: str      # video | short | game | guild | channel | stream | reel
    content_id: str        # The extracted ID (video ID, game ID, etc.)
    device_ip: str         # Source device IP — used to look up child profile
    url: str               # Full URL (for debugging)
    timestamp: float       # Unix timestamp
    environment: str       # dev | staging | prod
    raw_path: str = ""     # URL path for debugging

    def to_json(self) -> str:
        return json.dumps(asdict(self))


# ── URL patterns per platform ─────────────────────────────────────────────────
#
# Each entry: (compiled_regex, content_type, group_index_for_id)
# Patterns are matched against the full URL.
#
PLATFORM_PATTERNS: dict[str, list[tuple]] = {
    "youtube": [
        # Standard watch URL: youtube.com/watch?v=VIDEO_ID
        (re.compile(r"youtube\.com/watch\?(?:.*&)?v=([\w-]{11})"), "video", 1),
        # YouTube Shorts: youtube.com/shorts/VIDEO_ID
        (re.compile(r"youtube\.com/shorts/([\w-]{11})"), "short", 1),
        # YouTube API calls from the app (mobile)
        (re.compile(r"youtubei\.googleapis\.com/.*videoId%3D([\w-]{11})"), "video", 1),
        # Shorts feed API
        (re.compile(r"youtubei\.googleapis\.com/.*shorts.*videoId[%3D:\"']+?([\w-]{11})"), "short", 1),
    ],
    "roblox": [
        # Game page: roblox.com/games/PLACE_ID
        (re.compile(r"roblox\.com/games/(\d{6,})"), "game", 1),
        # API call with placeId parameter
        (re.compile(r"roblox\.com/.*[?&]placeId=(\d{6,})"), "game", 1),
        # Game join API
        (re.compile(r"roblox\.com/.*joinscript.*placeId=(\d{6,})"), "game", 1),
    ],
    "discord": [
        # Channel API: discord.com/api/vN/channels/CHANNEL_ID
        (re.compile(r"discord\.com/api/v\d+/channels/(\d{15,})"), "channel", 1),
        # Guild API: discord.com/api/vN/guilds/GUILD_ID
        (re.compile(r"discord\.com/api/v\d+/guilds/(\d{15,})"), "guild", 1),
        # Message send (captures channel context)
        (re.compile(r"discord\.com/api/v\d+/channels/(\d{15,})/messages"), "channel", 1),
    ],
    "twitch": [
        # Stream page: twitch.tv/CHANNEL_NAME
        (re.compile(r"twitch\.tv/([a-zA-Z0-9_]{4,25})(?:/|$)(?!directory|clips|videos)"), "stream", 1),
        # Twitch GQL API (used by app)
        (re.compile(r"gql\.twitch\.tv.*\"login\":\"([a-zA-Z0-9_]{4,25})\""), "stream", 1),
    ],
    "instagram": [
        # Reel URL (browser only — app uses cert pinning)
        (re.compile(r"instagram\.com/reels?/([A-Za-z0-9_-]{10,})"), "reel", 1),
        # Post URL
        (re.compile(r"instagram\.com/p/([A-Za-z0-9_-]{10,})"), "post", 1),
    ],
}

# Hosts to skip entirely (cert-pinned / OS services / not relevant)
IGNORE_HOSTS = {
    "apple.com", "icloud.com", "apple-cloudkit.com",
    "googleapis.com", "gstatic.com",
    "microsoft.com", "windows.com", "windowsupdate.com",
    "ocsp.digicert.com", "ocsp.sectigo.com",
    "familyshield-dev.everythingcloud.ca",
    "familyshield-staging.everythingcloud.ca",
    "familyshield.everythingcloud.ca",
}


# ── Main addon class ──────────────────────────────────────────────────────────
class FamilyShieldAddon:
    """mitmproxy addon that extracts content events and queues them for processing."""

    def __init__(self):
        log.info("FamilyShield addon loaded — environment: %s", ENVIRONMENT)
        log.info("Redis queue: %s → %s", REDIS_URL, QUEUE_KEY)
        self._event_count = 0

    def response(self, flow: http.HTTPFlow) -> None:
        """Called for every intercepted response."""
        try:
            self._process_flow(flow)
        except Exception as exc:
            log.warning("Error processing flow %s: %s", flow.request.pretty_url, exc)

    def _process_flow(self, flow: http.HTTPFlow) -> None:
        host = flow.request.pretty_host
        url = flow.request.pretty_url
        path = flow.request.path
        device_ip = flow.client_conn.peername[0] if flow.client_conn.peername else "unknown"

        # Skip ignored hosts
        if any(host.endswith(ignored) for ignored in IGNORE_HOSTS):
            return

        # Only process 200 OK responses (skip errors, redirects, etc.)
        if flow.response and flow.response.status_code not in (200, 204):
            return

        # Try each platform
        for platform, patterns in PLATFORM_PATTERNS.items():
            if not self._host_matches_platform(host, platform):
                continue

            for pattern, content_type, group_idx in patterns:
                match = pattern.search(url)
                if not match:
                    # Also try path only (more efficient)
                    match = pattern.search(path)

                if match:
                    content_id = match.group(group_idx)
                    event = ContentEvent(
                        platform=platform,
                        content_type=content_type,
                        content_id=content_id,
                        device_ip=device_ip,
                        url=url,
                        timestamp=time.time(),
                        environment=ENVIRONMENT,
                        raw_path=path,
                    )
                    self._push_event(event)
                    break  # One event per request max

    def _host_matches_platform(self, host: str, platform: str) -> bool:
        """Fast host-based pre-filter before running regex."""
        platform_hosts = {
            "youtube":   ["youtube.com", "youtu.be", "youtubei.googleapis.com", "googlevideo.com"],
            "roblox":    ["roblox.com", "rbxcdn.com"],
            "discord":   ["discord.com", "discord.gg", "discordapp.com"],
            "twitch":    ["twitch.tv", "twitchapps.com", "gql.twitch.tv"],
            "instagram": ["instagram.com", "cdninstagram.com"],
        }
        return any(host.endswith(h) for h in platform_hosts.get(platform, []))

    def _push_event(self, event: ContentEvent) -> None:
        """Push event to Redis queue. Non-blocking — drops silently on Redis failure."""
        try:
            r = get_redis()
            r.lpush(QUEUE_KEY, event.to_json())
            self._event_count += 1

            if self._event_count % 10 == 0:
                log.info(
                    "Events queued: %d | Latest: %s/%s id=%s device=%s",
                    self._event_count,
                    event.platform,
                    event.content_type,
                    event.content_id,
                    event.device_ip,
                )
            else:
                log.debug(
                    "Event: %s/%s id=%s device=%s",
                    event.platform,
                    event.content_type,
                    event.content_id,
                    event.device_ip,
                )
        except redis.RedisError as e:
            log.warning("Redis push failed (event dropped): %s", e)


# ── mitmproxy entrypoint ──────────────────────────────────────────────────────
addons = [FamilyShieldAddon()]
