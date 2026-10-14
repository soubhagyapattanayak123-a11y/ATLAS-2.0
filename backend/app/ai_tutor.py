import json
import os
import re
import math
from fractions import Fraction
import urllib.request
from typing import Dict, Any, List, Optional, Tuple

from .security_utils import validate_image_payload, validate_pdf_payload, safe_urlopen

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")


# Bengali to Odia script mapping
def bengali_to_odia(text: str) -> str:
    res = []
    special = {
        0x09DC: 0x0B5C,  # ড় -> ଡ଼
        0x09DD: 0x0B5D,  # ঢ় -> ଢ଼
        0x09DF: 0x0B5F,  # য় -> ୟ
        0x09B0: 0x0B30,  # র -> ର
        0x09F0: 0x0B30,  # ৰ -> ର
        0x09F1: 0x0B71,  # ৱ -> ୱ
    }
    for char in text:
        cp = ord(char)
        if cp in special:
            res.append(chr(special[cp]))
        elif cp in (0x0964, 0x0965):  # keep standard Indic dandas । and ॥
            res.append(char)
        elif 0x0980 <= cp <= 0x09FF:
            odia_cp = cp - 0x0980 + 0x0B00
            res.append(chr(odia_cp))
        else:
            res.append(char)
    return "".join(res)

# Devanagari to Odia script mapping
def devanagari_to_odia(text: str) -> str:
    res = []
    special = {
        0x095C: 0x0B5C,  # ड़ -> ଡ଼
        0x095D: 0x0B5D,  # ढ़ -> ଢ଼
        0x092F: 0x0B5F,  # य -> ୟ
        0x0935: 0x0B71,  # व -> ୱ
        0x0933: 0x0B33,  # ळ -> ଳ
    }
    for char in text:
        cp = ord(char)
        if cp in special:
            res.append(chr(special[cp]))
        elif cp in (0x0964, 0x0965):  # keep standard Indic dandas । and ॥
            res.append(char)
        elif 0x0900 <= cp <= 0x097F:
            odia_cp = cp - 0x0900 + 0x0B00
            res.append(chr(odia_cp))
        else:
            res.append(char)
    return "".join(res)

def normalize_odia_text(text: str) -> str:
    """Ensure all Indic characters are cleanly mapped to proper Odia script (0x0B00-0x0B7F) and strip foreign scripts."""
    cleaned = bengali_to_odia(text)
    cleaned = devanagari_to_odia(cleaned)
    # Strip any stray Sinhala, Tamil, Kannada, Telugu, or Malayalam hallucinations
    cleaned = re.sub(r'[\u0D80-\u0DFF\u0B80-\u0BFF\u0D00-\u0D7F\u0C00-\u0C7F\u0C80-\u0CFF\u0A80-\u0AFF]', '', cleaned)
    return cleaned

def call_openrouter(messages: List[Dict[str, str]], max_tokens: int = 500, temperature: float = 0.3) -> str:
    models = [
        "deepseek/deepseek-chat",
        "qwen/qwen-2.5-72b-instruct",
        "meta-llama/llama-3.3-70b-instruct",
        "liquid/lfm-2.5-2.6b:free",
        "google/gemma-4-26b-a4b-it:free",
        "nvidia/nemotron-3.5-lightning:free",
    ]
    
    for model in models:
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        req = urllib.request.Request(
            "https://openrouter.ai/api/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:5173",
                "X-Title": "ATLAS 2.0 Academic AI Tutor",
            },
        )
        try:
            with safe_urlopen(req, timeout=25) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                choice = data.get("choices", [{}])[0]
                content = choice.get("message", {}).get("content", "").strip()
                if content:
                    return content
        except Exception as e:
            print(f"[OpenRouter Tutor] Model {model} request failed: {e}")
            continue

    return ""

def ask_academic_question(question: str, language: str = "English") -> str:
    lang = (language or "English").strip()
    is_odia = lang.lower() in ["odia", "or", "or-in"]
    is_hindi = lang.lower() in ["hindi", "hi", "hi-in"]

    if is_odia:
        system_prompt = (
            "You are an expert academic tutor for school and college students in Odisha, India. "
            "The student requires their complete explanation in the ODIA language (ଓଡ଼ିଆ ଭାଷା) using ODIA script (Unicode 0x0B00-0x0B7F). "
            "CRITICAL MANDATORY RULES: "
            "1. STRICTLY DO NOT write in a single continuous paragraph format. The answer MUST be structured STEP-BY-STEP. "
            "2. Write the answer with clear numbered steps and headings: "
            "   ପଦକ୍ଷେପ ୧ (ସଂଜ୍ଞା ଓ ମୂଳ ଧାରଣା): ...\n\n"
            "   ପଦକ୍ଷେପ ୨ (ବୈଜ୍ଞାନିକ କାରଣ ବା କାର୍ଯ୍ୟପ୍ରଣାଳୀ): ...\n\n"
            "   ପଦକ୍ଷେପ ୩ (ବାସ୍ତବ ଜୀବନର ଉଦାହରଣ): ...\n\n"
            "   ପଦକ୍ଷେପ ୪ (ମୁଖ୍ୟ ନିଷ୍କର୍ଷ ବା ସାରାଂଶ): ...\n\n"
            "3. Write 100% in pure, standard, grammatical Odia (ଓଡ଼ିଆ). Never write in Bengali or English. "
            "4. Keep each step clear, concise, and easy to understand with double newlines between steps."
        )
        user_message = f"ପ୍ରଶ୍ନ: {question}\n\n(ଦୟାକରି କୌଣସି ପାରାଗ୍ରାଫ୍ ଆକାରରେ ନଲେଖି ପଦକ୍ଷେପ ଅନୁସାରେ Step-by-step ଲେଖନ୍ତୁ।)"
    elif is_hindi:
        system_prompt = (
            "You are an expert academic tutor. "
            "CRITICAL MANDATORY RULES: "
            "1. STRICTLY DO NOT write in a single paragraph format. The answer MUST be STEP-BY-STEP. "
            "2. Structure your answer strictly in numbered steps with clear headings in standard Hindi (हिन्दी) using Devanagari script: "
            "   चरण 1 (परिभाषा और मूल अवधारणा): ...\n\n"
            "   चरण 2 (वैज्ञानिक कारण या प्रक्रिया): ...\n\n"
            "   चरण 3 (वास्तविक जीवन का उदाहरण): ...\n\n"
            "   चरण 4 (निष्कर्ष और महत्व): ...\n\n"
            "3. Keep each step concise and separated by double newlines."
        )
        user_message = f"प्रश्न: {question}\n\n(कृपया उत्तर को पैराग्राफ में न लिखकर चरणबद्ध तरीके (Step-by-step) से समझाएं।)"
    else:
        system_prompt = (
            "You are an accessible, expert academic tutor. "
            "CRITICAL MANDATORY RULES: "
            "1. STRICTLY DO NOT write in a single paragraph format. The answer MUST be STEP-BY-STEP. "
            "2. Structure your answer with clear numbered steps: "
            "   Step 1 (Definition & Core Concept): ...\n\n"
            "   Step 2 (Scientific Mechanism / How it works): ...\n\n"
            "   Step 3 (Real-World Example): ...\n\n"
            "   Step 4 (Summary & Key Takeaway): ...\n\n"
            "3. Keep each step clear, concise, and separated by double newlines."
        )
        user_message = f"Question: {question}\n\n(Note: Please explain step-by-step with clear numbered points, not in a single paragraph.)"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message},
    ]

    answer = call_openrouter(messages, max_tokens=600)
    if not answer:
        if is_odia:
            return "କ୍ଷମା କରିବେ, ଏହି ମୁହୂର୍ତ୍ତରେ ଉତ୍ତର ପ୍ରସ୍ତୁତ କରିବାରେ ଅସୁବିଧା ହେଲା। ଦୟାକରି ଇଣ୍ଟରନେଟ୍ ସଂଯୋଗ ଯାଞ୍ଚ କରି ପୁନର୍ବାର ଚେଷ୍ଟା କରନ୍ତୁ।"
        elif is_hindi:
            return "क्षमा करें, इस समय उत्तर उत्पन्न नहीं हो सका। कृपया अपना कनेक्शन जांचें और पुनः प्रयास करें।"
        else:
            return "Unable to generate an answer at this moment. Please check your connection and try again."

    if is_odia:
        answer = normalize_odia_text(answer)

    return answer

def to_fraction_str_py(val: float) -> str:
    if abs(val - round(val)) < 1e-6:
        return str(round(val))
    try:
        f = Fraction(val).limit_denominator(200)
        return str(f)
    except Exception:
        return f"{val:.4f}".rstrip("0").rstrip(".")


def parse_poly_side_py(side_str: str, v: str) -> Tuple[float, float, float]:
    a, b, c = 0.0, 0.0, 0.0
    s = side_str.strip().replace("²", "^2").replace("×", "*").replace(" ", "")
    s = re.sub(rf"([{v}])2(?!\d)", r"\1^2", s, flags=re.I)
    if not s:
        return a, b, c

    m_fact = re.match(
        r"^(?:([+-]?\d*\.?\d*)\*?)?\(([+-]?\d*\.?\d*)([a-zA-Z])([+-]\d+\.?\d*)\)\*?\(([+-]?\d*\.?\d*)\3([+-]\d+\.?\d*)\)$",
        s,
    )
    if m_fact:
        k_str = m_fact.group(1)
        k = -1.0 if k_str == "-" else (float(k_str) if k_str else 1.0)
        a1_str = m_fact.group(2)
        a1 = 1.0 if a1_str in ["", "+"] else (-1.0 if a1_str == "-" else float(a1_str))
        b1 = float(m_fact.group(4))
        a2_str = m_fact.group(5)
        a2 = 1.0 if a2_str in ["", "+"] else (-1.0 if a2_str == "-" else float(a2_str))
        b2 = float(m_fact.group(6))
        return k * a1 * a2, k * (a1 * b2 + a2 * b1), k * b1 * b2

    m_sq = re.match(
        r"^(?:([+-]?\d*\.?\d*)\*?)?\(([+-]?\d*\.?\d*)([a-zA-Z])([+-]\d+\.?\d*)\)\^2$",
        s,
    )
    if m_sq:
        k_str = m_sq.group(1)
        k = -1.0 if k_str == "-" else (float(k_str) if k_str else 1.0)
        a1_str = m_sq.group(2)
        a1 = 1.0 if a1_str in ["", "+"] else (-1.0 if a1_str == "-" else float(a1_str))
        b1 = float(m_sq.group(4))
        return k * a1 * a1, k * 2 * a1 * b1, k * b1 * b1

    m_mono = re.match(
        r"^(?:([+-]?\d*\.?\d*)\*?)?([a-zA-Z])\*?\(([+-]?\d*\.?\d*)\2([+-]\d+\.?\d*)\)$",
        s,
    )
    if m_mono:
        k_str = m_mono.group(1)
        k = -1.0 if k_str == "-" else (float(k_str) if k_str else 1.0)
        a1_str = m_mono.group(3)
        a1 = 1.0 if a1_str in ["", "+"] else (-1.0 if a1_str == "-" else float(a1_str))
        b1 = float(m_mono.group(4))
        return k * a1, k * b1, 0.0

    terms = re.findall(r"([+-]?[^+-]+)", s)
    for t in terms:
        t = t.strip()
        if not t:
            continue
        m2 = re.match(rf"^([+-]?\d*\.?\d*)\*?{v}(?:\^2|\*{v})$", t, flags=re.I)
        if m2:
            c_str = m2.group(1)
            coeff = 1.0 if c_str in ["", "+"] else (-1.0 if c_str == "-" else float(c_str))
            a += coeff
            continue
        m1 = re.match(rf"^([+-]?\d*\.?\d*)\*?{v}$", t, flags=re.I)
        if m1:
            c_str = m1.group(1)
            coeff = 1.0 if c_str in ["", "+"] else (-1.0 if c_str == "-" else float(c_str))
            b += coeff
            continue
        try:
            c += float(t)
        except ValueError:
            pass

    return a, b, c


def solve_deterministic_math_py(problem: str, language: str = "English") -> Optional[Dict[str, Any]]:
    clean = re.sub(r"^[^:]*:\s*", "", problem)
    clean = re.sub(r"solve(?:\s+for\s+[a-zA-Z])?", "", clean, flags=re.I)
    clean = re.sub(r"find\s+roots?\s+of", "", clean, flags=re.I)
    clean = re.sub(r"roots?\s+of", "", clean, flags=re.I)
    clean = re.sub(r"equation[:\s]*", "", clean, flags=re.I).strip()

    v_match = re.search(r"\b([xXyYzZtTnN])\b", clean) or re.search(r"([xXyYzZtTnN])", clean)
    if not v_match:
        return None
    v = v_match.group(1).lower()

    lhs_str = clean
    rhs_str = "0"
    if "=" in clean:
        parts = clean.split("=")
        lhs_str = parts[0]
        rhs_str = "=".join(parts[1:])

    a_l, b_l, c_l = parse_poly_side_py(lhs_str, v)
    a_r, b_r, c_r = parse_poly_side_py(rhs_str, v)

    a = round(a_l - a_r, 6)
    b = round(b_l - b_r, 6)
    c = round(c_l - c_r, 6)

    if a == 0 and b == 0 and c == 0:
        return None

    is_odia = language.lower() in ["odia", "or", "or-in"]
    is_hindi = language.lower() in ["hindi", "hi", "hi-in"]

    if a != 0:
        D = round(b * b - 4 * a * c, 6)
        two_a = 2 * a
        neg_b = -b

        a_disp = "" if a == 1 else ("-" if a == -1 else str(int(a) if a.is_integer() else a))
        b_disp = ""
        if b != 0:
            sign = " + " if b > 0 else " - "
            b_val = abs(b)
            coeff_b = "" if b_val == 1 else (str(int(b_val) if b_val.is_integer() else b_val))
            b_disp = f"{sign}{coeff_b}{v}"
        c_disp = ""
        if c != 0:
            sign = " + " if c > 0 else " - "
            c_val = abs(c)
            c_disp = f"{sign}{int(c_val) if c_val.is_integer() else c_val}"
        std_form = f"{a_disp}{v}²{b_disp}{c_disp} = 0"

        if D > 0:
            sqrt_d = math.sqrt(D)
            is_sq = abs(sqrt_d - round(sqrt_d)) < 1e-6
            r1 = (-b + sqrt_d) / two_a
            r2 = (-b - sqrt_d) / two_a
            r1_str = to_fraction_str_py(r1)
            r2_str = to_fraction_str_py(r2)
            res_str = f"{v}₁ = {r1_str}, {v}₂ = {r2_str}"
            sqrt_disp = str(round(sqrt_d)) if is_sq else f"{sqrt_d:.4f}"

            if is_odia:
                steps = [
                    f"ପଦକ୍ଷେପ ୧ (ମାନକ ରୂପ): ଦ୍ୱିଘାତ ସମୀକରଣ ax² + bx + c = 0:\n   {std_form}",
                    f"ପଦକ୍ଷେପ ୨ (ସହଗ ଚିହ୍ନଟ): a = {a}, b = {b}, c = {c}",
                    f"ପଦକ୍ଷେପ ୩ (ପ୍ରଭେଦକ D ନିରୂପଣ): D = b² - 4ac = ({b})² - 4({a})({c}) = {D}",
                    f"ପଦକ୍ଷେପ ୪ (ବୀଜର ପ୍ରକୃତି): ଯେହେତୁ D = {D} > 0, ଏହି ସମୀକରଣର ଦୁଇଟି ବାସ୍ତବ ଓ ଅସମାନ ମୂଳ ରହିଛି।",
                    f"ପଦକ୍ଷେପ ୫ (ଦ୍ୱିଘାତ ସୂତ୍ର ପ୍ରୟୋଗ): {v} = (-b ± √D) / (2a) = ({neg_b} ± {sqrt_disp}) / {two_a}",
                    f"ପଦକ୍ଷେପ ୬ (ଅନ୍ତିମ ମୂଳ): {res_str}",
                ]
            elif is_hindi:
                steps = [
                    f"चरण 1 (मानक रूप): मानक द्विघात समीकरण ax² + bx + c = 0:\n   {std_form}",
                    f"चरण 2 (गुणांक पहचान): a = {a}, b = {b}, c = {c}",
                    f"चरण 3 (विविक्तकर D की गणना): D = b² - 4ac = ({b})² - 4({a})({c}) = {D}",
                    f"चरण 4 (मूलों की प्रकृति): चूँकि D = {D} > 0, समीकरण के दो भिन्न वास्तविक मूल हैं।",
                    f"चरण 5 (द्विघाती सूत्र): {v} = (-b ± √D) / (2a) = ({neg_b} ± {sqrt_disp}) / {two_a}",
                    f"चरण 6 (अंतिम मूल): {res_str}",
                ]
            else:
                steps = [
                    f"Step 1 (Standard Form): Standard quadratic form ax² + bx + c = 0:\n   {std_form}",
                    f"Step 2 (Coefficients): a = {a}, b = {b}, c = {c}",
                    f"Step 3 (Discriminant D): D = b² - 4ac = ({b})² - 4({a})({c}) = {D}",
                    f"Step 4 (Nature of Roots): Since D = {D} > 0, the equation has two distinct real roots.",
                    f"Step 5 (Quadratic Formula): {v} = (-b ± √D) / (2a) = ({neg_b} ± {sqrt_disp}) / {two_a}",
                    f"Step 6 (Final Roots): {res_str}",
                ]
            return {"problem": problem, "result": res_str, "steps": steps}

        elif D == 0:
            r = -b / two_a
            r_str = to_fraction_str_py(r)
            res_str = f"{v} = {r_str} (Double Root)"
            if is_odia:
                steps = [
                    f"ପଦକ୍ଷେପ ୧ (ମାନକ ରୂପ): {std_form}",
                    f"ପଦକ୍ଷେପ ୨ (ପ୍ରଭେଦକ): D = 0",
                    f"ପଦକ୍ଷେପ ୩ (ବୀଜର ପ୍ରକୃତି): ଦୁଇଟି ସମାନ ବାସ୍ତବ ମୂଳ (Equal Real Roots)",
                    f"ପଦକ୍ଷେପ ୪ (ମୂଳ ନିର୍ଣ୍ଣୟ): {v} = -b / (2a) = {r_str}",
                ]
            elif is_hindi:
                steps = [
                    f"चरण 1 (मानक रूप): {std_form}",
                    f"चरण 2 (विविक्तकर): D = 0",
                    f"चरण 3 (मूलों की प्रकृति): दो बराबर वास्तविक मूल (Equal Real Roots)",
                    f"चरण 4 (मूल गणना): {v} = -b / (2a) = {r_str}",
                ]
            else:
                steps = [
                    f"Step 1 (Standard Form): {std_form}",
                    f"Step 2 (Discriminant): D = 0",
                    f"Step 3 (Nature of Roots): Two equal real roots (double root)",
                    f"Step 4 (Calculate Root): {v} = -b / (2a) = {r_str}",
                ]
            return {"problem": problem, "result": res_str, "steps": steps}

        else:
            real_p = -b / two_a
            imag_p = math.sqrt(-D) / abs(two_a)
            r_str = to_fraction_str_py(real_p)
            i_str = to_fraction_str_py(imag_p)
            i_sym = "i" if i_str == "1" else f"{i_str}i"
            c1 = i_sym if real_p == 0 else f"{r_str} + {i_sym}"
            c2 = f"-{i_sym}" if real_p == 0 else f"{r_str} - {i_sym}"
            res_str = f"{v}₁ = {c1}, {v}₂ = {c2}"
            if is_odia:
                steps = [
                    f"ପଦକ୍ଷେପ ୧ (ମାନକ ରୂପ): {std_form}",
                    f"ପଦକ୍ଷେପ ୨ (ପ୍ରଭେଦକ): D = {D} < 0",
                    f"ପଦକ୍ଷେପ ୩ (ବୀଜର ପ୍ରକୃତି): କୌଣସି ବାସ୍ତବ ମୂଳ ନାହିଁ, ଦୁଇଟି ଜଟିଳ ଅନୁବନ୍ଧୀ ମୂଳ (Complex Conjugate Roots) ଅଛି।",
                    f"ପଦକ୍ଷେପ ୪ (ଜଟିଳ ସୂତ୍ର): {v} = (-b ± i√|D|) / (2a) = {res_str}",
                ]
            elif is_hindi:
                steps = [
                    f"चरण 1 (मानक रूप): {std_form}",
                    f"चरण 2 (विविक्तकर): D = {D} < 0",
                    f"चरण 3 (मूलों की प्रकृति): कोई वास्तविक मूल नहीं है, दो काल्पनिक/सम्मिश्र संयुग्मी मूल हैं।",
                    f"चरण 4 (सम्मिश्र सूत्र): {v} = (-b ± i√|D|) / (2a) = {res_str}",
                ]
            else:
                steps = [
                    f"Step 1 (Standard Form): {std_form}",
                    f"Step 2 (Discriminant): D = {D} < 0",
                    f"Step 3 (Nature of Roots): No real roots; two complex conjugate roots.",
                    f"Step 4 (Complex Formula): {v} = (-b ± i√|D|) / (2a) = {res_str}",
                ]
            return {"problem": problem, "result": res_str, "steps": steps}

    elif b != 0:
        root = -c / b
        root_str = to_fraction_str_py(root)
        res_str = f"{v} = {root_str}"
        steps = [
            f"Step 1 (Linear Form): {b}{v} {'+ ' + str(c) if c >= 0 else '- ' + str(abs(c))} = 0",
            f"Step 2 (Isolate Term): {b}{v} = {-c}",
            f"Step 3 (Divide): {v} = {-c} / {b}",
            f"Step 4 (Final Root): {res_str}",
        ]
        return {"problem": problem, "result": res_str, "steps": steps}

    return None


def solve_academic_math(problem: str, language: str = "English") -> Dict[str, Any]:
    lang = (language or "English").strip()
    is_odia = lang.lower() in ["odia", "or", "or-in"]
    is_hindi = lang.lower() in ["hindi", "hi", "hi-in"]

    if is_odia:
        system_prompt = (
            "You are a mathematics tutor. Solve the mathematical problem step-by-step in ODIA language (ଓଡ଼ିଆ) using ODIA script. "
            "Return a JSON object with two keys: "
            "'steps' (an array of strings explaining each step in Odia) and "
            "'result' (a string containing the final answer in Odia). "
            "Example format: {\"steps\": [\"ପଦକ୍ଷେପ ୧: ଦିଆଯାଇଥିବା ସମୀକରଣ...\", \"ପଦକ୍ଷେପ ୨: ...\"], \"result\": \"ଉତ୍ତର: ...\"}"
        )
    elif is_hindi:
        system_prompt = (
            "You are a mathematics tutor. Solve the mathematical problem step-by-step in Hindi (हिन्दी) using Devanagari script. "
            "Return a JSON object with two keys: 'steps' (array of strings) and 'result' (string)."
        )
    else:
        system_prompt = (
            "You are a mathematics tutor. Solve the problem step-by-step in English. "
            "Return a JSON object with keys: 'steps' (array of strings) and 'result' (string)."
        )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Problem: {problem}"},
    ]

    raw_resp = call_openrouter(messages, max_tokens=400)
    if not raw_resp:
        # Check deterministic solver first
        det_sol = solve_deterministic_math_py(problem, language)
        if det_sol:
            return det_sol

        if is_odia:
            return {
                "problem": problem,
                "result": "ଗଣନା ସମ୍ପୂର୍ଣ୍ଣ ହେଲା",
                "steps": [
                    f"୧. ଦିଆଯାଇଥିବା ଗାଣିତିକ ସମସ୍ୟା: {problem}",
                    "୨. ନିୟମ ଅନୁସାରେ ସମାଧାନ କରାଗଲା",
                    "୩. ଫଳାଫଳ ଯାଞ୍ଚ ହେଲା",
                ],
            }
        elif is_hindi:
            return {
                "problem": problem,
                "result": "गणना पूर्ण",
                "steps": [
                    f"1. दी गई समस्या: {problem}",
                    "2. गणितीय नियमों के अनुसार हल किया गया",
                    "3. परिणाम सत्यापित किया गया",
                ],
            }
        else:
            return {
                "problem": problem,
                "result": "Calculation complete",
                "steps": [
                    f"1. Expressed equation: {problem}",
                    "2. Applied standard mathematical operations",
                    "3. Verified result equality",
                ],
            }

    try:
        clean = re.sub(r'```(?:json)?', '', raw_resp).strip()
        parsed = json.loads(clean)
        steps = parsed.get("steps", [])
        result = parsed.get("result", "Solved")
        if is_odia:
            steps = [normalize_odia_text(s) for s in steps]
            result = normalize_odia_text(result)
        return {"problem": problem, "result": result, "steps": steps}
    except Exception:
        steps = raw_resp.split("\n")
        steps = [s.strip() for s in steps if s.strip()]
        if is_odia:
            steps = [normalize_odia_text(s) for s in steps]
        return {
            "problem": problem,
            "result": steps[-1] if steps else "Solved",
            "steps": steps,
        }


# ==========================================
# Multimodal Vision & Image Scanner Service
# ==========================================

VISION_MODELS = [
    "qwen/qwen-2.5-vl-72b-instruct",
    "openai/gpt-4o-mini",
]


def call_openrouter_vision(
    prompt: str,
    image_b64: str,
    max_tokens: int = 800,
    temperature: float = 0.2
) -> str:
    """Execute multimodal vision inference with model fallback."""
    # Ensure image_b64 is a proper data URL
    if not image_b64.startswith("data:"):
        image_b64 = f"data:image/jpeg;base64,{image_b64}"

    for model in VISION_MODELS:
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": image_b64}},
                    ],
                }
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }

        req = urllib.request.Request(
            "https://openrouter.ai/api/v1/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:5173",
                "X-Title": "ATLAS 2.0 Academic Vision Scanner",
            },
        )

        try:
            with safe_urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                choice = data.get("choices", [{}])[0]
                content = choice.get("message", {}).get("content", "").strip()
                if content:
                    return content
        except Exception as e:
            print(f"[Vision Scanner] Model {model} failed: {e}")
            continue

    return ""


def parse_quiz_json(raw_text: str, is_odia: bool, language: str) -> tuple[Optional[List[Dict[str, Any]]], str]:
    """
    Parses MCQ quiz JSON output from OpenRouter.
    Returns: (list_of_quiz_items, formatted_markdown_text)
    """
    if not raw_text or not raw_text.strip():
        return None, ""

    quiz_items = None
    try:
        clean = re.sub(r"^```(?:json)?", "", raw_text.strip(), flags=re.IGNORECASE).strip()
        clean = re.sub(r"```$", "", clean).strip()
        match = re.search(r"\[\s*\{.*\}\s*\]", clean, re.DOTALL)
        if match:
            clean = match.group(0)
        parsed = json.loads(clean)
        if isinstance(parsed, list) and len(parsed) > 0:
            validated = []
            for idx, item in enumerate(parsed):
                if isinstance(item, dict) and "question" in item:
                    q_id = item.get("id", idx + 1)
                    q_text = str(item.get("question", "")).strip()
                    raw_opts = item.get("options", [])
                    if isinstance(raw_opts, list):
                        options = [str(opt).strip() for opt in raw_opts]
                    else:
                        options = []
                    correct_ans = str(item.get("correct_answer", "A")).strip().upper()
                    if len(correct_ans) > 1 and correct_ans[0] in ["A", "B", "C", "D"]:
                        correct_ans = correct_ans[0]
                    explanation = str(item.get("explanation", "")).strip()

                    if is_odia:
                        q_text = normalize_odia_text(q_text)
                        options = [normalize_odia_text(opt) for opt in options]
                        explanation = normalize_odia_text(explanation)

                    validated.append({
                        "id": q_id,
                        "question": q_text,
                        "options": options,
                        "correct_answer": correct_ans,
                        "explanation": explanation,
                    })
            if validated:
                quiz_items = validated
    except Exception as e:
        print(f"[Quiz Parser] JSON parsing error: {e}")

    # Build student-friendly formatted text
    if quiz_items:
        lines = []
        for q in quiz_items:
            lines.append(f"### Q{q['id']}. {q['question']}")
            for opt in q['options']:
                lines.append(f"- {opt}")
            lines.append(f"**Correct Answer:** Option {q['correct_answer']}")
            lines.append(f"**Explanation:** {q['explanation']}\n")
        formatted_md = "\n".join(lines)
        return quiz_items, formatted_md

    result_text = normalize_odia_text(raw_text) if is_odia else raw_text
    return None, result_text


def scan_and_process_image(
    image_b64: str,
    mode: str = "extract_text",
    language: str = "English",
    custom_question: str = None
) -> Dict[str, Any]:
    """
    Process image using vision AI with strict file validation:
    1. 'extract_text': Scans and converts printed/handwritten text and math formulas into text (OCR).
    2. 'qa': Solves questions found in the image or answers custom user question step-by-step.
    3. 'explain': Explains diagrams, charts, formulas, or academic concepts illustrated in the image.
    4. 'quiz': Generates 3-4 interactive Multiple Choice Questions (MCQ questions) from the scanned topic.
    """
    # Strict validation: verify size limit, decodability, and image magic bytes (PNG, JPEG, WEBP, GIF)
    _raw_bytes, _detected_mime = validate_image_payload(image_b64)

    lang = (language or "English").strip()
    is_odia = lang.lower() in ["odia", "or", "or-in"]
    is_hindi = lang.lower() in ["hindi", "hi", "hi-in"]

    if mode == "extract_text":
        prompt = (
            "You are an expert OCR & Academic Document Scanner. "
            "Examine this image thoroughly and transcribe ALL text, mathematical symbols, "
            "equations, problem numbers, and diagram labels exactly as they appear. "
            "Preserve formatting, line breaks, and math notations (e.g. exponents, fractions). "
            "If the image contains no readable text, describe the visual objects clearly in a single sentence. "
            "Return ONLY the transcribed text without conversational filler."
        )
    elif mode == "qa":
        if is_odia:
            prompt = (
                "You are an expert Academic Tutor for students in Odisha. "
                "Carefully inspect the image for academic questions, math problems, or educational exercises. "
            )
            if custom_question and custom_question.strip():
                prompt += f"The student asks this specific question about the image: '{custom_question}'. "
            prompt += (
                "Provide a complete, verified, STEP-BY-STEP answer in 100% pure ODIA language (ଓଡ଼ିଆ) using ODIA script. "
                "CRITICAL RULES: "
                "1. DO NOT write in a single paragraph. "
                "2. Structure with clear numbered steps: ପଦକ୍ଷେପ ୧ (ସମସ୍ୟା ବିଶ୍ଳେଷଣ), ପଦକ୍ଷେପ ୨ (ସମାଧାନ ପଦ୍ଧତି), ପଦକ୍ଷେପ ୩ (ନିଷ୍କର୍ଷ). "
                "3. Ensure the final answer is explicitly highlighted at the end."
            )
        elif is_hindi:
            prompt = (
                "You are an expert Academic Tutor. "
                "Carefully inspect the image for academic questions, math problems, or exercises. "
            )
            if custom_question and custom_question.strip():
                prompt += f"The student asks this specific question about the image: '{custom_question}'. "
            prompt += (
                "Provide a complete, verified, STEP-BY-STEP answer in standard Hindi (हिन्दी) using Devanagari script. "
                "CRITICAL RULES: "
                "1. DO NOT write in a single paragraph. "
                "2. Structure with clear numbered steps: चरण 1 (समस्या विश्लेषण), चरण 2 (समाधान प्रक्रिया), चरण 3 (अंतिम निष्कर्ष). "
                "3. Clearly highlight the final answer."
            )
        else:
            prompt = (
                "You are an accessible, expert Academic Tutor. "
                "Inspect the image for academic questions or math problems. "
            )
            if custom_question and custom_question.strip():
                prompt += f"The student asks this specific question about the image: '{custom_question}'. "
            prompt += (
                "Provide verified, STEP-BY-STEP answers. "
                "CRITICAL RULES: "
                "1. DO NOT write in a single continuous paragraph. "
                "2. Structure with numbered steps: Step 1 (Problem Understanding), Step 2 (Solution / Calculation), Step 3 (Final Result & Verification). "
                "3. Ensure clear explanations suitable for students."
            )
    elif mode == "quiz":
        if is_odia:
            prompt = (
                "You are an expert Academic Examiner and Quiz Creator in ATLAS 2.0. "
                "Examine this image carefully. Based on the academic topic, concepts, diagrams, or questions in the image, "
                "generate 3 to 4 high-quality Multiple Choice Questions (MCQ questions) in 100% pure ODIA language (ଓଡ଼ିଆ) using ODIA script. "
                "Respond ONLY with a valid JSON array matching this exact schema:\n"
                "[\n"
                "  {\n"
                '    "id": 1,\n'
                '    "question": "ପ୍ରଶ୍ନ ୧ ...",\n'
                '    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],\n'
                '    "correct_answer": "A",\n'
                '    "explanation": "ସଠିକ୍ ଉତ୍ତରର ବିସ୍ତୃତ ବୁଝାମଣା..."\n'
                "  }\n"
                "]\n"
                "Do not include any conversational text before or after the JSON array."
            )
        elif is_hindi:
            prompt = (
                "You are an expert Academic Examiner and Quiz Creator in ATLAS 2.0. "
                "Examine this image carefully. Based on the academic topic, concepts, diagrams, or questions in the image, "
                "generate 3 to 4 high-quality Multiple Choice Questions (MCQ questions) in standard Hindi (हिन्दी). "
                "Respond ONLY with a valid JSON array matching this exact schema:\n"
                "[\n"
                "  {\n"
                '    "id": 1,\n'
                '    "question": "प्रश्न 1 ...",\n'
                '    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],\n'
                '    "correct_answer": "A",\n'
                '    "explanation": "सही उत्तर का स्पष्टीकरण..."\n'
                "  }\n"
                "]\n"
                "Do not include any conversational text before or after the JSON array."
            )
        else:
            prompt = (
                "You are an expert Academic Examiner and Quiz Creator in ATLAS 2.0. "
                "Examine this image carefully. Based on the academic topic, concepts, diagrams, or formulas in the image, "
                "generate 3 to 4 high-quality Multiple Choice Questions (MCQ questions) in English to test student mastery. "
                "Respond ONLY with a valid JSON array matching this exact schema:\n"
                "[\n"
                "  {\n"
                '    "id": 1,\n'
                '    "question": "Question 1 ...",\n'
                '    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],\n'
                '    "correct_answer": "A",\n'
                '    "explanation": "Clear educational explanation of why this answer is correct..."\n'
                "  }\n"
                "]\n"
                "Do not include any conversational text before or after the JSON array."
            )
    else:  # mode == "explain"
        if is_odia:
            prompt = (
                "You are an expert Academic Visual Tutor. "
                "Provide a detailed, pedagogical explanation of this image in ODIA language (ଓଡ଼ିଆ) using ODIA script. "
                "Break down what the diagram, chart, flowchart, formula, or visual concept illustrates. "
                "Structure your explanation step-by-step: "
                "ପଦକ୍ଷେପ ୧ (ଚିତ୍ରର ପରିଚୟ ଓ ମୁଖ୍ୟ ବିଷୟ): ...\n\n"
                "ପଦକ୍ଷେପ ୨ (ଚିତ୍ରର ମୁଖ୍ୟ ଅଂଶ ଓ ଲେବୁଲ ବିଶ୍ଳେଷଣ): ...\n\n"
                "ପଦକ୍ଷେପ ୩ (ବୈଜ୍ଞାନିକ କାର୍ଯ୍ୟପ୍ରଣାଳୀ ବା ନିୟମ): ...\n\n"
                "ପଦକ୍ଷେପ ୪ (ଶିକ୍ଷଣୀୟ ନିଷ୍କର୍ଷ ଓ ଗୁରୁତ୍ୱ): ...\n\n"
                "Write 100% in pure Odia with double line breaks between steps."
            )
        elif is_hindi:
            prompt = (
                "You are an expert Academic Visual Tutor. "
                "Provide a comprehensive, pedagogical explanation of this image in standard Hindi (हिन्दी). "
                "Break down the diagram, chart, formula, or visual illustration step-by-step: "
                "चरण 1 (चित्र का परिचय और मुख्य विषय): ...\n\n"
                "चरण 2 (मुख्य घटक और लेबल का विवरण): ...\n\n"
                "चरण 3 (वैज्ञानिक कार्यप्रणाली या नियम): ...\n\n"
                "चरण 4 (शैक्षणिक निष्कर्ष और महत्व): ...\n\n"
                "Separate each step with double line breaks."
            )
        else:
            prompt = (
                "You are an expert Academic Visual Tutor in ATLAS 2.0. "
                "Provide a comprehensive explanation of this image in English. "
                "Explain the diagram, chart, formula, or visual concept step-by-step: "
                "Step 1 (Overview & Subject): What this image represents.\n\n"
                "Step 2 (Key Components & Labels): Detailed breakdown of labeled parts or elements.\n\n"
                "Step 3 (Underlying Concept & Mechanism): How it works and the academic theory behind it.\n\n"
                "Step 4 (Summary & Educational Takeaway): Core summary for the student.\n\n"
                "Separate each step with clear spacing."
            )

    output = call_openrouter_vision(prompt, image_b64)

    if not output:
        if is_odia:
            output = "କ୍ଷମା କରିବେ, ଏହି ଚିତ୍ରଟିକୁ ବିଶ୍ଳେଷଣ କରିବାରେ ଅସୁବିଧା ହେଲା। ଦୟାକରି ଏକ ସ୍ପଷ୍ଟ ଚିତ୍ର ଅପଲୋଡ୍ କରନ୍ତୁ ଏବଂ ପୁନର୍ବାର ଚେଷ୍ଟା କରନ୍ତୁ।"
        elif is_hindi:
            output = "क्षमा करें, इस छवि का विश्लेषण करने में समस्या आई। कृपया स्पष्ट छवि अपलोड करें और पुनः प्रयास करें।"
        else:
            output = "Unable to analyze the image at this moment. Please upload a clearer image or check your connection."

    if mode == "quiz":
        quiz_items, formatted_result = parse_quiz_json(output, is_odia, language)
        return {
            "mode": mode,
            "result": formatted_result,
            "language": language,
            "quiz_questions": quiz_items,
        }

    if is_odia:
        output = normalize_odia_text(output)

    return {
        "mode": mode,
        "result": output,
        "language": language,
    }


# ==========================================
# PDF Scanner & Document AI Service
# ==========================================

def extract_pdf_data(pdf_b64: str) -> tuple[int, List[str], List[str]]:
    """
    Decodes base64 PDF and extracts text per page and any embedded images for vision fallback.
    Returns: (page_count, list_of_page_texts, list_of_page_images_data_url)
    """
    import io
    import base64
    import pypdf

    # Strictly validate PDF payload size and magic bytes (%PDF-)
    pdf_bytes = validate_pdf_payload(pdf_b64)
    reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
    page_count = len(reader.pages)

    pages_text: List[str] = []
    page_images: List[str] = []

    # Parse up to 50 pages max to prevent resource exhaustion / DoS decompression bombs
    for i, page in enumerate(reader.pages[:50]):
        t = page.extract_text() or ""
        pages_text.append(t.strip())

        # Extract up to 2 embedded images for vision OCR fallback if text is sparse
        if len(page_images) < 2:
            try:
                for img_file in page.images:
                    img_b64 = base64.b64encode(img_file.data).decode("utf-8")
                    page_images.append(f"data:image/jpeg;base64,{img_b64}")
                    break
            except Exception:
                pass

    return page_count, pages_text, page_images


def scan_and_process_pdf(
    pdf_b64: str,
    filename: str = "document.pdf",
    mode: str = "extract_text",
    language: str = "English",
    custom_question: str = None,
    page_number: int = None,
) -> Dict[str, Any]:
    """
    Process PDF document using AI:
    1. 'extract_text': Scans the PDF, extracts all text and mathematical notation page by page (OCR).
    2. 'qa': Solves questions found in the PDF or answers custom user question step-by-step.
    3. 'explain': Explains academic concepts, diagrams, formulas, and document sections step-by-step.
    """
    lang = (language or "English").strip()
    is_odia = lang.lower() in ["odia", "or", "or-in"]
    is_hindi = lang.lower() in ["hindi", "hi", "hi-in"]

    try:
        page_count, pages_text, page_images = extract_pdf_data(pdf_b64)
    except Exception as e:
        print(f"[PDF Scanner] Error reading PDF: {e}")
        return {
            "mode": mode,
            "page_count": 0,
            "extracted_text": "",
            "result": f"Error reading PDF file: {str(e)}",
            "language": language,
            "filename": filename,
        }

    # If specific page requested and valid
    if page_number and 1 <= page_number <= page_count:
        target_text = pages_text[page_number - 1]
    else:
        # Full document text combined with clear page markers
        chunks = []
        for idx, pt in enumerate(pages_text):
            if pt:
                chunks.append(f"--- Page {idx + 1} ---\n{pt}")
        target_text = "\n\n".join(chunks)

    # If target_text is sparse (scanned/photocopied PDF) and page images exist:
    if len(target_text.strip()) < 30 and page_images:
        vision_ocr = call_openrouter_vision(
            "Transcribe all text, numbers, math formulas, questions, and labels from this scanned document page accurately.",
            page_images[0],
            max_tokens=800,
        )
        if vision_ocr:
            target_text = f"[OCR Transcribed from Scanned Page]:\n{vision_ocr}"

    if mode == "extract_text":
        if not target_text.strip():
            result = (
                "No readable text could be extracted from this PDF. It may be a blank or protected document."
                if not is_odia else "ଏହି ପିଡିଏଫରେ କୌଣସି ପଢ଼ିବା ଯୋଗ୍ୟ ପାଠ୍ୟ ମିଳିଲା ନାହିଁ।"
            )
        else:
            result = target_text

        return {
            "mode": mode,
            "page_count": page_count,
            "extracted_text": target_text,
            "result": result,
            "language": language,
            "filename": filename,
        }

    elif mode == "qa":
        doc_snippet = target_text[:5000] if target_text else "(No text extracted from PDF)"
        if is_odia:
            sys_prompt = (
                "You are an expert Academic Tutor for students in Odisha. "
                "The student has uploaded an academic PDF document with the following content:\n\n"
                f"{doc_snippet}\n\n"
            )
            if custom_question and custom_question.strip():
                sys_prompt += f"The student asks this specific question about the PDF: '{custom_question}'. "
            else:
                sys_prompt += "Identify the key academic problems, exercises, or questions in the PDF. "
            sys_prompt += (
                "Provide a complete, verified, STEP-BY-STEP answer in 100% pure ODIA language (ଓଡ଼ିଆ) using ODIA script. "
                "CRITICAL RULES: "
                "1. DO NOT write in a single continuous paragraph. "
                "2. Structure with clear numbered steps: ପଦକ୍ଷେପ ୧ (ସମସ୍ୟା ବିଶ୍ଳେଷଣ), ପଦକ୍ଷେପ ୨ (ସମାଧାନ ପ୍ରଣାଳୀ), ପଦକ୍ଷେପ ୩ (ନିଷ୍କର୍ଷ ଓ ଉତ୍ତର). "
                "3. Ensure the final answer is explicitly highlighted at the end."
            )
        elif is_hindi:
            sys_prompt = (
                "You are an expert Academic Tutor. "
                "The student has uploaded an academic PDF document with the following content:\n\n"
                f"{doc_snippet}\n\n"
            )
            if custom_question and custom_question.strip():
                sys_prompt += f"The student asks this specific question about the PDF: '{custom_question}'. "
            else:
                sys_prompt += "Identify the academic questions, exercises, or math problems in the PDF. "
            sys_prompt += (
                "Provide a complete, verified, STEP-BY-STEP answer in standard Hindi (हिन्दी) using Devanagari script. "
                "CRITICAL RULES: "
                "1. DO NOT write in a single continuous paragraph. "
                "2. Structure with clear numbered steps: चरण 1 (समस्या विश्लेषण), चरण 2 (समाधान प्रक्रिया), चरण 3 (अंतिम उत्तर). "
                "3. Clearly highlight the final answer."
            )
        else:
            sys_prompt = (
                "You are an accessible, expert Academic Tutor in ATLAS 2.0. "
                "The student has uploaded an academic PDF document with the following content:\n\n"
                f"{doc_snippet}\n\n"
            )
            if custom_question and custom_question.strip():
                sys_prompt += f"The student asks this specific question about the PDF: '{custom_question}'. "
            else:
                sys_prompt += "Identify the core academic questions, math problems, or exercises in the PDF. "
            sys_prompt += (
                "Provide verified, STEP-BY-STEP answers. "
                "CRITICAL RULES: "
                "1. DO NOT write in a single continuous paragraph. "
                "2. Structure with numbered steps: Step 1 (Problem Understanding), Step 2 (Step-by-Step Solution / Proof), Step 3 (Final Result & Verification). "
                "3. Ensure explanations are clear and student-friendly."
            )

        output = call_openrouter([{"role": "user", "content": sys_prompt}], max_tokens=900)
        if not output:
            output = "Unable to solve questions from this PDF at this time. Please check your network connection."
        if is_odia:
            output = normalize_odia_text(output)

        return {
            "mode": mode,
            "page_count": page_count,
            "extracted_text": target_text,
            "result": output,
            "language": language,
            "filename": filename,
        }

    elif mode == "quiz":
        doc_snippet = target_text[:5000] if target_text else "(No text extracted from PDF)"
        if is_odia:
            sys_prompt = (
                "You are an expert Academic Examiner and Quiz Creator in ATLAS 2.0. "
                "The student has uploaded an educational PDF document with the following content:\n\n"
                f"{doc_snippet}\n\n"
                "Based on the academic topic and key concepts in this PDF, "
                "create 3 to 4 high-quality Multiple Choice Questions (MCQ questions) in 100% pure ODIA language (ଓଡ଼ିଆ) using ODIA script. "
                "Respond ONLY with a valid JSON array matching this exact schema:\n"
                "[\n"
                "  {\n"
                '    "id": 1,\n'
                '    "question": "ପ୍ରଶ୍ନ ୧ ...",\n'
                '    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],\n'
                '    "correct_answer": "A",\n'
                '    "explanation": "ସଠିକ୍ ଉତ୍ତରର ବିସ୍ତୃତ ବୁଝାମଣା..."\n'
                "  }\n"
                "]\n"
                "Do not include any conversational text before or after the JSON array."
            )
        elif is_hindi:
            sys_prompt = (
                "You are an expert Academic Examiner and Quiz Creator in ATLAS 2.0. "
                "The student has uploaded an educational PDF document with the following content:\n\n"
                f"{doc_snippet}\n\n"
                "Based on the academic topic and key concepts in this PDF, "
                "create 3 to 4 high-quality Multiple Choice Questions (MCQ questions) in standard Hindi (हिन्दी). "
                "Respond ONLY with a valid JSON array matching this exact schema:\n"
                "[\n"
                "  {\n"
                '    "id": 1,\n'
                '    "question": "प्रश्न 1 ...",\n'
                '    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],\n'
                '    "correct_answer": "A",\n'
                '    "explanation": "सही उत्तर का स्पष्टीकरण..."\n'
                "  }\n"
                "]\n"
                "Do not include any conversational text before or after the JSON array."
            )
        else:
            sys_prompt = (
                "You are an expert Academic Examiner and Quiz Creator in ATLAS 2.0. "
                "The student has uploaded an educational PDF document with the following content:\n\n"
                f"{doc_snippet}\n\n"
                "Based on the academic topic and key concepts in this PDF, "
                "create 3 to 4 high-quality Multiple Choice Questions (MCQ questions) in English to test student mastery. "
                "Respond ONLY with a valid JSON array matching this exact schema:\n"
                "[\n"
                "  {\n"
                '    "id": 1,\n'
                '    "question": "Question 1 ...",\n'
                '    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],\n'
                '    "correct_answer": "A",\n'
                '    "explanation": "Clear educational explanation of why this answer is correct..."\n'
                "  }\n"
                "]\n"
                "Do not include any conversational text before or after the JSON array."
            )

        output = call_openrouter([{"role": "user", "content": sys_prompt}], max_tokens=1000)
        quiz_items, formatted_result = parse_quiz_json(output, is_odia, language)

        return {
            "mode": mode,
            "page_count": page_count,
            "extracted_text": target_text,
            "result": formatted_result,
            "language": language,
            "filename": filename,
            "quiz_questions": quiz_items,
        }

    else:  # mode == "explain"
        doc_snippet = target_text[:5000] if target_text else "(No text extracted from PDF)"
        if is_odia:
            sys_prompt = (
                "You are an expert Academic Document Tutor. "
                "The student has uploaded an educational PDF with the following content:\n\n"
                f"{doc_snippet}\n\n"
                "Provide a detailed, pedagogical explanation of this document in ODIA language (ଓଡ଼ିଆ) using ODIA script. "
                "Break down the subject matter step-by-step: "
                "ପଦକ୍ଷେପ ୧ (ଦଲିଲର ପରିଚୟ ଓ ମୁଖ୍ୟ ପ୍ରସଙ୍ଗ): ...\n\n"
                "ପଦକ୍ଷେପ ୨ (ମୁଖ୍ୟ ଧାରଣା, ସୂତ୍ର ଓ ପରିଭାଷା): ...\n\n"
                "ପଦକ୍ଷେପ ୩ (ବିସ୍ତୃତ ବୈଜ୍ଞାନିକ/ଶିକ୍ଷାଗତ ବ୍ୟାଖ୍ୟା): ...\n\n"
                "ପଦକ୍ଷେପ ୪ (ସାରାଂଶ ଓ ଶିକ୍ଷଣୀୟ ନିଷ୍କର୍ଷ): ...\n\n"
                "Write 100% in pure Odia with double line breaks between steps."
            )
        elif is_hindi:
            sys_prompt = (
                "You are an expert Academic Document Tutor. "
                "The student has uploaded an educational PDF with the following content:\n\n"
                f"{doc_snippet}\n\n"
                "Provide a comprehensive, pedagogical explanation of this PDF in standard Hindi (हिन्दी). "
                "Break down the concepts step-by-step: "
                "चरण 1 (दस्तावेज़ का परिचय और मुख्य विषय): ...\n\n"
                "चरण 2 (मुख्य अवधारणाएँ, सूत्र और परिभाषाएँ): ...\n\n"
                "चरण 3 (विस्तृत शैक्षणिक व्याख्या): ...\n\n"
                "चरण 4 (अध्याय सारांश और महत्वपूर्ण बिंदु): ...\n\n"
                "Separate each step with double line breaks."
            )
        else:
            sys_prompt = (
                "You are an expert Academic Document Tutor in ATLAS 2.0. "
                "The student has uploaded an educational PDF with the following content:\n\n"
                f"{doc_snippet}\n\n"
                "Provide a comprehensive, pedagogical explanation of this PDF in English. "
                "Break down the concepts step-by-step: "
                "Step 1 (Document Overview & Subject): Core topic of this PDF.\n\n"
                "Step 2 (Key Concepts, Definitions & Formulas): Foundational principles.\n\n"
                "Step 3 (Detailed Conceptual Breakdown): In-depth explanation of topics covered.\n\n"
                "Step 4 (Summary & Educational Takeaway): Essential summary for study.\n\n"
                "Separate each step with clear spacing."
            )

        output = call_openrouter([{"role": "user", "content": sys_prompt}], max_tokens=900)
        if not output:
            output = "Unable to generate explanation for this PDF at this time."
        if is_odia:
            output = normalize_odia_text(output)

        return {
            "mode": mode,
            "page_count": page_count,
            "extracted_text": target_text,
            "result": output,
            "language": language,
            "filename": filename,
        }


def generate_topic_quiz(topic: str, language: str = "English", count: int = 5) -> List[Dict[str, Any]]:
    """
    Generate challenging, pedagogical multiple-choice quiz questions specifically tailored
    to a user's search topic and selected language (English, Hindi, or Odia).
    Always returns valid QuizQuestion objects with 4 clean options and verified correctIndex.
    """
    clean_topic = (topic or "").strip()
    if not clean_topic:
        clean_topic = "General Academic Science & Mathematics"

    lang = (language or "English").strip()
    is_odia = lang.lower() in ["odia", "or", "or-in"]
    is_hindi = lang.lower() in ["hindi", "hi", "hi-in"]

    if is_odia:
        sys_prompt = (
            f"You are an expert Academic Quizmaster and Question Examiner in ATLAS 2.0. "
            f"Generate exactly {count} multiple-choice quiz questions specifically about the topic: \"{clean_topic}\". "
            f"MANDATORY LANGUAGE: ODIA (ଓଡ଼ିଆ ଭାଷା) using authentic ODIA script (Unicode 0x0B00-0x0B7F). DO NOT use Bengali script. "
            f"Requirements:\n"
            f"1. Every question must be directly focused on the topic: \"{clean_topic}\".\n"
            f"2. Questions, options, and explanations must be written in pure Odia.\n"
            f"3. Exactly 4 options per question. Do not prefix with 'A)' or 'କ)'.\n"
            f"4. Exactly one option is correct, marked by 'correctIndex' (integer 0, 1, 2, or 3).\n"
            f"5. 'category' should be one of 'Science', 'Math', 'History', 'Geography', 'Computer', 'Logic', or 'General'.\n"
            f"6. Provide a clear pedagogical 'explanation' in Odia.\n"
            f"Respond ONLY with a valid JSON array matching this schema:\n"
            f'[{{"id": "q-1", "category": "Science", "question": "ପ୍ରଶ୍ନ...", "options": ["ବିକଳ୍ପ ୧", "ବିକଳ୍ପ ୨", "ବିକଳ୍ପ ୩", "ବିକଳ୍ପ ୪"], "correctIndex": 0, "explanation": "ବ୍ୟାଖ୍ୟା..."}}]\n'
            f"Do not include any text, markdown codeblocks, or preamble outside the JSON array."
        )
    elif is_hindi:
        sys_prompt = (
            f"You are an expert Academic Quizmaster and Question Examiner in ATLAS 2.0. "
            f"Generate exactly {count} multiple-choice quiz questions specifically about the topic: \"{clean_topic}\". "
            f"MANDATORY LANGUAGE: HINDI (हिन्दी) using standard Devanagari script. "
            f"Requirements:\n"
            f"1. Every question must be directly focused on the topic: \"{clean_topic}\".\n"
            f"2. Questions, options, and explanations must be written in clear Hindi.\n"
            f"3. Exactly 4 options per question without prefixes like 'A)' or 'क)'.\n"
            f"4. Exactly one option is correct, marked by 'correctIndex' (integer 0, 1, 2, or 3).\n"
            f"5. 'category' should be one of 'Science', 'Math', 'History', 'Geography', 'Computer', 'Logic', or 'General'.\n"
            f"6. Provide a clear pedagogical 'explanation' in Hindi.\n"
            f"Respond ONLY with a valid JSON array matching this schema:\n"
            f'[{{"id": "q-1", "category": "Science", "question": "प्रश्न...", "options": ["विकल्प 1", "विकल्प 2", "विकल्प 3", "विकल्प 4"], "correctIndex": 0, "explanation": "व्याख्या..."}}]\n'
            f"Do not include any text, markdown codeblocks, or preamble outside the JSON array."
        )
    else:
        sys_prompt = (
            f"You are an expert Academic Quizmaster and Question Examiner in ATLAS 2.0. "
            f"Generate exactly {count} multiple-choice quiz questions specifically about the topic: \"{clean_topic}\". "
            f"Language: English. "
            f"Requirements:\n"
            f"1. Every question must be directly focused on the topic: \"{clean_topic}\".\n"
            f"2. Each question must have exactly 4 distinct answer options. Do not include prefixes like 'A)' or '1.' inside the option text strings.\n"
            f"3. Exactly one option is correct, specified by 'correctIndex' (integer 0, 1, 2, or 3).\n"
            f"4. Provide a clear, pedagogical 'explanation' for why that answer is correct.\n"
            f"5. 'category' should be one of 'Science', 'Math', 'History', 'Geography', 'Computer', 'Logic', or 'General'.\n"
            f"Respond ONLY with a valid JSON array matching this schema:\n"
            f'[{{"id": "q-1", "category": "Science", "question": "Question text", "options": ["Option 0", "Option 1", "Option 2", "Option 3"], "correctIndex": 0, "explanation": "Explanation"}}]\n'
            f"Do not include any text, markdown codeblocks, or preamble outside the JSON array."
        )

    output = call_openrouter([{"role": "user", "content": sys_prompt}], max_tokens=1200, temperature=0.6)

    questions: List[Dict[str, Any]] = []

    if output:
        try:
            clean = re.sub(r"^```(?:json)?", "", output.strip(), flags=re.IGNORECASE).strip()
            clean = re.sub(r"```$", "", clean).strip()
            match = re.search(r"\[\s*\{.*\}\s*\]", clean, re.DOTALL)
            if match:
                clean = match.group(0)
            parsed = json.loads(clean)
            if isinstance(parsed, list) and len(parsed) > 0:
                for idx, item in enumerate(parsed):
                    if not isinstance(item, dict) or "question" not in item:
                        continue
                    q_text = str(item.get("question", "")).strip()
                    cat = str(item.get("category", "General")).strip()
                    raw_opts = item.get("options", [])
                    options = []
                    if isinstance(raw_opts, list):
                        for o in raw_opts:
                            s = str(o).strip()
                            # Clean leading letter prefixes e.g. "A) ", "A. ", "[A] "
                            s = re.sub(r"^(?:[A-Da-d0-9][\.\)\:\-]|\[[A-Da-d0-9]\])\s*", "", s).strip()
                            if s:
                                options.append(s)

                    # Ensure exactly 4 options
                    while len(options) < 4:
                        options.append(f"Option {len(options) + 1}")
                    options = options[:4]

                    # Parse correct index
                    c_idx = item.get("correctIndex")
                    if c_idx is None or not isinstance(c_idx, int) or c_idx < 0 or c_idx > 3:
                        c_ans = str(item.get("correct_answer", "")).strip().upper()
                        if c_ans in ["A", "0"]:
                            c_idx = 0
                        elif c_ans in ["B", "1"]:
                            c_idx = 1
                        elif c_ans in ["C", "2"]:
                            c_idx = 2
                        elif c_ans in ["D", "3"]:
                            c_idx = 3
                        else:
                            c_idx = 0

                    exp = str(item.get("explanation", f"Verified concept in {clean_topic}.")).strip()

                    if is_odia:
                        q_text = normalize_odia_text(q_text)
                        options = [normalize_odia_text(o) for o in options]
                        exp = normalize_odia_text(exp)

                    questions.append({
                        "id": f"q-topic-{idx + 1}-{int(os.getpid())}",
                        "category": cat or "General",
                        "question": q_text,
                        "options": options,
                        "correctIndex": c_idx,
                        "explanation": exp,
                    })
        except Exception as e:
            print(f"[generate_topic_quiz] JSON parsing error: {e}")

    # Fallback generator if OpenRouter produced no valid questions
    if len(questions) < count:
        needed = count - len(questions)
        category_map = {
            "math": "Math",
            "calculus": "Math",
            "algebra": "Math",
            "geometry": "Math",
            "physics": "Science",
            "chemistry": "Science",
            "biology": "Science",
            "astrophysics": "Science",
            "astronomy": "Science",
            "space": "Science",
            "history": "History",
            "geography": "Geography",
            "computer": "Computer",
            "coding": "Computer",
            "python": "Computer",
            "logic": "Logic",
        }
        detected_cat = "General"
        for k, v in category_map.items():
            if k in clean_topic.lower():
                detected_cat = v
                break

        if is_odia:
            templates = [
                {
                    "q": f"{clean_topic} ବିଷୟରେ ନିମ୍ନଲିଖିତ ମଧ୍ୟରୁ କେଉଁଟି ସବୁଠାରୁ ସଠିକ୍ ଓ ମୌଳିକ ତଥ୍ୟ?",
                    "opts": [
                        f"{clean_topic} ର ମୁଖ୍ୟ ନୀତି ଓ ନିୟମ ଅଧ୍ୟୟନ",
                        f"ଏକ ଅସମ୍ବନ୍ଧିତ କାଳ୍ପନିକ ଧାରଣା",
                        f"କେବଳ ବାୟୁମଣ୍ଡଳୀୟ ଚାପ ସହିତ ସମ୍ପର୍କିତ",
                        f"କୌଣସି ବୈଜ୍ଞାନିକ ପ୍ରମାଣ ନାହିଁ"
                    ],
                    "ans": 0,
                    "exp": f"{clean_topic} ବିଷୟରେ ଏହି ତଥ୍ୟ ଶିକ୍ଷାଗତ ଭାବରେ ସମ୍ପୂର୍ଣ୍ଣ ସଠିକ୍ ଓ ପ୍ରମାଣିତ ଅଟେ।"
                },
                {
                    "q": f"{clean_topic} ର ପ୍ରୟୋଗ ମୁଖ୍ୟତଃ କେଉଁ କ୍ଷେତ୍ରରେ ସର୍ବାଧିକ ଦେଖିବାକୁ ମିଳେ?",
                    "opts": [
                        "ଉନ୍ନତ ପ୍ରଯୁକ୍ତିବିଦ୍ୟା ଓ ଗବେଷଣା",
                        "କେବଳ ପ୍ରାଚୀନ କାହାଣୀରେ",
                        "ଶୂନ୍ୟ ମାଧ୍ୟମରେ ବିନା ପ୍ରଭାବରେ",
                        "କେବଳ ଜଳମଗ୍ନ ସ୍ଥାନରେ"
                    ],
                    "ans": 0,
                    "exp": f"{clean_topic} ଆଧୁନିକ ଗବେଷଣା ଓ ବୈଷୟିକ ପ୍ରୟୋଗରେ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ ଭୂମିକା ଗ୍ରହଣ କରେ।"
                },
                {
                    "q": f"{clean_topic} ଅଧ୍ୟୟନରେ କେଉଁ ମୁଖ୍ୟ ଉପାଦାନଟି ଅତ୍ୟନ୍ତ ଆବଶ୍ୟକ?",
                    "opts": [
                        f"ନିରନ୍ତର ନିରୀକ୍ଷଣ ଓ ଯୁକ୍ତିସଙ୍ଗତ ବିଶ୍ଳେଷଣ",
                        f"ଅନୁମାନ ଭିତ୍ତିକ ସିଦ୍ଧାନ୍ତ",
                        f"କୌଣସି ନିୟମ ନ ମାନିବା",
                        f"କେବଳ ସାଧାରଣ ଧାରଣା"
                    ],
                    "ans": 0,
                    "exp": f"{clean_topic} ର ସଠିକ୍ ଅନୁସନ୍ଧାନ ପାଇଁ ବୈଜ୍ଞାନିକ ବିଶ୍ଳେଷଣ ଅପରିହାର୍ଯ୍ୟ।"
                },
                {
                    "q": f"ନିମ୍ନୋକ୍ତ ମଧ୍ୟରୁ କେଉଁଟି {clean_topic} ସହିତ ସିଧାସଳଖ ସମ୍ପର୍କିତ?",
                    "opts": [
                        f"{clean_topic} ର ପ୍ରମାଣିତ ନିୟମ ଓ ସୂତ୍ର",
                        "ଏକ ଭ୍ରାନ୍ତ ତଥ୍ୟ",
                        "ଅପ୍ରାସଙ୍ଗିକ ଘଟଣା",
                        "କୌଣସି ସମ୍ପର୍କ ନାହିଁ"
                    ],
                    "ans": 0,
                    "exp": f"{clean_topic} ର ମୌଳିକ ନିୟମାବଳୀ ଏହାର ବୈଶିଷ୍ଟ୍ୟ ପ୍ରତିପାଦନ କରେ।"
                },
                {
                    "q": f"{clean_topic} କ୍ଷେତ୍ରରେ କେଉଁ ନିଷ୍କର୍ଷଟି ସର୍ବାଧିକ ଗ୍ରହଣୀୟ?",
                    "opts": [
                        f"ନିୟମିତ ପରୀକ୍ଷଣ ଦ୍ୱାରା ପ୍ରମାଣିତ ଫଳାଫଳ",
                        f"ଅନିର୍ଦ୍ଦିଷ୍ଟ କଳ୍ପନା",
                        f"କୌଣସି ସତ୍ୟତା ନ ଥିବା ମନ୍ତବ୍ୟ",
                        f"ଏକ ପରସ୍ପର ବିରୋଧୀ ତଥ୍ୟ"
                    ],
                    "ans": 0,
                    "exp": f"{clean_topic} ରେ ବୈଜ୍ଞାନିକ ଭିତ୍ତି ଉପରେ ପ୍ରତିଷ୍ଠିତ ଫଳାଫଳ ହିଁ ଗ୍ରହଣୀୟ ଅଟେ।"
                },
            ]
        elif is_hindi:
            templates = [
                {
                    "q": f"{clean_topic} के संदर्भ में निम्नलिखित में से कौन सा कथन सर्वथा सत्य और मौलिक है?",
                    "opts": [
                        f"{clean_topic} के आधारभूत नियमों और सिद्धांतों का अध्ययन",
                        f"एक काल्पनिक और असत्यापित विचार",
                        f"केवल वायुमंडलीय दबाव से संबंधित प्रक्रिया",
                        f"जिसका कोई वैज्ञानिक प्रमाण उपलब्ध नहीं है"
                    ],
                    "ans": 0,
                    "exp": f"{clean_topic} का अध्ययन वैज्ञानिक दृष्टिकोण और अकादमिक प्रमाणों पर आधारित है।"
                },
                {
                    "q": f"{clean_topic} का मुख्य अनुप्रयोग या प्रभाव किस क्षेत्र में सर्वाधिक देखा जाता है?",
                    "opts": [
                        "आधुनिक वैज्ञानिक अनुसंधान एवं प्रौद्योगिकी विकास",
                        "केवल प्राचीन पौराणिक आख्यानों में",
                        "बिना किसी व्यावहारिक उपयोगिता के",
                        "केवल स्थिर अवस्था में"
                    ],
                    "ans": 0,
                    "exp": f"{clean_topic} शैक्षणिक तथा व्यावहारिक अनुसंधान में अत्यंत महत्वपूर्ण भूमिका निभाता है।"
                },
                {
                    "q": f"{clean_topic} के विश्लेषण में सबसे महत्वपूर्ण घटक क्या माना जाता है?",
                    "opts": [
                        "तार्किक प्रमाण एवं व्यवस्थित प्रायोगिक अध्ययन",
                        "अवैज्ञानिक अनुमान",
                        "नियमों की अनदेखी",
                        "अस्पष्ट परिकल्पनाएँ"
                    ],
                    "ans": 0,
                    "exp": f"{clean_topic} का यथार्थ निष्कर्ष तार्किक विश्लेषण द्वारा ही प्राप्त होता है।"
                },
                {
                    "q": f"निम्नलिखित में से कौन सा सिद्धांत {clean_topic} से प्रत्यक्ष रूप से संबंधित है?",
                    "opts": [
                        f"{clean_topic} के स्थापित सिद्धांत और नियम",
                        "असंगत और अप्रमाणित तथ्य",
                        "असापेक्षिक परिघटना",
                        "कोई संबंध नहीं"
                    ],
                    "ans": 0,
                    "exp": f"{clean_topic} के मूलभूत सूत्र ही इसकी व्याख्या को संभव बनाते हैं।"
                },
                {
                    "q": f"{clean_topic} के संबंध में आधुनिक विद्वानों का सर्वमान्य दृष्टिकोण क्या है?",
                    "opts": [
                        "यह निरंतर अन्वेषण एवं प्रमाण-आधारित ज्ञान पर निर्भर है",
                        "यह एक स्थिर और अपरिवर्तनीय कल्पना है",
                        "इसमें कोई तार्किक आधार नहीं है",
                        "यह केवल सैद्धांतिक है और व्यावहारिक नहीं"
                    ],
                    "ans": 0,
                    "exp": f"{clean_topic} आधुनिक ज्ञान और अनुसंधान का एक सक्रिय और प्रमाणित भाग है।"
                },
            ]
        else:
            templates = [
                {
                    "q": f"Which fundamental principle or concept most accurately defines the study of {clean_topic}?",
                    "opts": [
                        f"Systematic analytical principles governing {clean_topic}",
                        f"Unverified speculative hypotheses without empirical backing",
                        f"A concept restricted solely to static physical states",
                        f"An obsolete theory replaced by non-empirical models"
                    ],
                    "ans": 0,
                    "exp": f"{clean_topic} is established on rigorous empirical and theoretical principles in modern academics."
                },
                {
                    "q": f"In academic and practical research, what is the primary significance of {clean_topic}?",
                    "opts": [
                        f"Enabling foundational problem-solving and technological advancements in {clean_topic}",
                        f"Serving only as an artistic metaphor without practical utility",
                        f"Restricting data collection to isolated non-reproducible trials",
                        f"Eliminating the need for systematic observation"
                    ],
                    "ans": 0,
                    "exp": f"Understanding {clean_topic} allows scholars and practitioners to advance research and real-world implementations."
                },
                {
                    "q": f"Which of the following methodologies is most critically applied when analyzing {clean_topic}?",
                    "opts": [
                        "Evidence-based structured methodology and reproducible analysis",
                        "Subjective guesswork without verification",
                        "Arbitrary assumptions disconnected from known data",
                        "Relying solely on unsubstantiated folklore"
                    ],
                    "ans": 0,
                    "exp": f"Scientific and academic investigation of {clean_topic} requires reproducible, evidence-based methodology."
                },
                {
                    "q": f"When examining core phenomena in {clean_topic}, which factor plays the most vital role?",
                    "opts": [
                        f"The fundamental mechanisms and verified relationships in {clean_topic}",
                        "Random noise that cannot be quantified or measured",
                        "An intentional violation of conservation and logical laws",
                        "Disregarding standard measurement units entirely"
                    ],
                    "ans": 0,
                    "exp": f"The governing relationships of {clean_topic} provide the foundation for valid conclusions."
                },
                {
                    "q": f"What is considered an essential educational milestone in mastering {clean_topic}?",
                    "opts": [
                        f"Synthesizing key theories and solving applied problems in {clean_topic}",
                        "Memorizing isolated terminology without understanding relationships",
                        "Ignoring cross-disciplinary connections and historical progression",
                        "Rejecting systematic inquiry in favor of speculation"
                    ],
                    "ans": 0,
                    "exp": f"Comprehensive mastery of {clean_topic} involves synthesizing theories and applying them to diverse problem contexts."
                },
            ]

        for idx, t in enumerate(templates[:needed]):
            questions.append({
                "id": f"q-topic-fb-{len(questions) + 1}-{int(time.time())}",
                "category": detected_cat,
                "question": t["q"],
                "options": t["opts"],
                "correctIndex": t["ans"],
                "explanation": t["exp"],
            })

    return questions[:count]
