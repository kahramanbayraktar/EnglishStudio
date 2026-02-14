-- Table 1: stores the texts entered by the user
CREATE TABLE es_source_texts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table 2: stores the phrasal verbs and idioms extracted from the text
CREATE TABLE es_extracted_phrases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_id UUID REFERENCES es_source_texts(id) ON DELETE CASCADE,
  phrase TEXT NOT NULL,
  type TEXT CHECK (type IN ('phrasal_verb', 'idiom')),
  meaning TEXT,
  example TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS (Row Level Security): open access for now
ALTER TABLE es_source_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE es_extracted_phrases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert" ON es_source_texts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select" ON es_source_texts FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON es_extracted_phrases FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select" ON es_extracted_phrases FOR SELECT USING (true);
