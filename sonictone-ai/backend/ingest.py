"""Run this manually to re-ingest data into ChromaDB."""
from rag import ingest_data

if __name__ == "__main__":
    print("🎸 Ingesting SonicTone data into ChromaDB...")
    ingest_data()
    print("✅ Done!")