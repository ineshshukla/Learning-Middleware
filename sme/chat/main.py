import hydra
from omegaconf import DictConfig
from loguru import logger
import os
import asyncio

from rag import create_vs, format_sources
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
import vllm_client

os.environ.setdefault('TOKENIZERS_PARALLELISM', 'false')


def create_vector_store(cfg: DictConfig):
    """
    Create or load a vector store based on the configuration.
    
    Args:
        cfg: Configuration object containing RAG settings
        
    Returns:
        vector_store: The created or loaded FAISS vector store
    """
    logger.info("Creating/loading vector store")
    
    # Get course_id from config, default to None if not specified
    course_id = cfg.rag.get('course_id', None)
    
    vector_store = create_vs(
        cfg.rag.docs_path,
        cfg.rag.vector_store_path,
        cfg.rag.embedding_model_name,
        "cpu",
        course_id=course_id
    )
    
    logger.info("Vector store ready")
    return vector_store


def chat(cfg: DictConfig, vector_store):
    """
    Start an interactive chat session using the provided vector store.
    
    Args:
        cfg: Configuration object containing prompt template
        vector_store: The FAISS vector store to use for retrieval
    """
    logger.info("Initializing chat components")
    
    # Create retriever from vector store
    retriever = vector_store.as_retriever()

    # Setup prompt template
    prompt = ChatPromptTemplate.from_template(cfg.prompt)
    
    # Define LLM functions for streaming
    def llm_func(prompt_text):
        """Wrapper function to call async streaming LLM."""
        return asyncio.run(llm_func_stream(prompt_text))

    async def llm_func_stream(prompt_text):
        """Stream LLM responses asynchronously."""
        # Extract content from message objects if needed
        if isinstance(prompt_text, list) and len(prompt_text) > 0 and hasattr(prompt_text[0], 'content'):
            prompt_str = "\n".join([msg.content for msg in prompt_text])
        else:
            prompt_str = str(prompt_text)
        
        chunks = []
        async for chunk in vllm_client.infer_4b_stream_no_think(prompt_str, max_tokens=4096):
            print(chunk, end='', flush=True)  # Print each chunk as it arrives
            chunks.append(chunk)
        print()  # Newline after streaming
        return ''.join(chunks)

    # Create retrieval chain
    document_chain = create_stuff_documents_chain(llm_func, prompt)
    retrieval_chain = create_retrieval_chain(retriever, document_chain)

    # Start interactive chat loop
    logger.info("Starting chat session")
    print("Welcome to the RAG chatbot! Type your question and press Enter. Type 'exit' to quit.")
    
    while True:
        user_input = input("You: ").strip()
        
        if user_input.lower() in {"exit", "quit"}:
            print("Goodbye!")
            break
        
        # Get response from retrieval chain
        response = retrieval_chain.invoke({"input": user_input})
        answer = response.get("answer", "[No answer returned]")
        
        # Add source information
        retrieved_docs = response.get('context', [])
        sources = format_sources(retrieved_docs)
        
        # Display response with sources
        print(f"Bot: {answer}")
        print(f"Sources:{sources}")


@hydra.main(config_path="../conf", config_name="config", version_base=None)
def main(cfg: DictConfig) -> None:
    """Main entry point for the RAG chatbot application."""
    logger.info("Initializing RAG chatbot")
    
    # Step 1: Create or load vector store
    vector_store = create_vector_store(cfg)
    
    # Step 2: Start chat session
    chat(cfg, vector_store)

if __name__ == "__main__":
    main()