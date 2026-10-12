import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Flame,
  Zap,
  Timer,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Award,
  Star,
  Swords,
  Loader2,
  Compass,
} from 'lucide-react';
import type { User as UserType } from '../types';
import { playSuccessChime, playWelcomeSound } from '../utils/soundEffects';
import { getUserItem, setUserItem } from '../utils/userStorage';

export interface QuizQuestion {
  id: string;
  category: 'Math' | 'Science' | 'Geography' | 'Logic' | 'History' | 'Computer';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const ARENA_QUESTIONS_BANK: QuizQuestion[] = [
  // --- MATHEMATICS ---
  {
    id: 'q1',
    category: 'Math',
    question: 'What is the derivative of sin(2x) with respect to x?',
    options: ['cos(2x)', '2 cos(2x)', '-2 cos(2x)', '1/2 cos(2x)'],
    correctIndex: 1,
    explanation: 'By the Chain Rule: d/dx[sin(u)] = cos(u) · u\'. Here u = 2x, so derivative is 2 cos(2x).',
  },
  {
    id: 'q6',
    category: 'Math',
    question: 'If 3x + 15 = 45, what is the value of x?',
    options: ['5', '10', '15', '20'],
    correctIndex: 1,
    explanation: 'Subtract 15 from both sides: 3x = 30. Divide by 3: x = 10.',
  },
  {
    id: 'q9',
    category: 'Math',
    question: 'Which is the only even prime number in mathematics?',
    options: ['0', '1', '2', '4'],
    correctIndex: 2,
    explanation: '2 is the only even prime number; all other even numbers are divisible by 2.',
  },
  {
    id: 'q10',
    category: 'Math',
    question: 'In a right-angled triangle with perpendicular sides 6 and 8, what is the hypotenuse?',
    options: ['9', '10', '12', '14'],
    correctIndex: 1,
    explanation: 'By Pythagorean Theorem: √(6² + 8²) = √(36 + 64) = √100 = 10.',
  },
  {
    id: 'q11',
    category: 'Math',
    question: 'What is the value of 2⁸ (2 raised to the power of 8)?',
    options: ['128', '256', '512', '64'],
    correctIndex: 1,
    explanation: '2⁸ = 256. (2⁴ = 16, and 16 × 16 = 256).',
  },
  {
    id: 'q12',
    category: 'Math',
    question: 'What is the area of a circle with radius 7 cm (using π = 22/7)?',
    options: ['144 cm²', '154 cm²', '164 cm²', '176 cm²'],
    correctIndex: 1,
    explanation: 'Area = πr² = (22/7) × 7 × 7 = 22 × 7 = 154 cm².',
  },
  {
    id: 'q13',
    category: 'Math',
    question: 'If a fair coin is tossed 3 times, what is the probability of getting all heads?',
    options: ['1/2', '1/4', '1/8', '1/16'],
    correctIndex: 2,
    explanation: 'Probability = (1/2) × (1/2) × (1/2) = 1/8.',
  },
  {
    id: 'q14',
    category: 'Math',
    question: 'What is the logarithm base 10 of 10,000 (log₁₀ 10,000)?',
    options: ['3', '4', '5', '10'],
    correctIndex: 1,
    explanation: '10,000 = 10⁴, so log₁₀(10,000) = 4.',
  },
  {
    id: 'q15',
    category: 'Math',
    question: 'What is the sum of the interior angles of a regular hexagon?',
    options: ['540°', '720°', '900°', '360°'],
    correctIndex: 1,
    explanation: 'Sum of interior angles = (n - 2) × 180°. For a hexagon (n=6): (6 - 2) × 180° = 720°.',
  },
  {
    id: 'q16',
    category: 'Math',
    question: 'What is the value of cos(0°)?',
    options: ['0', '0.5', '1', '-1'],
    correctIndex: 2,
    explanation: 'On the unit circle, at angle 0 radians (0°), the x-coordinate is 1, so cos(0°) = 1.',
  },

  // --- SCIENCE ---
  {
    id: 'q2',
    category: 'Science',
    question: 'Which organelle in eukaryotic cells is responsible for cellular respiration and ATP synthesis?',
    options: ['Ribosome', 'Mitochondria', 'Endoplasmic Reticulum', 'Golgi Apparatus'],
    correctIndex: 1,
    explanation: 'Mitochondria are the powerhouses of the cell that generate ATP through oxidative phosphorylation.',
  },
  {
    id: 'q5',
    category: 'Science',
    question: 'What is the approximate speed of light in a vacuum?',
    options: ['30,000 km/s', '300,000 km/s', '3,000,000 km/s', '150,000 km/s'],
    correctIndex: 1,
    explanation: 'The speed of light in vacuum is approximately 299,792 km/s (rounded to 300,000 km/s or 3 × 10⁸ m/s).',
  },
  {
    id: 'q8',
    category: 'Science',
    question: 'What gas do plants primarily absorb from the air during photosynthesis?',
    options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide (CO₂)', 'Argon'],
    correctIndex: 2,
    explanation: 'Plants absorb CO₂ through leaf stomata to fix carbon into sugars during photosynthesis.',
  },
  {
    id: 'q17',
    category: 'Science',
    question: 'What is the atomic number of Carbon?',
    options: ['4', '6', '8', '12'],
    correctIndex: 1,
    explanation: 'Carbon has 6 protons in its nucleus, giving it atomic number 6.',
  },
  {
    id: 'q18',
    category: 'Science',
    question: 'What is Newton\'s First Law of Motion commonly referred to as?',
    options: ['Law of Universal Gravitation', 'Law of Inertia', 'Action-Reaction Law', 'Law of Conservation'],
    correctIndex: 1,
    explanation: 'Newton\'s First Law states an object remains at rest or in uniform motion unless acted upon by an external net force (Law of Inertia).',
  },
  {
    id: 'q19',
    category: 'Science',
    question: 'Which human blood vessels carry oxygenated blood away from the heart to bodily tissues?',
    options: ['Veins', 'Arteries', 'Capillaries', 'Venules'],
    correctIndex: 1,
    explanation: 'Arteries carry oxygenated blood away from the heart (except the pulmonary artery).',
  },
  {
    id: 'q20',
    category: 'Science',
    question: 'What is the pH value of pure distilled neutral water at 25°C?',
    options: ['0', '5', '7', '14'],
    correctIndex: 2,
    explanation: 'Pure water has equal concentrations of H⁺ and OH⁻ ions, yielding a neutral pH of 7.',
  },
  {
    id: 'q21',
    category: 'Science',
    question: 'Which planet in our Solar System is home to the massive atmospheric storm known as the Great Red Spot?',
    options: ['Mars', 'Jupiter', 'Saturn', 'Neptune'],
    correctIndex: 1,
    explanation: 'Jupiter\'s Great Red Spot is a persistent anticyclonic storm larger than Earth.',
  },
  {
    id: 'q22',
    category: 'Science',
    question: 'What fundamental force governs planetary orbits around stars?',
    options: ['Electromagnetism', 'Strong Nuclear Force', 'Gravitational Force', 'Weak Nuclear Force'],
    correctIndex: 2,
    explanation: 'Gravity is the mutual attractive force between celestial masses that keeps planets in stable Keplerian orbits.',
  },
  {
    id: 'q23',
    category: 'Science',
    question: 'What is the chemical formula of common baking soda?',
    options: ['NaCl', 'NaHCO₃', 'CaCO₃', 'NaOH'],
    correctIndex: 1,
    explanation: 'Baking soda is sodium bicarbonate, chemical formula NaHCO₃.',
  },

  // --- GEOGRAPHY & INDIA ---
  {
    id: 'q3',
    category: 'Geography',
    question: 'Which is the world\'s earliest known engineered tidal dockyard discovered in the Indus Valley Civilization?',
    options: ['Mohenjo-daro', 'Kalibangan', 'Lothal', 'Rakhigarhi'],
    correctIndex: 2,
    explanation: 'Lothal in Gujarat featured the world\'s earliest known engineered tidal dockyard for ancient maritime trade.',
  },
  {
    id: 'q7',
    category: 'Geography',
    question: 'From which Indian coastal island does DRDO conduct its strategic missile test launches?',
    options: ['Sriharikota', 'Dr. APJ Abdul Kalam Island (Wheeler Island)', 'Pamban Island', 'Majuli Island'],
    correctIndex: 1,
    explanation: 'Dr. APJ Abdul Kalam Island off the coast of Odisha is India\'s premier missile test launch site.',
  },
  {
    id: 'q25',
    category: 'Geography',
    question: 'Which is the longest river flowing entirely within Indian territory?',
    options: ['Yamuna', 'Ganga', 'Godavari', 'Narmada'],
    correctIndex: 1,
    explanation: 'The Ganga flows over 2,525 km, making it the longest river within India.',
  },
  {
    id: 'q26',
    category: 'Geography',
    question: 'Which high-altitude mountain pass connects the Kashmir Valley with Ladakh?',
    options: ['Rohtang Pass', 'Zoji La Pass', 'Nathu La Pass', 'Shipki La Pass'],
    correctIndex: 1,
    explanation: 'Zoji La Pass connects Srinagar and the Kashmir Valley with Kargil and Leh in Ladakh.',
  },
  {
    id: 'q27',
    category: 'Geography',
    question: 'Which Indian state is historically celebrated as the "Land of Five Rivers"?',
    options: ['Haryana', 'Punjab', 'Rajasthan', 'Gujarat'],
    correctIndex: 1,
    explanation: 'Punjab derives its name from Persian panj (five) and aab (water/rivers): Sutlej, Beas, Ravi, Chenab, and Jhelum.',
  },
  {
    id: 'q28',
    category: 'Geography',
    question: 'What is the deepest known oceanic trench on planet Earth?',
    options: ['Java Trench', 'Puerto Rico Trench', 'Mariana Trench', 'Tonga Trench'],
    correctIndex: 2,
    explanation: 'The Mariana Trench in the western Pacific reaches a depth of nearly 11,000 meters at Challenger Deep.',
  },
  {
    id: 'q29',
    category: 'Geography',
    question: 'Chilika Lake, Asia\'s largest brackish water coastal lagoon, is located in which state?',
    options: ['Andhra Pradesh', 'Tamil Nadu', 'Odisha', 'West Bengal'],
    correctIndex: 2,
    explanation: 'Chilika Lake is situated along the east coast of Odisha and is a major RAMSAR wetland sanctuary for migratory birds.',
  },
  {
    id: 'q30',
    category: 'Geography',
    question: 'Which line of latitude passes roughly through the center of India?',
    options: ['Equator', 'Tropic of Cancer (23.5° N)', 'Tropic of Capricorn (23.5° S)', 'Arctic Circle'],
    correctIndex: 1,
    explanation: 'The Tropic of Cancer passes through 8 Indian states, dividing the country into subtropical and tropical zones.',
  },
  {
    id: 'q31',
    category: 'Geography',
    question: 'What is the highest peak in the Western Ghats mountain range in India?',
    options: ['Doda Betta', 'Anamudi', 'Kalsubai', 'Mullayanagiri'],
    correctIndex: 1,
    explanation: 'Anamudi in Kerala stands at 2,695 meters, making it the highest peak in South India and the Western Ghats.',
  },
  {
    id: 'q32',
    category: 'Geography',
    question: 'Which body of water separates the southern tip of India from Sri Lanka?',
    options: ['Ten Degree Channel', 'Palk Strait', 'Malacca Strait', 'Gulf of Oman'],
    correctIndex: 1,
    explanation: 'The Palk Strait connects the Bay of Bengal with the Gulf of Mannar between Tamil Nadu and Sri Lanka.',
  },

  // --- HISTORY & HERITAGE ---
  {
    id: 'q33',
    category: 'History',
    question: 'Who was the ancient Indian astronomer who authored the mathematical treatise Aryabhatiya in 499 CE?',
    options: ['Varahamihira', 'Aryabhata', 'Brahmagupta', 'Bhaskara II'],
    correctIndex: 1,
    explanation: 'Aryabhata formulated algebraic equations, trigonometry, and stated that the Earth rotates on its own axis.',
  },
  {
    id: 'q34',
    category: 'History',
    question: 'In which year did India launch its historic first indigenous satellite named Aryabhata?',
    options: ['1969', '1975', '1981', '1984'],
    correctIndex: 1,
    explanation: 'India\'s first satellite, Aryabhata, was launched by ISRO on April 19, 1975.',
  },
  {
    id: 'q35',
    category: 'History',
    question: 'The Ashoka Chakra depicted on India\'s national flag features how many spokes?',
    options: ['16', '20', '24', '32'],
    correctIndex: 2,
    explanation: 'The Ashoka Chakra contains 24 spokes representing 24 virtues of Dharma and constant progress.',
  },
  {
    id: 'q36',
    category: 'History',
    question: 'Who authored the classical Indian treatise on statecraft and economic policy known as the Arthashastra?',
    options: ['Banabhatta', 'Kalidasa', 'Chanakya (Kautilya)', 'Patanjali'],
    correctIndex: 2,
    explanation: 'Chanakya, chief royal advisor to Emperor Chandragupta Maurya, authored the comprehensive treatise Arthashastra.',
  },
  {
    id: 'q37',
    category: 'History',
    question: 'Which lunar mission made India the first nation in history to softly land near the Moon\'s south pole?',
    options: ['Chandrayaan-1', 'Chandrayaan-2', 'Chandrayaan-3', 'Mangalyaan'],
    correctIndex: 2,
    explanation: 'Chandrayaan-3 successfully touched down near the lunar south pole on August 23, 2023, now celebrated as National Space Day.',
  },
  {
    id: 'q38',
    category: 'History',
    question: 'The famous rust-resistant ancient Iron Pillar of Delhi was constructed during which dynasty?',
    options: ['Maurya Dynasty', 'Gupta Dynasty', 'Kushan Dynasty', 'Chola Dynasty'],
    correctIndex: 1,
    explanation: 'The Iron Pillar of Delhi was erected during the reign of Chandragupta II of the Gupta Empire in the 4th–5th century CE.',
  },
  {
    id: 'q39',
    category: 'History',
    question: 'Which Nobel laureate Indian physicist discovered the inelastic scattering of light, now known as the Raman Effect?',
    options: ['Homi Bhabha', 'Satyendra Nath Bose', 'Sir C.V. Raman', 'Vikram Sarabhai'],
    correctIndex: 2,
    explanation: 'Sir C.V. Raman discovered the Raman Effect in 1928, for which he received the 1930 Nobel Prize in Physics.',
  },
  {
    id: 'q40',
    category: 'History',
    question: 'Which UNESCO World Heritage monument in Odisha is designed as a colossal 24-wheeled stone chariot for the Sun God Surya?',
    options: ['Lingaraj Temple', 'Konark Sun Temple', 'Jagannath Temple', 'Rajarani Temple'],
    correctIndex: 1,
    explanation: 'The 13th-century Konark Sun Temple was commissioned by King Narasimhadeva I as a chariot with 24 intricately carved stone wheels.',
  },

  // --- LOGIC & COMPUTER SCIENCE ---
  {
    id: 'q4',
    category: 'Logic',
    question: 'What is the sum of angles in any Euclidean triangle?',
    options: ['90 degrees', '180 degrees', '270 degrees', '360 degrees'],
    correctIndex: 1,
    explanation: 'In Euclidean geometry, the interior angles of any triangle always sum to exactly 180 degrees (π radians).',
  },
  {
    id: 'q41',
    category: 'Computer',
    question: 'In binary arithmetic, what is the decimal value of the binary number 1011?',
    options: ['9', '11', '13', '15'],
    correctIndex: 1,
    explanation: '1011 in binary = (1 × 8) + (0 × 4) + (1 × 2) + (1 × 1) = 8 + 0 + 2 + 1 = 11.',
  },
  {
    id: 'q42',
    category: 'Computer',
    question: 'Which fundamental data structure operates strictly on the Last-In, First-Out (LIFO) principle?',
    options: ['Queue', 'Stack', 'Linked List', 'Binary Tree'],
    correctIndex: 1,
    explanation: 'A Stack stores items in a LIFO order: elements are pushed on top and popped off top first.',
  },
  {
    id: 'q43',
    category: 'Computer',
    question: 'What does the abbreviation CPU stand for in computer hardware architecture?',
    options: ['Core Processing Utility', 'Central Processing Unit', 'Central Power Unit', 'Computing Protocol Unit'],
    correctIndex: 1,
    explanation: 'CPU stands for Central Processing Unit, the primary electronic circuitry executing computer program instructions.',
  },
  {
    id: 'q44',
    category: 'Logic',
    question: 'In Boolean logic, evaluate the expression: (TRUE AND FALSE) OR TRUE. What is the result?',
    options: ['FALSE', 'TRUE', 'UNDEFINED', 'NULL'],
    correctIndex: 1,
    explanation: '(TRUE AND FALSE) evaluates to FALSE. Then, FALSE OR TRUE evaluates to TRUE.',
  },
  {
    id: 'q45',
    category: 'Computer',
    question: 'What is the worst-case time complexity of Binary Search on a sorted array of size n?',
    options: ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'],
    correctIndex: 2,
    explanation: 'Binary search halves the search space at each iteration, resulting in O(log n) logarithmic time complexity.',
  },
  {
    id: 'q46',
    category: 'Logic',
    question: 'Statement: "All squares are rectangles. Some rectangles are red." Which conclusion is logically certain?',
    options: ['All squares are red', 'No squares are red', 'All red objects are squares', 'Some rectangles have equal adjacent sides'],
    correctIndex: 3,
    explanation: 'Since all squares are rectangles and squares by definition have equal adjacent sides, some rectangles must have equal adjacent sides.',
  },
  {
    id: 'q47',
    category: 'Computer',
    question: 'In digital computing and memory storage, how many bits make up one single byte?',
    options: ['4 bits', '8 bits', '16 bits', '32 bits'],
    correctIndex: 1,
    explanation: 'One byte is standardly composed of 8 bits (an octet).',
  },
  {
    id: 'q48',
    category: 'Computer',
    question: 'Which application layer network protocol secures web browsing with TLS/SSL encryption?',
    options: ['HTTP', 'FTP', 'HTTPS', 'SMTP'],
    correctIndex: 2,
    explanation: 'HTTPS (Hypertext Transfer Protocol Secure) encrypts web communication over port 443.',
  },
  {
    id: 'q49',
    category: 'Computer',
    question: 'What is the numerical base of the Hexadecimal numbering system?',
    options: ['Base 8', 'Base 10', 'Base 12', 'Base 16'],
    correctIndex: 3,
    explanation: 'Hexadecimal uses Base 16 with symbols 0-9 and A-F representing values 10-15.',
  },
  {
    id: 'q50',
    category: 'Logic',
    question: 'Which logic gate produces TRUE output only when its two input bits are different from each other?',
    options: ['AND gate', 'OR gate', 'XOR (Exclusive OR) gate', 'NAND gate'],
    correctIndex: 2,
    explanation: 'The XOR (Exclusive OR) gate outputs 1 only when inputs differ (0 and 1, or 1 and 0).',
  },
];

interface BattleOfBrainsProps {
  selectedLanguage?: 'English' | 'Hindi' | 'Odia';
  currentUser?: UserType | null;
  onSolveMore?: () => void;
  onNavigateBack?: () => void;
}

export const BattleOfBrainsArena: React.FC<BattleOfBrainsProps> = ({
  selectedLanguage = 'English',
  currentUser,
  onSolveMore: _onSolveMore,
  onNavigateBack,
}) => {
  // Game states: 'lobby' | 'playing' | 'round_over'
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'round_over'>('lobby');
  const [currentRoundQuestions, setCurrentRoundQuestions] = useState<QuizQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);

  // Round progression & question uniqueness tracking
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [usedQuestionIds, setUsedQuestionIds] = useState<Set<string>>(() => {
    try {
      const saved = sessionStorage.getItem('atlas_battle_used_q');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Category filtering & Custom AI generation
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [customTopicInput, setCustomTopicInput] = useState<string>('');
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [roundNotification, setRoundNotification] = useState<string | null>(null);
  const [questionVault, setQuestionVault] = useState<QuizQuestion[]>(ARENA_QUESTIONS_BANK);

  // Scores
  const [userScore, setUserScore] = useState<number>(0);
  const [botScore, setBotScore] = useState<number>(0);
  const [comboStreak, setComboStreak] = useState<number>(0);

  // Timer: 15s per question
  const [timeLeft, setTimeLeft] = useState<number>(15);

  // Persistent XP & Level system (scoped to active user)
  const [userXp, setUserXp] = useState<number>(() => {
    return getUserItem<number>('battle_xp', currentUser, 0);
  });
  const studyStreak = getUserItem<number>('academic_streak', currentUser, 1);

  // Sync XP whenever active user switches
  useEffect(() => {
    setUserXp(getUserItem<number>('battle_xp', currentUser, 0));
  }, [currentUser?.id]);

  const playerLevel = Math.floor(userXp / 250) + 1;
  const rankTitle =
    playerLevel >= 4
      ? 'ATLAS Grandmaster'
      : playerLevel >= 3
      ? 'Master Thinker'
      : playerLevel >= 2
      ? 'Astute Scholar'
      : 'Novice Seeker';

  // Timer loop
  useEffect(() => {
    if (gameState !== 'playing' || isAnswerSubmitted) return;

    if (timeLeft <= 0) {
      handleOptionSelect(-1); // time out
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, timeLeft, isAnswerSubmitted]);

  // Start new round with 100% brand new questions guarantee
  const handleStartDuel = (isNextRound: boolean = false, customQuestions?: QuizQuestion[]) => {
    let selectedSet: QuizQuestion[] = [];

    if (customQuestions && customQuestions.length >= 5) {
      selectedSet = customQuestions.slice(0, 5);
      setRoundNotification(`✨ Loaded 5 AI-Generated Questions for your duel!`);
    } else {
      // 1. Filter by category if not 'All'
      let pool = questionVault;
      if (selectedCategory !== 'All') {
        const catFiltered = questionVault.filter((q) => q.category === selectedCategory);
        if (catFiltered.length >= 5) {
          pool = catFiltered;
        }
      }

      // 2. Filter out already used question IDs
      let unplayed = pool.filter((q) => !usedQuestionIds.has(q.id));

      // 3. If unplayed questions run low (< 5), reset used history and inform the user
      if (unplayed.length < 5) {
        setUsedQuestionIds(new Set());
        try {
          sessionStorage.removeItem('atlas_battle_used_q');
        } catch {}
        unplayed = pool;
        setRoundNotification(`🔄 Vault Cycle Completed! Resetting pool with fresh shuffle.`);
      } else {
        const remainingAfter = unplayed.length - 5;
        setRoundNotification(
          `✨ Round ${isNextRound ? roundNumber + 1 : roundNumber}: 5 Brand New Questions Loaded (${remainingAfter} unused remaining in vault)`
        );
      }

      // 4. Shuffle unplayed questions and slice 5
      const shuffled = [...unplayed].sort(() => 0.5 - Math.random());
      selectedSet = shuffled.slice(0, 5);
    }

    // Record selected IDs into usedQuestionIds
    setUsedQuestionIds((prev) => {
      const updated = new Set(prev);
      selectedSet.forEach((q) => updated.add(q.id));
      try {
        sessionStorage.setItem('atlas_battle_used_q', JSON.stringify(Array.from(updated)));
      } catch {}
      return updated;
    });

    if (isNextRound) {
      setRoundNumber((r) => r + 1);
    }

    setCurrentRoundQuestions(selectedSet);
    setCurrentQIndex(0);
    setUserScore(0);
    setBotScore(0);
    setComboStreak(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setTimeLeft(15);
    setGameState('playing');
  };

  // Generate Custom AI Topic Questions
  const handleGenerateAiRound = async () => {
    const topic = customTopicInput.trim() || (selectedCategory !== 'All' ? selectedCategory : 'General Science & History');
    setIsAiGenerating(true);
    try {
      const key = import.meta.env.VITE_OPENROUTER_API_KEY || '';

      const lang = selectedLanguage || 'English';

      const systemPrompt = `You are an expert quizmaster. Generate 5 multiple-choice questions for an academic speed quiz on topic: "${topic}".
Language requested: ${lang}.
Return strictly a valid JSON array of 5 objects with keys:
"id" (string), "category" (string e.g. Math, Science, Geography, Logic, History, Computer), "question" (string), "options" (array of exactly 4 strings), "correctIndex" (integer 0-3), "explanation" (string explaining why the answer is correct).
Do NOT include markdown formatting or extra text. Only raw JSON array.`;

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'ATLAS 2.0 Battle of Brains',
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Create 5 questions about: ${topic}` },
          ],
          max_tokens: 800,
          temperature: 0.7,
        }),
      });

      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || '';
      const cleaned = raw.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed) && parsed.length >= 3) {
        const formatted: QuizQuestion[] = parsed.slice(0, 5).map((q: any, i: number) => ({
          id: `ai-${Date.now()}-${i}`,
          category: (q.category || 'Science') as any,
          question: q.question,
          options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ['A', 'B', 'C', 'D'],
          correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
          explanation: q.explanation || 'Answer verified by AI tutor.',
        }));

        setQuestionVault((prev) => [...formatted, ...prev]);
        handleStartDuel(true, formatted);
        setCustomTopicInput('');
        return;
      }
    } catch (err) {
      console.warn('[Battle AI Gen] Fallback to vault questions:', err);
    } finally {
      setIsAiGenerating(false);
    }

    // Fallback if AI fails or times out
    handleStartDuel(true);
  };

  const currentQ = currentRoundQuestions[currentQIndex];

  // Option selection
  const handleOptionSelect = (idx: number) => {
    if (isAnswerSubmitted) return;

    setSelectedOption(idx);
    setIsAnswerSubmitted(true);

    const isCorrect = idx === currentQ.correctIndex;

    // Bot decision: 80% chance bot answers correctly
    const botAnswersCorrect = Math.random() < 0.8;

    if (isCorrect) {
      playSuccessChime();
      const points = 100 + timeLeft * 5 + comboStreak * 20;
      setUserScore((s) => s + points);
      setComboStreak((c) => c + 1);

      // Award XP
      const newXp = userXp + 40;
      setUserXp(newXp);
      setUserItem('battle_xp', newXp, currentUser);
    } else {
      setComboStreak(0);
    }

    if (botAnswersCorrect) {
      setBotScore((s) => s + 100 + Math.floor(Math.random() * 40));
    }

    // Auto proceed to next question after 2.2 seconds
    setTimeout(() => {
      if (currentQIndex + 1 < currentRoundQuestions.length) {
        setCurrentQIndex((q) => q + 1);
        setSelectedOption(null);
        setIsAnswerSubmitted(false);
        setTimeLeft(15);
      } else {
        // Round Finished
        setGameState('round_over');
        playWelcomeSound();
      }
    }, 2200);
  };

  const categories = ['All', 'Math', 'Science', 'Geography', 'History', 'Computer', 'Logic'];

  return (
    <div className="battle-arena-container">
      {/* Top Header */}
      <div className="arena-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div className="arena-live-badge">
              <Swords size={16} color="#f43f5e" />
              <span>LIVE QUIZ ARENA</span>
            </div>
            <div className="arena-round-badge">
              <Sparkles size={14} color="#059669" />
              <span>Round {roundNumber}</span>
            </div>
            <h2 className="arena-title">Battle of Brains</h2>
          </div>
          <p className="arena-subtitle">
            Rapid-fire academic duels against Atlas Bot. 5 brand new questions every round across Math, Science, Geography & Heritage!
          </p>
        </div>

        {onNavigateBack && (
          <button type="button" className="btn-back-to-home" onClick={onNavigateBack}>
            ← Dashboard
          </button>
        )}
      </div>

      {/* Gamified Player Stats Bar */}
      <div className="arena-player-stats-bar">
        <div className="arena-stat-chip">
          <Flame size={18} color="#f97316" />
          <div>
            <div className="stat-chip-label">Daily Streak</div>
            <div className="stat-chip-val">{studyStreak} Days 🔥</div>
          </div>
        </div>

        <div className="arena-stat-chip">
          <Star size={18} color="#eab308" />
          <div>
            <div className="stat-chip-label">Player Level</div>
            <div className="stat-chip-val">Level {playerLevel} ({rankTitle})</div>
          </div>
        </div>

        <div className="arena-stat-chip">
          <Zap size={18} color="#a855f7" />
          <div>
            <div className="stat-chip-label">Total Arena XP</div>
            <div className="stat-chip-val">{userXp} XP</div>
          </div>
        </div>

        <div className="arena-stat-chip">
          <Compass size={18} color="#0284c7" />
          <div>
            <div className="stat-chip-label">Vault Explored</div>
            <div className="stat-chip-val">
              {usedQuestionIds.size} / {questionVault.length} Questions
            </div>
          </div>
        </div>
      </div>

      {/* Notification Toast for Fresh Questions */}
      {roundNotification && (
        <div className="arena-fresh-toast">
          <Sparkles size={16} />
          <span>{roundNotification}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 1: LOBBY                                                  */}
      {/* ============================================================== */}
      {gameState === 'lobby' && (
        <div className="arena-lobby-card">
          <div className="arena-lobby-hero">
            <div className="arena-swords-icon-wrap">
              <Swords size={42} color="#f43f5e" />
            </div>
            <h3 className="arena-lobby-heading">Ready for Round {roundNumber}?</h3>
            <p className="arena-lobby-desc">
              Every round guarantees 5 completely new, unplayed questions. Answer in under 15 seconds, earn streak multipliers, and conquer the leaderboard!
            </p>

            {/* Category Filter Pills */}
            <div className="arena-category-pills">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`arena-cat-pill ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat === 'All' ? '⚡ Mixed All Subjects (50 Vault)' : cat}
                </button>
              ))}
            </div>

            {/* Custom AI Topic Bar */}
            <div className="arena-custom-topic-box">
              <Sparkles size={18} color="#7c3aed" />
              <input
                type="text"
                className="arena-custom-topic-input"
                placeholder="Or type custom AI topic (e.g. Astrophysics, Indian History, Calculus)..."
                value={customTopicInput}
                onChange={(e) => setCustomTopicInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerateAiRound();
                }}
              />
              <button
                type="button"
                className="arena-btn-ai-gen"
                onClick={handleGenerateAiRound}
                disabled={isAiGenerating}
              >
                {isAiGenerating ? (
                  <>
                    <Loader2 size={14} className="spin" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    <span>AI Duel</span>
                  </>
                )}
              </button>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <button
                type="button"
                className="arena-start-btn"
                onClick={() => handleStartDuel(false)}
              >
                <Zap size={18} />
                <span>Enter 1v1 Bot Duel (Round {roundNumber})</span>
              </button>
            </div>
          </div>

          {/* Rules & Rewards */}
          <div className="arena-rules-grid">
            <div className="arena-rule-card">
              <Timer size={20} color="#38bdf8" />
              <h4>15s Time Limit</h4>
              <p>Faster answers yield bonus speed multiplier points.</p>
            </div>
            <div className="arena-rule-card">
              <Flame size={20} color="#f97316" />
              <h4>Combo Streaks</h4>
              <p>Consecutive correct answers multiply your score by up to 3x.</p>
            </div>
            <div className="arena-rule-card">
              <Award size={20} color="#10b981" />
              <h4>Zero Repeats</h4>
              <p>All completed rounds cycle brand new questions from the vault.</p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 2: ACTIVE MATCH PLAYING                                   */}
      {/* ============================================================== */}
      {gameState === 'playing' && currentQ && (
        <div className="arena-match-card">
          {/* Duel Scoreboard */}
          <div className="arena-scoreboard">
            {/* Student Fighter */}
            <div className="fighter-card user-fighter">
              <div className="fighter-avatar">👨‍🎓</div>
              <div className="fighter-meta">
                <span className="fighter-name">You</span>
                <span className="fighter-score">{userScore} pts</span>
              </div>
            </div>

            {/* VS Badge & Timer */}
            <div className="arena-vs-center">
              <div className={`arena-timer-pill ${timeLeft <= 5 ? 'urgent' : ''}`}>
                <Timer size={15} />
                <span>{timeLeft}s</span>
              </div>
              <div className="arena-q-progress">
                Round {roundNumber} • Question {currentQIndex + 1} of {currentRoundQuestions.length}
              </div>
            </div>

            {/* Atlas Bot Fighter */}
            <div className="fighter-card bot-fighter">
              <div className="fighter-meta" style={{ textAlign: 'right' }}>
                <span className="fighter-name">Atlas Bot</span>
                <span className="fighter-score">{botScore} pts</span>
              </div>
              <div className="fighter-avatar">🤖</div>
            </div>
          </div>

          {/* Time Remaining Bar */}
          <div className="arena-timer-bar-wrap">
            <div
              className={`arena-timer-bar-fill ${timeLeft <= 5 ? 'urgent' : ''}`}
              style={{ width: `${(timeLeft / 15) * 100}%` }}
            />
          </div>

          {/* Question Card */}
          <div className="arena-question-box">
            <span className="arena-q-category">{currentQ.category}</span>
            <h3 className="arena-q-text">{currentQ.question}</h3>
          </div>

          {/* Options Grid */}
          <div className="arena-options-grid">
            {currentQ.options.map((opt, oIdx) => {
              let optClass = 'arena-opt-btn';

              if (isAnswerSubmitted) {
                if (oIdx === currentQ.correctIndex) {
                  optClass += ' correct';
                } else if (oIdx === selectedOption) {
                  optClass += ' wrong';
                } else {
                  optClass += ' dim';
                }
              }

              return (
                <button
                  key={oIdx}
                  type="button"
                  className={optClass}
                  onClick={() => handleOptionSelect(oIdx)}
                  disabled={isAnswerSubmitted}
                >
                  <span className="opt-letter">
                    {String.fromCharCode(65 + oIdx)}
                  </span>
                  <span className="opt-text">{opt}</span>
                  {isAnswerSubmitted && oIdx === currentQ.correctIndex && (
                    <CheckCircle2 size={18} color="#10b981" />
                  )}
                  {isAnswerSubmitted && oIdx === selectedOption && oIdx !== currentQ.correctIndex && (
                    <XCircle size={18} color="#f43f5e" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation Footer on submission */}
          {isAnswerSubmitted && (
            <div className="arena-explanation-banner">
              <Sparkles size={16} color="#38bdf8" />
              <span>{currentQ.explanation}</span>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 3: ROUND OVER SUMMARY                                     */}
      {/* ============================================================== */}
      {gameState === 'round_over' && (
        <div className="arena-summary-card">
          <div className="arena-trophy-wrap">
            <Trophy size={50} color={userScore >= botScore ? '#eab308' : '#38bdf8'} />
          </div>

          <h3 className="arena-result-title">
            {userScore > botScore
              ? `🎉 VICTORY IN ROUND ${roundNumber}! You Defeated Atlas Bot!`
              : userScore === botScore
              ? `🤝 Tie Match in Round ${roundNumber}! Outstanding Speed!`
              : `💪 Good Effort in Round ${roundNumber}! Atlas Bot Won This Duel!`}
          </h3>

          <div className="arena-summary-scores">
            <div className="score-box">
              <span className="score-label">Your Score</span>
              <span className="score-val" style={{ color: '#10b981' }}>{userScore}</span>
            </div>
            <div className="score-divider">VS</div>
            <div className="score-box">
              <span className="score-label">Atlas Bot Score</span>
              <span className="score-val" style={{ color: '#60a5fa' }}>{botScore}</span>
            </div>
          </div>

          <div className="arena-xp-award-box">
            <Zap size={20} color="#a855f7" />
            <span>+150 XP Awarded to Your Scholar Profile!</span>
          </div>

          {/* Next Round Highlights */}
          <div className="arena-vault-progress-pill">
            <Sparkles size={14} color="#059669" />
            <span>
              {usedQuestionIds.size} unique questions mastered • {Math.max(0, questionVault.length - usedQuestionIds.size)} fresh questions ready for Round {roundNumber + 1}!
            </span>
          </div>

          <div className="arena-summary-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => handleStartDuel(true)}
            >
              <RotateCcw size={16} />
              <span>Play Next Round (5 New Questions)</span>
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setGameState('lobby')}
            >
              Back to Arena Lobby
            </button>
            {_onSolveMore && (
              <button
                type="button"
                className="btn-secondary"
                onClick={_onSolveMore}
                style={{ background: '#e0e7ff', borderColor: '#c7d2fe', color: '#4338ca', fontWeight: 700 }}
              >
                Solve Questions with AI
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
