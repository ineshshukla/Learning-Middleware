import hydra
from omegaconf import DictConfig
from loguru import logger
import os

from rag import create_vs
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain_openai import ChatOpenAI

os.environ.setdefault('TOKENIZERS_PARALLELISM', 'false')

@hydra.main(config_path="../conf", config_name="config", version_base=None)
def main(cfg: DictConfig) -> None:
    logger.info("Initializing RAG components")
    vector_store = create_vs(
        cfg.rag.docs_path,
        cfg.rag.vector_store_path,
        cfg.rag.embedding_model_name,
        "cpu")
    retriever = vector_store.as_retriever()

    llm = ChatOpenAI(
        model=cfg.llm.model,
        base_url=cfg.llm.api_base,
        openai_api_key="nope",
    )

    prompt = ChatPromptTemplate.from_template(cfg.prompt)
    document_chain = create_stuff_documents_chain(llm, prompt)
    retrieval_chain = create_retrieval_chain(retriever, document_chain)

    print("Welcome to the RAG chatbot! Type your question and press Enter. Type 'exit' to quit.")
    while True:
        user_input = input("You: ").strip()
        if user_input.lower() in {"exit", "quit"}:
            print("Goodbye!")
            break
        response = retrieval_chain.invoke({"input": user_input})
        answer = response.get("answer", "[No answer returned]")
        if "<think>" in answer:
            answer = answer.split("</think>")[-1].strip()
        print(f"Bot: {answer}")

if __name__ == "__main__":
    main()