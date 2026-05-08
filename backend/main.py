import json
import os
import tempfile
from typing import Dict

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel

load_dotenv()

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
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured.")
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


@app.post("/process-audio", response_model=ProcessResponse)
async def process_audio(file: UploadFile = File(...)) -> ProcessResponse:
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="Missing file name.")

        client = _get_openai_client()

        suffix = os.path.splitext(file.filename)[1] or ".wav"

        with tempfile.NamedTemporaryFile(delete=True, suffix=suffix) as temp_audio:
            content = await file.read()

            if not content:
                raise HTTPException(status_code=400, detail="Uploaded file is empty.")

            temp_audio.write(content)
            temp_audio.flush()

            with open(temp_audio.name, "rb") as audio_file:
                transcription = client.audio.transcriptions.create(
                    model="gpt-4o-mini-transcribe",
                    file=audio_file,
                )

        transcript_text = getattr(transcription, "text", "").strip()

        if not transcript_text:
            raise HTTPException(status_code=500, detail="Transcription failed.")

        soap_completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a clinical documentation assistant. "
                        "Return ONLY valid JSON. "
                        "The JSON must have exactly these keys: "
                        "subjective, objective, assessment, plan. "
                        "Each value must be a plain string, not an object and not an array."
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

    except Exception as e:
        import traceback

        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))