import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Headphones,
  Radio,
  Music,
  Share2,
  Check,
  Send,
  Loader2,
} from 'lucide-react';
import { api } from '../api';

export interface DialogueTurn {
  speaker: 'host' | 'guest';
  speakerName: string;
  avatar: string;
  role: string;
  text: string;
  insightNote?: string;
}

export interface PodcastEpisode {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  durationEstimate: string;
  dialogue: {
    English: DialogueTurn[];
    Hindi: DialogueTurn[];
    Odia: DialogueTurn[];
  };
}

const CURATED_EPISODES: PodcastEpisode[] = [
  {
    id: 'ep-black-holes',
    title: 'The Secret Symphony of Black Holes',
    subtitle: 'Gravitational Waves, Event Horizons & How Space Rips',
    category: 'Astrophysics',
    durationEstimate: '3 min dialogue',
    dialogue: {
      English: [
        {
          speaker: 'host',
          speakerName: 'Sam (Curious Student)',
          avatar: '👨‍🎓',
          role: 'Co-Host & Scholar',
          text: 'Dr. Alex, everyone says nothing can escape a black hole—not even light! But if light has no mass, why does gravity pull it in the first place?',
          insightNote: 'A classic question that stumped 19th century physicists!',
        },
        {
          speaker: 'guest',
          speakerName: 'Dr. Alex (Physics Professor)',
          avatar: '👩‍🏫',
          role: 'Astrophysics Fellow',
          text: 'Brilliant question, Sam! Einstein showed us that gravity isn\'t a magical pulling force. Heavy masses like black holes curve the actual fabric of spacetime, like a heavy bowling ball sitting on a rubber trampoline. Light is just travelling in a straight line, but the road itself is curved into an infinite pit!',
          insightNote: 'General Relativity: Spacetime curvature dictates motion.',
        },
        {
          speaker: 'host',
          speakerName: 'Sam (Curious Student)',
          avatar: '👨‍🎓',
          role: 'Co-Host & Scholar',
          text: 'Whoa! So if you fall past the Event Horizon, what actually happens to time for someone watching you from Earth?',
          insightNote: 'Gravitational time dilation effect.',
        },
        {
          speaker: 'guest',
          speakerName: 'Dr. Alex (Physics Professor)',
          avatar: '👩‍🏫',
          role: 'Astrophysics Fellow',
          text: 'To an outside observer, you would appear to slow down more and more as you approach the horizon. Your image would turn redder and redder due to gravitational redshift, and freeze forever right at the boundary. But for you, you would cross through in seconds and head straight for the singularity!',
          insightNote: 'Relative perception of time varies with gravity.',
        },
      ],
      Hindi: [
        {
          speaker: 'host',
          speakerName: 'सैम (जिज्ञासु छात्र)',
          avatar: '👨‍🎓',
          role: 'सह-प्रस्तोता',
          text: 'डॉ. एलेक्स, सभी कहते हैं कि ब्लैक होल से प्रकाश भी नहीं बच सकता! लेकिन प्रकाश का तो कोई द्रव्यमान नहीं होता, फिर गुरुत्वाकर्षण उसे कैसे खींचता है?',
          insightNote: 'आइंस्टीन के सापेक्षता सिद्धांत का मुख्य बिंदु।',
        },
        {
          speaker: 'guest',
          speakerName: 'डॉ. एलेक्स (भौतिकी प्रोफेसर)',
          avatar: '👩‍🏫',
          role: 'खगोल वैज्ञानिक',
          text: 'बहुत सुंदर प्रश्न! आइंस्टीन ने समझाया कि गुरुत्वाकर्षण कोई साधारण खिंचाव नहीं है, बल्कि स्पेस और टाइम की चादर में पैदा हुआ घुमाव है। जैसे भारी गेंद रबर की चादर को मोड़ देती है, वैसे ही प्रकाश उसी मुड़े हुए रास्ते पर चलता है!',
          insightNote: 'स्पेस-टाइम का वक्र (Curvature) ही गुरुत्वाकर्षण है।',
        },
        {
          speaker: 'host',
          speakerName: 'सैम (जिज्ञासु छात्र)',
          avatar: '👨‍🎓',
          role: 'सह-प्रस्तोता',
          text: 'गजब! और जब दो ब्लैक होल आपस में टकराते हैं तो ब्रह्मांड में क्या होता है?',
        },
        {
          speaker: 'guest',
          speakerName: 'डॉ. एलेक्स (भौतिकी प्रोफेसर)',
          avatar: '👩‍🏫',
          role: 'खगोल वैज्ञानिक',
          text: 'जब दो ब्लैक होल टकराते हैं, तो वे स्पेस-टाइम में गुरुत्वीय तरंगें (Gravitational Waves) पैदा करते हैं, ठीक वैसे जैसे शांत तालाब में पत्थर फेंकने पर लहरें उठती हैं! 2015 में LIGO ने पहली बार इन तरंगों को सुना था।',
        },
      ],
      Odia: [
        {
          speaker: 'host',
          speakerName: 'ସାମ (ଜିଜ୍ଞାସୁ ଛାତ୍ର)',
          avatar: '👨‍🎓',
          role: 'ସହ-ଉପସ୍ଥାପକ',
          text: 'ଡକ୍ଟର ଆଲେକ୍ସ, କୁହାଯାଏ କୃଷ୍ଣଗର୍ତ୍ତ (ବ୍ଲାକ ହୋଲ୍) ରୁ ଆଲୋକ ବି ଖସିପାରେ ନାହିଁ! କିନ୍ତୁ ଆଲୋକର ତ କୌଣସି ବସ୍ତୁତ୍ୱ ନାହିଁ, ତେବେ ମାଧ୍ୟାକର୍ଷଣ ତାହାକୁ କିପରି ଟାଣି ରଖେ?',
          insightNote: 'ସାପେକ୍ଷତା ତତ୍ତ୍ୱର ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ପ୍ରଶ୍ନ।',
        },
        {
          speaker: 'guest',
          speakerName: 'ଡକ୍ଟର ଆଲେକ୍ସ (ପଦାର୍ଥ ବିଜ୍ଞାନୀ)',
          avatar: '👩‍🏫',
          role: 'ଜ୍ୟୋତିର୍ବିଜ୍ଞାନୀ',
          text: 'ଚମତ୍କାର ପ୍ରଶ୍ନ! ଆଇନଷ୍ଟାଇନ ଦର୍ଶାଇଥିଲେ ଯେ ମାଧ୍ୟାକର୍ଷଣ କେବଳ ଟାଣିବା ନୁହେଁ, ବରଂ ଦେଶ ଓ ସମୟ (Spacetime) ର ବକ୍ରତା। ଏକ ଭାରୀ ବସ୍ତୁ ଯୋଗୁଁ ରାସ୍ତା ନିଜେ ବଙ୍କି ଯାଏ, ତେଣୁ ଆଲୋକ ସିଧା ଯିବା ସତ୍ତ୍ୱେ କୃଷ୍ଣଗର୍ତ୍ତ ମଧ୍ୟକୁ ଚାଲିଯାଏ!',
          insightNote: 'ସ୍ପେସ୍-ଟାଇମ୍ ବକ୍ରତା ଯୋଗୁଁ ଆଲୋକ ବଙ୍କିଯାଏ।',
        },
        {
          speaker: 'host',
          speakerName: 'ସାମ (ଜିଜ୍ଞାସୁ ଛାତ୍ର)',
          avatar: '👨‍🎓',
          role: 'ସହ-ଉପସ୍ଥାପକ',
          text: 'ଆଚ୍ଛା! ଏହି କୃଷ୍ଣଗର୍ତ୍ତ ପରସ୍ପର ସହ ମିଶିଲେ କ’ଣ ଘଟେ?',
        },
        {
          speaker: 'guest',
          speakerName: 'ଡକ୍ଟର ଆଲେକ୍ସ (ପଦାର୍ଥ ବିଜ୍ଞାନୀ)',
          avatar: '👩‍🏫',
          role: 'ଜ୍ୟୋତିର୍ବିଜ୍ଞାନୀ',
          text: 'ସେମାନେ ମହାକାଶରେ ମାଧ୍ୟାକର୍ଷଣ ତରଙ୍ଗ (Gravitational Waves) ସୃଷ୍ଟି କରନ୍ତି, ଯେପରି ଶାନ୍ତ ପୋଖରୀରେ ପଥର ପକାଇଲେ ଢେଉ ଉଠେ। ଏହା ବ୍ରହ୍ମାଣ୍ଡର ସବୁଠାରୁ ଶକ୍ତିଶାଳୀ ନୃତ୍ୟ!',
        },
      ],
    },
  },
  {
    id: 'ep-chandrayaan',
    title: 'Chandrayaan-3 & The Lunar South Pole',
    subtitle: 'How Vikram Lander Conquered the Dark Craters of the Moon',
    category: 'Space Exploration',
    durationEstimate: '3.5 min dialogue',
    dialogue: {
      English: [
        {
          speaker: 'host',
          speakerName: 'Sam (Curious Student)',
          avatar: '👨‍🎓',
          role: 'Co-Host',
          text: 'Dr. Alex, why was every country rushing to land on the Moon\'s South Pole instead of the smooth equator where Apollo landed?',
        },
        {
          speaker: 'guest',
          speakerName: 'Dr. Alex (Physics Professor)',
          avatar: '👩‍🏫',
          role: 'Space Fellow',
          text: 'Because water is life, Sam! The Moon has no atmosphere to trap heat, so equatorial ice boiled away millions of years ago. But the South Pole has permanent shadow craters that haven\'t seen sunlight in 2 billion years, preserving vast reservoirs of water ice.',
          insightNote: 'Water ice can be broken into Hydrogen fuel and Oxygen for breathing.',
        },
        {
          speaker: 'host',
          speakerName: 'Sam (Curious Student)',
          avatar: '👨‍🎓',
          role: 'Co-Host',
          text: 'And when ISRO\'s Vikram lander made that historic 15-minute touchdown, how did it correct itself in real time without human control from Earth?',
        },
        {
          speaker: 'guest',
          speakerName: 'Dr. Alex (Physics Professor)',
          avatar: '👩‍🏫',
          role: 'Space Fellow',
          text: 'It takes 1.3 seconds for radio signals to travel between Earth and the Moon. So ISRO built Vikram with autonomous hazard detection cameras, laser altimeters, and on-board neural algorithms that scanned the rocky ground and chose a safe flat landing spot on its own!',
        },
      ],
      Hindi: [
        {
          speaker: 'host',
          speakerName: 'सैम (छात्र)',
          avatar: '👨‍🎓',
          role: 'सह-प्रस्तोता',
          text: 'डॉ. एलेक्स, चंद्रयान-3 के लिए चंद्रमा का दक्षिणी ध्रुव ही क्यों चुना गया, जहाँ पहले कोई देश नहीं पहुँच पाया था?',
        },
        {
          speaker: 'guest',
          speakerName: 'डॉ. एलेक्स (वैज्ञानिक)',
          avatar: '👩‍🏫',
          role: 'प्रोफेसर',
          text: 'क्योंकि दक्षिणी ध्रुव के गहरे गड्ढों में अरबों वर्षों से धूप नहीं पहुँची है और वहाँ भारी मात्रा में जल-बर्फ (Water Ice) जमा है! भविष्य के मंगल अभियानों के लिए यह पानी रॉकेट ईंधन बनाने के काम आएगा।',
        },
        {
          speaker: 'host',
          speakerName: 'सैम (छात्र)',
          avatar: '👨‍🎓',
          role: 'सह-प्रस्तोता',
          text: 'और विक्रम लैंडर ने अंतिम 15 मिनट में सुरक्षित लैंडिंग अपने आप कैसे की?',
        },
        {
          speaker: 'guest',
          speakerName: 'डॉ. एलेक्स (वैज्ञानिक)',
          avatar: '👩‍🏫',
          role: 'प्रोफेसर',
          text: 'उसने आर्टिफिशियल इंटेलिजेंस और लेज़र कैमरों की मदद से सतह के पत्थरों और खाइयों को देखा, और बिना किसी मानवीय हस्तक्षेप के स्वयं सबसे सुरक्षित समतल स्थान चुनकर लैंड किया!',
        },
      ],
      Odia: [
        {
          speaker: 'host',
          speakerName: 'ସାମ (ଛାତ୍ର)',
          avatar: '👨‍🎓',
          role: 'ସହ-ଉପସ୍ଥାପକ',
          text: 'ଡକ୍ଟର ଆଲେକ୍ସ, ଚନ୍ଦ୍ରଯାନ-୩ ଚନ୍ଦ୍ରର ଦକ୍ଷିଣ ମେରୁରେ କାହିଁକି ଅବତରଣ କଲା, ଯେଉଁଠି ପୂର୍ବରୁ କୌଣସି ଦେଶ ପହଞ୍ଚି ନଥିଲେ?',
        },
        {
          speaker: 'guest',
          speakerName: 'ଡକ୍ଟର ଆଲେକ୍ସ (ପ୍ରଫେସର)',
          avatar: '👩‍🏫',
          role: 'ବିଜ୍ଞାନୀ',
          text: 'କାରଣ ଦକ୍ଷିଣ ମେରୁର ଗଭୀର ଗର୍ତ୍ତରେ କୋଟି କୋଟି ବର୍ଷ ଧରି ସୂର୍ଯ୍ୟ କିରଣ ପଡ଼ିନାହିଁ ଏବଂ ସେଠାରେ ବରଫ ଜଳ ସଂରକ୍ଷିତ ହୋଇ ରହିଛି! ଏହା ଭବିଷ୍ୟତ ମହାକାଶ ଯାତ୍ରା ପାଇଁ ଇନ୍ଧନ ଓ ଅମ୍ଳଜାନ ଯୋଗାଇବ।',
        },
        {
          speaker: 'host',
          speakerName: 'ସାମ (ଛାତ୍ର)',
          avatar: '👨‍🎓',
          role: 'ସହ-ଉପସ୍ଥାପକ',
          text: 'ଓ ବିକ୍ରମ ଲ୍ୟାଣ୍ଡର କିପରି ନିଜେ ସଠିକ୍ ସ୍ଥାନ ଖୋଜି ଅବତରଣ କଲା?',
        },
        {
          speaker: 'guest',
          speakerName: 'ଡକ୍ଟର ଆଲେକ୍ସ (ପ୍ରଫେସର)',
          avatar: '👩‍🏫',
          role: 'ବିଜ୍ଞାନୀ',
          text: 'ଇସ୍ରୋର ବୈଜ୍ଞାନିକମାନେ ଏଥିରେ ସ୍ୱୟଂଚାଳିତ କୃତ୍ରିମ ବୁଦ୍ଧିମତ୍ତା (AI) ଓ ଲେଜର କ୍ୟାମେରା ଲଗାଇଥିଲେ, ଯାହା ଗଭୀର ଖାଲ ଏଡ଼ାଇ ସମତଳ ଜମିରେ ସୁରକ୍ଷିତ ଭାବେ ଅବତରଣ କଲା!',
        },
      ],
    },
  },
  {
    id: 'ep-calculus',
    title: 'Why Calculus Rules the Universe',
    subtitle: 'From Falling Apples to Space Trajectories & Economics',
    category: 'Mathematics',
    durationEstimate: '3 min dialogue',
    dialogue: {
      English: [
        {
          speaker: 'host',
          speakerName: 'Sam (Curious Student)',
          avatar: '👨‍🎓',
          role: 'Co-Host',
          text: 'Dr. Alex, why does almost every science and engineering student need to learn Calculus? Isn\'t regular algebra enough?',
        },
        {
          speaker: 'guest',
          speakerName: 'Dr. Alex (Physics Professor)',
          avatar: '👩‍🏫',
          role: 'Math & Physics Lead',
          text: 'Algebra tells you what happens when things are still or changing at a constant rate, Sam. But the real world is constantly accelerating! A car speeds up, a viral infection spreads exponentially, planets speed up near the Sun. Calculus is the mathematics of continuous change!',
          insightNote: 'Derivatives = Instantaneous Rate of Change.',
        },
        {
          speaker: 'host',
          speakerName: 'Sam (Curious Student)',
          avatar: '👨‍🎓',
          role: 'Co-Host',
          text: 'So Derivatives zoom in to find instantaneous speed, and Integrals zoom out to add up infinite slices?',
        },
        {
          speaker: 'guest',
          speakerName: 'Dr. Alex (Physics Professor)',
          avatar: '👩‍🏫',
          role: 'Math & Physics Lead',
          text: 'Exactly! When you slice an irregularly shaped object into trillions of microscopic paper-thin slices and sum them up, that is an Integral. Without Calculus, there would be no GPS satellites, no bridge architecture, and no neural networks in AI!',
          insightNote: 'Fundamental Theorem of Calculus bridges derivatives and integrals.',
        },
      ],
      Hindi: [
        {
          speaker: 'host',
          speakerName: 'सैम (छात्र)',
          avatar: '👨‍🎓',
          role: 'सह-प्रस्तोता',
          text: 'डॉ. एलेक्स, कैलकुलस को गणित का सबसे शक्तिशाली औजार क्यों माना जाता है?',
        },
        {
          speaker: 'guest',
          speakerName: 'डॉ. एलेक्स (प्रोफेसर)',
          avatar: '👩‍🏫',
          role: 'गणितज्ञ',
          text: 'क्योंकि हमारी दुनिया स्थिर नहीं है, यह लगातार बदल रही है! कैलकुलस हमें किसी भी क्षण पर परिवर्तन की दर (Rate of Change) और असीमित टुकड़ों का कुल योग (Accumulation) निकालना सिखाता है।',
        },
        {
          speaker: 'host',
          speakerName: 'सैम (छात्र)',
          avatar: '👨‍🎓',
          role: 'सह-प्रस्तोता',
          text: 'तो अवकलन (Derivative) गति मापता है और समाकलन (Integral) कुल क्षेत्रफल?',
        },
        {
          speaker: 'guest',
          speakerName: 'डॉ. एलेक्स (प्रोफेसर)',
          avatar: '👩‍🏫',
          role: 'गणितज्ञ',
          text: 'बिल्कुल सही! रॉकेट के प्रक्षेपवक्र से लेकर एआई के एल्गोरिदम तक, हर जगह कैलकुलस ही ब्रह्मांड की भाषा है।',
        },
      ],
      Odia: [
        {
          speaker: 'host',
          speakerName: 'ସାମ (ଛାତ୍ର)',
          avatar: '👨‍🎓',
          role: 'ସହ-ଉପସ୍ଥାପକ',
          text: 'ଡକ୍ଟର ଆଲେକ୍ସ, କାଲକୁଲସ (Calculus) କୁ ଗଣିତର ସବୁଠାରୁ ଶକ୍ତିଶାଳୀ ଉପକରଣ କାହିଁକି କୁହାଯାଏ?',
        },
        {
          speaker: 'guest',
          speakerName: 'ଡକ୍ଟର ଆଲେକ୍ସ (ପ୍ରଫେସର)',
          avatar: '👩‍🏫',
          role: 'ଗଣିତଜ୍ଞ',
          text: 'କାରଣ ପ୍ରକୃତିର ସବୁକିଛି ନିରନ୍ତର ପରିବର୍ତ୍ତିତ ହେଉଛି! କାଲକୁଲସ ଆମକୁ ପ୍ରତି ମୁହୂର୍ତ୍ତରେ ପରିବର୍ତ୍ତନର ହାର (Derivative) ଏବଂ ଅସଂଖ୍ୟ ଛୋଟ ଅଂଶର ଯୋଗଫଳ (Integration) ବାହାର କରିବା ଶିଖାଏ।',
        },
        {
          speaker: 'host',
          speakerName: 'ସାମ (ଛାତ୍ର)',
          avatar: '👨‍🎓',
          role: 'ସହ-ଉପସ୍ଥାପକ',
          text: 'ଏହା ଆଧୁନିକ ଇଞ୍ଜିନିୟରିଂରେ କିପରି ବ୍ୟବହୃତ ହୁଏ?',
        },
        {
          speaker: 'guest',
          speakerName: 'ଡକ୍ଟର ଆଲେକ୍ସ (ପ୍ରଫେସର)',
          avatar: '👩‍🏫',
          role: 'ଗଣିତଜ୍ଞ',
          text: 'ଉପଗ୍ରହ କକ୍ଷପଥରୁ ଆରମ୍ଭ କରି କୃତ୍ରିମ ବୁଦ୍ଧିମତ୍ତା (AI) ର ନ୍ୟୁରାଲ ନେଟୱାର୍କ ପର୍ଯ୍ୟନ୍ତ ସବୁଠି କାଲକୁଲସ ବିନା କିଛି ସମ୍ଭବ ନୁହେଁ!',
        },
      ],
    },
  },
];

interface StudyCastProps {
  selectedLanguage: 'English' | 'Hindi' | 'Odia';
  onNavigateBack?: () => void;
  onSpeakCustom?: (text: string) => Promise<void> | void;
  isSpeakingAudio?: boolean;
  onStopAudio?: () => void;
}

export const StudyCastPodcastStudio: React.FC<StudyCastProps> = ({
  selectedLanguage,
  onNavigateBack,
  onSpeakCustom: _onSpeakCustom,
  isSpeakingAudio: _isSpeakingAudio,
  onStopAudio: _onStopAudio,
}) => {
  const [activeEpisodeId, setActiveEpisodeId] = useState<string>(CURATED_EPISODES[0].id);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isAmbientLoFiOn, setIsAmbientLoFiOn] = useState<boolean>(false);
  const [copiedTranscript, setCopiedTranscript] = useState<boolean>(false);

  // Custom AI Podcast generator state
  const [customTopicInput, setCustomTopicInput] = useState<string>('');
  const [isGeneratingCustomPodcast, setIsGeneratingCustomPodcast] = useState<boolean>(false);
  const [episodesList, setEpisodesList] = useState<PodcastEpisode[]>(CURATED_EPISODES);

  const activeEpisode = episodesList.find((e) => e.id === activeEpisodeId) || episodesList[0];
  const activeDialogue = activeEpisode.dialogue[selectedLanguage] || activeEpisode.dialogue.English;

  // Ambient sound synthesizer ref
  const ambientAudioCtxRef = useRef<AudioContext | null>(null);
  const ambientOscRef = useRef<OscillatorNode | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);

  // Turn voice playback
  useEffect(() => {
    if (!isPlaying) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    if (currentTurnIndex >= activeDialogue.length) {
      setIsPlaying(false);
      setCurrentTurnIndex(0);
      return;
    }

    const turn = activeDialogue[currentTurnIndex];
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(turn.text);
    utterance.rate = playbackSpeed;

    // Distinguish voices: Guest professor is deeper/slower, Host student is slightly higher pitch
    if (turn.speaker === 'guest') {
      utterance.pitch = 0.95;
    } else {
      utterance.pitch = 1.15;
    }

    // Assign language voice
    const voices = window.speechSynthesis.getVoices();
    if (selectedLanguage === 'Hindi' || selectedLanguage === 'Odia') {
      const indVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('hi') ||
          v.name.toLowerCase().includes('hindi') ||
          v.name.toLowerCase().includes('india')
      );
      if (indVoice) utterance.voice = indVoice;
      utterance.lang = 'hi-IN';
    } else {
      const enVoice = voices.find((v) => v.lang.startsWith('en'));
      if (enVoice) utterance.voice = enVoice;
    }

    utterance.onend = () => {
      // Advance to next turn after small pause
      setTimeout(() => {
        if (currentTurnIndex + 1 < activeDialogue.length) {
          setCurrentTurnIndex((prev) => prev + 1);
        } else {
          setIsPlaying(false);
          setCurrentTurnIndex(0);
        }
      }, 600);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isPlaying, currentTurnIndex, activeDialogue, playbackSpeed, selectedLanguage]);

  // Ambient Lo-Fi Background Synthesizer (Binaural 432Hz study drone)
  const toggleAmbientLoFi = () => {
    if (isAmbientLoFiOn) {
      if (ambientOscRef.current) {
        try {
          ambientOscRef.current.stop();
          ambientOscRef.current.disconnect();
        } catch (_) {}
      }
      setIsAmbientLoFiOn(false);
    } else {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        ambientAudioCtxRef.current = ctx;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(108, ctx.currentTime); // gentle warm low chord
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 1); // very quiet background pad

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        ambientOscRef.current = osc;
        ambientGainRef.current = gain;
        setIsAmbientLoFiOn(true);
      } catch (err) {
        console.warn('Ambient LoFi synthesizer error:', err);
      }
    }
  };

  // Cleanup ambient sound on unmount
  useEffect(() => {
    return () => {
      if (ambientOscRef.current) {
        try {
          ambientOscRef.current.stop();
        } catch (_) {}
      }
      if (ambientAudioCtxRef.current) {
        ambientAudioCtxRef.current.close().catch(() => {});
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNextTurn = () => {
    if (currentTurnIndex + 1 < activeDialogue.length) {
      setCurrentTurnIndex(currentTurnIndex + 1);
    }
  };

  const handlePrevTurn = () => {
    if (currentTurnIndex > 0) {
      setCurrentTurnIndex(currentTurnIndex - 1);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTurnIndex(0);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  // Generate Custom AI Podcast Dialogue
  const handleGenerateCustomPodcast = async () => {
    const topic = customTopicInput.trim();
    if (!topic) return;

    setIsGeneratingCustomPodcast(true);
    setIsPlaying(false);

    try {
      const prompt = `Write a lively, educational 4-turn dialogue podcast episode between Dr. Alex Vance (an inspiring Professor) and Sam (an enthusiastic college student) explaining: "${topic}".
Format as a back-and-forth educational chat explaining the core concept with a real-life analogy. Keep responses engaging and clear.`;

      const text = await api.askQuestion(prompt, selectedLanguage);

      // Create new episode
      const newEp: PodcastEpisode = {
        id: `custom-${Date.now()}`,
        title: topic.length > 40 ? `${topic.slice(0, 40)}...` : topic,
        subtitle: `AI Generated Dialogue Podcast on ${topic}`,
        category: 'Custom Topic',
        durationEstimate: '2.5 min dialogue',
        dialogue: {
          English: [
            {
              speaker: 'host',
              speakerName: 'Sam (Curious Student)',
              avatar: '👨‍🎓',
              role: 'Co-Host',
              text: `Dr. Alex, can you explain ${topic} in simple terms that anyone can understand?`,
            },
            {
              speaker: 'guest',
              speakerName: 'Dr. Alex (Professor)',
              avatar: '👩‍🏫',
              role: 'Domain Expert',
              text: text.slice(0, 300) || `Certainly, Sam! The key insight behind ${topic} is how components work together in balance.`,
            },
            {
              speaker: 'host',
              speakerName: 'Sam (Curious Student)',
              avatar: '👨‍🎓',
              role: 'Co-Host',
              text: 'That makes a lot of sense! So what is the biggest real-world application of this in everyday life?',
            },
            {
              speaker: 'guest',
              speakerName: 'Dr. Alex (Professor)',
              avatar: '👩‍🏫',
              role: 'Domain Expert',
              text: text.slice(300, 650) || `Great question! We see this in modern engineering, biology, and computational technology every single day.`,
            },
          ],
          Hindi: [
            {
              speaker: 'host',
              speakerName: 'सैम (छात्र)',
              avatar: '👨‍🎓',
              role: 'सह-प्रस्तोता',
              text: `डॉ. एलेक्स, क्या आप ${topic} को सरल शब्दों में समझा सकते हैं?`,
            },
            {
              speaker: 'guest',
              speakerName: 'डॉ. एलेक्स (प्रोफेसर)',
              avatar: '👩‍🏫',
              role: 'विशेषज्ञ',
              text: text.slice(0, 300),
            },
          ],
          Odia: [
            {
              speaker: 'host',
              speakerName: 'ସାମ (ଛାତ୍ର)',
              avatar: '👨‍🎓',
              role: 'ସହ-ଉପସ୍ଥାପକ',
              text: `ଡକ୍ଟର ଆଲେକ୍ସ, ଆପଣ ${topic} ବିଷୟରେ ସରଳ ଭାଷାରେ ବୁଝାଇ ପାରିବେ କି?`,
            },
            {
              speaker: 'guest',
              speakerName: 'ଡକ୍ଟର ଆଲେକ୍ସ (ପ୍ରଫେସର)',
              avatar: '👩‍🏫',
              role: 'ବିଶେଷଜ୍ଞ',
              text: text.slice(0, 300),
            },
          ],
        },
      };

      setEpisodesList([newEp, ...episodesList]);
      setActiveEpisodeId(newEp.id);
      setCurrentTurnIndex(0);
      setCustomTopicInput('');
    } catch (err) {
      console.error('Failed to generate podcast:', err);
    } finally {
      setIsGeneratingCustomPodcast(false);
    }
  };

  const handleCopyTranscript = () => {
    const transcriptText = activeDialogue
      .map((t) => `${t.speakerName} (${t.role}):\n${t.text}`)
      .join('\n\n');
    navigator.clipboard.writeText(transcriptText);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  return (
    <div className="studycast-container">
      {/* Top Header */}
      <div className="studycast-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div className="studycast-pulse-badge">
              <Radio size={16} className="pulse-icon" />
              <span>LIVE STUDYCAST</span>
            </div>
            <h2 className="studycast-title">StudyCast Studio</h2>
          </div>
          <p className="studycast-subtitle">
            AI-powered 2-speaker educational dialogue podcast. Listen to engaging conversational breakdowns with Dr. Alex & Sam.
          </p>
        </div>

        {onNavigateBack && (
          <button type="button" className="btn-back-to-home" onClick={onNavigateBack}>
            ← Dashboard
          </button>
        )}
      </div>

      {/* Episode Selection Bar */}
      <div className="studycast-episode-selector-row">
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
          Select Episode:
        </span>
        <div className="studycast-episodes-pills">
          {episodesList.map((ep) => (
            <button
              key={ep.id}
              type="button"
              className={`studycast-ep-pill ${ep.id === activeEpisodeId ? 'active' : ''}`}
              onClick={() => {
                setActiveEpisodeId(ep.id);
                setCurrentTurnIndex(0);
                setIsPlaying(false);
                if (typeof window !== 'undefined' && window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                }
              }}
            >
              <Headphones size={13} />
              <span>{ep.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Studio Viewport */}
      <div className="studycast-main-card">
        {/* Episode Meta Bar */}
        <div className="studycast-meta-bar">
          <div>
            <span className="studycast-cat-badge">{activeEpisode.category}</span>
            <h3 className="studycast-current-title">{activeEpisode.title}</h3>
            <p className="studycast-current-sub">{activeEpisode.subtitle}</p>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Ambient Lo-Fi Toggle */}
            <button
              type="button"
              className={`studycast-lofi-btn ${isAmbientLoFiOn ? 'active' : ''}`}
              onClick={toggleAmbientLoFi}
              title="Toggle calming 432Hz background study drone"
            >
              <Music size={14} />
              <span>{isAmbientLoFiOn ? 'Ambient Pad: ON' : 'Study Pad: OFF'}</span>
            </button>

            {/* Copy Transcript */}
            <button
              type="button"
              className="studycast-tool-btn"
              onClick={handleCopyTranscript}
              title="Copy entire podcast dialogue"
            >
              {copiedTranscript ? <Check size={14} color="#10b981" /> : <Share2 size={14} />}
              <span>{copiedTranscript ? 'Copied' : 'Share Transcript'}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Visual Dialogue Stage */}
        <div className="studycast-dialogue-stage">
          {activeDialogue.map((turn, idx) => {
            const isCurrentlyActive = idx === currentTurnIndex;
            return (
              <div
                key={idx}
                className={`studycast-bubble-wrap ${turn.speaker === 'guest' ? 'speaker-guest' : 'speaker-host'} ${isCurrentlyActive ? 'active-speaking' : ''}`}
                onClick={() => {
                  setCurrentTurnIndex(idx);
                  setIsPlaying(true);
                }}
              >
                <div className="studycast-avatar-box">
                  <span className="studycast-avatar-emoji">{turn.avatar}</span>
                  {isCurrentlyActive && isPlaying && (
                    <div className="studycast-audio-bars">
                      <span className="bar bar1" />
                      <span className="bar bar2" />
                      <span className="bar bar3" />
                    </div>
                  )}
                </div>

                <div className="studycast-speech-box">
                  <div className="studycast-speaker-info">
                    <span className="studycast-speaker-name">{turn.speakerName}</span>
                    <span className="studycast-speaker-role">{turn.role}</span>
                    {isCurrentlyActive && (
                      <span className="studycast-now-playing-tag">NOW SPEAKING</span>
                    )}
                  </div>
                  <p className="studycast-speech-text">{turn.text}</p>
                  {turn.insightNote && (
                    <div className="studycast-insight-note">
                      <Sparkles size={12} color="#f59e0b" />
                      <span>{turn.insightNote}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Podcast Player Controller */}
        <div className="studycast-controller-bar">
          <div className="studycast-ctrl-left">
            <button
              type="button"
              className="studycast-icon-btn"
              onClick={handlePrevTurn}
              disabled={currentTurnIndex === 0}
              title="Previous dialogue turn"
            >
              ← Prev
            </button>

            <button
              type="button"
              className="studycast-main-play-btn"
              onClick={handlePlayPause}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              <span>{isPlaying ? 'Pause' : 'Play Episode'}</span>
            </button>

            <button
              type="button"
              className="studycast-icon-btn"
              onClick={handleNextTurn}
              disabled={currentTurnIndex >= activeDialogue.length - 1}
              title="Next dialogue turn"
            >
              Next →
            </button>

            <button
              type="button"
              className="studycast-icon-btn"
              onClick={handleReset}
              title="Restart from beginning"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Turn Progress & Speed */}
          <div className="studycast-ctrl-right">
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
              Turn {currentTurnIndex + 1} of {activeDialogue.length}
            </span>

            {/* Speed Selector */}
            <div className="studycast-speed-pills">
              {[0.9, 1.0, 1.25, 1.5].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  className={`studycast-speed-btn ${playbackSpeed === spd ? 'active' : ''}`}
                  onClick={() => setPlaybackSpeed(spd)}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Custom Podcast Generator Section */}
      <div className="studycast-generator-box">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.5rem' }}>
          <Sparkles size={18} color="#06b6d4" />
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
            Generate Custom Podcast Episode on Any Topic
          </h4>
        </div>
        <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.85rem' }}>
          Enter any scientific question, chapter, or formula. ATLAS AI will craft an instant 2-speaker debate and explanation!
        </p>

        <div className="studycast-generator-input-row">
          <input
            type="text"
            className="studycast-gen-input"
            placeholder="e.g. How does photosynthesis turn light into sugar? or Explain Schrödinger's cat..."
            value={customTopicInput}
            onChange={(e) => setCustomTopicInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isGeneratingCustomPodcast) {
                handleGenerateCustomPodcast();
              }
            }}
          />
          <button
            type="button"
            className="studycast-gen-submit-btn"
            onClick={handleGenerateCustomPodcast}
            disabled={isGeneratingCustomPodcast || !customTopicInput.trim()}
          >
            {isGeneratingCustomPodcast ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Writing Episode...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Create Episode</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
