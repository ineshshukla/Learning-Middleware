import os
import re
from typing import List, Dict, Any
from datetime import datetime
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_experimental.text_splitter import SemanticChunker
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import (
    DirectoryLoader, TextLoader, UnstructuredPDFLoader, PyPDFLoader,
    UnstructuredWordDocumentLoader, UnstructuredPowerPointLoader, 
    UnstructuredExcelLoader, CSVLoader, JSONLoader, UnstructuredMarkdownLoader,
    UnstructuredHTMLLoader, UnstructuredXMLLoader, UnstructuredEPubLoader,
    UnstructuredRTFLoader
)
from langchain.schema import Document
from loguru import logger

# Optional imports for enhanced document support
try:
    import pdfplumber
    from langchain_community.document_loaders import PDFPlumberLoader
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False

try:
    from langchain_community.document_loaders import UnstructuredODTLoader
    ODT_AVAILABLE = True
except ImportError:
    ODT_AVAILABLE = False

def preprocess_document_content(content: str) -> str:
    """Minimal preprocessing to clean document content while preserving original information."""
    # Only normalize excessive whitespace (keep single spaces, newlines, etc.)
    content = re.sub(r'[ \t]+', ' ', content)  # Multiple spaces/tabs to single space
    content = re.sub(r'\n{3,}', '\n\n', content)  # Multiple newlines to double newline
    
    return content.strip()

def enhance_document_metadata(documents: List[Document]) -> List[Document]:
    """Add basic metadata to documents for better source tracking and retrieval."""
    enhanced_docs = []
    
    for doc in documents:
        # Extract source information
        source_path = doc.metadata.get('source', '')
        filename = os.path.basename(source_path)
        file_ext = os.path.splitext(source_path)[1].lower()
        
        # Create unique document ID
        doc_id = abs(hash(source_path + str(len(doc.page_content)))) % (10**8)
        
        # Calculate content statistics
        word_count = len(doc.page_content.split())
        char_count = len(doc.page_content)
        
        # Basic enhanced metadata
        enhanced_metadata = {
            **doc.metadata,  # Keep existing metadata
            'filename': filename,
            'file_type': file_ext,
            'doc_id': doc_id,
            'content_length': char_count,
            'word_count': word_count,
            'processed_at': datetime.now().isoformat(),
            'source_dir': os.path.dirname(source_path),
        }
        
        # Create enhanced document
        enhanced_doc = Document(
            page_content=preprocess_document_content(doc.page_content),
            metadata=enhanced_metadata
        )
        enhanced_docs.append(enhanced_doc)
    
    logger.info(f"Enhanced metadata for {len(enhanced_docs)} documents")
    return enhanced_docs

def smart_document_chunking(documents: List[Document], embeddings) -> List[Document]:
    """Implement intelligent chunking with overlap and size control."""
    logger.info("Starting smart document chunking")
    
    # Configure chunking parameters
    SEMANTIC_CHUNK_SIZE = 2000  # Increased max size for semantic chunks
    OVERLAP_SIZE = 200  # Overlap between chunks
    # No minimum chunk size - keep all chunks
    
    # Primary splitter: Semantic chunking for natural boundaries
    semantic_splitter = SemanticChunker(
        embeddings,
        breakpoint_threshold_type="percentile",
        breakpoint_threshold_amount=85  # More conservative splitting
    )
    
    # Fallback splitter: Character-based with overlap
    char_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1500,  # Increased chunk size
        chunk_overlap=OVERLAP_SIZE,
        length_function=len,
        separators=["\n\n", "\n", ". ", "? ", "! ", " ", ""]
    )
    
    all_chunks = []
    
    for doc in documents:
        doc_chunks = []
        
        try:
            # Process all documents regardless of size
            
            # Try semantic chunking first
            semantic_chunks = semantic_splitter.split_documents([doc])
            
            # Process each semantic chunk
            for i, chunk in enumerate(semantic_chunks):
                if len(chunk.page_content) > SEMANTIC_CHUNK_SIZE:
                    # Split large semantic chunks with character splitter
                    sub_chunks = char_splitter.split_documents([chunk])
                    
                    for j, sub_chunk in enumerate(sub_chunks):
                        # Keep all chunks regardless of size
                        sub_chunk.metadata.update({
                            'chunk_id': f"{doc.metadata.get('doc_id', 0)}_{i}_{j}",
                            'chunk_index': len(doc_chunks),
                            'parent_chunk_index': i,
                            'is_sub_chunk': True,
                            'chunk_method': 'semantic_then_character',
                            'chunk_size': len(sub_chunk.page_content)
                        })
                        doc_chunks.append(sub_chunk)
                else:
                    # Use semantic chunk as-is
                    chunk.metadata.update({
                        'chunk_id': f"{doc.metadata.get('doc_id', 0)}_{i}",
                        'chunk_index': len(doc_chunks),
                        'parent_chunk_index': i,
                        'is_sub_chunk': False,
                        'chunk_method': 'semantic_only',
                        'chunk_size': len(chunk.page_content)
                    })
                    doc_chunks.append(chunk)
        
        except Exception as e:
            logger.warning(f"Semantic chunking failed for {doc.metadata.get('filename', 'unknown')}: {e}")
            # Fallback to character-based chunking
            try:
                char_chunks = char_splitter.split_documents([doc])
                for i, chunk in enumerate(char_chunks):
                    # Keep all chunks regardless of size
                    chunk.metadata.update({
                        'chunk_id': f"{doc.metadata.get('doc_id', 0)}_fallback_{i}",
                        'chunk_index': len(doc_chunks),
                        'parent_chunk_index': i,
                        'is_sub_chunk': False,
                        'chunk_method': 'character_fallback',
                        'chunk_size': len(chunk.page_content)
                    })
                    doc_chunks.append(chunk)
            except Exception as e2:
                logger.error(f"All chunking methods failed for {doc.metadata.get('filename', 'unknown')}: {e2}")
                continue
        
        # Add total chunk count to each chunk's metadata
        for chunk in doc_chunks:
            chunk.metadata['total_chunks_in_doc'] = len(doc_chunks)
        
        all_chunks.extend(doc_chunks)
        logger.info(f"Created {len(doc_chunks)} chunks for {doc.metadata.get('filename', 'unknown')}")
    
    logger.info(f"Total chunks created: {len(all_chunks)}")
    return all_chunks

def get_supported_file_types():
    """Return dictionary of supported file types and their corresponding loaders."""
    return {
        # Text files
        '.txt': [('TextLoader', TextLoader)],
        '.md': [('UnstructuredMarkdownLoader', UnstructuredMarkdownLoader)],
        '.rtf': [('UnstructuredRTFLoader', UnstructuredRTFLoader)],
        
        # PDF files
        '.pdf': [
            ('PyPDFLoader', PyPDFLoader),
            ('PDFPlumberLoader', PDFPlumberLoader) if PDFPLUMBER_AVAILABLE else None,
            ('UnstructuredPDFLoader', UnstructuredPDFLoader)
        ],
        
        # Microsoft Office
        '.docx': [('UnstructuredWordDocumentLoader', UnstructuredWordDocumentLoader)],
        '.doc': [('UnstructuredWordDocumentLoader', UnstructuredWordDocumentLoader)],
        '.pptx': [('UnstructuredPowerPointLoader', UnstructuredPowerPointLoader)],
        '.ppt': [('UnstructuredPowerPointLoader', UnstructuredPowerPointLoader)],
        '.xlsx': [('UnstructuredExcelLoader', UnstructuredExcelLoader)],
        '.xls': [('UnstructuredExcelLoader', UnstructuredExcelLoader)],
        
        # OpenDocument formats
        '.odt': [('UnstructuredODTLoader', UnstructuredODTLoader)] if ODT_AVAILABLE else [],
        
        # Web and markup
        '.html': [('UnstructuredHTMLLoader', UnstructuredHTMLLoader)],
        '.htm': [('UnstructuredHTMLLoader', UnstructuredHTMLLoader)],
        '.xml': [('UnstructuredXMLLoader', UnstructuredXMLLoader)],
        
        # Data formats
        '.csv': [('CSVLoader', CSVLoader)],
        '.json': [('JSONLoader', JSONLoader)],
        
        # E-books
        '.epub': [('UnstructuredEPubLoader', UnstructuredEPubLoader)],
        
        # Plain text variants
        '.log': [('TextLoader', TextLoader)],
        '.cfg': [('TextLoader', TextLoader)],
        '.conf': [('TextLoader', TextLoader)],
        '.ini': [('TextLoader', TextLoader)],
        '.yaml': [('TextLoader', TextLoader)],
        '.yml': [('TextLoader', TextLoader)],
        '.toml': [('TextLoader', TextLoader)],
    }

def load_single_file(file_path: str) -> List[Document]:
    """Load a single file using appropriate loader based on file extension."""
    filename = os.path.basename(file_path)
    file_ext = os.path.splitext(file_path)[1].lower()
    
    supported_types = get_supported_file_types()
    
    if file_ext not in supported_types:
        logger.warning(f"Unsupported file type: {file_ext} for {filename}")
        return []
    
    loaders_to_try = [loader_info for loader_info in supported_types[file_ext] if loader_info is not None]
    
    if not loaders_to_try:
        logger.warning(f"No available loaders for {file_ext} files")
        return []
    
    # Try each loader until one succeeds
    for loader_name, loader_class in loaders_to_try:
        try:
            logger.info(f"Trying {loader_name} for {filename}")
            
            # Special handling for different loader types
            if loader_class == CSVLoader:
                loader = loader_class(file_path, encoding='utf-8')
            elif loader_class == JSONLoader:
                loader = loader_class(file_path, jq_schema='.', text_content=False)
            elif loader_class == TextLoader:
                loader = loader_class(file_path, encoding='utf-8')
            else:
                loader = loader_class(file_path)
            
            docs = loader.load()
            
            if docs and any(doc.page_content.strip() for doc in docs):
                logger.info(f"Successfully loaded {filename} using {loader_name} ({len(docs)} documents)")
                return docs
            else:
                logger.warning(f"{loader_name} extracted no content from {filename}")
                
        except Exception as e:
            logger.warning(f"{loader_name} failed for {filename}: {e}")
            continue
    
    logger.error(f"All loaders failed for {filename}")
    return []

def load_documents_with_error_handling(docs_path: str) -> List[Document]:
    """Load documents from directory supporting multiple file types with comprehensive error handling."""
    documents = []
    failed_files = []
    processed_files = []
    
    logger.info(f"Loading documents from {docs_path}")
    
    # Get supported file extensions
    supported_extensions = set(get_supported_file_types().keys())
    logger.info(f"Supported file types: {', '.join(sorted(supported_extensions))}")
    
    # Walk through directory and find all supported files
    for root, dirs, files in os.walk(docs_path):
        for file in files:
            file_path = os.path.join(root, file)
            file_ext = os.path.splitext(file)[1].lower()
            
            if file_ext in supported_extensions:
                processed_files.append(file_path)
    
    logger.info(f"Found {len(processed_files)} files to process")
    
    # Process each file
    for file_path in processed_files:
        try:
            file_docs = load_single_file(file_path)
            if file_docs:
                documents.extend(file_docs)
            else:
                failed_files.append(file_path)
        except Exception as e:
            failed_files.append(file_path)
            logger.error(f"Unexpected error processing {os.path.basename(file_path)}: {e}")
    
    # Summary logging
    if failed_files:
        logger.warning(f"Failed to load {len(failed_files)} files:")
        for failed_file in failed_files:
            logger.warning(f"  - {os.path.basename(failed_file)}")
    
    logger.info(f"Successfully loaded {len(documents)} documents from {len(processed_files) - len(failed_files)} files")
    return documents

def create_vs(docs_path, vs_path, model, device, course_id=None):
    """Enhanced vector store creation with improved document handling.
    
    Args:
        docs_path: Base path to documents directory
        vs_path: Base path for vector stores
        model: Embedding model name
        device: Device to use for embeddings (cpu/cuda)
        course_id: Optional course ID to use course-specific paths
    """
    embeddings = HuggingFaceEmbeddings(model_name=model, model_kwargs={"device": device})
    
    # If course_id is provided, use course-specific paths
    if course_id:
        docs_path = os.path.join(docs_path, course_id)
        vs_path = os.path.join(vs_path, course_id)
        logger.info(f"Using course-specific paths:")
        logger.info(f"  - Documents: {docs_path}")
        logger.info(f"  - Vector store: {vs_path}")
    
    # Load existing vector store if available
    if os.path.exists(vs_path):
        logger.info(f"Loading existing vector store from {vs_path}")
        return FAISS.load_local(vs_path, embeddings, allow_dangerous_deserialization=True)

    logger.info(f"Creating new vector store from documents in {docs_path}")
    
    # Load documents with error handling
    documents = load_documents_with_error_handling(docs_path)
    
    if not documents:
        raise ValueError(f"No documents successfully loaded from {docs_path}")
    
    # Enhance document metadata
    documents = enhance_document_metadata(documents)
    
    # Apply smart chunking
    texts = smart_document_chunking(documents, embeddings)
    
    if not texts:
        raise ValueError("No valid chunks created from documents")
    
    # Create and save vector store
    logger.info(f"Creating FAISS index with {len(texts)} chunks")
    vs = FAISS.from_documents(texts, embeddings)
    vs.save_local(vs_path)
    logger.info(f"Vector store saved to {vs_path}")
    
    return vs

def format_sources(retrieved_docs) -> str:
    """Format source information from retrieved documents for display."""
    if not retrieved_docs:
        return ""
    
    seen_sources = set()
    sources = []

    for doc in retrieved_docs:
        # Get source information from metadata
        filename = doc.metadata.get('filename', 'Unknown source')

        # Normalize to avoid duplicates caused by path differences
        source_id = f"{filename.strip()}"

        if source_id not in seen_sources:
            seen_sources.add(source_id)

            # Add file type emoji for better readability
            file_type = doc.metadata.get('file_type', '').lower()
            emoji = {
                '.pdf': '📄',
                '.docx': '📝', '.doc': '📝',
                '.txt': '📋', '.md': '📋',
                '.xlsx': '📊', '.xls': '📊',
                '.pptx': '📽️', '.ppt': '📽️',
                '.html': '🌐', '.htm': '🌐',
                '.json': '📋', '.csv': '📊'
            }.get(file_type, '📄')

            sources.append(f"{emoji} {source_id}")

    # (Optional) Final safety deduplication preserving order
    sources = list(dict.fromkeys(sources))

    
    if sources:
        return f"\n\n**Sources:**\n" + "\n".join(f"• {source}" for source in sources)
    return ""
