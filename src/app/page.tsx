'use client';

import { AnalysisResult, analyzeText } from '@/lib/gemini';
import { supabase } from '@/lib/supabase';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Clock, History as HistoryIcon, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import styles from './page.module.css';

interface HistoryEntry {
  id: string;
  content: string;
  created_at: string;
}

export default function Home() {
  const [text, setText] = useState('');
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPhrase, setSelectedPhrase] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('es_source_texts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) console.error('Error fetching history:', error);
    else setHistory(data || []);
  };

  const loadHistoryItem = async (item: HistoryEntry) => {
    setText(item.content);
    setIsAnalyzing(true);
    
    try {
      const { data, error } = await supabase
        .from('es_extracted_phrases')
        .select('phrase, type, meaning, example')
        .eq('text_id', item.id);

      if (error) throw error;
      setResults(data as AnalysisResult[]);
    } catch (error) {
      console.error('Error loading history item:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    
    try {
      // 1. Analyze using Gemini
      const data = await analyzeText(text);
      setResults(data);

      // 2. Save to Supabase
      if (data.length > 0) {
        // Save the main text
        const { data: textData, error: textError } = await supabase
          .from('es_source_texts')
          .insert([{ content: text }])
          .select()
          .single();

        if (textError) throw textError;

        if (textData) {
          // Save the found phrases
          const itemsToInsert = data.map(item => ({
            text_id: textData.id,
            phrase: item.phrase,
            type: item.type,
            meaning: item.meaning,
            example: item.example
          }));

          const { error: phrasesError } = await supabase
            .from('es_extracted_phrases')
            .insert(itemsToInsert);

          if (phrasesError) throw phrasesError;
          
          fetchHistory(); // Refresh history
        }
      }
    } catch (error) {
      console.error('Operation failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <main className={styles.main}>
      <header className={styles.hero}>
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          {/* Custom SVG Logo */}
          <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
            <div style={{ 
              position: 'absolute', 
              inset: '-20px', 
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)', 
              filter: 'blur(20px)',
              zIndex: -1
            }} />
            <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 20 H80 V40 H35 V50 H70 V70 H35 V80 H80" stroke="url(#logoGradient)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M85 85 L95 95 M5 5 L15 15" stroke="url(#logoGradient)" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
              <circle cx="85" cy="20" r="5" fill="#ec4899" />
              <defs>
                <linearGradient id="logoGradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="gradient-text" style={{ fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '2px' }}>
            AI Powered English Learning
          </div>
          <h1 className={styles.title}>
            English<span className="gradient-text">Studio</span>
          </h1>
          <p className={styles.subtitle}>
            Paste any English text and instantly discover the phrasal verbs and idioms hidden within.
          </p>
        </motion.div>
      </header>

      <div className={styles.layoutContainer}>
        <div className={styles.mainContent}>
          <section className={styles.inputSection}>
            <textarea
              className={styles.textarea}
              placeholder="Paste your English text here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button 
              className={styles.analyzeBtn}
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                >
                  <Search size={20} />
                </motion.div>
              ) : (
                'Analyze Text'
              )}
            </button>
          </section>

          {results.length > 0 && (
            <motion.section 
              className={styles.resultsSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className={styles.resultsHeader}>
                <h2 className="glow-text" style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BookOpen size={24} className="gradient-text" /> 
                  Identified Phrases
                </h2>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)' }}>
                  {results.length} items found
                </div>
              </div>

              <div className={styles.chipContainer}>
                {results.map((item, index) => (
                  <motion.button
                    key={index}
                    className={`${styles.chip} ${item.type === 'phrasal_verb' ? styles.phrasalVerbChip : styles.idiomChip}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedPhrase(item)}
                  >
                    {item.phrase}
                  </motion.button>
                ))}
              </div>
            </motion.section>
          )}
        </div>

        <aside className={`${styles.historySidebar} glass-panel`}>
          <h3 className={styles.historyTitle}>
            <HistoryIcon size={20} className="gradient-text" />
            Recent Analyses
          </h3>
          <div className={styles.historyList}>
            {history.map((item) => (
              <button 
                key={item.id} 
                className={styles.historyItem}
                onClick={() => loadHistoryItem(item)}
              >
                <div className={styles.historyItemContent}>{item.content}</div>
                <div className={styles.historyItemDate}>
                  <Clock size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  {new Date(item.created_at).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {selectedPhrase && (
          <motion.div 
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhrase(null)}
          >
            <motion.div 
              className={styles.modal}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className={styles.closeBtn} 
                style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: 'rgba(255,255,255,0.4)' }}
                onClick={() => setSelectedPhrase(null)}
              >
                <X size={24} />
              </button>

              <div className={styles.modalContent}>
                <span className={`${styles.typeBadge} ${selectedPhrase.type === 'phrasal_verb' ? styles.phrasalVerbBadge : styles.idiomBadge}`}>
                  {selectedPhrase.type.replace('_', ' ')}
                </span>
                <h3 className="gradient-text">{selectedPhrase.phrase}</h3>
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <div className={styles.meaningLabel}>Definition</div>
                  <p className={styles.meaningText}>{selectedPhrase.meaning}</p>
                </div>

                <div>
                  <div className={styles.meaningLabel}>Context Example</div>
                  <div className={styles.exampleBox}>
                    "{selectedPhrase.example}"
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
