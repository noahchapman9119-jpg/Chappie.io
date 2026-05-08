import json
import os
import tempfile
from typing import Any, Dict
from fastapi.middleware.cors import CORSMiddleware

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
    allow_credentials=True,
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

        schema: Dict[str, Any] = {
            "name": "soap_note",
            "schema": {
                "type": "object",
                "properties": {
                    "subjective": {"type": "string"},
                    "objective": {"type": "string"},
                    "assessment": {"type": "string"},
                    "plan": {"type": "string"},
                },
                "required": ["subjective", "objective", "assessment", "plan"],
                "additionalProperties": False,
            },
            "strict": True,
        }

        completion = client.responses.create(
            model="gpt-4.1-mini",
            input=[
                {
                    "role": "system",
                    "content": "You are a clinical documentation assistant for demo purposes. Output concise SOAP note fields based strictly on the transcript. If information is missing, state 'Not provided.'",
                },
                {
                    "role": "user",
                    "content": f"Convert this transcript into SOAP note JSON:\n\n{transcript_text}",
                },
            ],
            text={"format": {"type": "json_schema", "name": schema["name"], "schema": schema["schema"], "strict": True}},
        )

        raw_json = completion.output_text

        try:
            soap_data = json.loads(raw_json)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=500, detail="Invalid JSON returned by model.") from exc

        disclaimer = (
            "Demo/prototype only. Do not store patient data in this app. "
            "AI-generated documentation must be reviewed and edited by a licensed clinician before use."
        )

        return ProcessResponse(
            transcript=transcript_text,
            soap_note=SoapNote(**soap_data),
            disclaimer=disclaimer,
        )
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {"error": str(e)}