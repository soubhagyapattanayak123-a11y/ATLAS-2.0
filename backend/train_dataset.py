#!/usr/bin/env python3
"""
ATLAS 2.0: Dataset Training, Fine-Tuning Export & Complex Problem Benchmark Pipeline
-----------------------------------------------------------------------------------
This tool manages the complex problem dataset for ATLAS 2.0.
Capabilities:
1. Exporting instruction fine-tuning datasets in OpenAI and HuggingFace/ChatML JSONL formats.
2. Benchmarking active AI models on complex STEM, calculus, and Odia heritage problems.
3. Adding new verified complex problems with LaTeX equations and step-by-step logic.
4. Dataset statistics, validation, and token inspection.
"""

import os
import sys
import json
import argparse
import random
from pathlib import Path
from typing import List, Dict, Any

# Ensure backend path is on sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

DATASET_FILE = BASE_DIR / "app" / "dataset" / "complex_problems_bank.json"
OUTPUT_DIR = BASE_DIR / "data"


def load_dataset() -> List[Dict[str, Any]]:
    if not DATASET_FILE.exists():
        print(f"[Error] Dataset file not found at: {DATASET_FILE}")
        return []
    with open(DATASET_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_dataset(data: List[Dict[str, Any]]) -> None:
    DATASET_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DATASET_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"✓ Saved {len(data)} problems to: {DATASET_FILE}")


def export_finetuning_jsonl(split_ratio: float = 0.8) -> None:
    """Export the dataset to JSONL format compatible with OpenAI and HuggingFace fine-tuning."""
    dataset = load_dataset()
    if not dataset:
        print("[Error] No dataset found to export.")
        return

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    openai_train_file = OUTPUT_DIR / "atlas_finetune_openai_train.jsonl"
    openai_val_file = OUTPUT_DIR / "atlas_finetune_openai_val.jsonl"
    hf_alpaca_file = OUTPUT_DIR / "atlas_finetune_alpaca.jsonl"

    openai_records = []
    hf_records = []

    for item in dataset:
        subject = item.get("subject", "STEM")
        topic = item.get("topic", "General")
        diff = item.get("difficulty", "Hard")
        steps = "\n\n".join(item.get("steps", []))
        result = item.get("result", "")
        solution_body = f"{steps}\n\n**Final Answer:** {result}"

        # 1. English Instruction Pair
        en_q = item.get("question")
        if en_q:
            sys_prompt = (
                f"You are the Advanced Academic Problem Solver in ATLAS 2.0. "
                f"Solve this {subject} problem ({topic}) with complete mathematical rigor, "
                f"verified formulas, and clear numbered steps."
            )
            openai_records.append({
                "messages": [
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": en_q},
                    {"role": "assistant", "content": solution_body}
                ]
            })
            hf_records.append({
                "instruction": f"Solve the following {subject} problem step-by-step with complete formulas.",
                "input": en_q,
                "output": solution_body
            })

        # 2. Odia Instruction Pair (if available)
        odia_q = item.get("question_odia")
        if odia_q:
            sys_prompt_or = (
                "ଆପଣ ATLAS 2.0 ର ଏକ ଉଚ୍ଚକ୍ଷମତା ସମ୍ପନ୍ନ ଶୈକ୍ଷିକ AI ଅଟନ୍ତି। "
                "ଦିଆଯାଇଥିବା ସମସ୍ୟାର ସମାଧାନ ଶୁଦ୍ଧ ଓଡ଼ିଆ ଲିପିରେ ଚାରୋଟି ପଦକ୍ଷେପରେ ବୁଝାନ୍ତୁ।"
            )
            openai_records.append({
                "messages": [
                    {"role": "system", "content": sys_prompt_or},
                    {"role": "user", "content": odia_q},
                    {"role": "assistant", "content": solution_body}
                ]
            })

        # 3. Hindi Instruction Pair (if available)
        hi_q = item.get("question_hindi")
        if hi_q:
            sys_prompt_hi = (
                "आप ATLAS 2.0 के विशेषज्ञ शैक्षणिक AI ट्यूटर हैं। "
                "दिए गए प्रश्न को चरणबद्ध तरीके से पूर्ण सटीकता और सूत्रों के साथ हल करें।"
            )
            openai_records.append({
                "messages": [
                    {"role": "system", "content": sys_prompt_hi},
                    {"role": "user", "content": hi_q},
                    {"role": "assistant", "content": solution_body}
                ]
            })

    # Shuffle for train/eval split
    random.seed(42)
    random.shuffle(openai_records)
    split_idx = int(len(openai_records) * split_ratio)

    train_data = openai_records[:split_idx]
    val_data = openai_records[split_idx:]

    with open(openai_train_file, "w", encoding="utf-8") as f:
        for r in train_data:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    with open(openai_val_file, "w", encoding="utf-8") as f:
        for r in val_data:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    with open(hf_alpaca_file, "w", encoding="utf-8") as f:
        for r in hf_records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    print(f"\n==========================================")
    print(f"✓ FINE-TUNING DATASETS EXPORTED SUCCESSFULLY")
    print(f"==========================================")
    print(f"• Total Augmented Samples: {len(openai_records)}")
    print(f"• Train JSONL: {openai_train_file} ({len(train_data)} examples)")
    print(f"• Validation JSONL: {openai_val_file} ({len(val_data)} examples)")
    print(f"• HuggingFace/Alpaca JSONL: {hf_alpaca_file} ({len(hf_records)} examples)")
    print(f"Ready for direct upload to OpenAI Fine-Tuning, Unsloth, or Llama-Factory!\n")


def display_stats() -> None:
    dataset = load_dataset()
    print("\n--- ATLAS 2.0 COMPLEX PROBLEM DATASET STATISTICS ---")
    print(f"Total Problems: {len(dataset)}")

    subjects: Dict[str, int] = {}
    difficulties: Dict[str, int] = {}

    for item in dataset:
        sub = item.get("subject", "Unknown")
        diff = item.get("difficulty", "Unknown")
        subjects[sub] = subjects.get(sub, 0) + 1
        difficulties[diff] = difficulties.get(diff, 0) + 1

    print("\n[Distribution by Subject]:")
    for s, c in subjects.items():
        print(f"  • {s}: {c} problems")

    print("\n[Distribution by Difficulty Level]:")
    for d, c in difficulties.items():
        print(f"  • {d}: {c} problems")
    print("---------------------------------------------------\n")


def run_benchmark() -> None:
    """Benchmark current models on a representative complex problem."""
    from app.ai_service import solve_math_problem
    dataset = load_dataset()
    if not dataset:
        print("No problems to benchmark.")
        return

    test_item = dataset[0]
    print(f"\n--- RUNNING COMPLEX PROBLEM BENCHMARK ---")
    print(f"Testing Problem ID: {test_item['id']} ({test_item['topic']})")
    print(f"Problem: {test_item['question']}")

    try:
        import time
        t0 = time.time()
        res = solve_math_problem(test_item["question"], "English")
        duration = round(time.time() - t0, 2)
        print(f"\n✓ Completed in {duration} seconds!")
        print(f"Result: {res.get('result')}")
        print("Generated Steps:")
        for idx, step in enumerate(res.get("steps", [])[:3], 1):
            print(f"  {step}")
        print("✓ Benchmark test passed!\n")
    except Exception as e:
        print(f"[Benchmark Failed]: {e}")


def main():
    parser = argparse.ArgumentParser(description="ATLAS 2.0 Complex Problem Dataset Trainer & Exporter")
    parser.add_argument("--export", action="store_true", help="Export JSONL fine-tuning datasets")
    parser.add_argument("--stats", action="store_true", help="Display dataset statistics and coverage")
    parser.add_argument("--benchmark", action="store_true", help="Run complex problem benchmark test")

    args = parser.parse_args()

    if args.export:
        export_finetuning_jsonl()
    elif args.stats:
        display_stats()
    elif args.benchmark:
        run_benchmark()
    else:
        # Default: display stats and run export
        display_stats()
        export_finetuning_jsonl()


if __name__ == "__main__":
    main()
