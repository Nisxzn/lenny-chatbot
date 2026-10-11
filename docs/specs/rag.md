# Retrieval-Augmented Generation (RAG) Architecture

## 1. Transcript Source and Provenance

- **Archive Location:** [`backend/data/transcripts/`](file:///w:/~Works/Oogway/lenny's%20chatbot/backend/data/transcripts)
- **Datasets:**
  - `genuine_transcripts.json`: Real curated transcripts from Lenny's Podcast episodes with guest attributions, timestamps, and episode URLs.
  - `sample.json`: Representative development subset used for rapid testing and CI.
- **Transcript Schema:**
  ```json
  [
    {
      "episode_title": "Brian Chesky on Designing Airbnb",
      "url": "https://www.lennyspodcast.com/brian-chesky",
      "speaker": "Brian Chesky",
      "timestamp": "00:14:22",
      "content": "Transcript excerpt text..."
    }
  ]
  ```

---

## 2. Ingestion Pipeline (`IngestionService`)

The ingestion pipeline is implemented in [`backend/app/services/ingestion.py`](file:///w:/~Works/Oogway/lenny's%20chatbot/backend/app/services/ingestion.py):
1. **JSON Parsing & Validation:** Verifies required fields (`episode_title`, `content`).
2. **Text Normalization:** Strips irregular whitespace, non-printable characters, and formatting noise.
3. **Sliding Window Chunking:**
   - **Chunk Size:** 1,000 words (~5,000 characters).
   - **Chunk Overlap:** 200 words (~1,000 characters) to preserve contextual coherence across boundaries.
   - **Metadata Attachment:** Every generated chunk retains `episode_title`, `speaker`, `timestamp`, and `url`.
4. **Batch Embedding:** Uses `SentenceTransformerProvider` to generate 384-dimensional dense vectors.
5. **Deduplication & Storage:** Checks existing chunk IDs in the `VectorStore` to prevent duplicate ingestion upon repeated runs.

---

## 3. Embedding Model & Vector Dimensions

- **Model:** `sentence-transformers/all-MiniLM-L6-v2`
- **Vector Dimension:** 384 dimensions
- **Rationale:** Runs entirely on CPU with low latency (~50ms per batch), eliminating external API dependency and cost during local development, testing, and evaluation.
- **Alternative:** Support for Ollama embeddings (`nomic-embed-text`) is also configurable via `OLLAMA_EMBEDDING_MODEL`.

---

## 4. Vector Store Architecture & Disk Caching

The system defines an abstract `VectorStore` base class with:
- **`InMemoryVectorStore` (`backend/app/services/vector_store.py`):** Uses `numpy` for exact cosine similarity calculation across chunk embeddings.
- **Disk Cache Persistence:** Implements `save_to_disk()` and `load_from_disk()` serializing to `backend/data/vector_store_cache.pkl`.
- **Startup Auto-Ingestion (`backend/app/services/startup.py`):** Automatically called on FastAPI boot. If the vector store is empty, it attempts to load from `vector_store_cache.pkl`; if no cache exists, it parses all `*.json` files in `backend/data/transcripts/` and generates the cache automatically.

---

## 5. Retrieval & Grounding Strategy (`RetrievalService`)

Implemented in [`backend/app/services/retrieval.py`](file:///w:/~Works/Oogway/lenny's%20chatbot/backend/app/services/retrieval.py):
1. **Query Embedding:** Encodes the incoming user prompt with `all-MiniLM-L6-v2`.
2. **Similarity Scoring:** Computes cosine similarity between query and all stored chunk vectors.
3. **Relevance Threshold Filtering:**
   - Evaluated in `chat.py`: chunks with cosine similarity **`< 0.18`** are filtered out.
   - Prevents unrelated transcript chunks from being injected when the user asks general or greeting questions.
4. **Insufficient Evidence Fallback:**
   - If no chunks meet the threshold (or transcripts are empty), the backend supplies no context and injects: *"No relevant context found in Lenny's Podcast transcripts."*
   - The system prompt instructs the assistant to acknowledge that Lenny's podcast does not cover the topic, and invite the user to ask about specific covered guests.
5. **Broad Summary Handler:**
   - Queries matching `is_podcast_summary_query()` (e.g., *"summarize Lenny's podcast"*) invoke `get_representative_chunks()`, retrieving high-level chunks across diverse episodes.

---

## 6. API Endpoints

- **Manual File Ingestion:**
  ```bash
  curl -X POST "http://localhost:8000/api/v1/knowledge/ingest" \
       -H "Content-Type: application/json" \
       -d '{"filepath": "data/transcripts/genuine_transcripts.json"}'
  ```
- **Semantic Vector Search:**
  ```bash
  curl -X POST "http://localhost:8000/api/v1/knowledge/search" \
       -H "Content-Type: application/json" \
       -d '{"query": "finding product-market fit", "top_k": 3}'
  ```
- **Store Status:**
  ```bash
  curl "http://localhost:8000/api/v1/knowledge/status"
  ```
