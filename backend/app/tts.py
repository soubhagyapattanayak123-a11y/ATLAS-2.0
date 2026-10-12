import hashlib
import os
import re
import urllib.parse
import urllib.request
from typing import Dict, List

# In-memory audio cache: md5 -> bytes
_TTS_CACHE: Dict[str, bytes] = {}

# Special mappings for Odia specific letters and digits to Devanagari
ODIA_SPECIAL_MAP = {
    0x0B5C: 0x095C,  # ଡ଼ -> ड़
    0x0B5D: 0x095D,  # ଢ଼ -> ढ़
    0x0B5F: 0x092F,  # ୟ -> य
    0x0B71: 0x0935,  # ୱ -> व
    0x0B33: 0x0933,  # ଳ -> ळ
    0x0B3D: 0x093D,  # ଽ (avagraha) -> ऽ
    0x0B02: 0x0902,  # ଂ (anusvara) -> ं
    0x0B03: 0x0903,  # ଃ (visarga) -> ः
    0x0B01: 0x0901,  # ଁ (candrabindu) -> ँ
    0x0B4D: 0x094D,  # ୍ (virama) -> ्
}

def clean_speech_text(text: str) -> str:
    """
    Strips markdown formatting, code tags, URLs, and excessive symbols
    so the speech synthesizer reads natural spoken language smoothly.
    """
    if not text:
        return ""
    # Strip markdown bold and italic: **bold**, *italic*, __bold__
    t = re.sub(r'[*_]{1,3}(.*?)[*_]{1,3}', r'\1', text)
    # Strip headers: # Header -> Header
    t = re.sub(r'^#+\s*', '', t, flags=re.MULTILINE)
    # Strip markdown links: [label](url) -> label
    t = re.sub(r'\[(.*?)\]\([^)]*\)', r'\1', t)
    # Strip code blocks
    t = re.sub(r'```[\s\S]*?```', '', t)
    t = re.sub(r'`(.*?)`', r'\1', t)
    # Strip bullet markers at start of lines
    t = re.sub(r'^\s*[-*•]\s+', '', t, flags=re.MULTILINE)
    # Replace step numbers like "1." or "Step 1:" cleanly
    t = re.sub(r'^\s*(\d+)[\.\)]\s*', r'\1. ', t, flags=re.MULTILINE)
    # Normalize multiple whitespaces
    t = re.sub(r'[ \t]+', ' ', t)
    # Replace multiple newlines with dandas or full stops if missing
    t = re.sub(r'\n+', ' । ', t)
    return t.strip()


def odia_to_devanagari(text: str) -> str:
    """
    Phonetically transliterates Odia Unicode characters (0x0B00-0x0B7F)
    to Devanagari (0x0900-0x097F).
    Since both Brahmi-derived scripts share identical relative codepoints,
    this generates phonetically exact input for Indian TTS engines.
    """
    res = []
    for char in text:
        cp = ord(char)
        if cp in ODIA_SPECIAL_MAP:
            res.append(chr(ODIA_SPECIAL_MAP[cp]))
        # Map Odia digits (0x0B66 to 0x0B6F: ୦-୯) to Devanagari digits (0x0966 to 0x096F: ०-९)
        elif 0x0B66 <= cp <= 0x0B6F:
            res.append(chr(0x0966 + (cp - 0x0B66)))
        elif 0x0B00 <= cp <= 0x0B7F:
            # Shift from Odia block to Devanagari block
            dev_cp = cp - 0x0B00 + 0x0900
            res.append(chr(dev_cp))
        else:
            res.append(char)
    return "".join(res)


def chunk_text(text: str, max_chars: int = 140) -> List[str]:
    """
    Split text into chunks smaller than max_chars along punctuation/word boundaries.
    """
    clean = text.strip()
    if not clean:
        return []
    
    # Split on punctuation or newlines
    sentences = re.split(r'([।\.!?\n\r;:]+)', clean)
    chunks: List[str] = []
    curr = ""
    for piece in sentences:
        if not piece:
            continue
        if len(curr) + len(piece) <= max_chars:
            curr += piece
        else:
            if curr.strip():
                chunks.append(curr.strip())
            curr = piece
    if curr.strip():
        chunks.append(curr.strip())

    # Ensure no single chunk exceeds max_chars
    final_chunks: List[str] = []
    for c in chunks:
        if len(c) <= max_chars:
            final_chunks.append(c)
        else:
            words = c.split(' ')
            sub = ""
            for w in words:
                if len(sub) + len(w) + 1 <= max_chars:
                    sub = (sub + " " + w).strip()
                else:
                    if sub:
                        final_chunks.append(sub)
                    sub = w
            if sub:
                final_chunks.append(sub)

    return final_chunks or [clean[:max_chars]]


def generate_speech_audio(text: str, lang: str = "en") -> bytes:
    """
    Synthesize speech audio (MP3) for English, Hindi, and Odia.
    Returns concatenated MP3 audio bytes.
    """
    cleaned_input = clean_speech_text(text)
    if not cleaned_input:
        return b""

    lang_lower = (lang or "en").lower().strip()
    cache_key = hashlib.md5(f"{lang_lower}:{cleaned_input}".encode("utf-8")).hexdigest()

    if cache_key in _TTS_CACHE:
        return _TTS_CACHE[cache_key]

    # Determine processing strategy
    is_odia = lang_lower in ["odia", "or", "or-in", "ory"]
    is_hindi = lang_lower in ["hindi", "hi", "hi-in"]

    if is_odia:
        tl = "hi"
        text_to_speak = odia_to_devanagari(cleaned_input)
    elif is_hindi:
        tl = "hi"
        text_to_speak = cleaned_input
    else:
        tl = "en"
        text_to_speak = cleaned_input

    chunks = chunk_text(text_to_speak, max_chars=140)
    if not chunks:
        return b""

    audio_bytes = bytearray()
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    }

    # Available Google TTS client parameters in order of preference
    clients = ["tw-ob", "gtx", "dict-chrome-ex"]

    for chunk in chunks:
        if not chunk.strip():
            continue
        query_encoded = urllib.parse.quote(chunk)
        chunk_received = False

        for client_name in clients:
            url = f"https://translate.google.com/translate_tts?ie=UTF-8&q={query_encoded}&tl={tl}&client={client_name}"
            req = urllib.request.Request(url, headers=headers)
            try:
                with urllib.request.urlopen(req, timeout=12) as response:
                    audio_bytes.extend(response.read())
                    chunk_received = True
                    break
            except Exception:
                continue

        if not chunk_received:
            print(f"[TTS Warning] Could not synthesize chunk: '{chunk[:30]}...'")

    result = bytes(audio_bytes)
    if result:
        # Cache up to 100 entries in memory
        if len(_TTS_CACHE) > 100:
            _TTS_CACHE.clear()
        _TTS_CACHE[cache_key] = result

    return result
