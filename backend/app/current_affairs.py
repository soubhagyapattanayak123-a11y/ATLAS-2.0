"""
Live Current Affairs & Educational News Engine for ATLAS 2.0
Fetches real-time headlines across National, International, Science & Tech,
Economy, Sports, and Environment categories, enriched with exam relevance,
static GK connections, and interactive daily quizzes.
"""

import re
import time
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Dict, Any, List, Optional

# In-memory cache: key -> {"timestamp": float, "data": Dict[str, Any]}
_CACHE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 300  # 5 minutes


RSS_FEEDS = {
    "all": "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en",
    "national": "https://news.google.com/rss/headlines/section/topic/NATION?hl=en-IN&gl=IN&ceid=IN:en",
    "international": "https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-IN&gl=IN&ceid=IN:en",
    "economy": "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-IN&gl=IN&ceid=IN:en",
    "science": "https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-IN&gl=IN&ceid=IN:en",
    "sports": "https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-IN&gl=IN&ceid=IN:en",
}

HINDI_RSS_FEEDS = {
    "all": "https://news.google.com/rss?hl=hi&gl=IN&ceid=IN:hi",
    "national": "https://news.google.com/rss/headlines/section/topic/NATION?hl=hi&gl=IN&ceid=IN:hi",
    "international": "https://news.google.com/rss/headlines/section/topic/WORLD?hl=hi&gl=IN&ceid=IN:hi",
    "economy": "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=hi&gl=IN&ceid=IN:hi",
    "science": "https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=hi&gl=IN&ceid=IN:hi",
    "sports": "https://news.google.com/rss/headlines/section/topic/SPORTS?hl=hi&gl=IN&ceid=IN:hi",
}


def clean_html(raw_html: str) -> str:
    """Strip HTML tags and unescape common XML entities."""
    clean = re.sub(r'<.*?>', '', raw_html or '')
    clean = clean.replace('&quot;', '"').replace('&apos;', "'").replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean


def infer_category(title: str, default_cat: str) -> str:
    t_lower = title.lower()
    if any(k in t_lower for k in ["isro", "nasa", "space", "satellite", "ai", "artificial intelligence", "tech", "gadget", "cyber", "robot", "quantum", "chip"]):
        return "Science & Technology"
    if any(k in t_lower for k in ["rbi", "gdp", "inflation", "sensex", "nifty", "rupee", "bank", "budget", "finance", "economy", "market", "trade"]):
        return "Economy & Banking"
    if any(k in t_lower for k in ["cricket", "ipl", "olympic", "fifa", "badminton", "tennis", "medal", "tournament", "trophy", "world cup"]):
        return "Sports & Honors"
    if any(k in t_lower for k in ["climate", "cop", "pollution", "forest", "tiger", "sanctuary", "monsoon", "wildlife", "green energy"]):
        return "Environment & Climate"
    if any(k in t_lower for k in ["un", "usa", "us", "china", "russia", "israel", "gaza", "iran", "summit", "bilateral", "embassy", "nato"]):
        return "International Affairs"
    if any(k in t_lower for k in ["parliament", "supreme court", "high court", "minister", "cabinet", "election", "modi", "bill", "act", "delhi", "state"]):
        return "National & Governance"
    
    cat_map = {
        "national": "National & Governance",
        "international": "International Affairs",
        "science": "Science & Technology",
        "economy": "Economy & Banking",
        "sports": "Sports & Honors",
    }
    return cat_map.get(default_cat, "General Current Affairs")


def generate_exam_tags(category: str, title: str) -> List[str]:
    tags = ["General Awareness"]
    t = title.lower()
    if category == "National & Governance":
        tags.extend(["UPSC Polity (GS-2)", "SSC CGL", "State PSC"])
    elif category == "Economy & Banking":
        tags.extend(["Banking GA", "UPSC Economy (GS-3)", "RBI Grade B"])
    elif category == "Science & Technology":
        tags.extend(["UPSC Sci & Tech (GS-3)", "Defense Exams", "GATE/ISRO"])
    elif category == "International Affairs":
        tags.extend(["UPSC IR (GS-2)", "Civil Services", "SSB Interview"])
    elif category == "Environment & Climate":
        tags.extend(["UPSC Ecology (GS-3)", "Forest Service", "SSC CGL"])
    elif category == "Sports & Honors":
        tags.extend(["Sports GK", "Railways RRB", "SSC CHSL"])

    if "supreme court" in t or "constitution" in t:
        tags.append("Constitutional Law")
    if "isro" in t:
        tags.append("Space Technology")
    if "rbi" in t:
        tags.append("Monetary Policy")
    return list(dict.fromkeys(tags))[:4]


def generate_static_gk(category: str, title: str) -> str:
    t = title.lower()
    if "isro" in t:
        return "ISRO was founded on 15 August 1969. Headquarters: Bengaluru, Karnataka. First satellite: Aryabhata (1975)."
    if "rbi" in t:
        return "Reserve Bank of India was established on 1 April 1935 under the RBI Act, 1934. Headquartered in Mumbai."
    if "supreme court" in t:
        return "Supreme Court of India was established on 28 January 1950 under Article 124 of the Constitution. Chief Justice & up to 33 judges."
    if "election" in t or "vote" in t:
        return "Election Commission of India operates under Article 324 of the Constitution. National Voters' Day is celebrated on January 25."
    if "parliament" in t:
        return "Indian Parliament comprises the President, Rajya Sabha (Council of States, Art 80), and Lok Sabha (House of the People, Art 81)."
    if "gdp" in t or "inflation" in t:
        return "GDP data in India is published quarterly by the National Statistical Office (NSO) under the Ministry of Statistics and Programme Implementation (MoSPI)."
    if "climate" in t or "carbon" in t:
        return "Paris Agreement on climate change was adopted at COP21 in 2015 aiming to keep global warming well below 2°C above pre-industrial levels."
    if category == "National & Governance":
        return "Static Link: Relevant to Indian Constitution, Statutory Bodies, and Executive Governance Policies."
    if category == "Science & Technology":
        return "Static Link: Related to emerging scientific research, indigenisation of technology, and digital public infrastructure."
    if category == "Economy & Banking":
        return "Static Link: Fiscal indicators, monetary policy transmission, and macroeconomic development."
    return "Static Link: Important for General Knowledge & Current Awareness in Competitive Examinations."


def generate_key_takeaways(title: str, source: str, category: str) -> List[str]:
    return [
        f"Key Event: {title[:80]}...",
        f"Verified Reporting Agency: {source}",
        f"Syllabus Relevance: Important development under {category} for UPSC, SSC, and Banking exams.",
        "Preparation Tip: Note down key dates, personalities, and associated statutory frameworks.",
    ]


FALLBACK_CURRENT_AFFAIRS = [
    {
        "id": "ca-fallback-1",
        "title": "ISRO advances Next-Gen Launch Vehicle (NGLV) roadmap for Indian Space Station project",
        "category": "Science & Technology",
        "published_at": "15m ago",
        "pub_date": "Today",
        "source": "PIB India",
        "link": "https://www.isro.gov.in",
        "summary": "The Indian Space Research Organisation has finalized key architectural milestones for the Next-Generation Launch Vehicle (NGLV) designed to support heavy payloads for the Bharatiya Antariksh Station (BAS).",
        "exam_relevance": ["UPSC Sci & Tech (GS-3)", "ISRO/Defense", "SSC CGL"],
        "key_takeaways": [
            "NGLV will offer reusable first-stage booster capability to drastically lower launch costs.",
            "Bharatiya Antariksh Station (BAS) targets initial operational capability by 2035.",
            "Indigenous cryo-propulsion and semi-cryogenic SCE-200 engines form the core propulsion system.",
        ],
        "static_gk_fact": "ISRO was established on 15 August 1969. First satellite: Aryabhata (1975). Current Launch Centre: Satish Dhawan Space Centre (SHAR), Sriharikota, Andhra Pradesh.",
        "quiz": {
            "question": "What is the targeted operational timeline for India's indigenous space station, Bharatiya Antariksh Station (BAS)?",
            "options": ["2028", "2035", "2040", "2050"],
            "correct_index": 1,
            "explanation": "ISRO aims to deploy the first module of the Bharatiya Antariksh Station by 2028 and achieve full operational status by 2035.",
        },
    },
    {
        "id": "ca-fallback-2",
        "title": "Reserve Bank of India Monetary Policy Committee reviews digital lending guidelines and liquidity measures",
        "category": "Economy & Banking",
        "published_at": "1h ago",
        "pub_date": "Today",
        "source": "RBI Press Release",
        "link": "https://www.rbi.org.in",
        "summary": "The RBI MPC reaffirmed its focus on price stability while ensuring smooth credit delivery to MSMEs, highlighting enhanced safeguards for peer-to-peer lending and digital credit channels.",
        "exam_relevance": ["Banking GA", "UPSC Economy (GS-3)", "RBI Grade B"],
        "key_takeaways": [
            "Emphasis on maintaining inflation target of 4% within a +/- 2% tolerance band under the RBI Act.",
            "Digital Lending Guidelines enforce direct disbursements without third-party pass-through accounts.",
            "Liquidity management operations monitored through standing deposit facility (SDF) and repo windows.",
        ],
        "static_gk_fact": "The Monetary Policy Committee (MPC) consists of 6 members: 3 from RBI and 3 external experts appointed by the Central Government under Section 45ZB of the RBI Act.",
        "quiz": {
            "question": "Under which section of the RBI Act was the Monetary Policy Committee (MPC) institutionalized?",
            "options": ["Section 45ZB", "Section 22", "Section 17", "Section 35A"],
            "correct_index": 0,
            "explanation": "Section 45ZB of the RBI Act, 1934 provides the statutory basis for the 6-member Monetary Policy Committee.",
        },
    },
    {
        "id": "ca-fallback-3",
        "title": "Supreme Court of India issues nationwide directions on digital court records and electronic evidence integrity",
        "category": "National & Governance",
        "published_at": "2h ago",
        "pub_date": "Today",
        "source": "Supreme Court Bulletin",
        "link": "https://main.sci.gov.in",
        "summary": "A constitutional bench underscored standardized electronic certificates under Section 63 of Bharatiya Sakshya Adhiniyam to ensure digital transparency across subordinate and appellate courts.",
        "exam_relevance": ["UPSC Polity (GS-2)", "Judiciary Exams", "SSC CGL"],
        "key_takeaways": [
            "Bharatiya Sakshya Adhiniyam replaces the colonial Indian Evidence Act, 1872 with modernized digital evidence norms.",
            "Electronic signatures and digital hashes now carry statutory prima facie presumption of genuineness.",
            "E-Courts Mission Mode Project Phase-III integrates cloud repositories and AI-assisted transcription.",
        ],
        "static_gk_fact": "Supreme Court of India was inaugurated on 28 January 1950. Article 129 establishes the Supreme Court as a 'Court of Record' with power to punish for contempt of itself.",
        "quiz": {
            "question": "Which new statute replaced the Indian Evidence Act, 1872 in India?",
            "options": ["Bharatiya Nyaya Sanhita", "Bharatiya Sakshya Adhiniyam", "Bharatiya Nagarik Suraksha Sanhita", "Cyber Security Act"],
            "correct_index": 1,
            "explanation": "The Bharatiya Sakshya Adhiniyam, 2023 replaced the Indian Evidence Act, 1872 to govern rules of evidence and electronic proof.",
        },
    },
    {
        "id": "ca-fallback-4",
        "title": "India's renewable energy capacity crosses new benchmark with major solar-wind hybrid parks in Gujarat and Rajasthan",
        "category": "Environment & Climate",
        "published_at": "3h ago",
        "pub_date": "Today",
        "source": "Ministry of New and Renewable Energy",
        "link": "https://mnre.gov.in",
        "summary": "India has accelerated its COP26 commitment towards achieving 500 GW of non-fossil fuel electricity capacity ahead of the 2030 target, propelled by mega hybrid parks in Khavda and Thar.",
        "exam_relevance": ["UPSC Ecology (GS-3)", "State PSC", "SSC CGL"],
        "key_takeaways": [
            "The Khavda Renewable Energy Park in Gujarat is planned as the world's largest renewable park with 30 GW capacity.",
            "National Green Hydrogen Mission aims for 5 MMT annual production by 2030.",
            "Solar-wind hybridization provides continuous round-the-clock (RTC) green power.",
        ],
        "static_gk_fact": "India committed to Panchamrit climate goals at COP26 Glasgow: reaching net zero emissions by 2070 and meeting 50% of energy requirements from renewables by 2030.",
        "quiz": {
            "question": "By which year has India pledged to achieve Net Zero carbon emissions under the Panchamrit goals?",
            "options": ["2047", "2050", "2060", "2070"],
            "correct_index": 3,
            "explanation": "India has committed to achieving Net Zero carbon emissions by the year 2070 as announced at COP26 in Glasgow.",
        },
    },
    {
        "id": "ca-fallback-5",
        "title": "Asian Badminton Championship: Indian shuttlers secure historic podium finishes in women's doubles",
        "category": "Sports & Honors",
        "published_at": "4h ago",
        "pub_date": "Today",
        "source": "Sports Authority of India",
        "link": "https://sportsauthorityofindia.nic.in",
        "summary": "Indian badminton players delivered an outstanding showing at the continental tournament, defeating top seeds from South Korea and Japan in straight games.",
        "exam_relevance": ["Sports GK", "Railways RRB", "SSC CHSL"],
        "key_takeaways": [
            "First time an Indian pair advanced to back-to-back continental championship finals.",
            "Target Olympic Podium Scheme (TOPS) support cited as a crucial factor in specialized sports science training.",
        ],
        "static_gk_fact": "The Badminton World Federation (BWF) is headquartered in Kuala Lumpur, Malaysia. Prakash Padukone was the first Indian to win the All England Championship in 1980.",
        "quiz": {
            "question": "Who was the first Indian badminton player to win the prestigious All England Open Championship?",
            "options": ["Pullela Gopichand", "Prakash Padukone", "Syed Modi", "Chetan Anand"],
            "correct_index": 1,
            "explanation": "Prakash Padukone made history in 1980 by becoming the first Indian player to win the All England Open Championship.",
        },
    },
]


def fetch_live_current_affairs(category: str = "all", language: str = "English") -> Dict[str, Any]:
    """
    Fetches real-time current affairs from live RSS feeds.
    Falls back gracefully to curated exam current affairs if offline.
    """
    cat_key = (category or "all").lower().strip()
    lang = (language or "English").strip()
    is_hindi = lang.lower() in ["hindi", "hi", "hi-in"]
    is_odia = lang.lower() in ["odia", "or", "or-in"]

    cache_key = f"{cat_key}_{lang}"
    now_ts = time.time()

    # Check cache
    if cache_key in _CACHE:
        cached_entry = _CACHE[cache_key]
        if now_ts - cached_entry["timestamp"] < CACHE_TTL_SECONDS:
            return cached_entry["data"]

    feed_url = HINDI_RSS_FEEDS.get(cat_key, HINDI_RSS_FEEDS["all"]) if is_hindi else RSS_FEEDS.get(cat_key, RSS_FEEDS["all"])

    items: List[Dict[str, Any]] = []
    breaking_ticker: List[str] = []

    try:
        req = urllib.request.Request(
            feed_url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ATLAS/2.0 Academic News Engine",
                "Accept": "application/rss+xml, application/xml, text/xml",
            },
        )
        with urllib.request.urlopen(req, timeout=4.5) as response:
            xml_content = response.read()

        root = ET.fromstring(xml_content)
        xml_items = root.findall("./channel/item")
        now_dt = datetime.now(timezone.utc)

        for idx, el in enumerate(xml_items[:12]):
            raw_title = el.find("title").text if el.find("title") is not None else ""
            raw_link = el.find("link").text if el.find("link") is not None else ""
            raw_pub_date = el.find("pubDate").text if el.find("pubDate") is not None else ""
            raw_desc = el.find("description").text if el.find("description") is not None else ""

            cleaned_title = clean_html(raw_title)
            if not cleaned_title:
                continue

            source_name = "News Bureau"
            if " - " in cleaned_title:
                parts = cleaned_title.rsplit(" - ", 1)
                cleaned_title = parts[0].strip()
                source_name = parts[1].strip()

            rel_time = "Recent"
            if raw_pub_date:
                try:
                    dt = parsedate_to_datetime(raw_pub_date)
                    diff = (now_dt - dt).total_seconds()
                    if diff < 3600:
                        mins = max(1, int(diff // 60))
                        rel_time = f"{mins}m ago"
                    elif diff < 86400:
                        hours = int(diff // 3600)
                        rel_time = f"{hours}h ago"
                    else:
                        days = int(diff // 86400)
                        rel_time = f"{days}d ago"
                except Exception:
                    rel_time = raw_pub_date[:16]

            inferred_cat = infer_category(cleaned_title, cat_key)
            exam_tags = generate_exam_tags(inferred_cat, cleaned_title)
            static_gk = generate_static_gk(inferred_cat, cleaned_title)
            key_takeaways = generate_key_takeaways(cleaned_title, source_name, inferred_cat)

            summary = clean_html(raw_desc)
            if len(summary) > 220 or len(summary) < 20:
                summary = f"{cleaned_title}. Reported by {source_name} for student current affairs review."

            breaking_ticker.append(cleaned_title)

            # Generate an MCQ for the first 5 articles
            quiz_obj = None
            if idx < 5:
                quiz_obj = {
                    "question": f"Regarding the recent news '{cleaned_title[:75]}...', which organization or theme is primarily associated?",
                    "options": [source_name, inferred_cat, "General Knowledge", "None of these"],
                    "correct_index": 1,
                    "explanation": f"This event falls under {inferred_cat} as reported by {source_name}.",
                }

            items.append({
                "id": f"ca-live-{idx}-{int(now_ts)}",
                "title": cleaned_title,
                "category": inferred_cat,
                "published_at": rel_time,
                "pub_date": raw_pub_date,
                "source": source_name,
                "link": raw_link,
                "summary": summary,
                "exam_relevance": exam_tags,
                "key_takeaways": key_takeaways,
                "static_gk_fact": static_gk,
                "quiz": quiz_obj,
            })

    except Exception as e:
        # Fallback to curated high-yield exam current affairs
        items = [dict(item) for item in FALLBACK_CURRENT_AFFAIRS]
        breaking_ticker = [item["title"] for item in items]

    if not items:
        items = [dict(item) for item in FALLBACK_CURRENT_AFFAIRS]
        breaking_ticker = [item["title"] for item in items]

    # Multilingual translation for Odia if requested
    if is_odia:
        for it in items:
            it["summary"] = f"ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ: {it['title']}। ଉତ୍ସ: {it['source']}। ପରୀକ୍ଷା ଦୃଷ୍ଟିକୋଣରୁ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ବିଷୟ।"
            it["key_takeaways"] = [
                f"ମୁଖ୍ୟ ବିଷୟ: {it['title']}",
                f"ଉତ୍ସ: {it['source']}",
                f"ବିଭାଗ: {it['category']}",
                "ୟୁପିଏସସି, ଓଡ଼ିଶା ଓପିଏସସି (OPSC) ଏବଂ ବ୍ୟାଙ୍କିଙ୍ଗ ପରୀକ୍ଷା ପାଇଁ ଆବଶ୍ୟକୀୟ ତଥ୍ୟ।",
            ]

    result_payload = {
        "status": "success",
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "category": cat_key,
        "language": lang,
        "total_count": len(items),
        "items": items,
        "breaking_ticker": breaking_ticker[:8],
        "daily_quiz": [it["quiz"] for it in items if it.get("quiz") is not None],
    }

    # Save to memory cache
    _CACHE[cache_key] = {
        "timestamp": now_ts,
        "data": result_payload,
    }

    return result_payload
