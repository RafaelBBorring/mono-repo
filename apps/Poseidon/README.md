# 🌊 Surf Classifier

> AI-powered surf video classification with a 4-agent ensemble + human review workflow

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        React Frontend                       │
│  Upload  ·  Dashboard (L1 Review)  ·  Review (L2 Review)   │
│  Surfists management  ·  WebSocket real-time progress       │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP / WebSocket
┌───────────────────────▼─────────────────────────────────────┐
│                   FastAPI Backend                           │
│  /api/upload  ·  /api/review  ·  /api/surfists              │
│  Chunked uploads · Static file serving                      │
└───────┬───────────────────────────────────────┬─────────────┘
        │ asyncio.gather()                       │ SQLAlchemy
        ▼                                        ▼
┌───────────────────────────┐        ┌──────────────────────┐
│  4 AI Agents (parallel)   │        │  SQLite / PostgreSQL  │
│  ┌─────────────────────┐  │        │  Videos · Surfists    │
│  │ Agent 1: Face       │  │        │  Jobs · Sessions      │
│  │ DeepFace FaceNet512 │  │        └──────────────────────┘
│  ├─────────────────────┤  │
│  │ Agent 2: Pose       │  │
│  │ MediaPipe 33-pt     │  │
│  ├─────────────────────┤  │
│  │ Agent 3: Board      │  │
│  │ YOLOv8 + ORB        │  │
│  ├─────────────────────┤  │
│  │ Agent 4: Style      │  │
│  │ Temporal pose stats │  │
│  └──────────┬──────────┘  │
└─────────────┼─────────────┘
              ▼
┌─────────────────────────────┐
│   Fusion & Decision Engine  │
│   Weighted vote (0.35/0.20/ │
│   0.25/0.20) + consistency  │
│   bonus                     │
│                             │
│   ≥85% → Auto-classify      │
│   40–84% → Human review     │
│   <40%  → Unclassified      │
└─────────────────────────────┘
```

---

## Quick Start

### 1. Backend

```bash
cd surf-classifier
cp .env.example .env

pip install -r requirements.txt

cd backend
uvicorn main:app --reload --port 8000
# API docs: http://localhost:8000/docs
```

### 2. Frontend

```bash
cd surf-classifier/frontend
npm install
npm run dev
# UI: http://localhost:5173
```

### 3. Docker (recommended for production)

```bash
cd surf-classifier
docker-compose up --build
# UI: http://localhost  |  API: http://localhost:8000
```

---

## Workflow

### Step 1 – Register Surfers
Go to **Surfers** tab → Add each surfer → Upload 3–5 reference photos or a short reference clip.
The system automatically extracts and stores face, pose, style, and board embeddings.

### Step 2 – Upload Session Footage
Go to **Upload** tab → Drop all session videos.
Each video is processed in real-time with WebSocket progress updates.

### Step 3 – Level 1 Review (Dashboard)
Check the **Dashboard** for:
- Auto-classified folders (≥85% confidence) → verify in bulk
- Similarity warnings between surfers (possible misclassifications)
- Queue counts for human review

### Step 4 – Level 2 Review (Video Review)
Review ambiguous videos (40–84% confidence) one by one:

| Key | Action             |
|-----|--------------------|
| `1` | Confirm AI pick    |
| `2` | Move to Unclassified |
| `3` | Reassign to surfer |
| `S` | Skip for later     |
| `← →` | Navigate queue   |

---

## AI Agents

| Agent | Method | Dim | Weight |
|-------|--------|-----|--------|
| Face | DeepFace FaceNet512 | 512 | 35% |
| Body Pose | MediaPipe 33-landmark biomechanics | 20 | 20% |
| Surfboard | YOLOv8 + ORB texture fingerprint | 256 | 25% |
| Style | Temporal pose-sequence statistics | 64 | 20% |

Agents run **concurrently** (`asyncio.gather`) and fail gracefully — if one agent can't detect its signal (no face visible, board obscured), the other agents' weights are re-normalised.

**Confidence scoring:**
- Each agent produces a cosine similarity score against stored embeddings
- The Fusion Engine applies weighted voting
- A **consistency bonus** (+5%) is added when ≥3 agents agree on the same surfer
- Final score is clipped to [0.0, 1.0]

---

## Project Structure

```
surf-classifier/
├── backend/
│   ├── main.py                  FastAPI app + lifespan
│   ├── config.py                All settings (env-configurable)
│   ├── database.py              Async SQLAlchemy engine
│   ├── models.py                ORM: Surfist, Video, Job, Session
│   ├── agents/
│   │   ├── base_agent.py        Abstract agent + cosine similarity helpers
│   │   ├── face_agent.py        DeepFace FaceNet512
│   │   ├── pose_agent.py        MediaPipe biomechanics
│   │   ├── board_agent.py       YOLOv8 + ORB fingerprint
│   │   └── style_agent.py       Temporal pose statistics (64-dim)
│   ├── fusion/
│   │   └── decision_engine.py   Weighted vote + routing
│   ├── api/
│   │   ├── upload.py            Chunked upload + WebSocket progress
│   │   ├── review.py            L1 + L2 review endpoints
│   │   └── surfists.py          CRUD + embedding registration
│   └── services/
│       ├── video_processor.py   Frame extraction, thumbnails, metadata
│       ├── classify_pipeline.py Orchestrates all agents + DB write-back
│       └── cleanup.py           Background temp-file cleanup
├── frontend/
│   ├── src/
│   │   ├── api/client.js        Axios API helpers
│   │   ├── pages/
│   │   │   ├── Upload.jsx       Drag-and-drop + WebSocket progress
│   │   │   ├── Dashboard.jsx    Level 1 Review + similarity warnings
│   │   │   ├── Review.jsx       Level 2 per-video review + keyboard shortcuts
│   │   │   └── Surfists.jsx     Surfer management + reference upload
│   │   └── App.jsx              Router + sidebar
│   ├── tailwind.config.js
│   └── vite.config.js           Dev server + API proxy
├── docker-compose.yml
├── Dockerfile.backend
├── requirements.txt
└── .env.example
```

---

## Configuration

All settings live in `.env` (see `.env.example`).

**Key tunable parameters:**

```env
# How aggressively the system auto-classifies
AUTO_CLASSIFY_THRESHOLD=0.85   # Higher → less auto-classification, more human review
HUMAN_REVIEW_THRESHOLD=0.40    # Lower  → more goes to Unclassified

# Agent weights
FACE_WEIGHT=0.35
POSE_WEIGHT=0.20
BOARD_WEIGHT=0.25
STYLE_WEIGHT=0.20

# More frames = more accurate but slower
FRAME_SAMPLE_RATE=5        # Analyze every 5th frame
MAX_FRAMES_FOR_ANALYSIS=120
```

---

## Upgrading to Production

- **Database:** Change `DATABASE_URL` to a PostgreSQL connection string
- **Storage:** Mount an S3-compatible volume or NFS share for `VIDEOS_PATH`
- **GPU:** Install `torch` with CUDA support and `faiss-gpu` for 10–50× faster inference
- **Style Agent:** Replace statistical features with a trained LSTM encoder for better accuracy
- **Board Agent:** Fine-tune YOLOv8 on custom surfboard dataset for better detection

---

## License
MIT
