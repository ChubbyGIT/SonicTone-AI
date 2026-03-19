import chromadb
import json
import re
from pathlib import Path

CHROMA_PATH = "./chroma_db"
client = chromadb.PersistentClient(path=CHROMA_PATH)

plugin_collection = client.get_or_create_collection("plugin_settings")
band_collection = client.get_or_create_collection("band_tones")


def parse_tone_reference(filepath: Path) -> list[dict]:
    """Parse the guitar_tone_reference.txt into structured band entries."""
    text = filepath.read_text(encoding='utf-8')
    bands = []

    # Split by band blocks using the numbered pattern [01], [02] etc.
    band_blocks = re.split(r'\n\s*\[(\d+)\]\s+', text)

    # band_blocks[0] is the header, then alternating: number, content
    i = 1
    while i < len(band_blocks) - 1:
        number = band_blocks[i]
        content = band_blocks[i + 1]
        i += 2

        lines = content.strip().split('\n')
        if not lines:
            continue

        # First line is band name + genre + guitarist + era
        first_line = lines[0].strip()
        band_name = first_line  # full first line as band name

        # Try to extract cleaner band name (before Genre:)
        name_match = re.match(r'^([A-Z][^\n]+?)(?:\s+Genre:|$)', first_line)
        if name_match:
            band_name = name_match.group(1).strip()

        # Extract genre, guitarist, era from next lines
        genre = ''
        guitarist = ''
        era = ''
        for line in lines[:5]:
            if 'Genre:' in line:
                genre_match = re.search(r'Genre:\s*([^|]+)', line)
                if genre_match:
                    genre = genre_match.group(1).strip()
            if 'Guitarist:' in line:
                guit_match = re.search(r'Guitarist:\s*([^|]+)', line)
                if guit_match:
                    guitarist = guit_match.group(1).strip()
            if 'Peak Era:' in line:
                era_match = re.search(r'Peak Era:\s*(.+)', line)
                if era_match:
                    era = era_match.group(1).strip()

        # Extract rhythm and lead sections
        rhythm_section = ''
        lead_section = ''

        rhythm_match = re.search(
            r'──\s*RHYTHM TONE\s*─+\s*(.*?)(?=──\s*LEAD TONE|····|$)',
            content, re.DOTALL
        )
        lead_match = re.search(
            r'──\s*LEAD TONE\s*─+\s*(.*?)(?=····|$)',
            content, re.DOTALL
        )

        if rhythm_match:
            rhythm_section = rhythm_match.group(1).strip()
        if lead_match:
            lead_section = lead_match.group(1).strip()

        # Build the full document for RAG
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
            'id': f"band_{number.zfill(3)}",
            'band': band_name,
            'genre': genre,
            'document': doc,
        })

    return bands


def ingest_data():
    """Ingest plugin and band data into ChromaDB."""
    data_dir = Path(__file__).parent / "data"

    # ── Ingest plugin settings (JSON) ──
    plugin_file = data_dir / "plugin_settings.json"
    if plugin_file.exists():
        with open(plugin_file) as f:
            plugins = json.load(f)

        plugin_docs, plugin_ids, plugin_metas = [], [], []
        for i, plugin in enumerate(plugins):
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

    # ── Ingest band tones (TXT) ──
    tone_file = data_dir / "guitar_tone_reference.txt"
    if tone_file.exists():
        bands = parse_tone_reference(tone_file)

        band_docs = [b['document'] for b in bands]
        band_ids = [b['id'] for b in bands]
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
    """Query ChromaDB for relevant context."""
    context_parts = []

    # Query band tones
    band_query = f"{band_name} guitar tone EQ settings rhythm lead"
    band_count = band_collection.count()
    if band_count > 0:
        band_results = band_collection.query(
            query_texts=[band_query],
            n_results=min(top_k, band_count)
        )
        if band_results["documents"][0]:
            context_parts.append("=== BAND TONE DATA ===")
            for doc in band_results["documents"][0]:
                context_parts.append(doc)

    # Query plugin settings
    plugin_count = plugin_collection.count()
    if plugin_count > 0:
        plugin_query = f"{vst_name} controls parameters" if vst_name else "guitar amp plugin controls gain bass treble"
        plugin_results = plugin_collection.query(
            query_texts=[plugin_query],
            n_results=min(top_k, plugin_count)
        )
        if plugin_results["documents"][0]:
            context_parts.append("=== PLUGIN SETTINGS DATA ===")
            for doc in plugin_results["documents"][0]:
                context_parts.append(doc)

    return "\n\n".join(context_parts)


# Auto-ingest on import if DB is empty
try:
    if plugin_collection.count() == 0 or band_collection.count() == 0:
        ingest_data()
except Exception as e:
    print(f"RAG init warning: {e}")