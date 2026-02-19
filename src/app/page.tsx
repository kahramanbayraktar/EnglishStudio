'use client';

import { AnalysisResult, SentenceComponent, analyzeText, breakdownSentence } from '@/lib/gemini';
import { supabase } from '@/lib/supabase';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Clock, History as HistoryIcon, Layers, Save, Search, X } from 'lucide-react';
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
  const [breakdownResults, setBreakdownResults] = useState<SentenceComponent[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeMode, setActiveMode] = useState<'phrasal' | 'breakdown'>('phrasal');
  const [selectedPhrase, setSelectedPhrase] = useState<AnalysisResult | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<SentenceComponent | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

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
    setResults([]);
    setBreakdownResults([]);
    
    try {
      const { data, error } = await supabase
        .from('es_extracted_phrases')
        .select('*')
        .eq('text_id', item.id);

      if (error) throw error;
      
      const items = data as any[];
      if (items.length > 0) {
        // Simple heuristic: if any item has type 'phrasal_verb' or 'idiom', it's phrasal mode
        const isPhrasal = items.some(i => i.type === 'phrasal_verb' || i.type === 'idiom');
        
        if (isPhrasal) {
          setActiveMode('phrasal');
          setResults(items as AnalysisResult[]);
        } else {
          setActiveMode('breakdown');
          // Map back from DB schema to SentenceComponent
          setBreakdownResults(items.map(i => ({
            segment: i.phrase,
            type: i.type,
            explanation: i.meaning
          })));
        }
      }
    } catch (error) {
      console.error('Error loading history item:', error);
    } finally {
      setIsAnalyzing(false);
      setIsSaved(true); // Content loaded from history is by definition saved
    }
  };


  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    setResults([]);
    setBreakdownResults([]);
    setIsSaved(false); // New analysis is not saved yet
    
    try {
      if (activeMode === 'phrasal') {
        const data = await analyzeText(text);
        setResults(data);
      } else {
        const data = await breakdownSentence(text);
        setBreakdownResults(data);
      }
    } catch (error) {
      console.error('Operation failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if ((activeMode === 'phrasal' && results.length === 0) || 
        (activeMode === 'breakdown' && breakdownResults.length === 0)) return;
    
    if (isSaved) return; // Prevent duplicate saves

    // Check for duplicates: does this text exist in history AND have the same analysis type?
    const existingEntries = history.filter(h => h.content === text);
    
    if (existingEntries.length > 0) {
      const currentIsPhrasal = activeMode === 'phrasal';
      let duplicateFound = false;

      // Check all entries with same text content
      for (const entry of existingEntries) {
        const { data } = await supabase
          .from('es_extracted_phrases')
          .select('type')
          .eq('text_id', entry.id); // Remove limit(1) to get all types to be sure

        if (data && data.length > 0) {
          // Check if ANY item in this entry matches the current mode's types
          const hasPhrasal = data.some(d => d.type === 'phrasal_verb' || d.type === 'idiom');
          const isEntryPhrasal = hasPhrasal; 
          // If no items, it's ambiguous, but if items exist we can tell mode.
          // 'phrasal_verb'/'idiom' -> Phrasal Mode
          // Other types (Subject, Verb, etc) -> Breakdown Mode

          if (isEntryPhrasal === currentIsPhrasal) {
            duplicateFound = true;
            break;
          }
        }
      }

      if (duplicateFound) {
        setIsSaved(true);
        return;
      }
    }

    setIsSaving(true);
    try {
      // 1. Save main text
      const { data: textData, error: textError } = await supabase
        .from('es_source_texts')
        .insert([{ content: text }])
        .select()
        .single();

      if (textError) throw textError;

      if (textData) {
        // 2. Prepare items based on mode
        let itemsToInsert: any[] = [];

        if (activeMode === 'phrasal') {
          itemsToInsert = results.map(item => ({
            text_id: textData.id,
            phrase: item.phrase,
            type: item.type,
            meaning: item.meaning,
            example: item.example
          }));
        } else {
          // Map SentenceComponent to DB schema
          // segment -> phrase, explanation -> meaning
          itemsToInsert = breakdownResults.map(item => ({
            text_id: textData.id,
            phrase: item.segment,
            type: item.type,
            meaning: item.explanation,
            example: '' // No example for breakdown
          }));
        }

        const { error: phrasesError } = await supabase
          .from('es_extracted_phrases')
          .insert(itemsToInsert);
        
        if (phrasesError) throw phrasesError;
        
        setIsSaved(true); // Mark as saved
        fetchHistory(); // Refresh
      }
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const SEGMENT_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', 
    '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'
  ];


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
            Select a tool and paste your English text to get started.
          </p>
        </motion.div>
      </header>

      {/* Control Bar - New Addition */}
      <div style={{ maxWidth: '800px', margin: '0 auto 1.5rem', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div style={{ 
          background: 'rgba(255,255,255,0.05)', 
          padding: '0.5rem', 
          borderRadius: '16px', 
          display: 'flex', 
          gap: '0.5rem',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <button 
            onClick={() => setActiveMode('phrasal')}
            style={{
              padding: '0.8rem 1.5rem',
              borderRadius: '12px',
              background: activeMode === 'phrasal' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
              color: activeMode === 'phrasal' ? '#818cf8' : 'rgba(255,255,255,0.6)',
              border: activeMode === 'phrasal' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <BookOpen size={16} />
            Phrasal & Idioms
          </button>
          
          <button 
            onClick={() => setActiveMode('breakdown')}
            style={{
              padding: '0.8rem 1.5rem',
              borderRadius: '12px',
              background: activeMode === 'breakdown' ? 'rgba(236, 72, 153, 0.2)' : 'transparent',
              color: activeMode === 'breakdown' ? '#f472b6' : 'rgba(255,255,255,0.6)',
              border: activeMode === 'breakdown' ? '1px solid rgba(236, 72, 153, 0.4)' : '1px solid transparent',
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Layers size={16} />
            Sentence Breakdown
          </button>
        </div>
      </div>

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

          {(results.length > 0 && activeMode === 'phrasal') && (
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
                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <span>{results.length} items found</span>
                  <button 
                    onClick={handleSave}
                    disabled={isSaving || isSaved}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.3rem',
                      background: isSaved ? 'rgba(74, 222, 128, 0.2)' : 'var(--primary-glow)',
                      border: isSaved ? '1px solid #4ade80' : '1px solid var(--primary)',
                      padding: '0.3rem 0.8rem',
                      borderRadius: '8px',
                      color: isSaved ? '#4ade80' : 'white',
                      fontSize: '0.8rem',
                      cursor: (isSaving || isSaved) ? 'default' : 'pointer',
                      opacity: isSaving ? 0.7 : 1,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <Save size={14} />
                    {isSaving ? 'Saving...' : (isSaved ? 'Saved' : 'Save')}
                  </button>
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

          {(breakdownResults.length > 0 && activeMode === 'breakdown') && (
            <motion.section 
              className={styles.resultsSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className={styles.resultsHeader}>
                <h2 className="glow-text" style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Layers size={24} className="gradient-text" /> 
                  Sentence Components
                </h2>
                <button 
                  onClick={handleSave}
                  disabled={isSaving || isSaved}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.3rem',
                    background: isSaved ? 'rgba(74, 222, 128, 0.2)' : 'var(--secondary-glow)',
                    border: isSaved ? '1px solid #4ade80' : '1px solid var(--secondary)',
                    padding: '0.3rem 0.8rem',
                    borderRadius: '8px',
                    color: isSaved ? '#4ade80' : 'white',
                    fontSize: '0.8rem',
                    cursor: (isSaving || isSaved) ? 'default' : 'pointer',
                    opacity: isSaving ? 0.7 : 1,
                    transition: 'all 0.3s ease'
                  }}
                >
                  <Save size={14} />
                  {isSaving ? 'Saving...' : (isSaved ? 'Saved' : 'Save')}
                </button>
              </div>
            
              <div className={styles.breakdownContainer} style={{ 
                lineHeight: '2.5', 
                fontSize: '1.3rem', 
                background: 'rgba(0,0,0,0.2)', 
                padding: '2rem', 
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                {breakdownResults.map((segment, index) => {
                  const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length];
                  return (
                    <motion.span
                      key={index}
                      whileHover={{ scale: 1.05, backgroundColor: `${color}40` }} // 40 is hex opacity ~25%
                      onClick={() => setSelectedSegment(segment)}
                      style={{
                        color: color,
                        cursor: 'pointer',
                        padding: '0.2rem 0.5rem',
                        margin: '0 2px',
                        borderRadius: '6px',
                        display: 'inline-block', // keeps it inline but allows padding/margin
                        borderBottom: `2px solid ${color}`,
                        transition: 'all 0.2s'
                      }}
                    >
                      {segment.segment}
                    </motion.span>
                  );
                })}
              </div>
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: '1rem', fontSize: '0.9rem' }}>
                Tap on any segment to see its grammatical role explanation.
              </p>
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

        {selectedSegment && (
          <motion.div 
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedSegment(null)}
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
                onClick={() => setSelectedSegment(null)}
              >
                <X size={24} />
              </button>

              <div className={styles.modalContent}>
                <span className={styles.typeBadge} style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                  {selectedSegment.type}
                </span>
                <h3 className="gradient-text" style={{ fontSize: '1.5rem', lineHeight: '1.3' }}>
                  "{selectedSegment.segment}"
                </h3>
                 
                <div style={{ marginTop: '1.5rem' }}>
                  <div className={styles.meaningLabel}>Explanation</div>
                  <p className={styles.meaningText}>
                    {selectedSegment.explanation}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
