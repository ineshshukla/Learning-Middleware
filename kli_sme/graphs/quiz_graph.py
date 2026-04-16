"""LangGraph workflow for Quiz Generation."""

import json
import time
from typing import Any, Dict

from langchain_core.messages import HumanMessage
from langgraph.graph import END, StateGraph
from loguru import logger

from kli_sme.llm import get_llm
from kli_sme.prompts import build_quiz_generation_prompt
from kli_sme.retrieval import load_retriever, retrieve_for_queries
from kli_sme.schemas import QuizState, QuizOutput


def retrieve_context(state: QuizState) -> Dict[str, Any]:
    """Retrieve background context for quiz generation."""
    logger.info("[QuizGen] Retrieving context for module...")
    
    course_id = state.get("course_id", "")
    module_id = state.get("module_id")
    module_name = state.get("module_name", "")
    
    retriever = None
    if course_id:
        retriever = load_retriever(course_id=course_id, module_id=module_id)
        
    extra_ctx = ""
    if retriever:
        # Use module name as broad query
        chunks = retrieve_for_queries(retriever, [module_name], top_k=3)
        extra_ctx = "\n\n".join(c["text"] for c in chunks)
        
    return {"retrieved_context": extra_ctx}


def generate_questions(state: QuizState) -> Dict[str, Any]:
    """Invoke LLM to generate structured JSON quiz."""
    logger.info("[QuizGen] Generating quiz questions...")
    
    prompt = build_quiz_generation_prompt(
        module_content=state.get("module_content", ""),
        retrieved_context=state.get("retrieved_context", ""),
        num_questions=state.get("num_questions", 5),
    )
    
    # We use vLLM backend, pass guided_json schema down into extra_body.
    llm = get_llm(temperature=0.3, max_tokens=4096)
    
    structured_schema = QuizOutput.model_json_schema()
    
    # Using underlying bind directly patches OpenAI's extra_body field
    llm_with_guided = llm.bind(
        extra_body={
            "guided_json": structured_schema,
            "chat_template_kwargs": {"enable_thinking": False}
        }
    )
    
    response = llm_with_guided.invoke([HumanMessage(content=prompt)])
    
    text = response.content or "{}"
    if "</think>" in text:
        text = text.split("</think>")[-1].strip()
        
    try:
        quiz_data = json.loads(text)
    except json.JSONDecodeError as exc:
        logger.error(f"Failed to parse guided JSON: {exc}\nText: {text}")
        quiz_data = {"questions": []}
        
    return {"generated_questions": quiz_data.get("questions", [])}


def aggregate_quiz(state: QuizState) -> Dict[str, Any]:
    """Format final output payload."""
    questions = state.get("generated_questions", [])
    
    final_quiz = {
        "quiz_metadata": {
            "module_name": state.get("module_name"),
            "total_questions": len(questions),
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "generation_method": "langgraph_kli_sme",
        },
        "questions": questions
    }
    
    logger.info(f"[QuizGen] Quiz aggregation complete: {len(questions)} items")
    return {"final_quiz": final_quiz}


def build_quiz_graph() -> StateGraph:
    graph = StateGraph(QuizState)
    graph.add_node("retrieve_context", retrieve_context)
    graph.add_node("generate_questions", generate_questions)
    graph.add_node("aggregate_quiz", aggregate_quiz)
    
    graph.set_entry_point("retrieve_context")
    graph.add_edge("retrieve_context", "generate_questions")
    graph.add_edge("generate_questions", "aggregate_quiz")
    graph.add_edge("aggregate_quiz", END)
    
    return graph.compile()


def run_quiz_generation(
    module_content: str,
    module_name: str,
    course_id: str,
    module_id: str | None = None,
    num_questions: int = 5,
) -> dict:
    graph = build_quiz_graph()
    
    initial_state: QuizState = {
        "module_content": module_content,
        "module_name": module_name,
        "course_id": course_id,
        "module_id": module_id,
        "num_questions": num_questions,
        "retrieved_context": "",
        "generated_questions": [],
        "final_quiz": {},
    }
    
    t0 = time.time()
    result = graph.invoke(initial_state)
    elapsed = time.time() - t0
    
    logger.info(f"Quiz generation completed in {elapsed:.1f}s")
    
    return result.get("final_quiz", {})
