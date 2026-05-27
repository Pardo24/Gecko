-- 3 language profiles for Bazarr.
-- The wizard's language step picks which one becomes default for movies+series.
-- SQLite uses single quotes for strings → no escaping needed for the JSON.

INSERT OR IGNORE INTO table_languages_profiles
  (name, items, cutoff, mustContain, mustNotContain, originalFormat)
VALUES
  ('Català + English',
   '[{"id":1,"language":"cat","audio_exclude":"False","hi":"False","forced":"False"},{"id":2,"language":"eng","audio_exclude":"False","hi":"False","forced":"False"}]',
   NULL, '[]', '[]', NULL),

  ('Castellano + English',
   '[{"id":1,"language":"spa","audio_exclude":"False","hi":"False","forced":"False"},{"id":2,"language":"eng","audio_exclude":"False","hi":"False","forced":"False"}]',
   NULL, '[]', '[]', NULL),

  ('English only',
   '[{"id":1,"language":"eng","audio_exclude":"False","hi":"False","forced":"False"}]',
   NULL, '[]', '[]', NULL);
