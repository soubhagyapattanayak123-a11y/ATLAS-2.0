import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  Upload,
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
  FileCheck,
  CheckSquare,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Award,
} from 'lucide-react';
import { api, logLearningActivity, type ScanPdfResponse } from '../api';
import type { QuizQuestion } from '../types';
import { IndicVirtualKeyboard, type IndicLanguage } from './IndicVirtualKeyboard';
import { VoiceAccessModal } from './VoiceAccessModal';
import {
  preUnlockAudio,
  cleanTextForSpeech,
  speakWithBrowserFallback,
} from '../utils/speechUtils';

interface PdfScannerProps {
  selectedLanguage: 'English' | 'Hindi' | 'Odia';
  onSolveMathRedirect?: (problemText: string) => void;
  onAskQuestionRedirect?: (questionText: string) => void;
}

export const PdfScanner: React.FC<PdfScannerProps> = ({
  selectedLanguage,
}) => {
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string>('document.pdf');
  const [pageCount, setPageCount] = useState<number>(1);
  const [selectedPage, setSelectedPage] = useState<number | null>(null); // null = all pages

  // Results State
  const [extractedText, setExtractedText] = useState<string>('');
  const [qaResult, setQaResult] = useState<string>('');
  const [explainResult, setExplainResult] = useState<string>('');
  const [customQuestion, setCustomQuestion] = useState<string>('');

  // Quiz State (MCQs from Scanned PDF Topic)
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

  // Sync keyboard lang
  useEffect(() => {
    if (selectedLanguage === 'Hindi') setKeyboardLang('Hindi');
    else if (selectedLanguage === 'Odia') setKeyboardLang('Odia');
  }, [selectedLanguage]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  const handleFileSelect = (file: File) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Please select a valid PDF file (.pdf).');
      return;
    }

    setErrorMsg(null);
    setPdfFilename(file.name);
    setExtractedText('');
    setQaResult('');
    setExplainResult('');
    setQuizQuestions([]);
    setUserAnswers({});
    setQuizRawResult('');

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPdfData(result);
      // Automatically trigger text scan on upload
      scanPdfContent(result, file.name, 'extract_text');
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read the selected PDF file.');
    };
    reader.readAsDataURL(file);
  };

  // Pre-configured Sample Academic PDFs (built with valid PDF data strings)
  const loadSamplePdf = (type: 'math' | 'biology' | 'odia_science') => {
    setErrorMsg(null);
    setExtractedText('');
    setQaResult('');
    setExplainResult('');
    setQuizQuestions([]);
    setUserAnswers({});
    setQuizRawResult('');

    // Pre-made sample base64 PDFs with realistic academic contents
    if (type === 'math') {
      setPdfFilename('Class10_Quadratic_Equations_Worksheet.pdf');
      const text = `MATHEMATICS WORKSHEET - CHAPTER 4: QUADRATIC EQUATIONS
Standard: Grade 10 | Total Marks: 25

SECTION A: THEORETICAL FOUNDATION
A quadratic equation in variable x is an equation of the form:
ax² + bx + c = 0, where a ≠ 0 and a, b, c are real numbers.
The roots of the equation are given by the Quadratic Formula:
x = (-b ± √(b² - 4ac)) / (2a)
The discriminant D = b² - 4ac determines the nature of the roots:
1. If D > 0: Two distinct real roots.
2. If D = 0: Two equal real roots (-b / 2a).
3. If D < 0: No real roots (complex roots).

SECTION B: EXERCISES & PROBLEMS
Problem 1: Find the roots of the quadratic equation 2x² - 7x + 3 = 0 using factorization and formula method.
Problem 2: Find the value of k for which the quadratic equation kx(x - 2) + 6 = 0 has two equal roots.
Problem 3: The sum of the areas of two squares is 468 m². If the difference of their perimeters is 24 m, find the sides of the two squares.`;
      
      setExtractedText(text);
      setPageCount(2);
      // Dummy data URL for sample
      setPdfData('data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrCg==');
    } else if (type === 'biology') {
      setPdfFilename('Plant_Physiology_Photosynthesis_Notes.pdf');
      const text = `BIOLOGY LECTURE NOTES: PHOTOSYNTHESIS IN HIGHER PLANTS
Author: Department of Life Sciences | NCERT Class 11

1. DEFINITION & GENERAL EQUATION:
Photosynthesis is an anabolic, endergonic oxidation-reduction process by which green plants synthesize organic compounds (glucose) from carbon dioxide and water in the presence of sunlight and chlorophyll pigments:
6CO₂ + 12H₂O + Light Energy -> C₆H₁₂O₆ + 6O₂ + 6H₂O

2. SITE OF PHOTOSYNTHESIS:
Chloroplasts are the primary organelles.
- Grana (Thylakoids): Site of light-dependent reaction (photolysis of water, ATP and NADPH production).
- Stroma: Site of light-independent / dark reaction (Calvin Cycle / CO₂ fixation by RuBisCO enzyme).

3. KEY PHASES:
- Light Reaction: Cyclic and non-cyclic photophosphorylation. Z-scheme electron transport.
- Dark Reaction (C3 / C4 Pathways): Fixation of CO₂ into 3-phosphoglycerate (PGA), reduction, and regeneration of RuBP.

4. PRACTICE QUESTIONS:
Question 1: Explain the Z-scheme of light reaction and the role of Photosystem I and II.
Question 2: Why is photorespiration considered a wasteful process in C3 plants?`;

      setExtractedText(text);
      setPageCount(3);
      setPdfData('data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrCg==');
    } else {
      setPdfFilename('Odia_Class10_Physical_Science_Electricity.pdf');
      const text = `ଦଶମ ଶ୍ରେଣୀ ଭୌତିକ ବିଜ୍ଞାନ - ଅଧ୍ୟାୟ: ବିଦ୍ୟୁତ୍ (Electricity)
ବୋର୍ଡ ଅଫ୍ ସେକେଣ୍ଡାରୀ ଏଜୁକେସନ୍, ଓଡ଼ିଶା

୧. ମୁଖ୍ୟ ସୂତ୍ର ଓ ନିୟମ:
- ବିଦ୍ୟୁତ୍ ସ୍ରୋତ (Electric Current, I): I = Q / t
  ଏକକ: ଆମ୍ପିୟର୍ (Ampere, A)
- ବିଭବାନ୍ତର (Potential Difference, V): V = W / Q
  ଏକକ: ଭୋଲ୍ଟ (Volt, V)
- ଓମ୍‌ଙ୍କ ନିୟମ (Ohm's Law):
  ସ୍ଥିର ତାପମାତ୍ରାରେ ଏକ ପରିବାହୀ ମଧ୍ୟରେ ପ୍ରବାହିତ ବିଦ୍ୟୁତ୍ ସ୍ରୋତ (I), ଏହାର ଦୁଇ ପ୍ରାନ୍ତ ମଧ୍ୟରେ ଥିବା ବିଭବାନ୍ତର (V) ସହିତ ସମାନୁପାତୀ।
  V ∝ I => V = I · R (ଯେଉଁଠାରେ R = ପ୍ରତିରୋଧ / Resistance)
- ପରିବାହୀର ପ୍ରତିରୋଧକତା (Resistivity, ρ): R = ρ · (l / A)

୨. ପରୀକ୍ଷାମୂଳକ ପ୍ରଶ୍ନୋତ୍ତର:
ପ୍ରଶ୍ନ ୧: ୧୨ ଭୋଲ୍ଟ ବିଭବାନ୍ତର ଥିବା ଦୁଇଟି ବିନ୍ଦୁ ମଧ୍ୟରେ ୨ କୁଲମ୍ବ ଚାର୍ଜ୍ ସ୍ଥାନାନ୍ତର କରିବା ପାଇଁ କେତେ କାର୍ଯ୍ୟ କରିବାକୁ ପଡ଼ିବ?
ପ୍ରଶ୍ନ ୨: ଶ୍ରେଣୀ ସଂଯୋଗ ଏବଂ ସମାନ୍ତରାଳ ସଂଯୋଗ ମଧ୍ୟରେ ପାର୍ଥକ୍ୟ ଦର୍ଶାନ୍ତୁ।`;

      setExtractedText(text);
      setPageCount(2);
      setPdfData('data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrCg==');
    }
  };

  // Scan PDF Content
  const scanPdfContent = async (
    dataUri: string,
    filename: string,
    mode: 'extract_text' | 'qa' | 'explain' | 'quiz',
    customQ?: string,
    page?: number | null
  ) => {
    if (mode === 'extract_text') setIsScanningText(true);
    else if (mode === 'qa') setIsAnsweringQA(true);
    else if (mode === 'explain') setIsExplaining(true);
    else if (mode === 'quiz') setIsGeneratingQuiz(true);

    setErrorMsg(null);

    try {
      const res: ScanPdfResponse = await api.scanPdf(
        dataUri,
        filename,
        mode,
        selectedLanguage,
        customQ,
        page || undefined
      );

      if (res.page_count) setPageCount(res.page_count);

      if (mode === 'extract_text') {
        const text = res.extracted_text || res.result || '';
        setExtractedText(text);
        if (text) {
          logLearningActivity({
            activity_type: 'pdf_scan',
            title: `PDF Text Extracted: ${filename || 'Document'}`,
            details: text.slice(0, 160) + (text.length > 160 ? '...' : ''),
            solution: text,
            language: selectedLanguage,
          });
        }
      } else if (mode === 'qa') {
        const qaText = res.result || '';
        setQaResult(qaText);
        if (qaText) {
          logLearningActivity({
            activity_type: 'pdf_scan',
            title: customQ?.trim()
              ? `PDF Q&A: ${customQ.trim()}`
              : `PDF Question Solver: ${filename || 'Document'} (Option 1)`,
            details: qaText.slice(0, 160) + (qaText.length > 160 ? '...' : ''),
            solution: qaText,
            language: selectedLanguage,
          });
        }
      } else if (mode === 'explain') {
        const expText = res.result || '';
        setExplainResult(expText);
        if (expText) {
          logLearningActivity({
            activity_type: 'pdf_scan',
            title: `PDF Document Explanation: ${filename || 'Document'} (Option 2)`,
            details: expText.slice(0, 160) + (expText.length > 160 ? '...' : ''),
            solution: expText,
            language: selectedLanguage,
          });
        }
      } else if (mode === 'quiz') {
        let count = 0;
        if (res.quiz_questions && res.quiz_questions.length > 0) {
          setQuizQuestions(res.quiz_questions);
          count = res.quiz_questions.length;
          setQuizRawResult('');
        } else if (res.result) {
          try {
            const clean = res.result.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
            const match = clean.match(/\[\s*\{.*\}\s*\]/s);
            if (match) {
              const parsed = JSON.parse(match[0]);
              setQuizQuestions(parsed);
              count = parsed.length;
              setQuizRawResult('');
            } else {
              setQuizRawResult(res.result);
            }
          } catch {
            setQuizRawResult(res.result);
          }
        }
        setUserAnswers({});

        logLearningActivity({
          activity_type: 'quiz',
          title: `PDF Topic Quiz: ${filename || 'Document'} (${count || 4} Questions)`,
          details: 'Interactive multiple choice quiz generated from PDF document',
          language: selectedLanguage,
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to analyze PDF document. Please try again.');
    } finally {
      setIsScanningText(false);
      setIsAnsweringQA(false);
      setIsExplaining(false);
      setIsGeneratingQuiz(false);
    }
  };

  const handleScanText = () => {
    if (!pdfData) return;
    scanPdfContent(pdfData, pdfFilename, 'extract_text', undefined, selectedPage);
  };

  const handleSolveQA = () => {
    if (!pdfData) {
      setErrorMsg('Please upload a PDF first.');
      return;
    }
    scanPdfContent(pdfData, pdfFilename, 'qa', customQuestion, selectedPage);
  };

  const handleExplainPdf = () => {
    if (!pdfData) {
      setErrorMsg('Please upload a PDF first.');
      return;
    }
    scanPdfContent(pdfData, pdfFilename, 'explain', undefined, selectedPage);
  };

  const handleGenerateQuiz = () => {
    if (!pdfData && !extractedText) {
      setErrorMsg('Please upload a PDF first.');
      return;
    }
    scanPdfContent(pdfData || '', pdfFilename, 'quiz', undefined, selectedPage);
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
      const url = URL.createObjectURL(blob);
      const audio = audioPlayerRef.current || new Audio();
      audioPlayerRef.current = audio;
      audio.pause();
      audio.src = url;
      audio.currentTime = 0;

      audio.onended = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setAudioTarget(null);
        URL.revokeObjectURL(url);
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setAudioTarget(null);
        URL.revokeObjectURL(url);
        speakWithBrowserFallback(text, selectedLanguage, {
          onStart: () => { setIsSpeaking(true); setIsPaused(false); setAudioTarget(target); },
          onEnd: () => { setIsSpeaking(false); setIsPaused(false); setAudioTarget(null); },
        });
      };

      await audio.play();
    } catch (err) {
      console.warn('TTS playback failed, trying browser synthesis fallback:', err);
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
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const clearAll = () => {
    setPdfData(null);
    setExtractedText('');
    setQaResult('');
    setExplainResult('');
    setQuizQuestions([]);
    setUserAnswers({});
    setQuizRawResult('');
    setCustomQuestion('');
    setErrorMsg(null);
    setSelectedPage(null);
    stopAudio();
  };

  // Translations
  const labels = {
    English: {
      heading: 'Academic PDF Scanner & Document AI',
      subtitle: 'Scan PDF worksheets, textbook chapters & exam papers into editable text. Solve questions or get comprehensive step-by-step explanations.',
      dragText: 'Click to upload or drag & drop PDF document here',
      extractBtn: '📄 Scan & Convert to Text',
      extracting: 'Scanning & Extracting Text...',
      samples: 'Test with Academic Sample PDFs:',
      opt1Title: 'Option 1: Questions and Answer from the PDF',
      opt1Desc: 'Identifies all exercises, problems, and questions in the PDF and generates verified, step-by-step solutions.',
      opt1Btn: 'Solve Questions from PDF',
      opt1Solving: 'Solving Problems Step-by-Step...',
      opt2Title: 'Option 2: Explain the PDF',
      opt2Desc: 'Provides an educational, conceptual breakdown of the PDF topics, definitions, diagrams, and formulas.',
      opt2Btn: 'Explain Document Step-by-Step',
      opt2Explaining: 'Generating Comprehensive Explanation...',
      opt3Title: 'Option 3: Topic Quiz (MCQ Questions)',
      opt3Desc: 'Create interactive Multiple Choice Questions (MCQs) from this scanned PDF topic to test your knowledge.',
      opt3Btn: 'Generate MCQ Quiz from PDF',
      opt3Generating: 'Creating MCQ Quiz from PDF...',
      quizScoreText: 'Your Score:',
      retakeQuizBtn: 'Retake Quiz',
      correctBadge: 'Correct! 🎉',
      incorrectBadge: 'Incorrect',
      askCustomPlace: 'Optional: Ask a specific question about this PDF...',
      extractedTitle: 'Extracted PDF Text & Formulas',
      pageLabel: 'Pages',
      allPages: 'All Pages',
    },
    Hindi: {
      heading: 'शैक्षणिक पीडीएफ स्कैनर और दस्तावेज़ एआई',
      subtitle: 'पीडीएफ वर्कशीट, पाठ्यपुस्तक के अध्यायों और परीक्षा पत्रों को टेक्स्ट में बदलें। प्रश्न हल करें या विस्तृत चरणबद्ध व्याख्या प्राप्त करें।',
      dragText: 'पीडीएफ दस्तावेज़ अपलोड करने के लिए क्लिक करें या यहाँ खींचें',
      extractBtn: '📄 स्कैन करें और टेक्स्ट में बदलें',
      extracting: 'टेक्स्ट स्कैन और निकाला जा रहा है...',
      samples: 'नमूना शैक्षणिक पीडीएफ के साथ परीक्षण करें:',
      opt1Title: 'विकल्प 1: पीडीएफ से प्रश्न और उत्तर',
      opt1Desc: 'पीडीएफ में सभी अभ्यास, समस्याओं और प्रश्नों की पहचान करता है और चरणबद्ध सत्यापित समाधान तैयार करता है।',
      opt1Btn: 'पीडीएफ से प्रश्न हल करें',
      opt1Solving: 'चरणबद्ध तरीके से प्रश्न हल हो रहे हैं...',
      opt2Title: 'विकल्प 2: पीडीएफ को समझें',
      opt2Desc: 'पीडीएफ विषयों, परिभाषाओं, चित्रों और सूत्रों की एक व्यापक शैक्षणिक और वैचारिक व्याख्या प्रदान करता है।',
      opt2Btn: 'दस्तावेज़ को चरणबद्ध तरीके से समझाएं',
      opt2Explaining: 'व्यापक व्याख्या तैयार हो रही है...',
      opt3Title: 'विकल्प 3: विषय आधारित क्विज़ (MCQ Questions)',
      opt3Desc: 'अपनी समझ की जाँच करने के लिए इस स्कैन किए गए पीडीएफ विषय से इंटरैक्टिव बहुविकल्पीय प्रश्न (MCQ) बनाएं।',
      opt3Btn: 'पीडीएफ से MCQ क्विज़ बनाएं',
      opt3Generating: 'MCQ क्विज़ तैयार हो रहा है...',
      quizScoreText: 'आपका स्कोर:',
      retakeQuizBtn: 'फिर से क्विज़ दें',
      correctBadge: 'सही उत्तर! 🎉',
      incorrectBadge: 'गलत उत्तर',
      askCustomPlace: 'वैकल्पिक: इस पीडीएफ के बारे में कोई विशिष्ट प्रश्न पूछें...',
      extractedTitle: 'निकाला गया पीडीएफ टेक्स्ट और सूत्र',
      pageLabel: 'पृष्ठ',
      allPages: 'सभी पृष्ठ',
    },
    Odia: {
      heading: 'ଶିକ୍ଷାଗତ ପିଡିଏଫ୍ ସ୍କାନର୍ ଏବଂ ଦଲିଲ୍ ଏଆଇ',
      subtitle: 'ପିଡିଏଫ୍ କାର୍ଯ୍ୟପତ୍ରିକା, ପାଠ୍ୟପୁସ୍ତକ ଅଧ୍ୟାୟ ଓ ପରୀକ୍ଷା ପ୍ରଶ୍ନପତ୍ରକୁ ପାଠ୍ୟରେ ପରିଣତ କରନ୍ତୁ। ପ୍ରଶ୍ନର ସମାଧାନ ପାଆନ୍ତୁ କିମ୍ବା ବିସ୍ତୃତ ବୁଝାମଣା ହାସଲ କରନ୍ତୁ।',
      dragText: 'ପିଡିଏଫ୍ ଦଲିଲ୍ ଅପଲୋଡ୍ କରିବାକୁ କ୍ଲିକ୍ କରନ୍ତୁ କିମ୍ବା ଏଠାରେ ଛାଡନ୍ତୁ',
      extractBtn: '📄 ସ୍କାନ କରି ପାଠ୍ୟରେ ପରିଣତ କରନ୍ତୁ',
      extracting: 'ପାଠ୍ୟ ବାହାର କରାଯାଉଛି...',
      samples: 'ନମୁନା ଶିକ୍ଷାଗତ ପିଡିଏଫ୍ ସହିତ ପରୀକ୍ଷା କରନ୍ତୁ:',
      opt1Title: 'ବିକଳ୍ପ ୧: ପିଡିଏଫ୍‌ରୁ ପ୍ରଶ୍ନ ଓ ସମାଧାନ',
      opt1Desc: 'ପିଡିଏଫ୍‌ରେ ଥିବା ସମସ୍ତ ଅଭ୍ୟାସ ଓ ପ୍ରଶ୍ନ ଚିହ୍ନଟ କରି ନିର୍ଭୁଲ୍, ପଦକ୍ଷେପ-କ୍ରମେ ସମାଧାନ ପ୍ରଦାନ କରେ।',
      opt1Btn: 'ପିଡିଏଫ୍‌ରୁ ପ୍ରଶ୍ନ ସମାଧାନ କରନ୍ତୁ',
      opt1Solving: 'ପଦକ୍ଷେପ-କ୍ରମେ ସମାଧାନ ପ୍ରସ୍ତୁତ ହେଉଛି...',
      opt2Title: 'ବିକଳ୍ପ ୨: ପିଡିଏଫ୍‌କୁ ବୁଝନ୍ତୁ',
      opt2Desc: 'ପିଡିଏଫ୍‌ର ବିଷୟବସ୍ତୁ, ସଂଜ୍ଞା, ଚିତ୍ର ଓ ଗାଣିତିକ ସୂତ୍ରର ଏକ ବିସ୍ତୃତ ଶିକ୍ଷାଗତ ବ୍ୟାଖ୍ୟା ପ୍ରଦାନ କରେ।',
      opt2Btn: 'ଦଲିଲ୍‌କୁ ପଦକ୍ଷେପ-କ୍ରମେ ବୁଝାନ୍ତୁ',
      opt2Explaining: 'ବିସ୍ତୃତ ବ୍ୟାଖ୍ୟା ପ୍ରସ୍ତୁତ ହେଉଛି...',
      opt3Title: 'ବିକଳ୍ପ ୩: ବିଷୟଭିତ୍ତିକ କୁଇଜ୍ (MCQ Questions)',
      opt3Desc: 'ନିଜର ଜ୍ଞାନ ପରୀକ୍ଷା କରିବା ପାଇଁ ଏହି ସ୍କାନ୍ କରାଯାଇଥିବା ପିଡିଏଫ୍ ବିଷୟବସ୍ତୁରୁ ବହୁବିକଳ୍ପ ପ୍ରଶ୍ନ (MCQ) ପ୍ରସ୍ତୁତ କରନ୍ତୁ।',
      opt3Btn: 'ପିଡିଏଫ୍‌ରୁ MCQ କୁଇଜ୍ ପ୍ରସ୍ତୁତ କରନ୍ତୁ',
      opt3Generating: 'MCQ କୁଇଜ୍ ପ୍ରସ୍ତୁତ ହେଉଛି...',
      quizScoreText: 'ଆପଣଙ୍କ ସ୍କୋର୍:',
      retakeQuizBtn: 'ପୁନର୍ବାର କୁଇଜ୍ ଦିଅନ୍ତୁ',
      correctBadge: 'ସଠିକ୍ ଉତ୍ତର! 🎉',
      incorrectBadge: 'ଭୁଲ୍ ଉତ୍ତର',
      askCustomPlace: 'ଇଚ୍ଛାଧୀନ: ଏହି ପିଡିଏଫ୍ ବିଷୟରେ ନିର୍ଦ୍ଦିଷ୍ଟ ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ...',
      extractedTitle: 'ବାହାର କରାଯାଇଥିବା ପାଠ୍ୟ ଓ ସୂତ୍ର',
      pageLabel: 'ପୃଷ୍ଠା',
      allPages: 'ସମସ୍ତ ପୃଷ୍ଠା',
    },
  }[selectedLanguage];

  return (
    <div className="pdf-scanner-wrapper" id="pdf-scanner-container">
      {/* Header Banner */}
      <div className="image-scanner-header-card">
        <div className="scanner-badge-row">
          <span className="scanner-feature-pill">
            <FileText size={14} />
            <span>PDF SCANNER CORE</span>
          </span>
          <span className="scanner-status-indicator">
            <span className="pulse-dot green" />
            AI Document Engine Ready
          </span>
        </div>
        <h3 className="scanner-title-text">{labels.heading}</h3>
        <p className="scanner-subtitle-text">{labels.subtitle}</p>
      </div>

      {errorMsg && (
        <div className="scanner-error-banner">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
          <button type="button" onClick={() => setErrorMsg(null)} className="btn-close-err">✕</button>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="image-scanner-grid">
        {/* Left Column: PDF Upload / Preview & Metadata */}
        <div className="image-input-column">
          <div className="input-column-header">
            <h4>📄 PDF Document Source</h4>
            {(pdfData || extractedText) && (
              <button
                type="button"
                className="btn-clear-image"
                onClick={clearAll}
                title="Remove current document"
              >
                <Trash2 size={14} />
                <span>Clear</span>
              </button>
            )}
          </div>

          {(pdfData || extractedText) ? (
            /* Document Active Details Card */
            <div className="pdf-doc-active-card">
              <div className="pdf-doc-info-row">
                <div className="pdf-icon-ring">
                  <FileCheck size={28} className="text-blue-600" />
                </div>
                <div className="pdf-meta-texts">
                  <h4 className="pdf-filename-heading">{pdfFilename}</h4>
                  <div className="pdf-badges-list">
                    <span className="pdf-pill-badge">{pageCount} {labels.pageLabel}</span>
                    <span className="pdf-pill-badge">PDF Document</span>
                    <span className="pdf-pill-badge green">Ready to Scan</span>
                  </div>
                </div>
              </div>

              {/* Page Selector Tabs */}
              {pageCount > 1 && (
                <div className="pdf-page-selector-row">
                  <span className="text-xs font-semibold text-slate-500">Scan Range:</span>
                  <button
                    type="button"
                    className={`page-pill-btn ${selectedPage === null ? 'active' : ''}`}
                    onClick={() => setSelectedPage(null)}
                  >
                    {labels.allPages}
                  </button>
                  {Array.from({ length: Math.min(pageCount, 6) }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      className={`page-pill-btn ${selectedPage === pg ? 'active' : ''}`}
                      onClick={() => setSelectedPage(pg)}
                    >
                      P.{pg}
                    </button>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="image-preview-actions" style={{ marginTop: '0.85rem' }}>
                <button
                  type="button"
                  className="btn-scan-convert"
                  disabled={isScanningText}
                  onClick={handleScanText}
                >
                  {isScanningText ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>{labels.extracting}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>{labels.extractBtn}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn-camera-trigger"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload another PDF"
                >
                  <Upload size={14} />
                  <span>Change PDF</span>
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
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                }}
              />
              <div className="drop-icon-ring">
                <FileText size={32} className="text-blue-600" />
              </div>
              <p className="drop-main-text">{labels.dragText}</p>
              <span className="drop-sub-text">Standard or Scanned PDF files (.pdf)</span>

              <div className="drop-buttons-row" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn-camera-trigger"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={16} />
                  <span>Choose PDF File</span>
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
              onClick={() => loadSamplePdf('math')}
            >
              📐 Algebra Worksheet PDF
            </button>
            <button
              type="button"
              className="btn-sample-chip"
              onClick={() => loadSamplePdf('biology')}
            >
              🌿 Photosynthesis Notes PDF
            </button>
            <button
              type="button"
              className="btn-sample-chip"
              onClick={() => loadSamplePdf('odia_science')}
            >
              ⚛️ Odia Physics (ବିଦ୍ୟୁତ୍) PDF
            </button>
          </div>
        </div>

        {/* Right Column: Extracted Text and Two Dedicated Options */}
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
              placeholder="Scanned text, mathematical notations, and exercises from the PDF will appear here automatically, or click 'Scan & Convert to Text'."
            />
          </div>

          {/* TWO MAIN OPTIONS: 1. Questions & Answers | 2. Explain PDF */}
          <div className="scanner-two-options-container">
            {/* OPTION 1: Questions and Answer from the PDF */}
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
                disabled={(!pdfData && !extractedText) || isAnsweringQA}
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

            {/* OPTION 2: Explain the PDF */}
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
                disabled={(!pdfData && !extractedText) || isExplaining}
                onClick={handleExplainPdf}
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

            {/* OPTION 3: Topic Quiz (MCQ Questions) */}
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
                disabled={(!pdfData && !extractedText) || isGeneratingQuiz}
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
                    <span className="font-semibold text-xs text-purple-700">🎯 Scanned PDF Topic Quiz:</span>
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

      {/* Voice Access Modal */}
      <VoiceAccessModal
        isOpen={isVoiceModalOpen}
        language={selectedLanguage}
        mode="question"
        onSearchSolution={(spokenText: string) => {
          setCustomQuestion((prev) => (prev ? `${prev} ${spokenText}` : spokenText));
          setIsVoiceModalOpen(false);
          setTimeout(() => {
            if (pdfData) {
              scanPdfContent(pdfData, pdfFilename, 'qa', spokenText, selectedPage);
            }
          }, 200);
        }}
        onClose={() => setIsVoiceModalOpen(false)}
      />
    </div>
  );
};
