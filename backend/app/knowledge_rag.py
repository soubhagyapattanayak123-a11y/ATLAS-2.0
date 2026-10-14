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


def find_relevant_exemplars(query: str, language: str = "English", max_exemplars: int = 2) -> List[Dict[str, Any]]:
    """
    Search dataset for problems relevant to query keywords and mathematical patterns.
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
                score += 3
            else:
                kw_tokens = set(re.findall(r"\w+", kw_clean))
                if kw_tokens and kw_tokens.issubset(q_tokens):
                    score += 2

        # Check topic and subject
        topic = item.get("topic", "").lower()
        if any(t in q_clean for t in re.findall(r"\w+", topic) if len(t) > 3):
            score += 1.5

        if score > 0:
            scored_items.append((score, item))

    # Sort descending by relevance score
    scored_items.sort(key=lambda x: x[0], reverse=True)
    return [item for _, item in scored_items[:max_exemplars]]


def format_exemplars_for_prompt(exemplars: List[Dict[str, Any]], language: str = "English") -> str:
    """
    Format retrieved complex exemplars into an In-Context Learning prompt block.
    """
    if not exemplars:
        return ""

    is_odia = language.lower() in ["odia", "or", "or-in"]
    is_hindi = language.lower() in ["hindi", "hi", "hi-in"]

    header = "--- RELEVANT VERIFIED RIGOROUS ACADEMIC EXEMPLARS ---\n"
    header += "Use the following verified step-by-step methodologies as a gold-standard reference for rigorous solving:\n\n"

    blocks = []
    for idx, ex in enumerate(exemplars, 1):
        q = ex.get("question")
        if is_odia and ex.get("question_odia"):
            q = ex.get("question_odia")
        elif is_hindi and ex.get("question_hindi"):
            q = ex.get("question_hindi")

        steps = "\n".join(ex.get("steps", []))
        res = ex.get("result", "")
        block = (
            f"EXEMPLAR {idx} [{ex.get('subject', 'STEM')} - {ex.get('topic', '')} ({ex.get('difficulty', '')})]:\n"
            f"Problem: {q}\n"
            f"Solution Steps:\n{steps}\n"
            f"Final Answer: {res}\n"
        )
        blocks.append(block)

    footer = "--- END OF EXEMPLARS. Now solve the student's problem with equal mathematical/scientific rigor. ---\n"
    return header + "\n".join(blocks) + "\n" + footer
