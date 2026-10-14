import { useState, useEffect, useRef, useMemo } from 'react';
import {
  RefreshCw,
  Volume2,
  Bookmark,
  BookmarkCheck,
  Search,
  ExternalLink,
  CheckCircle,
  XCircle,
  Download,
  Award,
  Square,
  BookOpen,
  Radio,
  Clock,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import {
  api,
  type CurrentAffairsItem,
  type LiveCurrentAffairsResponse,
} from '../api';
import { getUserItem, setUserItem } from '../utils/userStorage';
import { playEarcon, playVoiceAccessChime } from '../utils/soundEffects';
import { speakWithBrowserFallback, cleanTextForSpeech } from '../utils/speechUtils';
import type { User } from '../types';

interface LiveCurrentAffairsHubProps {
  currentUser: User | null;
  selectedLanguage: 'English' | 'Hindi' | 'Odia';
  onNavigateTab?: (tab: string) => void;
}

export function LiveCurrentAffairsHub({
  currentUser,
  selectedLanguage,
  onNavigateTab,
}: LiveCurrentAffairsHubProps) {
  const [category, setCategory] = useState<string>('all');
  const [data, setData] = useState<LiveCurrentAffairsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedExamTag, setSelectedExamTag] = useState<string>('all');
  const [autoSyncInterval, setAutoSyncInterval] = useState<number>(300); // 300s = 5 mins
  const [lastRefreshedTime, setLastRefreshedTime] = useState<string>('Just now');
  
  // Bookmarks
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    return getUserItem<string[]>('current_affairs_bookmarks', currentUser, []);
  });
  const [showBookmarksOnly, setShowBookmarksOnly] = useState<boolean>(false);

  // Audio Playback
  const [isSpeakingAll, setIsSpeakingAll] = useState<boolean>(false);
  const [speakingItemId, setSpeakingItemId] = useState<string | null>(null);

  // Daily Speed Quiz
  const [isQuizModalOpen, setIsQuizModalOpen] = useState<boolean>(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false);

  // Breaking ticker auto-cycle
  const [activeTickerIndex, setActiveTickerIndex] = useState<number>(0);
  const tickerIntervalRef = useRef<any>(null);

  // Expanded articles for key takeaways
  const [expandedTakeaways, setExpandedTakeaways] = useState<Record<string, boolean>>({});

  // Fetch live current affairs
  const loadFeed = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      const response = await api.getLiveCurrentAffairs(category, selectedLanguage);
      setData(response);
      setLastRefreshedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      playEarcon('nav');
    } catch (err) {
      console.error('Failed to load live current affairs:', err);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed(true);
  }, [category, selectedLanguage]);

  // Auto-Sync Timer
  useEffect(() => {
    if (autoSyncInterval <= 0) return;
    const interval = setInterval(() => {
      loadFeed(false);
    }, autoSyncInterval * 1000);
    return () => clearInterval(interval);
  }, [autoSyncInterval, category, selectedLanguage]);

  // Breaking Ticker Auto-cycle
  useEffect(() => {
    if (!data?.breaking_ticker || data.breaking_ticker.length === 0) return;
    tickerIntervalRef.current = setInterval(() => {
      setActiveTickerIndex((prev) => (prev + 1) % data.breaking_ticker.length);
    }, 4500);
    return () => clearInterval(tickerIntervalRef.current);
  }, [data?.breaking_ticker]);

  // Toggle Bookmark
  const toggleBookmark = (id: string) => {
    setBookmarkedIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((item) => item !== id) : [...prev, id];
      setUserItem('current_affairs_bookmarks', next, currentUser);
      playEarcon(exists ? 'select' : 'success');
      return next;
    });
  };

  // Audio Playback
  const handleListenItem = (item: CurrentAffairsItem) => {
    if (speakingItemId === item.id) {
      window.speechSynthesis?.cancel();
      setSpeakingItemId(null);
      return;
    }
    window.speechSynthesis?.cancel();
    setSpeakingItemId(item.id);
    setIsSpeakingAll(false);

    const speechText =
      selectedLanguage === 'Odia'
        ? `ସାମ୍ପ୍ରତିକ ଘଟଣା: ${item.title}। ବିଭାଗ: ${item.category}। ${item.summary}। ପରୀକ୍ଷା ପାଇଁ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ତଥ୍ୟ: ${item.static_gk_fact}`
        : selectedLanguage === 'Hindi'
        ? `समसामयिक घटना: ${item.title}। विभाग: ${item.category}। ${item.summary}। महत्वपूर्ण तथ्य: ${item.static_gk_fact}`
        : `Current Affair: ${item.title}. Category: ${item.category}. Summary: ${item.summary}. Key static fact: ${item.static_gk_fact}`;

    const langCode = selectedLanguage === 'Odia' ? 'or-IN' : selectedLanguage === 'Hindi' ? 'hi-IN' : 'en-US';
    speakWithBrowserFallback(cleanTextForSpeech(speechText), langCode, {
      onEnd: () => setSpeakingItemId(null),
      onError: () => setSpeakingItemId(null),
    });
  };

  // Stop all audio
  const handleStopAudio = () => {
    window.speechSynthesis?.cancel();
    setIsSpeakingAll(false);
    setSpeakingItemId(null);
  };

  // Listen to Top 5 Digest
  const handleListenDigest = () => {
    if (isSpeakingAll || speakingItemId) {
      handleStopAudio();
      return;
    }
    if (!data?.items || data.items.length === 0) return;

    window.speechSynthesis?.cancel();
    setIsSpeakingAll(true);
    setSpeakingItemId(null);

    const topItems = data.items.slice(0, 5);
    const digestText = topItems
      .map((it, idx) => `Item ${idx + 1}: ${it.title}. ${it.summary}`)
      .join('. ');

    const fullBriefing =
      selectedLanguage === 'Odia'
        ? `ଆଜିର ମୁଖ୍ୟ ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀର ସଂକ୍ଷିପ୍ତ ସମୀକ୍ଷା। ${digestText}`
        : selectedLanguage === 'Hindi'
        ? `आज के मुख्य समसामयिक घटनाक्रम का संक्षिप्त विवरण। ${digestText}`
        : `Today's Live Current Affairs Briefing. ${digestText}`;

    const langCode = selectedLanguage === 'Odia' ? 'or-IN' : selectedLanguage === 'Hindi' ? 'hi-IN' : 'en-US';
    speakWithBrowserFallback(cleanTextForSpeech(fullBriefing), langCode, {
      onEnd: () => setIsSpeakingAll(false),
      onError: () => setIsSpeakingAll(false),
    });
  };

  // Download Daily Digest as Text File
  const handleDownloadDigest = () => {
    if (!data?.items) return;
    const dateStr = new Date().toLocaleDateString();
    let content = `ATLAS 2.0 - DAILY LIVE CURRENT AFFAIRS DIGEST\nDate: ${dateStr}\nCategory: ${category.toUpperCase()}\nLanguage: ${selectedLanguage}\n\n`;
    content += `========================================================\n\n`;

    data.items.forEach((it, idx) => {
      content += `[${idx + 1}] ${it.title}\n`;
      content += `Category: ${it.category} | Source: ${it.source} | Time: ${it.published_at}\n`;
      content += `Summary: ${it.summary}\n`;
      content += `Exam Relevance: ${(it.exam_relevance || []).join(', ')}\n`;
      content += `Static GK: ${it.static_gk_fact}\n`;
      content += `Key Takeaways:\n`;
      (it.key_takeaways || []).forEach((tk) => {
        content += `  - ${tk}\n`;
      });
      content += `\n--------------------------------------------------------\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ATLAS_Current_Affairs_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    playEarcon('select');
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    let items = data.items;

    if (showBookmarksOnly) {
      items = items.filter((it) => bookmarkedIds.includes(it.id));
    }

    if (selectedExamTag !== 'all') {
      items = items.filter((it) =>
        (it.exam_relevance || []).some((tag) => tag.toLowerCase().includes(selectedExamTag.toLowerCase()))
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          it.summary.toLowerCase().includes(q) ||
          it.category.toLowerCase().includes(q) ||
          it.source.toLowerCase().includes(q) ||
          (it.exam_relevance || []).some((tag) => tag.toLowerCase().includes(q))
      );
    }

    return items;
  }, [data?.items, showBookmarksOnly, bookmarkedIds, selectedExamTag, searchQuery]);

  // Quiz Handling
  const quizList = data?.daily_quiz || [];

  const handleStartQuiz = () => {
    if (quizList.length === 0) return;
    setCurrentQuizIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setQuizScore(0);
    setQuizCompleted(false);
    setIsQuizModalOpen(true);
    playVoiceAccessChime();
  };

  const handleSelectQuizOption = (optIdx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(optIdx);
    setIsAnswerSubmitted(true);
    const isCorrect = optIdx === quizList[currentQuizIndex].correct_index;
    if (isCorrect) {
      setQuizScore((prev) => prev + 1);
      playEarcon('success');
    } else {
      playEarcon('alert');
    }
  };

  const handleNextQuizQuestion = () => {
    if (currentQuizIndex + 1 < quizList.length) {
      setCurrentQuizIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      setQuizCompleted(true);
      playEarcon('success');
    }
  };

  return (
    <div className="current-affairs-hub-root" role="region" aria-label="Live Current Affairs Desk">
      {/* 1. TOP HEADER & LIVE STATUS BAR */}
      <div className="ca-top-header">
        <div className="ca-title-group">
          <div className="ca-live-badge-row">
            <span className="ca-pulsing-dot" aria-hidden="true" />
            <span className="ca-live-text">LIVE DESK</span>
            <span className="ca-updated-pill">
              <Clock size={12} />
              <span>{lastRefreshedTime}</span>
            </span>
          </div>
          <h2 className="ca-main-heading">
            {selectedLanguage === 'Odia'
              ? 'ଦୈନିକ ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ (Live Current Affairs)'
              : selectedLanguage === 'Hindi'
              ? 'दैनिक समसामयिक घटनाक्रम (Live Current Affairs)'
              : 'Daily Live Current Affairs & Exam GK Desk'}
          </h2>
          <p className="ca-sub-heading">
            Up-to-the-minute verified developments, UPSC/SSC/Banking syllabus relevance, static GK links & daily speed quiz
          </p>
        </div>

        <div className="ca-header-actions">
          {/* Auto-Sync Dropdown */}
          <div className="ca-sync-selector" title="Choose auto-refresh frequency">
            <Radio size={14} className="ca-sync-icon" />
            <select
              value={autoSyncInterval}
              onChange={(e) => setAutoSyncInterval(Number(e.target.value))}
              className="ca-select-field"
            >
              <option value={0}>Auto-Sync: Off</option>
              <option value={180}>Auto-Sync: 3 mins</option>
              <option value={300}>Auto-Sync: 5 mins</option>
              <option value={600}>Auto-Sync: 10 mins</option>
              <option value={1800}>Auto-Sync: 30 mins</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            className="ca-btn-action"
            onClick={() => loadFeed(true)}
            disabled={loading}
            title="Refresh current affairs now"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Updating...' : 'Refresh'}</span>
          </button>

          {/* Audio Briefing */}
          <button
            type="button"
            className={`ca-btn-action ${isSpeakingAll ? 'active-audio' : ''}`}
            onClick={handleListenDigest}
            title="Listen to top stories digest aloud"
          >
            {isSpeakingAll ? <Square size={15} /> : <Volume2 size={15} />}
            <span>{isSpeakingAll ? 'Stop Audio' : 'Audio Briefing'}</span>
          </button>

          {/* Speed Quiz Button */}
          {quizList.length > 0 && (
            <button
              type="button"
              className="ca-btn-action ca-btn-quiz"
              onClick={handleStartQuiz}
              title="Take 5-question speed quiz on today's news"
            >
              <Award size={15} />
              <span>Speed Quiz ({quizList.length} Qs)</span>
            </button>
          )}

          {/* Download Digest */}
          <button
            type="button"
            className="ca-btn-action"
            onClick={handleDownloadDigest}
            title="Download formatted text digest"
          >
            <Download size={15} />
            <span>Digest</span>
          </button>
        </div>
      </div>

      {/* 2. BREAKING NEWS SCROLLING TICKER */}
      {data?.breaking_ticker && data.breaking_ticker.length > 0 && (
        <div className="ca-breaking-ticker-bar" role="marquee" aria-live="polite">
          <div className="ticker-label">
            <Flame size={14} />
            <span>BREAKING</span>
          </div>
          <div className="ticker-content-track">
            <span className="ticker-item-text">
              {data.breaking_ticker[activeTickerIndex]}
            </span>
          </div>
          <div className="ticker-nav-controls">
            <button
              type="button"
              className="btn-ticker-arrow"
              onClick={() =>
                setActiveTickerIndex((prev) =>
                  prev === 0 ? data.breaking_ticker.length - 1 : prev - 1
                )
              }
              title="Previous Headline"
            >
              ‹
            </button>
            <span className="ticker-count">
              {activeTickerIndex + 1}/{data.breaking_ticker.length}
            </span>
            <button
              type="button"
              className="btn-ticker-arrow"
              onClick={() =>
                setActiveTickerIndex((prev) => (prev + 1) % data.breaking_ticker.length)
              }
              title="Next Headline"
            >
              ›
            </button>
          </div>
        </div>
      )}

      {/* 3. CATEGORY PILLS */}
      <div className="ca-categories-row" role="tablist">
        {[
          { key: 'all', label: '🌟 All Topics' },
          { key: 'national', label: '🇮🇳 National & Governance' },
          { key: 'international', label: '🌍 International Affairs' },
          { key: 'science', label: '🔬 Science, Tech & Space' },
          { key: 'economy', label: '💼 Economy & Banking' },
          { key: 'sports', label: '🏆 Sports & Honors' },
        ].map((cat) => (
          <button
            key={cat.key}
            type="button"
            className={`ca-category-pill ${category === cat.key && !showBookmarksOnly ? 'active' : ''}`}
            onClick={() => {
              setShowBookmarksOnly(false);
              setCategory(cat.key);
            }}
          >
            {cat.label}
          </button>
        ))}

        <button
          type="button"
          className={`ca-category-pill ca-bookmark-filter ${showBookmarksOnly ? 'active' : ''}`}
          onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
          title="Show saved bookmarked current affairs"
        >
          <Bookmark size={14} />
          <span>Saved Bookmarks ({bookmarkedIds.length})</span>
        </button>
      </div>

      {/* 4. SEARCH & EXAM TAGS FILTER */}
      <div className="ca-filter-toolbar">
        <div className="ca-search-input-wrap">
          <Search size={16} className="ca-search-icon" />
          <input
            type="text"
            className="ca-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search headlines, keywords, or exam tags (e.g. UPSC, ISRO, RBI, Budget)..."
          />
          {searchQuery && (
            <button
              type="button"
              className="btn-clear-search"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>

        <div className="ca-exam-tags-row">
          <span className="ca-tags-label">Exam Filters:</span>
          {['all', 'UPSC', 'SSC', 'Banking', 'Defense', 'State PSC', 'Ecology'].map((tag) => (
            <button
              key={tag}
              type="button"
              className={`ca-tag-chip ${selectedExamTag === tag ? 'active' : ''}`}
              onClick={() => setSelectedExamTag(tag)}
            >
              #{tag.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 5. CURRENT AFFAIRS ARTICLE CARDS */}
      <div className="ca-articles-container">
        {loading ? (
          <div className="ca-loading-state">
            <RefreshCw size={32} className="animate-spin ca-spinner-icon" />
            <p className="ca-loading-text">Fetching live real-time feeds & educational GK facts...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="ca-empty-state">
            <BookOpen size={40} style={{ opacity: 0.5, marginBottom: '0.75rem' }} />
            <h3>No Current Affairs match your filter</h3>
            <p>Try resetting the search query or selecting a different category.</p>
            <button
              type="button"
              className="ca-btn-action"
              onClick={() => {
                setSearchQuery('');
                setSelectedExamTag('all');
                setShowBookmarksOnly(false);
                setCategory('all');
              }}
              style={{ marginTop: '0.75rem' }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="ca-cards-grid">
            {filteredItems.map((item) => {
              const isBookmarked = bookmarkedIds.includes(item.id);
              const isSpeakingThis = speakingItemId === item.id;
              const isExpanded = !!expandedTakeaways[item.id];

              return (
                <article key={item.id} className="ca-card">
                  {/* Card Meta Bar */}
                  <div className="ca-card-top-meta">
                    <span className="ca-card-category-badge">{item.category}</span>
                    <div className="ca-card-source-time">
                      <span className="ca-source-tag">{item.source}</span>
                      <span className="ca-time-tag">
                        <Clock size={11} />
                        <span>{item.published_at}</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`btn-card-bookmark ${isBookmarked ? 'active' : ''}`}
                      onClick={() => toggleBookmark(item.id)}
                      title={isBookmarked ? 'Remove Bookmark' : 'Save for Revision'}
                    >
                      {isBookmarked ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
                    </button>
                  </div>

                  {/* Headline */}
                  <h3 className="ca-card-title">{item.title}</h3>

                  {/* Summary */}
                  <p className="ca-card-summary">{item.summary}</p>

                  {/* Exam Tags */}
                  {item.exam_relevance && item.exam_relevance.length > 0 && (
                    <div className="ca-card-exam-tags">
                      {item.exam_relevance.map((tag, idx) => (
                        <span key={idx} className="ca-exam-pill">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Static GK Connection Box */}
                  {item.static_gk_fact && (
                    <div className="ca-static-gk-box">
                      <div className="ca-static-gk-header">
                        <ShieldCheck size={14} style={{ color: '#06b6d4' }} />
                        <span>Static GK Background for Exams</span>
                      </div>
                      <p className="ca-static-gk-text">{item.static_gk_fact}</p>
                    </div>
                  )}

                  {/* Key Takeaways Expandable */}
                  {item.key_takeaways && item.key_takeaways.length > 0 && (
                    <div className="ca-takeaways-container">
                      <button
                        type="button"
                        className="btn-toggle-takeaways"
                        onClick={() =>
                          setExpandedTakeaways((prev) => ({
                            ...prev,
                            [item.id]: !prev[item.id],
                          }))
                        }
                      >
                        <BookOpen size={13} />
                        <span>
                          {isExpanded ? 'Hide Key Takeaways' : 'View Key Exam Takeaways'}
                        </span>
                        <span className="arrow-indicator">{isExpanded ? '▲' : '▼'}</span>
                      </button>

                      {isExpanded && (
                        <ul className="ca-takeaways-list">
                          {item.key_takeaways.map((tk, idx) => (
                            <li key={idx}>
                              <span className="bullet-dot">•</span>
                              <span>{tk}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Card Actions Footer */}
                  <div className="ca-card-footer">
                    <button
                      type="button"
                      className={`btn-card-audio ${isSpeakingThis ? 'speaking' : ''}`}
                      onClick={() => handleListenItem(item)}
                      title="Listen to this article"
                    >
                      {isSpeakingThis ? <Square size={13} /> : <Volume2 size={13} />}
                      <span>{isSpeakingThis ? 'Stop' : 'Listen'}</span>
                    </button>

                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-card-external"
                        title="Read full article on source portal"
                      >
                        <span>Full Source</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. DAILY SPEED QUIZ MODAL */}
      {isQuizModalOpen && quizList.length > 0 && (
        <div className="ca-modal-overlay" role="dialog" aria-modal="true">
          <div className="ca-quiz-modal-card">
            <div className="ca-quiz-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} style={{ color: '#f59e0b' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                  Daily Current Affairs Speed Quiz
                </h3>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setIsQuizModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {!quizCompleted ? (
              <div className="ca-quiz-body">
                <div className="ca-quiz-progress-bar">
                  <div
                    className="ca-quiz-progress-fill"
                    style={{
                      width: `${((currentQuizIndex + 1) / quizList.length) * 100}%`,
                    }}
                  />
                </div>
                <div className="ca-quiz-meta-row">
                  <span className="ca-quiz-q-num">
                    Question {currentQuizIndex + 1} of {quizList.length}
                  </span>
                  <span className="ca-quiz-score-pill">
                    Score: {quizScore}
                  </span>
                </div>

                <p className="ca-quiz-question-text">
                  {quizList[currentQuizIndex].question}
                </p>

                <div className="ca-quiz-options-list">
                  {quizList[currentQuizIndex].options.map((opt, optIdx) => {
                    const isSelected = selectedOption === optIdx;
                    const isCorrect = optIdx === quizList[currentQuizIndex].correct_index;
                    let optClass = 'ca-quiz-option-btn';

                    if (isAnswerSubmitted) {
                      if (isCorrect) optClass += ' correct';
                      else if (isSelected && !isCorrect) optClass += ' wrong';
                    } else if (isSelected) {
                      optClass += ' selected';
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        className={optClass}
                        onClick={() => handleSelectQuizOption(optIdx)}
                        disabled={isAnswerSubmitted}
                      >
                        <span className="opt-letter">
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="opt-text">{opt}</span>
                        {isAnswerSubmitted && isCorrect && (
                          <CheckCircle size={16} className="opt-feedback-icon" />
                        )}
                        {isAnswerSubmitted && isSelected && !isCorrect && (
                          <XCircle size={16} className="opt-feedback-icon" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {isAnswerSubmitted && (
                  <div className="ca-quiz-explanation-box">
                    <p className="exp-label">Explanation:</p>
                    <p className="exp-text">
                      {quizList[currentQuizIndex].explanation}
                    </p>
                  </div>
                )}

                <div className="ca-quiz-footer-actions">
                  {isAnswerSubmitted && (
                    <button
                      type="button"
                      className="btn-next-question"
                      onClick={handleNextQuizQuestion}
                    >
                      {currentQuizIndex + 1 < quizList.length ? 'Next Question →' : 'View Results'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="ca-quiz-results-body">
                <div className="results-trophy-icon">🏆</div>
                <h3 className="results-title">Quiz Completed!</h3>
                <p className="results-score-text">
                  You scored <strong>{quizScore}</strong> out of{' '}
                  <strong>{quizList.length}</strong>!
                </p>
                <p className="results-praise">
                  {quizScore === quizList.length
                    ? '🌟 Outstanding! You are completely up to date with today\'s current affairs!'
                    : quizScore >= 3
                    ? '👍 Good job! Review the takeaways to master today\'s exam GK.'
                    : 'Keep learning! Review the key static facts and try again.'}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="ca-btn-action"
                    onClick={handleStartQuiz}
                  >
                    <RefreshCw size={14} />
                    <span>Retake Quiz</span>
                  </button>
                  {onNavigateTab && (
                    <button
                      type="button"
                      className="ca-btn-action"
                      onClick={() => {
                        setIsQuizModalOpen(false);
                        onNavigateTab('battle-quiz');
                      }}
                    >
                      <Award size={14} />
                      <span>Battle Quiz Arena</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-next-question"
                    style={{ width: 'auto', minWidth: '90px' }}
                    onClick={() => setIsQuizModalOpen(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
