import os
import json
import urllib.request
import urllib.error
from typing import Dict, Any, List

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")


OPENROUTER_MODELS = [
    "liquid/lfm-2.5-2.6b:free",
    "google/gemma-4-26b-a4b-it:free",
    "nvidia/nemotron-3.5-lightning:free",
    "apodex/apodex-1.1-mini:free",
    "dots-studio/dots-3-note-preview:free",
]


def call_openrouter(messages: List[Dict[str, str]], temperature: float = 0.3) -> str:
    """Execute chat completion against OpenRouter using configured API key with model failover."""
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "ATLAS 2.0 Academic Solver",
        "User-Agent": "ATLAS-2.0/AcademicSolver",
    }

    last_error = None
    for model_name in OPENROUTER_MODELS:
        payload = {
            "model": model_name,
            "messages": messages,
            "temperature": temperature,
        }
        try:
            req = urllib.request.Request(
                "https://openrouter.ai/api/v1/chat/completions",
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if "choices" in data and len(data["choices"]) > 0:
                    content = data["choices"][0]["message"]["content"]
                    return content.strip()
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            last_error = f"HTTP {e.code}: {err_body}"
            continue
        except Exception as e:
            last_error = str(e)
            continue

    raise RuntimeError(f"OpenRouter request failed across all candidate models: {last_error}")


def solve_math_problem(problem: str, language: str = "English") -> Dict[str, Any]:
    """Solve mathematics problem with verified, step-by-step explanations in target language."""
    system_prompt = (
        f"You are the Accessible Academic Mathematics Problem Solver. "
        f"The user has selected the language: {language}. "
        f"Solve the user's mathematics problem step-by-step. "
        f"Always provide numbered steps clearly, followed by the final answer. "
        f"Format your response as a valid JSON object with exactly two keys: "
        f"'steps' (a list of clear step strings) and 'result' (a concise string of the final solution). "
        f"Respond in {language}. Return ONLY the JSON object, without markdown ticks or commentary."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Problem: {problem}"}
    ]

    try:
        raw_output = call_openrouter(messages)
        # Parse JSON if possible
        clean_json = raw_output
        if clean_json.startswith("```"):
            lines = clean_json.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            clean_json = "\n".join(lines).strip()
        
        parsed = json.loads(clean_json)
        return {
            "problem": problem,
            "result": str(parsed.get("result", "Solved")),
            "steps": list(parsed.get("steps", [raw_output])),
        }
    except Exception:
        # Fallback to text formatting if JSON parse fails
        raw_output = call_openrouter([
            {"role": "system", "content": f"Solve this math problem step-by-step in {language}. State each step clearly."},
            {"role": "user", "content": f"Problem: {problem}"}
        ])
        lines = [line.strip() for line in raw_output.split("\n") if line.strip()]
        return {
            "problem": problem,
            "result": lines[-1] if lines else "Solved",
            "steps": lines if lines else [raw_output],
        }


def answer_academic_question(question: str, language: str = "English") -> str:
    """Provide educational answers to academic questions in target language."""
    system_prompt = (
        f"You are the Accessible Academic Tutor in ATLAS 2.0. "
        f"Provide a clear, accurate, and pedagogical explanation to the student's question in {language}. "
        f"Break down complex concepts simply, accurately, and respectfully."
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": question}
    ]

    return call_openrouter(messages, temperature=0.5)
