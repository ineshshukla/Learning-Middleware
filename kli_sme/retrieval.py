"""Vector-store access layer.

Self-contained FAISS operations using LangChain so that kli_sme does not
depend on the SME service's import paths.  Reads the same on-disk stores
that the SME service creates (``data/vector_store/{course_id}/global/``).
"""

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from loguru import logger

_SME_ROOT = Path(__file__).resolve().parent.parent / "sme"

os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")


# ── embeddings singleton ─────────────────────────────────────────────────────

_EMBEDDINGS_CACHE: dict[str, HuggingFaceEmbeddings] = {}


def _get_embeddings(model: str = "all-MiniLM-L6-v2", device: str = "cpu"):
    key = f"{model}:{device}"
    if key not in _EMBEDDINGS_CACHE:
        _EMBEDDINGS_CACHE[key] = HuggingFaceEmbeddings(
            model_name=model,
            model_kwargs={"device": device},
            encode_kwargs={"normalize_embeddings": True},
        )
    return _EMBEDDINGS_CACHE[key]


# ── vector store creation ────────────────────────────────────────────────────

def create_vector_store_from_dir(
    docs_dir: str,
    vs_dir: str,
    *,
    embedding_model: str = "all-MiniLM-L6-v2",
    device: str = "cpu",
    chunk_size: int = 1500,
    chunk_overlap: int = 200,
) -> FAISS:
    """Load PDFs from *docs_dir*, chunk them, embed, and persist to *vs_dir*.

    Returns the FAISS vector store.
    """
    docs_path = Path(docs_dir)
    if not docs_path.exists():
        raise FileNotFoundError(f"Documents directory not found: {docs_path}")

    # Load PDFs
    loader = DirectoryLoader(
        str(docs_path),
        glob="**/*.pdf",
        loader_cls=PyPDFLoader,
        show_progress=True,
    )
    raw_docs = loader.load()
    logger.info(f"Loaded {len(raw_docs)} pages from {docs_path}")

    if not raw_docs:
        raise ValueError(f"No PDF pages found in {docs_path}")

    # Chunk
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )
    chunks = splitter.split_documents(raw_docs)
    logger.info(f"Split into {len(chunks)} chunks")

    # Embed & build index
    embeddings = _get_embeddings(embedding_model, device)
    vs = FAISS.from_documents(chunks, embeddings)

    # Persist
    vs_path = Path(vs_dir)
    vs_path.mkdir(parents=True, exist_ok=True)
    vs.save_local(str(vs_path))
    logger.info(f"Vector store saved to {vs_path}")

    return vs


def create_course_stores(
    course_id: str,
    docs_base: str | None = None,
    vs_base: str | None = None,
    **kwargs,
) -> FAISS:
    """Create a global vector store for a course under the SME data layout.

    Reads from ``{docs_base}/{course_id}/`` and saves to
    ``{vs_base}/{course_id}/global/``.
    """
    if docs_base is None:
        docs_base = str(_SME_ROOT / "data" / "docs")
    if vs_base is None:
        vs_base = str(_SME_ROOT / "data" / "vector_store")

    docs_dir = os.path.join(docs_base, course_id)
    vs_dir = os.path.join(vs_base, course_id, "global")

    return create_vector_store_from_dir(docs_dir, vs_dir, **kwargs)


# ── vector store loading ─────────────────────────────────────────────────────

def load_retriever(
    *,
    course_id: str,
    module_id: Optional[str] = None,
    vs_path: Optional[str] = None,
    embedding_model: str = "all-MiniLM-L6-v2",
    device: str = "cpu",
    global_chunks: int = 2,
    module_chunks: int = 5,
) -> Any:
    """Load a FAISS vector store.

    Returns an object whose ``.as_retriever()`` or ``.invoke()`` method
    yields LangChain ``Document`` objects.
    """
    if vs_path is None:
        vs_path = str(_SME_ROOT / "data" / "vector_store")

    embeddings = _get_embeddings(embedding_model, device)

    if module_id:
        # Try module-specific store first, fall back to global
        module_store_path = os.path.join(vs_path, course_id, module_id)
        global_store_path = os.path.join(vs_path, course_id, "global")

        if Path(module_store_path).exists():
            logger.info(f"Loading module store: {module_store_path}")
            return FAISS.load_local(
                module_store_path, embeddings,
                allow_dangerous_deserialization=True,
            )

        logger.info(f"Module store not found, falling back to global: {global_store_path}")
        return FAISS.load_local(
            global_store_path, embeddings,
            allow_dangerous_deserialization=True,
        )

    global_store_path = os.path.join(vs_path, course_id, "global")
    logger.info(f"Loading global vector store: {global_store_path}")
    return FAISS.load_local(
        global_store_path, embeddings,
        allow_dangerous_deserialization=True,
    )


def retrieve_for_queries(
    retriever: Any,
    queries: List[str],
    top_k: int = 6,
) -> List[Dict[str, Any]]:
    """Run several queries against a retriever and collect unique chunks.

    Returns a list of dicts with ``text``, ``source``, and ``metadata`` keys.
    Chunk text is kept up to 2000 chars to maximise context within the 30k
    token window.
    """
    seen_texts: set[str] = set()
    results: list[Dict[str, Any]] = []

    for query in queries:
        if hasattr(retriever, "as_retriever"):
            docs = retriever.as_retriever(search_kwargs={"k": top_k}).invoke(query)
        else:
            docs = retriever.invoke(query)

        for doc in docs:
            snippet = doc.page_content[:2000]
            if snippet in seen_texts:
                continue
            seen_texts.add(snippet)
            results.append(
                {
                    "text": snippet,
                    "source": doc.metadata.get(
                        "filename", doc.metadata.get("source", "unknown")
                    ),
                    "metadata": doc.metadata,
                }
            )

    return results
