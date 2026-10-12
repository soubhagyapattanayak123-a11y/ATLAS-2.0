import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  MapPin,
  Sparkles,
  Play,
  Pause,
  Square,
  Compass,
  Copy,
  Check,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Mountain,
  Waves,
  TreePine,
  Building2,
  Hourglass,
  History,
  Landmark,
  Crown,
} from 'lucide-react';
import {
  INDIA_MAP_VIEWBOX,
  INDIA_STATES_DATA,
  GEOGRAPHY_INDIA_SEARCH_ITEMS,
  type IndiaStateInfo,
  type GeographySearchItem,
} from '../data/indiaStatesData';
import {
  HISTORICAL_ERAS,
  type HistoricalEra,
} from '../data/timeMachineErasData';

interface IndiaMapExplorerProps {
  selectedLanguage: 'English' | 'Hindi' | 'Odia';
  onExploreIdea: (query: string, title?: string) => void;
  onSpeakText: (text: string) => void;
  isSpeaking: boolean;
  onStopAudio: () => void;
  isPaused?: boolean;
  currentSpeakingText?: string;
  onPlayPauseText?: (text: string) => void;
}

export const IndiaMapExplorer: React.FC<IndiaMapExplorerProps> = ({
  selectedLanguage,
  onExploreIdea,
  onSpeakText,
  isSpeaking,
  onStopAudio,
  isPaused = false,
  currentSpeakingText = '',
  onPlayPauseText,
}) => {
  // Selected State (Default: Odisha, home state of user / Kalinga)
  const [selectedStateId, setSelectedStateId] = useState<string>('or');
  const [hoveredStateId, setHoveredStateId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Time Machine Mode state
  const [explorerMode, setExplorerMode] = useState<'modern' | 'timemachine'>('modern');
  const [selectedEraId, setSelectedEraId] = useState<string>('indus_vedic');

  const currentEra: HistoricalEra = useMemo(() => {
    return HISTORICAL_ERAS.find((e) => e.id === selectedEraId) || HISTORICAL_ERAS[0];
  }, [selectedEraId]);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);

  // Filter Zone
  const [selectedZone, setSelectedZone] = useState<string>('All');

  // Zoom / Pan
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [copiedState, setCopiedState] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Current selected state data
  const currentState: IndiaStateInfo = useMemo(() => {
    return INDIA_STATES_DATA[selectedStateId] || INDIA_STATES_DATA['or'];
  }, [selectedStateId]);

  // Hovered state data
  const hoveredState: IndiaStateInfo | null = useMemo(() => {
    return hoveredStateId ? INDIA_STATES_DATA[hoveredStateId] || null : null;
  }, [hoveredStateId]);

  // Filtered states list for quick navigation
  const statesList = useMemo(() => {
    const all = Object.values(INDIA_STATES_DATA);
    if (selectedZone === 'All') return all;
    return all.filter((s) => s.zone === selectedZone);
  }, [selectedZone]);

  // Filter search items
  const filteredSearchItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return GEOGRAPHY_INDIA_SEARCH_ITEMS.filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.stateName.toLowerCase().includes(q)
      );
    }).slice(0, 10);
  }, [searchQuery]);

  // Translations
  const t = useMemo(() => {
    if (selectedLanguage === 'Odia') {
      return {
        mapTitle: 'ଭାରତର ଇଣ୍ଟରାକ୍ଟିଭ୍ ମାନଚିତ୍ର ଓ ରାଜ୍ୟ ଭୂଗୋଳ',
        mapSubtitle: 'ଯେକୌଣସି ରାଜ୍ୟ ଉପରେ କ୍ଲିକ୍ କରନ୍ତୁ ଏବଂ ତାହାର ଭୌଗୋଳିକ ବିଶେଷତା, ନଦୀ, ପ୍ରାକୃତିକ ଆଶ୍ଚର୍ଯ୍ୟ ଓ ସହର ଜାଣନ୍ତୁ',
        searchPlaceholder: 'ରାଜ୍ୟ, ସହର, ନଦୀ ବା ଭୂଗୋଳ ଧାରଣା ଖୋଜନ୍ତୁ (ଯଥା: ଓଡ଼ିଶା, କଟକ, ପୁରୀ, ମୁମ୍ବାଇ, ବାରାଣସୀ, ଚିଲିକା)...',
        searchBtn: 'ଖୋଜନ୍ତୁ',
        exploreAiBtn: '✨ AI ଭୂଗୋଳ ବିଶ୍ଳେଷଣ',
        listenStateBtn: 'ରାଜ୍ୟ ବିବରଣୀ ଶୁଣନ୍ତୁ',
        stopAudioBtn: 'ଅଡିଓ ବନ୍ଦ କରନ୍ତୁ',
        capital: 'ରାଜଧାନୀ',
        largestCity: 'ସର୍ବବୃହତ ସହର',
        zone: 'ଅଞ୍ଚଳ',
        area: 'କ୍ଷେତ୍ରଫଳ',
        population: 'ଜନସଂଖ୍ୟା',
        climate: 'ଜଳବାୟୁ',
        riversTitle: 'ପ୍ରମୁଖ ନଦୀ ପ୍ରଣାଳୀ',
        wondersTitle: 'ପ୍ରାକୃତିକ ଆଶ୍ଚର୍ଯ୍ୟ ଓ ଜୈବମଣ୍ଡଳ',
        citiesTitle: 'ପ୍ରମୁଖ ସହର ଓ ଭୌଗୋଳିକ ଧାରଣା',
        economyTitle: 'କୃଷି, ଖଣିଜ ଓ ପ୍ରାକୃତିକ ସମ୍ପଦ',
        exploreFullState: '🌍 ଏହି ରାଜ୍ୟର ସମ୍ପୂର୍ଣ୍ଣ ଭୂଗୋଳ AI ରେ ଅନୁସନ୍ଧାନ କରନ୍ତୁ',
        copySummary: 'ସାରାଂଶ କପି କରନ୍ତୁ',
        copied: 'କପି ହୋଇଗଲା!',
        clickHint: 'କ୍ଲିକ୍ କରି ବିବରଣୀ ଦେଖନ୍ତୁ',
        zoneAll: 'ସମସ୍ତ',
        zoomIn: 'ବଡ଼ କରନ୍ତୁ',
        zoomOut: 'ଛୋଟ କରନ୍ତୁ',
        reset: 'ରିସେଟ୍',
        quickStates: 'ଦ୍ରୁତ ରାଜ୍ୟ ଚୟନ:',
      };
    }
    if (selectedLanguage === 'Hindi') {
      return {
        mapTitle: 'भारत का इंटरएक्टिव मानचित्र एवं राज्य भूगोल',
        mapSubtitle: 'मानचित्र पर किसी भी राज्य पर क्लिक करें और उसकी भौगोलिक विशेषताएं, नदियां, आश्चर्य और शहर जानें',
        searchPlaceholder: 'राज्य, शहर, नदी या भूगोल विचार खोजें (जैसे ओडिशा, कटक, मुंबई, वाराणसी, चिल्का)...',
        searchBtn: 'खोजें',
        exploreAiBtn: '✨ AI भूगोल विश्लेषण',
        listenStateBtn: 'राज्य विवरण सुनें',
        stopAudioBtn: 'ऑडियो रोकें',
        capital: 'राजधानी',
        largestCity: 'सबसे बड़ा शहर',
        zone: 'क्षेत्र',
        area: 'क्षेत्रफल',
        population: 'जनसंख्या',
        climate: 'जलवायु',
        riversTitle: 'प्रमुख नदी प्रणालियां',
        wondersTitle: 'प्राकृतिक आश्चर्य एवं बायोस्फीयर',
        citiesTitle: 'प्रमुख शहर एवं भौगोलिक विचार',
        economyTitle: 'कृषि, खनिज एवं प्राकृतिक संसाधन',
        exploreFullState: '🌍 इस राज्य का संपूर्ण भूगोल AI से समझें',
        copySummary: 'सारांश कॉपी करें',
        copied: 'कॉपी हो गया!',
        clickHint: 'क्लिक करके विवरण देखें',
        zoneAll: 'सभी',
        zoomIn: 'ज़ूम इन',
        zoomOut: 'ज़ूम आउट',
        reset: 'रीसेट',
        quickStates: 'त्वरित राज्य चयन:',
      };
    }
    return {
      mapTitle: 'Interactive India Map & State Geography Explorer',
      mapSubtitle: 'Click any state on the map to discover its physical geography, rivers, natural wonders, and cities',
      searchPlaceholder: 'Search any State, City, River, or Geography Idea (e.g. Odisha, Cuttack, Mumbai, Varanasi, Chilika)...',
      searchBtn: 'Search',
      exploreAiBtn: '✨ Explore Idea with AI',
      listenStateBtn: 'Listen State Overview',
      stopAudioBtn: 'Stop Audio',
      capital: 'Capital',
      largestCity: 'Largest City',
      zone: 'Zone',
      area: 'Area',
      population: 'Population',
      climate: 'Climate',
      riversTitle: 'Major River Systems',
      wondersTitle: 'Natural Wonders & Biospheres',
      citiesTitle: 'Major Cities & Geographical Insights',
      economyTitle: 'Crops, Minerals & Natural Wealth',
      exploreFullState: '🌍 Explore Full State Geography with AI',
      copySummary: 'Copy State Note',
      copied: 'Copied!',
      clickHint: 'Click to explore state',
      zoneAll: 'All',
      zoomIn: 'Zoom In',
      zoomOut: 'Zoom Out',
      reset: 'Reset View',
      quickStates: 'Quick State Jump:',
    };
  }, [selectedLanguage]);

  // Get localized state name
  const getStateName = (state: IndiaStateInfo) => {
    if (selectedLanguage === 'Odia') return state.nameOr;
    if (selectedLanguage === 'Hindi') return state.nameHi;
    return state.name;
  };

  // Get localized capital name
  const getCapitalName = (state: IndiaStateInfo) => {
    if (selectedLanguage === 'Odia') return state.capitalOr;
    if (selectedLanguage === 'Hindi') return state.capitalHi;
    return state.capital;
  };

  // Get localized about text
  const getAboutText = (state: IndiaStateInfo) => {
    if (selectedLanguage === 'Odia') return state.aboutOr;
    if (selectedLanguage === 'Hindi') return state.aboutHi;
    return state.aboutEn;
  };

  // Handle map state click
  const handleSelectState = (stateId: string) => {
    setSelectedStateId(stateId);
    setSearchQuery('');
    setShowSearchDropdown(false);
  };

  // Handle search item selection
  const handleSelectSearchItem = (item: GeographySearchItem) => {
    if (item.stateId && INDIA_STATES_DATA[item.stateId]) {
      setSelectedStateId(item.stateId);
    }
    setSearchQuery(item.title);
    setShowSearchDropdown(false);
    // Directly explore idea if clicked
    onExploreIdea(item.query, item.title);
  };

  // Copy state summary
  const handleCopySummary = () => {
    const text = `${getStateName(currentState)} (${currentState.name}) - ${currentState.nickname}\n` +
      `Capital: ${getCapitalName(currentState)} | Zone: ${currentState.zone}\n` +
      `About: ${getAboutText(currentState)}\n` +
      `Rivers: ${currentState.rivers.join(', ')}\n` +
      `Highlights: ${currentState.geographyHighlights.join(', ')}\n` +
      `Climate: ${currentState.climate}\n` +
      `Natural Wealth: ${currentState.cropsAndEconomy}`;
    navigator.clipboard.writeText(text);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  // State and era speech text content
  const stateSpeech = useMemo(() => {
    return `${getStateName(currentState)}. ${currentState.nickname}. ${getAboutText(currentState)} ` +
      `Major rivers include ${currentState.rivers.join(', ')}. Key landmarks include ${currentState.wonders.slice(0, 2).join(', ')}.`;
  }, [currentState, selectedLanguage]);

  const eraSpeech = useMemo(() => {
    return currentEra.audioNarration[selectedLanguage] || currentEra.audioNarration.English;
  }, [currentEra, selectedLanguage]);

  const isStateAudioActive = isSpeaking && currentSpeakingText === stateSpeech;
  const isStateAudioPaused = isPaused && currentSpeakingText === stateSpeech;

  // Read state overview aloud with Play/Pause support
  const handleListenState = () => {
    if (onPlayPauseText) {
      onPlayPauseText(stateSpeech);
    } else {
      if (isSpeaking) {
        onStopAudio();
      } else {
        onSpeakText(stateSpeech);
      }
    }
  };

  const isEraAudioActive = isSpeaking && currentSpeakingText === eraSpeech;
  const isEraAudioPaused = isPaused && currentSpeakingText === eraSpeech;

  // Read time machine era aloud with Play/Pause support
  const handleListenEra = () => {
    if (onPlayPauseText) {
      onPlayPauseText(eraSpeech);
    } else {
      if (isSpeaking) {
        onStopAudio();
      } else {
        onSpeakText(eraSpeech);
      }
    }
  };

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const zones = ['All', 'Eastern', 'Western', 'Northern', 'Southern', 'Central', 'North-Eastern', 'Union Territory'];

  return (
    <div className="india-map-studio-container" id="india-map-studio">
      {/* SECTION HEADER */}
      <div className="india-map-header-bar">
        <div className="india-map-title-wrap">
          <div className="india-map-badge">
            <Compass size={16} className="text-teal-400 animate-pulse" />
            <span>Bharat Map Studio</span>
          </div>
          <h2 className="india-map-title">{t.mapTitle}</h2>
          <p className="india-map-subtitle">{t.mapSubtitle}</p>
        </div>

        {/* SEARCH BAR FOR EXTRA IDEA / STATE / CITY */}
        <div className="india-search-outer-wrap">
          <div className="india-search-input-box">
            <Search size={18} className="text-teal-500" />
            <input
              type="text"
              className="india-search-input"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              placeholder={t.searchPlaceholder}
            />
            {searchQuery && (
              <button
                type="button"
                className="btn-clear-search"
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchDropdown(false);
                }}
              >
                <X size={15} />
              </button>
            )}
            <button
              type="button"
              className="btn-search-explore-ai"
              onClick={() => {
                const queryText = searchQuery.trim() || `${getStateName(currentState)} state geography, rivers, and landscape`;
                onExploreIdea(
                  `Comprehensive geographic and earth science analysis of: ${queryText}. Explain topography, river systems, climate patterns, soil types, and natural landmarks.`,
                  queryText
                );
              }}
            >
              <Sparkles size={14} />
              <span>{t.exploreAiBtn}</span>
            </button>
          </div>

          {/* AUTOCOMPLETE / RESULTS DROPDOWN */}
          {showSearchDropdown && filteredSearchItems.length > 0 && (
            <div className="india-search-dropdown-menu">
              <div className="search-dropdown-header">
                <span>Matching States, Cities & Geographic Wonders ({filteredSearchItems.length})</span>
                <button type="button" onClick={() => setShowSearchDropdown(false)}>
                  <X size={12} />
                </button>
              </div>
              {filteredSearchItems.map((item) => (
                <div
                  key={item.id}
                  className="search-dropdown-row"
                  onClick={() => handleSelectSearchItem(item)}
                >
                  <div className="search-item-icon">
                    {item.type === 'state' ? (
                      <MapPin size={16} className="text-teal-500" />
                    ) : item.type === 'city' ? (
                      <Building2 size={16} className="text-amber-500" />
                    ) : item.type === 'river' ? (
                      <Waves size={16} className="text-blue-500" />
                    ) : (
                      <Mountain size={16} className="text-emerald-500" />
                    )}
                  </div>
                  <div className="search-item-info">
                    <div className="search-item-title">{item.title}</div>
                    <div className="search-item-subtitle">{item.subtitle}</div>
                  </div>
                  <div className="search-item-action">
                    <span className="badge-explore-action">Explore</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODE TOGGLE: MODERN STATES VS ⏳ TIME MACHINE HISTORICAL ERAS */}
      <div className="india-mode-switch-wrapper">
        <button
          type="button"
          className={`btn-india-mode ${explorerMode === 'modern' ? 'active' : ''}`}
          onClick={() => setExplorerMode('modern')}
        >
          <MapPin size={15} />
          <span>Modern States & Geography</span>
        </button>

        <button
          type="button"
          className={`btn-india-mode mode-timemachine ${explorerMode === 'timemachine' ? 'active' : ''}`}
          onClick={() => setExplorerMode('timemachine')}
        >
          <Hourglass size={15} />
          <span>⏳ Time Machine: Historical Eras</span>
        </button>
      </div>

      {/* IF TIME MACHINE MODE: SHOW TIMELINE CHRONOLOGY BAR */}
      {explorerMode === 'timemachine' ? (
        <div className="india-timemachine-scrubber-bar">
          <span className="timemachine-bar-label">
            <History size={14} color="#f59e0b" />
            <span>Historical Eras:</span>
          </span>
          <div className="timemachine-eras-pills">
            {HISTORICAL_ERAS.map((era) => {
              const isActive = era.id === selectedEraId;
              return (
                <button
                  key={era.id}
                  type="button"
                  className={`era-scrub-pill ${isActive ? 'active' : ''}`}
                  onClick={() => setSelectedEraId(era.id)}
                >
                  <span className="era-year-badge">{era.yearRange.split(' - ')[0]}</span>
                  <span className="era-name-label">{era.eraName[selectedLanguage] || era.eraName.English}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* ZONE FILTER PILLS (FOR MODERN MAP) */
        <div className="india-zone-pills-row">
          <span className="zone-filter-label">
            <Layers size={14} />
            <span>Region Filter:</span>
          </span>
          {zones.map((zone) => (
            <button
              key={zone}
              type="button"
              className={`india-zone-pill ${selectedZone === zone ? 'active' : ''}`}
              onClick={() => setSelectedZone(zone)}
            >
              {zone === 'All' ? t.zoneAll : zone}
            </button>
          ))}
        </div>
      )}

      {/* MAIN TWO-COLUMN LAYOUT: MAP ON LEFT, STATE DETAIL CARD ON RIGHT */}
      <div className="india-map-two-col-layout">
        {/* LEFT COLUMN: INTERACTIVE SVG MAP */}
        <div className="india-map-stage-card" ref={mapContainerRef}>
          {/* MAP TOOLBAR (ZOOM / CONTROLS / ACTIVE STATE PILL) */}
          <div className="map-stage-toolbar">
            <div className="active-state-tag-pill">
              <span className="state-dot" style={{ backgroundColor: currentState.color }}></span>
              <span className="state-name-tag">
                {getStateName(currentState)} ({currentState.code})
              </span>
            </div>

            <div className="map-zoom-controls">
              <button
                type="button"
                className="btn-map-control"
                onClick={handleZoomIn}
                title={t.zoomIn}
              >
                <ZoomIn size={15} />
              </button>
              <button
                type="button"
                className="btn-map-control"
                onClick={handleZoomOut}
                title={t.zoomOut}
              >
                <ZoomOut size={15} />
              </button>
              <button
                type="button"
                className="btn-map-control"
                onClick={handleResetZoom}
                title={t.reset}
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>

          {/* SVG MAP WRAPPER */}
          <div className="svg-map-viewport">
            <svg
              viewBox={INDIA_MAP_VIEWBOX}
              className="india-svg-map-element"
              style={{
                transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                transformOrigin: 'center center',
                transition: 'transform 0.25s ease-out',
              }}
            >
              <defs>
                <filter id="glow-selected" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#14b8a6" floodOpacity="0.85" />
                </filter>
                <filter id="glow-hover" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#38bdf8" floodOpacity="0.75" />
                </filter>
                <linearGradient id="grad-sea" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#e0f2fe" />
                  <stop offset="100%" stopColor="#f0f9ff" />
                </linearGradient>
              </defs>

              {/* Water background */}
              <rect x="0" y="0" width="612" height="696" fill="url(#grad-sea)" rx="16" />

              {/* Ocean Text Labels */}
              <text x="70" y="540" className="svg-ocean-label">ARABIAN SEA</text>
              <text x="390" y="520" className="svg-ocean-label">BAY OF BENGAL</text>
              <text x="210" y="680" className="svg-ocean-label">INDIAN OCEAN</text>

              {/* Render all 36 Indian states and UTs */}
              <g className="india-states-paths-group">
                {Object.values(INDIA_STATES_DATA).map((state) => {
                  const isSelected = selectedStateId === state.id;
                  const isHovered = hoveredStateId === state.id;
                  const isZoneMatch = selectedZone === 'All' || state.zone === selectedZone;
                  const isEraCenter = explorerMode === 'timemachine' && currentEra.keyCenterStateIds.includes(state.id);

                  let pathFill = state.color;
                  let pathStroke = '#ffffff';
                  let pathStrokeWidth = '1.2';

                  if (explorerMode === 'timemachine') {
                    if (isEraCenter) {
                      pathFill = isHovered ? '#f59e0b' : '#d97706';
                      pathStroke = '#78350f';
                      pathStrokeWidth = '2';
                    } else {
                      pathFill = isHovered ? '#cbd5e1' : '#e2e8f0';
                      pathStroke = '#94a3b8';
                      pathStrokeWidth = '0.8';
                    }
                  } else {
                    pathFill = isSelected ? '#0d9488' : isHovered ? '#0284c7' : state.color;
                    pathStroke = isSelected ? '#0f172a' : isHovered ? '#0369a1' : '#ffffff';
                    pathStrokeWidth = isSelected ? '2.5' : isHovered ? '2' : '1.2';
                  }

                  return (
                    <path
                      key={state.id}
                      id={`state-path-${state.id}`}
                      d={state.svgPath}
                      className={`india-state-path ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''} ${!isZoneMatch && explorerMode === 'modern' ? 'dimmed' : ''}`}
                      fill={pathFill}
                      stroke={pathStroke}
                      strokeWidth={pathStrokeWidth}
                      filter={isSelected ? 'url(#glow-selected)' : isHovered ? 'url(#glow-hover)' : undefined}
                      onClick={() => handleSelectState(state.id)}
                      onMouseEnter={(e) => {
                        setHoveredStateId(state.id);
                        const rect = mapContainerRef.current?.getBoundingClientRect();
                        if (rect) {
                          setTooltipPos({
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                          });
                        }
                      }}
                      onMouseMove={(e) => {
                        const rect = mapContainerRef.current?.getBoundingClientRect();
                        if (rect) {
                          setTooltipPos({
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                          });
                        }
                      }}
                      onMouseLeave={() => {
                        setHoveredStateId(null);
                        setTooltipPos(null);
                      }}
                    />
                  );
                })}
              </g>

              {/* State Abbreviation Badges on Map Center */}
              <g className="india-state-labels-group" pointerEvents="none">
                {Object.values(INDIA_STATES_DATA).map((state) => {
                  const isSelected = selectedStateId === state.id;
                  // Only render codes for larger states to avoid visual clutter
                  const showCode = [
                    'or', 'mh', 'rj', 'up', 'wb', 'ka', 'tn', 'gj', 'mp',
                    'ap', 'tg', 'br', 'jh', 'ct', 'pb', 'hr', 'jk', 'as', 'ar'
                  ].includes(state.id);

                  if (!showCode) return null;

                  return (
                    <g key={`label-${state.id}`} transform={`translate(${state.center[0]}, ${state.center[1]})`}>
                      <circle
                        cx="0"
                        cy="0"
                        r={isSelected ? '10' : '7.5'}
                        fill={isSelected ? '#ffffff' : 'rgba(15, 23, 42, 0.75)'}
                        stroke={isSelected ? '#0d9488' : 'rgba(255, 255, 255, 0.4)'}
                        strokeWidth="1.2"
                      />
                      <text
                        x="0"
                        y="3.2"
                        textAnchor="middle"
                        fontSize={isSelected ? '8' : '6.5'}
                        fontWeight="700"
                        fill={isSelected ? '#0f766e' : '#ffffff'}
                      >
                        {state.code}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* FLOATING HOVER TOOLTIP */}
            {hoveredState && tooltipPos && (
              <div
                className="india-map-floating-tooltip"
                style={{
                  left: `${tooltipPos.x + 12}px`,
                  top: `${tooltipPos.y - 40}px`,
                }}
              >
                <div className="tooltip-title">
                  <span>{getStateName(hoveredState)}</span>
                  <span className="tooltip-code">{hoveredState.code}</span>
                </div>
                <div className="tooltip-sub">
                  <span>Capital: {getCapitalName(hoveredState)}</span> • <span>{hoveredState.zone}</span>
                </div>
                <div className="tooltip-hint">{t.clickHint}</div>
              </div>
            )}
          </div>

          {/* QUICK STATE PILLS ROW AT BOTTOM OF MAP */}
          <div className="map-bottom-quick-bar">
            <span className="quick-label">{t.quickStates}</span>
            <div className="quick-states-scroll">
              {statesList.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  className={`btn-quick-state ${selectedStateId === st.id ? 'active' : ''}`}
                  onClick={() => handleSelectState(st.id)}
                >
                  {getStateName(st)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: RICH STATE GEOGRAPHY CARD OR TIME MACHINE HISTORICAL ERA PANEL */}
        {explorerMode === 'timemachine' ? (
          <div className="india-state-detail-panel timemachine-panel">
            <div className="state-hero-header" style={{ borderTopColor: '#f59e0b' }}>
              <div className="state-hero-top">
                <div className="state-badge-row">
                  <span className="badge-zone" style={{ backgroundColor: 'rgba(245, 158, 11, 0.18)', color: '#f59e0b', borderColor: '#f59e0b' }}>
                    <History size={12} />
                    <span>{currentEra.yearRange}</span>
                  </span>
                  <span className="badge-capital">
                    Capital / Hub: <strong>{currentEra.capitalCity}</strong>
                  </span>
                </div>

                <div className="state-hero-actions" style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    className={`btn-state-listen ${isEraAudioActive ? 'active' : ''}`}
                    onClick={handleListenEra}
                    title={
                      isEraAudioActive
                        ? 'Pause Narration'
                        : isEraAudioPaused
                        ? 'Resume Narration'
                        : 'Listen to Era History Narration'
                    }
                  >
                    {isEraAudioActive ? <Pause size={15} /> : <Play size={15} />}
                    <span>{isEraAudioActive ? 'Pause' : isEraAudioPaused ? 'Resume' : 'Listen History'}</span>
                  </button>
                  {(isEraAudioActive || isEraAudioPaused) && (
                    <button
                      type="button"
                      className="btn-state-listen"
                      style={{
                        padding: '0.45rem 0.6rem',
                        minWidth: 'auto',
                        background: 'rgba(239, 68, 68, 0.15)',
                        borderColor: '#ef4444',
                        color: '#fca5a5',
                      }}
                      onClick={onStopAudio}
                      title="Stop Audio"
                    >
                      <Square size={13} />
                    </button>
                  )}
                </div>
              </div>

              <div className="state-names-display" style={{ marginTop: '0.85rem' }}>
                <h3 className="state-main-name" style={{ color: '#fbbf24' }}>
                  {currentEra.eraName[selectedLanguage] || currentEra.eraName.English}
                </h3>
                <span className="state-sub-names" style={{ color: '#cbd5e1' }}>
                  Dynasty / Leadership: {currentEra.rulerDynasty}
                </span>
              </div>

              <p className="state-about-paragraph" style={{ marginTop: '0.75rem' }}>
                {currentEra.description[selectedLanguage] || currentEra.description.English}
              </p>
            </div>

            {/* KEY MONUMENTS & HERITAGE SITES */}
            <div className="state-section-block">
              <h4 className="section-title-label">
                <Landmark size={15} className="text-amber-400" />
                <span>Historic Monuments & Heritage Sites</span>
              </h4>
              <div className="monuments-cards-grid">
                {currentEra.monuments.map((mon, mIdx) => (
                  <div key={mIdx} className="monument-card">
                    <div className="monument-title-row">
                      <span className="monument-name">{mon.name}</span>
                      <span className="monument-location">{mon.location}</span>
                    </div>
                    <p className="monument-desc">{mon.significance}</p>
                    <button
                      type="button"
                      className="btn-explore-monument"
                      onClick={() =>
                        onExploreIdea(
                          `Historical architecture, engineering, and cultural significance of: ${mon.name} in ${mon.location}. Explain how it was built, astronomical or artistic features, and historical context.`,
                          mon.name
                        )
                      }
                    >
                      <Sparkles size={13} />
                      <span>Explore Monument with AI</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* SCIENTIFIC & CULTURAL ACHIEVEMENTS */}
            <div className="state-section-block">
              <h4 className="section-title-label">
                <Crown size={15} className="text-yellow-400" />
                <span>Key Era Achievements & Inventions</span>
              </h4>
              <ul className="era-achievements-list">
                {currentEra.keyAchievements.map((ach, aIdx) => (
                  <li key={aIdx} className="achievement-item">
                    <span className="bullet-gold">✦</span>
                    <span>{ach}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* AI DEEP DIVE CTA */}
            <div className="state-full-explore-cta">
              <button
                type="button"
                className="btn-explore-full-state"
                style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}
                onClick={() =>
                  onExploreIdea(
                    `Comprehensive historical and geographic thesis on ${currentEra.eraName.English} (${currentEra.yearRange}):\n` +
                    `1. Political administration and prominent rulers\n` +
                    `2. Territorial reach and ancient trade routes across India and the oceans\n` +
                    `3. Scientific, mathematical, astronomical, and architectural marvels\n` +
                    `4. Enduring legacy shaping modern Indian heritage and geography.`,
                    `${currentEra.eraName.English} Historical Exploration`
                  )
                }
              >
                <Sparkles size={16} className="text-amber-300" />
                <span>Explore Complete Era with AI</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="india-state-detail-panel">
            {/* STATE HERO HEADER */}
            <div className="state-hero-header" style={{ borderTopColor: currentState.color }}>
            <div className="state-hero-top">
              <div className="state-badge-row">
                <span className="badge-zone" style={{ backgroundColor: `${currentState.color}22`, color: currentState.color, borderColor: currentState.color }}>
                  {currentState.zone}
                </span>
                <span className="badge-code">{currentState.code}</span>
                <span className="badge-capital">
                  {t.capital}: <strong>{getCapitalName(currentState)}</strong>
                </span>
              </div>

              <div className="state-hero-actions" style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className={`btn-state-listen ${isStateAudioActive ? 'active' : ''}`}
                  onClick={handleListenState}
                  title={
                    isStateAudioActive
                      ? 'Pause'
                      : isStateAudioPaused
                      ? 'Resume'
                      : t.listenStateBtn
                  }
                >
                  {isStateAudioActive ? <Pause size={15} /> : <Play size={15} />}
                  <span>{isStateAudioActive ? 'Pause' : isStateAudioPaused ? 'Resume' : t.listenStateBtn}</span>
                </button>
                {(isStateAudioActive || isStateAudioPaused) && (
                  <button
                    type="button"
                    className="btn-state-listen"
                    style={{
                      padding: '0.45rem 0.6rem',
                      minWidth: 'auto',
                      background: 'rgba(239, 68, 68, 0.15)',
                      borderColor: '#ef4444',
                      color: '#fca5a5',
                    }}
                    onClick={onStopAudio}
                    title="Stop Audio"
                  >
                    <Square size={13} />
                  </button>
                )}
                <button
                  type="button"
                  className="btn-state-copy"
                  onClick={handleCopySummary}
                  title={t.copySummary}
                >
                  {copiedState ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedState ? t.copied : t.copySummary}</span>
                </button>
              </div>
            </div>

            <div className="state-names-display">
              <h3 className="state-main-name">
                {getStateName(currentState)}
              </h3>
              <span className="state-sub-names">
                ({currentState.name} • {currentState.nameHi} • {currentState.nameOr})
              </span>
            </div>

            <div className="state-nickname-banner">
              <span>🌟</span>
              <span>{currentState.nickname}</span>
            </div>

            <p className="state-about-paragraph">
              {getAboutText(currentState)}
            </p>
          </div>

          {/* QUICK STATS METRICS GRID */}
          <div className="state-stats-grid">
            <div className="state-stat-card">
              <span className="stat-label">{t.largestCity}</span>
              <span className="stat-value">{currentState.largestCity}</span>
            </div>
            <div className="state-stat-card">
              <span className="stat-label">{t.area}</span>
              <span className="stat-value">{currentState.area}</span>
            </div>
            <div className="state-stat-card">
              <span className="stat-label">{t.population}</span>
              <span className="stat-value">{currentState.population}</span>
            </div>
            <div className="state-stat-card">
              <span className="stat-label">{t.climate}</span>
              <span className="stat-value text-xs">{currentState.climate}</span>
            </div>
          </div>

          {/* RIVERS & GEOGRAPHY HIGHLIGHTS */}
          <div className="state-features-block">
            <div className="feature-block-header">
              <Waves size={16} className="text-cyan-400" />
              <h4>{t.riversTitle}</h4>
            </div>
            <div className="feature-pills-wrap">
              {currentState.rivers.map((river, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="feature-pill river-pill"
                  onClick={() =>
                    onExploreIdea(
                      `Detailed hydrographic study of ${river} river in ${currentState.name}: origin, basin hydrology, tributaries, agriculture, and water management.`,
                      `${river} River (${currentState.name})`
                    )
                  }
                  title="Explore this river system with AI"
                >
                  <span>🌊</span>
                  <span>{river}</span>
                  <Sparkles size={11} className="text-cyan-400 ml-1" />
                </button>
              ))}
            </div>
          </div>

          {/* NATURAL WONDERS & LANDFORMS */}
          <div className="state-features-block">
            <div className="feature-block-header">
              <Mountain size={16} className="text-emerald-400" />
              <h4>{t.wondersTitle}</h4>
            </div>
            <ul className="wonders-checklist">
              {currentState.wonders.map((wonder, idx) => (
                <li key={idx} className="wonder-item">
                  <div className="wonder-text">
                    <span className="wonder-bullet">✦</span>
                    <span>{wonder}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-explore-wonder"
                    onClick={() =>
                      onExploreIdea(
                        `Geographical, ecological, and earth science significance of ${wonder} in ${currentState.name}. Explain its physical landscape and biodiversity.`,
                        `${wonder} (${currentState.name})`
                      )
                    }
                    title="Analyze with AI"
                  >
                    <Sparkles size={12} />
                    <span>Explore</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* CROPS, MINERALS & WEALTH */}
          <div className="state-features-block">
            <div className="feature-block-header">
              <TreePine size={16} className="text-amber-400" />
              <h4>{t.economyTitle}</h4>
            </div>
            <p className="economy-content-text">
              {currentState.cropsAndEconomy}
            </p>
          </div>

          {/* MAJOR CITIES & EXTRA IDEAS CARDS */}
          <div className="state-features-block">
            <div className="feature-block-header">
              <Building2 size={16} className="text-teal-400" />
              <h4>{t.citiesTitle}</h4>
            </div>
            <div className="cities-idea-cards-grid">
              {currentState.majorCities.map((city, idx) => (
                <div key={idx} className="city-idea-card">
                  <div className="city-card-header">
                    <span className="city-name">{city.name}</span>
                    <span className="city-state-tag">{currentState.code}</span>
                  </div>
                  <p className="city-note">{city.note}</p>
                  <button
                    type="button"
                    className="btn-city-explore-idea"
                    onClick={() => onExploreIdea(city.ideaPrompt, `${city.name}, ${currentState.name}`)}
                  >
                    <Sparkles size={13} />
                    <span>Explore City Idea</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* BOTTOM FULL STATE AI EXPLORATION CTA */}
          <div className="state-full-explore-cta">
            <button
              type="button"
              className="btn-explore-full-state"
              onClick={() =>
                onExploreIdea(
                  `Comprehensive academic geography thesis on ${currentState.name} (${currentState.nameOr} / ${currentState.nameHi}):\n` +
                  `1. Physical topography and geomorphology\n` +
                  `2. Drainage system, major rivers (${currentState.rivers.join(', ')}) and water resources\n` +
                  `3. Climate zones, monsoon mechanisms, and seasonal weather\n` +
                  `4. Forest types, national parks, and biodiversity reserves\n` +
                  `5. Agricultural patterns, mineral deposits, and strategic economic geography.`,
                  `${getStateName(currentState)} Complete Geography`
                )
              }
            >
              <Sparkles size={16} className="text-amber-300" />
              <span>{t.exploreFullState}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
);
};
