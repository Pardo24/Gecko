# Recyclarr TEMPLATE — rendered by Gecko at install time.
#
# This file is NOT read by Recyclarr directly. `renderRecyclarrTemplate()` in
# src/autoSetup.ts substitutes the {{PLACEHOLDERS}} below with scores derived
# from the wizard's "quality preferences" step, then writes recyclarr.yml next
# to it. The committed recyclarr.yml is the balanced default render (device =
# modern, language = both) and acts as a fallback if rendering is skipped.
#
# Scoring model (deliberately filter-based, because min_format_score is 0 so
# ANY net-negative release is rejected):
#   {{DEVICE_PENALTY}}     0  (modern/PC) | -10000 (old/basic TV → reject HEVC,
#                          10-bit and high-bitrate audio so it falls back to
#                          H.264 8-bit + standard audio that direct-plays)
#   {{MULTI_SCORE}}        0  (original-only) | 500 (multi-user / dubbed → prefer
#                          dual-audio releases)
#   {{NOT_ORIGINAL_SCORE}} 0  (multi/dubbed) | -10000 (original-only → reject
#                          releases whose language isn't the original)
# Universal junk (AV1, BR-DISK, LQ groups) is always rejected at -10000.
# Remux is handled by the quality-profile upgrade cutoff, not a score.
#
# TRaSH custom-format IDs verified against TRaSH-Guides/Guides (June 2026).
# Docs: https://recyclarr.dev/  https://trash-guides.info/

sonarr:
  gecko_sonarr:
    base_url: http://media_sonarr:8989
    api_key: !env_var SONARR_API_KEY
    delete_old_custom_formats: false

    quality_definition:
      type: series

    quality_profiles:
      - name: WEB-1080p
        reset_unmatched_scores:
          enabled: true
        upgrade:
          allowed: true
          until_quality: WEBDL-1080p
          until_score: 10000
        min_format_score: 0
        quality_sort: top
        qualities:
          - name: WEBDL-1080p
            qualities: [WEBDL-1080p, WEBRip-1080p]
          - name: HDTV-1080p
          - name: WEBDL-720p
            qualities: [WEBDL-720p, WEBRip-720p]

    custom_formats:
      # Universal junk — always rejected.
      - trash_ids:
          - 15a05bc7c1a36e2b57fd628f8977e2fc   # AV1
          - 85c61753df5da1fb2aab6f2a47426b09   # BR-DISK
          - 9c11cd3f07101cdba90a2d81cf0e56b4   # LQ
          - e2315f990da2e2cbfc9fa5b7a6fcfe48   # LQ (Release Title)
        assign_scores_to:
          - name: WEB-1080p
            score: -10000
      # Device compatibility — rejected only for old/basic TVs.
      - trash_ids:
          - 47435ece6b99a0b477caf360e79ba0bb   # x265 (HD)
          - b2550eb333d27b75833e25b8c2557b38   # 10bit
          - 1808e4b9cee74e064dfae3f1db99dbfe   # TrueHD
          - 0d7824bb924701997f874e7ff7d4844a   # TrueHD ATMOS
          - b6fbafa7942952a13e17e2b1152b539a   # ATMOS (undefined)
          - 4232a509ce60c4e208d13825b7c06264   # DD+ ATMOS
          - c429417a57ea8c41d57e6990a8b0033f   # DTS-HD MA
          - 9d00418ba386a083fbf4d58235fc37ef   # DTS X
        assign_scores_to:
          - name: WEB-1080p
            score: {{DEVICE_PENALTY}}
      # Dual-audio (MULTi) — boosted for multi-user / dubbed setups.
      - trash_ids:
          - 7ba05c6e0e14e793538174c679126996   # MULTi
        assign_scores_to:
          - name: WEB-1080p
            score: {{MULTI_SCORE}}
      # Non-original language — rejected for original-only setups.
      - trash_ids:
          - ae575f95ab639ba5d15f663bf019e3e8   # Language: Not Original
        assign_scores_to:
          - name: WEB-1080p
            score: {{NOT_ORIGINAL_SCORE}}

radarr:
  gecko_radarr:
    base_url: http://media_radarr:7878
    api_key: !env_var RADARR_API_KEY
    delete_old_custom_formats: false

    quality_definition:
      type: movie

    quality_profiles:
      - name: HD Bluray + WEB
        reset_unmatched_scores:
          enabled: true
        upgrade:
          allowed: true
          until_quality: Bluray-1080p
          until_score: 10000
        min_format_score: 0
        quality_sort: top
        qualities:
          - name: Bluray-1080p
          - name: WEBDL-1080p
            qualities: [WEBDL-1080p, WEBRip-1080p]
          - name: Bluray-720p
          - name: WEBDL-720p
            qualities: [WEBDL-720p, WEBRip-720p]

    custom_formats:
      # Universal junk — always rejected.
      - trash_ids:
          - cae4ca30163749b891686f95532519bd   # AV1
          - ed38b889b31be83fda192888e2286d83   # BR-DISK
          - 90a6f9a284dff5103f6346090e6280c8   # LQ
          - e204b80c87be9497a8a6eaff48f72905   # LQ (Release Title)
        assign_scores_to:
          - name: HD Bluray + WEB
            score: -10000
      # Device compatibility — rejected only for old/basic TVs.
      - trash_ids:
          - dc98083864ea246d05a42df0d05f81cc   # x265 (HD)
          - a5d148168c4506b55cf53984107c396e   # 10bit
          - 3cafb66171b47f226146a0770576870f   # TrueHD
          - 496f355514737f7d83bf7aa4d24f8169   # TrueHD ATMOS
          - 417804f7f2c4308c1f4c5d380d4c4475   # ATMOS (undefined)
          - 1af239278386be2919e1bcee0bde047e   # DD+ ATMOS
          - dcf3ec6938fa32445f590a4da84256cd   # DTS-HD MA
          - 2f22d89048b01681dde8afe203bf2e95   # DTS X
        assign_scores_to:
          - name: HD Bluray + WEB
            score: {{DEVICE_PENALTY}}
      # Dual-audio (MULTi) — boosted for multi-user / dubbed setups.
      - trash_ids:
          - 4b900e171accbfb172729b63323ea8ca   # MULTi
        assign_scores_to:
          - name: HD Bluray + WEB
            score: {{MULTI_SCORE}}
      # Non-original language — rejected for original-only setups.
      - trash_ids:
          - d6e9318c875905d6cfb5bee961afcea9   # Language: Not Original
        assign_scores_to:
          - name: HD Bluray + WEB
            score: {{NOT_ORIGINAL_SCORE}}
