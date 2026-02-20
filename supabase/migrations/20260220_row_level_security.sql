-- Row Level Security für Datenschutz
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Hinweisgeber können nur eigene Fälle sehen (via receipt_code in session)
CREATE POLICY "hinweisgeber_own_case" ON cases
  FOR SELECT USING (receipt_code = current_setting('app.receipt_code', true));

-- Handler können alle Fälle sehen
CREATE POLICY "handler_all_cases" ON cases
  FOR ALL USING (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND role = 'handler')
  );
