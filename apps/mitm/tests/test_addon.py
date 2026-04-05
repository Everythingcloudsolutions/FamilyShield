"""
FamilyShield mitmproxy Addon — Unit Tests
==========================================
Tests URL pattern matching for all supported platforms.
No Redis or network calls — all mocked.
"""

import json
from unittest.mock import MagicMock, patch

import pytest

# Mock Redis before importing addon
with patch("redis.from_url", return_value=MagicMock()):
    from familyshield_addon import ContentEvent, FamilyShieldAddon, PLATFORM_PATTERNS


# ── Helpers ───────────────────────────────────────────────────────────────────
def make_flow(url: str, device_ip: str = "192.168.1.100"):
    """Create a mock mitmproxy flow object."""
    from urllib.parse import urlparse
    parsed = urlparse(url)

    flow = MagicMock()
    flow.request.pretty_url = url
    flow.request.pretty_host = parsed.hostname or ""
    flow.request.path = parsed.path + ("?" + parsed.query if parsed.query else "")
    flow.client_conn.peername = (device_ip, 12345)
    flow.response.status_code = 200
    return flow


# ── YouTube tests ─────────────────────────────────────────────────────────────
class TestYouTube:
    def test_standard_watch_url(self):
        addon = FamilyShieldAddon()
        events = []
        with patch.object(addon, "_push_event", side_effect=events.append):
            addon.response(make_flow("https://www.youtube.com/watch?v=dQw4w9WgXcQ"))
        assert len(events) == 1
        assert events[0].platform == "youtube"
        assert events[0].content_type == "video"
        assert events[0].content_id == "dQw4w9WgXcQ"

    def test_youtube_shorts_url(self):
        addon = FamilyShieldAddon()
        events = []
        with patch.object(addon, "_push_event", side_effect=events.append):
            addon.response(make_flow("https://www.youtube.com/shorts/abc123xyz45"))
        assert len(events) == 1
        assert events[0].content_type == "short"
        assert events[0].content_id == "abc123xyz45"

    def test_watch_url_with_extra_params(self):
        addon = FamilyShieldAddon()
        events = []
        with patch.object(addon, "_push_event", side_effect=events.append):
            addon.response(make_flow(
                "https://www.youtube.com/watch?list=PLxxx&v=dQw4w9WgXcQ&t=30s"
            ))
        assert events[0].content_id == "dQw4w9WgXcQ"

    def test_non_youtube_url_ignored(self):
        addon = FamilyShieldAddon()
        events = []
        with patch.object(addon, "_push_event", side_effect=events.append):
            addon.response(make_flow("https://www.google.com/search?q=youtube"))
        assert len(events) == 0


# ── Roblox tests ──────────────────────────────────────────────────────────────
class TestRoblox:
    def test_game_page_url(self):
        addon = FamilyShieldAddon()
        events = []
        with patch.object(addon, "_push_event", side_effect=events.append):
            addon.response(make_flow("https://www.roblox.com/games/1234567890/Adopt-Me"))
        assert events[0].platform == "roblox"
        assert events[0].content_type == "game"
        assert events[0].content_id == "1234567890"

    def test_roblox_api_with_placeid(self):
        addon = FamilyShieldAddon()
        events = []
        with patch.object(addon, "_push_event", side_effect=events.append):
            addon.response(make_flow(
                "https://www.roblox.com/login?placeId=9876543210&redirectUrl=/"
            ))
        assert events[0].content_id == "9876543210"


# ── Discord tests ─────────────────────────────────────────────────────────────
class TestDiscord:
    def test_guild_api_call(self):
        addon = FamilyShieldAddon()
        events = []
        with patch.object(addon, "_push_event", side_effect=events.append):
            addon.response(make_flow(
                "https://discord.com/api/v10/guilds/123456789012345678"
            ))
        assert events[0].platform == "discord"
        assert events[0].content_type == "guild"
        assert events[0].content_id == "123456789012345678"

    def test_channel_message_api(self):
        addon = FamilyShieldAddon()
        events = []
        with patch.object(addon, "_push_event", side_effect=events.append):
            addon.response(make_flow(
                "https://discord.com/api/v10/channels/987654321098765432/messages"
            ))
        assert events[0].content_type == "channel"
        assert events[0].content_id == "987654321098765432"


# ── Twitch tests ──────────────────────────────────────────────────────────────
class TestTwitch:
    def test_stream_page(self):
        addon = FamilyShieldAddon()
        events = []
        with patch.object(addon, "_push_event", side_effect=events.append):
            addon.response(make_flow("https://www.twitch.tv/ninja"))
        assert events[0].platform == "twitch"
        assert events[0].content_type == "stream"
        assert events[0].content_id == "ninja"

    def test_twitch_directory_ignored(self):
        """Twitch directory pages should not generate events."""
        addon = FamilyShieldAddon()
        events = []
        with patch.object(addon, "_push_event", side_effect=events.append):
            addon.response(make_flow("https://www.twitch.tv/directory/game/Fortnite"))
        # Directory pages should not match the stream pattern
        # (pattern excludes /directory/ paths)
        assert len(events) == 0


# ── Device IP capture ─────────────────────────────────────────────────────────
class TestDeviceTracking:
    def test_device_ip_captured(self):
        addon = FamilyShieldAddon()
        events = []
        with patch.object(addon, "_push_event", side_effect=events.append):
            addon.response(make_flow(
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                device_ip="10.0.0.50"
            ))
        assert events[0].device_ip == "10.0.0.50"


# ── Ignored hosts ─────────────────────────────────────────────────────────────
class TestIgnoredHosts:
    def test_apple_services_ignored(self):
        addon = FamilyShieldAddon()
        events = []
        with patch.object(addon, "_push_event", side_effect=events.append):
            addon.response(make_flow("https://apps.apple.com/ca/app/youtube/id544007664"))
        assert len(events) == 0

    def test_google_apis_ignored(self):
        addon = FamilyShieldAddon()
        events = []
        with patch.object(addon, "_push_event", side_effect=events.append):
            addon.response(make_flow("https://www.googleapis.com/youtube/v3/videos"))
        # googleapis.com is in IGNORE_HOSTS
        assert len(events) == 0


# ── Error resilience ──────────────────────────────────────────────────────────
class TestErrorHandling:
    def test_redis_failure_does_not_crash(self):
        """If Redis is down, the addon should log and continue — not crash."""
        import redis as redis_module
        addon = FamilyShieldAddon()
        with patch("familyshield_addon.get_redis") as mock_redis:
            mock_redis.return_value.lpush.side_effect = redis_module.RedisError("Connection refused")
            # Should not raise
            addon.response(make_flow("https://www.youtube.com/watch?v=dQw4w9WgXcQ"))

    def test_malformed_flow_does_not_crash(self):
        """Malformed flow objects should be handled gracefully."""
        addon = FamilyShieldAddon()
        flow = MagicMock()
        flow.request.pretty_url = None  # Simulate bad data
        flow.request.pretty_host = None
        # Should not raise
        addon.response(flow)
