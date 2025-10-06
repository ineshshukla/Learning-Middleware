import os
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_experimental.text_splitter import SemanticChunker
from langchain_community.document_loaders import DirectoryLoader, TextLoader, UnstructuredPDFLoader

def create_vs(docs_path, vs_path, model, device):
    embeddings = HuggingFaceEmbeddings(model_name=model, model_kwargs={"device": device})
    if os.path.exists(vs_path):
        return FAISS.load_local(vs_path, embeddings, allow_dangerous_deserialization=True)

    documents = []
    # Load .txt files
    txt_loader = DirectoryLoader(docs_path, glob="**/*.txt", loader_cls=TextLoader)
    documents.extend(txt_loader.load())
    # Load .pdf files
    pdf_loader = DirectoryLoader(docs_path, glob="**/*.pdf", loader_cls=UnstructuredPDFLoader)
    documents.extend(pdf_loader.load())

    text_splitter = SemanticChunker(embeddings)
    texts = text_splitter.split_documents(documents)

    vs = FAISS.from_documents(texts, embeddings)
    vs.save_local(vs_path)
    return vs
