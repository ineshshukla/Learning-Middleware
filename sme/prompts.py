"""Prompt builders for the KLI-SME golden-sample and personalisation graphs.

Seven prompts for the golden-sample CMD pipeline:
  1. build_subtopic_decomposition_prompt   (Phase 1 - 3 calls)
  2. build_subtopic_critique_prompt        (Phase 2 - 6 calls)
  3. build_subtopic_revision_prompt        (Phase 3 - 3 calls)
  4. build_decision_prompt                 (Phase 4 - 1 call)
  5. build_section_generation_prompt       (Phase 6 - N calls)

Two prompts for the personalisation pipeline:
  6. build_needs_analysis_prompt
  7. build_section_transform_prompt
"""

from typing import Any, Dict, List

from sme.personas import TEACHER_PERSONAS

# ---------------------------------------------------------------------------
# KLI Framework text (Koedinger et al., 2012) -- embedded directly so this
# module has no cross-project import dependency.
# ---------------------------------------------------------------------------

KLI_FRAMEWORK_TEXT = """
## The Knowledge-Learning-Instruction (KLI) Framework

The KLI framework connects three core elements to produce robust student learning:

### 1. Knowledge Components (KCs)
- **Facts**: Declarative knowledge that must be memorised.
- **Concepts**: Categories or principles requiring understanding.
- **Principles**: Rules and relationships that explain phenomena.
- **Skills / Procedures**: Step-by-step processes that must be practised.

### 2. Learning Processes
- **Memory and Fluency Building**: Best for Facts and Procedures — repeated exposure, retrieval practice, drill.
- **Induction and Refinement**: Best for Concepts and some Principles — observing examples, identifying patterns, comparison.
- **Understanding and Sense-Making**: Best for Principles and deep Concepts — constructing explanations, connecting to prior knowledge.

### 3. Instructional Principles

For **Memory and Fluency Building**: spacing, interleaving, retrieval practice, mnemonics.
For **Induction and Refinement**: worked examples, comparison/contrasting cases, concept mapping.
For **Understanding and Sense-Making**: self-explanation, elaborative interrogation, collaborative discussion, analogical reasoning.

### Alignment Principle
The type of KC determines the appropriate Learning Process, which determines the most effective Instructional Principle. Misalignment leads to fragile learning.
""".strip()


# ============================================================================
# 1. Sub-topic decomposition (Phase 1)
# ============================================================================

def build_subtopic_decomposition_prompt(
    persona_key: str,
    objective: str,
    subject_domain: str = "",
    grade_level: str = "",
) -> str:
    persona = TEACHER_PERSONAS[persona_key]
    context_lines = []
    if subject_domain:
        context_lines.append(f"Subject Domain: {subject_domain}")
    if grade_level:
        context_lines.append(f"Grade Level: {grade_level}")
    context_lines.append(f"Learning Objective: {objective}")
    context_block = "\n".join(context_lines)

    return f"""You are an expert curriculum designer with a specific pedagogical perspective.

## Your Pedagogical Perspective
{persona['description']}

## Theoretical Framework
{KLI_FRAMEWORK_TEXT}

## Your Task

Decompose the following learning objective into a set of **teachable sub-topics**.
Each sub-topic will later become a section of a learning module, so it should be
self-contained yet logically connected to the others.

{context_block}

## Instructions

1. Identify the core Knowledge Components in this objective and classify them.
2. Determine which Learning Processes are most appropriate.
3. Propose 3-7 sub-topics that, taken together, fully cover the learning objective.
4. For each sub-topic provide:
   - **Title**: a concise name
   - **Description**: 1-2 sentences on what it covers and why it matters
   - **Teaching Approach**: the instructional strategy you recommend (grounded in KLI)
   - **Depth Level**: brief | moderate | detailed
   - **Search Queries**: 2-3 keyword queries suitable for retrieving relevant material from a knowledge base

5. Apply your **{persona['name']}** lens throughout — the decomposition should reflect your pedagogical priorities.

## Output Format

Return a numbered list of sub-topics using exactly this structure for each:

### Sub-topic N: <Title>
- **Description**: ...
- **Teaching Approach**: ...
- **Depth Level**: ...
- **Search Queries**: query1; query2; query3
"""


# ============================================================================
# 2. Cross-critique (Phase 2)
# ============================================================================

def build_subtopic_critique_prompt(
    reviewer_persona_key: str,
    author_persona_key: str,
    plan: str,
    objective: str,
) -> str:
    reviewer = TEACHER_PERSONAS[reviewer_persona_key]
    author = TEACHER_PERSONAS[author_persona_key]

    return f"""You are an expert curriculum designer with a **{reviewer['name']}** perspective.

{reviewer['description']}

## Context

A colleague with a **{author['name']}** perspective has proposed the following
sub-topic decomposition for this learning objective:

**Learning Objective:** {objective}

### Proposed Decomposition
{plan}

## Your Task

Provide constructive, specific feedback from your **{reviewer['name']}** perspective:

1. **Strengths**: Which sub-topics or sequencing decisions are sound?
2. **Coverage Gaps**: What important aspects of the objective are missing or under-developed?
3. **Pedagogical Concerns**: What improvements does your {reviewer['name']} lens reveal?
4. **KLI Alignment**: Is each sub-topic matched to appropriate Knowledge Components, Learning Processes, and Instructional Principles?
5. **Specific Suggestions**: Provide 2-3 concrete, actionable improvements.

## Output Format

### Feedback from {reviewer['name']} Perspective

**Strengths**:
- ...

**Coverage Gaps**:
- ...

**Specific Suggestions**:
1. ...
2. ...
3. ...
"""


# ============================================================================
# 3. Revision (Phase 3)
# ============================================================================

def build_subtopic_revision_prompt(
    persona_key: str,
    original_plan: str,
    critiques: List[str],
    objective: str,
) -> str:
    persona = TEACHER_PERSONAS[persona_key]
    critiques_text = "\n\n---\n\n".join(
        f"### Feedback #{i + 1}\n{c}" for i, c in enumerate(critiques)
    )

    return f"""You are an expert curriculum designer with a **{persona['name']}** perspective.

{persona['description']}

## Context

You previously proposed a sub-topic decomposition. Your colleagues have reviewed
it and provided feedback. Revise your plan incorporating the strongest suggestions
while staying true to your pedagogical perspective.

**Learning Objective:** {objective}

### Your Original Decomposition
{original_plan}

### Colleague Feedback
{critiques_text}

## Instructions

1. Incorporate the most valuable critiques.
2. Maintain your **{persona['name']}** core strengths.
3. Ensure the revised set of sub-topics still fully covers the learning objective.
4. Keep the same structured format (Title, Description, Teaching Approach, Depth Level, Search Queries).

## Output

Provide the **complete revised sub-topic decomposition** (not just a diff).
"""


# ============================================================================
# 4. Decision agent (Phase 4)
# ============================================================================

def build_decision_prompt(
    revised_plans: Dict[str, str],
    discussion_log: List[str],
    objective: str,
) -> str:
    plans_text = "\n\n" + ("=" * 60 + "\n\n").join(
        f"### Plan by {persona}\n{text}" for persona, text in revised_plans.items()
    )
    transcript = "\n\n---\n\n".join(discussion_log[-12:])  # keep manageable

    return f"""You are the **Decision Agent** in a collaborative multi-agent curriculum design system.

## Context

Three expert curriculum designers, each with a distinct pedagogical perspective,
have collaboratively decomposed a learning objective into sub-topics.

**Learning Objective:** {objective}

### Discussion Summary
{transcript[:3000]}

### Revised Plans
{plans_text}

## Your Task

1. Review all three revised decompositions.
2. Select the ONE that best covers the learning objective, or synthesise the best
   elements from multiple plans into a single coherent decomposition.
3. Output the final list of sub-topics as **valid JSON** matching this schema:

```json
{{
  "subtopics": [
    {{
      "title": "Sub-topic title",
      "description": "What this sub-topic covers",
      "teaching_approach": "Instructional strategy",
      "depth_level": "brief | moderate | detailed",
      "search_queries": ["query1", "query2"]
    }}
  ]
}}
```

## Decision Rationale

Before the JSON, briefly explain which plan you chose (or how you merged them)
and why.

## Output

Provide your rationale, then the JSON block.
"""


# ============================================================================
# 5. Section generation (Phase 6)
# ============================================================================

def build_section_generation_prompt(
    subtopic_title: str,
    subtopic_description: str,
    teaching_approach: str,
    retrieved_context: str,
    module_name: str,
) -> str:
    return f"""You are writing one section of an educational module titled **{module_name}**.

## Section: {subtopic_title}

**Scope**: {subtopic_description}
**Instructional Strategy**: {teaching_approach}

## Reference Material (use as context, do not copy verbatim)
{retrieved_context}

## Instructions

1. Write a comprehensive module section in **markdown** that teaches this sub-topic.
2. Use the reference material as background knowledge; synthesise and expand it into
   original, well-structured content.
3. Include concrete examples, clear explanations, and practical illustrations.
4. Apply the suggested instructional strategy throughout.
5. Use markdown formatting: headers (##/###), bold, lists, code blocks, tables as appropriate.
6. Do NOT include a top-level `#` heading — the assembler will add it.

## Output

Write the section content directly (no preamble).
"""


# ============================================================================
# 6. Personalisation — needs analysis
# ============================================================================

def build_needs_analysis_prompt(
    golden_overview: str,
    user_preferences: Dict[str, Any],
) -> str:
    prefs = user_preferences.get("preferences", user_preferences)
    pref_lines = "\n".join(f"- **{k}**: {v}" for k, v in prefs.items())

    return f"""You are a learning personalisation specialist.

## Golden-Sample Overview
{golden_overview}

## Learner Profile
{pref_lines}

## Your Task

For each section of the golden sample, determine what adaptations are needed to
match this learner's preferences. Consider:

- **Detail Level**: should sections be expanded or condensed?
- **Explanation Style**: should more examples, visuals, or conceptual depth be added?
- **Language**: should terminology be simplified or made more technical?
- **Additional Context**: would extra material from the knowledge base help?

## Output Format

For each section, output:

### Section: <title>
- **Adaptation**: concise description of what to change
- **Needs Extra Retrieval**: yes / no
- **Extra Queries**: (if yes) query1; query2
"""


# ============================================================================
# 7. Personalisation — section transform
# ============================================================================

def build_section_transform_prompt(
    section_title: str,
    original_section: str,
    adaptation_instructions: str,
    extra_context: str = "",
) -> str:
    ctx_block = ""
    if extra_context:
        ctx_block = f"""
## Additional Reference Material
{extra_context}
"""

    return f"""You are transforming a module section to match a specific learner's needs.

## Section: {section_title}

### Original Content
{original_section}

### Adaptation Instructions
{adaptation_instructions}
{ctx_block}
## Instructions

1. Rewrite the section according to the adaptation instructions.
2. Preserve all essential information and accuracy.
3. If additional reference material is provided, incorporate relevant parts.
4. Maintain clean markdown formatting.

## Output

Write the transformed section directly (no preamble).
"""
