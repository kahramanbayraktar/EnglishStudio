'use client';

import { AnalysisResult, analyzeText } from '@/lib/gemini';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Search, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import styles from './page.module.css';

export default function Home() {
  const [text, setText] = useState('');
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPhrase, setSelectedPhrase] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    try {
      const data = await analyzeText(text);
      setResults(data);
    } catch (error) {
      console.error(error);
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
        >
          <div className="gradient-text" style={{ fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '2px' }}>
            <Sparkles size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
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

      <section className={styles.inputSection}>
        <textarea
          className={styles.textarea}
          placeholder="Paste your English text here (e.g., 'I will look after the kids while you go out. Don't worry, it's a piece of cake!')"
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
