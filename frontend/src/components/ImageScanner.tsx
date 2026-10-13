import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  FileText,
  HelpCircle,
  Lightbulb,
  Volume2,
  Play,
  Pause,
  Square,
  Copy,
  Check,
  Sparkles,
  Loader2,
  AlertCircle,
  Trash2,
  Mic,
  Keyboard,
  CheckSquare,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Award,
} from 'lucide-react';
import { api, logLearningActivity, type ScanImageResponse } from '../api';
import type { QuizQuestion } from '../types';
import { IndicVirtualKeyboard, type IndicLanguage } from './IndicVirtualKeyboard';
import { VoiceAccessModal } from './VoiceAccessModal';
import {
  preUnlockAudio,
  cleanTextForSpeech,
  speakWithBrowserFallback,
} from '../utils/speechUtils';

interface ImageScannerProps {
  selectedLanguage: 'English' | 'Hindi' | 'Odia';
  onSolveMathRedirect?: (problemText: string) => void;
  onAskQuestionRedirect?: (questionText: string) => void;
}

export const ImageScanner: React.FC<ImageScannerProps> = ({
  selectedLanguage,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  // Results State
  const [extractedText, setExtractedText] = useState<string>('');
  const [qaResult, setQaResult] = useState<string>('');
  const [explainResult, setExplainResult] = useState<string>('');
  const [customQuestion, setCustomQuestion] = useState<string>('');

  // Quiz State (MCQs from Scanned Topic)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState<boolean>(false);
  const [quizRawResult, setQuizRawResult] = useState<string>('');

  // Loading States
  const [isScanningText, setIsScanningText] = useState<boolean>(false);
  const [isAnsweringQA, setIsAnsweringQA] = useState<boolean>(false);
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Audio Playback
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [audioTarget, setAudioTarget] = useState<'text' | 'qa' | 'explain' | 'quiz' | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Virtual Keyboard & Voice Modal State
  const [showKeyboard, setShowKeyboard] = useState<boolean>(false);
  const [keyboardLang, setKeyboardLang] = useState<IndicLanguage>(
    selectedLanguage === 'Hindi' ? 'Hindi' : 'Odia'
  );
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Sync keyboard lang
  useEffect(() => {
    if (selectedLanguage === 'Hindi') setKeyboardLang('Hindi');
    else if (selectedLanguage === 'Odia') setKeyboardLang('Odia');
  }, [selectedLanguage]);

  // Clean up audio & camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  // Clipboard paste listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileSelect(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      // Reset past results when new image is loaded
      setExtractedText('');
      setQaResult('');
      setExplainResult('');
      setQuizQuestions([]);
      setUserAnswers({});
      setQuizRawResult('');
      stopAudio();
    };
    reader.readAsDataURL(file);
  };

  // Camera handling
  const startCamera = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setErrorMsg('Could not access camera. Please allow camera permissions or upload an image file.');
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setImagePreview(dataUrl);
      setExtractedText('');
      setQaResult('');
      setExplainResult('');
      setQuizQuestions([]);
      setUserAnswers({});
      setQuizRawResult('');
      stopCamera();
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    setExtractedText('');
    setQaResult('');
    setExplainResult('');
    setQuizQuestions([]);
    setUserAnswers({});
    setQuizRawResult('');
    setErrorMsg(null);
    stopAudio();
    stopCamera();
  };

  // Sample Images generator (creates crisp canvas sample)
  const loadSampleImage = (type: 'math' | 'diagram' | 'odia_science') => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 600, 360);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 580, 340);

    if (type === 'math') {
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.fillText('Solve the Algebraic Equation:', 40, 60);

      ctx.fillStyle = '#2563eb';
      ctx.font = 'bold 36px monospace';
      ctx.fillText('3x + 12 = 45', 40, 130);

      ctx.fillStyle = '#334155';
      ctx.font = '20px Inter, sans-serif';
      ctx.fillText('1. Subtract 12 from both sides', 40, 190);
      ctx.fillText('2. Divide both sides by 3', 40, 230);
      ctx.fillText('3. Find the value of x', 40, 270);
    } else if (type === 'diagram') {
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.fillText('Photosynthesis Cycle Diagram', 40, 50);

      // Sun
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(100, 120, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#854d0e';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('Sunlight (Energy)', 50, 180);

      // Leaf
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(320, 160, 80, 45, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#14532d';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('Chloroplast (Leaf)', 260, 165);

      ctx.fillStyle = '#0f172a';
      ctx.font = '16px monospace';
      ctx.fillText('6CO2 + 6H2O + Light -> C6H12O6 + 6O2', 60, 280);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('ପଦାର୍ଥ ବିଜ୍ଞାନ ପ୍ରଶ୍ନ (Physics Question):', 40, 60);

      ctx.fillStyle = '#1e3a8a';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('ନ୍ୟୁଟନଙ୍କ ଦ୍ୱିତୀୟ ଗତି ନିୟମ କଣ?', 40, 130);

      ctx.fillStyle = '#334155';
      ctx.font = '20px monospace';
      ctx.fillText('F = m * a (Force = Mass * Acceleration)', 40, 200);

      ctx.fillStyle = '#475569';
      ctx.font = '18px sans-serif';
      ctx.fillText('ବସ୍ତୁ ଉପରେ ପ୍ରୟୋଗ ହେଉଥିବା ବଳ ନିର୍ଣ୍ଣୟ କରନ୍ତୁ।', 40, 260);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setImagePreview(dataUrl);
    setExtractedText('');
    setQaResult('');
    setExplainResult('');
    setQuizQuestions([]);
    setUserAnswers({});
    setQuizRawResult('');
    stopAudio();
  };

  // ACTION: 1. Scan image and convert into text (OCR)
  const handleScanText = async () => {
    if (!imagePreview) return;
    setIsScanningText(true);
    setErrorMsg(null);
    try {
      const resp: ScanImageResponse = await api.scanImage(
        imagePreview,
        'extract_text',
        selectedLanguage
      );
      const textResult = resp.result || 'No text detected in the image.';
      setExtractedText(textResult);
      if (textResult) {
        logLearningActivity({
          activity_type: 'image_scan',
          title: 'Image Text Extracted (OCR)',
          details: textResult.slice(0, 160) + (textResult.length > 160 ? '...' : ''),
          solution: textResult,
          language: selectedLanguage,
        });
      }
    } catch (err: any) {
      console.error('Scan text failed:', err);
      setErrorMsg('Failed to extract text from image. Please try again.');
    } finally {
      setIsScanningText(false);
    }
  };

  // OPTION 1: Questions and Answer from the image
  const handleSolveQA = async () => {
    if (!imagePreview) return;
    setIsAnsweringQA(true);
    setErrorMsg(null);
    try {
      const resp: ScanImageResponse = await api.scanImage(
        imagePreview,
        'qa',
        selectedLanguage,
        customQuestion.trim() || undefined
      );
      setQaResult(resp.result);
      if (resp.result) {
        logLearningActivity({
          activity_type: 'image_scan',
          title: customQuestion.trim()
            ? `Image Q&A: ${customQuestion.trim()}`
            : 'Image Problem Solver (Option 1)',
          details: resp.result.slice(0, 160) + (resp.result.length > 160 ? '...' : ''),
          solution: resp.result,
          language: selectedLanguage,
        });
      }
    } catch (err: any) {
      console.error('Solve QA failed:', err);
      setErrorMsg('Failed to generate answers from the image.');
    } finally {
      setIsAnsweringQA(false);
    }
  };

  // OPTION 2: Explain the image
  const handleExplainImage = async () => {
    if (!imagePreview) return;
    setIsExplaining(true);
    setErrorMsg(null);
    try {
      const resp: ScanImageResponse = await api.scanImage(
        imagePreview,
        'explain',
        selectedLanguage
      );
      setExplainResult(resp.result);
      if (resp.result) {
        logLearningActivity({
          activity_type: 'image_scan',
          title: 'Image Concept Explanation (Option 2)',
          details: resp.result.slice(0, 160) + (resp.result.length > 160 ? '...' : ''),
          solution: resp.result,
          language: selectedLanguage,
        });
      }
    } catch (err: any) {
      console.error('Explain image failed:', err);
      setErrorMsg('Failed to explain image concept.');
    } finally {
      setIsExplaining(false);
    }
  };

  // OPTION 3: Quiz from Scanned Topic (MCQs)
  const handleGenerateQuiz = async () => {
    if (!imagePreview) return;
    setIsGeneratingQuiz(true);
    setErrorMsg(null);
    try {
      const resp: ScanImageResponse = await api.scanImage(
        imagePreview,
        'quiz',
        selectedLanguage
      );
      let count = 0;
      if (resp.quiz_questions && resp.quiz_questions.length > 0) {
        setQuizQuestions(resp.quiz_questions);
        setQuizRawResult('');
        count = resp.quiz_questions.length;
      } else if (resp.result) {
        try {
          const clean = resp.result.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
          const match = clean.match(/\[\s*\{.*\}\s*\]/s);
          if (match) {
            const parsed = JSON.parse(match[0]);
            setQuizQuestions(parsed);
            count = parsed.length;
            setQuizRawResult('');
          } else {
            setQuizRawResult(resp.result);
          }
        } catch {
          setQuizRawResult(resp.result);
        }
      }
      setUserAnswers({});

      logLearningActivity({
        activity_type: 'quiz',
        title: `Image Topic Quiz (${count || 4} Questions)`,
        details: 'Interactive multiple choice quiz generated from image content',
        language: selectedLanguage,
      });
    } catch (err: any) {
      console.error('Generate quiz failed:', err);
      setErrorMsg('Failed to generate MCQ quiz from image.');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleSelectOption = (qId: number, optionLetter: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: optionLetter,
    }));
  };

  // Audio Text-to-Speech Playback with Play / Pause & Resume
  const handleSpeak = async (rawText: string, target: 'text' | 'qa' | 'explain' | 'quiz') => {
    const text = cleanTextForSpeech(rawText.trim());
    if (!text) return;

    // If currently speaking this target, pause it
    if (isSpeaking && audioTarget === target) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      } else if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.pause();
      }
      setIsSpeaking(false);
      setIsPaused(true);
      return;
    }

    // If currently paused on this target, resume it
    if (isPaused && audioTarget === target) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.play().catch(() => {
          speakWithBrowserFallback(text, selectedLanguage, {
            onStart: () => { setIsSpeaking(true); setIsPaused(false); setAudioTarget(target); },
            onEnd: () => { setIsSpeaking(false); setIsPaused(false); setAudioTarget(null); },
          });
        });
        setIsSpeaking(true);
        setIsPaused(false);
        return;
      } else if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.resume();
        setIsSpeaking(true);
        setIsPaused(false);
        return;
      }
    }

    // Start fresh playback: stop previous and synchronously pre-unlock audio for mobile
    stopAudio();
    audioPlayerRef.current = preUnlockAudio(audioPlayerRef.current);
    setIsSpeaking(true);
    setIsPaused(false);
    setAudioTarget(target);

    try {
      const blob = await api.fetchTTSAudioBlob(text, selectedLanguage);
      const audioUrl = URL.createObjectURL(blob);
      const audio = audioPlayerRef.current || new Audio();
      audioPlayerRef.current = audio;
      audio.pause();
      audio.src = audioUrl;
      audio.currentTime = 0;

      audio.onended = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setAudioTarget(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setAudioTarget(null);
        URL.revokeObjectURL(audioUrl);
        speakWithBrowserFallback(text, selectedLanguage, {
          onStart: () => { setIsSpeaking(true); setIsPaused(false); setAudioTarget(target); },
          onEnd: () => { setIsSpeaking(false); setIsPaused(false); setAudioTarget(null); },
        });
      };

      await audio.play();
    } catch (err) {
      console.warn('TTS playback error, trying browser synthesis fallback:', err);
      speakWithBrowserFallback(text, selectedLanguage, {
        onStart: () => { setIsSpeaking(true); setIsPaused(false); setAudioTarget(target); },
        onEnd: () => { setIsSpeaking(false); setIsPaused(false); setAudioTarget(null); },
        onError: () => { setIsSpeaking(false); setIsPaused(false); setAudioTarget(null); },
      });
    }
  };

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
    setAudioTarget(null);
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  // Translations
  const labels = {
    English: {
      title: '📷 Image Scanner & Vision Solver',
      sub: 'Scan any textbook page, math equation, handwritten problem, or diagram. Convert it to text, solve questions, or get in-depth explanations.',
      dragText: 'Drag & Drop your image here, or click to browse',
      cameraBtn: 'Take Camera Photo',
      stopCameraBtn: 'Close Camera',
      captureBtn: 'Snap Photo',
      scanTextBtn: '🔍 Scan & Convert to Text',
      scanningText: 'Scanning & Converting Image to Text...',
      extractedTitle: '📝 Extracted Image Text (OCR)',
      opt1Title: '1. ❓ Questions & Answers from the Image',
      opt1Desc: 'Identify all academic questions or math problems in the image and generate verified step-by-step solutions.',
      opt1Btn: 'Solve All Questions in Image',
      opt1Solving: 'Solving Questions Step-by-Step...',
      opt2Title: '2. 💡 Explain the Image',
      opt2Desc: 'Get a thorough educational breakdown explaining diagrams, formulas, components, labels, charts, and concepts.',
      opt2Btn: 'Explain This Image Step-by-Step',
      opt2Explaining: 'Generating Step-by-Step Explanation...',
      opt3Title: '3. 🎯 Topic Quiz (MCQ Questions)',
      opt3Desc: 'Create interactive Multiple Choice Questions (MCQs) from this scanned topic to test your mastery.',
      opt3Btn: 'Generate MCQ Quiz from Topic',
      opt3Generating: 'Creating MCQ Quiz from Topic...',
      quizScoreText: 'Your Score:',
      retakeQuizBtn: 'Retake Quiz',
      correctBadge: 'Correct! 🎉',
      incorrectBadge: 'Incorrect',
      askCustomPlace: 'Ask a specific custom question about this image...',
      samples: 'Try Samples:',
    },
    Hindi: {
      title: '📷 इमेज स्कैनर और विजन सॉल्वर (Image Scanner)',
      sub: 'अपनी पाठ्यपुस्तक, गणित के समीकरण, हस्तलिखित नोट्स या आरेख को स्कैन करें। इसे टेक्स्ट में बदलें, प्रश्नों को हल करें या पूरा विवरण समझें।',
      dragText: 'यहाँ छवि खींचकर छोड़ें या ब्राउज़ करने के लिए क्लिक करें',
      cameraBtn: 'कैमरा से फोटो लें',
      stopCameraBtn: 'कैमरा बंद करें',
      captureBtn: 'फोटो खींचे',
      scanTextBtn: '🔍 स्कैन करें और टेक्स्ट में बदलें',
      scanningText: 'इमेज से टेक्स्ट निकाला जा रहा है...',
      extractedTitle: '📝 निकाला गया टेक्स्ट (OCR)',
      opt1Title: '1. ❓ छवि से प्रश्न और उत्तर (Q&A from Image)',
      opt1Desc: 'छवि में मौजूद सभी गणितीय या शैक्षणिक प्रश्नों को पहचानें और चरणबद्ध (Step-by-step) समाधान पाएं।',
      opt1Btn: 'छवि के सभी प्रश्नों को हल करें',
      opt1Solving: 'प्रश्नों का चरणबद्ध समाधान तैयार हो रहा है...',
      opt2Title: '2. 💡 चित्र समझाइए (Explain the Image)',
      opt2Desc: 'आरेख, चार्ट, सूत्र, चित्र और विज्ञान अवधारणाओं का संपूर्ण चरणबद्ध शैक्षणिक विश्लेषण प्राप्त करें।',
      opt2Btn: 'चित्र को चरणबद्ध तरीके से समझाइए',
      opt2Explaining: 'चित्र का विश्लेषण तैयार हो रहा है...',
      opt3Title: '3. 🎯 विषय आधारित क्विज़ (MCQ Questions)',
      opt3Desc: 'अपनी समझ की जाँच करने के लिए इस स्कैन किए गए विषय से इंटरैक्टिव बहुविकल्पीय प्रश्न (MCQ) बनाएं।',
      opt3Btn: 'विषय से MCQ क्विज़ बनाएं',
      opt3Generating: 'MCQ क्विज़ तैयार हो रहा है...',
      quizScoreText: 'आपका स्कोर:',
      retakeQuizBtn: 'फिर से क्विज़ दें',
      correctBadge: 'सही उत्तर! 🎉',
      incorrectBadge: 'गलत उत्तर',
      askCustomPlace: 'इस छवि के बारे में कोई विशेष प्रश्न पूछें...',
      samples: 'नमूने आज़माएँ:',
    },
    Odia: {
      title: '📷 ଚିତ୍ର ସ୍କାନର୍ ଓ ଦୃଶ୍ୟ ସମାଧାନକାରୀ (Image Scanner)',
      sub: 'ପାଠ୍ୟପୁସ୍ତକ ପୃଷ୍ଠା, ଗାଣିତିକ ସମୀକରଣ, ହାତଲେଖା ପ୍ରଶ୍ନ କିମ୍ବା ଚିତ୍ରକୁ ସ୍କାନ୍ କରନ୍ତୁ। ଏହାକୁ ପାଠ୍ୟରେ ପରିଣତ କରନ୍ତୁ, ପ୍ରଶ୍ନର ଉତ୍ତର ପାଆନ୍ତୁ କିମ୍ବା ସମ୍ପୂର୍ଣ୍ଣ ବୁଝନ୍ତୁ।',
      dragText: 'ଏଠାରେ ଫଟୋ ଛାଡନ୍ତୁ କିମ୍ବା ବ୍ରାଉଜ୍ କରିବାକୁ କ୍ଲିକ୍ କରନ୍ତୁ',
      cameraBtn: 'କ୍ୟାମେରାରୁ ଫଟୋ ଉଠାନ୍ତୁ',
      stopCameraBtn: 'କ୍ୟାମେରା ବନ୍ଦ କରନ୍ତୁ',
      captureBtn: 'ଫଟୋ ନିଅନ୍ତୁ',
      scanTextBtn: '🔍 ସ୍କାନ୍ କରନ୍ତୁ ଓ ପାଠ୍ୟରେ ପରିଣତ କରନ୍ତୁ',
      scanningText: 'ଚିତ୍ରରୁ ପାଠ୍ୟ ବାହାର କରାଯାଉଛି...',
      extractedTitle: '📝 ଚିତ୍ରରୁ ସଂଗୃହୀତ ପାଠ୍ୟ (OCR)',
      opt1Title: '୧. ❓ ଚିତ୍ରରୁ ପ୍ରଶ୍ନ ଓ ଉତ୍ତର (Q&A from Image)',
      opt1Desc: 'ଚିତ୍ରରେ ଥିବା ସମସ୍ତ ପ୍ରଶ୍ନ ବା ଗଣିତ ସମସ୍ୟା ଚିହ୍ନଟ କରି ପଦକ୍ଷେପ ଅନୁସାରେ ସମାଧାନ ପାଆନ୍ତୁ।',
      opt1Btn: 'ଚିତ୍ରର ସମସ୍ତ ପ୍ରଶ୍ନ ସମାଧାନ କରନ୍ତୁ',
      opt1Solving: 'ପଦକ୍ଷେପ ଅନୁସାରେ ସମାଧାନ ପ୍ରସ୍ତୁତ ହେଉଛି...',
      opt2Title: '୨. 💡 ଚିତ୍ର ବୁଝାନ୍ତୁ (Explain the Image)',
      opt2Desc: 'ରେଖାଚିତ୍ର, ଚାର୍ଟ, ଗାଣିତିକ ସୂତ୍ର ଏବଂ ବିଜ୍ଞାନ ଧାରଣାର ସମ୍ପୂର୍ଣ୍ଣ ଶିକ୍ଷଣୀୟ ବ୍ୟାଖ୍ୟା ପାଆନ୍ତୁ।',
      opt2Btn: 'ଏହି ଚିତ୍ରଟିକୁ ବିସ୍ତୃତ ଭାବେ ବୁଝାନ୍ତୁ',
      opt2Explaining: 'ଚିତ୍ରର ବିଶ୍ଳେଷଣ ପ୍ରସ୍ତୁତ ହେଉଛି...',
      opt3Title: '୩. 🎯 ବିଷୟଭିତ୍ତିକ କୁଇଜ୍ (MCQ Questions)',
      opt3Desc: 'ନିଜର ଜ୍ଞାନ ପରୀକ୍ଷା କରିବା ପାଇଁ ଏହି ସ୍କାନ୍ କରାଯାଇଥିବା ପ୍ରସଙ୍ଗରୁ ବହୁବିକଳ୍ପ ପ୍ରଶ୍ନ (MCQ) ପ୍ରସ୍ତୁତ କରନ୍ତୁ।',
      opt3Btn: 'ପ୍ରସଙ୍ଗରୁ MCQ କୁଇଜ୍ ପ୍ରସ୍ତୁତ କରନ୍ତୁ',
      opt3Generating: 'MCQ କୁଇଜ୍ ପ୍ରସ୍ତୁତ ହେଉଛି...',
      quizScoreText: 'ଆପଣଙ୍କ ସ୍କୋର୍:',
      retakeQuizBtn: 'ପୁନର୍ବାର କୁଇଜ୍ ଦିଅନ୍ତୁ',
      correctBadge: 'ସଠିକ୍ ଉତ୍ତର! 🎉',
      incorrectBadge: 'ଭୁଲ୍ ଉତ୍ତର',
      askCustomPlace: 'ଏହି ଚିତ୍ର ବିଷୟରେ କୌଣସି ନିର୍ଦ୍ଦିଷ୍ଟ ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ...',
      samples: 'ନମୁନା ପରୀକ୍ଷା କରନ୍ତୁ:',
    },
  }[selectedLanguage];

  return (
    <div className="image-scanner-wrapper">
      {/* Header Banner */}
      <div className="image-scanner-header">
        <div className="image-scanner-header-badge">
          <Camera size={18} className="text-blue-500" />
          <span>Multimodal Vision AI & OCR</span>
        </div>
        <h2 className="image-scanner-title">{labels.title}</h2>
        <p className="image-scanner-desc">{labels.sub}</p>
      </div>

      {errorMsg && (
        <div className="scanner-error-banner">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Scanner Grid */}
      <div className="image-scanner-grid">
        {/* Left Column: Image Upload & Preview */}
        <div className="image-upload-card">
          <div className="image-upload-card-header">
            <h3>📷 Upload or Capture Image</h3>
            {imagePreview && (
              <button
                type="button"
                className="btn-clear-image"
                onClick={clearImage}
                title="Remove image"
              >
                <Trash2 size={15} />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Camera View Mode */}
          {isCameraActive ? (
            <div className="camera-viewfinder-container">
              <video ref={videoRef} autoPlay playsInline className="camera-video-feed" />
              <div className="camera-controls-overlay">
                <button type="button" className="btn-snap-photo" onClick={capturePhoto}>
                  <Camera size={20} />
                  <span>{labels.captureBtn}</span>
                </button>
                <button type="button" className="btn-cancel-camera" onClick={stopCamera}>
                  {labels.stopCameraBtn}
                </button>
              </div>
            </div>
          ) : imagePreview ? (
            /* Image Preview Card */
            <div className="image-preview-container">
              <img src={imagePreview} alt="Scanned Document" className="scanned-image-preview" />
              <div className="image-preview-actions">
                <button
                  type="button"
                  className="btn-scan-convert"
                  disabled={isScanningText}
                  onClick={handleScanText}
                >
                  {isScanningText ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{labels.scanningText}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>{labels.scanTextBtn}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Drag and Drop Zone */
            <div
              className="image-drop-zone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                }}
              />
              <div className="drop-icon-ring">
                <Upload size={32} className="text-blue-600" />
              </div>
              <p className="drop-main-text">{labels.dragText}</p>
              <span className="drop-sub-text">PNG, JPG, JPEG, WEBP or Paste (Ctrl+V)</span>

              <div className="drop-buttons-row" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn-camera-trigger"
                  onClick={startCamera}
                >
                  <Camera size={16} />
                  <span>{labels.cameraBtn}</span>
                </button>
              </div>
            </div>
          )}

          {/* Sample Chips for Testing */}
          <div className="sample-images-chips">
            <span className="sample-label">{labels.samples}</span>
            <button
              type="button"
              className="btn-sample-chip"
              onClick={() => loadSampleImage('math')}
            >
              📐 Algebra Problem
            </button>
            <button
              type="button"
              className="btn-sample-chip"
              onClick={() => loadSampleImage('diagram')}
            >
              🌱 Photosynthesis Diagram
            </button>
            <button
              type="button"
              className="btn-sample-chip"
              onClick={() => loadSampleImage('odia_science')}
            >
              ⚛️ Odia Science Problem
            </button>
          </div>
        </div>

        {/* Right Column: Scanned Text and Two Options */}
        <div className="image-results-column">
          {/* Section: Extracted Text (OCR Result) */}
          <div className="scanner-result-card">
            <div className="scanner-result-card-header">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                <h4>{labels.extractedTitle}</h4>
              </div>
              {extractedText && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-action-icon"
                    onClick={() => handleSpeak(extractedText, 'text')}
                    title={
                      isSpeaking && audioTarget === 'text'
                        ? 'Pause'
                        : isPaused && audioTarget === 'text'
                        ? 'Resume'
                        : 'Listen aloud'
                    }
                  >
                    {isSpeaking && audioTarget === 'text' ? (
                      <Pause size={16} className="text-amber-500" />
                    ) : isPaused && audioTarget === 'text' ? (
                      <Play size={16} className="text-emerald-500" />
                    ) : (
                      <Volume2 size={16} />
                    )}
                  </button>
                  {(isSpeaking || isPaused) && audioTarget === 'text' && (
                    <button
                      type="button"
                      className="btn-action-icon"
                      onClick={stopAudio}
                      title="Stop audio"
                    >
                      <Square size={14} className="text-rose-500" />
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-action-icon"
                    onClick={() => copyToClipboard(extractedText, 'text')}
                    title="Copy Text"
                  >
                    {copiedType === 'text' ? (
                      <Check size={16} className="text-green-500" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>
              )}
            </div>

            <textarea
              className="extracted-text-area"
              rows={4}
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              placeholder="Scanned text and math equations will appear here automatically, or click 'Scan & Convert to Text'."
            />
          </div>

          {/* TWO MAIN OPTIONS: 1. Questions & Answers | 2. Explain Image */}
          <div className="scanner-two-options-container">
            {/* OPTION 1: Questions and Answer from the image */}
            <div className="scanner-option-box opt-qa">
              <div className="scanner-option-header">
                <div className="option-badge opt-qa-badge">
                  <HelpCircle size={16} />
                  <span>Option 1</span>
                </div>
                <h4 className="option-title">{labels.opt1Title}</h4>
                <p className="option-desc">{labels.opt1Desc}</p>
              </div>

              {/* Optional Custom Question Input */}
              <div className="custom-question-row">
                <input
                  type="text"
                  className="custom-question-input"
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder={labels.askCustomPlace}
                />
                <button
                  type="button"
                  className="btn-voice-input-mini"
                  onClick={() => setIsVoiceModalOpen(true)}
                  title="Speak custom question"
                >
                  <Mic size={15} />
                </button>
                <button
                  type="button"
                  className={`btn-keyboard-mini ${showKeyboard ? 'active' : ''}`}
                  onClick={() => setShowKeyboard(!showKeyboard)}
                  title="Toggle Indic Keyboard"
                >
                  <Keyboard size={15} />
                </button>
              </div>

              {showKeyboard && (
                <IndicVirtualKeyboard
                  language={keyboardLang}
                  onLanguageChange={setKeyboardLang}
                  onInsertChar={(ch) => setCustomQuestion((prev) => prev + ch)}
                  onBackspace={() => setCustomQuestion((prev) => (prev ? Array.from(prev).slice(0, -1).join('') : ''))}
                  onClear={() => setCustomQuestion('')}
                  onClose={() => setShowKeyboard(false)}
                />
              )}

              <button
                type="button"
                className="btn-execute-option btn-qa"
                disabled={!imagePreview || isAnsweringQA}
                onClick={handleSolveQA}
              >
                {isAnsweringQA ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{labels.opt1Solving}</span>
                  </>
                ) : (
                  <>
                    <HelpCircle size={16} />
                    <span>{labels.opt1Btn}</span>
                  </>
                )}
              </button>

              {qaResult && (
                <div className="option-result-display">
                  <div className="option-result-top-bar">
                    <span className="font-semibold text-xs text-blue-700">✅ Step-by-Step Solutions:</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="btn-action-icon"
                        onClick={() => handleSpeak(qaResult, 'qa')}
                        title={
                          isSpeaking && audioTarget === 'qa'
                            ? 'Pause'
                            : isPaused && audioTarget === 'qa'
                            ? 'Resume'
                            : 'Listen aloud'
                        }
                      >
                        {isSpeaking && audioTarget === 'qa' ? (
                          <Pause size={15} className="text-amber-500" />
                        ) : isPaused && audioTarget === 'qa' ? (
                          <Play size={15} className="text-emerald-500" />
                        ) : (
                          <Volume2 size={15} />
                        )}
                      </button>
                      {(isSpeaking || isPaused) && audioTarget === 'qa' && (
                        <button
                          type="button"
                          className="btn-action-icon"
                          onClick={stopAudio}
                          title="Stop audio"
                        >
                          <Square size={13} className="text-rose-500" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-action-icon"
                        onClick={() => copyToClipboard(qaResult, 'qa')}
                        title="Copy solution"
                      >
                        {copiedType === 'qa' ? <Check size={15} /> : <Copy size={15} />}
                      </button>
                    </div>
                  </div>
                  <div className="option-result-content">{qaResult}</div>
                </div>
              )}
            </div>

            {/* OPTION 2: Explain the image */}
            <div className="scanner-option-box opt-explain">
              <div className="scanner-option-header">
                <div className="option-badge opt-explain-badge">
                  <Lightbulb size={16} />
                  <span>Option 2</span>
                </div>
                <h4 className="option-title">{labels.opt2Title}</h4>
                <p className="option-desc">{labels.opt2Desc}</p>
              </div>

              <button
                type="button"
                className="btn-execute-option btn-explain"
                disabled={!imagePreview || isExplaining}
                onClick={handleExplainImage}
              >
                {isExplaining ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{labels.opt2Explaining}</span>
                  </>
                ) : (
                  <>
                    <Lightbulb size={16} />
                    <span>{labels.opt2Btn}</span>
                  </>
                )}
              </button>

              {explainResult && (
                <div className="option-result-display">
                  <div className="option-result-top-bar">
                    <span className="font-semibold text-xs text-amber-700">💡 Comprehensive Explanation:</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="btn-action-icon"
                        onClick={() => handleSpeak(explainResult, 'explain')}
                        title={
                          isSpeaking && audioTarget === 'explain'
                            ? 'Pause'
                            : isPaused && audioTarget === 'explain'
                            ? 'Resume'
                            : 'Listen aloud'
                        }
                      >
                        {isSpeaking && audioTarget === 'explain' ? (
                          <Pause size={15} className="text-amber-500" />
                        ) : isPaused && audioTarget === 'explain' ? (
                          <Play size={15} className="text-emerald-500" />
                        ) : (
                          <Volume2 size={15} />
                        )}
                      </button>
                      {(isSpeaking || isPaused) && audioTarget === 'explain' && (
                        <button
                          type="button"
                          className="btn-action-icon"
                          onClick={stopAudio}
                          title="Stop audio"
                        >
                          <Square size={13} className="text-rose-500" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-action-icon"
                        onClick={() => copyToClipboard(explainResult, 'explain')}
                        title="Copy explanation"
                      >
                        {copiedType === 'explain' ? <Check size={15} /> : <Copy size={15} />}
                      </button>
                    </div>
                  </div>
                  <div className="option-result-content">{explainResult}</div>
                </div>
              )}
            </div>

            {/* OPTION 3: Quiz from Scanned Topic (MCQs) */}
            <div className="scanner-option-box opt-quiz">
              <div className="scanner-option-header">
                <div className="option-badge opt-quiz-badge">
                  <CheckSquare size={16} />
                  <span>Option 3</span>
                </div>
                <h4 className="option-title">{labels.opt3Title}</h4>
                <p className="option-desc">{labels.opt3Desc}</p>
              </div>

              <button
                type="button"
                className="btn-execute-option btn-quiz"
                disabled={!imagePreview || isGeneratingQuiz}
                onClick={handleGenerateQuiz}
              >
                {isGeneratingQuiz ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{labels.opt3Generating}</span>
                  </>
                ) : (
                  <>
                    <CheckSquare size={16} />
                    <span>{labels.opt3Btn}</span>
                  </>
                )}
              </button>

              {/* Render Interactive Quiz */}
              {quizQuestions.length > 0 && (
                <div className="quiz-interactive-section">
                  {/* Score Banner */}
                  {Object.keys(userAnswers).length > 0 && (
                    <div className="quiz-score-banner">
                      <div className="flex items-center gap-2">
                        <Award size={18} className="text-amber-500" />
                        <span className="font-bold text-sm">
                          {labels.quizScoreText}{' '}
                          {quizQuestions.filter((q) => userAnswers[q.id] === q.correct_answer).length} / {quizQuestions.length}
                          {' '}({Math.round((quizQuestions.filter((q) => userAnswers[q.id] === q.correct_answer).length / quizQuestions.length) * 100)}%)
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn-retake-quiz"
                        onClick={() => setUserAnswers({})}
                        title="Reset Answers"
                      >
                        <RotateCcw size={14} />
                        <span>{labels.retakeQuizBtn}</span>
                      </button>
                    </div>
                  )}

                  {/* Question Cards */}
                  <div className="quiz-questions-list">
                    {quizQuestions.map((q, idx) => {
                      const selectedOpt = userAnswers[q.id];
                      const isAnswered = selectedOpt !== undefined;
                      const isCorrect = selectedOpt === q.correct_answer;

                      return (
                        <div key={q.id || idx} className="quiz-question-card">
                          <div className="quiz-question-header">
                            <span className="quiz-q-num">Q{idx + 1}</span>
                            <p className="quiz-q-text">{q.question}</p>
                            <button
                              type="button"
                              className="btn-action-icon ml-auto"
                              onClick={() => handleSpeak(q.question, 'quiz')}
                              title={
                                isSpeaking && audioTarget === 'quiz'
                                  ? 'Pause Question'
                                  : isPaused && audioTarget === 'quiz'
                                  ? 'Resume Question'
                                  : 'Listen Question'
                              }
                            >
                              {isSpeaking && audioTarget === 'quiz' ? (
                                <Pause size={15} className="text-amber-500" />
                              ) : isPaused && audioTarget === 'quiz' ? (
                                <Play size={15} className="text-emerald-500" />
                              ) : (
                                <Volume2 size={15} />
                              )}
                            </button>
                            {(isSpeaking || isPaused) && audioTarget === 'quiz' && (
                              <button
                                type="button"
                                className="btn-action-icon"
                                onClick={stopAudio}
                                title="Stop audio"
                              >
                                <Square size={13} className="text-rose-500" />
                              </button>
                            )}
                          </div>

                          <div className="quiz-options-grid">
                            {q.options.map((optStr, optIdx) => {
                              const letter = ['A', 'B', 'C', 'D'][optIdx] || optStr.trim().charAt(0);
                              const isThisSelected = selectedOpt === letter;
                              const isThisCorrect = q.correct_answer === letter;

                              let btnClass = 'quiz-mcq-btn';
                              if (isAnswered) {
                                if (isThisSelected && isCorrect) {
                                  btnClass += ' correct-selected';
                                } else if (isThisSelected && !isCorrect) {
                                  btnClass += ' incorrect-selected';
                                } else if (isThisCorrect) {
                                  btnClass += ' correct-revealed';
                                }
                              }

                              return (
                                <button
                                  key={optIdx}
                                  type="button"
                                  className={btnClass}
                                  onClick={() => handleSelectOption(q.id, letter)}
                                >
                                  <span className="quiz-opt-letter">{letter}</span>
                                  <span className="quiz-opt-text">
                                    {optStr.replace(/^[A-D]\)\s*/i, '')}
                                  </span>
                                  {isAnswered && isThisSelected && isCorrect && (
                                    <CheckCircle2 size={16} className="text-emerald-600 ml-auto flex-shrink-0" />
                                  )}
                                  {isAnswered && isThisSelected && !isCorrect && (
                                    <XCircle size={16} className="text-rose-600 ml-auto flex-shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Explanation revealed when student answers */}
                          {isAnswered && (
                            <div className={`quiz-explanation-box ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                              <div className="flex items-center gap-1.5 font-semibold text-xs mb-1">
                                {isCorrect ? (
                                  <span className="text-emerald-700 flex items-center gap-1">
                                    <CheckCircle2 size={14} /> {labels.correctBadge}
                                  </span>
                                ) : (
                                  <span className="text-rose-700 flex items-center gap-1">
                                    <XCircle size={14} /> {labels.incorrectBadge} (Correct: {q.correct_answer})
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-700 leading-relaxed">{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fallback raw display if no structured questions parsed */}
              {quizRawResult && quizQuestions.length === 0 && (
                <div className="option-result-display">
                  <div className="option-result-top-bar">
                    <span className="font-semibold text-xs text-purple-700">🎯 Scanned Topic Quiz:</span>
                    <button
                      type="button"
                      className="btn-action-icon"
                      onClick={() => copyToClipboard(quizRawResult, 'quiz')}
                      title="Copy quiz"
                    >
                      {copiedType === 'quiz' ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                  </div>
                  <div className="option-result-content">{quizRawResult}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Voice Access Modal for Custom Spoken Question */}
      <VoiceAccessModal
        isOpen={isVoiceModalOpen}
        language={selectedLanguage}
        mode="question"
        onSearchSolution={(spokenText) => {
          setCustomQuestion(spokenText);
          setIsVoiceModalOpen(false);
          // Auto trigger QA
          setTimeout(handleSolveQA, 200);
        }}
        onClose={() => setIsVoiceModalOpen(false)}
      />
    </div>
  );
};
export default ImageScanner;
