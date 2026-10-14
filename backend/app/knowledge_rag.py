import json
import re
from pathlib import Path
from typing import List, Dict, Any, Optional

DATASET_PATH = Path(__file__).resolve().parent / "dataset" / "complex_problems_bank.json"

_cached_dataset: Optional[List[Dict[str, Any]]] = None


def load_dataset() -> List[Dict[str, Any]]:
    """Load and cache the complex problem dataset."""
    global _cached_dataset
    if _cached_dataset is not None:
        return _cached_dataset

    if DATASET_PATH.exists():
        try:
            with open(DATASET_PATH, "r", encoding="utf-8") as f:
                _cached_dataset = json.load(f)
                return _cached_dataset
        except Exception as e:
            print(f"[Knowledge RAG] Error loading dataset: {e}")
            return []
    return []


# Anti-Overfeeding Thresholds: Prevents context flooding and prompt bloat
MIN_RELEVANCE_SCORE = 3.5   # Stricter threshold: only inject on strong semantic overlap
MAX_EXEMPLAR_CHARACTERS = 600  # Strict character budget cap per exemplar


def find_relevant_exemplars(
    query: str,
    language: str = "English",
    max_exemplars: int = 1,  # Anti-overfeeding: default to 1 highly-targeted exemplar
    min_score: float = MIN_RELEVANCE_SCORE,
) -> List[Dict[str, Any]]:
    """
    Search dataset for problems relevant to query keywords and mathematical patterns.
    Enforces strict relevance thresholding to prevent prompt overfeeding.
    """
    dataset = load_dataset()
    if not dataset:
        return []

    q_clean = query.lower()
    q_tokens = set(re.findall(r"\w+", q_clean))

    scored_items = []
    for item in dataset:
        score = 0
        keywords = item.get("keywords", [])
        for kw in keywords:
            kw_clean = kw.lower()
            if kw_clean in q_clean:
                score += 3.5
            else:
                kw_tokens = set(re.findall(r"\w+", kw_clean))
                if kw_tokens and kw_tokens.issubset(q_tokens):
                    score += 2.0

        # Topic & Subject correlation
        topic = item.get("topic", "").lower()
        if any(t in q_clean for t in re.findall(r"\w+", topic) if len(t) > 3):
            score += 1.5

        # Anti-overfeeding filter: discard low-confidence/spurious matches
        if score >= min_score:
            scored_items.append((score, item))

    # If no items reach the strict threshold, return empty (clean prompt, 0 overfeeding)
    if not scored_items:
        return []

    # Sort descending by relevance score
    scored_items.sort(key=lambda x: x[0], reverse=True)
    return [item for _, item in scored_items[:max_exemplars]]


def format_exemplars_for_prompt(exemplars: List[Dict[str, Any]], language: str = "English") -> str:
    """
    Format retrieved complex exemplars with strict anti-overfitting isolation boundaries.
    Instructs the LLM to learn the structure without copying values or drifting from the user query.
    """
    if not exemplars:
        return ""

    is_odia = language.lower() in ["odia", "or", "or-in"]
    is_hindi = language.lower() in ["hindi", "hi", "hi-in"]

    header = (
        "\n<reference_structure_guide>\n"
        "[ANTI-OVERFITTING GUARD]: The following verified problem is provided ONLY as an example of "
        "rigorous 4-step pedagogical structuring and formula presentation.\n"
        "DO NOT copy its numbers, topic, or solution. Focus 100% on solving the user's actual question below.\n\n"
    )

    blocks = []
    for idx, ex in enumerate(exemplars, 1):
        q = ex.get("question")
        if is_odia and ex.get("question_odia"):
            q = ex.get("question_odia")
        elif is_hindi and ex.get("question_hindi"):
            q = ex.get("question_hindi")

        steps = "\n".join(ex.get("steps", []))
        if len(steps) > MAX_EXEMPLAR_CHARACTERS:
            steps = steps[:MAX_EXEMPLAR_CHARACTERS] + "..."

        res = ex.get("result", "")
        block = (
            f"Exemplar Format Reference [{ex.get('subject', 'STEM')} - {ex.get('topic', '')}]:\n"
            f"Problem Template: {q}\n"
            f"Sample Methodology:\n{steps}\n"
            f"Sample Answer Format: {res}\n"
        )
        blocks.append(block)

    footer = "</reference_structure_guide>\n"
    return header + "\n".join(blocks) + "\n" + footer
