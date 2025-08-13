"""
Custom embedding implementations for different providers to use with HackingBuddyGPT RAG.
"""
import os
from typing import List
import google.generativeai as genai
from langchain_core.embeddings import Embeddings


class GeminiEmbeddings(Embeddings):
    """Custom Gemini embeddings implementation for langchain compatibility."""
    
    def __init__(self, model: str = "models/embedding-001", api_key: str = None):
        self.model = model
        if api_key:
            genai.configure(api_key=api_key)
        elif "gemini_api_key" in os.environ:
            genai.configure(api_key=os.environ["gemini_api_key"])
        else:
            raise ValueError("Gemini API key must be provided either as parameter or in environment variable 'gemini_api_key'")
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of documents."""
        embeddings = []
        for text in texts:
            try:
                result = genai.embed_content(
                    model=self.model,
                    content=text,
                    task_type="retrieval_document"
                )
                embeddings.append(result['embedding'])
            except Exception as e:
                print(f"Error embedding document: {e}")
                # Return a zero vector as fallback
                embeddings.append([0.0] * 768)  # Default embedding dimension
        return embeddings
    
    def embed_query(self, text: str) -> List[float]:
        """Embed a single query text."""
        try:
            result = genai.embed_content(
                model=self.model,
                content=text,
                task_type="retrieval_query"
            )
            return result['embedding']
        except Exception as e:
            print(f"Error embedding query: {e}")
            # Return a zero vector as fallback
            return [0.0] * 768  # Default embedding dimension
