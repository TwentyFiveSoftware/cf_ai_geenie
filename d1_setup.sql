CREATE TABLE IF NOT EXISTS wiki_html
(
    downloaded_at_unix_time INTEGER PRIMARY KEY,
    html                    TEXT
);

CREATE TABLE IF NOT EXISTS map_features
(
    category TEXT PRIMARY KEY,
    content TEXT
);
