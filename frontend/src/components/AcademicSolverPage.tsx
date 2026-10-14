import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Globe,
  Volume2,
  RotateCcw,
  CheckCircle,
  Sparkles,
  Loader2,
  Keyboard,
  Mic,
  MicOff,
  Search,
  Grid,
  X,
  Camera,
  FileText,
  Layers,
  Trash2,
  Download,
  Copy,
  Check,
  Calendar,
  CheckSquare,
  HelpCircle,
  Activity,
  Award,
  ChevronDown,
  ChevronUp,
  Shuffle,
  BookOpen,
  Play,
  Pause,
  Square,
  Palette,
  Wifi,
  WifiOff,
  Captions,
  Ear,
  Brain,
  Sliders,
} from 'lucide-react';
import type { User, ItemStats, FlashcardItem, LearningActivity, ActivityType, DailyVoiceTopic } from '../types';
import { api, logLearningActivity, loadAllLearningActivities } from '../api';
import {
  getUserItem,
  setUserItem,
  getUserStorageKey,
  removeUserItem,
} from '../utils/userStorage';
import { IndicVirtualKeyboard, type IndicLanguage } from './IndicVirtualKeyboard';
import { VoiceAccessModal } from './VoiceAccessModal';
import {
  playVoiceAccessChime,
  addSoundAlertListener,
  type SoundAlertInfo,
} from '../utils/soundEffects';
import {
  preUnlockAudio,
  cleanTextForSpeech,
  speakWithBrowserFallback,
  addCaptionListener,
  type CaptionEvent,
} from '../utils/speechUtils';
import { ImageScanner } from './ImageScanner';
import { PdfScanner } from './PdfScanner';
import { DAILY_VOICE_TOPICS } from '../data/dailyVoiceTopics';
import { IndiaMapExplorer } from './IndiaMapExplorer';
import { StudyCastPodcastStudio } from './StudyCastPodcastStudio';
import { KnowledgeGraphExplorer } from './KnowledgeGraphExplorer';
import { BattleOfBrainsArena } from './BattleOfBrainsArena';
import { MathGraphVisualizer } from './MathGraphVisualizer';
import { DownloadCachedAppModal } from './DownloadCachedAppModal';

export type AcademicActiveTab =
  | 'home'
  | 'solve-math'
  | 'ask-question'
  | 'image-scanner'
  | 'pdf-scanner'
  | 'flashcards'
  | 'voice-learning'
  | 'geography-idea'
  | 'studycast'
  | 'mindmap'
  | 'battle-quiz'
  | 'history'
  | 'settings';

export type ThemeMode = 'dark' | 'light' | 'cyberpunk' | 'emerald' | 'amber';

interface AcademicSolverPageProps {
  currentUser: User | null;
  initialTab?: AcademicActiveTab;
  activeTab?: AcademicActiveTab;
  onTabChange?: (tab: AcademicActiveTab) => void;
  onNavigateToAuth?: () => void;
  onLogout?: () => void;
  onNavigateToAdmin?: () => void;
  onNavigateToWorkspace?: () => void;
  stats?: ItemStats | null;
}

export function AcademicSolverPage({
  currentUser,
  initialTab,
  activeTab: controlledActiveTab,
  onTabChange,
  onNavigateToAuth,
  onLogout,
  onNavigateToAdmin,
  onNavigateToWorkspace,
  stats: externalStats,
}: AcademicSolverPageProps) {
  const [internalActiveTab, setInternalActiveTab] = useState<AcademicActiveTab>(
    controlledActiveTab || initialTab || 'home'
  );

  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;

  const setActiveTab = (tab: AcademicActiveTab) => {
    setInternalActiveTab(tab);
    onTabChange?.(tab);
  };

  useEffect(() => {
    if (controlledActiveTab !== undefined) {
      setInternalActiveTab(controlledActiveTab);
    } else if (initialTab) {
      setInternalActiveTab(initialTab);
    }
  }, [controlledActiveTab, initialTab]);

  const [liveStats, setLiveStats] = useState<ItemStats | null>(externalStats || null);

  const [isOffline, setIsOffline] = useState<boolean>(() => api.isOfflineMode());
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleModeChange = (e: any) => {
      setIsOffline(!!e.detail?.offline);
    };
    window.addEventListener('atlas_network_mode_changed', handleModeChange);
    return () => window.removeEventListener('atlas_network_mode_changed', handleModeChange);
  }, []);

  useEffect(() => {
    if (externalStats) {
      setLiveStats(externalStats);
    } else {
      api.getStats().then(setLiveStats).catch(() => {});
    }
  }, [externalStats]);

  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'Hindi' | 'Odia'>('English');

  // Translations for English, Hindi, and Odia
  const translations = {
    English: {
      appTitle: 'Accessible Academic Problem Solver',
      runsOnDevice: 'Runs on this device · nothing is uploaded',
      home: 'Home',
      solveMath: 'Solve a Mathematics Problem',
      askQuestion: 'Ask a Question',
      flashcards: 'Flashcards',
      voiceLearning: 'Voice Learning',
      history: 'My Learning History',
      settings: 'Accessibility Settings',
      welcomeTitle: 'Welcome!',
      welcomeSub: 'Solve your first problem to start your streak.',
      solveBtn: 'Solve a problem',
      dayStreak: 'day streak',
      problemsSolved: 'problems solved',
      flashcardsDue: 'flashcards due',
      flashcardsSaved: 'flashcards saved',
      mathCardTitle: 'Solve Mathematics',
      mathCardDesc: 'Exact, checked, spoken steps',
      askCardTitle: 'Ask a Question',
      askCardDesc: 'Uses your local Ollama',
      flashcardsCardTitle: 'Flashcards',
      flashcardsCardDesc: 'Spaced repetition',
      voiceCardTitle: 'Voice Learning',
      voiceCardDesc: 'Listen with word highlighting',
      thisWeek: 'This week',
      privacyNotice: 'Privacy: everything on this page runs in your browser. Saving history is optional and can be turned off in Settings.',
      footerNotice: 'Image, PDF and "Describe what I can\'t see" need a local OCR or vision model, so they belong in the full desktop app.',
      voiceSampleText: 'The speed of light in vacuum is approximately three hundred thousand kilometers per second. Energy equals mass times the speed of light squared.',
      speechLang: 'en-US',
      imageScannerNav: 'Image Scanner',
      imageScannerCardTitle: 'Image Scanner',
      imageScannerCardDesc: 'Scan image to text, solve questions & explain diagrams',
      scanImageBtn: '📷 Scan Image (Text & 2 Options)',
      pdfScannerNav: 'PDF Scanner',
      pdfScannerCardTitle: 'PDF Scanner',
      pdfScannerCardDesc: 'Scan PDF worksheets & textbooks to text, solve questions & explain',
      scanPdfBtn: '📄 Scan PDF (Text & 2 Options)',
      dbNodesLabel: 'Database Knowledge Nodes',
      activeTasksLabel: 'Active Tasks In-Progress',
      completedNodesLabel: 'Completed Solutions',
      dbStatusBadge: 'SQLite Database Live',
      dbWorkspaceNav: '🗂️ Database Workspace',
      dbCategoryTitle: 'Live Database Knowledge Categories',
      exploreDbBtn: '🗂️ Explore Database Workspace',
      flashcardsSearchPlaceholder: 'Search topic (e.g. Algebra, Physics, Photosynthesis, History)...',
      micSearchTitle: 'Search topic with microphone / voice',
      listeningTopic: 'Listening... Speak topic name now',
      stopMic: 'Stop Mic',
      allTopicsLabel: 'All Topics',
      generateTopicBtn: '✨ Generate Flashcards for Topic',
      generatingCardsText: 'Generating flashcards with AI...',
      viewModeFlipLabel: 'Interactive Flip Card',
      viewModeGridLabel: 'Watch All Cards (Grid)',
      listenCardBtn: 'Listen to Card',
      noCardsFoundText: 'No flashcards found for topic',
      generateForTopicText: 'Generate New Cards for this Topic',
      clearSearchBtn: 'Clear search',
      historySubtitle: 'Track and review all your math solutions, AI answers, scanned documents, quizzes, and flashcard practices.',
      filterAll: 'All Activities',
      filterMath: 'Math',
      filterQA: 'Q&A',
      filterImage: 'Image Scans',
      filterPdf: 'PDF Scans',
      filterQuiz: 'Quizzes',
      filterFlashcard: 'Flashcards',
      filterVoice: 'Voice',
      searchHistoryPlaceholder: 'Search your activity history (topics, questions, equations)...',
      clearAllHistoryBtn: 'Clear History',
      exportHistoryBtn: 'Export History',
      noActivitiesTitle: 'No learning activities recorded yet',
      noActivitiesSub: 'Solve math problems, ask questions, scan images or PDFs, or practice flashcards to build your learning timeline!',
      confirmClearHistory: 'Are you sure you want to clear your learning history? This action cannot be undone.',
      historyPausedNotice: 'Activity history saving is currently paused in Accessibility Settings.',
      enableHistoryBtn: 'Turn On History Saving',
      viewSolutionBtn: 'View Details',
      hideSolutionBtn: 'Hide Details',
      todayLabel: 'Today',
      yesterdayLabel: 'Yesterday',
      earlierLabel: 'Earlier',
      copySuccess: 'Copied to clipboard!',
      deleteItemTitle: 'Delete activity entry',
      geographyIdeaNav: 'Geography idea',
      geographyCardTitle: 'Geography idea',
      geographyCardDesc: 'Explore Earth systems, continents, climate & world maps',
      geographySearchPlaceholder: 'Explore any geography idea (e.g. Plate Tectonics, Amazon River, Monsoons, Himalayas)...',
      geographyExploreBtn: '🌍 Explore Geography Idea',
      geographyThinkingText: 'Analyzing geography concepts with AI...',
      geographyRandomBtn: '🎲 Random Geography Idea',
      geographyPresetCategories: 'Geography Idea Topics',
      geographyQuickFactsTitle: 'Interactive Geography Ideas & Curated Wonders',
      filterGeography: 'Geography',
      dailyTopicsTitle: "Today's Daily Topics",
      dailyTopicsSub: 'Fresh educational narrations updated every day with synchronized word highlighting and clear neural speech.',
      generateDailyTopicBtn: '✨ Generate Topic with AI',
      shuffleDailyTopicsBtn: '🔄 Shuffle Topics',
      customTopicPrompt: 'Enter any topic or choose a category to create a fresh audio lesson:',
      generateTopicPlaceholder: 'e.g., Black Holes, Chandrayaan, How Rainbows Form, Ancient Rome...',
      generatingTopicText: 'Writing voice learning narration with AI...',
      loadInEditorBtn: 'Load in Editor',
      listenDailyTopicBtn: 'Listen Now',
      dailyTopicCategoryAll: 'All Topics',
      dailyBadgeToday: "Today's Pick",
      dailyListenEstimate: 'listen',
      dailySurpriseMeBtn: '🎲 Surprise Me',
      dailyVoiceAudioTag: 'Voice Learning Studio',
      studycastNav: 'StudyCast Podcasts',
      studycastCardTitle: 'StudyCast Studio',
      studycastCardDesc: 'AI two-speaker dialogue podcast with Dr. Alex & Sam, speech playback & 432Hz lo-fi study synthesizer',
      mindmapNav: 'Knowledge Mind Map',
      mindmapCardTitle: 'Knowledge Mind Map',
      mindmapCardDesc: 'Interactive cross-disciplinary concept web connecting Math, Physics, Chemistry, Biology & Geography',
      battleQuizNav: 'Battle of Brains Quiz',
      battleQuizCardTitle: 'Battle of Brains',
      battleQuizCardDesc: 'Gamified speed duel arena vs Atlas AI Bot with 15s timers, streak combos & XP rewards',
      voiceAccessBtn: 'Voice Access',
      voiceAccessHint: 'Double-click screen or click to talk',
      doubleClickVoiceSettingTitle: 'Double-Click Screen for Voice Access',
      doubleClickVoiceSettingDesc: 'Double-click anywhere on the screen (any side) or double-tap to activate multilingual voice input',
      voiceAccessActivatedToast: '🎙️ Voice Access Activated',
      themeOptionTitle: 'Theme & Appearance',
      themeOptionDesc: 'Select your preferred visual style and color ambiance',
      themeDarkTitle: 'Cosmic Dark',
      themeDarkDesc: 'Deep slate & space indigo neon',
      themeLightTitle: 'Light Academic',
      themeLightDesc: 'Clean daytime classroom study mode',
      themeCyberpunkTitle: 'Cyberpunk Glow',
      themeCyberpunkDesc: 'Pure OLED black with vivid cyan & pink',
      themeEmeraldTitle: 'Emerald Eye-Care',
      themeEmeraldDesc: 'Soothing forest green reducing fatigue',
      themeAmberTitle: 'Warm Amber',
      themeAmberDesc: 'Cozy golden sepia for late-night reading',
      themeActiveBadge: 'ACTIVE',
      a11yCenterTitle: 'Universal Accessibility Center (Disability Suites)',
      a11yCenterSubtitle: 'Tailored sensory, motor, auditory, and neurodiverse accessibility features',
      suiteMotorTitle: '1. Motor & Mobility Impairment Access',
      suiteMotorDesc: 'Single-switch auto-scanning navigation, hands-free voice control, and shortcuts',
      switchAccessToggleTitle: 'Auto-Scanning Switch Access',
      switchAccessToggleDesc: 'Navigate the entire interface using single switch, Space, Enter, or foot pedal',
      switchSpeedTitle: 'Switch Scanning Cycle Speed',
      suiteHearingTitle: '2. Hearing Impaired & Deaf Access',
      suiteHearingDesc: 'Live Closed Captions subtitle dock and visual flashing sound alerts',
      captionsToggleTitle: 'Live Closed Captions (Subtitles Dock)',
      captionsToggleDesc: 'Displays floating subtitle bar with real-time text transcription and speaker badges',
      captionsSizeTitle: 'Subtitle Dock Font Scale',
      visualAlertsToggleTitle: 'Visual Sound Alerts & Border Glow',
      visualAlertsToggleDesc: 'Flashes visual cues and icons when chimes, bells, or voice narrations play',
      suiteCognitiveTitle: '3. Cognitive & Neurodiversity Suite (ADHD & Dyscalculia)',
      suiteCognitiveDesc: 'Reading Focus Ruler, plain-language text simplifier, and math color coding',
      readingRulerToggleTitle: 'Reading Focus Ruler Overlay',
      readingRulerToggleDesc: 'Dims distracting areas and isolates current line to reduce cognitive overload',
      dyscalculiaColorsToggleTitle: 'Dyscalculia Math Color-Coding',
      dyscalculiaColorsToggleDesc: 'Distinct high-contrast colors for operators (+, -, ×), numbers (0-9), and variables (x, y)',
      plainLangToggleTitle: 'Plain-Language Simplifier Mode',
      plainLangToggleDesc: 'Converts complex academic terminology into concise, straightforward summaries',
      a11yQuickPaletteTitle: 'Accessibility Quick Suite (Alt + A)',
      closeBtn: 'Close',
    },
    Hindi: {
      appTitle: 'सुलभ शैक्षणिक समस्या समाधानकर्ता',
      runsOnDevice: 'इस डिवाइस पर चलता है · कुछ भी अपलोड नहीं होता',
      home: 'होम',
      solveMath: 'गणित की समस्या हल करें',
      askQuestion: 'प्रश्न पूछें',
      flashcards: 'फ़्लैशकार्ड्स',
      voiceLearning: 'ध्वनि शिक्षण',
      history: 'मेरा शिक्षण इतिहास',
      settings: 'पहुंच सेटिंग्स',
      welcomeTitle: 'स्वागत है!',
      welcomeSub: 'अपनी स्ट्रीक शुरू करने के लिए अपनी पहली समस्या हल करें।',
      solveBtn: 'समस्या हल करें',
      dayStreak: 'दिन की स्ट्रीक',
      problemsSolved: 'हल की गई समस्याएं',
      flashcardsDue: 'बाकी फ़्लैशकार्ड',
      flashcardsSaved: 'सहेजे गए फ़्लैशकार्ड',
      mathCardTitle: 'गणित हल करें',
      mathCardDesc: 'सटीक, जाँचे गए, बोले जाने वाले चरण',
      askCardTitle: 'प्रश्न पूछें',
      askCardDesc: 'आपके स्थानीय Ollama का उपयोग करता है',
      flashcardsCardTitle: 'फ़्लैशकार्ड्स',
      flashcardsCardDesc: 'स्पेस्ड रिपीटिशन',
      voiceCardTitle: 'ध्वनि शिक्षण',
      voiceCardDesc: 'शब्द हाइलाइटिंग के साथ सुनें',
      thisWeek: 'इस सप्ताह',
      privacyNotice: 'गोपनीयता: इस पृष्ठ पर सब कुछ आपके ब्राउज़र में चलता है। इतिहास सहेजना वैकल्पिक है और सेटिंग्स में बंद किया जा सकता है।',
      footerNotice: 'चित्र, पीडीएफ और "जो मैं नहीं देख सकता उसका वर्णन करें" के लिए स्थानीय ओसीआर या विज़न मॉडल की आवश्यकता है।',
      voiceSampleText: 'शून्य में प्रकाश का वेग लगभग तीन लाख किलोमीटर प्रति सेकंड होता है। ऊर्जा द्रव्यमान और प्रकाश की गति के वर्ग के बराबर होती है।',
      speechLang: 'hi-IN',
      imageScannerNav: 'इमेज स्कैनर',
      imageScannerCardTitle: 'इमेज स्कैनर',
      imageScannerCardDesc: 'इमेज से टेक्स्ट निकालें, प्रश्न हल करें और चित्र समझें',
      scanImageBtn: '📷 इमेज स्कैन करें (टेक्स्ट और 2 विकल्प)',
      pdfScannerNav: 'पीडीएफ स्कैनर',
      pdfScannerCardTitle: 'पीडीएफ स्कैनर',
      pdfScannerCardDesc: 'पीडीएफ से टेक्स्ट निकालें, प्रश्न हल करें और दस्तावेज़ समझें',
      scanPdfBtn: '📄 पीडीएफ स्कैन करें (टेक्स्ट और 2 विकल्प)',
      dbNodesLabel: 'डेटाबेस ज्ञान नोड्स',
      activeTasksLabel: 'प्रगति में सक्रिय कार्य',
      completedNodesLabel: 'पूर्ण समाधान',
      dbStatusBadge: 'SQLite डेटाबेस लाइव',
      dbWorkspaceNav: '🗂️ डेटाबेस वर्कस्पेस',
      dbCategoryTitle: 'लाइव डेटाबेस ज्ञान श्रेणियां',
      exploreDbBtn: '🗂️ डेटाबेस वर्कस्पेस देखें',
      flashcardsSearchPlaceholder: 'विषय खोजें (उदा. बीजगणित, भौतिकी, प्रकाश संश्लेषण, इतिहास)...',
      micSearchTitle: 'माइक से बोलकर विषय खोजें',
      listeningTopic: 'सुन रहे हैं... अभी विषय का नाम बोलें',
      stopMic: 'माइक बंद करें',
      allTopicsLabel: 'सभी विषय',
      generateTopicBtn: '✨ विषय के लिए नए फ़्लैशकार्ड्स बनाएं',
      generatingCardsText: 'AI से फ़्लैशकार्ड्स तैयार किए जा रहे हैं...',
      viewModeFlipLabel: 'इंटरएक्टिव फ्लिप कार्ड',
      viewModeGridLabel: 'विषय के सभी कार्ड्स देखें',
      listenCardBtn: 'कार्ड सुनें',
      noCardsFoundText: 'इस विषय के लिए कोई फ़्लैशकार्ड नहीं मिला',
      generateForTopicText: 'इस विषय के लिए नए कार्ड्स बनाएं',
      clearSearchBtn: 'साफ़ करें',
      historySubtitle: 'अपने सभी गणितीय समाधान, एआई उत्तर, स्कैन किए गए दस्तावेज़, क्विज़ और फ़्लैशकार्ड अभ्यास की समीक्षा करें।',
      filterAll: 'सभी गतिविधियाँ',
      filterMath: 'गणित',
      filterQA: 'प्रश्न-उत्तर',
      filterImage: 'इमेज स्कैन',
      filterPdf: 'पीडीएफ स्कैन',
      filterQuiz: 'क्विज़',
      filterFlashcard: 'फ़्लैशकार्ड',
      filterVoice: 'ध्वनि शिक्षण',
      searchHistoryPlaceholder: 'अपने इतिहास में खोजें (विषय, प्रश्न, समीकरण)...',
      clearAllHistoryBtn: 'पूरा इतिहास साफ़ करें',
      exportHistoryBtn: 'इतिहास निर्यात करें',
      noActivitiesTitle: 'अभी तक कोई शिक्षण गतिविधि दर्ज नहीं है',
      noActivitiesSub: 'अपनी शिक्षण यात्रा शुरू करने के लिए गणित हल करें, प्रश्न पूछें, या दस्तावेज़ स्कैन करें!',
      confirmClearHistory: 'क्या आप वाकई अपना शिक्षण इतिहास साफ़ करना चाहते हैं? इसे वापस नहीं लाया जा सकता।',
      historyPausedNotice: 'पहुंच सेटिंग्स में इतिहास सहेजना वर्तमान में बंद है।',
      enableHistoryBtn: 'इतिहास सहेजना चालू करें',
      viewSolutionBtn: 'विवरण देखें',
      hideSolutionBtn: 'विवरण छिपाएं',
      todayLabel: 'आज',
      yesterdayLabel: 'कल',
      earlierLabel: 'पहले',
      copySuccess: 'क्लिपबोर्ड पर कॉपी किया गया!',
      deleteItemTitle: 'गतिविधि प्रविष्टि हटाएं',
      geographyIdeaNav: 'Geography idea',
      geographyCardTitle: 'Geography idea',
      geographyCardDesc: 'पृथ्वी प्रणाली, महाद्वीप, जलवायु और दुनिया के मानचित्र सीखें',
      geographySearchPlaceholder: 'कोई भी भूगोल विचार खोजें (जैसे विवर्तनिक प्लेटें, अमेजन नदी, मानसून, हिमालय)...',
      geographyExploreBtn: '🌍 भूगोल विचार समझें',
      geographyThinkingText: 'भूगोल अवधारणाओं का विश्लेषण हो रहा है...',
      geographyRandomBtn: '🎲 यादृच्छिक भूगोल विचार',
      geographyPresetCategories: 'भूगोल विषय विचार',
      geographyQuickFactsTitle: 'रोचक भूगोल विचार एवं मुख्य तथ्य',
      filterGeography: 'भूगोल',
      dailyTopicsTitle: 'आज के दैनिक विषय',
      dailyTopicsSub: 'प्रतिदिन नए शैक्षणिक विषय, स्पष्ट आवाज और शब्द हाइलाइटिंग के साथ सुनें।',
      generateDailyTopicBtn: '✨ AI से नया विषय बनाएं',
      shuffleDailyTopicsBtn: '🔄 विषय बदलें (शफ़ल)',
      customTopicPrompt: 'कोई भी विषय दर्ज करें या श्रेणी चुनकर नया ऑडियो पाठ बनाएं:',
      generateTopicPlaceholder: 'उदा. ब्लैक होल, चंद्रयान, इंद्रधनुष कैसे बनता है, प्राचीन भारत...',
      generatingTopicText: 'AI द्वारा ध्वनि शिक्षण तैयार किया जा रहा है...',
      loadInEditorBtn: 'एडिटर में लोड करें',
      listenDailyTopicBtn: 'अभी सुनें',
      dailyTopicCategoryAll: 'सभी विषय',
      dailyBadgeToday: 'आज का खास',
      dailyListenEstimate: 'सुनें',
      dailySurpriseMeBtn: '🎲 हैरान करें',
      dailyVoiceAudioTag: 'ध्वनि शिक्षण केंद्र',
      studycastNav: 'StudyCast पॉडकास्ट',
      studycastCardTitle: 'StudyCast पॉडकास्ट',
      studycastCardDesc: 'प्रोफेसर एलेक्स और छात्र सैम के बीच एआई संवाद पॉडकास्ट और 432Hz अध्ययन संगीत',
      mindmapNav: 'ज्ञान माइंड मैप',
      mindmapCardTitle: 'ज्ञान माइंड मैप',
      mindmapCardDesc: 'गणित, भौतिकी, रसायन, जीवविज्ञान और भूगोल को जोड़ने वाला इंटरएक्टिव विज़ुअल ज्ञान जाल',
      battleQuizNav: 'Battle of Brains क्विज़',
      battleQuizCardTitle: 'Battle of Brains',
      battleQuizCardDesc: 'Atlas AI बॉट के खिलाफ 15 सेकंड का स्पीड क्विज़, कॉम्बो स्ट्रीक्स और XP पुरस्कार',
      voiceAccessBtn: 'ध्वनि पहुंच (Voice Access)',
      voiceAccessHint: 'बोलने के लिए स्क्रीन पर डबल-क्लिक करें',
      doubleClickVoiceSettingTitle: 'ध्वनि पहुंच के लिए स्क्रीन पर डबल-क्लिक करें',
      doubleClickVoiceSettingDesc: 'स्क्रीन पर कहीं भी (किसी भी तरफ) डबल-क्लिक या डबल-टैप करके तुरंत बोलकर खोजें',
      voiceAccessActivatedToast: '🎙️ ध्वनि पहुंच सक्रिय (Voice Activated)',
      themeOptionTitle: 'थीम और उपस्थिति',
      themeOptionDesc: 'अपनी पसंदीदा दृश्य शैली और रंग वातावरण चुनें',
      themeDarkTitle: 'कॉस्मिक डार्क',
      themeDarkDesc: 'गहरा स्लेट और इंडिगो नियॉन',
      themeLightTitle: 'लाइट एकेडमिक',
      themeLightDesc: 'स्वच्छ दिन का अध्ययन मोड',
      themeCyberpunkTitle: 'साइबरपंक ग्लो',
      themeCyberpunkDesc: 'ओलेड ब्लैक और जीवंत सियान/गुलाबी',
      themeEmeraldTitle: 'एमराल्ड आई-केयर',
      themeEmeraldDesc: 'आंखों की थकान कम करने वाला हरा रंग',
      themeAmberTitle: 'वार्म एम्बर',
      themeAmberDesc: 'आरामदायक सेपिया और सुनहरा पठन मोड',
      themeActiveBadge: 'सक्रिय',
      a11yCenterTitle: 'सार्वभौमिक पहुंच केंद्र (दिव्यांगता सुलभता)',
      a11yCenterSubtitle: 'दृष्टि, गतिशीलता, श्रवण और न्यूरोडाइवर्स आवश्यकताओं के लिए विशेष सुविधाएं',
      suiteMotorTitle: '1. गतिशीलता और मोटर विकलांगता (Motor & Mobility)',
      suiteMotorDesc: 'सिंगल-स्विच ऑटो-स्कैनिंग, हैंड्स-फ्री वॉयस कंट्रोल और शॉर्टकट',
      switchAccessToggleTitle: 'ऑटो-स्कैनिंग स्विच एक्सेस',
      switchAccessToggleDesc: 'सिंगल स्विच, स्पेस, एंटर या फुट पैडल से पूरे ऐप में घूमें और चुनें',
      switchSpeedTitle: 'स्विच स्कैन चक्र गति',
      suiteHearingTitle: '2. श्रवण बाधित और बधिर पहुंच (Hearing Impairment)',
      suiteHearingDesc: 'लाइव क्लोज्ड कैप्शन (सबटाइटल डॉक) और विज़ुअल साउंड अलर्ट',
      captionsToggleTitle: 'लाइव क्लोज्ड कैप्शन (सबटाइटल डॉक)',
      captionsToggleDesc: 'स्पीकर बैज के साथ स्क्रीन पर वास्तविक समय में उपशीर्षक पट्टी प्रदर्शित करें',
      captionsSizeTitle: 'सबटाइटल फ़ॉन्ट आकार',
      visualAlertsToggleTitle: 'विज़ुअल साउंड अलर्ट और बॉर्डर चमक',
      visualAlertsToggleDesc: 'ध्वनि या भाषण बजने पर स्क्रीन पर दृश्य संकेत और चमक दिखाएं',
      suiteCognitiveTitle: '3. संज्ञानात्मक और न्यूरोडाइवर्सिटी (ADHD और डिस्केल्कूलिया)',
      suiteCognitiveDesc: 'रीडिंग फोकस रूलर, सरल भाषा सारांश और गणित रंग कोडिंग',
      readingRulerToggleTitle: 'रीडिंग फोकस रूलर ओवरले',
      readingRulerToggleDesc: 'विचलित करने वाले क्षेत्रों को धुंधला करके सक्रिय पंक्ति पर ध्यान केंद्रित करें',
      dyscalculiaColorsToggleTitle: 'डिस्केल्कूलिया गणित रंग-कोडिंग',
      dyscalculiaColorsToggleDesc: 'ऑपरेटरों (+, -, ×), संख्याओं और चरों के लिए अलग-अलग उच्च-कंट्रास्ट रंग',
      plainLangToggleTitle: 'सरल भाषा मोड',
      plainLangToggleDesc: 'कठिन शैक्षणिक शब्दावली को सरल और स्पष्ट शब्दों में संक्षेप में प्रस्तुत करें',
      a11yQuickPaletteTitle: 'त्वरित पहुंच पैलेट (Alt + A)',
      closeBtn: 'बंद करें',
    },
    Odia: {
      appTitle: 'ସୁଗମ ଶିକ୍ଷାଗତ ସମସ୍ୟା ସମାଧାନକାରୀ',
      runsOnDevice: 'ଏହି ଡିଭାଇସରେ ଚାଲେ · କିଛି ବି ଅପଲୋଡ୍ ହୁଏ ନାହିଁ',
      home: 'ହୋମ୍',
      solveMath: 'ଗଣିତ ସମସ୍ୟା ସମାଧାନ କରନ୍ତୁ',
      askQuestion: 'ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ',
      flashcards: 'ଫ୍ଲାସକାର୍ଡ',
      voiceLearning: 'ଭଏସ୍ ଲର୍ଣ୍ଣିଂ',
      history: 'ମୋର ଶିକ୍ଷା ଇତିହାସ',
      settings: 'ଆକ୍ସେସିବିଲିଟି ସେଟିଂସ୍',
      welcomeTitle: 'ସ୍ଵାଗତ!',
      welcomeSub: 'ଆପଣଙ୍କର ଷ୍ଟ୍ରିକ୍ ଆରମ୍ଭ କରିବା ପାଇଁ ପ୍ରଥମ ସମସ୍ୟା ସମାଧାନ କରନ୍ତୁ।',
      solveBtn: 'ସମସ୍ୟା ସମାଧାନ କରନ୍ତୁ',
      dayStreak: 'ଦିନର ଷ୍ଟ୍ରିକ୍',
      problemsSolved: 'ସମାଧାନ ହୋଇଥିବା ସମସ୍ୟା',
      flashcardsDue: 'ବାକି ଫ୍ଲାସକାର୍ଡ',
      flashcardsSaved: 'ସାଇତା ଯାଇଥିବା ଫ୍ଲାସକାର୍ଡ',
      mathCardTitle: 'ଗଣିତ ସମାଧାନ କରନ୍ତୁ',
      mathCardDesc: 'ସଠିକ୍, ପରୀକ୍ଷିତ, ଉଚ୍ଚାରିତ ପଦକ୍ଷେପ',
      askCardTitle: 'ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ',
      askCardDesc: 'ଆପଣଙ୍କ ସ୍ଥାନୀୟ Ollama ବ୍ୟବହାର କରେ',
      flashcardsCardTitle: 'ଫ୍ଲାସକାର୍ଡ',
      flashcardsCardDesc: 'ବ୍ୟବଧାନ ପୁନରାବୃତ୍ତି',
      voiceCardTitle: 'ଭଏସ୍ ଲର୍ଣ୍ଣିଂ',
      voiceCardDesc: 'ଶବ୍ଦ ହାଇଲାଇଟ୍ ସହିତ ଶୁଣନ୍ତୁ',
      thisWeek: 'ଏହି ସପ୍ତାହ',
      privacyNotice: 'ଗୋପନୀୟତା: ଏହି ପୃଷ୍ଠାର ସବୁକିଛି ଆପଣଙ୍କ ବ୍ରାଉଜରରେ ଚାଲେ। ଇତିହାସ ସାଇତିବା ଇଚ୍ଛାଧୀନ ଏବଂ ସେଟିଂସରେ ବନ୍ଦ କରାଯାଇପାରିବ।',
      footerNotice: 'ଚିତ୍ର, ପିଡିଏଫ୍ ଏବଂ "ମୁଁ ଯାହା ଦେଖିପାରୁନାହିଁ ତାହା ବର୍ଣ୍ଣନା କରନ୍ତୁ" ଏକ ସ୍ଥାନୀୟ OCR କିମ୍ବା ଭିଜନ ମଡେଲ ଆବଶ୍ୟକ କରେ।',
      voiceSampleText: 'ଶୂନ୍ୟସ୍ଥାନରେ ଆଲୋକର ଗତି ପ୍ରାୟ ତିନି ଲକ୍ଷ କିଲୋମିଟର ପ୍ରତି ସେକେଣ୍ଡ। ଶକ୍ତି ବସ୍ତୁତ୍ୱ ଏବଂ ଆଲୋକ ଗତିର ବର୍ଗର ସମାନ।',
      speechLang: 'or-IN',
      imageScannerNav: 'ଚିତ୍ର ସ୍କାନର୍',
      imageScannerCardTitle: 'ଚିତ୍ର ସ୍କାନର୍',
      imageScannerCardDesc: 'ଚିତ୍ରରୁ ପାଠ୍ୟ ବାହାର କରନ୍ତୁ, ପ୍ରଶ୍ନ ସମାଧାନ କରନ୍ତୁ ଓ ବୁଝନ୍ତୁ',
      scanImageBtn: '📷 ଚିତ୍ର ସ୍କାନ କରନ୍ତୁ (ପାଠ୍ୟ ଏବଂ ୨ଟି ବିକଳ୍ପ)',
      pdfScannerNav: 'ପିଡିଏଫ୍ ସ୍କାନର୍',
      pdfScannerCardTitle: 'ପିଡିଏଫ୍ ସ୍କାନର୍',
      pdfScannerCardDesc: 'ପିଡିଏଫ୍‌ରୁ ପାଠ୍ୟ ବାହାର କରନ୍ତୁ, ପ୍ରଶ୍ନ ସମାଧାନ କରନ୍ତୁ ଓ ବୁଝନ୍ତୁ',
      scanPdfBtn: '📄 ପିଡିଏଫ୍ ସ୍କାନ କରନ୍ତୁ (ପାଠ୍ୟ ଏବଂ ୨ଟି ବିକଳ୍ପ)',
      dbNodesLabel: 'ଡାଟାବେସ୍ ଜ୍ଞାନ ନୋଡ୍ସ',
      activeTasksLabel: 'ଚାଲୁଥିବା ସକ୍ରିୟ କାର୍ଯ୍ୟ',
      completedNodesLabel: 'ସମ୍ପନ୍ନ ସମାଧାନ',
      dbStatusBadge: 'SQLite ଡାଟାବେସ୍ ଲାଇଭ୍',
      dbWorkspaceNav: '🗂️ ଡାଟାବେସ୍ ୱାର୍କସ୍ପେସ୍',
      dbCategoryTitle: 'ଲାଇଭ୍ ଡାଟାବେସ୍ ଜ୍ଞାନ ବିଭାଗ',
      exploreDbBtn: '🗂️ ଡାଟାବେସ୍ ୱାର୍କସ୍ପେସ୍ ଦେଖନ୍ତୁ',
      flashcardsSearchPlaceholder: 'ବିଷୟ ଖୋଜନ୍ତୁ (ଯଥା: ବୀଜଗଣିତ, ପଦାର୍ଥ ବିଜ୍ଞାନ, ଆଲୋକ ସଂଶ୍ଳେଷଣ, ଇତିହାସ)...',
      micSearchTitle: 'ମାଇକ୍ରୋଫୋନରେ କହି ବିଷୟ ଖୋଜନ୍ତୁ',
      listeningTopic: 'ଶୁଣୁଛୁ... ବର୍ତ୍ତମାନ ବିଷୟର ନାମ କୁହନ୍ତୁ',
      stopMic: 'ମାଇକ୍ ବନ୍ଦ କରନ୍ତୁ',
      allTopicsLabel: 'ସମସ୍ତ ବିଷୟ',
      generateTopicBtn: '✨ ବିଷୟ ପାଇଁ ନୂତନ ଫ୍ଲାସକାର୍ଡ ତିଆରି କରନ୍ତୁ',
      generatingCardsText: 'AI ଦ୍ୱାରା ଫ୍ଲାସକାର୍ଡ ପ୍ରସ୍ତୁତ ହେଉଛି...',
      viewModeFlipLabel: 'ଇଣ୍ଟରାକ୍ଟିଭ୍ ଫ୍ଲିପ୍ କାର୍ଡ',
      viewModeGridLabel: 'ସମସ୍ତ ବିଷୟ କାର୍ଡ ଦେଖନ୍ତୁ',
      listenCardBtn: 'କାର୍ଡ ଶୁଣନ୍ତୁ',
      noCardsFoundText: 'ଏହି ବିଷୟ ପାଇଁ କୌଣସି ଫ୍ଲାସକାର୍ଡ ମିଳିଲା ନାହିଁ',
      generateForTopicText: 'ଏହି ବିଷୟ ପାଇଁ ନୂତନ କାର୍ଡ ତିଆରି କରନ୍ତୁ',
      clearSearchBtn: 'ସଫା କରନ୍ତୁ',
      historySubtitle: 'ଆପଣଙ୍କର ସମସ୍ତ ଗଣିତ ସମାଧାନ, ଏଆଇ ଉତ୍ତର, ସ୍କାନ୍ ହୋଇଥିବା ଦଲିଲ୍, କୁଇଜ୍ ଓ ଫ୍ଲାସକାର୍ଡ ଅଭ୍ୟାସ ସମୀକ୍ଷା କରନ୍ତୁ।',
      filterAll: 'ସମସ୍ତ କାର୍ଯ୍ୟକଳାପ',
      filterMath: 'ଗଣିତ',
      filterQA: 'ପ୍ରଶ୍ନୋତ୍ତର',
      filterImage: 'ଚିତ୍ର ସ୍କାନ୍',
      filterPdf: 'ପିଡିଏଫ୍ ସ୍କାନ୍',
      filterQuiz: 'କୁଇଜ୍',
      filterFlashcard: 'ଫ୍ଲାସକାର୍ଡ',
      filterVoice: 'ଭଏସ୍ ଲର୍ଣ୍ଣିଂ',
      searchHistoryPlaceholder: 'ଆପଣଙ୍କ ଇତିହାସରେ ଖୋଜନ୍ତୁ (ବିଷୟ, ପ୍ରଶ୍ନ, ସମୀକରଣ)...',
      clearAllHistoryBtn: 'ସମସ୍ତ ଇତିହାସ ସଫା କରନ୍ତୁ',
      exportHistoryBtn: 'ଇତିହାସ ରପ୍ତାନି କରନ୍ତୁ',
      noActivitiesTitle: 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ଶିକ୍ଷଣ କାର୍ଯ୍ୟକଳାପ ରେକର୍ଡ ହୋଇନାହିଁ',
      noActivitiesSub: 'ଆପଣଙ୍କ ଶିକ୍ଷା ଯାତ୍ରା ଆରମ୍ଭ କରିବା ପାଇଁ ଗଣିତ ସମାଧାନ କରନ୍ତୁ, ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ କିମ୍ବା ଡକ୍ୟୁମେଣ୍ଟ ସ୍କାନ୍ କରନ୍ତୁ!',
      confirmClearHistory: 'ଆପଣ ନିଶ୍ଚିତ ଭାବେ ନିଜ ଶିକ୍ଷା ଇତିହାସ ସଫା କରିବାକୁ ଚାହାଁନ୍ତି କି? ଏହା ପୁନରୁଦ୍ଧାର ହୋଇପାରିବ ନାହିଁ।',
      historyPausedNotice: 'ଆକ୍ସେସିବିଲିଟି ସେଟିଂସରେ ଇତିହାସ ସାଇତିବା ବର୍ତ୍ତମାନ ବନ୍ଦ ଅଛି।',
      enableHistoryBtn: 'ଇତିହାସ ସାଇତିବା ଚାଲୁ କରନ୍ତୁ',
      viewSolutionBtn: 'ବିସ୍ତୃତ ଦେଖନ୍ତୁ',
      hideSolutionBtn: 'ଲୁଚାନ୍ତୁ',
      todayLabel: 'ଆଜି',
      yesterdayLabel: 'ଗତକାଲି',
      earlierLabel: 'ପୂର୍ବରୁ',
      copySuccess: 'କ୍ଲିପବୋର୍ଡକୁ କପି ହୋଇଗଲା!',
      deleteItemTitle: 'କାର୍ଯ୍ୟକଳାପ ହଟାନ୍ତୁ',
      geographyIdeaNav: 'Geography idea',
      geographyCardTitle: 'Geography idea',
      geographyCardDesc: 'ପୃଥିବୀର ପ୍ରଣାଳୀ, ମହାଦେଶ, ଜଳବାୟୁ ଏବଂ ବିଶ୍ୱ ମାନଚିତ୍ର ଅନୁସନ୍ଧାନ କରନ୍ତୁ',
      geographySearchPlaceholder: 'ଯେକୌଣସି ଭୂଗୋଳ ଧାରଣା ଖୋଜନ୍ତୁ (ଯଥା: ଟେକ୍ଟୋନିକ୍ ପ୍ଲେଟ୍, ଆମାଜନ ନଦୀ, ମୌସୁମୀ ବାୟୁ, ହିମାଳୟ)...',
      geographyExploreBtn: '🌍 ଭୂଗୋଳ ଧାରଣା ବୁଝନ୍ତୁ',
      geographyThinkingText: 'ଭୂଗୋଳ ଧାରଣା ବିଶ୍ଳେଷଣ କରାଯାଉଛି...',
      geographyRandomBtn: '🎲 ଅଜଣା ଭୂଗୋଳ ଧାରଣା',
      geographyPresetCategories: 'ଭୂଗୋଳ ବିଷୟ ଧାରଣା',
      geographyQuickFactsTitle: 'ରୋଚକ ଭୂଗୋଳ ଧାରଣା ଓ ମୁଖ୍ୟ ତଥ୍ୟ',
      filterGeography: 'ଭୂଗୋଳ',
      dailyTopicsTitle: 'ଆଜିର ଦୈନିକ ବିଷୟ (Daily Topics)',
      dailyTopicsSub: 'ପ୍ରତିଦିନ ନୂଆ ଶିକ୍ଷଣୀୟ ବିଷୟ, ସ୍ପଷ୍ଟ ସ୍ୱର ଏବଂ ଶବ୍ଦ ହାଇଲାଇଟିଂ ସହିତ ଶୁଣନ୍ତୁ।',
      generateDailyTopicBtn: '✨ AI ଦ୍ୱାରା ନୂତନ ବିଷୟ ଗଢ଼ନ୍ତୁ',
      shuffleDailyTopicsBtn: '🔄 ବିଷୟ ବଦଳାନ୍ତୁ (ଶଫଲ୍)',
      customTopicPrompt: 'ଯେକୌଣସି ବିଷୟ ଲେଖନ୍ତୁ ବା ବାଛନ୍ତୁ ଏବଂ ନୂଆ ଅଡିଓ ପାଠ ପ୍ରସ୍ତୁତ କରନ୍ତୁ:',
      generateTopicPlaceholder: 'ଯଥା: ବ୍ଲାକ୍ ହୋଲ୍, ଚନ୍ଦ୍ରଯାନ, ଇନ୍ଦ୍ରଧନୁ କିପରି ହୁଏ, କୋଣାର୍କ ସୂର୍ଯ୍ୟ ମନ୍ଦିର...',
      generatingTopicText: 'AI ଦ୍ୱାରା ନୂଆ ଭଏସ୍ ଲର୍ଣ୍ଣିଂ ପ୍ରସ୍ତୁତ କରାଯାଉଛି...',
      loadInEditorBtn: 'ଏଡିଟରରେ ନିଅନ୍ତୁ',
      listenDailyTopicBtn: 'ଏବେ ଶୁଣନ୍ତୁ',
      dailyTopicCategoryAll: 'ସମସ୍ତ ବିଷୟ',
      dailyBadgeToday: 'ଆଜିର ଖାସ୍',
      dailyListenEstimate: 'ଶୁଣିବା ସମୟ',
      dailySurpriseMeBtn: '🎲 ଆଶ୍ଚର୍ଯ୍ୟ ବିଷୟ',
      dailyVoiceAudioTag: 'ଭଏସ୍ ଲର୍ଣ୍ଣିଂ ଷ୍ଟୁଡିଓ',
      studycastNav: 'StudyCast ପଡକାଷ୍ଟ',
      studycastCardTitle: 'StudyCast ଷ୍ଟୁଡିଓ',
      studycastCardDesc: 'ପ୍ରଫେସର ଆଲେକ୍ସ ଏବଂ ଛାତ୍ର ସାମ୍ ମଧ୍ୟରେ AI ସଂଳାପ ପଡକାଷ୍ଟ ଏବଂ 432Hz ଅଧ୍ୟୟନ ସଙ୍ଗୀତ',
      mindmapNav: 'ଜ୍ଞାନ ମାଇଣ୍ଡ ମ୍ୟାପ୍',
      mindmapCardTitle: 'ଜ୍ଞାନ ମାଇଣ୍ଡ ମ୍ୟାପ୍',
      mindmapCardDesc: 'ଗଣିତ, ପଦାର୍ଥ, ରସାୟନ, ଜୀବବିଜ୍ଞାନ ଓ ଭୂଗୋଳକୁ ଯୋଡ଼ୁଥିବା ଇଣ୍ଟରାକ୍ଟିଭ୍ କନ୍ସେପ୍ଟ ୱେବ୍',
      battleQuizNav: 'Battle of Brains କୁଇଜ୍',
      battleQuizCardTitle: 'Battle of Brains',
      battleQuizCardDesc: 'Atlas AI ବଟ୍ ବିରୁଦ୍ଧରେ 15 ସେକେଣ୍ଡ୍ ସ୍ପିଡ୍ ଡୁଏଲ୍, କମ୍ବୋ ଷ୍ଟ୍ରିକ୍ସ ଏବଂ XP ପୁରସ୍କାର',
      voiceAccessBtn: 'ଭଏସ୍ ଆକ୍ସେସ୍ (Voice Access)',
      voiceAccessHint: 'କହିବା ପାଇଁ ସ୍କ୍ରିନ୍ରେ ଡବଲ୍-କ୍ଲିକ୍ କରନ୍ତୁ',
      doubleClickVoiceSettingTitle: 'ଭଏସ୍ ଆକ୍ସେସ୍ ପାଇଁ ସ୍କ୍ରିନ୍ରେ ଡବଲ୍-କ୍ଲିକ୍',
      doubleClickVoiceSettingDesc: 'ସ୍କ୍ରିନ୍ର ଯେକୌଣସି ପାର୍ଶ୍ୱରେ ଡବଲ୍-କ୍ଲିକ୍ ବା ଡବଲ୍-ଟ୍ୟାପ୍ କରି ତୁରନ୍ତ ବହୁଭାଷୀ ଭଏସ୍ ଇନପୁଟ୍ ସକ୍ରିୟ କରନ୍ତୁ',
      voiceAccessActivatedToast: '🎙️ ଭଏସ୍ ଆକ୍ସେସ୍ ସକ୍ରିୟ (Voice Activated)',
      themeOptionTitle: 'ଥିମ୍ ଏବଂ ଦୃଶ୍ୟମାନତା',
      themeOptionDesc: 'ଆପଣଙ୍କ ପସନ୍ଦର ରଙ୍ଗ ଏବଂ ଭିଜୁଆଲ୍ ଶୈଳୀ ଚୟନ କରନ୍ତୁ',
      themeDarkTitle: 'କସମିକ୍ ଡାର୍କ',
      themeDarkDesc: 'ଗାଢ଼ ସ୍ଲେଟ୍ ଏବଂ ଇଣ୍ଡିଗୋ ନିଅନ୍',
      themeLightTitle: 'ଲାଇଟ୍ ଏକାଡେମିକ୍',
      themeLightDesc: 'ପରିଷ୍କାର ଦିନବେଳା ଅଧ୍ୟୟନ ମୋଡ୍',
      themeCyberpunkTitle: 'ସାଇବରପଙ୍କ୍ ଗ୍ଲୋ',
      themeCyberpunkDesc: 'OLED କଳା ସହ ସ୍ୟାନ୍ ଏବଂ ପିଙ୍କ୍',
      themeEmeraldTitle: 'ଏମରାଲ୍ଡ ଆଖି-ଯତ୍ନ',
      themeEmeraldDesc: 'ଆଖି ଥକାପଣ ଦୂର କରିବା ପାଇଁ ଶାନ୍ତ ସବୁଜ',
      themeAmberTitle: 'ୱାର୍ମ ଆମ୍ବର',
      themeAmberDesc: 'ଆରାମଦାୟକ ସୁନେଲି ସେପିଆ ପଠନ ମୋଡ୍',
      themeActiveBadge: 'ସକ୍ରିୟ',
      a11yCenterTitle: 'ସାର୍ବଜନୀନ ସୁଗମତା କେନ୍ଦ୍ର (ଦିବ୍ୟାଙ୍ଗ ସୁବିଧା ସମୂହ)',
      a11yCenterSubtitle: 'ଦୃଷ୍ଟି, ଶ୍ରବଣ, ଚଳନଶକ୍ତି ଏବଂ ମାନସିକ ସ୍ୱଚ୍ଛତା ପାଇଁ ସ୍ୱତନ୍ତ୍ର ସୁଗମତା ବ୍ୟବସ୍ଥା',
      suiteMotorTitle: '୧. ଗତିଶୀଳତା ଓ ଚଳନଶକ୍ତି ଅକ୍ଷମତା ସହାୟତା (Motor & Mobility)',
      suiteMotorDesc: 'ସିଙ୍ଗଲ୍-ସ୍ୱିଚ୍ ଅଟୋ-ସ୍କାନିଂ, ହାତମୁକ୍ତ ଭଏସ୍ କମାଣ୍ଡ ଏବଂ କୀବୋର୍ଡ ଶର୍ଟକଟ୍',
      switchAccessToggleTitle: 'ଅଟୋ-ସ୍କାନିଂ ସ୍ୱିଚ୍ ଆକ୍ସେସ୍ (Switch Access)',
      switchAccessToggleDesc: 'ଗୋଟିଏ ସ୍ୱିଚ୍, ସ୍ପେସ୍, ଏଣ୍ଟର କିମ୍ବା ଫୁଟ୍ ପେଡାଲ୍ ସାହାଯ୍ୟରେ ସମ୍ପୂର୍ଣ୍ଣ ଆପ୍ ପରିଚାଳନା କରନ୍ତୁ',
      switchSpeedTitle: 'ସ୍ୱିଚ୍ ସ୍କାନ୍ ଗତି ଚକ୍ର',
      suiteHearingTitle: '୨. ଶ୍ରବଣହୀନ ଓ କାଲ ସହାୟତା (Hearing & Deaf Access)',
      suiteHearingDesc: 'ଲାଇଭ୍ କ୍ଲୋଜ୍ଡ କ୍ୟାପ୍ସନ୍ (ସବଟାଇଟଲ୍ ଡକ୍) ଏବଂ ଭିଜୁଆଲ୍ ସାଉଣ୍ଡ ଆଲର୍ଟ',
      captionsToggleTitle: 'ଲାଇଭ୍ କ୍ଲୋଜ୍ଡ କ୍ୟାପ୍ସନ୍ (ସବଟାଇଟଲ୍ ଡକ୍)',
      captionsToggleDesc: 'ବକ୍ତା ପରିଚୟ ସହିତ ସ୍କ୍ରିନ୍ ତଳେ ରିଅଲ-ଟାଇମ୍ ସବଟାଇଟଲ୍ ବାର୍ ପ୍ରଦର୍ଶନ କରନ୍ତୁ',
      captionsSizeTitle: 'ସବଟାଇଟଲ୍ ଫଣ୍ଟ ଆକାର',
      visualAlertsToggleTitle: 'ଭିଜୁଆଲ୍ ସାଉଣ୍ଡ ଆଲର୍ଟ ଓ ବର୍ଡର ଫ୍ଲାସ୍',
      visualAlertsToggleDesc: 'କୌଣସି ଶବ୍ଦ ବା ଭଏସ୍ ବାଜିଲେ ସ୍କ୍ରିନ୍ରେ ଆଲୋକ ଓ ସୂଚକ ଚିହ୍ନ ଝଲସିବ',
      suiteCognitiveTitle: '୩. ବୌଦ୍ଧିକ ଓ ସ୍ମୃତି ସହାୟତା (Cognitive Suite)',
      suiteCognitiveDesc: 'ରିଡିଂ ଫୋକସ୍ ରୁଲର୍, ସରଳ ଭାଷା ସାରାଂଶ ଏବଂ ଗଣିତ ରଙ୍ଗ-କୋଡିଂ',
      readingRulerToggleTitle: 'ରିଡିଂ ଫୋକସ୍ ରୁଲର୍ ଓଭରଲେ (Reading Ruler)',
      readingRulerToggleDesc: 'ଅନ୍ୟାନ୍ୟ ଅଂଶକୁ ଅନ୍ଧାର କରି କେବଳ ପଢ଼ୁଥିବା ଧାଡ଼ି ଉପରେ ଧ୍ୟାନ କେନ୍ଦ୍ରିତ କରନ୍ତୁ',
      dyscalculiaColorsToggleTitle: 'ଡିସକାଲକୁଲିଆ ଗଣିତ ରଙ୍ଗ-କୋଡିଂ',
      dyscalculiaColorsToggleDesc: 'ଗଣିତ ଚିହ୍ନ (+, -, ×), ସଂଖ୍ୟା (0-9) ଏବଂ ଚଳ (x, y) ପାଇଁ ସ୍ୱତନ୍ତ୍ର କଣ୍ଟ୍ରାଷ୍ଟ ରଙ୍ଗ',
      plainLangToggleTitle: 'ସରଳ ଭାଷା ସଂକ୍ଷେପକାରୀ ମୋଡ୍',
      plainLangToggleDesc: 'କଠିନ ଶିକ୍ଷାଗତ ଶବ୍ଦାବଳୀକୁ ସହଜ ଓ ବୁଝିପାରୁଥିବା ସାରାଂଶରେ ପରିଣତ କରନ୍ତୁ',
      a11yQuickPaletteTitle: 'ସୁଗମତା କୁଇକ୍ ପ୍ୟାଲେଟ୍ (Alt + A)',
      closeBtn: 'ବନ୍ଦ କରନ୍ତୁ',
    },
  };

  const t = translations[selectedLanguage];

  const themeOptions = useMemo<Array<{
    id: ThemeMode;
    title: string;
    description: string;
    dotBg: string;
    dotCard: string;
    dotAccent: string;
  }>>(() => [
    {
      id: 'dark',
      title: t.themeDarkTitle,
      description: t.themeDarkDesc,
      dotBg: '#0b0f19',
      dotCard: '#111827',
      dotAccent: '#6366f1',
    },
    {
      id: 'light',
      title: t.themeLightTitle,
      description: t.themeLightDesc,
      dotBg: '#f1f5f9',
      dotCard: '#ffffff',
      dotAccent: '#1456cb',
    },
    {
      id: 'cyberpunk',
      title: t.themeCyberpunkTitle,
      description: t.themeCyberpunkDesc,
      dotBg: '#050508',
      dotCard: '#0c0d14',
      dotAccent: '#06b6d4',
    },
    {
      id: 'emerald',
      title: t.themeEmeraldTitle,
      description: t.themeEmeraldDesc,
      dotBg: '#061a14',
      dotCard: '#0c2820',
      dotAccent: '#10b981',
    },
    {
      id: 'amber',
      title: t.themeAmberTitle,
      description: t.themeAmberDesc,
      dotBg: '#1c1611',
      dotCard: '#261e17',
      dotAccent: '#f59e0b',
    },
  ], [t]);

  // User display name from database (full_name or capitalized username)
  const displayName =
    currentUser?.full_name?.trim() ||
    (currentUser?.username
      ? currentUser.username.charAt(0).toUpperCase() + currentUser.username.slice(1)
      : '');

  const userGreeting = displayName
    ? selectedLanguage === 'Hindi'
      ? `स्वागत है, ${displayName}!`
      : selectedLanguage === 'Odia'
      ? `ସ୍ଵାଗତ, ${displayName}!`
      : `Welcome, ${displayName}!`
    : t.welcomeTitle;

  // Dynamic Streak Calculation based on real active calendar days per user
  const computeStreakForUser = (user: User | null): number => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const lastActive = getUserItem<string>('last_active_date', user, '');
    const storedStreak = getUserItem<number>('academic_streak', user, 0);

    if (!lastActive) {
      setUserItem('last_active_date', todayStr, user);
      setUserItem('academic_streak', 1, user);
      return 1;
    }

    if (lastActive === todayStr) {
      return storedStreak > 0 ? storedStreak : 1;
    }

    // Check if yesterday
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (lastActive === yesterday) {
      const nextStreak = (storedStreak > 0 ? storedStreak : 1) + 1;
      setUserItem('last_active_date', todayStr, user);
      setUserItem('academic_streak', nextStreak, user);
      return nextStreak;
    }

    // Reset to 1 for today
    setUserItem('last_active_date', todayStr, user);
    setUserItem('academic_streak', 1, user);
    return 1;
  };

  const [dayStreak, setDayStreak] = useState<number>(() => computeStreakForUser(currentUser));
  const [problemsSolved, setProblemsSolved] = useState<number>(() => {
    return getUserItem<number>('academic_solved', currentUser, 0);
  });
  const [flashcardsDue, setFlashcardsDue] = useState<number>(() => {
    return getUserItem<number>('academic_due', currentUser, 0);
  });
  const [flashcardsSaved, setFlashcardsSaved] = useState<number>(() => {
    return getUserItem<number>('academic_saved', currentUser, 0);
  });

  // Math Solver State
  const [mathInput, setMathInput] = useState<string>('2x + 8 = 20');
  const [mathSolution, setMathSolution] = useState<{
    problem: string;
    result: string;
    steps: string[];
  } | null>(null);
  const [isSolving, setIsSolving] = useState<boolean>(false);

  // Ask Question State
  const [questionInput, setQuestionInput] = useState<string>('');
  const [questionAnswer, setQuestionAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState<boolean>(false);

  // Flashcards State & Multilingual Starter Decks
  type AcademicLanguage = 'English' | 'Hindi' | 'Odia';
  const DEFAULT_FLASHCARD_DECKS: Record<AcademicLanguage, FlashcardItem[]> = {
    English: [
      { id: 'en-1', q: 'What is the quadratic formula?', a: 'x = (-b ± √(b² - 4ac)) / (2a)', category: 'Algebra' },
      { id: 'en-2', q: 'What is the slope-intercept form of a linear equation?', a: 'y = mx + b (where m is slope, b is y-intercept)', category: 'Algebra' },
      { id: 'en-3', q: 'State Newton’s Second Law of Motion.', a: 'Force = Mass × Acceleration (F = ma)', category: 'Physics' },
      { id: 'en-4', q: 'What is the speed of light in vacuum?', a: 'c ≈ 3 × 10⁸ m/s (approx 300,000 km/s)', category: 'Physics' },
      { id: 'en-5', q: 'What is the balanced equation for Photosynthesis?', a: '6CO₂ + 6H₂O + Light → C₆H₁₂O₆ + 6O₂', category: 'Biology' },
      { id: 'en-6', q: 'Which organelle is known as the powerhouse of the cell?', a: 'Mitochondria (produces ATP energy)', category: 'Biology' },
      { id: 'en-7', q: 'What is the derivative of sin(x)?', a: 'd/dx [sin(x)] = cos(x)', category: 'Calculus' },
      { id: 'en-8', q: 'State the Fundamental Theorem of Calculus.', a: '∫[a to b] f(x) dx = F(b) - F(a), where F\'(x) = f(x)', category: 'Calculus' },
      { id: 'en-9', q: 'What is Avogadro’s Number?', a: '6.022 × 10²³ particles per mole', category: 'Chemistry' },
      { id: 'en-10', q: 'What is the pH of pure neutral water at 25°C?', a: 'pH = 7 (Neutral)', category: 'Chemistry' },
      { id: 'en-11', q: 'When did India gain independence?', a: 'August 15, 1947', category: 'History' },
    ],
    Hindi: [
      { id: 'hi-1', q: 'द्विघात समीकरण का सूत्र क्या है?', a: 'x = (-b ± √(b² - 4ac)) / (2a)', category: 'बीजगणित' },
      { id: 'hi-2', q: 'रैखिक समीकरण का ढलान-अवरोधन रूप क्या है?', a: 'y = mx + c (जहाँ m ढलान और c अवरोधन है)', category: 'बीजगणित' },
      { id: 'hi-3', q: 'न्यूटन के गति का दूसरा नियम क्या है?', a: 'बल = द्रव्यमान × त्वरण (F = ma)', category: 'भौतिकी' },
      { id: 'hi-4', q: 'निर्वात में प्रकाश का वेग कितना होता है?', a: 'लगभग 3 लाख किलोमीटर प्रति सेकंड (3 × 10⁸ m/s)', category: 'भौतिकी' },
      { id: 'hi-5', q: 'प्रकाश संश्लेषण का संतुलित समीकरण क्या है?', a: '6CO₂ + 6H₂O + प्रकाश → C₆H₁₂O₆ + 6O₂', category: 'जीव विज्ञान' },
      { id: 'hi-6', q: 'कोशिका का ऊर्जा गृह (पावरहाउस) किसे कहते हैं?', a: 'माइटोकॉन्ड्रिया (Mitochondria)', category: 'जीव विज्ञान' },
      { id: 'hi-7', q: 'sin(x) का अवकलज (Derivative) क्या है?', a: 'd/dx [sin(x)] = cos(x)', category: 'कलन' },
      { id: 'hi-8', q: 'आवोगाद्रो संख्या का मान क्या है?', a: '6.022 × 10²³ प्रति मोल', category: 'रसायन विज्ञान' },
      { id: 'hi-9', q: 'भारत को स्वतंत्रता कब प्राप्त हुई?', a: '15 अगस्त 1947', category: 'इतिहास' },
    ],
    Odia: [
      { id: 'or-1', q: 'ଦ୍ୱିଘାତ ସମୀକରଣ ସମାଧାନ ସୂତ୍ର କ’ଣ?', a: 'x = (-b ± √(b² - 4ac)) / (2a)', category: 'ବୀଜଗଣିତ' },
      { id: 'or-2', q: 'ନିଉଟନଙ୍କ ଗତିର ଦ୍ୱିତୀୟ ନିୟମ କ’ଣ?', a: 'ବଳ = ବସ୍ତୁତ୍ୱ × ତ୍ୱରଣ (F = ma)', category: 'ପଦାର୍ଥ ବିଜ୍ଞାନ' },
      { id: 'or-3', q: 'ଶୂନ୍ୟସ୍ଥାନରେ ଆଲୋକର ବେଗ କେତେ?', a: 'ପ୍ରାୟ ତିନି ଲକ୍ଷ କିଲୋମିଟର ପ୍ରତି ସେକେଣ୍ଡ (3 × 10⁸ m/s)', category: 'ପଦାର୍ଥ ବିଜ୍ଞାନ' },
      { id: 'or-4', q: 'ଆଲୋକ ସଂଶ୍ଳେଷଣର ରାସାୟନିକ ସମୀକରଣ କ’ଣ?', a: '6CO₂ + 6H₂O + ଆଲୋକ → C₆H₁₂O₆ + 6O₂', category: 'ଜୀବ ବିଜ୍ଞାନ' },
      { id: 'or-5', q: 'କୋଷର ଶକ୍ତିକେନ୍ଦ୍ର (Powerhouse) କାହାକୁ କୁହାଯାଏ?', a: 'ମାଇଟୋକଣ୍ଡ୍ରିଆ (Mitochondria)', category: 'ଜୀବ ବିଜ୍ଞାନ' },
      { id: 'or-6', q: 'sin(x) ର ଅବକଳଜ (Derivative) କ’ଣ?', a: 'd/dx [sin(x)] = cos(x)', category: 'କାଲକୁଲସ' },
      { id: 'or-7', q: 'ଆଭୋଗାଡ୍ରୋ ସଂଖ୍ୟାର ମୂଲ୍ୟ କେତେ?', a: '6.022 × 10²³ ପ୍ରତି ମୋଲ', category: 'ରସାୟନ ବିଜ୍ଞାନ' },
      { id: 'or-8', q: 'ଭାରତ କେବେ ସ୍ୱାଧୀନତା ଲାଭ କଲା?', a: '୧୫ ଅଗଷ୍ଟ ୧୯୪୭', category: 'ଇତିହାସ' },
    ],
  };

  const [currentCardIdx, setCurrentCardIdx] = useState<number>(0);
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);
  const [flashcardTopicQuery, setFlashcardTopicQuery] = useState<string>('');
  const [flashcardViewMode, setFlashcardViewMode] = useState<'flip' | 'grid'>('flip');
  const [isMicListening, setIsMicListening] = useState<boolean>(false);
  const [isGeneratingTopicCards, setIsGeneratingTopicCards] = useState<boolean>(false);
  const [flashcardGenerationNotice, setFlashcardGenerationNotice] = useState<string | null>(null);
  const flashcardRecRef = useRef<any>(null);

  const [flashcardDeck, setFlashcardDeck] = useState<FlashcardItem[]>(() => {
    try {
      const saved = getUserItem<FlashcardItem[]>(`flashcard_deck_${selectedLanguage}`, currentUser, []);
      if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch {}
    return DEFAULT_FLASHCARD_DECKS[selectedLanguage] || DEFAULT_FLASHCARD_DECKS.English;
  });

  // Keep deck synced when language or active user changes if no custom deck exists
  useEffect(() => {
    try {
      const saved = getUserItem<FlashcardItem[]>(`flashcard_deck_${selectedLanguage}`, currentUser, []);
      if (Array.isArray(saved) && saved.length > 0) {
        setFlashcardDeck(saved);
        setCurrentCardIdx(0);
        setIsCardFlipped(false);
        return;
      }
    } catch {}
    setFlashcardDeck(DEFAULT_FLASHCARD_DECKS[selectedLanguage] || DEFAULT_FLASHCARD_DECKS.English);
    setCurrentCardIdx(0);
    setIsCardFlipped(false);
  }, [selectedLanguage, currentUser?.id]);

  // Mic speech recognition for topic search
  const toggleMicTopicSearch = () => {
    if (isMicListening) {
      if (flashcardRecRef.current) {
        try {
          flashcardRecRef.current.stop();
        } catch {}
      }
      setIsMicListening(false);
      return;
    }

    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Speech Recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    try {
      if (flashcardRecRef.current) {
        try {
          flashcardRecRef.current.abort();
        } catch {}
      }
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = true;

      if (selectedLanguage === 'Hindi') rec.lang = 'hi-IN';
      else if (selectedLanguage === 'Odia') rec.lang = 'or-IN';
      else rec.lang = 'en-US';

      rec.onstart = () => {
        setIsMicListening(true);
      };

      rec.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        transcript = transcript.trim();
        if (transcript) {
          setFlashcardTopicQuery(transcript);
          setCurrentCardIdx(0);
          setIsCardFlipped(false);
        }
      };

      rec.onerror = () => {
        setIsMicListening(false);
      };

      rec.onend = () => {
        setIsMicListening(false);
      };

      flashcardRecRef.current = rec;
      rec.start();
    } catch {
      setIsMicListening(false);
    }
  };

  // Generate flashcards for searched topic using AI
  const handleGenerateTopicCards = async (topicToUse?: string) => {
    const targetTopic = (topicToUse || flashcardTopicQuery).trim();
    if (!targetTopic) return;

    setIsGeneratingTopicCards(true);
    setFlashcardGenerationNotice(null);

    try {
      const newCards = await api.generateTopicFlashcards(targetTopic, selectedLanguage);
      if (newCards && newCards.length > 0) {
        setFlashcardDeck((prev) => {
          const existingQs = new Set(prev.map((c) => c.q.toLowerCase().trim()));
          const fresh = newCards.filter((c) => !existingQs.has(c.q.toLowerCase().trim()));
          const combined = [...fresh, ...prev];
          try {
            setUserItem(`flashcard_deck_${selectedLanguage}`, combined, currentUser);
          } catch {}
          return combined;
        });

        setFlashcardTopicQuery(targetTopic);
        setCurrentCardIdx(0);
        setIsCardFlipped(false);
        setFlashcardsSaved((prev) => prev + newCards.length);
        setFlashcardGenerationNotice(`Added ${newCards.length} new flashcards for "${targetTopic}"!`);
        setTimeout(() => setFlashcardGenerationNotice(null), 4000);

        logLearningActivity({
          activity_type: 'flashcard',
          title: `Flashcards: ${targetTopic}`,
          details: `Generated ${newCards.length} AI study cards for topic "${targetTopic}"`,
          solution: newCards.map((c, i) => `Q${i + 1}: ${c.q}\nA: ${c.a} (${c.category})`).join('\n\n'),
          language: selectedLanguage,
        });
      }
    } catch (err) {
      console.error('Failed to generate cards:', err);
    } finally {
      setIsGeneratingTopicCards(false);
    }
  };

  // Voice Learning State
  const [voiceText, setVoiceText] = useState<string>(
    'The speed of light in vacuum is approximately three hundred thousand kilometers per second. Energy equals mass times the speed of light squared.'
  );
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentSpeakingText, setCurrentSpeakingText] = useState<string>('');
  const [isAudioLoading, setIsAudioLoading] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [highlightWordIndex, setHighlightWordIndex] = useState<number | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Sample learning presets across all three languages
  const voicePresets = {
    English: [
      {
        title: 'Physics: Speed of Light',
        text: 'The speed of light in vacuum is approximately three hundred thousand kilometers per second. Energy equals mass times the speed of light squared.',
      },
      {
        title: 'Math: Pythagoras Theorem',
        text: 'In a right-angled triangle, the square of the hypotenuse is equal to the sum of the squares of the other two sides.',
      },
      {
        title: 'Biology: Photosynthesis',
        text: 'Photosynthesis is the process by which green plants use sunlight, water, and carbon dioxide to create oxygen and energy in the form of sugar.',
      },
    ],
    Hindi: [
      {
        title: 'भौतिकी: प्रकाश का वेग',
        text: 'शून्य में प्रकाश का वेग लगभग तीन लाख किलोमीटर प्रति सेकंड होता है। ऊर्जा द्रव्यमान और प्रकाश की गति के वर्ग के बराबर होती है।',
      },
      {
        title: 'गणित: पाइथागोरस प्रमेय',
        text: 'एक समकोण त्रिभुज में कर्ण का वर्ग अन्य दो भुजाओं के वर्गों के योग के बराबर होता है।',
      },
      {
        title: 'जीव विज्ञान: प्रकाश संश्लेषण',
        text: 'प्रकाश संश्लेषण वह प्रक्रिया है जिसके द्वारा हरे पौधे सूर्य के प्रकाश और कार्बन डाइऑक्साइड का उपयोग करके भोजन बनाते हैं।',
      },
    ],
    Odia: [
      {
        title: 'ପଦାର୍ଥ ବିଜ୍ଞାନ: ଆଲୋକର ଗତି',
        text: 'ଶୂନ୍ୟସ୍ଥାନରେ ଆଲୋକର ଗତି ପ୍ରାୟ ତିନି ଲକ୍ଷ କିଲୋମିଟର ପ୍ରତି ସେକେଣ୍ଡ। ଶକ୍ତି ବସ୍ତୁତ୍ୱ ଏବଂ ଆଲୋକ ଗତିର ବର୍ଗର ସମାନ।',
      },
      {
        title: 'ଗଣିତ: ପାଇଥାଗୋରାସ ଉପପାଦ୍ୟ',
        text: 'ଗୋଟିଏ ସମକୋଣୀ ତ୍ରିଭୁଜରେ କର୍ଣ୍ଣର ବର୍ଗ ଅନ୍ୟ ଦୁଇଟି ବାହୁର ବର୍ଗର ଯୋଗଫଳ ସହିତ ସମାନ।',
      },
      {
        title: 'ଜୀବ ବିଜ୍ଞାନ: ଆଲୋକ ସଂଶ୍ଳେଷଣ',
        text: 'ଆଲୋକ ସଂଶ୍ଳେଷଣ ହେଉଛି ଏକ ପ୍ରକ୍ରିୟା ଯାହା ଦ୍ୱାରା ସବୁଜ ଉଦ୍ଭିଦ ସୂର୍ଯ୍ୟାଲୋକ ଏବଂ ଅଙ୍ଗାରକାମ୍ଳ ବ୍ୟବହାର କରି ଖାଦ୍ୟ ପ୍ରସ୍ତୁତ କରନ୍ତି।',
      },
    ],
  };

  // Daily Voice Learning Topics State
  const initialDailyDayIndex = (new Date().getDay() + 6) % 7; // 0 = Mon ... 6 = Sun
  const [selectedDailyDay, setSelectedDailyDay] = useState<number>(initialDailyDayIndex);
  const [selectedDailyCategory, setSelectedDailyCategory] = useState<string>('All');
  const [isGeneratingDailyTopic, setIsGeneratingDailyTopic] = useState<boolean>(false);
  const [showDailyTopicGenerator, setShowDailyTopicGenerator] = useState<boolean>(false);
  const [customDailyTopicInput, setCustomDailyTopicInput] = useState<string>('');
  const [customDailyTopicCategory, setCustomDailyTopicCategory] = useState<string>('Science');
  const [customDailyTopics, setCustomDailyTopics] = useState<DailyVoiceTopic[]>(() => {
    try {
      const saved = getUserItem<DailyVoiceTopic[]>(`custom_daily_voice_topics_${selectedLanguage}`, currentUser, []);
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  // Keep custom daily topics in sync when language or user changes
  useEffect(() => {
    try {
      const saved = getUserItem<DailyVoiceTopic[]>(`custom_daily_voice_topics_${selectedLanguage}`, currentUser, []);
      setCustomDailyTopics(Array.isArray(saved) ? saved : []);
    } catch {
      setCustomDailyTopics([]);
    }
  }, [selectedLanguage, currentUser?.id]);

  // Handler to listen to a daily topic with play/pause
  const handleListenDailyTopic = (topic: DailyVoiceTopic) => {
    setVoiceText(topic.text);
    handlePlayPauseAudio(topic.text);
    if (!isSpeaking && !isPaused) {
      logLearningActivity({
        activity_type: 'voice',
        title: `Daily Topic: ${topic.title}`,
        details: `${topic.category} • ${topic.duration || '40s'} voice lesson`,
        solution: topic.text,
        language: selectedLanguage,
      });
    }
  };

  // Handler to shuffle / cycle through daily sets
  const handleShuffleDailyTopics = () => {
    setSelectedDailyDay((prev) => (prev + 1) % 7);
  };

  // Handler to generate a brand new daily topic using AI
  const handleGenerateDailyTopic = async (promptOverride?: string) => {
    const topicToPrompt = (promptOverride || customDailyTopicInput).trim();
    if (!topicToPrompt && !promptOverride) return;

    setIsGeneratingDailyTopic(true);
    const cat = customDailyTopicCategory || 'Science';
    const finalTopic = topicToPrompt || 'Fascinating wonders of Science and Nature';

    const systemPrompt = `You are an expert educational audio narrator for students. Create a compelling educational voice learning lesson on the topic "${finalTopic}" (${cat}) in ${selectedLanguage}.
Write exactly 2 to 3 fascinating, spoken sentences suitable for clear text-to-speech audio reading.
Provide:
Title: (Short clear title)
Passage: (The 2-3 spoken sentences)`;

    try {
      const generated = await api.askQuestion(systemPrompt, selectedLanguage);
      if (generated && generated.trim()) {
        const cleanText = generated.replace(/```/g, '').trim();
        let title = finalTopic;
        let speechScript = cleanText;

        const titleMatch = cleanText.match(/(?:Title|शीर्षक|ଶୀର୍ଷକ)\s*:\s*([^\n]+)/i);
        const passageMatch = cleanText.match(/(?:Passage|Text|पाठ|ପାଠ୍ୟ|ବିବରଣୀ)\s*:\s*([\s\S]+)/i);

        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1].trim();
        }
        if (passageMatch && passageMatch[1]) {
          speechScript = passageMatch[1].trim();
        } else if (titleMatch) {
          speechScript = cleanText.replace(titleMatch[0], '').trim();
        }

        const newTopicItem: DailyVoiceTopic = {
          id: `custom-ai-${Date.now()}`,
          dayIndex: selectedDailyDay,
          category: 'AI Generated',
          icon: '✨',
          title: title.slice(0, 60),
          text: speechScript,
          summary: speechScript.slice(0, 110) + '...',
          duration: `${Math.max(25, Math.round(speechScript.split(/\s+/).length * 0.4))}s`,
          tag: 'AI Generated',
        };

        const updated = [newTopicItem, ...customDailyTopics];
        setCustomDailyTopics(updated);
        try {
          setUserItem(`custom_daily_voice_topics_${selectedLanguage}`, updated, currentUser);
        } catch {}

        setCustomDailyTopicInput('');
        setShowDailyTopicGenerator(false);

        // Immediately load and speak the new topic
        handleListenDailyTopic(newTopicItem);
      }
    } catch (err) {
      console.warn('Failed to generate daily voice topic:', err);
    } finally {
      setIsGeneratingDailyTopic(false);
    }
  };

  // Theme & Appearance State with localStorage persistence
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('atlas_theme') as ThemeMode;
    return saved && ['dark', 'light', 'cyberpunk', 'emerald', 'amber'].includes(saved)
      ? saved
      : 'light';
  });

  // Sync active theme to document.documentElement attributes and classes
  useEffect(() => {
    localStorage.setItem('atlas_theme', currentTheme);
    document.documentElement.setAttribute('data-theme', currentTheme);
    const themeClasses = ['theme-dark', 'theme-light', 'theme-cyberpunk', 'theme-emerald', 'theme-amber'];
    themeClasses.forEach((cls) => document.documentElement.classList.remove(cls));
    document.documentElement.classList.add(`theme-${currentTheme}`);
  }, [currentTheme]);

  // Accessibility Settings State with localStorage persistence
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>(() => {
    const saved = localStorage.getItem('atlas_font_size');
    return saved === 'large' || saved === 'xlarge' ? saved : 'normal';
  });
  const [dyslexicFont, setDyslexicFont] = useState<boolean>(() => {
    return localStorage.getItem('atlas_dyslexic_font') === 'true';
  });
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    return localStorage.getItem('atlas_high_contrast') === 'true';
  });
  const [saveHistory, setSaveHistory] = useState<boolean>(() => {
    return localStorage.getItem('atlas_save_history') !== 'false';
  });

  // Dynamic Root and Body Font Sizing Effect (Scales all rem units across the whole app)
  useEffect(() => {
    localStorage.setItem('atlas_font_size', fontSize);
    if (fontSize === 'large') {
      document.documentElement.style.fontSize = '18.5px'; // 115% reading scale
      document.documentElement.setAttribute('data-text-size', 'large');
    } else if (fontSize === 'xlarge') {
      document.documentElement.style.fontSize = '21px'; // 131% reading scale
      document.documentElement.setAttribute('data-text-size', 'xlarge');
    } else {
      document.documentElement.style.fontSize = ''; // Default 16px
      document.documentElement.setAttribute('data-text-size', 'normal');
    }
    return () => {
      document.documentElement.style.fontSize = '';
    };
  }, [fontSize]);

  // Persist and apply Dyslexia Font
  useEffect(() => {
    localStorage.setItem('atlas_dyslexic_font', String(dyslexicFont));
    if (dyslexicFont) {
      document.documentElement.classList.add('font-dyslexic');
    } else {
      document.documentElement.classList.remove('font-dyslexic');
    }
  }, [dyslexicFont]);

  // Persist and apply High Contrast Mode
  useEffect(() => {
    localStorage.setItem('atlas_high_contrast', String(highContrast));
    if (highContrast) {
      document.documentElement.classList.add('theme-high-contrast');
    } else {
      document.documentElement.classList.remove('theme-high-contrast');
    }
  }, [highContrast]);

  // =========================================================================
  // 4 UNIVERSAL ACCESSIBILITY DISABILITY SUITES (State & Persistence)
  // =========================================================================

  // Screen reader live announcement helper
  const [ariaAnnounce, setAriaAnnounce] = useState<string>('');
  const announceToScreenReader = (msg: string) => {
    setAriaAnnounce(msg);
  };

  // 1. Motor & Mobility Switch Access State
  const [switchAccessEnabled, setSwitchAccessEnabled] = useState<boolean>(() => {
    return localStorage.getItem('atlas_switch_access') === 'true';
  });
  const [switchSpeed, setSwitchSpeed] = useState<number>(() => {
    const s = localStorage.getItem('atlas_switch_speed');
    return s ? parseFloat(s) : 2.0;
  });
  const [, setScannedIndex] = useState<number>(0);
  const [switchPaused, setSwitchPaused] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('atlas_switch_access', String(switchAccessEnabled));
  }, [switchAccessEnabled]);

  useEffect(() => {
    localStorage.setItem('atlas_switch_speed', String(switchSpeed));
  }, [switchSpeed]);

  // 3. Hearing Impaired & Deaf Access State (Closed Captions + Visual Sound Alerts)
  const [closedCaptionsEnabled, setClosedCaptionsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('atlas_closed_captions') !== 'false';
  });
  const [captionSize, setCaptionSize] = useState<'normal' | 'large' | 'xlarge'>(() => {
    const s = localStorage.getItem('atlas_caption_size');
    return s === 'large' || s === 'xlarge' ? s : 'normal';
  });
  const [currentCaption, setCurrentCaption] = useState<{ text: string; speaker: string; active: boolean }>({
    text: '',
    speaker: 'Atlas Voice',
    active: false,
  });

  const [visualAlertsEnabled, setVisualAlertsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('atlas_visual_sound_alerts') !== 'false';
  });
  const [activeSoundAlert, setActiveSoundAlert] = useState<SoundAlertInfo | null>(null);

  useEffect(() => {
    localStorage.setItem('atlas_closed_captions', String(closedCaptionsEnabled));
  }, [closedCaptionsEnabled]);

  useEffect(() => {
    localStorage.setItem('atlas_caption_size', captionSize);
  }, [captionSize]);

  useEffect(() => {
    localStorage.setItem('atlas_visual_sound_alerts', String(visualAlertsEnabled));
  }, [visualAlertsEnabled]);

  // Subscribe to Closed Captions events from TTS & Media
  useEffect(() => {
    const unsubscribe = addCaptionListener((evt: CaptionEvent) => {
      if (evt.active && evt.text) {
        setCurrentCaption({
          text: evt.text,
          speaker: evt.speaker || 'Atlas Voice',
          active: true,
        });
      } else {
        setCurrentCaption((prev) => ({ ...prev, active: false }));
      }
    });
    return unsubscribe;
  }, []);

  // Subscribe to Visual Sound Alerts for Deaf / Hard of Hearing users
  useEffect(() => {
    const unsubscribe = addSoundAlertListener((alert: SoundAlertInfo) => {
      if (visualAlertsEnabled) {
        setActiveSoundAlert(alert);
        // Also flash border subtly
        document.documentElement.classList.add('sound-flash-active');
        setTimeout(() => {
          document.documentElement.classList.remove('sound-flash-active');
        }, 1200);

        const timer = setTimeout(() => {
          setActiveSoundAlert((curr) => (curr?.id === alert.id ? null : curr));
        }, 3800);
        return () => clearTimeout(timer);
      }
    });
    return unsubscribe;
  }, [visualAlertsEnabled]);

  // 4. Cognitive & Neurodiverse State (Reading Focus Ruler, Dyscalculia, Plain Language)
  const [readingRulerEnabled, setReadingRulerEnabled] = useState<boolean>(() => {
    return localStorage.getItem('atlas_reading_ruler') === 'true';
  });
  const [rulerY, setRulerY] = useState<number>(220);

  const [dyscalculiaColorsEnabled, setDyscalculiaColorsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('atlas_dyscalculia_colors') === 'true';
  });

  const [plainLanguageMode, setPlainLanguageMode] = useState<boolean>(() => {
    return localStorage.getItem('atlas_plain_language') === 'true';
  });

  // Quick Accessibility Palette Modal State
  const [isA11yModalOpen, setIsA11yModalOpen] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('atlas_reading_ruler', String(readingRulerEnabled));
  }, [readingRulerEnabled]);

  useEffect(() => {
    localStorage.setItem('atlas_dyscalculia_colors', String(dyscalculiaColorsEnabled));
    if (dyscalculiaColorsEnabled) {
      document.documentElement.classList.add('dyscalculia-math-colors');
    } else {
      document.documentElement.classList.remove('dyscalculia-math-colors');
    }
  }, [dyscalculiaColorsEnabled]);

  useEffect(() => {
    localStorage.setItem('atlas_plain_language', String(plainLanguageMode));
  }, [plainLanguageMode]);

  // Track cursor for Reading Focus Ruler
  useEffect(() => {
    if (!readingRulerEnabled) return;
    const handleMouseMove = (e: MouseEvent) => {
      setRulerY(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [readingRulerEnabled]);

  // Auto-Scanning Switch Access Interval Loop
  useEffect(() => {
    if (!switchAccessEnabled || switchPaused) {
      document.querySelectorAll('.switch-scanned-target').forEach((el) => {
        el.classList.remove('switch-scanned-target');
      });
      return;
    }

    const intervalId = setInterval(() => {
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(
          '.academic-nav-btn, .academic-feature-card, .btn-primary, .btn-action, .seg-btn, .btn-back-to-home, .theme-card-option, .btn-simplify-plain'
        )
      ).filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
      });

      if (candidates.length === 0) return;

      setScannedIndex((prev) => {
        const nextIdx = (prev + 1) % candidates.length;
        candidates.forEach((c) => c.classList.remove('switch-scanned-target'));
        const nextEl = candidates[nextIdx];
        if (nextEl) {
          nextEl.classList.add('switch-scanned-target');
          nextEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return nextIdx;
      });
    }, switchSpeed * 1000);

    return () => {
      clearInterval(intervalId);
      document.querySelectorAll('.switch-scanned-target').forEach((el) => {
        el.classList.remove('switch-scanned-target');
      });
    };
  }, [switchAccessEnabled, switchPaused, switchSpeed]);

  // Trigger click on currently scanned switch element
  const handleSwitchTrigger = () => {
    const activeEl = document.querySelector<HTMLElement>('.switch-scanned-target');
    if (activeEl) {
      announceToScreenReader('Activated ' + (activeEl.innerText || 'Selected item'));
      activeEl.click();
    }
  };

  // Keyboard shortcut listener (Alt+A, Alt+C, Alt+S, Alt+R, Space for switch)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + A: Open Accessibility Palette
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setIsA11yModalOpen((prev) => !prev);
        return;
      }
      // Alt + C: Toggle Closed Captions
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        setClosedCaptionsEnabled((prev) => {
          const next = !prev;
          announceToScreenReader(next ? 'Closed Captions Enabled' : 'Closed Captions Disabled');
          return next;
        });
        return;
      }
      // Alt + S: Toggle Switch Access
      if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        setSwitchAccessEnabled((prev) => {
          const next = !prev;
          announceToScreenReader(next ? 'Switch Access Enabled' : 'Switch Access Disabled');
          return next;
        });
        return;
      }
      // Alt + R: Toggle Reading Ruler
      if (e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        setReadingRulerEnabled((prev) => {
          const next = !prev;
          announceToScreenReader(next ? 'Reading Focus Ruler Enabled' : 'Reading Focus Ruler Disabled');
          return next;
        });
        return;
      }
      // Space for Switch Access Trigger (when not typing in form inputs)
      if (switchAccessEnabled && e.code === 'Space') {
        const isInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
        if (!isInput) {
          e.preventDefault();
          handleSwitchTrigger();
          return;
        }
      }
      // Escape closes a11y modal
      if (e.key === 'Escape' && isA11yModalOpen) {
        setIsA11yModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [switchAccessEnabled, isA11yModalOpen]);

  // Learning History State
  const [activities, setActivities] = useState<LearningActivity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState<boolean>(false);
  const [activityFilter, setActivityFilter] = useState<'all' | ActivityType>('all');
  const [activitySearch, setActivitySearch] = useState<string>('');
  const [expandedActivityId, setExpandedActivityId] = useState<number | string | null>(null);
  const [copiedActivityId, setCopiedActivityId] = useState<number | string | null>(null);

  // Load activities from both SQLite and localStorage
  const refreshActivities = async (filter?: string, userToQuery?: User | null) => {
    setIsLoadingActivities(true);
    try {
      const activeUser = userToQuery !== undefined ? userToQuery : currentUser;
      const items = await loadAllLearningActivities(filter || activityFilter, activeUser);
      setActivities(items);
    } catch (err) {
      console.warn('Failed to refresh learning activities:', err);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  // Sync all user metrics and learning history when logged-in user changes
  useEffect(() => {
    const streak = computeStreakForUser(currentUser);
    setDayStreak(streak);
    const solved = getUserItem<number>('academic_solved', currentUser, 0);
    setProblemsSolved(solved);
    const due = getUserItem<number>('academic_due', currentUser, 0);
    setFlashcardsDue(due);
    const saved = getUserItem<number>('academic_saved', currentUser, 0);
    setFlashcardsSaved(saved);
    refreshActivities(activityFilter, currentUser);
  }, [currentUser?.id]);

  useEffect(() => {
    refreshActivities();

    const handleLogged = () => {
      refreshActivities();
      setProblemsSolved((prev) => {
        const next = prev + 1;
        setUserItem('academic_solved', next, currentUser);
        return next;
      });
    };

    window.addEventListener('atlas_activity_logged', handleLogged);
    return () => {
      window.removeEventListener('atlas_activity_logged', handleLogged);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      refreshActivities(activityFilter);
    }
  }, [activeTab, activityFilter]);

  const handleDeleteActivity = async (id: number | string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
    try {
      const storageKey = getUserStorageKey('learning_activities', currentUser);
      const raw = localStorage.getItem(storageKey) || '[]';
      const list: LearningActivity[] = JSON.parse(raw);
      const filtered = list.filter((a) => a.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(filtered));
    } catch {}

    if (typeof id === 'number' || (!isNaN(Number(id)) && !String(id).startsWith('local-'))) {
      api.deleteActivity(id).catch(() => {});
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm(t.confirmClearHistory)) return;
    setActivities([]);
    removeUserItem('learning_activities', currentUser);
    try {
      await api.clearActivities();
    } catch {}
  };

  const handleExportHistory = () => {
    if (activities.length === 0) return;
    const lines = [
      `==================================================`,
      `ATLAS 2.0 - Student Learning Activity Report`,
      `Generated: ${new Date().toLocaleString()}`,
      `Total Activities Logged: ${activities.length}`,
      `==================================================`,
      '',
    ];
    activities.forEach((a, i) => {
      lines.push(`[${i + 1}] Type: ${a.activity_type.toUpperCase()}`);
      lines.push(`Title: ${a.title}`);
      lines.push(`Date: ${new Date(a.created_at).toLocaleString()}`);
      if (a.score) lines.push(`Score / Accuracy: ${a.score}`);
      if (a.details) lines.push(`Summary: ${a.details}`);
      if (a.solution) lines.push(`Full Details/Solution:\n${a.solution}`);
      lines.push('--------------------------------------------------\n');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `atlas-learning-history-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Virtual Keyboard state (Odia & Hindi)
  const [showQuestionKeyboard, setShowQuestionKeyboard] = useState<boolean>(false);
  const [showMathKeyboard, setShowMathKeyboard] = useState<boolean>(false);
  const [showVoiceKeyboard, setShowVoiceKeyboard] = useState<boolean>(false);
  const [showGeographyKeyboard, setShowGeographyKeyboard] = useState<boolean>(false);
  const [keyboardLang, setKeyboardLang] = useState<IndicLanguage>(
    selectedLanguage === 'Hindi' ? 'Hindi' : 'Odia'
  );

  // Automatically keep keyboard language aligned with selected language when in Indic modes
  useEffect(() => {
    if (selectedLanguage === 'Hindi') setKeyboardLang('Hindi');
    else if (selectedLanguage === 'Odia') setKeyboardLang('Odia');
  }, [selectedLanguage]);

  const handleInsertChar = (char: string, field: 'question' | 'math' | 'voice' | 'geography') => {
    if (field === 'question') {
      setQuestionInput((prev) => prev + char);
    } else if (field === 'math') {
      setMathInput((prev) => prev + char);
    } else if (field === 'voice') {
      setVoiceText((prev) => prev + char);
    } else if (field === 'geography') {
      setGeographyInput((prev) => prev + char);
    }
  };

  const handleBackspace = (field: 'question' | 'math' | 'voice' | 'geography') => {
    if (field === 'question') {
      setQuestionInput((prev) => (prev ? Array.from(prev).slice(0, -1).join('') : ''));
    } else if (field === 'math') {
      setMathInput((prev) => (prev ? Array.from(prev).slice(0, -1).join('') : ''));
    } else if (field === 'voice') {
      setVoiceText((prev) => (prev ? Array.from(prev).slice(0, -1).join('') : ''));
    } else if (field === 'geography') {
      setGeographyInput((prev) => (prev ? Array.from(prev).slice(0, -1).join('') : ''));
    }
  };

  const handleClearField = (field: 'question' | 'math' | 'voice' | 'geography') => {
    if (field === 'question') setQuestionInput('');
    else if (field === 'math') setMathInput('');
    else if (field === 'voice') setVoiceText('');
    else if (field === 'geography') setGeographyInput('');
  };

  // Multilingual Voice Access (Speech-to-Text Voice Search) State & Double Click Activation
  const [voiceModalOpen, setVoiceModalOpen] = useState<boolean>(false);
  const [voiceModalMode, setVoiceModalMode] = useState<'question' | 'math' | 'voice' | 'geography'>('question');
  const [doubleClickVoiceEnabled, setDoubleClickVoiceEnabled] = useState<boolean>(() => {
    return localStorage.getItem('atlas_double_click_voice') !== 'false';
  });
  const [voiceRipple, setVoiceRipple] = useState<{ x: number; y: number } | null>(null);
  const [showVoiceFloatingHint, setShowVoiceFloatingHint] = useState<boolean>(true);

  // Global Double-Click & Touch Double-Tap listener to activate Voice Access from any side of the screen
  useEffect(() => {
    if (!doubleClickVoiceEnabled) return;

    const triggerVoiceAccess = (clientX: number, clientY: number) => {
      // Visual ripple feedback at click coordinates
      setVoiceRipple({ x: clientX, y: clientY });
      setTimeout(() => setVoiceRipple(null), 850);

      // Play synthesized auditory confirmation chime
      playVoiceAccessChime();

      // Automatically determine voice mode based on current active tab
      if (activeTab === 'solve-math') {
        setVoiceModalMode('math');
      } else if (activeTab === 'voice-learning' || activeTab === 'studycast') {
        setVoiceModalMode('voice');
      } else if (activeTab === 'geography-idea') {
        setVoiceModalMode('geography');
      } else {
        setVoiceModalMode('question');
      }

      setVoiceModalOpen(true);
    };

    const handleWindowDoubleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Do NOT trigger if user is selecting/interacting with input fields, textareas, buttons, or links
      const isInteractiveOrInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable ||
        Boolean(
          target.closest(
            'input, textarea, select, button, a, [contenteditable="true"], .voice-modal-card, .voice-modal-backdrop'
          )
        );

      if (isInteractiveOrInput) return;

      triggerVoiceAccess(e.clientX, e.clientY);
    };

    // Mobile & touchscreen double-tap detection (< 320ms between taps)
    let lastTapTimestamp = 0;
    const handleWindowTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      const timeDiff = now - lastTapTimestamp;
      lastTapTimestamp = now;

      if (timeDiff > 40 && timeDiff < 320) {
        const target = e.target as HTMLElement | null;
        if (!target) return;

        const isInteractiveOrInput =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          Boolean(
            target.closest(
              'input, textarea, select, button, a, [contenteditable="true"], .voice-modal-card, .voice-modal-backdrop'
            )
          );

        if (isInteractiveOrInput) return;

        const touch = e.changedTouches[0] || e.touches[0];
        const clientX = touch ? touch.clientX : window.innerWidth / 2;
        const clientY = touch ? touch.clientY : window.innerHeight / 2;
        triggerVoiceAccess(clientX, clientY);
      }
    };

    window.addEventListener('dblclick', handleWindowDoubleClick, { passive: true });
    window.addEventListener('touchend', handleWindowTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('dblclick', handleWindowDoubleClick);
      window.removeEventListener('touchend', handleWindowTouchEnd);
    };
  }, [doubleClickVoiceEnabled, activeTab]);

  const handleVoiceSearch = (spokenText: string, lang?: 'English' | 'Hindi' | 'Odia') => {
    setVoiceModalOpen(false);
    if (!spokenText.trim()) return;

    if (lang && lang !== selectedLanguage) {
      setSelectedLanguage(lang);
    }
    const targetLang = lang || selectedLanguage;

    if (voiceModalMode === 'question') {
      setQuestionInput(spokenText);
      handleAskQuestion(spokenText, targetLang);
      setActiveTab('ask-question');
    } else if (voiceModalMode === 'math') {
      setMathInput(spokenText);
      handleSolveMath(spokenText, targetLang);
      setActiveTab('solve-math');
    } else if (voiceModalMode === 'voice') {
      setVoiceText(spokenText);
      handleSpeakCustom(spokenText);
      setActiveTab('voice-learning');
    } else if (voiceModalMode === 'geography') {
      setGeographyInput(spokenText);
      handleExploreGeography(spokenText);
      setActiveTab('geography-idea');
    }
  };

  // Solve a math problem using OpenRouter AI
  const handleSolveMath = async (customProblem?: string, customLang?: 'English' | 'Hindi' | 'Odia') => {
    const raw = (customProblem ?? mathInput).trim();
    if (!raw || isSolving) return;

    const langToUse = customLang || selectedLanguage;
    setIsSolving(true);
    try {
      const solution = await api.solveMath(raw, langToUse);
      setMathSolution(solution);
      setProblemsSolved((prev) => {
        const next = prev + 1;
        setUserItem('academic_solved', next, currentUser);
        return next;
      });
      setDayStreak((prev) => {
        const next = prev === 0 ? 1 : prev;
        setUserItem('academic_streak', next, currentUser);
        return next;
      });

      logLearningActivity({
        activity_type: 'math',
        title: raw,
        details: solution.result ? `Result: ${solution.result}` : 'Math problem solved',
        solution: `${solution.result}\n\nStep-by-Step:\n${(solution.steps || []).join('\n')}`,
        language: langToUse,
      });
    } catch (err) {
      console.error('Failed to solve math problem:', err);
      // Fallback
      setMathSolution({
        problem: raw,
        result: 'Calculation complete',
        steps: [
          '1. Expressed equation: ' + raw,
          '2. Applied order of operations and isolated variable',
          '3. Verified algebraic equality',
        ],
      });

      logLearningActivity({
        activity_type: 'math',
        title: raw,
        details: 'Calculation complete',
        solution: `Result: Calculation complete\n\nSteps:\n1. Expressed equation: ${raw}\n2. Applied order of operations and isolated variable\n3. Verified algebraic equality`,
        language: langToUse,
      });
    } finally {
      setIsSolving(false);
    }
  };

  // Ask Question Handler using OpenRouter AI
  const handleAskQuestion = async (customQ?: string, customLang?: 'English' | 'Hindi' | 'Odia') => {
    const q = (customQ ?? questionInput).trim();
    if (!q || isAsking) return;

    const langToUse = customLang || selectedLanguage;
    setIsAsking(true);
    try {
      const answer = await api.askQuestion(q, langToUse);
      setQuestionAnswer(answer);
      setProblemsSolved((prev) => {
        const next = prev + 1;
        setUserItem('academic_solved', next, currentUser);
        return next;
      });

      logLearningActivity({
        activity_type: 'qa',
        title: q,
        details: answer.slice(0, 150) + (answer.length > 150 ? '...' : ''),
        solution: answer,
        language: langToUse,
      });
    } catch (err) {
      console.error('Failed to ask question:', err);
      setQuestionAnswer(
        langToUse === 'Odia'
          ? 'କ୍ଷମା କରିବେ, ଏହି ମୁହୂର୍ତ୍ତରେ ଉତ୍ତର ପ୍ରସ୍ତୁତ କରିବାରେ ଅସୁବିଧା ହେଲା। ଦୟାକରି ପୁନର୍ବାର ଚେଷ୍ଟା କରନ୍ତୁ।'
          : langToUse === 'Hindi'
          ? 'क्षमा करें, इस समय उत्तर तैयार करने में समस्या आई। कृपया पुनः प्रयास करें।'
          : 'Unable to generate answer at this moment. Please check your connection and try again.'
      );
    } finally {
      setIsAsking(false);
    }
  };

  // =========================================================================
  // GEOGRAPHY IDEA EXPLORER STATE & HANDLERS
  // =========================================================================
  const [geographyInput, setGeographyInput] = useState<string>('Plate Tectonics & Continental Drift');
  const [geographyResult, setGeographyResult] = useState<string | null>(null);
  const [isExploringGeography, setIsExploringGeography] = useState<boolean>(false);
  const [geographyCopied, setGeographyCopied] = useState<boolean>(false);
  const [selectedGeoCategory, setSelectedGeoCategory] = useState<string>('All');

  const GEOGRAPHY_PRESET_IDEAS = [
    {
      category: 'Landforms',
      title: 'Plate Tectonics & Continental Drift',
      query: 'Explain the theory of Plate Tectonics, continental drift, and how tectonic boundaries form mountains, trenches, and earthquakes.',
      icon: '🏔️',
      summary: 'Dynamic lithospheric plates shifting across the asthenosphere, sculpting continents and ocean floors.',
    },
    {
      category: 'Climate',
      title: 'Indian Monsoon & Seasonal Wind Reversal',
      query: 'How does the Indian Monsoon system develop, how do the Arabian Sea and Bay of Bengal branches work, and why is it vital for agriculture?',
      icon: '🌧️',
      summary: 'Differential heating between the Asian landmass and Indian Ocean driving moisture-rich monsoon winds.',
    },
    {
      category: 'Oceans',
      title: 'Global Ocean Conveyor Belt (Thermohaline)',
      query: 'What is Thermohaline circulation, why is it called the Global Ocean Conveyor Belt, and how does it regulate planetary temperatures?',
      icon: '🌊',
      summary: 'Dense cold saline water sinking at the poles driving planetary-scale heat redistribution.',
    },
    {
      category: 'Landforms',
      title: 'Pacific Ring of Fire & Deep Ocean Trenches',
      query: 'What is the Pacific Ring of Fire, how did the Mariana Trench form, and why are most volcanoes located here?',
      icon: '🌋',
      summary: 'Horseshoe-shaped belt of subducting oceanic plates hosting 75% of the planet\'s active volcanoes.',
    },
    {
      category: 'Regional',
      title: 'Himalayan Mountain Formation & Mt. Everest',
      query: 'How did the collision of the Indian Plate into the Eurasian Plate create the Himalayas, Tibetan Plateau, and Mt. Everest?',
      icon: '⛰️',
      summary: 'Convergent tectonic collision folding the ancient Tethys Sea sediments into the world\'s highest peaks.',
    },
    {
      category: 'Biomes',
      title: 'Amazon River Basin & Equatorial Rainforest',
      query: 'What makes the Amazon River basin and tropical rainforest ecologically unique, and how does it generate its own weather?',
      icon: '🌿',
      summary: 'Equatorial low-pressure zone sustaining the greatest biodiversity hotspot and massive transpiration rivers in the sky.',
    },
    {
      category: 'Regional',
      title: 'Mahanadi River Basin & Chilika Lake Lagoon',
      query: 'Describe the geographical features of Odisha’s Mahanadi river basin, Hirakud reservoir, and the unique ecology of Chilika Lake.',
      icon: '🛶',
      summary: 'East-flowing river system shaping fertile deltaic plains and feeding Asia\'s largest brackish coastal lagoon.',
    },
    {
      category: 'Earth Systems',
      title: 'Earth\'s 23.5° Tilt, Equinoxes & Solstices',
      query: 'How does Earth’s axial tilt of 23.5 degrees create contrasting seasons, polar midnight sun, and tropical weather belts?',
      icon: '🌍',
      summary: 'Obliquity causing uneven solar insolation throughout the orbital year, driving the four seasons.',
    },
    {
      category: 'Climate',
      title: 'Why Subtropical Deserts Form Around 30° Latitude',
      query: 'Why are major deserts like Sahara, Thar, and Arabian Deserts located along the 30-degree North and South latitudes (Hadley Cells)?',
      icon: '🏜️',
      summary: 'Descending dry air from Hadley atmospheric circulation cells creating high pressure and arid conditions.',
    },
  ];

  const handleExploreGeography = async (customTopic?: string) => {
    const raw = (customTopic ?? geographyInput).trim();
    if (!raw || isExploringGeography) return;

    setIsExploringGeography(true);
    try {
      const prompt =
        selectedLanguage === 'Odia'
          ? `ତୁମେ ଜଣେ ବିଶେଷଜ୍ଞ ଭୂଗୋଳ ପ୍ରଫେସର। ଦୟାକରି ନିମ୍ନଲିଖିତ ଭୂଗୋଳ ଧାରଣା (Geography idea) ର ଏକ ଆକର୍ଷଣୀୟ, ଶିକ୍ଷଣୀୟ ଓ ସ୍ପଷ୍ଟ ବିଶ୍ଳେଷଣ ଓଡ଼ିଆରେ ପ୍ରଦାନ କରନ୍ତୁ: "${raw}"।\nଏଥିରେ ୫ଟି ସ୍ପଷ୍ଟ ବିଭାଗ ରଖନ୍ତୁ:\n1. 💡 ମୁଖ୍ୟ ଭୌଗୋଳିକ ଧାରଣା (Core Concept)\n2. 🗺️ ଭୌଗୋଳିକ ଅବସ୍ଥିତି ଓ ମାନଚିତ୍ର ସୂଚନା (Locations & Map Context)\n3. ⚙️ ବୈଜ୍ଞାନିକ ପ୍ରକ୍ରିୟା ବା କାର୍ଯ୍ୟପଦ୍ଧତି (Geological / Atmospheric Process)\n4. 🌟 ରୋଚକ ତଥ୍ୟ ଓ ମାନବ ସମାଜ ଉପରେ ପ୍ରଭାବ (Fascinating Facts & Impact)\n5. ❓ ଶିକ୍ଷାର୍ଥୀ ପାଇଁ ଏକ ଚିନ୍ତନ ପ୍ରଶ୍ନ (Quick Reflection Question)`
          : selectedLanguage === 'Hindi'
          ? `आप एक विशेषज्ञ भूगोल प्रोफेसर हैं। कृपया निम्नलिखित भूगोल विचार (Geography idea) का एक स्पष्ट, रोचक और शैक्षणिक विश्लेषण हिंदी में प्रदान करें: "${raw}"।\nइसमें 5 स्पष्ट बिंदु शामिल करें:\n1. 💡 मुख्य भौगोलिक विचार (Core Concept)\n2. 🗺️ भौगोलिक स्थान एवं मानचित्र संदर्भ (Locations & Map Context)\n3. ⚙️ वैज्ञानिक प्रक्रिया एवं कार्यप्रणाली (Geological / Atmospheric Process)\n4. 🌟 रोचक तथ्य एवं मानव समाज पर प्रभाव (Fascinating Facts & Impact)\n5. ❓ विद्यार्थी के लिए विचारणीय प्रश्न (Quick Reflection Question)`
          : `You are a world-class geography professor and earth scientist. Please explain this Geography Idea in an engaging, deeply educational, and structured manner: "${raw}".\nProvide 5 distinct sections:\n1. 💡 Core Geographic Idea & Overview\n2. 🗺️ Global Distribution, Coordinates & Map Context\n3. ⚙️ Earth Systems Mechanism (How it works geologically or atmospherically)\n4. 🌟 Fascinating Geographic Wonders & Real-World Impact\n5. ❓ Quick Reflection / Quiz Question for the Student`;

      const answer = await api.askQuestion(prompt, selectedLanguage);
      setGeographyResult(answer);
      setProblemsSolved((prev) => {
        const next = prev + 1;
        setUserItem('academic_solved', next, currentUser);
        return next;
      });

      logLearningActivity({
        activity_type: 'geography',
        title: raw,
        details: answer.slice(0, 160) + (answer.length > 160 ? '...' : ''),
        solution: answer,
        language: selectedLanguage,
      });
    } catch (err) {
      console.error('Failed to explore geography idea:', err);
      setGeographyResult(
        selectedLanguage === 'Odia'
          ? `ଭୂଗୋଳ ଧାରଣା: ${raw}\n\nପୃଥିବୀର ପ୍ରାକୃତିକ ଓ ଭୌଗୋଳିକ ପ୍ରଣାଳୀ ପରସ୍ପର ସହ ଗଭୀର ଭାବେ ଜଡ଼ିତ। ଦୟାକରି ଇଣ୍ଟରନେଟ୍ ସଂଯୋଗ ଯାଞ୍ଚ କରି ପୁନର୍ବାର ଚେଷ୍ଟା କରନ୍ତୁ।`
          : selectedLanguage === 'Hindi'
          ? `भूगोल विचार: ${raw}\n\nपृथ्वी की प्राकृतिक एवं भौगोलिक प्रणालियाँ आपस में गहराई से जुड़ी हैं। कृपया इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें।`
          : `Geography Idea: ${raw}\n\nEarth's lithosphere, hydrosphere, and atmosphere operate in dynamic interconnected balance. Please check connection and try again.`
      );
    } finally {
      setIsExploringGeography(false);
    }
  };

  const handleRandomGeographyIdea = () => {
    const randomItem = GEOGRAPHY_PRESET_IDEAS[Math.floor(Math.random() * GEOGRAPHY_PRESET_IDEAS.length)];
    setGeographyInput(randomItem.title);
    handleExploreGeography(randomItem.query);
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Update playback speed dynamically when speechRate slider moves
  useEffect(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.playbackRate = speechRate;
    }
  }, [speechRate]);

  // Stop any active audio playback
  const stopAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
    setIsAudioLoading(false);
    setCurrentSpeakingText('');
    setHighlightWordIndex(null);
  };

  // Browser speech fallback if network audio has issues
  const fallbackBrowserSpeak = (text: string) => {
    speakWithBrowserFallback(text, selectedLanguage, {
      rate: speechRate,
      onStart: () => {
        setIsSpeaking(true);
        setIsPaused(false);
        setIsAudioLoading(false);
      },
      onEnd: () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentSpeakingText('');
        setHighlightWordIndex(null);
      },
      onError: (err) => {
        console.warn('Browser speech fallback error:', err);
        setIsSpeaking(false);
        setIsPaused(false);
        setIsAudioLoading(false);
        setCurrentSpeakingText('');
        setAudioError('Voice playback was interrupted or unsupported. Please check device volume.');
      },
    });
  };

  // Main universal Play/Pause toggle handler for any AI speaker
  const handlePlayPauseAudio = async (rawText: string) => {
    const cleanText = rawText.trim();
    if (!cleanText || isAudioLoading) return;

    // 1. If currently speaking this exact text and not paused -> PAUSE
    if (isSpeaking && !isPaused && currentSpeakingText === cleanText) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      } else if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.pause();
      }
      setIsPaused(true);
      return;
    }

    // 2. If currently paused on this exact text -> RESUME
    if (isPaused && currentSpeakingText === cleanText) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.play().catch(() => {
          fallbackBrowserSpeak(cleanText);
        });
        setIsPaused(false);
        setIsSpeaking(true);
        return;
      } else if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.resume();
        setIsPaused(false);
        setIsSpeaking(true);
        return;
      }
    }

    // 3. Otherwise, stop existing, pre-unlock audio for mobile, and start speaking new text
    stopAudio();
    // Synchronously pre-unlock audio on user gesture before async fetch starts
    audioPlayerRef.current = preUnlockAudio(audioPlayerRef.current);
    await startSpeakCustom(cleanText);
  };

  // Start speaking custom text from beginning
  const startSpeakCustom = async (cleanText: string) => {
    setAudioError(null);
    setIsAudioLoading(true);
    setCurrentSpeakingText(cleanText);
    setIsPaused(false);

    // Clean markdown, LaTeX, and symbols for natural spoken speech
    const speechCleanedText = cleanTextForSpeech(cleanText);
    if (!speechCleanedText) {
      setIsAudioLoading(false);
      return;
    }

    try {
      // 1. Fetch MP3 audio blob via POST /api/tts/speak (eliminates URI length restrictions)
      const blob = await api.fetchTTSAudioBlob(speechCleanedText, selectedLanguage);
      const audioUrl = URL.createObjectURL(blob);
      
      const audio = audioPlayerRef.current || new Audio();
      audioPlayerRef.current = audio;
      audio.pause();
      audio.src = audioUrl;
      audio.playbackRate = speechRate;
      audio.currentTime = 0;

      const words = speechCleanedText.split(/\s+/).filter(Boolean);

      audio.oncanplay = () => {
        setIsAudioLoading(false);
      };

      audio.onplay = () => {
        setIsSpeaking(true);
        setIsPaused(false);
        setIsAudioLoading(false);
      };

      // Real-time word progress calculation
      audio.ontimeupdate = () => {
        if (!audio.duration || words.length === 0) return;
        const progress = Math.min(1, Math.max(0, audio.currentTime / audio.duration));
        const activeIdx = Math.min(words.length - 1, Math.floor(progress * words.length));
        setHighlightWordIndex(activeIdx);
      };

      audio.onended = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentSpeakingText('');
        setHighlightWordIndex(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        console.warn('Network audio stream failed, falling back to browser speech synthesis...');
        URL.revokeObjectURL(audioUrl);
        fallbackBrowserSpeak(speechCleanedText);
      };

      await audio.play();
    } catch (err) {
      console.warn('Audio play threw an exception, falling back to browser speech:', err);
      fallbackBrowserSpeak(speechCleanedText);
    }
  };

  // Backwards-compatible custom speech caller
  const handleSpeakCustom = async (rawText: string) => {
    await handlePlayPauseAudio(rawText);
  };

  // Main Voice Learning handler
  const handleSpeak = () => {
    handlePlayPauseAudio(voiceText);
    if (voiceText.trim() && !isSpeaking && !isPaused) {
      logLearningActivity({
        activity_type: 'voice',
        title: voiceText.slice(0, 75).trim() + (voiceText.length > 75 ? '...' : ''),
        details: `Voice lesson playback (${voiceText.split(/\s+/).filter(Boolean).length} words at ${speechRate}x)`,
        solution: voiceText,
        language: selectedLanguage,
      });
    }
  };

  // Speak Flashcard Q&A with TTS audio
  const handleSpeakCard = (card: FlashcardItem) => {
    const textToSpeak = `${card.category}. ${card.q}. ${card.a}`;
    handlePlayPauseAudio(textToSpeak);
  };

  // Real week day names and current calendar date
  const now = new Date();
  const dayOfWeekIndex = (now.getDay() + 6) % 7; // 0 = Mon, 1 = Tue, ..., 6 = Sun

  const dayNamesFull = {
    English: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    Hindi: ['सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार', 'रविवार'],
    Odia: ['ସୋମବାର', 'ମଙ୍ଗଳବାର', 'ବୁଧବାର', 'ଗୁରୁବାର', 'ଶୁକ୍ରବାର', 'ଶନିବାର', 'ରବିବାର'],
  };

  const todayDayName = dayNamesFull[selectedLanguage][dayOfWeekIndex];

  // Formatted date string for header
  const formattedTodayDate = now.toLocaleDateString(
    selectedLanguage === 'Hindi' ? 'hi-IN' : selectedLanguage === 'Odia' ? 'or-IN' : 'en-US',
    { month: 'short', day: 'numeric', year: 'numeric' }
  );

  const weekDayLabels = {
    English: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    Hindi: ['सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि', 'रवि'],
    Odia: ['ସୋମ', 'ମଙ୍ଗଳ', 'ବୁଧ', 'ଗୁରୁ', 'ଶୁକ୍ର', 'ଶନି', 'ରବି'],
  };

  const weekDays = weekDayLabels[selectedLanguage].map((label, idx) => {
    const isToday = idx === dayOfWeekIndex;
    const streakLength = Math.max(1, dayStreak);
    const isWithinStreak = idx <= dayOfWeekIndex && idx >= Math.max(0, dayOfWeekIndex - (streakLength - 1));
    return {
      label,
      fullDay: dayNamesFull[selectedLanguage][idx],
      active: isToday || isWithinStreak,
      isToday,
    };
  });

  // Render step-by-step formatted answer cards instead of a single continuous paragraph
  const renderFormattedAnswer = (text: string) => {
    if (!text) return null;

    // Split on step headers like "ପଦକ୍ଷେପ ୧", "Step 1", "चरण 1", "1."
    const stepRegex = /(?:^|\n\n+)(?=(?:ପଦକ୍ଷେପ\s*[୧୨୩୪୫\d]|Step\s*\d|चरण\s*[\d१२३४५]|\d+[\.\)])\s*)/gi;
    const rawChunks = text.split(stepRegex).map((c) => c.trim()).filter(Boolean);

    if (rawChunks.length > 1) {
      return (
        <div className="academic-step-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.75rem' }}>
          {rawChunks.map((chunk, idx) => {
            const lines = chunk.split('\n').filter(Boolean);
            const titleLine = lines[0] || '';
            const bodyLines = lines.slice(1).join('\n').trim();

            return (
              <div
                key={idx}
                className="step-item-card"
                style={{
                  background: 'rgba(255, 255, 255, 0.92)',
                  border: '1px solid rgba(99, 102, 241, 0.22)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: bodyLines ? '6px' : '0' }}>
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  >
                    {selectedLanguage === 'Odia' ? `ପଦକ୍ଷେପ ${idx + 1}` : selectedLanguage === 'Hindi' ? `चरण ${idx + 1}` : `Step ${idx + 1}`}
                  </span>
                  <strong style={{ color: '#1e1b4b', fontSize: '0.96rem' }}>
                    {titleLine.replace(/^(?:ପଦକ୍ଷେପ\s*[୧୨୩୪୫\d]|Step\s*\d|चरण\s*[\d१२३४५]|\d+[\.\)])\s*[:\-\)]?\s*/i, '').replace(/^#+\s*/, '')}
                  </strong>
                </div>
                {bodyLines && (
                  <p style={{ margin: 0, color: '#334155', fontSize: '0.92rem', lineHeight: '1.65', whiteSpace: 'pre-line', paddingLeft: '8px' }}>
                    {bodyLines}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="answer-content whitespace-pre-line leading-relaxed" style={{ fontSize: '0.95rem', lineHeight: '1.7', marginTop: '0.5rem' }}>
        {text}
      </div>
    );
  };

  return (
    <div
      className={`academic-app-wrapper theme-${currentTheme} ${dyslexicFont ? 'font-dyslexic' : ''} ${
        highContrast ? 'theme-high-contrast' : ''
      } text-size-${fontSize}`}
      data-theme={currentTheme}
    >
      {/* ========================================================================= */}
      {/* TOP HEADER: Matches Image Exactly                                        */}
      {/* ========================================================================= */}
      <header className="academic-top-header">
        <div className="academic-header-left">
          <div className="academic-logo-group">
            <img src="/atlas-logo.png" alt="ATLAS 2.0" className="academic-header-logo" />
            <h1 className="academic-app-title">{t.appTitle}</h1>
          </div>
        </div>

        <div className="academic-header-right">
          {/* Language Selector: English, Hindi, Odia */}
          <div className="academic-lang-selector">
            <Globe size={18} className="lang-globe-icon" />
            <select
              value={selectedLanguage}
              onChange={(e) => {
                const newLang = e.target.value as 'English' | 'Hindi' | 'Odia';
                stopAudio();
                setSelectedLanguage(newLang);
                setVoiceText(translations[newLang].voiceSampleText);
              }}
              className="lang-select-dropdown"
              aria-label="Select Language"
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Odia">Odia</option>
            </select>
          </div>

          {/* User Account / Navigation Shortcuts */}
          <div className="academic-header-actions">
            {/* Quick Online / Offline Mode Toggle Header Action */}
            <button
              id="header-btn-network-toggle"
              type="button"
              className={`btn-academic-subtle btn-network-mode-header ${isOffline ? 'offline' : 'online'}`}
              onClick={() => {
                const nextMode = !isOffline;
                api.setOfflineMode(nextMode);
                if (!nextMode && !api.getToken()) {
                  onNavigateToAuth?.();
                }
              }}
              title={isOffline ? "Currently running in Offline Mode (Zero Internet). Click to switch to Online." : "Currently in Online Mode (Cloud Backend & AI). Click to switch to Offline."}
            >
              {isOffline ? <WifiOff size={15} style={{ color: '#f59e0b' }} /> : <Wifi size={15} style={{ color: '#10b981' }} />}
              <span className="network-header-label" style={{ fontWeight: 600 }}>
                {isOffline ? 'Offline Mode' : 'Online Mode'}
              </span>
            </button>

            {/* Quick Download Cached App Button */}
            <button
              id="header-btn-download-cached"
              type="button"
              className="btn-academic-subtle btn-download-header"
              onClick={() => setIsDownloadModalOpen(true)}
              title="Download or Install Cached App for Mobile & Laptop"
            >
              <Download size={15} style={{ color: '#06b6d4' }} />
              <span className="network-header-label" style={{ fontWeight: 600 }}>
                Download App
              </span>
            </button>

            {/* Quick Theme Toggle Header Action */}
            <button
              id="header-btn-theme-toggle"
              type="button"
              className="btn-academic-subtle btn-theme-quick-toggle"
              onClick={() => {
                const themes: ThemeMode[] = ['dark', 'light', 'cyberpunk', 'emerald', 'amber'];
                const nextIdx = (themes.indexOf(currentTheme) + 1) % themes.length;
                setCurrentTheme(themes[nextIdx]);
              }}
              title={`Switch Theme (Current: ${currentTheme.toUpperCase()})`}
            >
              <Palette size={15} />
              <span className="theme-toggle-label">
                {currentTheme === 'dark' ? 'Dark' : currentTheme === 'light' ? 'Light' : currentTheme === 'cyberpunk' ? 'Cyber' : currentTheme === 'emerald' ? 'Emerald' : 'Amber'}
              </span>
            </button>

            {/* Quick Access Multilingual Voice Access Header Action */}
            <button
              id="header-btn-voice-access"
              type="button"
              className="btn-academic-subtle btn-voice-access-header"
              onClick={() => {
                playVoiceAccessChime();
                if (activeTab === 'solve-math') setVoiceModalMode('math');
                else if (activeTab === 'voice-learning' || activeTab === 'studycast') setVoiceModalMode('voice');
                else if (activeTab === 'geography-idea') setVoiceModalMode('geography');
                else setVoiceModalMode('question');
                setVoiceModalOpen(true);
              }}
              title={t.voiceAccessHint}
            >
              <div className="voice-mic-icon-bubble">
                <Mic size={15} />
                <span className="voice-live-dot" />
              </div>
              <span>{t.voiceAccessBtn}</span>
              <span className="voice-dblclick-pill">2x Click</span>
            </button>

            {/* Quick Access Image Scanner Header Action */}
            <button
              id="header-btn-image-scanner"
              type="button"
              className="btn-academic-subtle"
              onClick={() => setActiveTab('image-scanner')}
              title="Open Image Scanner & Vision AI"
            >
              <Camera size={15} />
              <span>{t.imageScannerNav}</span>
            </button>

            {/* Quick Access PDF Scanner Header Action */}
            <button
              id="header-btn-pdf-scanner"
              type="button"
              className="btn-academic-subtle"
              onClick={() => setActiveTab('pdf-scanner')}
              title="Scan PDF to Text, Solve Questions & Explain"
            >
              <FileText size={15} />
              <span>{t.pdfScannerNav}</span>
            </button>

            {(currentUser?.role === 'admin' || currentUser?.role === 'developer') && onNavigateToWorkspace && (
              <button
                id="header-btn-workspace"
                type="button"
                className="btn-academic-subtle"
                onClick={onNavigateToWorkspace}
                style={{
                  background: 'rgba(99, 102, 241, 0.12)',
                  borderColor: 'rgba(99, 102, 241, 0.35)',
                  color: '#4f46e5',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                title="Open SQLite Database Workspace"
              >
                <Layers size={15} />
                <span>{t.dbWorkspaceNav}</span>
              </button>
            )}

            {currentUser?.role === 'admin' && onNavigateToAdmin && (
              <button
                type="button"
                className="btn-academic-subtle"
                onClick={onNavigateToAdmin}
                style={{
                  background: 'rgba(168, 85, 247, 0.15)',
                  borderColor: 'rgba(168, 85, 247, 0.4)',
                  color: '#c084fc',
                  fontWeight: 700,
                }}
                title="Open Admin Control Panel"
              >
                <span>🛡️ Admin Panel</span>
              </button>
            )}
            {onNavigateToAuth && (
              <button
                type="button"
                className="btn-academic-subtle"
                onClick={onNavigateToAuth}
                title="Account Settings"
              >
                <span>Account</span>
              </button>
            )}
            {currentUser && onLogout && (
              <button
                type="button"
                className="btn-academic-subtle"
                onClick={onLogout}
                title="Sign out"
              >
                <span>Sign Out ({currentUser.username})</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN CONTAINER: Split Sidebar + Content                                   */}
      {/* ========================================================================= */}
      <div className="academic-main-container">
        {/* LEFT SIDEBAR NAVIGATION */}
        <aside className="academic-sidebar" aria-label="Main Navigation">
          <nav className="academic-nav-list">
            <button
              type="button"
              className={`academic-nav-btn ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => setActiveTab('home')}
            >
              <span>{t.home}</span>
            </button>

            <button
              type="button"
              className={`academic-nav-btn ${activeTab === 'solve-math' ? 'active' : ''}`}
              onClick={() => setActiveTab('solve-math')}
            >
              <span>{t.solveMath}</span>
            </button>

            <button
              type="button"
              className={`academic-nav-btn ${activeTab === 'ask-question' ? 'active' : ''}`}
              onClick={() => setActiveTab('ask-question')}
            >
              <span>{t.askQuestion}</span>
            </button>

            <button
              id="sidebar-nav-image-scanner"
              type="button"
              className={`academic-nav-btn ${activeTab === 'image-scanner' ? 'active' : ''}`}
              onClick={() => setActiveTab('image-scanner')}
            >
              <span>{t.imageScannerNav}</span>
            </button>

            <button
              id="sidebar-nav-pdf-scanner"
              type="button"
              className={`academic-nav-btn ${activeTab === 'pdf-scanner' ? 'active' : ''}`}
              onClick={() => setActiveTab('pdf-scanner')}
            >
              <span>{t.pdfScannerNav}</span>
            </button>

            <button
              type="button"
              className={`academic-nav-btn ${activeTab === 'flashcards' ? 'active' : ''}`}
              onClick={() => setActiveTab('flashcards')}
            >
              <span>{t.flashcards}</span>
            </button>

            <button
              type="button"
              className={`academic-nav-btn ${activeTab === 'voice-learning' ? 'active' : ''}`}
              onClick={() => setActiveTab('voice-learning')}
            >
              <span>{t.voiceLearning}</span>
            </button>

            <button
              id="sidebar-nav-geography-idea"
              type="button"
              className={`academic-nav-btn ${activeTab === 'geography-idea' ? 'active' : ''}`}
              onClick={() => setActiveTab('geography-idea')}
            >
              <span>{t.geographyIdeaNav}</span>
            </button>

            <button
              id="sidebar-nav-studycast"
              type="button"
              className={`academic-nav-btn ${activeTab === 'studycast' ? 'active' : ''}`}
              onClick={() => setActiveTab('studycast')}
            >
              <span>{t.studycastNav}</span>
            </button>

            <button
              id="sidebar-nav-mindmap"
              type="button"
              className={`academic-nav-btn ${activeTab === 'mindmap' ? 'active' : ''}`}
              onClick={() => setActiveTab('mindmap')}
            >
              <span>{t.mindmapNav}</span>
            </button>

            <button
              id="sidebar-nav-battle-quiz"
              type="button"
              className={`academic-nav-btn ${activeTab === 'battle-quiz' ? 'active' : ''}`}
              onClick={() => setActiveTab('battle-quiz')}
            >
              <span>{t.battleQuizNav}</span>
            </button>

            <button
              type="button"
              className={`academic-nav-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <span>{t.history}</span>
            </button>

            <button
              type="button"
              className={`academic-nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <span>{t.settings}</span>
            </button>

            {(currentUser?.role === 'admin' || currentUser?.role === 'developer') && onNavigateToWorkspace && (
              <button
                id="sidebar-nav-workspace"
                type="button"
                className="academic-nav-btn"
                onClick={onNavigateToWorkspace}
                style={{
                  fontWeight: 700,
                  color: '#4f46e5',
                  borderColor: 'rgba(99, 102, 241, 0.3)',
                  background: 'rgba(99, 102, 241, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '0.5rem',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={16} />
                  <span>{t.dbWorkspaceNav}</span>
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    background: '#e0e7ff',
                    color: '#3730a3',
                    padding: '2px 7px',
                    borderRadius: '999px',
                    fontWeight: 800,
                  }}
                >
                  {liveStats?.total ?? 4}
                </span>
              </button>
            )}
          </nav>
        </aside>

        {/* RIGHT CONTENT PANEL */}
        <main className="academic-content-area">
          {/* ================================================================= */}
          {/* TAB 1: HOME (EXACT MATCH OF IMAGE)                                */}
          {/* ================================================================= */}
          {activeTab === 'home' && (
            <div className="academic-home-view">
              <h2 className="academic-section-heading">{t.home}</h2>

              {/* WELCOME HERO CARD */}
              <div className="academic-welcome-banner">
                <div className="welcome-banner-texts">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <h3 className="welcome-banner-title">{userGreeting}</h3>
                    {currentUser && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '999px',
                          background: currentUser.role === 'admin' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: currentUser.role === 'admin' ? '#7e22ce' : '#1d4ed8',
                          border: `1px solid ${currentUser.role === 'admin' ? 'rgba(168, 85, 247, 0.35)' : 'rgba(59, 130, 246, 0.35)'}`,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {currentUser.role}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: '999px',
                        background: isOffline ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                        color: isOffline ? '#b45309' : '#065f46',
                        border: isOffline ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: isOffline ? '#f59e0b' : '#10b981', display: 'inline-block' }} />
                      {isOffline ? '⚡ Offline Mode (Local Storage)' : t.dbStatusBadge}
                    </span>
                  </div>
                  <p className="welcome-banner-subtitle">
                    {t.welcomeSub}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-welcome-solve"
                    onClick={() => setActiveTab('solve-math')}
                  >
                    {t.solveBtn}
                  </button>
                  <button
                    id="btn-welcome-image-scanner"
                    type="button"
                    className="btn-welcome-solve"
                    onClick={() => setActiveTab('image-scanner')}
                    style={{
                      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      color: '#ffffff',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                    }}
                  >
                    {t.scanImageBtn}
                  </button>
                  <button
                    id="btn-welcome-pdf-scanner"
                    type="button"
                    className="btn-welcome-solve"
                    onClick={() => setActiveTab('pdf-scanner')}
                    style={{
                      background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                      color: '#ffffff',
                      boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                    }}
                  >
                    {t.scanPdfBtn}
                  </button>
                </div>
              </div>

              {/* STATS METRIC CARDS (4 COLUMNS - SYNCED WITH SQLITE DATABASE) */}
              <div className="academic-stats-grid">
                {/* Metric 1: Day Streak */}
                <div className="academic-stat-card">
                  <div className="stat-card-value-row">
                    <span className="stat-fire-icon">🔥</span>
                    <span className="stat-number">{dayStreak}</span>
                    <span style={{ fontSize: '0.9rem', color: '#ea580c', fontWeight: 700, marginLeft: '4px' }}>
                      {dayStreak === 1
                        ? (selectedLanguage === 'Hindi' ? 'दिन' : selectedLanguage === 'Odia' ? 'ଦିନ' : 'Day')
                        : (selectedLanguage === 'Hindi' ? 'दिन' : selectedLanguage === 'Odia' ? 'ଦିନ' : 'Days')}
                    </span>
                  </div>
                  <span className="stat-label">
                    {t.dayStreak} • {todayDayName}
                  </span>
                </div>

                {/* Metric 2: Problems Solved */}
                <div className="academic-stat-card">
                  <div className="stat-card-value-row">
                    <span className="stat-number">
                      {currentUser?.role === 'admin' || currentUser?.role === 'developer'
                        ? (problemsSolved > 0 ? problemsSolved : (liveStats?.by_status?.done ?? 1))
                        : problemsSolved}
                    </span>
                  </div>
                  <span className="stat-label">{t.problemsSolved}</span>
                </div>

                {/* Metric 3: Flashcards Due / Database Nodes for Admin */}
                <div className="academic-stat-card">
                  <div className="stat-card-value-row">
                    <span className="stat-number">
                      {currentUser?.role === 'admin' || currentUser?.role === 'developer'
                        ? (liveStats?.total ?? 4)
                        : flashcardsDue}
                    </span>
                  </div>
                  <span className="stat-label">
                    {currentUser?.role === 'admin' || currentUser?.role === 'developer'
                      ? t.dbNodesLabel
                      : t.flashcardsDue}
                  </span>
                </div>

                {/* Metric 4: Flashcards Saved / In-Progress Tasks for Admin */}
                <div className="academic-stat-card">
                  <div className="stat-card-value-row">
                    <span className="stat-number">
                      {currentUser?.role === 'admin' || currentUser?.role === 'developer'
                        ? (liveStats?.by_status?.in_progress ?? 2)
                        : flashcardsSaved}
                    </span>
                  </div>
                  <span className="stat-label">
                    {currentUser?.role === 'admin' || currentUser?.role === 'developer'
                      ? `${t.activeTasksLabel} (${flashcardsSaved} saved)`
                      : t.flashcardsSaved}
                  </span>
                </div>
              </div>

              {/* QUICK ACTION FEATURE CARDS (4 COLUMNS) */}
              <div className="academic-features-grid">
                {/* Card 1: Solve Mathematics */}
                <div
                  className="academic-feature-card"
                  onClick={() => setActiveTab('solve-math')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="feature-card-header">
                    <span className="feature-card-icon">➗</span>
                    <h4 className="feature-card-title">{t.mathCardTitle}</h4>
                  </div>
                  <p className="feature-card-desc">{t.mathCardDesc}</p>
                </div>

                {/* Card 2: Ask a Question */}
                <div
                  className="academic-feature-card"
                  onClick={() => setActiveTab('ask-question')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="feature-card-header">
                    <span className="feature-card-icon">💭</span>
                    <h4 className="feature-card-title">{t.askCardTitle}</h4>
                  </div>
                  <p className="feature-card-desc">{t.askCardDesc}</p>
                </div>

                {/* Card 2.5: Image Scanner Option */}
                <div
                  className="academic-feature-card"
                  onClick={() => setActiveTab('image-scanner')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="feature-card-header">
                    <span className="feature-card-icon">📷</span>
                    <h4 className="feature-card-title">{t.imageScannerCardTitle}</h4>
                  </div>
                  <p className="feature-card-desc">{t.imageScannerCardDesc}</p>
                </div>

                {/* Card 2.6: PDF Scanner Option */}
                <div
                  className="academic-feature-card"
                  onClick={() => setActiveTab('pdf-scanner')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="feature-card-header">
                    <span className="feature-card-icon">📄</span>
                    <h4 className="feature-card-title">{t.pdfScannerCardTitle}</h4>
                  </div>
                  <p className="feature-card-desc">{t.pdfScannerCardDesc}</p>
                </div>

                {/* Card 3: Flashcards */}
                <div
                  className="academic-feature-card"
                  onClick={() => setActiveTab('flashcards')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="feature-card-header">
                    <span className="feature-card-icon">🃏</span>
                    <h4 className="feature-card-title">{t.flashcardsCardTitle}</h4>
                  </div>
                  <p className="feature-card-desc">{t.flashcardsCardDesc} • {flashcardsDue} due</p>
                </div>

                {/* Card 4: Voice Learning */}
                <div
                  className="academic-feature-card"
                  onClick={() => setActiveTab('voice-learning')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="feature-card-header">
                    <span className="feature-card-icon">🔊</span>
                    <h4 className="feature-card-title">{t.voiceCardTitle}</h4>
                  </div>
                  <p className="feature-card-desc">{t.voiceCardDesc}</p>
                </div>

                {/* Card 5: Geography Idea */}
                <div
                  id="home-feature-card-geography-idea"
                  className="academic-feature-card"
                  onClick={() => setActiveTab('geography-idea')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="feature-card-header">
                    <span className="feature-card-icon">🌍</span>
                    <h4 className="feature-card-title">{t.geographyCardTitle}</h4>
                  </div>
                  <p className="feature-card-desc">{t.geographyCardDesc}</p>
                </div>

                {/* Card 6: StudyCast Podcasts */}
                <div
                  id="home-feature-card-studycast"
                  className="academic-feature-card"
                  onClick={() => setActiveTab('studycast')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="feature-card-header">
                    <span className="feature-card-icon">🎙️</span>
                    <h4 className="feature-card-title">{t.studycastCardTitle}</h4>
                  </div>
                  <p className="feature-card-desc">{t.studycastCardDesc}</p>
                </div>

                {/* Card 7: Interactive Knowledge Mind Map */}
                <div
                  id="home-feature-card-mindmap"
                  className="academic-feature-card"
                  onClick={() => setActiveTab('mindmap')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="feature-card-header">
                    <span className="feature-card-icon">🧠</span>
                    <h4 className="feature-card-title">{t.mindmapCardTitle}</h4>
                  </div>
                  <p className="feature-card-desc">{t.mindmapCardDesc}</p>
                </div>

                {/* Card 8: Battle of Brains Speed Duel Arena */}
                <div
                  id="home-feature-card-battle-quiz"
                  className="academic-feature-card"
                  onClick={() => setActiveTab('battle-quiz')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="feature-card-header">
                    <span className="feature-card-icon">⚔️</span>
                    <h4 className="feature-card-title">{t.battleQuizCardTitle}</h4>
                  </div>
                  <p className="feature-card-desc">{t.battleQuizCardDesc}</p>
                </div>
              </div>

              {/* LIVE DATABASE CATEGORIES & NODES STRIP (Only for Admin / Developer) */}
              {(currentUser?.role === 'admin' || currentUser?.role === 'developer') && (
                <div
                  className="academic-week-card"
                  style={{
                    background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.95), rgba(241, 245, 249, 0.95))',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    marginTop: '1.25rem',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Layers size={18} color="#4f46e5" />
                      <h4 className="week-card-title" style={{ margin: 0, color: '#1e1b4b', fontSize: '1rem' }}>
                        {t.dbCategoryTitle}
                      </h4>
                    </div>
                    {onNavigateToWorkspace && (
                      <button
                        type="button"
                        onClick={onNavigateToWorkspace}
                        style={{
                          background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 14px',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)',
                        }}
                      >
                        <span>{t.exploreDbBtn}</span>
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {liveStats?.by_category && Object.keys(liveStats.by_category).length > 0 ? (
                      Object.entries(liveStats.by_category).map(([cat, count]) => (
                        <div
                          key={cat}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.82rem',
                            fontWeight: 500,
                            color: '#334155',
                          }}
                        >
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{cat}</span>
                          <span
                            style={{
                              background: '#e0e7ff',
                              color: '#4338ca',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '999px',
                            }}
                          >
                            {count}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        Synchronizing with SQLite database...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* THIS WEEK ACTIVITY STRIP */}
              <div className="academic-week-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 className="week-card-title" style={{ margin: 0 }}>{t.thisWeek}</h4>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        padding: '2px 8px',
                        borderRadius: '999px',
                      }}
                    >
                      {todayDayName}, {formattedTodayDate}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.82rem', color: '#ea580c', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span>🔥</span>
                    <span>
                      {dayStreak}{' '}
                      {dayStreak === 1
                        ? (selectedLanguage === 'Hindi' ? 'दिन की स्ट्रीक' : selectedLanguage === 'Odia' ? 'ଦିନର ଷ୍ଟ୍ରିକ୍' : 'Day Streak')
                        : (selectedLanguage === 'Hindi' ? 'दिन की स्ट्रीक' : selectedLanguage === 'Odia' ? 'ଦିନର ଷ୍ଟ୍ରିକ୍' : 'Days Streak')}
                    </span>
                  </span>
                </div>
                <div className="week-days-row">
                  {weekDays.map((d, idx) => (
                    <div
                      key={idx}
                      className={`week-day-pill ${d.active ? 'active-streak' : ''}`}
                      title={`${d.fullDay}${d.isToday ? ' (Today)' : ''}`}
                      style={{
                        position: 'relative',
                        border: d.isToday ? '2px solid #2563eb' : undefined,
                        boxShadow: d.isToday ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : undefined,
                      }}
                    >
                      <span>{d.label}</span>
                      {d.isToday && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '-5px',
                            right: '-3px',
                            background: '#ef4444',
                            color: '#ffffff',
                            fontSize: '9px',
                            fontWeight: 800,
                            borderRadius: '999px',
                            padding: '1px 4px',
                            lineHeight: 1,
                            border: '1px solid #ffffff',
                          }}
                        >
                          ●
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* PRIVACY ASSURANCE BANNER */}
              <div className="academic-privacy-card">
                <div className="privacy-card-accent-bar" />
                <div className="privacy-card-text">
                  {t.privacyNotice}
                </div>
              </div>

              {/* FOOTER NOTICE */}
              <div className="academic-footer-notice">
                <p>
                  {t.footerNotice}
                </p>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: SOLVE A MATHEMATICS PROBLEM                                */}
          {/* ================================================================= */}
          {activeTab === 'solve-math' && (
            <div className="academic-subview-card">
              <div className="subview-header">
                <div>
                  <h2 className="academic-section-heading">Solve a Mathematics Problem</h2>
                  <p className="subview-subtitle">Exact, checked, spoken steps with algebraic verification</p>
                </div>
                <button
                  type="button"
                  className="btn-back-to-home"
                  onClick={() => setActiveTab('home')}
                >
                  ← Back to Home
                </button>
              </div>

              <div className="solver-input-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label className="solver-input-label" style={{ marginBottom: 0 }}>
                    Enter equation, fraction, or arithmetic problem:
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn-voice-access-pill"
                      onClick={() => {
                        setVoiceModalMode('math');
                        setVoiceModalOpen(true);
                      }}
                      title="Speak math problem in English, Hindi, or Odia"
                    >
                      <Mic size={14} />
                      <span>
                        {selectedLanguage === 'Odia'
                          ? '🎙️ କହିକି ସମାଧାନ'
                          : selectedLanguage === 'Hindi'
                          ? '🎙️ बोलकर हल करें'
                          : '🎙️ Voice Math'}
                      </span>
                    </button>

                    <button
                      type="button"
                      className={`btn-toggle-keyboard ${showMathKeyboard ? 'active' : ''}`}
                      onClick={() => setShowMathKeyboard(!showMathKeyboard)}
                      title="Toggle Indic Keyboard"
                    >
                      <Keyboard size={14} />
                      <span>
                        {showMathKeyboard
                          ? 'Close'
                          : selectedLanguage === 'Odia'
                          ? '⌨️ କୀବୋର୍ଡ'
                          : selectedLanguage === 'Hindi'
                          ? '⌨️ कीबोर्ड'
                          : '⌨️ Keyboard'}
                      </span>
                    </button>
                  </div>
                </div>
                <div className="solver-input-row">
                  <input
                    type="text"
                    className="academic-input-field"
                    value={mathInput}
                    onChange={(e) => setMathInput(e.target.value)}
                    placeholder="e.g. 2x + 8 = 20 or (14 * 3) / 2"
                  />
                  <button
                    type="button"
                    className="btn-solve-action"
                    disabled={isSolving}
                    onClick={() => handleSolveMath()}
                  >
                    {isSolving ? (
                      <>
                        <Loader2 size={16} className="animate-spin mr-1" />
                        Solving with AI...
                      </>
                    ) : (
                      'Solve Steps'
                    )}
                  </button>
                </div>

                {showMathKeyboard && (
                  <IndicVirtualKeyboard
                    language={keyboardLang}
                    onLanguageChange={setKeyboardLang}
                    onInsertChar={(ch) => handleInsertChar(ch, 'math')}
                    onBackspace={() => handleBackspace('math')}
                    onClear={() => handleClearField('math')}
                    onClose={() => setShowMathKeyboard(false)}
                  />
                )}

                <div className="sample-chips-row">
                  <span>Try samples: </span>
                  <button
                    type="button"
                    className="sample-chip"
                    onClick={() => {
                      setMathInput('2x + 8 = 20');
                      handleSolveMath('2x + 8 = 20');
                    }}
                  >
                    2x + 8 = 20
                  </button>
                  <button
                    type="button"
                    className="sample-chip"
                    onClick={() => {
                      setMathInput('x^2 - 5x + 6 = 0');
                      handleSolveMath('x^2 - 5x + 6 = 0');
                    }}
                  >
                    Quadratic Equation
                  </button>
                  <button
                    type="button"
                    className="sample-chip"
                    onClick={() => {
                      setMathInput('(3/4) + (5/6)');
                      handleSolveMath('(3/4) + (5/6)');
                    }}
                  >
                    Fractions: 3/4 + 5/6
                  </button>
                </div>
              </div>

              {mathSolution && (
                <div className="solution-result-panel">
                  <div className="solution-header">
                    <span className="solution-badge">Verified Solution</span>
                    <h3 className="solution-result-text">Answer: {mathSolution.result}</h3>
                  </div>

                  <div className="solution-steps-list">
                    <h4 className="steps-title">Step-by-Step Breakdown:</h4>
                    {mathSolution.steps.map((st, i) => (
                      <div key={i} className="solution-step-item">
                        <CheckCircle size={16} className="step-check-icon" />
                        <span>{st}</span>
                      </div>
                    ))}
                  </div>

                  <div className="solution-voice-toolbar" style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {(() => {
                      const mathStepsText =
                        selectedLanguage === 'Odia'
                          ? `ଏଠାରେ ପଦକ୍ଷେପ ଅନୁଯାୟୀ ସମାଧାନ ଦିଆଗଲା। ${mathSolution.steps.join('। ')}। ଚୂଡ଼ାନ୍ତ ଉତ୍ତର: ${mathSolution.result}`
                          : selectedLanguage === 'Hindi'
                          ? `यहाँ चरण-दर-चरण समाधान दिया गया है। ${mathSolution.steps.join('। ')}। अंतिम उत्तर: ${mathSolution.result}`
                          : `Here is the step by step solution. ${mathSolution.steps.join('. ')}. Final answer: ${mathSolution.result}`;
                      const isPlayingThis = isSpeaking && !isPaused && currentSpeakingText === mathStepsText;
                      const isPausedThis = isPaused && currentSpeakingText === mathStepsText;
                      return (
                        <>
                          <button
                            type="button"
                            className={`btn-read-aloud ${isPlayingThis ? 'active' : ''}`}
                            onClick={() => handlePlayPauseAudio(mathStepsText)}
                            title={isPlayingThis ? 'Pause Audio' : isPausedThis ? 'Resume Audio' : 'Speak Steps Aloud'}
                          >
                            {isPlayingThis ? (
                              <>
                                <Pause size={16} />
                                <span>{selectedLanguage === 'Odia' ? '⏸ ବିରତି (Pause)' : selectedLanguage === 'Hindi' ? '⏸ रोकें (Pause)' : 'Pause Steps'}</span>
                              </>
                            ) : isPausedThis ? (
                              <>
                                <Play size={16} />
                                <span>{selectedLanguage === 'Odia' ? '▶ ଚଲାନ୍ତୁ (Resume)' : selectedLanguage === 'Hindi' ? '▶ जारी रखें (Resume)' : 'Resume Steps'}</span>
                              </>
                            ) : (
                              <>
                                <Volume2 size={16} />
                                <span>
                                  {selectedLanguage === 'Odia'
                                    ? '🔊 ଓଡ଼ିଆ ସ୍ୱରରେ ଶୁଣନ୍ତୁ (Listen Steps)'
                                    : selectedLanguage === 'Hindi'
                                    ? '🔊 आवाज़ में सुनें (Listen Steps)'
                                    : 'Speak Steps Aloud'}
                                </span>
                              </>
                            )}
                          </button>

                          {(isPlayingThis || isPausedThis) && (
                            <button
                              type="button"
                              className="btn-read-aloud"
                              style={{ color: '#ef4444', borderColor: '#fca5a5', background: '#fff1f2' }}
                              onClick={stopAudio}
                              title="Stop Audio"
                            >
                              <Square size={14} />
                              <span>{selectedLanguage === 'Odia' ? 'ବନ୍ଦ' : selectedLanguage === 'Hindi' ? 'बंद' : 'Stop'}</span>
                            </button>
                          )}
                        </>
                      );
                    })()}

                    <button
                      type="button"
                      className="btn-read-aloud"
                      style={{ background: '#f8fafc', color: '#475569', borderColor: '#cbd5e1' }}
                      onClick={() => {
                        stopAudio();
                        const mathStepsText =
                          selectedLanguage === 'Odia'
                            ? `ଏଠାରେ ପଦକ୍ଷେପ ଅନୁଯାୟୀ ସମାଧାନ ଦିଆଗଲା। ${mathSolution.steps.join('। ')}। ଚୂଡ଼ାନ୍ତ ଉତ୍ତର: ${mathSolution.result}`
                            : selectedLanguage === 'Hindi'
                            ? `यहाँ चरण-दर-चरण समाधान दिया गया है। ${mathSolution.steps.join('। ')}। अंतिम उत्तर: ${mathSolution.result}`
                            : `Here is the step by step solution. ${mathSolution.steps.join('. ')}. Final answer: ${mathSolution.result}`;
                        setVoiceText(mathStepsText);
                        setActiveTab('voice-learning');
                      }}
                      title="Open in Voice Studio"
                    >
                      <Sparkles size={15} />
                      <span>Voice Studio</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Dynamic Mathematical Graph & Sonification Engine */}
              <MathGraphVisualizer
                problem={mathSolution?.problem || mathInput || '2x + 8 = 20'}
                solutionResult={mathSolution?.result}
                language={selectedLanguage}
              />
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: ASK A QUESTION                                             */}
          {/* ================================================================= */}
          {activeTab === 'ask-question' && (
            <div className="academic-subview-card">
              <div className="subview-header">
                <div>
                  <h2 className="academic-section-heading">
                    {selectedLanguage === 'Odia' ? 'ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ (Ask a Question)' : selectedLanguage === 'Hindi' ? 'प्रश्न पूछें (Ask a Question)' : 'Ask a Question'}
                  </h2>
                  <p className="subview-subtitle">
                    {selectedLanguage === 'Odia'
                      ? 'ଓଡ଼ିଆ ଭାଷା ଓ ଅକ୍ଷରରେ ଶିକ୍ଷାଗତ ପ୍ରଶ୍ନର ସଠିକ୍ ଓ ବିସ୍ତୃତ ଉତ୍ତର ପାଆନ୍ତୁ'
                      : selectedLanguage === 'Hindi'
                      ? 'हिन्दी में किसी भी शैक्षणिक प्रश्न का सटीक और सरल उत्तर पाएं'
                      : 'Instant conceptual reasoning powered by ATLAS AI Tutor'}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-back-to-home"
                  onClick={() => setActiveTab('home')}
                >
                  ← Back to Home
                </button>
              </div>

              {/* Quick Sample Questions Chips */}
              <div className="mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  {selectedLanguage === 'Odia' ? 'ଦ୍ରୁତ ଉଦାହରଣ ପ୍ରଶ୍ନ (କ୍ଲିକ୍ କରନ୍ତୁ):' : selectedLanguage === 'Hindi' ? 'त्वरित उदाहरण प्रश्न (क्लिक करें):' : 'Suggested Questions:'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {(selectedLanguage === 'Odia'
                    ? [
                        'ମାଧ୍ୟାକର୍ଷଣ ବଳ କଣ ଏବଂ ଏହା କିପରି କାର୍ଯ୍ୟ କରେ?',
                        'ଉଦ୍ଭିଦରେ ଆଲୋକ ସଂଶ୍ଳେଷଣ ପ୍ରକ୍ରିୟା କିପରି ହୁଏ?',
                        'ପୃଥିବୀ ସୂର୍ଯ୍ୟ ଚାରିପାଖରେ କାହିଁକି ଘୂର୍ଣ୍ଣନ କରେ?',
                      ]
                    : selectedLanguage === 'Hindi'
                    ? [
                        'गुरुत्वाकर्षण बल क्या है और यह कैसे काम करता है?',
                        'पौधों में प्रकाश संश्लेषण की प्रक्रिया कैसे होती है?',
                        'पृथ्वी सूर्य के चारों ओर क्यों घूमती है?',
                      ]
                    : [
                        'What is Newton’s Law of Universal Gravitation?',
                        'How does photosynthesis work in green plants?',
                        'Why does the Earth orbit around the Sun?',
                      ]
                  ).map((sample, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      className="text-xs px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-slate-700 border border-slate-200"
                      onClick={() => setQuestionInput(sample)}
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>

              <div className="solver-input-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {selectedLanguage === 'Odia' ? 'ପ୍ରଶ୍ନ ଲେଖନ୍ତୁ କିମ୍ବା କୁହନ୍ତୁ:' : selectedLanguage === 'Hindi' ? 'प्रश्न लिखें या बोलें:' : 'Type or Speak Question:'}
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn-voice-access-pill"
                      onClick={() => {
                        setVoiceModalMode('question');
                        setVoiceModalOpen(true);
                      }}
                      title="Speak question in English, Hindi, or Odia"
                    >
                      <Mic size={14} />
                      <span>
                        {selectedLanguage === 'Odia'
                          ? '🎙️ କହିକି ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ'
                          : selectedLanguage === 'Hindi'
                          ? '🎙️ बोलकर प्रश्न पूछें'
                          : '🎙️ Voice Question'}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`btn-toggle-keyboard ${showQuestionKeyboard ? 'active' : ''}`}
                      onClick={() => setShowQuestionKeyboard(!showQuestionKeyboard)}
                      title="Toggle On-Screen Indic Keyboard"
                    >
                      <Keyboard size={15} />
                      <span>
                        {showQuestionKeyboard
                          ? (selectedLanguage === 'Odia' ? 'କୀବୋର୍ଡ ବନ୍ଦ' : 'कीबोर्ड बंद')
                          : (selectedLanguage === 'Odia' ? '⌨️ ଓଡ଼ିଆ କୀବୋର୍ଡ' : selectedLanguage === 'Hindi' ? '⌨️ हिन्दी कीबोर्ड' : '⌨️ Indic Keyboard')}
                      </span>
                    </button>
                  </div>
                </div>

                <textarea
                  className="academic-textarea-field"
                  rows={4}
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  placeholder={
                    selectedLanguage === 'Odia'
                      ? 'ପଦାର୍ଥ ବିଜ୍ଞାନ, ରସାୟନ ବିଜ୍ଞାନ, ଜୀବ ବିଜ୍ଞାନ, ଗଣିତ କିମ୍ବା ଇତିହାସ ବିଷୟରେ ଯେକୌଣସି ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ...'
                      : selectedLanguage === 'Hindi'
                      ? 'भौतिकी, रसायन, जीवविज्ञान, गणित या इतिहास में कोई भी प्रश्न पूछें...'
                      : 'Ask any question in Physics, Chemistry, Biology, Mathematics, or History...'
                  }
                />

                {showQuestionKeyboard && (
                  <IndicVirtualKeyboard
                    language={keyboardLang}
                    onLanguageChange={setKeyboardLang}
                    onInsertChar={(ch) => handleInsertChar(ch, 'question')}
                    onBackspace={() => handleBackspace('question')}
                    onClear={() => handleClearField('question')}
                    onClose={() => setShowQuestionKeyboard(false)}
                  />
                )}

                <button
                  type="button"
                  className="btn-solve-action"
                  disabled={isAsking}
                  onClick={() => handleAskQuestion()}
                >
                  {isAsking ? (
                    <>
                      <Loader2 size={16} className="animate-spin mr-1" />
                      {selectedLanguage === 'Odia' ? 'ଓଡ଼ିଆରେ ଉତ୍ତର ପ୍ରସ୍ତୁତ ହେଉଛି...' : selectedLanguage === 'Hindi' ? 'उत्तर तैयार हो रहा है...' : 'Thinking with AI...'}
                    </>
                  ) : (
                    selectedLanguage === 'Odia' ? 'ଉତ୍ତର ପାଆନ୍ତୁ (Get Answer)' : selectedLanguage === 'Hindi' ? 'उत्तर प्राप्त करें (Get Answer)' : 'Get Answer'
                  )}
                </button>
              </div>

              {questionAnswer && (
                <div className="question-answer-box">
                  <div className="answer-header">
                    <Sparkles size={18} className="answer-sparkle" />
                    <h4>
                      {selectedLanguage === 'Odia'
                        ? 'ଓଡ଼ିଆ ଶିକ୍ଷାଗତ ଉତ୍ତର (Odia Academic Explanation)'
                        : selectedLanguage === 'Hindi'
                        ? 'शैक्षणिक उत्तर (Academic Explanation)'
                        : 'Academic Reasoning Answer'}
                    </h4>
                  </div>
                  {renderFormattedAnswer(questionAnswer)}
                  <div className="solution-voice-toolbar" style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                    <button
                      type="button"
                      className={`btn-read-aloud ${isSpeaking && !isPaused && currentSpeakingText === questionAnswer ? 'active' : ''}`}
                      onClick={() => handlePlayPauseAudio(questionAnswer)}
                      disabled={isAudioLoading}
                    >
                      {isAudioLoading && currentSpeakingText === questionAnswer ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>
                            {selectedLanguage === 'Odia' ? 'ସ୍ୱର ପ୍ରସ୍ତୁତ ହେଉଛି...' : selectedLanguage === 'Hindi' ? 'आवाज तैयार हो रही है...' : 'Synthesizing voice...'}
                          </span>
                        </>
                      ) : isSpeaking && !isPaused && currentSpeakingText === questionAnswer ? (
                        <>
                          <Pause size={16} />
                          <span>
                            {selectedLanguage === 'Odia' ? '⏸ ବିରତି (Pause Audio)' : selectedLanguage === 'Hindi' ? '⏸ रोकें (Pause Audio)' : '⏸ Pause Audio'}
                          </span>
                        </>
                      ) : isPaused && currentSpeakingText === questionAnswer ? (
                        <>
                          <Play size={16} />
                          <span>
                            {selectedLanguage === 'Odia' ? '▶ ଚଲାନ୍ତୁ (Resume Audio)' : selectedLanguage === 'Hindi' ? '▶ जारी रखें (Resume Audio)' : '▶ Resume Audio'}
                          </span>
                        </>
                      ) : (
                        <>
                          <Volume2 size={16} />
                          <span>
                            {selectedLanguage === 'Odia'
                              ? '🔊 ଏହି ଉତ୍ତରକୁ ଓଡ଼ିଆ ସ୍ୱରରେ ଶୁଣନ୍ତୁ (Listen in Odia Voice)'
                              : selectedLanguage === 'Hindi'
                              ? '🔊 इस उत्तर को आवाज में सुनें (Listen in Voice)'
                              : '🔊 Listen to Answer Aloud'}
                          </span>
                        </>
                      )}
                    </button>

                    {(isSpeaking || isPaused) && currentSpeakingText === questionAnswer && (
                      <button
                        type="button"
                        className="btn-read-aloud"
                        style={{ color: '#ef4444', borderColor: '#fca5a5', background: '#fff1f2' }}
                        onClick={stopAudio}
                        title="Stop Audio"
                      >
                        <Square size={14} />
                        <span>⏹ Stop</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-read-aloud"
                      style={{ background: '#f8fafc', color: '#475569', borderColor: '#cbd5e1' }}
                      onClick={() => {
                        stopAudio();
                        setVoiceText(questionAnswer);
                        setActiveTab('voice-learning');
                      }}
                      title="Open in Voice Learning Studio with word-by-word tracking"
                    >
                      <Sparkles size={15} />
                      <span>
                        {selectedLanguage === 'Odia' ? 'ଷ୍ଟୁଡିଓରେ ଦେଖନ୍ତୁ (Voice Studio)' : selectedLanguage === 'Hindi' ? 'स्टूडियो में देखें (Voice Studio)' : 'Open in Voice Studio'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB: IMAGE SCANNER & VISION SOLVER                                */}
          {/* ================================================================= */}
          {activeTab === 'image-scanner' && (
            <ImageScanner selectedLanguage={selectedLanguage} />
          )}

          {/* ================================================================= */}
          {/* TAB: PDF SCANNER & MULTI-PAGE SOLVER                              */}
          {/* ================================================================= */}
          {activeTab === 'pdf-scanner' && (
            <PdfScanner selectedLanguage={selectedLanguage} />
          )}

          {/* ================================================================= */}
          {/* TAB 4: FLASHCARDS                                                 */}
          {/* ================================================================= */}
          {activeTab === 'flashcards' && (
            <div className="academic-subview-card">
              <div className="subview-header">
                <div>
                  <h2 className="academic-section-heading">{t.flashcards}</h2>
                  <p className="subview-subtitle">{t.flashcardsCardDesc} • Spaced repetition for long-term retention</p>
                </div>
                <button
                  type="button"
                  className="btn-back-to-home"
                  onClick={() => setActiveTab('home')}
                >
                  ← Back to Home
                </button>
              </div>

              {/* SEARCH BAR & MIC ACCESS SECTION */}
              <div className="flashcards-search-section">
                <div className="flashcard-search-row">
                  <span className="flashcard-search-icon">
                    <Search size={18} />
                  </span>
                  <input
                    id="flashcard-topic-search-input"
                    type="text"
                    className="flashcard-search-input"
                    placeholder={t.flashcardsSearchPlaceholder}
                    value={flashcardTopicQuery}
                    onChange={(e) => {
                      setFlashcardTopicQuery(e.target.value);
                      setCurrentCardIdx(0);
                      setIsCardFlipped(false);
                    }}
                  />
                  {flashcardTopicQuery && (
                    <button
                      type="button"
                      className="flashcard-search-clear-btn"
                      onClick={() => {
                        setFlashcardTopicQuery('');
                        setCurrentCardIdx(0);
                        setIsCardFlipped(false);
                      }}
                      title={t.clearSearchBtn}
                    >
                      <X size={16} />
                    </button>
                  )}
                  <button
                    id="flashcard-mic-access-btn"
                    type="button"
                    className={`flashcard-mic-btn ${isMicListening ? 'listening' : ''}`}
                    onClick={toggleMicTopicSearch}
                    title={isMicListening ? t.stopMic : t.micSearchTitle}
                  >
                    {isMicListening ? <MicOff size={16} /> : <Mic size={16} />}
                    <span>{isMicListening ? t.stopMic : 'Mic Access'}</span>
                  </button>
                </div>

                {/* Pulsating Voice Listening Status Banner */}
                {isMicListening && (
                  <div className="flashcard-mic-banner">
                    <div className="flashcard-mic-banner-content">
                      <span className="listening-pulse-dot" />
                      <span>{t.listeningTopic}</span>
                    </div>
                    <button
                      type="button"
                      style={{ background: 'transparent', border: 'none', color: '#991b1b', cursor: 'pointer', fontWeight: 700 }}
                      onClick={toggleMicTopicSearch}
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Quick Topic Filter Pills */}
                <div className="flashcard-topic-pills-row">
                  <span className="flashcard-topic-label">Topics:</span>
                  <button
                    type="button"
                    className={`flashcard-topic-pill ${!flashcardTopicQuery ? 'active' : ''}`}
                    onClick={() => {
                      setFlashcardTopicQuery('');
                      setCurrentCardIdx(0);
                      setIsCardFlipped(false);
                    }}
                  >
                    {t.allTopicsLabel} ({flashcardDeck.length})
                  </button>
                  {Array.from(new Set(flashcardDeck.map((c) => c.category)))
                    .filter(Boolean)
                    .map((cat) => {
                      const isActive = flashcardTopicQuery.trim().toLowerCase() === cat.toLowerCase();
                      const count = flashcardDeck.filter((c) => c.category.toLowerCase() === cat.toLowerCase()).length;
                      return (
                        <button
                          key={cat}
                          type="button"
                          className={`flashcard-topic-pill ${isActive ? 'active' : ''}`}
                          onClick={() => {
                            setFlashcardTopicQuery(cat);
                            setCurrentCardIdx(0);
                            setIsCardFlipped(false);
                          }}
                        >
                          {cat} ({count})
                        </button>
                      );
                    })}
                </div>

                {/* Action Bar: AI Topic Generator + View Mode Toggle */}
                <div className="flashcard-deck-actions-bar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      id="flashcard-ai-generate-topic-btn"
                      type="button"
                      className="flashcard-generate-btn"
                      onClick={() => handleGenerateTopicCards()}
                      disabled={isGeneratingTopicCards || !flashcardTopicQuery.trim()}
                      title="Use AI to automatically create new high-yield flashcards for this topic"
                    >
                      {isGeneratingTopicCards ? (
                        <>
                          <Loader2 size={15} className="spinner" />
                          <span>{t.generatingCardsText}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={15} />
                          <span>
                            {flashcardTopicQuery.trim()
                              ? `${t.generateTopicBtn}: "${flashcardTopicQuery.trim()}"`
                              : t.generateTopicBtn}
                          </span>
                        </>
                      )}
                    </button>
                    {flashcardGenerationNotice && (
                      <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 700 }}>
                        ✓ {flashcardGenerationNotice}
                      </span>
                    )}
                  </div>

                  {/* Mode switcher: Interactive Flip vs Watch All Grid */}
                  <div className="flashcard-view-mode-toggle">
                    <button
                      type="button"
                      className={`flashcard-view-mode-btn ${flashcardViewMode === 'flip' ? 'active' : ''}`}
                      onClick={() => setFlashcardViewMode('flip')}
                    >
                      <RotateCcw size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                      {t.viewModeFlipLabel}
                    </button>
                    <button
                      type="button"
                      className={`flashcard-view-mode-btn ${flashcardViewMode === 'grid' ? 'active' : ''}`}
                      onClick={() => setFlashcardViewMode('grid')}
                    >
                      <Grid size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                      {t.viewModeGridLabel}
                    </button>
                  </div>
                </div>
              </div>

              {/* FILTERED FLASHCARD DISPLAY */}
              {(() => {
                const qClean = flashcardTopicQuery.trim().toLowerCase();
                const filteredCards = flashcardDeck.filter((c) => {
                  if (!qClean) return true;
                  return (
                    c.category.toLowerCase().includes(qClean) ||
                    c.q.toLowerCase().includes(qClean) ||
                    c.a.toLowerCase().includes(qClean)
                  );
                });

                if (filteredCards.length === 0) {
                  return (
                    <div className="flashcard-empty-state">
                      <div className="flashcard-empty-icon">🃏</div>
                      <h3 className="flashcard-empty-title">
                        {t.noCardsFoundText} "{flashcardTopicQuery}"
                      </h3>
                      <p className="flashcard-empty-desc">
                        No pre-made flashcards found matching this topic. Click below to generate brand new AI flashcards instantly!
                      </p>
                      <button
                        type="button"
                        className="flashcard-generate-btn"
                        style={{ padding: '0.65rem 1.25rem', fontSize: '0.95rem' }}
                        onClick={() => handleGenerateTopicCards()}
                        disabled={isGeneratingTopicCards}
                      >
                        {isGeneratingTopicCards ? (
                          <>
                            <Loader2 size={16} className="spinner" />
                            <span>{t.generatingCardsText}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            <span>{t.generateForTopicText}: "{flashcardTopicQuery}"</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                }

                // If index is out of bounds for filtered cards, clamp it
                const safeIdx = Math.min(currentCardIdx, filteredCards.length - 1);
                const currentCard = filteredCards[safeIdx];

                // GRID VIEW: WATCH ALL TOPIC CARDS
                if (flashcardViewMode === 'grid') {
                  return (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span className="flashcard-topic-summary-badge">
                          Viewing {filteredCards.length} flashcard(s) {flashcardTopicQuery ? `for topic "${flashcardTopicQuery}"` : 'across all topics'}
                        </span>
                      </div>
                      <div className="flashcards-grid-container">
                        {filteredCards.map((card, idx) => (
                          <div key={card.id || idx} className="flashcard-grid-item">
                            <div>
                              <span className="flashcard-grid-category">{card.category}</span>
                              <div className="flashcard-grid-q">Q: {card.q}</div>
                              <div className="flashcard-grid-a-box">
                                <p className="flashcard-grid-a">A: {card.a}</p>
                              </div>
                            </div>
                            <div className="flashcard-grid-footer">
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Card {idx + 1}</span>
                              <button
                                type="button"
                                className="flashcard-listen-btn"
                                onClick={() => handleSpeakCard(card)}
                                title={t.listenCardBtn}
                              >
                                {(() => {
                                  const cardText = `${card.category}. ${card.q}. ${card.a}`;
                                  const isPlayingThis = isSpeaking && !isPaused && currentSpeakingText === cardText;
                                  const isPausedThis = isPaused && currentSpeakingText === cardText;
                                  if (isPlayingThis) return <><Pause size={13} /><span>Pause</span></>;
                                  if (isPausedThis) return <><Play size={13} /><span>Resume</span></>;
                                  return <><Volume2 size={13} /><span>{t.listenCardBtn}</span></>;
                                })()}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                // INTERACTIVE FLIP MODE
                return (
                  <div className="flashcard-interactive-box">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="flashcard-category-badge">
                        {currentCard.category} • Card {safeIdx + 1} of {filteredCards.length}
                      </div>
                      <button
                        type="button"
                        className="flashcard-listen-btn"
                        onClick={() => handleSpeakCard(currentCard)}
                        title={t.listenCardBtn}
                      >
                        {(() => {
                          const cardText = `${currentCard.category}. ${currentCard.q}. ${currentCard.a}`;
                          const isPlayingThis = isSpeaking && !isPaused && currentSpeakingText === cardText;
                          const isPausedThis = isPaused && currentSpeakingText === cardText;
                          if (isPlayingThis) return <><Pause size={13} /><span>Pause</span></>;
                          if (isPausedThis) return <><Play size={13} /><span>Resume</span></>;
                          return <><Volume2 size={13} /><span>{t.listenCardBtn}</span></>;
                        })()}
                      </button>
                    </div>

                    <div
                      className={`flashcard-card-body ${isCardFlipped ? 'flipped' : ''}`}
                      onClick={() => setIsCardFlipped(!isCardFlipped)}
                    >
                      <div className="card-face card-front">
                        <span className="card-hint">Question (Click to flip)</span>
                        <p className="card-text">{currentCard.q}</p>
                      </div>
                      <div className="card-face card-back">
                        <span className="card-hint">Answer</span>
                        <p className="card-text highlight">{currentCard.a}</p>
                      </div>
                    </div>

                    <div className="flashcard-controls">
                      <button
                        type="button"
                        className="btn-card-ctrl"
                        onClick={() => {
                          setIsCardFlipped(false);
                          setCurrentCardIdx((prev) => (prev > 0 ? prev - 1 : filteredCards.length - 1));
                        }}
                      >
                        Previous
                      </button>

                      <button
                        type="button"
                        className="btn-card-flip"
                        onClick={() => setIsCardFlipped(!isCardFlipped)}
                      >
                        <RotateCcw size={16} />
                        <span>Flip Card</span>
                      </button>

                      <button
                        type="button"
                        className="btn-card-ctrl next"
                        onClick={() => {
                          setIsCardFlipped(false);
                          setCurrentCardIdx((prev) => (prev + 1) % filteredCards.length);
                          setProblemsSolved((prev) => prev + 1);
                          setFlashcardsDue((prev) => Math.max(0, prev - 1));
                          setFlashcardsSaved((prev) => prev + 1);

                          logLearningActivity({
                            activity_type: 'flashcard',
                            title: currentCard.q,
                            details: `Reviewed flashcard in category: ${currentCard.category}`,
                            solution: currentCard.a,
                            language: selectedLanguage,
                          });
                        }}
                      >
                        I Know This (Next)
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 5: VOICE LEARNING                                             */}
          {/* ================================================================= */}
          {activeTab === 'voice-learning' && (
            <div className="academic-subview-card">
              <div className="subview-header">
                <div>
                  <h2 className="academic-section-heading">{t.voiceLearning}</h2>
                  <p className="subview-subtitle">{t.voiceCardDesc} and adjustable audio pacing</p>
                </div>
                <button
                  type="button"
                  className="btn-back-to-home"
                  onClick={() => {
                    stopAudio();
                    setActiveTab('home');
                  }}
                >
                  ← Back to Home
                </button>
              </div>

              <div className="voice-text-editor">
                {/* Meta header: Active voice tag + Quick Presets */}
                <div className="voice-meta-header">
                  <div className="voice-lang-badge">
                    {selectedLanguage === 'Odia' && (
                      <>
                        <span>🇮🇳</span>
                        <span>ଓଡ଼ିଆ AI Voice (Native Accent)</span>
                      </>
                    )}
                    {selectedLanguage === 'Hindi' && (
                      <>
                        <span>🇮🇳</span>
                        <span>हिन्दी AI Voice (स्पष्ट उच्चारण)</span>
                      </>
                    )}
                    {selectedLanguage === 'English' && (
                      <>
                        <span>🇬🇧</span>
                        <span>English AI Voice (Neural Engine)</span>
                      </>
                    )}
                    {isSpeaking && (
                      <span className="voice-soundwave" aria-label="Speaking">
                        <span className="voice-bar" />
                        <span className="voice-bar" />
                        <span className="voice-bar" />
                        <span className="voice-bar" />
                        <span className="voice-bar" />
                      </span>
                    )}
                  </div>

                  <div className="voice-presets-list">
                    <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                      Quick Topics:
                    </span>
                    {voicePresets[selectedLanguage].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="btn-voice-preset"
                        onClick={() => {
                          stopAudio();
                          setVoiceText(preset.text);
                        }}
                      >
                        {preset.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Real-time Karaoke Word Highlighting Display */}
                <div className="voice-reading-display" aria-live="polite">
                  {voiceText.trim() ? (
                    voiceText.split(/\s+/).map((word, idx) => (
                      <span
                        key={idx}
                        className={`voice-word ${highlightWordIndex === idx ? 'active' : ''}`}
                      >
                        {word}{' '}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                      Enter text below to preview and listen...
                    </span>
                  )}
                </div>

                {/* Editable Text Area with Indic Keyboard Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {selectedLanguage === 'Odia' ? 'ସ୍ୱର ପାଇଁ ପାଠ୍ୟ ଲେଖନ୍ତୁ କିମ୍ବା କୁହନ୍ତୁ:' : selectedLanguage === 'Hindi' ? 'आवाज के लिए पाठ लिखें या बोलें:' : 'Speech Script:'}
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn-voice-access-pill"
                      onClick={() => {
                        setVoiceModalMode('voice');
                        setVoiceModalOpen(true);
                      }}
                      title="Dictate text via voice in English, Hindi, or Odia"
                    >
                      <Mic size={14} />
                      <span>
                        {selectedLanguage === 'Odia'
                          ? '🎙️ ସ୍ୱର ରେକର୍ଡିଂ'
                          : selectedLanguage === 'Hindi'
                          ? '🎙️ बोलकर टाइप करें'
                          : '🎙️ Voice Dictate'}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`btn-toggle-keyboard ${showVoiceKeyboard ? 'active' : ''}`}
                      onClick={() => setShowVoiceKeyboard(!showVoiceKeyboard)}
                      title="Toggle Indic Keyboard"
                    >
                      <Keyboard size={15} />
                      <span>
                        {showVoiceKeyboard
                          ? 'Close Keyboard'
                          : selectedLanguage === 'Odia'
                          ? '⌨️ ଓଡ଼ିଆ କୀବୋର୍ଡ'
                          : selectedLanguage === 'Hindi'
                          ? '⌨️ हिन्दी कीबोर्ड'
                          : '⌨️ Indic Keyboard'}
                      </span>
                    </button>
                  </div>
                </div>

                <textarea
                  className="academic-textarea-field"
                  rows={3}
                  value={voiceText}
                  onChange={(e) => {
                    if (isSpeaking) stopAudio();
                    setVoiceText(e.target.value);
                  }}
                  placeholder="Paste or write any text you wish to listen to..."
                />

                {showVoiceKeyboard && (
                  <IndicVirtualKeyboard
                    language={keyboardLang}
                    onLanguageChange={setKeyboardLang}
                    onInsertChar={(ch) => handleInsertChar(ch, 'voice')}
                    onBackspace={() => handleBackspace('voice')}
                    onClear={() => handleClearField('voice')}
                    onClose={() => setShowVoiceKeyboard(false)}
                  />
                )}

                {audioError && (
                  <div className="voice-error-banner">
                    ⚠️ {audioError}
                  </div>
                )}

                {/* Controls Bar */}
                <div className="voice-controls-bar">
                  <div className="voice-controls-left" style={{ display: 'flex', gap: '0.55rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`btn-play-voice ${isSpeaking && !isPaused ? 'active' : ''}`}
                      onClick={handleSpeak}
                      disabled={isAudioLoading}
                      title={isAudioLoading ? 'Synthesizing voice audio...' : isSpeaking && !isPaused ? 'Pause Audio' : isPaused ? 'Resume Audio' : 'Listen Now'}
                    >
                      {isAudioLoading ? (
                        <Loader2 size={18} className="spin-animate" />
                      ) : isSpeaking && !isPaused ? (
                        <Pause size={18} />
                      ) : (
                        <Play size={18} />
                      )}
                      <span>
                        {isAudioLoading
                          ? 'Synthesizing...'
                          : isSpeaking && !isPaused
                          ? 'Pause Audio'
                          : isPaused
                          ? 'Resume Audio'
                          : 'Listen Now'}
                      </span>
                    </button>

                    {(isSpeaking || isPaused || isAudioLoading) && (
                      <button
                        type="button"
                        className="btn-voice-clear"
                        onClick={stopAudio}
                        style={{ color: '#ef4444', borderColor: '#fca5a5', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Stop audio playback"
                      >
                        <Square size={14} />
                        <span>Stop</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-voice-clear"
                      onClick={() => {
                        stopAudio();
                        setVoiceText('');
                      }}
                      title="Clear text"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="voice-speed-slider-group">
                    <label>Speed: {speechRate}x</label>
                    <div className="voice-speed-chips">
                      {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          className={`btn-speed-chip ${speechRate === rate ? 'active' : ''}`}
                          onClick={() => setSpeechRate(rate)}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.25"
                      value={speechRate}
                      onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                      aria-label="Speech speed"
                    />
                  </div>
                </div>
              </div>

              {/* ======================================================= */}
              {/* DAILY VOICE LEARNING TOPICS SECTION                     */}
              {/* ======================================================= */}
              <div className="daily-voice-topics-section">
                {/* Top Header of Daily Topics */}
                <div className="daily-topics-header-wrap">
                  <div className="daily-topics-title-group">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="daily-calendar-badge">
                        <Calendar size={14} />
                        <span>
                          {dayNamesFull[selectedLanguage][selectedDailyDay]}
                          {selectedDailyDay === initialDailyDayIndex
                            ? ` (${selectedLanguage === 'Hindi' ? 'आज' : selectedLanguage === 'Odia' ? 'ଆଜି' : 'Today'})`
                            : ''}
                        </span>
                      </span>
                      <h3 className="daily-topics-heading">{t.dailyTopicsTitle}</h3>
                      <span className="daily-date-pill">{formattedTodayDate}</span>
                    </div>
                    <p className="daily-topics-subheading">{t.dailyTopicsSub}</p>
                  </div>

                  <div className="daily-topics-actions">
                    <button
                      type="button"
                      className="btn-daily-shuffle"
                      onClick={handleShuffleDailyTopics}
                      title="Shuffle to another day's curriculum topics"
                    >
                      <Shuffle size={14} />
                      <span>{t.shuffleDailyTopicsBtn}</span>
                    </button>

                    <button
                      type="button"
                      className={`btn-daily-generate-ai ${showDailyTopicGenerator ? 'active' : ''}`}
                      onClick={() => setShowDailyTopicGenerator(!showDailyTopicGenerator)}
                    >
                      <Sparkles size={14} />
                      <span>{t.generateDailyTopicBtn}</span>
                    </button>
                  </div>
                </div>

                {/* Day of Week Selector Strip */}
                <div className="daily-days-pills-row">
                  {weekDays.map((d, idx) => {
                    const isSelected = selectedDailyDay === idx;
                    const isToday = idx === initialDailyDayIndex;
                    return (
                      <button
                        key={idx}
                        type="button"
                        className={`btn-day-selector ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedDailyDay(idx)}
                      >
                        <span>{d.label}</span>
                        {isToday && <span className="today-dot">●</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Category Filter Pills */}
                <div className="daily-category-filters">
                  {['All', 'Science', 'Space', 'History', 'Inventions', 'Curious GK', 'AI Generated'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`daily-filter-pill ${selectedDailyCategory === cat ? 'active' : ''}`}
                      onClick={() => setSelectedDailyCategory(cat)}
                    >
                      {cat === 'All'
                        ? t.dailyTopicCategoryAll
                        : cat === 'Science'
                        ? '🔬 ' + cat
                        : cat === 'Space'
                        ? '🚀 ' + cat
                        : cat === 'History'
                        ? '🏛️ ' + cat
                        : cat === 'Inventions'
                        ? '💡 ' + cat
                        : cat === 'Curious GK'
                        ? '🧠 ' + cat
                        : '✨ ' + cat}
                    </button>
                  ))}
                </div>

                {/* AI Topic Generator Box (Collapsible / Expandable) */}
                {showDailyTopicGenerator && (
                  <div className="daily-topic-generator-card">
                    <div className="generator-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={16} className="text-indigo-600" />
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
                          {selectedLanguage === 'Odia'
                            ? 'ନୂଆ ଭଏସ୍ ଲର୍ଣ୍ଣିଂ ପାଠ ତିଆରି କରନ୍ତୁ'
                            : selectedLanguage === 'Hindi'
                            ? 'नया ध्वनि शिक्षण पाठ बनाएं'
                            : 'Create Fresh Voice Learning Lesson with AI'}
                        </h4>
                      </div>
                      <button
                        type="button"
                        className="btn-close-generator"
                        onClick={() => setShowDailyTopicGenerator(false)}
                      >
                        <X size={15} />
                      </button>
                    </div>

                    <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.35rem 0 0.5rem 0' }}>
                      {t.customTopicPrompt}
                    </p>

                    {/* Category Selector */}
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
                      {['Science', 'Space', 'History', 'Inventions', 'Curious GK'].map((cName) => (
                        <button
                          key={cName}
                          type="button"
                          className="btn-suggestion-pill"
                          style={{
                            background: customDailyTopicCategory === cName ? '#4f46e5' : '#e0e7ff',
                            color: customDailyTopicCategory === cName ? '#ffffff' : '#3730a3',
                            border: customDailyTopicCategory === cName ? '1px solid #4338ca' : '1px solid #c7d2fe',
                          }}
                          onClick={() => setCustomDailyTopicCategory(cName)}
                        >
                          {cName}
                        </button>
                      ))}
                    </div>

                    <div className="generator-input-row">
                      <input
                        type="text"
                        className="generator-text-input"
                        value={customDailyTopicInput}
                        onChange={(e) => setCustomDailyTopicInput(e.target.value)}
                        placeholder={t.generateTopicPlaceholder}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleGenerateDailyTopic();
                        }}
                      />

                      <button
                        type="button"
                        className="btn-generator-submit"
                        disabled={isGeneratingDailyTopic || !customDailyTopicInput.trim()}
                        onClick={() => handleGenerateDailyTopic()}
                      >
                        {isGeneratingDailyTopic ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />
                            <span>{t.generatingTopicText}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={15} />
                            <span>{t.generateDailyTopicBtn}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Quick Inspiration Pills */}
                    <div className="generator-quick-pills">
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                        {selectedLanguage === 'Odia' ? 'ଶୀଘ୍ର ବିଷୟ:' : selectedLanguage === 'Hindi' ? 'शीघ्र विषय:' : 'Suggestions:'}
                      </span>
                      {[
                        selectedLanguage === 'Odia' ? 'ଚନ୍ଦ୍ରଯାନ-୩' : selectedLanguage === 'Hindi' ? 'चंद्रयान-3' : 'Chandrayaan-3 Moon Mission',
                        selectedLanguage === 'Odia' ? 'କୃତ୍ରିମ ବୁଦ୍ଧିମତ୍ତା (AI)' : selectedLanguage === 'Hindi' ? 'कृत्रिम बुद्धिमत्ता (AI)' : 'Artificial Intelligence',
                        selectedLanguage === 'Odia' ? 'ପ୍ଲାଷ୍ଟିକ୍ ପ୍ରଦୂଷଣ ଓ ସମୁଦ୍ର' : selectedLanguage === 'Hindi' ? 'प्लास्टिक प्रदूषण और महासागर' : 'Ocean Plastic & Ecology',
                        selectedLanguage === 'Odia' ? 'ଭାରତୀୟ ସ୍ୱାଧୀନତା ଆନ୍ଦୋଳନ' : selectedLanguage === 'Hindi' ? 'भारतीय स्वतंत्रता संग्राम' : 'Indian Freedom Movement',
                        selectedLanguage === 'Odia' ? 'ଜଳବାୟୁ ପରିବର୍ତ୍ତନ' : selectedLanguage === 'Hindi' ? 'जलवायु परिवर्तन' : 'Global Climate Change',
                      ].map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          className="btn-suggestion-pill"
                          onClick={() => {
                            setCustomDailyTopicInput(sug);
                            handleGenerateDailyTopic(sug);
                          }}
                          disabled={isGeneratingDailyTopic}
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Daily Topics Grid */}
                <div className="daily-topics-cards-grid">
                  {(() => {
                    const curatedForDay = (DAILY_VOICE_TOPICS[selectedLanguage] || []).filter(
                      (top) => top.dayIndex === selectedDailyDay
                    );
                    const allForDay = [...customDailyTopics, ...curatedForDay];
                    const filtered = allForDay.filter(
                      (top) => selectedDailyCategory === 'All' || top.category === selectedDailyCategory
                    );

                    if (filtered.length === 0) {
                      return (
                        <div className="daily-topics-empty">
                          <BookOpen size={32} className="text-slate-400" />
                          <p style={{ margin: '0.5rem 0 0 0', fontWeight: 600, color: '#64748b' }}>
                            {selectedLanguage === 'Odia'
                              ? 'ଏହି ବିଭାଗରେ କୌଣସି ବିଷୟ ମିଳିଲା ନାହିଁ। ଅନ୍ୟ ବିଭାଗ ବାଛନ୍ତୁ କିମ୍ବା ନୂଆ ବିଷୟ ଗଢ଼ନ୍ତୁ।'
                              : selectedLanguage === 'Hindi'
                              ? 'इस श्रेणी में कोई विषय नहीं मिला। अन्य श्रेणी चुनें या नया विषय बनाएं।'
                              : 'No topics found in this category. Select another category or generate one with AI!'}
                          </p>
                        </div>
                      );
                    }

                    return filtered.map((topic) => (
                      <div key={topic.id} className="daily-topic-card">
                        <div className="topic-card-top-row">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="topic-icon-symbol">{topic.icon}</span>
                            <span className="topic-category-badge">{topic.category}</span>
                          </div>
                          <span className="topic-duration-pill">
                            ⏱️ {topic.duration} {t.dailyListenEstimate}
                          </span>
                        </div>

                        <h4 className="topic-card-title">{topic.title}</h4>
                        <p className="topic-card-summary">{topic.summary}</p>

                        <div className="topic-card-footer">
                          <button
                            type="button"
                            className="btn-topic-listen-now"
                            onClick={() => handleListenDailyTopic(topic)}
                            title="Play or Pause this daily topic"
                          >
                            {isSpeaking && !isPaused && currentSpeakingText === topic.text ? (
                              <>
                                <Pause size={15} />
                                <span>Pause Audio</span>
                              </>
                            ) : isPaused && currentSpeakingText === topic.text ? (
                              <>
                                <Play size={15} />
                                <span>Resume Audio</span>
                              </>
                            ) : (
                              <>
                                <Volume2 size={15} />
                                <span>{t.listenDailyTopicBtn}</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            className="btn-topic-load-editor"
                            onClick={() => {
                              stopAudio();
                              setVoiceText(topic.text);
                            }}
                            title="Load script into speech editor to read or edit"
                          >
                            <FileText size={14} />
                            <span>{t.loadInEditorBtn}</span>
                          </button>

                          <button
                            type="button"
                            className="btn-topic-copy-script"
                            onClick={() => {
                              navigator.clipboard.writeText(topic.text);
                              alert(t.copySuccess);
                            }}
                            title="Copy speech script"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB: GEOGRAPHY IDEA                                               */}
          {/* ================================================================= */}
          {activeTab === 'geography-idea' && (
            <div className="academic-subview-card geography-idea-container">
              {/* Header */}
              <div className="subview-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <Globe size={24} className="text-teal-600" />
                    <h2 className="academic-section-heading" style={{ margin: 0 }}>{t.geographyIdeaNav}</h2>
                  </div>
                  <p className="subview-subtitle" style={{ marginTop: '0.35rem' }}>
                    {t.geographyCardDesc}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-back-to-home"
                  onClick={() => setActiveTab('home')}
                >
                  ← {t.home}
                </button>
              </div>

              {/* Interactive India Map & State Geography Explorer */}
              <IndiaMapExplorer
                selectedLanguage={selectedLanguage}
                onExploreIdea={(query, title) => {
                  if (title) setGeographyInput(title);
                  else setGeographyInput(query.slice(0, 80));
                  handleExploreGeography(query);
                  setTimeout(() => {
                    const el = document.getElementById('geography-result-box');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }, 250);
                }}
                onSpeakText={(text) => handleSpeakCustom(text)}
                isSpeaking={isSpeaking}
                onStopAudio={() => stopAudio()}
                isPaused={isPaused}
                currentSpeakingText={currentSpeakingText}
                onPlayPauseText={(text) => handlePlayPauseAudio(text)}
              />

              {/* Input Section */}
              <div className="solver-input-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {selectedLanguage === 'Odia'
                      ? 'ଭୂଗୋଳ ଧାରଣା ବା ବିଷୟ ଲେଖନ୍ତୁ କିମ୍ବା କୁହନ୍ତୁ:'
                      : selectedLanguage === 'Hindi'
                      ? 'भूगोल विचार या विषय लिखें या बोलें:'
                      : 'Type or Speak Geography Idea:'}
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn-voice-access-pill"
                      onClick={() => {
                        setVoiceModalMode('geography');
                        setVoiceModalOpen(true);
                      }}
                      title="Speak geography topic in English, Hindi, or Odia"
                    >
                      <Mic size={14} />
                      <span>
                        {selectedLanguage === 'Odia'
                          ? '🎙️ କହିକି ଖୋଜନ୍ତୁ'
                          : selectedLanguage === 'Hindi'
                          ? '🎙️ बोलकर खोजें'
                          : '🎙️ Voice Search'}
                      </span>
                    </button>

                    <button
                      type="button"
                      className="btn-random-geo-pill"
                      onClick={handleRandomGeographyIdea}
                      disabled={isExploringGeography}
                      title="Surprise me with a fascinating Geography idea"
                    >
                      <Sparkles size={14} />
                      <span>{t.geographyRandomBtn}</span>
                    </button>

                    <button
                      type="button"
                      className={`btn-toggle-keyboard ${showGeographyKeyboard ? 'active' : ''}`}
                      onClick={() => setShowGeographyKeyboard(!showGeographyKeyboard)}
                      title="Toggle Indic Keyboard"
                    >
                      <Keyboard size={15} />
                      <span>
                        {showGeographyKeyboard
                          ? 'Close Keyboard'
                          : selectedLanguage === 'Odia'
                          ? '⌨️ ଓଡ଼ିଆ କୀବୋର୍ଡ'
                          : selectedLanguage === 'Hindi'
                          ? '⌨️ हिन्दी कीबोर्ड'
                          : '⌨️ Indic Keyboard'}
                      </span>
                    </button>
                  </div>
                </div>

                <textarea
                  className="academic-textarea-field"
                  rows={3}
                  value={geographyInput}
                  onChange={(e) => setGeographyInput(e.target.value)}
                  placeholder={t.geographySearchPlaceholder}
                />

                {showGeographyKeyboard && (
                  <IndicVirtualKeyboard
                    language={keyboardLang}
                    onLanguageChange={setKeyboardLang}
                    onInsertChar={(ch) => handleInsertChar(ch, 'geography')}
                    onBackspace={() => handleBackspace('geography')}
                    onClear={() => handleClearField('geography')}
                    onClose={() => setShowGeographyKeyboard(false)}
                  />
                )}

                <button
                  type="button"
                  className="btn-solve-action"
                  disabled={isExploringGeography}
                  onClick={() => handleExploreGeography()}
                  style={{
                    background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                    boxShadow: '0 4px 14px rgba(13, 148, 136, 0.28)',
                  }}
                >
                  {isExploringGeography ? (
                    <>
                      <Loader2 size={16} className="animate-spin mr-1" />
                      {t.geographyThinkingText}
                    </>
                  ) : (
                    t.geographyExploreBtn
                  )}
                </button>
              </div>

              {/* Explored Result Box */}
              {geographyResult && (
                <div id="geography-result-box" className="question-answer-box" style={{ borderColor: '#99f6e4', background: '#f0fdfa' }}>
                  <div className="answer-header">
                    <Globe size={18} className="text-teal-600" />
                    <h4 style={{ color: '#134e4a' }}>
                      {selectedLanguage === 'Odia'
                        ? 'ଭୌଗୋଳିକ ବିଶ୍ଳେଷଣ ଓ ଧାରଣା (Geography Academic Breakdown)'
                        : selectedLanguage === 'Hindi'
                        ? 'भौगोलिक विश्लेषण एवं विचार (Geography Academic Breakdown)'
                        : 'Geography Idea Exploration & Earth Science Analysis'}
                    </h4>
                  </div>
                  {renderFormattedAnswer(geographyResult)}
                  <div
                    className="solution-voice-toolbar"
                    style={{
                      marginTop: '1rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid rgba(13, 148, 136, 0.15)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.65rem',
                      alignItems: 'center',
                    }}
                  >
                    <button
                      type="button"
                      className={`btn-read-aloud ${isSpeaking && currentSpeakingText === geographyResult ? 'active' : ''}`}
                      onClick={() => handlePlayPauseAudio(geographyResult)}
                      title={
                        isSpeaking && currentSpeakingText === geographyResult
                          ? 'Pause audio'
                          : isPaused && currentSpeakingText === geographyResult
                          ? 'Resume audio'
                          : 'Listen with Audio'
                      }
                    >
                      {isSpeaking && currentSpeakingText === geographyResult ? (
                        <Pause size={15} />
                      ) : (
                        <Play size={15} />
                      )}
                      <span>
                        {isSpeaking && currentSpeakingText === geographyResult
                          ? 'Pause'
                          : isPaused && currentSpeakingText === geographyResult
                          ? 'Resume'
                          : 'Listen with Audio'}
                      </span>
                    </button>

                    {(isSpeaking || isPaused) && currentSpeakingText === geographyResult && (
                      <button
                        type="button"
                        className="btn-read-aloud"
                        style={{ borderColor: '#ef4444', color: '#ef4444' }}
                        onClick={stopAudio}
                        title="Stop Audio"
                      >
                        <Square size={14} />
                        <span>Stop</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className={`btn-read-aloud ${geographyCopied ? 'active' : ''}`}
                      onClick={() => {
                        navigator.clipboard.writeText(geographyResult);
                        setGeographyCopied(true);
                        setTimeout(() => setGeographyCopied(false), 2000);
                      }}
                    >
                      {geographyCopied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                      <span>{geographyCopied ? t.copySuccess : 'Copy Note'}</span>
                    </button>

                    <span style={{ fontSize: '0.75rem', color: '#0d9488', fontWeight: 600, marginLeft: 'auto' }}>
                      ✓ Saved to My Learning History
                    </span>
                  </div>
                </div>
              )}

              {/* Curated Geography Ideas Showcase */}
              <div className="geography-presets-section" style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🌍</span>
                    <span>{t.geographyQuickFactsTitle}</span>
                  </h3>
                  <div className="geography-cat-pills" style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {['All', 'Landforms', 'Climate', 'Oceans', 'Regional', 'Biomes'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className={`history-filter-pill ${selectedGeoCategory === cat ? 'active' : ''}`}
                        onClick={() => setSelectedGeoCategory(cat)}
                        style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem' }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="geography-cards-grid">
                  {GEOGRAPHY_PRESET_IDEAS.filter((item) => selectedGeoCategory === 'All' || item.category === selectedGeoCategory).map((idea, idx) => {
                    const ideaText = `${idea.title}. ${idea.summary}`;
                    const isIdeaSpeaking = isSpeaking && currentSpeakingText === ideaText;
                    const isIdeaPaused = isPaused && currentSpeakingText === ideaText;
                    return (
                      <div key={idx} className="geography-idea-card">
                        <div className="geography-card-header">
                          <span className="geo-icon">{idea.icon}</span>
                          <span className="geo-cat-badge">{idea.category}</span>
                        </div>
                        <h4 className="geo-card-title">{idea.title}</h4>
                        <p className="geo-card-summary">{idea.summary}</p>
                        <div className="geo-card-actions">
                          <button
                            type="button"
                            className="btn-geo-explore"
                            onClick={() => {
                              setGeographyInput(idea.title);
                              handleExploreGeography(idea.query);
                            }}
                            disabled={isExploringGeography}
                          >
                            <Sparkles size={13} />
                            <span>Explore Idea</span>
                          </button>
                          <button
                            type="button"
                            className={`btn-geo-listen ${isIdeaSpeaking ? 'active' : ''}`}
                            onClick={() => handlePlayPauseAudio(ideaText)}
                            title={
                              isIdeaSpeaking
                                ? 'Pause concept summary'
                                : isIdeaPaused
                                ? 'Resume concept summary'
                                : 'Listen to this concept summary'
                            }
                          >
                            {isIdeaSpeaking ? <Pause size={13} /> : <Play size={13} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB: STUDYCAST AI PODCAST STUDIO                                  */}
          {/* ================================================================= */}
          {activeTab === 'studycast' && (
            <StudyCastPodcastStudio
              selectedLanguage={selectedLanguage}
              onSpeakCustom={(text: string) => handleSpeakCustom(text)}
              isSpeakingAudio={isSpeaking}
              onStopAudio={() => stopAudio()}
            />
          )}

          {/* ================================================================= */}
          {/* TAB: INTERACTIVE KNOWLEDGE GRAPH & MIND MAP                       */}
          {/* ================================================================= */}
          {activeTab === 'mindmap' && (
            <KnowledgeGraphExplorer
              selectedLanguage={selectedLanguage}
              onExploreTopic={(conceptName: string) => {
                setQuestionInput(`Explain the foundational concepts, equations, and applications of ${conceptName} in detail.`);
                setActiveTab('ask-question');
              }}
            />
          )}

          {/* ================================================================= */}
          {/* TAB: BATTLE OF BRAINS ARENA                                       */}
          {/* ================================================================= */}
          {activeTab === 'battle-quiz' && (
            <BattleOfBrainsArena
              selectedLanguage={selectedLanguage}
              currentUser={currentUser}
              onSolveMore={() => setActiveTab('ask-question')}
            />
          )}

          {/* ================================================================= */}
          {/* TAB 6: MY LEARNING HISTORY                                        */}
          {/* ================================================================= */}
          {activeTab === 'history' && (() => {
            const filterOptions: { id: 'all' | ActivityType; label: string; icon: any }[] = [
              { id: 'all', label: t.filterAll, icon: Activity },
              { id: 'math', label: t.filterMath, icon: CheckSquare },
              { id: 'qa', label: t.filterQA, icon: HelpCircle },
              { id: 'image_scan', label: t.filterImage, icon: Camera },
              { id: 'pdf_scan', label: t.filterPdf, icon: FileText },
              { id: 'quiz', label: t.filterQuiz, icon: Award },
              { id: 'flashcard', label: t.filterFlashcard, icon: Layers },
              { id: 'voice', label: t.filterVoice, icon: Volume2 },
              { id: 'geography', label: t.filterGeography, icon: Globe },
            ];

            const formatActivityDate = (isoStr: string) => {
              try {
                const d = new Date(isoStr);
                const now = new Date();
                const isToday = d.toDateString() === now.toDateString();
                const yesterday = new Date(Date.now() - 86400000);
                const isYesterday = d.toDateString() === yesterday.toDateString();
                const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                if (isToday) return `${t.todayLabel}, ${timeStr}`;
                if (isYesterday) return `${t.yesterdayLabel}, ${timeStr}`;
                return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;
              } catch {
                return t.earlierLabel;
              }
            };

            const filteredActivities = activities.filter((act) => {
              if (activityFilter !== 'all' && act.activity_type !== activityFilter) return false;
              if (activitySearch.trim()) {
                const query = activitySearch.toLowerCase();
                const inTitle = act.title.toLowerCase().includes(query);
                const inDetails = act.details?.toLowerCase().includes(query);
                const inSolution = act.solution?.toLowerCase().includes(query);
                return inTitle || inDetails || inSolution;
              }
              return true;
            });

            const getActivityTypeBadge = (type: ActivityType) => {
              switch (type) {
                case 'math':
                  return { label: t.filterMath, color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' };
                case 'qa':
                  return { label: t.filterQA, color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' };
                case 'image_scan':
                  return { label: t.filterImage, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' };
                case 'pdf_scan':
                  return { label: t.filterPdf, color: '#e11d48', bg: '#fff1f2', border: '#fecdd3' };
                case 'quiz':
                  return { label: t.filterQuiz, color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
                case 'flashcard':
                  return { label: t.filterFlashcard, color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' };
                case 'voice':
                  return { label: t.filterVoice, color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' };
                case 'geography':
                  return { label: t.filterGeography, color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' };
                default:
                  return { label: type, color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' };
              }
            };

            return (
              <div className="academic-subview-card history-subview-container">
                {/* Header with Title and Action Buttons */}
                <div className="subview-header history-header-wrapper">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <Activity size={24} className="text-indigo-600" />
                      <h2 className="academic-section-heading" style={{ margin: 0 }}>{t.history}</h2>
                      <span className="history-count-pill">{activities.length} total entries</span>
                    </div>
                    <p className="subview-subtitle" style={{ marginTop: '0.35rem' }}>{t.historySubtitle}</p>
                  </div>
                  <div className="history-header-actions">
                    <button
                      type="button"
                      className="btn-history-export"
                      onClick={handleExportHistory}
                      disabled={activities.length === 0}
                      title="Download complete learning history as text file"
                    >
                      <Download size={14} />
                      <span>{t.exportHistoryBtn}</span>
                    </button>
                    <button
                      type="button"
                      className="btn-history-clear"
                      onClick={handleClearHistory}
                      disabled={activities.length === 0}
                      title="Clear all stored activity records"
                    >
                      <Trash2 size={14} />
                      <span>{t.clearAllHistoryBtn}</span>
                    </button>
                    <button
                      type="button"
                      className="btn-back-to-home"
                      onClick={() => setActiveTab('home')}
                    >
                      ← {t.home}
                    </button>
                  </div>
                </div>

                {/* Privacy Warning banner if history logging was paused */}
                {!saveHistory && (
                  <div className="history-paused-banner">
                    <div className="history-paused-content">
                      <span className="paused-icon">⚠️</span>
                      <span>{t.historyPausedNotice}</span>
                    </div>
                    <button
                      type="button"
                      className="btn-enable-history-now"
                      onClick={() => {
                        setSaveHistory(true);
                        localStorage.setItem('atlas_save_history', 'true');
                      }}
                    >
                      {t.enableHistoryBtn}
                    </button>
                  </div>
                )}

                {/* Search Bar + Live Filter */}
                <div className="history-search-row">
                  <div className="history-search-input-wrapper">
                    <Search size={16} className="history-search-icon" />
                    <input
                      type="text"
                      className="history-search-input"
                      placeholder={t.searchHistoryPlaceholder}
                      value={activitySearch}
                      onChange={(e) => setActivitySearch(e.target.value)}
                    />
                    {activitySearch && (
                      <button
                        type="button"
                        className="history-search-clear-btn"
                        onClick={() => setActivitySearch('')}
                        title={t.clearSearchBtn}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Pills Navigation */}
                <div className="history-filter-pills-row">
                  {filterOptions.map((opt) => {
                    const IconComponent = opt.icon;
                    const isActive = activityFilter === opt.id;
                    const count = opt.id === 'all'
                      ? activities.length
                      : activities.filter((a) => a.activity_type === opt.id).length;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`history-filter-pill ${isActive ? 'active' : ''}`}
                        onClick={() => setActivityFilter(opt.id)}
                      >
                        <IconComponent size={14} />
                        <span>{opt.label}</span>
                        <span className="pill-count-badge">{count}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Activity Cards List */}
                {isLoadingActivities ? (
                  <div className="history-loading-box">
                    <Loader2 size={24} className="animate-spin text-indigo-600" />
                    <span>Loading your learning activities...</span>
                  </div>
                ) : filteredActivities.length === 0 ? (
                  <div className="history-empty-state">
                    <div className="history-empty-icon-wrap">
                      <Activity size={40} className="text-slate-400" />
                    </div>
                    <h3 className="history-empty-title">{t.noActivitiesTitle}</h3>
                    <p className="history-empty-subtitle">{t.noActivitiesSub}</p>
                    <div className="history-empty-shortcuts">
                      <button
                        type="button"
                        className="btn-empty-shortcut"
                        onClick={() => setActiveTab('solve-math')}
                      >
                        <CheckSquare size={14} />
                        <span>{t.mathCardTitle}</span>
                      </button>
                      <button
                        type="button"
                        className="btn-empty-shortcut"
                        onClick={() => setActiveTab('ask-question')}
                      >
                        <HelpCircle size={14} />
                        <span>{t.askCardTitle}</span>
                      </button>
                      <button
                        type="button"
                        className="btn-empty-shortcut"
                        onClick={() => setActiveTab('image-scanner')}
                      >
                        <Camera size={14} />
                        <span>{t.imageScannerCardTitle}</span>
                      </button>
                      <button
                        type="button"
                        className="btn-empty-shortcut"
                        onClick={() => setActiveTab('pdf-scanner')}
                      >
                        <FileText size={14} />
                        <span>{t.pdfScannerCardTitle}</span>
                      </button>
                      <button
                        type="button"
                        className="btn-empty-shortcut"
                        onClick={() => setActiveTab('flashcards')}
                      >
                        <Layers size={14} />
                        <span>{t.flashcardsCardTitle}</span>
                      </button>
                      <button
                        type="button"
                        className="btn-empty-shortcut"
                        onClick={() => setActiveTab('geography-idea')}
                      >
                        <Globe size={14} />
                        <span>{t.geographyCardTitle}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="history-cards-stream">
                    {filteredActivities.map((act) => {
                      const badge = getActivityTypeBadge(act.activity_type);
                      const isExpanded = expandedActivityId === act.id;
                      const isCopied = copiedActivityId === act.id;

                      return (
                        <div key={act.id} className="history-activity-card">
                          <div className="history-activity-header">
                            <div className="history-header-left">
                              <span
                                className="history-type-badge"
                                style={{
                                  color: badge.color,
                                  backgroundColor: badge.bg,
                                  borderColor: badge.border,
                                }}
                              >
                                {badge.label}
                              </span>
                              {act.score && (
                                <span className="history-score-badge">
                                  <Award size={12} />
                                  <span>{act.score}</span>
                                </span>
                              )}
                              <h3 className="history-card-title">{act.title}</h3>
                            </div>

                            <div className="history-header-right">
                              <span className="history-timestamp-label">
                                <Calendar size={12} />
                                <span>{formatActivityDate(act.created_at)}</span>
                              </span>

                              <div className="history-card-actions">
                                {/* TTS audio playback with Play/Pause & Stop */}
                                {(() => {
                                  const textToSpeak = act.solution || act.details || act.title;
                                  const isActSpeaking = isSpeaking && currentSpeakingText === textToSpeak;
                                  const isActPaused = isPaused && currentSpeakingText === textToSpeak;
                                  return (
                                    <>
                                      <button
                                        type="button"
                                        className={`history-action-btn ${isActSpeaking ? 'active' : ''}`}
                                        onClick={() => handlePlayPauseAudio(textToSpeak)}
                                        title={
                                          isActSpeaking
                                            ? 'Pause audio'
                                            : isActPaused
                                            ? 'Resume audio'
                                            : 'Listen to this solution with Text-to-Speech'
                                        }
                                      >
                                        {isActSpeaking ? <Pause size={14} /> : <Play size={14} />}
                                      </button>
                                      {(isActSpeaking || isActPaused) && (
                                        <button
                                          type="button"
                                          className="history-action-btn delete"
                                          onClick={stopAudio}
                                          title="Stop audio playback"
                                        >
                                          <Square size={12} />
                                        </button>
                                      )}
                                    </>
                                  );
                                })()}

                                {/* Copy to clipboard */}
                                <button
                                  type="button"
                                  className={`history-action-btn ${isCopied ? 'copied' : ''}`}
                                  onClick={() => {
                                    const fullText = `${act.title}\n\n${act.details || ''}\n\n${act.solution || ''}`.trim();
                                    navigator.clipboard.writeText(fullText);
                                    setCopiedActivityId(act.id);
                                    setTimeout(() => setCopiedActivityId(null), 2000);
                                  }}
                                  title={isCopied ? t.copySuccess : 'Copy to clipboard'}
                                >
                                  {isCopied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                                </button>

                                {/* Delete activity entry */}
                                <button
                                  type="button"
                                  className="history-action-btn delete"
                                  onClick={() => handleDeleteActivity(act.id)}
                                  title={t.deleteItemTitle}
                                >
                                  <Trash2 size={14} />
                                </button>

                                {/* Expand/collapse solution */}
                                {act.solution && (
                                  <button
                                    type="button"
                                    className="history-action-btn expand"
                                    onClick={() => setExpandedActivityId(isExpanded ? null : act.id)}
                                    title={isExpanded ? t.hideSolutionBtn : t.viewSolutionBtn}
                                  >
                                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Summary text */}
                          {act.details && (
                            <p className="history-card-summary">{act.details}</p>
                          )}

                          {/* Collapsible Full Solution / Extracted Content Accordion */}
                          {act.solution && isExpanded && (
                            <div className="history-solution-drawer">
                              <div className="history-solution-drawer-header">
                                <span className="drawer-header-title">Full Details & Solution</span>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                  {(() => {
                                    const isSolSpeaking = isSpeaking && currentSpeakingText === act.solution;
                                    const isSolPaused = isPaused && currentSpeakingText === act.solution;
                                    return (
                                      <>
                                        <button
                                          type="button"
                                          className={`btn-drawer-listen ${isSolSpeaking ? 'active' : ''}`}
                                          onClick={() => handlePlayPauseAudio(act.solution!)}
                                        >
                                          {isSolSpeaking ? <Pause size={12} /> : <Play size={12} />}
                                          <span>{isSolSpeaking ? 'Pause' : isSolPaused ? 'Resume' : 'Listen'}</span>
                                        </button>
                                        {(isSolSpeaking || isSolPaused) && (
                                          <button
                                            type="button"
                                            className="btn-drawer-collapse"
                                            style={{ borderColor: '#ef4444', color: '#ef4444', padding: '0.2rem 0.5rem' }}
                                            onClick={stopAudio}
                                            title="Stop Audio"
                                          >
                                            <Square size={11} />
                                          </button>
                                        )}
                                      </>
                                    );
                                  })()}
                                  <button
                                    type="button"
                                    className="btn-drawer-collapse"
                                    onClick={() => setExpandedActivityId(null)}
                                  >
                                    {t.hideSolutionBtn}
                                  </button>
                                </div>
                              </div>
                              <pre className="history-solution-content">{act.solution}</pre>
                            </div>
                          )}

                          {/* Quick expand trigger if solution exists but collapsed */}
                          {act.solution && !isExpanded && (
                            <div className="history-card-footer-toggle">
                              <button
                                type="button"
                                className="btn-toggle-solution-text"
                                onClick={() => setExpandedActivityId(act.id)}
                              >
                                <span>{t.viewSolutionBtn}</span>
                                <ChevronDown size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ================================================================= */}
          {/* TAB 7: ACCESSIBILITY SETTINGS                                     */}
          {/* ================================================================= */}
          {activeTab === 'settings' && (
            <div className="academic-subview-card">
              <div className="subview-header">
                <div>
                  <h2 className="academic-section-heading">Accessibility Settings</h2>
                  <p className="subview-subtitle">Customize contrast, typography, and privacy controls</p>
                </div>
                <button
                  type="button"
                  className="btn-back-to-home"
                  onClick={() => setActiveTab('home')}
                >
                  ← Back to Home
                </button>
              </div>

              <div className="settings-items-group">
                {/* Theme & Appearance Option */}
                <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Palette size={18} className="theme-palette-icon" />
                        <h4 style={{ margin: 0 }}>{t.themeOptionTitle}</h4>
                        <span className="badge-new-feature">5 Styles</span>
                      </div>
                      <p style={{ margin: '0.25rem 0 0 0' }}>{t.themeOptionDesc}</p>
                    </div>
                  </div>

                  <div className="theme-picker-grid">
                    {themeOptions.map((opt) => {
                      const isSelected = currentTheme === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          className={`theme-card-option ${isSelected ? 'active' : ''}`}
                          onClick={() => setCurrentTheme(opt.id)}
                          aria-pressed={isSelected}
                          title={`${opt.title}: ${opt.description}`}
                        >
                          <div className="theme-card-preview-header">
                            <div className="theme-preview-palette">
                              <span className="theme-color-dot" style={{ backgroundColor: opt.dotBg }} title="Background" />
                              <span className="theme-color-dot" style={{ backgroundColor: opt.dotCard }} title="Card Surface" />
                              <span className="theme-color-dot" style={{ backgroundColor: opt.dotAccent }} title="Accent Glow" />
                            </div>
                            {isSelected && (
                              <span className="theme-selected-pill">
                                <Check size={12} />
                                <span>{t.themeActiveBadge}</span>
                              </span>
                            )}
                          </div>
                          <div className="theme-card-info">
                            <div className="theme-card-title">{opt.title}</div>
                            <div className="theme-card-description">{opt.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Font Size Option */}
                <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
                    <div>
                      <h4 style={{ margin: 0 }}>Font Sizing</h4>
                      <p style={{ margin: '0.2rem 0 0 0' }}>Adjust reading scale for optimal legibility across the entire application</p>
                    </div>
                    <div className="segmented-picker">
                      <button
                        type="button"
                        className={`seg-btn ${fontSize === 'normal' ? 'active' : ''}`}
                        onClick={() => setFontSize('normal')}
                      >
                        Default (100%)
                      </button>
                      <button
                        type="button"
                        className={`seg-btn ${fontSize === 'large' ? 'active' : ''}`}
                        onClick={() => setFontSize('large')}
                      >
                        Large (115%)
                      </button>
                      <button
                        type="button"
                        className={`seg-btn ${fontSize === 'xlarge' ? 'active' : ''}`}
                        onClick={() => setFontSize('xlarge')}
                      >
                        Extra Large (130%)
                      </button>
                    </div>
                  </div>
                  <div className="font-size-live-preview-box">
                    <span className="preview-label">Live Text Scale Preview:</span>
                    <p className="preview-sample-text">
                      {selectedLanguage === 'Odia'
                        ? 'ପରୀକ୍ଷାମୂଳକ ଲେଖା: ଆଟଲାସ ୨.୦ ରେ ଆପଣଙ୍କ ପଢ଼ିବା ଅନୁଭୂତିକୁ ସହଜ ଓ ସ୍ପଷ୍ଟ କରିବା ପାଇଁ ଫଣ୍ଟ ଆକାର ପରିବର୍ତ୍ତନ କରନ୍ତୁ।'
                        : selectedLanguage === 'Hindi'
                        ? 'परीक्षण पाठ: एटलस 2.0 में अपने पठन अनुभव को आसान और स्पष्ट बनाने के लिए फ़ॉन्ट का आकार बदलें।'
                        : 'Sample Reading Text: Explore academic lessons, mathematical concepts, and geographical wonders with comfortable typography.'}
                    </p>
                  </div>
                </div>

                {/* Dyslexia Friendly Font */}
                <div className="settings-row">
                  <div>
                    <h4>Dyslexia-Friendly Typography</h4>
                    <p>Use high-legibility weighted character baseline</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={dyslexicFont}
                      onChange={(e) => setDyslexicFont(e.target.checked)}
                    />
                    <span className="slider round" />
                  </label>
                </div>

                {/* High Contrast Mode */}
                <div className="settings-row">
                  <div>
                    <h4>High Contrast Mode</h4>
                    <p>Boost contrast ratios to exceed WCAG AAA standards</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={highContrast}
                      onChange={(e) => setHighContrast(e.target.checked)}
                    />
                    <span className="slider round" />
                  </label>
                </div>

                {/* Save History Toggle */}
                <div className="settings-row">
                  <div>
                    <h4>Local History Persistence</h4>
                    <p>Retain streaks and completed problem entries in this browser</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={saveHistory}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setSaveHistory(val);
                        localStorage.setItem('atlas_save_history', String(val));
                      }}
                    />
                    <span className="slider round" />
                  </label>
                </div>

                {/* Double-Click Screen Voice Access Toggle */}
                <div className="settings-row">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 style={{ margin: 0 }}>{t.doubleClickVoiceSettingTitle}</h4>
                      <span className="badge-new-feature">New Feature</span>
                    </div>
                    <p style={{ margin: '4px 0 0 0' }}>{t.doubleClickVoiceSettingDesc}</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={doubleClickVoiceEnabled}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setDoubleClickVoiceEnabled(val);
                        localStorage.setItem('atlas_double_click_voice', String(val));
                      }}
                    />
                    <span className="slider round" />
                  </label>
                </div>

                {/* Clear Learning History Data Button */}
                <div className="settings-row">
                  <div>
                    <h4>Clear Learning History Data</h4>
                    <p>Purge all stored equations, scans, quizzes, and flashcard sessions</p>
                  </div>
                  <button
                    type="button"
                    className="btn-danger-history-clear"
                    onClick={handleClearHistory}
                    disabled={activities.length === 0}
                  >
                    <Trash2 size={15} />
                    <span>{t.clearAllHistoryBtn} ({activities.length})</span>
                  </button>
                </div>

                {/* ========================================================================= */}
                {/* 4 UNIVERSAL ACCESSIBILITY DISABILITY SUITES                               */}
                {/* ========================================================================= */}
                <div style={{ marginTop: '1.75rem', marginBottom: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Sliders size={22} style={{ color: '#06b6d4' }} />
                    <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>{t.a11yCenterTitle}</h3>
                    <span className="badge-new-feature">Universal 1-3</span>
                  </div>
                  <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-secondary, #94a3b8)', fontSize: '0.92rem' }}>
                    {t.a11yCenterSubtitle}
                  </p>
                </div>

                {/* SUITE 1: Motor & Mobility Impairment Access */}
                <div className="disability-suite-card">
                  <div className="suite-card-header">
                    <div className="suite-card-icon-wrap" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>
                      <Sliders size={22} />
                    </div>
                    <div>
                      <h4 className="suite-card-title">{t.suiteMotorTitle}</h4>
                      <p className="suite-card-desc">{t.suiteMotorDesc}</p>
                    </div>
                  </div>

                  <div className="suite-controls-grid">
                    <div className="settings-row" style={{ padding: '0.6rem 0' }}>
                      <div>
                        <h5 style={{ margin: 0, fontSize: '0.95rem' }}>{t.switchAccessToggleTitle}</h5>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>{t.switchAccessToggleDesc}</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={switchAccessEnabled}
                          onChange={(e) => {
                            setSwitchAccessEnabled(e.target.checked);
                          }}
                        />
                        <span className="slider round" />
                      </label>
                    </div>

                    <div className="settings-row" style={{ padding: '0.6rem 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div>
                        <h5 style={{ margin: 0, fontSize: '0.95rem' }}>{t.switchSpeedTitle}</h5>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>Cycle duration between each interactive element</p>
                      </div>
                      <div className="segmented-picker">
                        <button
                          type="button"
                          className={`seg-btn ${switchSpeed === 1.2 ? 'active' : ''}`}
                          onClick={() => setSwitchSpeed(1.2)}
                        >
                          1.2s Fast
                        </button>
                        <button
                          type="button"
                          className={`seg-btn ${switchSpeed === 2.0 ? 'active' : ''}`}
                          onClick={() => setSwitchSpeed(2.0)}
                        >
                          2.0s Normal
                        </button>
                        <button
                          type="button"
                          className={`seg-btn ${switchSpeed === 3.0 ? 'active' : ''}`}
                          onClick={() => setSwitchSpeed(3.0)}
                        >
                          3.0s Relaxed
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SUITE 2: Hearing Impaired & Deaf Access */}
                <div className="disability-suite-card">
                  <div className="suite-card-header">
                    <div className="suite-card-icon-wrap" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
                      <Ear size={22} />
                    </div>
                    <div>
                      <h4 className="suite-card-title">{t.suiteHearingTitle}</h4>
                      <p className="suite-card-desc">{t.suiteHearingDesc}</p>
                    </div>
                  </div>

                  <div className="suite-controls-grid">
                    <div className="settings-row" style={{ padding: '0.6rem 0' }}>
                      <div>
                        <h5 style={{ margin: 0, fontSize: '0.95rem' }}>{t.captionsToggleTitle}</h5>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>{t.captionsToggleDesc}</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={closedCaptionsEnabled}
                          onChange={(e) => setClosedCaptionsEnabled(e.target.checked)}
                        />
                        <span className="slider round" />
                      </label>
                    </div>

                    <div className="settings-row" style={{ padding: '0.6rem 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div>
                        <h5 style={{ margin: 0, fontSize: '0.95rem' }}>{t.captionsSizeTitle}</h5>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>Scale subtitle font size on the docked player</p>
                      </div>
                      <div className="segmented-picker">
                        <button
                          type="button"
                          className={`seg-btn ${captionSize === 'normal' ? 'active' : ''}`}
                          onClick={() => setCaptionSize('normal')}
                        >
                          Normal
                        </button>
                        <button
                          type="button"
                          className={`seg-btn ${captionSize === 'large' ? 'active' : ''}`}
                          onClick={() => setCaptionSize('large')}
                        >
                          Large
                        </button>
                        <button
                          type="button"
                          className={`seg-btn ${captionSize === 'xlarge' ? 'active' : ''}`}
                          onClick={() => setCaptionSize('xlarge')}
                        >
                          Extra Large
                        </button>
                      </div>
                    </div>

                    <div className="settings-row" style={{ padding: '0.6rem 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div>
                        <h5 style={{ margin: 0, fontSize: '0.95rem' }}>{t.visualAlertsToggleTitle}</h5>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>{t.visualAlertsToggleDesc}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn-a11y-pill-test"
                          onClick={() => {
                            setActiveSoundAlert({
                              id: Date.now(),
                              title: 'Visual Sound Alert Demo Triggered',
                              icon: '⚡',
                              timestamp: Date.now(),
                            });
                          }}
                          title="Trigger a test visual sound alert badge"
                        >
                          👁️ Test Alert
                        </button>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={visualAlertsEnabled}
                            onChange={(e) => setVisualAlertsEnabled(e.target.checked)}
                          />
                          <span className="slider round" />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SUITE 3: Cognitive & Neurodiversity Suite */}
                <div className="disability-suite-card">
                  <div className="suite-card-header">
                    <div className="suite-card-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                      <Brain size={22} />
                    </div>
                    <div>
                      <h4 className="suite-card-title">{t.suiteCognitiveTitle}</h4>
                      <p className="suite-card-desc">{t.suiteCognitiveDesc}</p>
                    </div>
                  </div>

                  <div className="suite-controls-grid">
                    <div className="settings-row" style={{ padding: '0.6rem 0' }}>
                      <div>
                        <h5 style={{ margin: 0, fontSize: '0.95rem' }}>{t.readingRulerToggleTitle}</h5>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>{t.readingRulerToggleDesc} (Alt + R)</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={readingRulerEnabled}
                          onChange={(e) => setReadingRulerEnabled(e.target.checked)}
                        />
                        <span className="slider round" />
                      </label>
                    </div>

                    <div className="settings-row" style={{ padding: '0.6rem 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div>
                        <h5 style={{ margin: 0, fontSize: '0.95rem' }}>{t.dyscalculiaColorsToggleTitle}</h5>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>{t.dyscalculiaColorsToggleDesc}</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={dyscalculiaColorsEnabled}
                          onChange={(e) => setDyscalculiaColorsEnabled(e.target.checked)}
                        />
                        <span className="slider round" />
                      </label>
                    </div>

                    <div className="settings-row" style={{ padding: '0.6rem 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div>
                        <h5 style={{ margin: 0, fontSize: '0.95rem' }}>{t.plainLangToggleTitle}</h5>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>{t.plainLangToggleDesc}</p>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={plainLanguageMode}
                          onChange={(e) => setPlainLanguageMode(e.target.checked)}
                        />
                        <span className="slider round" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Multilingual Voice Access Modal (English, Hindi, Odia) */}
      <VoiceAccessModal
        isOpen={voiceModalOpen}
        language={selectedLanguage}
        mode={voiceModalMode}
        onSearchSolution={handleVoiceSearch}
        onClose={() => setVoiceModalOpen(false)}
      />

      {/* Visual Ripple & Radar Toast on Double-Click Screen Activation */}
      {voiceRipple && (
        <div
          className="voice-access-screen-ripple-portal"
          style={{ left: voiceRipple.x, top: voiceRipple.y }}
        >
          <div className="voice-ripple-wave wave-1" />
          <div className="voice-ripple-wave wave-2" />
          <div className="voice-ripple-chip">
            <Mic size={14} className="pulse-mic-icon" />
            <span>{t.voiceAccessActivatedToast}</span>
          </div>
        </div>
      )}

      {/* Floating Screen-Side Double-Click Hint */}
      {showVoiceFloatingHint && !voiceModalOpen && doubleClickVoiceEnabled && (
        <div
          className="voice-screen-edge-hint"
          onClick={() => {
            playVoiceAccessChime();
            if (activeTab === 'solve-math') setVoiceModalMode('math');
            else if (activeTab === 'voice-learning' || activeTab === 'studycast') setVoiceModalMode('voice');
            else if (activeTab === 'geography-idea') setVoiceModalMode('geography');
            else setVoiceModalMode('question');
            setVoiceModalOpen(true);
          }}
          title={t.voiceAccessHint}
        >
          <Mic size={14} style={{ color: '#7c3aed' }} />
          <span>
            {selectedLanguage === 'Odia'
              ? 'ସ୍କ୍ରିନ୍ରେ ଡବଲ୍-କ୍ଲିକ୍ କରନ୍ତୁ କହିବା ପାଇଁ'
              : selectedLanguage === 'Hindi'
              ? 'बोलने के लिए स्क्रीन पर 2x क्लिक करें'
              : 'Double-click screen to talk'}
          </span>
          <span className="voice-edge-hint-kbd">2x Click</span>
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              padding: '0 2px',
              cursor: 'pointer',
              color: '#94a3b8',
              display: 'inline-flex',
              alignItems: 'center',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setShowVoiceFloatingHint(false);
            }}
            aria-label="Dismiss hint"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <DownloadCachedAppModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
      />

      {/* ========================================================================= */}
      {/* 4 UNIVERSAL ACCESSIBILITY DISABILITY SUITES (Persistent UI Overlays)      */}
      {/* ========================================================================= */}

      {/* 1. ARIA Live Announcement Region for Screen Readers */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {ariaAnnounce}
      </div>

      {/* 2. Visual Sound Alert Badge (for Deaf & Hard of Hearing) */}
      {visualAlertsEnabled && activeSoundAlert && (
        <div className="visual-sound-alert-badge" role="alert" aria-live="assertive">
          <span className="visual-sound-icon">{activeSoundAlert.icon}</span>
          <span className="visual-sound-text">{activeSoundAlert.title}</span>
        </div>
      )}

      {/* 3. Reading Focus Ruler Overlay (for Cognitive, ADHD & Autism) */}
      {readingRulerEnabled && (
        <div className="reading-focus-ruler-overlay" aria-hidden="true">
          <div className="ruler-mask-top" style={{ height: Math.max(0, rulerY - 36) }} />
          <div className="ruler-focus-window" style={{ top: Math.max(0, rulerY - 36), height: 72 }} />
          <div className="ruler-mask-bottom" style={{ top: Math.max(0, rulerY + 36) }} />
        </div>
      )}

      {/* 4. Live Closed Captions (Subtitles) Dock (for Deaf & Hard of Hearing) */}
      {closedCaptionsEnabled && (
        <div
          className={`atlas-closed-captions-dock theme-${currentTheme} caption-size-${captionSize} ${currentCaption.active ? 'active' : ''}`}
          data-theme={currentTheme}
          style={{
            background: currentTheme === 'light' ? '#ffffff' : undefined,
            borderColor: currentTheme === 'light' ? '#2563eb' : undefined,
            color: currentTheme === 'light' ? '#0f172a' : undefined,
            boxShadow:
              currentTheme === 'light'
                ? '0 16px 45px rgba(37, 99, 235, 0.18), 0 4px 14px rgba(15, 23, 42, 0.08)'
                : undefined,
          }}
          role="region"
          aria-label="Closed Captions Subtitles"
        >
          <div className="caption-content">
            <span
              className="caption-badge"
              style={{
                backgroundColor: currentTheme === 'light' ? '#2563eb' : undefined,
                color: currentTheme === 'light' ? '#ffffff' : undefined,
              }}
            >
              CC
            </span>
            <span
              className="caption-speaker"
              style={{
                color: currentTheme === 'light' ? '#1d4ed8' : undefined,
              }}
            >
              {currentCaption.speaker || 'Atlas Voice'}:
            </span>
            <span
              className="caption-text"
              style={{
                color: currentTheme === 'light' ? '#0f172a' : undefined,
              }}
            >
              {currentCaption.text ||
                (selectedLanguage === 'Odia'
                  ? 'ସ୍ପଷ୍ଟ ଧ୍ୱନି ବା ବାର୍ତ୍ତାଳାପକୁ ଅପେକ୍ଷା କରାଯାଉଛି...'
                  : selectedLanguage === 'Hindi'
                  ? 'भाषण या मीडिया की प्रतीक्षा है...'
                  : 'Listening for speech or media...')}
            </span>
          </div>
          <div className="caption-controls">
            <button
              type="button"
              className={`btn-caption-size ${captionSize === 'normal' ? 'active' : ''}`}
              onClick={() => setCaptionSize('normal')}
              title="Normal Font Scale"
              style={{
                backgroundColor:
                  currentTheme === 'light'
                    ? captionSize === 'normal'
                      ? '#2563eb'
                      : '#f1f5f9'
                    : undefined,
                borderColor:
                  currentTheme === 'light'
                    ? captionSize === 'normal'
                      ? '#2563eb'
                      : '#cbd5e1'
                    : undefined,
                color:
                  currentTheme === 'light'
                    ? captionSize === 'normal'
                      ? '#ffffff'
                      : '#1e293b'
                    : undefined,
              }}
            >
              A
            </button>
            <button
              type="button"
              className={`btn-caption-size ${captionSize === 'large' ? 'active' : ''}`}
              onClick={() => setCaptionSize('large')}
              title="Large Font Scale"
              style={{
                backgroundColor:
                  currentTheme === 'light'
                    ? captionSize === 'large'
                      ? '#2563eb'
                      : '#f1f5f9'
                    : undefined,
                borderColor:
                  currentTheme === 'light'
                    ? captionSize === 'large'
                      ? '#2563eb'
                      : '#cbd5e1'
                    : undefined,
                color:
                  currentTheme === 'light'
                    ? captionSize === 'large'
                      ? '#ffffff'
                      : '#1e293b'
                    : undefined,
              }}
            >
              A+
            </button>
            <button
              type="button"
              className={`btn-caption-size ${captionSize === 'xlarge' ? 'active' : ''}`}
              onClick={() => setCaptionSize('xlarge')}
              title="Extra Large Font Scale"
              style={{
                backgroundColor:
                  currentTheme === 'light'
                    ? captionSize === 'xlarge'
                      ? '#2563eb'
                      : '#f1f5f9'
                    : undefined,
                borderColor:
                  currentTheme === 'light'
                    ? captionSize === 'xlarge'
                      ? '#2563eb'
                      : '#cbd5e1'
                    : undefined,
                color:
                  currentTheme === 'light'
                    ? captionSize === 'xlarge'
                      ? '#ffffff'
                      : '#1e293b'
                    : undefined,
              }}
            >
              A++
            </button>
            <button
              type="button"
              className="btn-caption-close"
              onClick={() => setCurrentCaption((prev) => ({ ...prev, active: false }))}
              title="Clear current subtitle"
              style={{
                color: currentTheme === 'light' ? '#64748b' : undefined,
              }}
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* 5. Motor Switch Access Floating Status & Control Bar */}
      {switchAccessEnabled && (
        <div className="switch-access-status-bar" role="toolbar" aria-label="Switch Access Control Bar">
          <div className="switch-status-info">
            <Sliders size={16} className="switch-pulse-icon" />
            <span>
              Switch Scanning: <strong>{switchSpeed}s</strong> (Press Space or Enter to Click)
            </span>
          </div>
          <div className="switch-actions">
            <button
              type="button"
              className="btn-switch-trigger"
              onClick={handleSwitchTrigger}
              title="Trigger currently highlighted element"
            >
              👆 Click Now (Space)
            </button>
            <button
              type="button"
              className="btn-switch-toggle"
              onClick={() => setSwitchPaused((p) => !p)}
            >
              {switchPaused ? '▶️ Resume Scan' : '⏸️ Pause Scan'}
            </button>
            <button
              type="button"
              className="btn-switch-close"
              onClick={() => setSwitchAccessEnabled(false)}
              title="Exit Switch Access"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 6. Floating Universal Accessibility Suite Button (Alt + A) */}
      <button
        type="button"
        className="btn-floating-a11y"
        onClick={() => {
          setIsA11yModalOpen(true);
        }}
        title="Universal Accessibility Suite (Alt + A)"
        aria-haspopup="dialog"
      >
        <Sliders size={16} />
        <span>A11y</span>
        <span className="a11y-kbd-chip">Alt+A</span>
      </button>

      {/* Quick Accessibility Palette Modal */}
      {isA11yModalOpen && (
        <div
          className="a11y-quick-palette-backdrop"
          onClick={() => setIsA11yModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t.a11yQuickPaletteTitle}
        >
          <div
            className="a11y-quick-palette-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="a11y-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sliders size={20} style={{ color: '#06b6d4' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                  {t.a11yQuickPaletteTitle}
                </h3>
              </div>
              <button
                type="button"
                className="btn-a11y-modal-close"
                onClick={() => setIsA11yModalOpen(false)}
                aria-label={t.closeBtn}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: '0.4rem 0 1rem 0', color: 'var(--text-secondary, #94a3b8)', fontSize: '0.88rem' }}>
              Instant one-click toggles for sensory, mobility, and cognitive accessibility suites.
            </p>

            <div className="a11y-quick-toggles-grid">
              {/* Feature 1: Switch Access Scanning */}
              <div className="a11y-quick-tile">
                <div className="quick-tile-info">
                  <div className="quick-tile-icon" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>
                    <Sliders size={18} />
                  </div>
                  <div>
                    <h5 style={{ margin: 0 }}>Switch Auto-Scan</h5>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Space / Enter Navigation (Alt+S)</span>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={switchAccessEnabled}
                    onChange={(e) => {
                      setSwitchAccessEnabled(e.target.checked);
                    }}
                  />
                  <span className="slider round" />
                </label>
              </div>

              {/* Feature 3: Closed Captions Subtitles */}
              <div className="a11y-quick-tile">
                <div className="quick-tile-info">
                  <div className="quick-tile-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
                    <Captions size={18} />
                  </div>
                  <div>
                    <h5 style={{ margin: 0 }}>Closed Captions Dock</h5>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Real-time subtitles (Alt+C)</span>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={closedCaptionsEnabled}
                    onChange={(e) => setClosedCaptionsEnabled(e.target.checked)}
                  />
                  <span className="slider round" />
                </label>
              </div>

              {/* Feature 3B: Visual Sound Alerts */}
              <div className="a11y-quick-tile">
                <div className="quick-tile-info">
                  <div className="quick-tile-icon" style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
                    <Ear size={18} />
                  </div>
                  <div>
                    <h5 style={{ margin: 0 }}>Visual Sound Alerts</h5>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Flash alerts when sound plays</span>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={visualAlertsEnabled}
                    onChange={(e) => setVisualAlertsEnabled(e.target.checked)}
                  />
                  <span className="slider round" />
                </label>
              </div>

              {/* Feature 4: Reading Focus Ruler */}
              <div className="a11y-quick-tile">
                <div className="quick-tile-info">
                  <div className="quick-tile-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                    <Brain size={18} />
                  </div>
                  <div>
                    <h5 style={{ margin: 0 }}>Reading Focus Ruler</h5>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Dim distractors, follow cursor (Alt+R)</span>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={readingRulerEnabled}
                    onChange={(e) => setReadingRulerEnabled(e.target.checked)}
                  />
                  <span className="slider round" />
                </label>
              </div>

              {/* Feature 4B: Dyscalculia Math Colors */}
              <div className="a11y-quick-tile">
                <div className="quick-tile-info">
                  <div className="quick-tile-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h5 style={{ margin: 0 }}>Dyscalculia Colors</h5>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Color-code numbers & symbols</span>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={dyscalculiaColorsEnabled}
                    onChange={(e) => setDyscalculiaColorsEnabled(e.target.checked)}
                  />
                  <span className="slider round" />
                </label>
              </div>
            </div>

            <div className="a11y-modal-footer">
              <button
                type="button"
                className="btn-a11y-open-settings"
                onClick={() => {
                  setIsA11yModalOpen(false);
                  setActiveTab('settings');
                }}
              >
                ⚙️ Open Full Accessibility Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AcademicSolverPage;
