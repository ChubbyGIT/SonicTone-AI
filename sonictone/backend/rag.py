"""
rag.py — Retrieval-Augmented Generation (RAG) Module
-------------------------------------------------------
Manages the ChromaDB vector database and provides context retrieval for the
LLM prompts in main.py.

Two ChromaDB collections:
  plugin_collection ("plugin_settings")
    — loaded from data/plugin_settings.json
    — each document describes one VST plugin's controls and typical ranges

  band_collection ("band_tones")
    — loaded from data/guitar_tone_reference.txt
    — each document contains rhythm + lead tone data for one band/artist

Auto-ingest:
  On module import, if either collection is empty, ingest_data() is called
  automatically so the first /generate-tone request is never cold.

Public API:
  query_rag(vst_name, band_name, top_k=3) → str
    Returns a formatted string with the top-k most relevant band tone documents
    and plugin setting documents, separated by section headers.
    Returns "" if both collections are empty.
"""

import chromadb
import json
import re
from pathlib import Path

# ChromaDB persists data to disk so it survives server restarts
CHROMA_PATH = "./chroma_db"
client = chromadb.PersistentClient(path=CHROMA_PATH)

# Get (or create) both collections
plugin_collection = client.get_or_create_collection("plugin_settings")
band_collection   = client.get_or_create_collection("band_tones")


def parse_tone_reference(filepath: Path) -> list[dict]:
    """
    Parse data/guitar_tone_reference.txt into structured band entry dicts.

    The file format uses numbered blocks like:
      [01] METALLICA  Genre: Heavy Metal | Guitarist: James Hetfield | ...
      ── RHYTHM TONE ─────────
      ...
      ── LEAD TONE ───────────
      ...
      ····

    Returns a list of dicts with keys: id, band, genre, document.
    """
    text = filepath.read_text(encoding='utf-8')
    bands = []

    # Split the file into band blocks using the [01], [02] ... pattern
    band_blocks = re.split(r'\n\s*\[(\d+)\]\s+', text)

    # band_blocks[0] = file header; then pairs of (number, content)
    i = 1
    while i < len(band_blocks) - 1:
        number  = band_blocks[i]
        content = band_blocks[i + 1]
        i += 2

        lines = content.strip().split('\n')
        if not lines:
            continue

        # First line contains: Band Name  Genre: ... | Guitarist: ... | Peak Era: ...
        first_line = lines[0].strip()
        band_name  = first_line  # fall back to whole first line

        # Try to extract just the band name (before "Genre:")
        name_match = re.match(r'^([A-Z][^\n]+?)(?:\s+Genre:|$)', first_line)
        if name_match:
            band_name = name_match.group(1).strip()

        # Extract metadata fields from the first few lines
        genre = ''
        guitarist = ''
        era = ''
        for line in lines[:5]:
            if 'Genre:' in line:
                m = re.search(r'Genre:\s*([^|]+)', line)
                if m: genre = m.group(1).strip()
            if 'Guitarist:' in line:
                m = re.search(r'Guitarist:\s*([^|]+)', line)
                if m: guitarist = m.group(1).strip()
            if 'Peak Era:' in line:
                m = re.search(r'Peak Era:\s*(.+)', line)
                if m: era = m.group(1).strip()

        # Extract the RHYTHM TONE and LEAD TONE sections
        rhythm_section = ''
        lead_section   = ''

        rhythm_match = re.search(
            r'──\s*RHYTHM TONE\s*─+\s*(.*?)(?=──\s*LEAD TONE|····|$)',
            content, re.DOTALL
        )
        lead_match = re.search(
            r'──\s*LEAD TONE\s*─+\s*(.*?)(?=····|$)',
            content, re.DOTALL
        )

        if rhythm_match: rhythm_section = rhythm_match.group(1).strip()
        if lead_match:   lead_section   = lead_match.group(1).strip()

        # Build the plain-text document that will be embedded by ChromaDB
        doc = f"""BAND: {band_name}
GENRE: {genre}
GUITARIST: {guitarist}
PEAK ERA: {era}

RHYTHM TONE:
{rhythm_section}

LEAD TONE:
{lead_section}
"""
        bands.append({
            'id':       f"band_{number.zfill(3)}",
            'band':     band_name,
            'genre':    genre,
            'document': doc,
        })

    return bands


def ingest_data():
    """
    Load data files and upsert documents into ChromaDB.

    Called automatically on startup when either collection is empty.
    Can also be run manually via backend/ingest.py.
    """
    data_dir = Path(__file__).parent / "data"

    # ── Plugin settings (JSON) ────────────────────────────────────────────────
    plugin_file = data_dir / "plugin_settings.json"
    if plugin_file.exists():
        with open(plugin_file) as f:
            plugins = json.load(f)

        plugin_docs, plugin_ids, plugin_metas = [], [], []
        for i, plugin in enumerate(plugins):
            # Flatten the plugin object into a plain-text document for embedding
            doc = f"""Plugin: {plugin['plugin']}
Type: {plugin['type']}
Controls: {json.dumps(plugin['controls'], indent=2)}
"""
            if "typical_ranges" in plugin:
                doc += f"Typical Ranges: {json.dumps(plugin['typical_ranges'], indent=2)}"
            plugin_docs.append(doc)
            plugin_ids.append(f"plugin_{i}")
            plugin_metas.append({"plugin": plugin["plugin"], "type": plugin["type"]})

        if plugin_docs:
            plugin_collection.upsert(
                documents=plugin_docs,
                ids=plugin_ids,
                metadatas=plugin_metas
            )
            print(f"✅ Ingested {len(plugin_docs)} plugin entries")
    else:
        print("⚠️  plugin_settings.json not found, skipping")

    # ── Band tones (TXT) ──────────────────────────────────────────────────────
    tone_file = data_dir / "guitar_tone_reference.txt"
    if tone_file.exists():
        bands = parse_tone_reference(tone_file)

        band_docs  = [b['document'] for b in bands]
        band_ids   = [b['id']       for b in bands]
        band_metas = [{'band': b['band'], 'genre': b['genre']} for b in bands]

        if band_docs:
            band_collection.upsert(
                documents=band_docs,
                ids=band_ids,
                metadatas=band_metas
            )
            print(f"✅ Ingested {len(band_docs)} band entries from guitar_tone_reference.txt")
    else:
        print("⚠️  guitar_tone_reference.txt not found")


def query_rag(vst_name: str | None, band_name: str, top_k: int = 3) -> str:
    """
    Query ChromaDB for context relevant to the given band and optional VST.

    Returns a multi-section string:
      === BAND TONE DATA ===
      <top_k band tone documents>

      === PLUGIN SETTINGS DATA ===
      <top_k plugin documents>

    Returns "" if both collections are empty (e.g. first run before ingest).

    Args:
      vst_name  — full plugin name for the plugin query; if None, uses a generic
                  guitar amp query so we still get some plugin context
      band_name — used to build the band semantic query
      top_k     — max number of results per collection (capped by collection size)
    """
    context_parts = []

    # ── Band tone retrieval ───────────────────────────────────────────────────
    band_query = f"{band_name} guitar tone EQ settings rhythm lead"
    band_count = band_collection.count()
    if band_count > 0:
        band_results = band_collection.query(
            query_texts=[band_query],
            n_results=min(top_k, band_count)  # can't request more than collection size
        )
        if band_results["documents"][0]:
            context_parts.append("=== BAND TONE DATA ===")
            for doc in band_results["documents"][0]:
                context_parts.append(doc)

    # ── Plugin settings retrieval ─────────────────────────────────────────────
    plugin_count = plugin_collection.count()
    if plugin_count > 0:
        plugin_query = (
            f"{vst_name} controls parameters"
            if vst_name
            else "guitar amp plugin controls gain bass treble"
        )
        plugin_results = plugin_collection.query(
            query_texts=[plugin_query],
            n_results=min(top_k, plugin_count)
        )
        if plugin_results["documents"][0]:
            context_parts.append("=== PLUGIN SETTINGS DATA ===")
            for doc in plugin_results["documents"][0]:
                context_parts.append(doc)

    return "\n\n".join(context_parts)


# ── Auto-ingest on import ─────────────────────────────────────────────────────
# If the DB was just created (both collections empty), populate it immediately.
# Wrapped in try/except so a missing data file doesn't block the server start.
try:
    if plugin_collection.count() == 0 or band_collection.count() == 0:
        ingest_data()
except Exception as e:
    print(f"RAG init warning: {e}")