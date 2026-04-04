# Veritas AI — The Intelligence Wire

> **The Core Vibe:** Real journalism, built entirely by AI. Radically transparent, free of human bias, and grounded in multi-source corroboration.

Veritas AI is an autonomous, AI-native newsroom. It doesn't just aggregate feeds—it acts as a digital editor-in-chief and senior correspondent. By ingesting live data from trusted global sources, it cross-references facts, evaluates claims for corroboration, and writes professional-grade news articles completely on its own, with its entire "thought process" visible to the reader.

## 🌟 Key Features

- **Autonomous News Generation**: Wakes up, reads the news from 18 global sources (Reuters, BBC, NASA, etc.), fact-checks claims, and publishes full articles without human intervention.
- **Radical Transparency (The Provenance Vault)**: Every article proudly displays exactly where its facts came from, including a **Depth Meter** for multi-source corroboration and a **Confidence Score**.
- **Automated Bias & Quality Control**: A secondary LLM acts as an ethics analyst, scoring the generated article for neutrality and readability before it goes live.
- **Interactive AI Q&A**: Readers can "Ask the Reporter" questions about any article, and the AI will answer strictly using the verified facts within the text—no hallucinations or external data allowed.
- **Sponsored by Virlo.ai**: Employs real-time trend signals to keep the news surface contextually aware.

## 🛠️ The Tech Stack

- **Frontend**: React, TypeScript, Vite, deployed on **Vercel**.
- **Backend**: FastAPI (Python), entirely in-memory and stateless, deployed on **Render**.
- **AI Models**: 
  - `llama-3.1-8b-instant` for rapid data extraction and bias evaluation.
  - `llama-3.3-70b-versatile` for elite, world-class journalism generation via **Groq**.

## 🚀 Live Deployment Instructions

Veritas AI is designed to be hosted globally with zero database required:

1. **Backend (Render):**
   - Deploy the `backend/` folder to a Render Web Service.
   - Set Environment Variables: 
     - `GROQ_API_KEY`: Your free key from console.groq.com
     - `VIRLO_API_KEY`: (Optional) Your Virlo Developer key
   - Add a ping tool like UptimeRobot to your `/health` endpoint to prevent cold starts.

2. **Frontend (Vercel):**
   - Deploy the `frontend/` folder to Vercel.
   - Set Environment Variable:
     - `VITE_API_BASE`: `https://your-render-app.onrender.com`
   - Future deployments of the frontend will automatically connect to the live AI backend.

## 💻 Local Development Setup

To run the newsroom on your own machine:

1. **Start the Backend:**
   ```bash
   cd backend
   python -m pip install -r requirements.txt
   # Create a .env file with GROQ_API_KEY=your_key
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Start the Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev -- --host 0.0.0.0 --port 5173
   ```
   *The newsroom will boot up at `http://localhost:5173`. If the screen is empty, wait 90 seconds while the AI ingests world news and writes its first batch of articles.*
