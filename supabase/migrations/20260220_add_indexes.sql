-- Performance-Indexes für häufige Abfragen
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_category ON cases(category);
CREATE INDEX IF NOT EXISTS idx_messages_case_id ON messages(case_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Full-Text-Suche für Beschreibungen
CREATE INDEX IF NOT EXISTS idx_cases_description_fts 
  ON cases USING gin(to_tsvector('german', description));

COMMENT ON TABLE cases IS 'Hinweisgeberfälle gemäß HinSchG';
COMMENT ON COLUMN cases.receipt_code IS 'Anonymer 8-stelliger Zugangscode für Hinweisgeber';
