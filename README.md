# News Gamma Tan News Platform

This project is an AI-native newsroom: live RSS ingestion, automated fact validation, article generation, bias/readability evaluation, and transparent provenance.

## Setup

1. Backend
   - `cd backend`
   - create or edit `.env`
     - set `HUGGINGFACE_API_KEY=your_huggingface_key` (get from https://huggingface.co/settings/tokens)
     - set `VIRLO_API_KEY=your_virlo_key` (optional for Virlo trend signal enrichment)
   - install Python dependencies:
     - `python -m pip install -r requirements.txt`

2. Frontend
   - `cd frontend`
   - install Node dependencies:
     - `npm install`

## Run locally

### Backend

From `backend/`:

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at `http://localhost:8000`.

### Frontend

From `frontend/`:

```powershell
npm run dev -- --host 0.0.0.0 --port 5173
```

The frontend will be available at `http://localhost:5173`.

## HTTPS demo

If you want to demo the frontend over HTTPS locally, run Vite with the built-in secure server flag:

```powershell
npm run dev -- --host 0.0.0.0 --port 5173 --https
```

Then open:

- `https://localhost:5173`

If the browser warns about a self-signed certificate, approve the exception for your local demo.

## Trigger the pipeline

1. Open the frontend and use the `Generate` button.
2. Or call the backend endpoints:
   - `POST http://localhost:8000/api/ingest`
   - `POST http://localhost:8000/api/pipeline/run`

The pipeline now requires a valid `HUGGINGFACE_API_KEY` for the free Mistral-7B model; `VIRLO_API_KEY` is optional and adds trend signal enrichment.

## Notes

- This implementation does not rely on mock editorial data in the live pipeline.
- `VIRLO_API_KEY` is optional and adds trending social context to the generated articles.
