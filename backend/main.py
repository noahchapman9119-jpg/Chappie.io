import json
import logging
import os
import tempfile
from typing import Dict

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel

load_dotenv()

logger = logging.getLogger("chappie")

MAX_AUDIO_FILE_SIZE = 25 * 1024 * 1024
AUDIO_EXTENSIONS = {".aac", ".aiff", ".flac", ".m4a", ".mp3", ".mp4", ".ogg", ".opus", ".wav", ".webm"}

app = FastAPI(title="AI SOAP Note Copilot MVP")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SoapNote(BaseModel):
    subjective: str
    objective: str
    assessment: str
    plan: str


class ProcessResponse(BaseModel):
    transcript: str
    soap_note: SoapNote
    disclaimer: str


def _get_openai_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.error("OPENAI_API_KEY is not configured.")
        raise HTTPException(
            status_code=500,
            detail="Audio processing is not configured yet. Please try again later.",
        )
    return OpenAI(api_key=api_key)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


def _safe_string(value) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        return "\n".join(str(item) for item in value)
    if isinstance(value, dict):
        return "\n".join(f"{k}: {v}" for k, v in value.items())
    if value is None:
        return ""
    return str(value)


def _is_audio_upload(file: UploadFile) -> bool:
    suffix = os.path.splitext(file.filename or "")[1].lower()
    content_type = (file.content_type or "").lower()
    return content_type.startswith("audio/") or suffix in AUDIO_EXTENSIONS


@app.post("/process-audio", response_model=ProcessResponse)
async def process_audio(file: UploadFile = File(...)) -> ProcessResponse:
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="Please upload an audio file before generating a SOAP note.")

        if not _is_audio_upload(file):
            raise HTTPException(status_code=400, detail="Please upload an audio file, such as MP3, WAV, M4A, OGG, or WebM.")

        client = _get_openai_client()
        suffix = os.path.splitext(file.filename)[1] or ".wav"

        with tempfile.NamedTemporaryFile(delete=True, suffix=suffix) as temp_audio:
            content = await file.read()

            if not content:
                raise HTTPException(status_code=400, detail="The uploaded audio file appears to be empty.")

            if len(content) > MAX_AUDIO_FILE_SIZE:
                raise HTTPException(status_code=413, detail="That audio file is too large for this demo. Please upload a file under 25 MB.")

            temp_audio.write(content)
            temp_audio.flush()

            with open(temp_audio.name, "rb") as audio_file:
                transcription = client.audio.transcriptions.create(
                    model="gpt-4o-mini-transcribe",
                    file=audio_file,
                )

        transcript_text = getattr(transcription, "text", "").strip()

        if not transcript_text:
            raise HTTPException(status_code=500, detail="We could not transcribe the audio. Please try again with clearer audio.")

        soap_completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a clinical documentation assistant for a demo/prototype. "
                        "Return ONLY valid JSON. "
                        "The JSON must have exactly these keys: "
                        "subjective, objective, assessment, plan. "
                        "Each value must be a plain string, not an object and not an array. "
                        "Do not make compliance claims. Remind that clinician review is required when clinically relevant."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Create a SOAP note from this transcript:\n\n{transcript_text}",
                },
            ],
            response_format={"type": "json_object"},
        )

        raw_content = soap_completion.choices[0].message.content or "{}"
        soap_data = json.loads(raw_content)

        clean_soap = {
            "subjective": _safe_string(soap_data.get("subjective")),
            "objective": _safe_string(soap_data.get("objective")),
            "assessment": _safe_string(soap_data.get("assessment")),
            "plan": _safe_string(soap_data.get("plan")),
        }

        disclaimer = (
            "Demo/prototype only. Do not store patient data in this app. "
            "AI-generated documentation must be reviewed and edited by a licensed clinician before use."
        )

        return ProcessResponse(
            transcript=transcript_text,
            soap_note=SoapNote(**clean_soap),
            disclaimer=disclaimer,
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Unhandled /process-audio failure")
        raise HTTPException(
            status_code=500,
            detail="We could not process the audio right now. Please try again with a shorter or clearer audio file.",
        )
