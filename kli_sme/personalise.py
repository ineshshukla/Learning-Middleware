"""Quick personalisation script.

Usage:
    python3 personalise.py --sample output/compression_hash_functions_20260307-131316.md

Reads the .md and matching _meta.json, runs personalisation, and saves output.
"""

import argparse
import json
import sys
import time
from pathlib import Path

# Ensure kli_sme is importable regardless of cwd
_repo_root = Path(__file__).resolve().parent.parent
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

from kli_sme.graphs.personalizer import run_personalization

# ─── Edit your learner profile here ─────────────────────────────────────────

USER_PROFILE = {
    "preferences": {
        "learning_style": "visual",
        "detail_level": "detailed",
        "language_level": "simplified, avoid jargon where possible",
        "examples": "lots of real-world, practical examples",
        "tone": "friendly and conversational",
    }
}

COURSE_ID = "SE101"

# ─────────────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="Personalise a golden-sample module")
    parser.add_argument(
        "--sample",
        required=True,
        help="Path to the golden-sample .md file (the _meta.json is inferred)",
    )
    args = parser.parse_args()

    md_path = Path(args.sample)
    if not md_path.exists():
        raise FileNotFoundError(f"Golden sample not found: {md_path}")

    # Derive _meta.json path: foo.md -> foo_meta.json
    meta_path = md_path.with_name(md_path.stem + "_meta.json")
    if not meta_path.exists():
        raise FileNotFoundError(
            f"Expected meta file not found: {meta_path}\n"
            f"It should sit next to the .md file with a '_meta.json' suffix."
        )

    golden_sample = md_path.read_text(encoding="utf-8")
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    subtopics = meta["subtopics"]

    print(f"Golden sample : {md_path.name}  ({len(golden_sample)} chars)")
    print(f"Sub-topics    : {len(subtopics)}")
    print(f"Course ID     : {COURSE_ID}")
    print(f"User profile  :")
    for k, v in USER_PROFILE["preferences"].items():
        print(f"  {k}: {v}")
    print()

    t0 = time.time()
    result = run_personalization(
        golden_sample=golden_sample,
        subtopics=subtopics,
        user_preferences=USER_PROFILE,
        course_id=COURSE_ID,
    )
    elapsed = time.time() - t0

    # Save output next to the original
    out_path = md_path.with_name(md_path.stem + "_personalized.md")
    out_path.write_text(result["personalized_module"], encoding="utf-8")

    print(f"\nDone in {elapsed:.1f}s")
    print(f"Personalized module saved to: {out_path}")


if __name__ == "__main__":
    main()
