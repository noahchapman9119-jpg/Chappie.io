# AI SOAP Note Copilot — MVP Demo

Minimal full-stack prototype for generating SOAP notes from uploaded audio.

## Scope

This project is **demo/prototype only** and intentionally excludes:
- EMR integration
- Billing workflows
- Login/auth
- Database/persistent storage

## Safety & Privacy Notes

- **Do not store patient data** in this demo.
- Use de-identified or synthetic audio only.
- **Clinician review required:** AI-generated transcript and SOAP note must be reviewed/edited by a licensed clinician before any clinical use.

## Tech Stack

- Backend: FastAPI
- Frontend: React + Vite
- AI API:
  - OpenAI transcription (`gpt-4o-mini-transcribe`)
  - OpenAI structured output (Responses API with JSON schema)

## Version Roadmap

- **Version 1 (current):** audio upload → transcript → SOAP note JSON
- **Version 2:** browser recording
- **Version 3:** specialty templates
- **Version 4:** login + secure storage
- **Version 5:** HIPAA-ready infrastructure
- **Version 6:** EMR/FHIR integration

## Project Structure

```
backend/
  main.py
  requirements.txt
frontend/
  src/
    App.jsx
    api.js
.env.example
README.md
```

## Setup

### 1) Clone and configure environment

```bash
cp .env.example .env
```

Edit `.env` and set:
- `OPENAI_API_KEY`

If needed, adjust frontend API target:
- `VITE_API_URL` (default `http://localhost:8000`)

### 2) Run backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend endpoints:
- `GET /health`
- `POST /process-audio` (multipart form upload field name: `file`)

### 3) Run frontend (Vite)

From project root:

```bash
cd frontend
npm install
npm run dev
```

Open the local Vite URL (typically `http://localhost:5173`).

## API Flow

1. User uploads an audio file in the frontend.
2. Frontend sends file to `POST /process-audio`.
3. Backend transcribes audio via OpenAI transcription API.
4. Backend sends transcript to OpenAI structured output call with SOAP schema.
5. Backend returns:
   - `transcript`
   - `soap_note` JSON (`subjective`, `objective`, `assessment`, `plan`)
   - disclaimer text
6. Frontend displays transcript and editable SOAP note text areas.

## Notes

- This MVP keeps data in memory during request processing only.
- No persistence layer is included.
- Add security, auditing, encryption, access controls, and compliance controls before any production/clinical deployment.
