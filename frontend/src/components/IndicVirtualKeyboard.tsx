import React, { useState } from 'react';
import { Delete, Space, X, Globe, Sparkles } from 'lucide-react';

export type IndicLanguage = 'Odia' | 'Hindi';

interface IndicVirtualKeyboardProps {
  language: IndicLanguage;
  onLanguageChange?: (lang: IndicLanguage) => void;
  onInsertChar: (char: string) => void;
  onBackspace: () => void;
  onClear?: () => void;
  onClose?: () => void;
}

export const IndicVirtualKeyboard: React.FC<IndicVirtualKeyboardProps> = ({
  language,
  onLanguageChange,
  onInsertChar,
  onBackspace,
  onClear,
  onClose,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'consonants' | 'vowels' | 'matras' | 'numbers' | 'phrases'>('all');

  // Odia Character Sets
  const odiaData = {
    vowels: ['ଅ', 'ଆ', 'ଇ', 'ଈ', 'ଉ', 'ଊ', 'ଋ', 'ଏ', 'ଐ', 'ଓ', 'ଔ'],
    matras: ['ା', 'ି', 'ୀ', 'ୁ', 'ୂ', 'ୃ', 'େ', 'ୈ', 'ୋ', 'ୌ', '୍', 'ଂ', 'ଃ', 'ଁ'],
    consonants: [
      // Ka varga
      'କ', 'ଖ', 'ଗ', 'ଘ', 'ଙ',
      // Cha varga
      'ଚ', 'ଛ', 'ଜ', 'ଝ', 'ଞ',
      // Ta varga
      'ଟ', 'ଠ', 'ଡ', 'ଢ', 'ଣ',
      // Ta varga (dental)
      'ତ', 'ଥ', 'ଦ', 'ଧ', 'ନ',
      // Pa varga
      'ପ', 'ଫ', 'ବ', 'ଭ', 'ମ',
      // Semivowels & Sibilants
      'ଯ', 'ୟ', 'ର', 'ଳ', 'ୱ',
      'ଶ', 'ଷ', 'ସ', 'ହ', 'କ୍ଷ',
      'ଡ଼', 'ଢ଼', 'ଽ'
    ],
    numbers: ['୦', '୧', '୨', '୩', '୪', '୫', '୬', '୭', '୮', '୯'],
    symbols: ['।', '॥', '+', '-', '×', '÷', '=', '?', '!', '%', '(', ')', '/'],
    phrases: [
      'କଣ ଏବଂ କିପରି?',
      'ଉଦାହରଣ ସହିତ ବୁଝାନ୍ତୁ',
      'ସୂତ୍ର କଣ?',
      'ମାଧ୍ୟାକର୍ଷଣ ବଳ',
      'ଆଲୋକ ସଂଶ୍ଳେଷଣ',
      'ପଦାର୍ଥ ବିଜ୍ଞାନ',
      'ଜୀବ ବିଜ୍ଞାନ',
      'ଗଣିତ ସମାଧାନ'
    ]
  };

  // Hindi Character Sets
  const hindiData = {
    vowels: ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ए', 'ऐ', 'ओ', 'औ', 'अं', 'अः'],
    matras: ['ा', 'ि', 'ी', 'ु', 'ू', 'ृ', 'े', 'ै', 'ो', 'ौ', '्', 'ं', 'ः', 'ँ'],
    consonants: [
      // Ka varga
      'क', 'ख', 'ग', 'घ', 'ङ',
      // Cha varga
      'च', 'छ', 'ज', 'झ', 'ञ',
      // Ta varga
      'ट', 'ठ', 'ड', 'ढ', 'ण',
      // Ta varga (dental)
      'त', 'थ', 'द', 'ध', 'न',
      // Pa varga
      'प', 'फ', 'ब', 'भ', 'म',
      // Semivowels & Sibilants
      'य', 'र', 'ल', 'व',
      'श', 'ष', 'स', 'ह',
      'क्ष', 'त्र', 'ज्ञ', 'श्र',
      'ड़', 'ढ़', 'ऽ'
    ],
    numbers: ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'],
    symbols: ['।', '॥', '+', '-', '×', '÷', '=', '?', '!', '%', '(', ')', '/'],
    phrases: [
      'क्या है और कैसे काम करता है?',
      'उदाहरण सहित समझाइए',
      'सूत्र क्या है?',
      'गुरुत्वाकर्षण बल',
      'प्रकाश संश्लेषण',
      'भौतिकी',
      'जीव विज्ञान',
      'गणितीय हल'
    ]
  };

  const current = language === 'Odia' ? odiaData : hindiData;

  const renderKey = (char: string, extraClass: string = '') => (
    <button
      key={char}
      type="button"
      className={`indic-key ${extraClass}`}
      onClick={(e) => {
        e.preventDefault();
        onInsertChar(char);
      }}
      title={`Insert ${char}`}
    >
      {char}
    </button>
  );

  return (
    <div className="indic-keyboard-container" role="region" aria-label={`${language} On-Screen Keyboard`}>
      {/* Keyboard Header */}
      <div className="indic-keyboard-header">
        <div className="indic-keyboard-title-group">
          <span className="indic-flag-icon">🇮🇳</span>
          <span className="indic-keyboard-title">
            {language === 'Odia' ? 'ଓଡ଼ିଆ ଅନ୍-ସ୍କ୍ରିନ୍ କୀବୋର୍ଡ (Odia Keyboard)' : 'हिन्दी ऑन-स्क्रीन कीबोर्ड (Hindi Keyboard)'}
          </span>
          <span className="indic-layout-badge">
            {language === 'Odia' ? 'ଉତ୍କଳ ଲେଖନୀ' : 'देवनागरी'}
          </span>
        </div>

        <div className="indic-keyboard-actions">
          {onLanguageChange && (
            <button
              type="button"
              className="btn-switch-lang"
              onClick={() => onLanguageChange(language === 'Odia' ? 'Hindi' : 'Odia')}
              title="Switch keyboard language"
            >
              <Globe size={14} />
              <span>{language === 'Odia' ? 'हिन्दी में बदलें' : 'ଓଡ଼ିଆରେ ବଦଳାନ୍ତୁ'}</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              className="btn-close-keyboard"
              onClick={onClose}
              title="Close Keyboard"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="indic-keyboard-tabs">
        <button
          type="button"
          className={`indic-tab ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          {language === 'Odia' ? 'ସମସ୍ତ (All)' : 'सभी (All)'}
        </button>
        <button
          type="button"
          className={`indic-tab ${activeCategory === 'consonants' ? 'active' : ''}`}
          onClick={() => setActiveCategory('consonants')}
        >
          {language === 'Odia' ? 'ବ୍ୟଞ୍ଜନ (Consonants)' : 'व्यंजन (Consonants)'}
        </button>
        <button
          type="button"
          className={`indic-tab ${activeCategory === 'vowels' ? 'active' : ''}`}
          onClick={() => setActiveCategory('vowels')}
        >
          {language === 'Odia' ? 'ସ୍ୱର (Vowels)' : 'स्वर (Vowels)'}
        </button>
        <button
          type="button"
          className={`indic-tab ${activeCategory === 'matras' ? 'active' : ''}`}
          onClick={() => setActiveCategory('matras')}
        >
          {language === 'Odia' ? 'ମାତ୍ରା (Matras)' : 'मात्राएं (Matras)'}
        </button>
        <button
          type="button"
          className={`indic-tab ${activeCategory === 'numbers' ? 'active' : ''}`}
          onClick={() => setActiveCategory('numbers')}
        >
          {language === 'Odia' ? 'ସଂଖ୍ୟା (Numbers)' : 'संख्या (Numbers)'}
        </button>
        <button
          type="button"
          className={`indic-tab ${activeCategory === 'phrases' ? 'active' : ''}`}
          onClick={() => setActiveCategory('phrases')}
        >
          <Sparkles size={12} className="inline mr-1" />
          {language === 'Odia' ? 'ଦ୍ରୁତ ଶବ୍ଦ (Phrases)' : 'त्वरित शब्द (Phrases)'}
        </button>
      </div>

      {/* Quick Phrases View */}
      {activeCategory === 'phrases' && (
        <div className="indic-phrases-grid">
          {current.phrases.map((phrase, idx) => (
            <button
              key={idx}
              type="button"
              className="indic-phrase-chip"
              onClick={(e) => {
                e.preventDefault();
                onInsertChar(phrase + ' ');
              }}
            >
              + {phrase}
            </button>
          ))}
        </div>
      )}

      {/* Main Keys Area */}
      {activeCategory !== 'phrases' && (
        <div className="indic-keys-layout">
          {/* Vowels & Matras Row (shown on 'all', 'vowels', 'matras') */}
          {(activeCategory === 'all' || activeCategory === 'vowels') && (
            <div className="indic-key-section">
              <span className="indic-section-label">
                {language === 'Odia' ? 'ସ୍ୱରବର୍ଣ୍ଣ (Vowels):' : 'स्वर (Vowels):'}
              </span>
              <div className="indic-keys-row">
                {current.vowels.map((c) => renderKey(c, 'key-vowel'))}
              </div>
            </div>
          )}

          {(activeCategory === 'all' || activeCategory === 'matras') && (
            <div className="indic-key-section">
              <span className="indic-section-label">
                {language === 'Odia' ? 'ମାତ୍ରା ଓ ଚିହ୍ନ (Matras & Marks):' : 'मात्राएं व चिह्न (Matras & Marks):'}
              </span>
              <div className="indic-keys-row">
                {current.matras.map((c) => renderKey(c, 'key-matra'))}
              </div>
            </div>
          )}

          {/* Consonants (shown on 'all' or 'consonants') */}
          {(activeCategory === 'all' || activeCategory === 'consonants') && (
            <div className="indic-key-section">
              <span className="indic-section-label">
                {language === 'Odia' ? 'ବ୍ୟଞ୍ଜନବର୍ଣ୍ଣ (Consonants):' : 'व्यंजन वर्ण (Consonants):'}
              </span>
              <div className="indic-keys-grid">
                {current.consonants.map((c) => renderKey(c, 'key-consonant'))}
              </div>
            </div>
          )}

          {/* Numbers & Punctuation (shown on 'all' or 'numbers') */}
          {(activeCategory === 'all' || activeCategory === 'numbers') && (
            <div className="indic-key-section">
              <span className="indic-section-label">
                {language === 'Odia' ? 'ସଂଖ୍ୟା ଓ ଗାଣିତିକ ଚିହ୍ନ (Digits & Symbols):' : 'संख्या व गणितीय चिह्न (Digits & Symbols):'}
              </span>
              <div className="indic-keys-row">
                {current.numbers.map((c) => renderKey(c, 'key-number'))}
                {current.symbols.map((c) => renderKey(c, 'key-symbol'))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Command Bar: Space, Backspace, Clear, Danda */}
      <div className="indic-control-bar">
        {onClear && (
          <button
            type="button"
            className="btn-indic-ctrl btn-clear"
            onClick={onClear}
            title="Clear all text"
          >
            {language === 'Odia' ? 'ସଫା କରନ୍ତୁ' : 'साफ करें'}
          </button>
        )}

        <button
          type="button"
          className="btn-indic-ctrl btn-danda"
          onClick={() => onInsertChar(' । ')}
          title="Insert Purna Virama / Danda"
        >
          । (ଦାଣ୍ଡି / विराम)
        </button>

        <button
          type="button"
          className="btn-indic-ctrl btn-space"
          onClick={() => onInsertChar(' ')}
          title="Spacebar"
        >
          <Space size={16} />
          <span>{language === 'Odia' ? 'ଖାଲି ଜାଗା (Space)' : 'स्पेस (Space)'}</span>
        </button>

        <button
          type="button"
          className="btn-indic-ctrl btn-backspace"
          onClick={onBackspace}
          title="Delete previous character"
        >
          <Delete size={16} />
          <span>{language === 'Odia' ? 'ମିଟାନ୍ତୁ (Backspace)' : 'मिटाएं (Backspace)'}</span>
        </button>
      </div>
    </div>
  );
};
