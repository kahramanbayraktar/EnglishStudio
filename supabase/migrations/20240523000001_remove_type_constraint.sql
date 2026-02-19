-- Drop the check constraint that limits the 'type' column values
ALTER TABLE es_extracted_phrases
DROP CONSTRAINT es_extracted_phrases_type_check;

-- Alternatively, if you want to keep a constraint but broaden it (optional, usually dropping is easier for flexibility):
-- ALTER TABLE es_extracted_phrases
-- ADD CONSTRAINT es_extracted_phrases_type_check 
-- CHECK (type IN ('phrasal_verb', 'idiom', 'Subject', 'Action', 'Object', 'Context', 'Detail', 'Connector', 'Other'));
