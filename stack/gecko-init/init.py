#!/usr/bin/env python3
"""
Gecko stack initialiser.

Runs as a one-shot container after `docker compose up`. Configures root
folders, download clients, and inter-service connections via REST API.

Idempotent: safe to re-run; skips items that already exist.

Replaces ~500 lines of TypeScript in src/autoSetup.ts that previously did
the same job from the Electron host.
"""
import os
import sys
import time
import json
import requests
from urllib.parse import urlparse

# ── Service handles ──────────────────────────────────────────────────

SONARR = {"url": os.environ["SONARR_URL"], "key": os.environ["SONARR_API_KEY"]}
RADARR = {"url": os.environ["RADARR_URL"], "key": os.environ["RADARR_API_KEY"]}
LIDARR = {"url": os.environ["LIDARR_URL"], "key": os.environ["LIDARR_API_KEY"]}
PROWLARR = {"url": os.environ["PROWLARR_URL"], "key": os.environ["PROWLARR_API_KEY"]}
BAZARR = {"url": os.environ["BAZARR_URL"], "key": os.environ["BAZARR_API_KEY"]}
JELLYSEERR = {"url": os.environ["JELLYSEERR_URL"]}
JELLYFIN = {"url": os.environ["JELLYFIN_URL"]}
QBIT = {
    "host": os.environ["QBIT_HOST"],          # container name (gluetun if VPN, qbittorrent if not)
    "port": int(os.environ.get("QBIT_PORT", "8080")),
    "user": os.environ.get("QBIT_USER", "admin"),
    "pass": os.environ["QBIT_PASS"],
}

TV_PATH = os.environ.get("TV_PATH", "/tv")
MOVIES_PATH = os.environ.get("MOVIES_PATH", "/movies")
MUSIC_PATH = os.environ.get("MUSIC_PATH", "/music")

ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
SUBTITLE_LANGS = os.environ.get("SUBTITLE_LANGS", "es,en").split(",")

# Wizard codes are 2-letter (StepAdmin.tsx); Bazarr's language IDs are
# 3-letter (ISO 639-2/B). Keep this map in sync with the wizard choices
# AND with stack/seeds/build-bazarr-seed.mjs (each entry must have a
# seeded profile to match against).
LANG_2_TO_3 = {
    "ca": "cat", "es": "spa", "en": "eng",
    "fr": "fre", "de": "ger", "pt": "por",
    "it": "ita", "ja": "jpn",
}
# Display name used in seeded profile names. Stays in source-language form.
LANG_3_TO_DISPLAY = {
    "cat": "Català",
    "spa": "Castellano",
    "fre": "Français",
    "ger": "Deutsch",
    "por": "Português",
    "ita": "Italiano",
    "jpn": "日本語",
    "eng": "English",
}


# ── HTTP helpers ─────────────────────────────────────────────────────

def hdr_arr(svc):
    return {"X-Api-Key": svc["key"], "Content-Type": "application/json"}


def get_arr(svc, path, api_version="v3"):
    return requests.get(svc["url"] + "/api/" + api_version + path,
                        headers=hdr_arr(svc), timeout=20)


def post_arr(svc, path, payload, api_version="v3"):
    return requests.post(svc["url"] + "/api/" + api_version + path,
                         headers=hdr_arr(svc), json=payload, timeout=30)


def wait_ready(url, max_wait=180):
    deadline = time.time() + max_wait
    while time.time() < deadline:
        try:
            r = requests.get(url, timeout=5)
            if 200 <= r.status_code < 500:
                return True
        except requests.RequestException:
            pass
        time.sleep(3)
    return False


# ── Root folders ─────────────────────────────────────────────────────

def ensure_root_folder(svc, name, path, api_version="v3"):
    r = get_arr(svc, "/rootfolder", api_version)
    if r.ok and any(rf.get("path") == path for rf in r.json()):
        return f"[{name}] root {path}: exists"

    payload = {"path": path}
    # Lidarr v1's POST /rootfolder requires `name` and default profile IDs
    # (Sonarr v4 / Radarr v5 just need `path`).
    if api_version == "v1" and name.lower() == "lidarr":
        payload["name"] = name
        for pid_field, ep in [("defaultMetadataProfileId", "/metadataprofile"),
                              ("defaultQualityProfileId",  "/qualityprofile")]:
            pr = get_arr(svc, ep, api_version)
            payload[pid_field] = (pr.json()[0].get("id", 1)
                                  if pr.ok and pr.json() else 1)
        payload["defaultMonitorOption"] = "all"
        payload["defaultNewItemMonitorOption"] = "all"
        payload["defaultTags"] = []

    r = post_arr(svc, "/rootfolder", payload, api_version)
    return f"[{name}] root {path}: {'created' if r.ok else 'FAIL ' + r.text[:120]}"


# ── qBittorrent download client ──────────────────────────────────────

def ensure_qbit_client(svc, name, category, api_version="v3"):
    r = get_arr(svc, "/downloadclient", api_version)
    if r.ok and any(c.get("implementation") == "QBittorrent" for c in r.json()):
        return f"[{name}] qbit client: exists"
    cat_field = {"sonarr": "tvCategory", "radarr": "movieCategory",
                 "lidarr": "musicCategory"}.get(name.lower(), "category")
    payload = {
        "enable": True, "name": "qBittorrent",
        "implementation": "QBittorrent", "implementationName": "qBittorrent",
        "configContract": "QBittorrentSettings",
        "protocol": "torrent", "priority": 1,
        "removeCompletedDownloads": True, "removeFailedDownloads": True,
        "fields": [
            {"name": "host", "value": QBIT["host"]},
            {"name": "port", "value": QBIT["port"]},
            {"name": "useSsl", "value": False},
            {"name": "urlBase", "value": ""},
            {"name": "username", "value": QBIT["user"]},
            {"name": "password", "value": QBIT["pass"]},
            {"name": cat_field, "value": category},
            {"name": "initialState", "value": 0},
            {"name": "sequentialOrder", "value": False},
            {"name": "firstAndLast", "value": False},
        ],
        "tags": [],
    }
    r = post_arr(svc, "/downloadclient", payload, api_version)
    return f"[{name}] qbit client: {'created' if r.ok else 'FAIL ' + r.text[:200]}"


# ── Prowlarr → Sonarr/Radarr/Lidarr app sync ─────────────────────────

def ensure_prowlarr_app(app_name, svc, sync_categories, anime_categories=None):
    r = requests.get(PROWLARR["url"] + "/api/v1/applications",
                     headers=hdr_arr(PROWLARR), timeout=20)
    existing = r.json() if r.ok else []
    if any(a.get("name") == app_name for a in existing):
        return f"[Prowlarr] {app_name}: exists"
    payload = {
        "syncLevel": "fullSync",
        "name": app_name,
        "implementation": app_name,
        "implementationName": app_name,
        "configContract": app_name + "Settings",
        "fields": [
            {"name": "prowlarrUrl", "value": PROWLARR["url"]},
            {"name": "baseUrl", "value": svc["url"]},
            {"name": "apiKey", "value": svc["key"]},
            {"name": "syncCategories", "value": sync_categories},
        ],
        "tags": [],
    }
    if anime_categories is not None:
        payload["fields"].append({"name": "animeSyncCategories", "value": anime_categories})
        payload["fields"].append({"name": "syncAnimeStandardFormat", "value": False})
    r = requests.post(PROWLARR["url"] + "/api/v1/applications",
                      headers=hdr_arr(PROWLARR), json=payload, timeout=20)
    return f"[Prowlarr] {app_name}: {'linked' if r.ok else 'FAIL ' + r.text[:200]}"


# ── Bazarr ↔ Sonarr/Radarr ───────────────────────────────────────────

def ensure_bazarr_connections():
    """
    Bazarr 1.4+ uses /api/system/settings with a nested JSON. We POST partial
    settings; Bazarr merges them.
    """
    headers = {"X-API-KEY": BAZARR["key"], "Content-Type": "application/json"}
    payload = {
        "radarr": {
            "ip": urlparse(RADARR["url"]).hostname, "port": urlparse(RADARR["url"]).port,
            "apikey": RADARR["key"], "ssl": False, "base_url": "",
            "movies_sync": 60,
        },
        "sonarr": {
            "ip": urlparse(SONARR["url"]).hostname, "port": urlparse(SONARR["url"]).port,
            "apikey": SONARR["key"], "ssl": False, "base_url": "",
            "series_sync": 60,
        },
        "general": {
            "use_radarr": True,
            "use_sonarr": True,
        },
    }
    r = requests.post(BAZARR["url"] + "/api/system/settings",
                      headers=headers, json=payload, timeout=20)
    return f"[Bazarr] Sonarr+Radarr links: {'configured' if r.ok else 'FAIL ' + str(r.status_code)}"


def ensure_bazarr_language_profile():
    """
    Pick which pre-seeded language profile becomes the default.

    15 profiles ('English only', and for each of cat/spa/fre/ger/por/ita/jpn
    both '<Lang> + English' and '<Lang> only') are inserted into Bazarr's
    SQLite by the install handler before Bazarr first starts — see
    src/lib/seedVolumes.ts + stack/seeds/bazarr/bazarr.db (regenerate via
    stack/seeds/build-bazarr-seed.mjs).

    We map the wizard's 2-letter codes (ca/es/en/fr/de/pt/it/ja) to
    Bazarr's 3-letter codes, then derive a profile name to match against
    the seeded set. Bazarr's API can't CREATE profiles (GET-only), so a
    user picking >2 langs or an unsupported lang falls back cleanly to
    SKIP and they can pick manually in the Bazarr UI.
    """
    headers = {"X-API-KEY": BAZARR["key"], "Content-Type": "application/json"}

    # Normalise: wizard ships 2-letter codes; legacy/manual installs may
    # already ship 3-letter codes. Accept either.
    langs3 = set()
    for code in SUBTITLE_LANGS:
        code = code.strip().lower()
        if not code:
            continue
        langs3.add(LANG_2_TO_3.get(code, code))

    profile_name = None
    if langs3 == {"eng"}:
        profile_name = "English only"
    elif len(langs3) == 1:
        only = next(iter(langs3))
        display = LANG_3_TO_DISPLAY.get(only)
        if display and only != "eng":
            profile_name = f"{display} only"
    elif len(langs3) == 2 and "eng" in langs3:
        other = next(c for c in langs3 if c != "eng")
        display = LANG_3_TO_DISPLAY.get(other)
        if display:
            profile_name = f"{display} + English"

    if profile_name is None:
        return ("[Bazarr] lang profile: SKIP — SUBTITLE_LANGS "
                f"{sorted(langs3)} doesn't match a seeded profile (we ship "
                "<Lang> only and <Lang> + English for ca/es/fr/de/pt/it/ja); "
                "pick one manually in Bazarr UI")

    r = requests.get(BAZARR["url"] + "/api/system/languages/profiles",
                     headers=headers, timeout=10)
    if not r.ok:
        return f"[Bazarr] lang profile: SKIP — can't list profiles ({r.status_code})"
    try:
        profiles = r.json()
    except json.JSONDecodeError:
        return "[Bazarr] lang profile: SKIP — bad response"

    profile = next((p for p in profiles if p.get("name") == profile_name), None)
    if not profile:
        return (f"[Bazarr] lang profile '{profile_name}': SKIP — not "
                "present (seed may not have been copied; check Docker "
                "volume bazarr_config)")

    profile_id = profile.get("profileId") or profile.get("id")
    requests.post(BAZARR["url"] + "/api/system/settings",
                  headers=headers,
                  json={"general": {"serie_default_profile": profile_id,
                                    "movie_default_profile": profile_id}},
                  timeout=10)
    return f"[Bazarr] lang profile '{profile_name}': set as default"


# ── Jellyseerr ↔ Jellyfin + Sonarr + Radarr ──────────────────────────

def ensure_jellyseerr():
    status_r = requests.get(JELLYSEERR["url"] + "/api/v1/status", timeout=10)
    if not status_r.ok:
        return ["[Jellyseerr] status check failed"]
    try:
        if status_r.json().get("initialized"):
            return ["[Jellyseerr] already initialised: skipping"]
    except json.JSONDecodeError:
        return ["[Jellyseerr] bad status response"]

    # First-run: auth via Jellyfin to create the admin account.
    # The seerr-team/seerr fork expects hostname/port/useSsl/urlBase as
    # separate fields (not a single URL like the original Jellyseerr).
    jf = urlparse(JELLYFIN["url"])
    auth_r = requests.post(JELLYSEERR["url"] + "/api/v1/auth/jellyfin",
                           json={"username": "admin",
                                 "password": ADMIN_PASSWORD,
                                 "hostname": jf.hostname,
                                 "port": jf.port or (443 if jf.scheme == "https" else 80),
                                 "useSsl": jf.scheme == "https",
                                 "urlBase": ""},
                           timeout=30)
    if not auth_r.ok:
        return [f"[Jellyseerr] Jellyfin auth FAIL: {auth_r.status_code} {auth_r.text[:200]}"]
    cookies = auth_r.cookies

    results = ["[Jellyseerr] admin created via Jellyfin auth"]

    # Settings: Jellyfin
    requests.put(JELLYSEERR["url"] + "/api/v1/settings/jellyfin",
                 json={"hostname": JELLYFIN["url"], "externalHostname": "",
                       "enablePathMappings": False, "pathMappings": []},
                 cookies=cookies, timeout=15)

    # Settings: Radarr
    r_host = urlparse(RADARR["url"]).hostname
    r_port = urlparse(RADARR["url"]).port
    radarr_test = requests.post(JELLYSEERR["url"] + "/api/v1/settings/radarr/test",
                                json={"name": "Radarr", "hostname": r_host, "port": r_port,
                                      "apiKey": RADARR["key"], "useSsl": False, "baseUrl": "",
                                      "is4k": False},
                                cookies=cookies, timeout=30)
    radarr_profile = 1
    if radarr_test.ok:
        profiles = radarr_test.json()
        if profiles:
            radarr_profile = profiles[0].get("id", 1)
    r = requests.post(JELLYSEERR["url"] + "/api/v1/settings/radarr",
                      json={"name": "Radarr", "hostname": r_host, "port": r_port,
                            "apiKey": RADARR["key"], "useSsl": False, "baseUrl": "",
                            "activeProfileId": radarr_profile, "rootFolder": MOVIES_PATH,
                            "minimumAvailability": "released", "tags": [],
                            "is4k": False, "isDefault": True, "externalUrl": ""},
                      cookies=cookies, timeout=15)
    results.append(f"[Jellyseerr] Radarr link: {'OK' if r.ok else 'FAIL'}")

    # Settings: Sonarr
    s_host = urlparse(SONARR["url"]).hostname
    s_port = urlparse(SONARR["url"]).port
    sonarr_test = requests.post(JELLYSEERR["url"] + "/api/v1/settings/sonarr/test",
                                json={"name": "Sonarr", "hostname": s_host, "port": s_port,
                                      "apiKey": SONARR["key"], "useSsl": False, "baseUrl": "",
                                      "enableSeasonFolders": True},
                                cookies=cookies, timeout=30)
    sonarr_profile = 1
    if sonarr_test.ok:
        profiles = sonarr_test.json()
        if profiles:
            sonarr_profile = profiles[0].get("id", 1)
    r = requests.post(JELLYSEERR["url"] + "/api/v1/settings/sonarr",
                      json={"name": "Sonarr", "hostname": s_host, "port": s_port,
                            "apiKey": SONARR["key"], "useSsl": False, "baseUrl": "",
                            "activeProfileId": sonarr_profile, "rootFolder": TV_PATH,
                            "tags": [], "animeProfileId": sonarr_profile,
                            "animeRootFolder": TV_PATH, "animeTags": [],
                            "enableSeasonFolders": True,
                            "isDefault": True, "externalUrl": ""},
                      cookies=cookies, timeout=15)
    results.append(f"[Jellyseerr] Sonarr link: {'OK' if r.ok else 'FAIL'}")
    return results


# ── Main ─────────────────────────────────────────────────────────────

def section(title):
    print()
    print("── " + title + " " + "─" * (60 - len(title)))


def main():
    print("=== Gecko stack init ===")
    failures = []
    skips = []

    def track(line):
        print(" ", line)
        # Lines containing "FAIL" are hard errors (network problems, schema
        # issues we should fix). "SKIP" lines are degraded paths the user can
        # complete in the UI — they don't fail the install.
        if "FAIL" in line:
            failures.append(line)
        elif "SKIP" in line:
            skips.append(line)

    section("Waiting for services")
    for name, svc in [("Sonarr", SONARR), ("Radarr", RADARR), ("Lidarr", LIDARR),
                      ("Prowlarr", PROWLARR), ("Bazarr", BAZARR),
                      ("Jellyseerr", JELLYSEERR)]:
        ready = wait_ready(svc["url"], max_wait=180)
        print(f"  {name}: {'ready' if ready else 'TIMEOUT'}")
        if not ready:
            print(f"FATAL: {name} not ready, aborting")
            sys.exit(1)

    section("Root folders")
    track(ensure_root_folder(SONARR, "Sonarr", TV_PATH))
    track(ensure_root_folder(RADARR, "Radarr", MOVIES_PATH))
    track(ensure_root_folder(LIDARR, "Lidarr", MUSIC_PATH, api_version="v1"))

    section("qBittorrent download clients")
    track(ensure_qbit_client(SONARR, "Sonarr", "sonarr"))
    track(ensure_qbit_client(RADARR, "Radarr", "radarr"))
    track(ensure_qbit_client(LIDARR, "Lidarr", "lidarr", api_version="v1"))

    section("Prowlarr → app sync")
    track(ensure_prowlarr_app("Sonarr", SONARR,
                              [5000, 5010, 5020, 5030, 5040, 5045, 5050, 5060, 5070, 5080],
                              anime_categories=[5070]))
    track(ensure_prowlarr_app("Radarr", RADARR,
                              [2000, 2010, 2020, 2030, 2040, 2045, 2050, 2060, 2070, 2080]))
    track(ensure_prowlarr_app("Lidarr", LIDARR,
                              [3000, 3010, 3020, 3030, 3040]))

    section("Bazarr")
    track(ensure_bazarr_connections())
    track(ensure_bazarr_language_profile())

    section("Jellyseerr")
    for line in ensure_jellyseerr():
        track(line)

    print()
    if skips:
        print(f"=== Done with {len(skips)} skip(s) — user must finish manually ===")
    if failures:
        print(f"=== FAILED ({len(failures)} step(s)) ===")
        sys.exit(2)
    if not skips:
        print("=== Done ===")


if __name__ == "__main__":
    main()
