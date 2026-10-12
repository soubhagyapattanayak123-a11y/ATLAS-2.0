export interface HistoricalMonument {
  name: string;
  location: string;
  stateId: string;
  significance: string;
}

export interface HistoricalEra {
  id: string;
  yearRange: string;
  eraName: {
    English: string;
    Hindi: string;
    Odia: string;
  };
  rulerDynasty: string;
  capitalCity: string;
  keyCenterStateIds: string[];
  description: {
    English: string;
    Hindi: string;
    Odia: string;
  };
  monuments: HistoricalMonument[];
  keyAchievements: string[];
  audioNarration: {
    English: string;
    Hindi: string;
    Odia: string;
  };
}

export const HISTORICAL_ERAS: HistoricalEra[] = [
  {
    id: 'indus_vedic',
    yearRange: '2500 BCE - 600 BCE',
    eraName: {
      English: 'Indus Valley & Vedic Civilization',
      Hindi: 'सिंधु घाटी एवं वैदिक सभ्यता',
      Odia: 'ସିନ୍ଧୁ ସଭ୍ୟତା ଓ ବୈଦିକ ଯୁଗ',
    },
    rulerDynasty: 'Bronze Age Urban Guilds & Vedic Rishis',
    capitalCity: 'Harappa, Mohenjo-daro & Lothal',
    keyCenterStateIds: ['gj', 'rj', 'pb', 'hr'],
    description: {
      English: 'One of the world\'s earliest planned urban civilizations with grid architecture, advanced water drainage, Lothal dockyard, and early Sanskrit Vedic hymns.',
      Hindi: 'विश्व की प्राचीनतम सुनियोजित नगरीय सभ्यता, जल निकासी प्रणाली, लोथल गोदी और ऋग्वेद की रचना का गौरवशाली काल।',
      Odia: 'ପୃଥିବୀର ପ୍ରାଚୀନତମ ଯୋଜନାବଦ୍ଧ ସହର, ଜଳ ନିଷ୍କାସନ ବ୍ୟବସ୍ଥା, ଲୋଥାଲ ବନ୍ଦର ଏବଂ ଚତୁର୍ବେଦ ରଚନାର ସୁବର୍ଣ୍ଣ ଯୁଗ।',
    },
    monuments: [
      { name: 'Lothal Tidal Dockyard', location: 'Gujarat', stateId: 'gj', significance: 'World\'s earliest known maritime dry dock' },
      { name: 'Kalibangan Fire Altars', location: 'Rajasthan', stateId: 'rj', significance: 'Ancient plowed agricultural field and ritual altars' },
      { name: 'Rakhigarhi Metropolis', location: 'Haryana', stateId: 'hr', significance: 'Largest mature Indus civilization settlement' },
    ],
    keyAchievements: [
      'Standardized weights & measures with 1/16 ratios',
      'Advanced baked brick sewage & covered drainage',
      'Composition of Rigveda, Samaveda, Yajurveda, Atharvaveda',
      'Bronze metallurgy, bead making & cotton textile exports',
    ],
    audioNarration: {
      English: 'The Indus Valley civilization flourished over 4,500 years ago with advanced grid-planned cities, covered sanitation drains, and international maritime trade at Lothal port.',
      Hindi: 'सिंधु घाटी सभ्यता 4500 वर्ष पूर्व सुनियोजित नगरों, विकसित जल निकासी और लोथल बंदरगाह से अंतरराष्ट्रीय व्यापार के लिए प्रसिद्ध थी।',
      Odia: 'ସିନ୍ଧୁ ଉପତ୍ୟକା ସଭ୍ୟତା ୪୫୦୦ ବର୍ଷ ପୂର୍ବେ ଉନ୍ନତ ନଗର ପରିକଳ୍ପନା, ସ୍ୱଚ୍ଛ ଜଳ ନିଷ୍କାସନ ଓ ଲୋଥାଲ ବନ୍ଦରର ବାଣିଜ୍ୟ ପାଇଁ ପ୍ରସିଦ୍ଧ ଥିଲା।',
    },
  },
  {
    id: 'maurya_empire',
    yearRange: '322 BCE - 185 BCE',
    eraName: {
      English: 'Mauryan Empire & Emperor Ashoka',
      Hindi: 'मौर्य साम्राज्य एवं सम्राट अशोक',
      Odia: 'ମୌର୍ଯ୍ୟ ସାମ୍ରାଜ୍ୟ ଓ ସମ୍ରାଟ ଅଶୋକ',
    },
    rulerDynasty: 'Chandragupta Maurya, Chanakya & Ashoka the Great',
    capitalCity: 'Pataliputra (Modern Patna, Bihar)',
    keyCenterStateIds: ['br', 'up', 'mp', 'or', 'ka'],
    description: {
      English: 'Pan-Indian empire unified under Chandragupta and philosopher Chanakya (Arthashastra). After the Kalinga War in Odisha, Ashoka embraced Dhamma, non-violence, and inscribed rock edicts across the subcontinent.',
      Hindi: 'चाणक्य और चंद्रगुप्त द्वारा स्थापित अखंड भारत साम्राज्य। कलिंग युद्ध के उपरांत सम्राट अशोक ने अहिंसा और बौद्ध धर्म का संदेश विश्व में फैलाया।',
      Odia: 'ଚାଣକ୍ୟ ଓ ଚନ୍ଦ୍ରଗୁପ୍ତଙ୍କ ଦ୍ୱାରା ପ୍ରତିଷ୍ଠିତ ଅଖଣ୍ଡ ସାମ୍ରାଜ୍ୟ। କଳିଙ୍ଗ ଯୁଦ୍ଧ ପରେ ସମ୍ରାଟ ଅଶୋକ ଅହିଂସା ଧର୍ମ ଗ୍ରହଣ କରି ଶିଳାଲିପି ସ୍ଥାପନ କଲେ।',
    },
    monuments: [
      { name: 'Ashoka Lion Capital', location: 'Sarnath, Uttar Pradesh', stateId: 'up', significance: 'National Emblem of Modern India with Dharma Chakra' },
      { name: 'Dhauli Peace Pagoda & Rock Edicts', location: 'Odisha', stateId: 'or', significance: 'Historic site of Kalinga War and Ashoka\'s conversion to peace' },
      { name: 'Great Stupa at Sanchi', location: 'Madhya Pradesh', stateId: 'mp', significance: 'UNESCO World Heritage Buddhist monument' },
    ],
    keyAchievements: [
      'Chanakya\'s Arthashastra on statecraft and economic governance',
      'Construction of Uttarapatha (precursor to Grand Trunk Road)',
      'Rock and pillar edicts promoting moral governance and animal welfare',
      'Diplomatic and cultural missions to Greece, Sri Lanka, and Southeast Asia',
    ],
    audioNarration: {
      English: 'The Mauryan Empire united the Indian subcontinent. After the war at Kalinga in modern Odisha, Emperor Ashoka renounced violence and spread the message of peace and Dhamma across Asia.',
      Hindi: 'मौर्य साम्राज्य ने भारत को एक सूत्र में पिरोया। कलिंग युद्ध के बाद सम्राट अशोक ने अहिंसा अपनाई और सारनाथ में सिंह स्तंभ स्थापित किया।',
      Odia: 'ମୌର୍ଯ୍ୟ ସାମ୍ରାଜ୍ୟ ଭାରତକୁ ଏକତା ସୂତ୍ରରେ ବାନ୍ଧିଥିଲା। କଳିଙ୍ଗ ଯୁଦ୍ଧ ପରେ ସମ୍ରାଟ ଅଶୋକ ଅହିଂସା ଓ ଧଉଳି ଶାନ୍ତି ବାର୍ତ୍ତା ପ୍ରସାର କଲେ।',
    },
  },
  {
    id: 'gupta_golden_age',
    yearRange: '320 CE - 550 CE',
    eraName: {
      English: 'Gupta Empire — Classical Golden Age',
      Hindi: 'गुप्त साम्राज्य — भारत का स्वर्णिम युग',
      Odia: 'ଗୁପ୍ତ ସାମ୍ରାଜ୍ୟ — ଭାରତର ସୁବର୍ଣ୍ଣ ଯୁଗ',
    },
    rulerDynasty: 'Samudragupta, Chandragupta II (Vikramaditya)',
    capitalCity: 'Pataliputra & Ujjain',
    keyCenterStateIds: ['br', 'mp', 'up', 'mh'],
    description: {
      English: 'The Golden Age of Indian science, mathematics, literature, and astronomy. Aryabhata invented the concept of Zero and planetary revolutions; Kalidasa authored immortal Sanskrit plays; Nalanda University flourished.',
      Hindi: 'भारतीय विज्ञान, गणित और कला का चरमोत्कर्ष। आर्यभट्ट ने शून्य और खगोल विज्ञान दिया, कालिदास ने मेघदूत रचा, और नालंदा विश्वविद्यालय विश्व-प्रसिद्ध हुआ।',
      Odia: 'ଭାରତୀୟ ବିଜ୍ଞାନ, ଗଣିତ ଓ ସାହିତ୍ୟର ସର୍ବୋତ୍ତମ ଯୁଗ। ଆର୍ଯ୍ୟଭଟ୍ଟ ଶୂନ ଓ ଜ୍ୟୋତିର୍ବିଜ୍ଞାନ ଆବିଷ୍କାର କଲେ, କାଳିଦାସ ମେଘଦୂତ ରଚନା କଲେ।',
    },
    monuments: [
      { name: 'Nalanda Mahavihara University', location: 'Bihar', stateId: 'br', significance: 'Ancient world\'s premier residential university with 10,000 scholars' },
      { name: 'Iron Pillar of Delhi', location: 'Delhi', stateId: 'dl', significance: '1600-year-old rust-resistant metallurgical marvel' },
      { name: 'Ajanta Cave Paintings', location: 'Maharashtra', stateId: 'mh', significance: 'Masterpieces of classical Buddhist mural art' },
    ],
    keyAchievements: [
      'Invention of the Decimal Place-Value System and Zero (Aryabhata)',
      'Accurate calculation of Earth\'s circumference and solar year (365.35 days)',
      'Sushruta & Charaka advancements in plastic surgery and Ayurveda',
      'Classical Sanskrit literature of Kalidasa, Varahamihira, and Vishnu Sharma',
    ],
    audioNarration: {
      English: 'During the Gupta Golden Age, Indian scholars invented zero, calculated the earth\'s rotation, authored classical plays, and taught thousands of international students at Nalanda University.',
      Hindi: 'गुप्त काल में आर्यभट्ट ने शून्य और पृथ्वी की गति की खोज की, तथा नालंदा विश्वविद्यालय ज्ञान का वैश्विक केंद्र बना।',
      Odia: 'ଗୁପ୍ତ ସୁବର୍ଣ୍ଣ ଯୁଗରେ ଆର୍ଯ୍ୟଭଟ୍ଟ ଶୂନ ଓ ପୃଥିବୀର ପରିକ୍ରମଣ ଆବିଷ୍କାର କଲେ ଏବଂ ନାଳନ୍ଦା ବିଶ୍ୱବିଦ୍ୟାଳୟ ବିଶ୍ୱର ଜ୍ଞାନକେନ୍ଦ୍ର ଥିଲା।',
    },
  },
  {
    id: 'medieval_temples',
    yearRange: '900 CE - 1500 CE',
    eraName: {
      English: 'Medieval Dynasties — Cholas, Eastern Gangas & Vijayanagara',
      Hindi: 'मध्यकालीन साम्राज्य — चोल, पूर्वी गंग एवं विजयनगर',
      Odia: 'ମଧ୍ୟଯୁଗୀୟ ଗୌରବ — ଚୋଳ, ପୂର୍ବ ଗଙ୍ଗ ଓ ବିଜୟନଗର',
    },
    rulerDynasty: 'Rajaraja Chola, Narasimhadeva I, Krishnadevaraya',
    capitalCity: 'Thanjavur, Cuttack/Puri & Hampi',
    keyCenterStateIds: ['tn', 'or', 'ka', 'ap'],
    description: {
      English: 'Monumental stone architecture and oceanic trade. Cholas commanded the Bay of Bengal with great navy; King Narasimhadeva built the Sun Temple of Konark in Odisha; Krishnadevaraya elevated Hampi into the world\'s second largest city.',
      Hindi: 'भव्य पाषाण वास्तुकला और नौसैनिक शक्ति। चोलों की समुद्री सेना, ओडिशा में कोणार्क सूर्य मंदिर का निर्माण, और विजयनगर हम्पी का वैभव।',
      Odia: 'ବିଶାଳ ପ୍ରସ୍ତର ସ୍ଥାପତ୍ୟ ଓ ନୌବାଣିଜ୍ୟ ଯୁଗ। ରାଜା ଲାଙ୍ଗୁଳା ନରସିଂହଦେବଙ୍କ ଦ୍ୱାରା କୋଣାର୍କ ସୂର୍ଯ୍ୟ ମନ୍ଦିର ନିର୍ମାଣ ଓ ହମ୍ପି ବିଜୟନଗର ସାମ୍ରାଜ୍ୟ।',
    },
    monuments: [
      { name: 'Konark Sun Temple (Black Pagoda)', location: 'Odisha', stateId: 'or', significance: '24 stone wheels celestial chariot temple designed as astronomical clock' },
      { name: 'Brihadeeswara Temple', location: 'Tamil Nadu', stateId: 'tn', significance: '1000-year-old Granite Vimana built without binding mortar' },
      { name: 'Hampi Virupaksha & Stone Chariot', location: 'Karnataka', stateId: 'ka', significance: 'Splendid capital of Vijayanagara Empire on Tungabhadra river' },
    ],
    keyAchievements: [
      'Maritime expeditions across Malacca Strait to Indonesia and Sri Lanka',
      'Advanced lost-wax Bronze casting (Nataraja idols)',
      'Architectural acoustics and solar alignment engineering at Konark',
      'Pioneering water harvesting tanks (Kalyanis & Stepwells)',
    ],
    audioNarration: {
      English: 'From the naval expeditions of the Cholas to the astronomical chariot of Konark Sun Temple in Odisha and the gold markets of Hampi, this era showcased India\'s pinnacle of stone engineering.',
      Hindi: 'चोल साम्राज्य की समुद्री शक्ति से लेकर ओडिशा के कोणार्क सूर्य मंदिर और हम्पी के वैभव तक, इस काल ने अद्वितीय स्थापत्य कला प्रदर्शित की।',
      Odia: 'ଚୋଳ ନୌସେନାଠାରୁ ଆରମ୍ଭ କରି ଓଡ଼ିଶାର କୋଣାର୍କ ସୂର୍ଯ୍ୟ ମନ୍ଦିର ଓ ହମ୍ପିର ସୁନା ବଜାର ପର୍ଯ୍ୟନ୍ତ ଏହି ଯୁଗ ଭାରତୀୟ ସ୍ଥାପତ୍ୟର ଚରମ ନିଦର୍ଶନ ଥିଲା।',
    },
  },
  {
    id: 'mughal_maratha',
    yearRange: '1526 CE - 1818 CE',
    eraName: {
      English: 'Mughal & Maratha Empires',
      Hindi: 'मुगल एवं मराठा साम्राज्य',
      Odia: 'ମୋଗଲ ଓ ମରାଠା ସାମ୍ରାଜ୍ୟ',
    },
    rulerDynasty: 'Akbar the Great, Chhatrapati Shivaji Maharaj, Peshwas',
    capitalCity: 'Agra/Delhi & Raigad/Pune',
    keyCenterStateIds: ['dl', 'up', 'mh', 'mp', 'rj'],
    description: {
      English: 'Indo-Islamic architectural renaissance (Taj Mahal, Red Fort) followed by Chhatrapati Shivaji Maharaj\'s Hindavi Swarajya, revolutionary guerrilla naval tactics, hill forts of Sahyadri, and Peshwa confederacy expansion.',
      Hindi: 'ताजमहल और लाल किला का स्थापत्य, तथा छत्रपति शिवाजी महाराज द्वारा हिंदवी स्वराज्य की स्थापना, गुरिल्ला युद्धनीति और सह्याद्रि के किले।',
      Odia: 'ଭାରତୀୟ ସ୍ଥାପତ୍ୟ ବିକାଶ (ତାଜମହଲ, ଲାଲ କିଲ୍ଲା) ଏବଂ ଛତ୍ରପତି ଶିବାଜୀ ମହାରାଜଙ୍କ ହିନ୍ଦଭୀ ସ୍ୱରାଜ୍ୟ, ଗରିଲା ଯୁଦ୍ଧ କୌଶଳ ଓ ପାର୍ବତ୍ୟ ଦୁର୍ଗ।',
    },
    monuments: [
      { name: 'Taj Mahal & Agra Fort', location: 'Agra, Uttar Pradesh', stateId: 'up', significance: 'White marble wonder of the world on the Yamuna river' },
      { name: 'Raigad Capital Hill Fort', location: 'Maharashtra', stateId: 'mh', significance: 'Seat of Chhatrapati Shivaji Maharaj\'s coronation in 1674' },
      { name: 'Amer Fort & Hawa Mahal', location: 'Rajasthan', stateId: 'rj', significance: 'Rajput hilltop citadel and astronomical breeze palace' },
    ],
    keyAchievements: [
      'Guerilla mountain warfare (Ganimi Kava) and indigenous naval fleet',
      'Intricate marble Pietra Dura inlay and Persian-Sanskrit synthesis',
      'Extensive revenue mapping (Todar Mal\'s Bandobast system)',
      'Astronomical observatories (Jantar Mantar in Jaipur & Delhi)',
    ],
    audioNarration: {
      English: 'This era witnessed the construction of the Taj Mahal and Red Fort, followed by Chhatrapati Shivaji Maharaj\'s strategic hill forts and naval defense in Maharashtra.',
      Hindi: 'इस युग में ताजमहल और लाल किले का निर्माण हुआ, तथा महाराष्ट्र में छत्रपति शिवाजी महाराज ने अजेय किलों और नौसेना की नींव रखी।',
      Odia: 'ଏହି ଯୁଗରେ ତାଜମହଲ ଓ ଲାଲ କିଲ୍ଲା ନିର୍ମିତ ହୋଇଥିଲା, ଏବଂ ମହାରାଷ୍ଟ୍ରରେ ଛତ୍ରପତି ଶିବାଜୀ ମହାରାଜ ଦୁର୍ଗ ଓ ନୌସେନା ଗଠନ କରିଥିଲେ।',
    },
  },
  {
    id: 'independence_1947',
    yearRange: '1857 CE - 1950 CE',
    eraName: {
      English: 'Freedom Struggle & Republic Integration',
      Hindi: 'स्वतंत्रता संग्राम एवं गणतंत्र का निर्माण',
      Odia: 'ସ୍ୱାଧୀନତା ସଂଗ୍ରାମ ଓ ଗଣତନ୍ତ୍ର ଗଠନ',
    },
    rulerDynasty: 'Mahatma Gandhi, Netaji Subhash Chandra Bose, Sardar Patel, Dr. Ambedkar',
    capitalCity: 'New Delhi',
    keyCenterStateIds: ['dl', 'wb', 'gj', 'pb', 'mh', 'or'],
    description: {
      English: 'The historic Indian Freedom Movement. Mahatma Gandhi\'s Satyagraha, Netaji\'s INA (Azad Hind Fauj), Sardar Patel\'s peaceful integration of 565 princely states, and Dr. B.R. Ambedkar drafting the world\'s longest written Constitution.',
      Hindi: 'महात्मा गांधी का सत्याग्रह, नेताजी की आजाद हिंद फौज, सरदार पटेल द्वारा 565 रियासतों का विलय, और डॉ. आंबेडकर द्वारा रचित विश्व का महानतम संविधान।',
      Odia: 'ମହାତ୍ମା ଗାନ୍ଧୀଙ୍କ ଅହିଂସା ସତ୍ୟାଗ୍ରହ, ନେତାଜୀ ସୁଭାଷ ଚନ୍ଦ୍ର ବୋଷଙ୍କ ଆଜାଦ ହିନ୍ଦ ଫୌଜ, ସର୍ଦ୍ଦାର ପଟେଲଙ୍କ ଦ୍ୱାରା ୫୬୫ ରାଜ୍ୟର ଏକତ୍ରୀକରଣ ଓ ଆମ୍ବେଦକରଙ୍କ ସମ୍ବିଧାନ।',
    },
    monuments: [
      { name: 'Statue of Unity (Sardar Patel)', location: 'Gujarat', stateId: 'gj', significance: 'World\'s tallest statue (182m) honoring the Iron Man of India' },
      { name: 'National War Memorial & India Gate', location: 'New Delhi', stateId: 'dl', significance: 'Monument dedicated to sovereign armed forces of India' },
      { name: 'Netaji Birthplace Museum & Cuttack', location: 'Odisha', stateId: 'or', significance: 'Birthplace of Subhash Chandra Bose in Odia land' },
    ],
    keyAchievements: [
      'World\'s largest successful non-violent freedom movement',
      'Integration of 565 diverse princely states into one democratic union',
      'Adoption of the Constitution of India guaranteeing universal adult suffrage',
      'Establishment of IITs, Atomic Energy Commission, and Election Commission',
    ],
    audioNarration: {
      English: 'On August 15, 1947, India gained independence. Sardar Vallabhbhai Patel unified 565 princely states, and Dr. Ambedkar gave India the world\'s most progressive democratic Constitution.',
      Hindi: '15 अगस्त 1947 को भारत स्वतंत्र हुआ। सरदार पटेल ने 565 रियासतों को एकजुट किया और डॉ. आंबेडकर ने देश को एक सुदृढ़ संविधान दिया।',
      Odia: '୧୫ ଅଗଷ୍ଟ ୧୯୪୭ ରେ ଭାରତ ସ୍ୱାଧୀନ ହେଲା। ସର୍ଦ୍ଦାର ପଟେଲ ୫୬୫ ରାଜ୍ୟକୁ ଏକ କଲେ ଏବଂ ଆମ୍ବେଦକର ଭାରତକୁ ବିଶ୍ୱର ସର୍ବବୃହତ୍ ଗଣତାନ୍ତ୍ରିକ ସମ୍ବିଧାନ ପ୍ରଦାନ କଲେ।',
    },
  },
  {
    id: 'modern_space_era',
    yearRange: '1970 CE - 2026 CE',
    eraName: {
      English: 'Modern Space, Science & Digital India',
      Hindi: 'आधुनिक अंतरिक्ष, विज्ञान एवं डिजिटल भारत',
      Odia: 'ଆଧୁନିକ ମହାକାଶ ବିଜ୍ଞାନ ଓ ଡିଜିଟାଲ୍ ଭାରତ',
    },
    rulerDynasty: 'Dr. A.P.J. Abdul Kalam, ISRO, DRDO & Digital India Innovations',
    capitalCity: 'New Delhi & Bengaluru (Tech Capital)',
    keyCenterStateIds: ['ap', 'ka', 'ts', 'or', 'dl', 'mh'],
    description: {
      English: 'India\'s rise as a global scientific, space, and tech powerhouse. Chandrayaan-3 historical landing on the Moon\'s south pole, Mars Orbiter Mission, UPI digital transactions, and defense missile test range at Dr. Kalam Island in Odisha.',
      Hindi: 'चंद्रयान-3 द्वारा चंद्रमा के दक्षिणी ध्रुव पर ऐतिहासिक सॉफ्ट लैंडिंग, मंगलयान मिशन, यूपीआई डिजिटल क्रांति, और ओडिशा के अब्दुल कलाम द्वीप से मिसाइल परीक्षण।',
      Odia: 'ଚନ୍ଦ୍ରଯାନ-୩ ର ଚନ୍ଦ୍ରର ଦକ୍ଷିଣ ମେରୁରେ ଐତିହାସିକ ଅବତରଣ, ମଙ୍ଗଳଯାନ ମିଶନ, ୟୁପିଆଇ ଡିଜିଟାଲ୍ କ୍ରାନ୍ତି ଏବଂ ଓଡ଼ିଶାର ଡ଼କ୍ଟର କଲାମ ଦ୍ୱୀପରୁ କ୍ଷେପଣାସ୍ତ୍ର ପରୀକ୍ଷଣ।',
    },
    monuments: [
      { name: 'Satish Dhawan Space Centre', location: 'Sriharikota, Andhra Pradesh', stateId: 'ap', significance: 'India\'s primary spaceport for Chandrayaan, Mangalyaan & Gaganyaan' },
      { name: 'Dr. APJ Abdul Kalam Island (Wheeler Island)', location: 'Odisha Coast', stateId: 'or', significance: 'Integrated Test Range for Agni & Prithvi missile systems' },
      { name: 'Bengaluru Space & Tech Park', location: 'Karnataka', stateId: 'ka', significance: 'Silicon Valley of India and ISRO headquarters' },
    ],
    keyAchievements: [
      'First nation in the world to successfully land on the Moon\'s South Pole (Chandrayaan-3)',
      'Mars Orbiter Mission (Mangalyaan) achieved on very first attempt',
      'Unified Payments Interface (UPI) handling 45% of world\'s real-time digital payments',
      'Indigenous supercomputing (PARAM) and green hydrogen renewable mission',
    ],
    audioNarration: {
      English: 'Today, India leads in space and digital technology. With Chandrayaan-3 conquering the Moon\'s south pole, launchings from Sriharikota, and missile tests at Kalam Island in Odisha, ATLAS 2.0 empowers the next generation of innovators.',
      Hindi: 'आज भारत अंतरिक्ष और डिजिटल क्रांति में अग्रणी है। चंद्रयान-3 की सफलता और श्रीहरिकोटा से अंतरिक्ष प्रक्षेपण नए भारत की शक्ति हैं।',
      Odia: 'ଆଜି ଭାରତ ମହାକାଶ ଓ ଡିଜିଟାଲ୍ କ୍ଷେତ୍ରରେ ଅଗ୍ରଣୀ। ଚନ୍ଦ୍ରଯାନ-୩ ର ଐତିହାସିକ ସଫଳତା ଓ ଶ୍ରୀହରିକୋଟା ପ୍ରକ୍ଷେପଣ ନୂତନ ଭାରତର ଗୌରବ।',
    },
  },
];
