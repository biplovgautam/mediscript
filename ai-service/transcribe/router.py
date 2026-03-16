
from fastapi import APIRouter, File, UploadFile, HTTPException, Form
import json
import whisper
import os
import shutil
import httpx
import torch
from dotenv import load_dotenv

router = APIRouter()
load_dotenv()

device = "mps" if torch.backends.mps.is_available() else "cpu"
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_MODEL = os.getenv("GROQ_MODEL", "whisper-large-v3-turbo").strip()
GROQ_CHAT_MODEL = os.getenv("GROQ_CHAT_MODEL", "llama-3.3-70b-versatile").strip()
GROQ_BASE_URL = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1").strip()

model = None
if not GROQ_API_KEY:
    print(f"[ai.transcribe] GROQ_API_KEY missing. Falling back to local Whisper on {device}...", flush=True)
    try:
        try:
            model = whisper.load_model("turbo", device=device)
        except:
            print("Turbo not available, falling back to 'medium'...", flush=True)
            model = whisper.load_model("medium", device=device)
        print("Whisper model loaded successfully!", flush=True)
    except Exception as e:
        print(f"Error loading whisper: {e}", flush=True)
        model = None
else:
    print(f"[ai.transcribe] Groq configured. Using model={GROQ_MODEL}", flush=True)

@router.post("/api/ai/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    doctor_embedding: str = Form(None)
):
    print(f"[ai.transcribe] request file={file.filename} content_type={file.content_type}", flush=True)
    if not GROQ_API_KEY and model is None:
        raise HTTPException(status_code=500, detail="Whisper model not loaded and GROQ_API_KEY missing.")
    
    temp_filename = f"temp_transcribe_{file.filename}"
    try:
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save temp file: {e}")
        
    try:
        # Transcribe with segments (Groq if available; local Whisper otherwise)
        segments = []
        full_text = ""
        if GROQ_API_KEY:
            url = f"{GROQ_BASE_URL}/audio/transcriptions"
            headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
            with open(temp_filename, "rb") as audio_file:
                files = {
                    "file": (file.filename or "audio.webm", audio_file, file.content_type or "audio/webm")
                }
                data = {
                    "model": GROQ_MODEL,
                    "response_format": "verbose_json"
                }
                with httpx.Client(timeout=120) as client:
                    resp = client.post(url, headers=headers, files=files, data=data)
            if resp.status_code >= 400:
                raise HTTPException(status_code=500, detail=f"Groq transcription failed: {resp.text}")
            payload = resp.json()
            segments = payload.get("segments", []) or []
            full_text = (payload.get("text") or "").strip()
        else:
            result = model.transcribe(temp_filename)
            segments = result.get("segments", [])
            full_text = (result.get("text") or "").strip()

        print(f"[ai.transcribe] segments_found={len(segments)}", flush=True)
        
        parsed_segments = []
        for seg in segments:
            parsed_segments.append({
                "start": seg.get('start'),
                "end": seg.get('end'),
                "text": (seg.get('text') or '').strip(),
                "role": "Unknown"
            })

        analysis = {
            "complaint": "",
            "symptoms": "",
            "history": "",
            "diagnosis": "",
            "rx": "",
            "followup": ""
        }

        if GROQ_API_KEY and parsed_segments:
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are a specialist medical scribe for real outpatient consultations. "
                        "Your job is to label each segment as Doctor or Patient based on clinical intent, "
                        "not on names. Use these rules:\n"
                        "1) The Doctor asks questions, performs exams, gives advice, diagnoses, prescribes, summarizes, or reassures.\n"
                        "2) The Patient describes symptoms, history, concerns, answers questions, or asks for help.\n"
                        "3) If a segment clearly contains medical instructions or prescriptions, it is Doctor.\n"
                        "4) If a segment is brief and ambiguous (e.g., 'okay', 'yes'), label as Patient unless it is clearly a Doctor reply.\n"
                        "5) If uncertain, choose Doctor for direct questions and Patient for symptom statements.\n"
                        "6) Avoid Unknown unless a line is truly non-speech or empty.\n"
                        "Keep the original text unchanged.\n\n"
                        "Examples:\n"
                        "- \"Hello, how are you feeling today?\" -> Doctor\n"
                        "- \"I have a headache and fever\" -> Patient\n"
                        "- \"Take paracetamol twice daily\" -> Doctor"
                    )
                },
                {
                    "role": "user",
                    "content": (
                        "Return JSON only in this schema:\n"
                        "{\n"
                        "  \"segments\": [{\"start\": number|null, \"end\": number|null, \"text\": string, \"speaker\": \"Doctor\"|\"Patient\"}],\n"
                        "  \"analysis\": {\n"
                        "    \"notes\": string,\n"
                        "    \"symptoms\": string,\n"
                        "    \"examination\": string,\n"
                        "    \"issues\": string,\n"
                        "    \"plan\": string,\n"
                        "    \"advice\": string\n"
                        "  }\n"
                        "}\n\n"
                        "If the conversation does not contain a field, return an empty string for it.\n"
                        "Use the full transcript to infer the summary fields.\n\n"
                        f"Full transcript:\n{full_text}\n\n"
                        f"Segments:\n{json.dumps(parsed_segments)}"
                    )
                }
            ]

            try:
                url = f"{GROQ_BASE_URL}/chat/completions"
                headers = {
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": GROQ_CHAT_MODEL,
                    "temperature": 0.2,
                    "messages": messages
                }
                with httpx.Client(timeout=120) as client:
                    resp = client.post(url, headers=headers, json=payload)
                if resp.status_code < 400:
                    content = resp.json()["choices"][0]["message"]["content"]
                    parsed = json.loads(content)
                    if isinstance(parsed, dict):
                        parsed_segments = parsed.get("segments", parsed_segments)
                        analysis = parsed.get("analysis", analysis)
            except Exception as llm_error:
                print(f"[ai.transcribe] LLM analysis failed: {llm_error}", flush=True)

        # Normalize speaker labels from LLM
        normalized_segments = []
        for seg in parsed_segments:
            speaker = seg.get("speaker") or seg.get("role") or "Unknown"
            speaker_norm = str(speaker).strip().lower()
            if speaker_norm == "doctor":
                speaker_label = "Doctor"
            elif speaker_norm == "patient":
                speaker_label = "Patient"
            else:
                speaker_label = "Unknown"
            normalized_segments.append({
                "start": seg.get("start"),
                "end": seg.get("end"),
                "text": (seg.get("text") or "").strip(),
                "speaker": speaker_label
            })

        # Heuristic fallback if too many Unknowns
        unknown_ratio = 0 if not normalized_segments else sum(1 for s in normalized_segments if s["speaker"] == "Unknown") / len(normalized_segments)
        if unknown_ratio > 0.3:
            for s in normalized_segments:
                if s["speaker"] == "Unknown":
                    text = s["text"].lower()
                    if "?" in text or text.startswith(("do you", "how are", "are you", "any ", "have you", "please", "let me", "i recommend", "i suggest", "take ", "you should")):
                        s["speaker"] = "Doctor"
                    else:
                        s["speaker"] = "Patient"

        print(f"[ai.transcribe] parsed_segments={len(parsed_segments)}", flush=True)
        return {"status": "success", "segments": normalized_segments, "full_transcript": full_text, "analysis": analysis}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)


@router.post("/api/ai/insights")
async def summarize_transcript(payload: dict):
    transcript = (payload.get("transcript") or "").strip()
    if not transcript:
        raise HTTPException(status_code=400, detail="transcript is required")

    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY missing")

    messages = [
        {
            "role": "system",
            "content": (
                "You are an expert medical scribe. Summarize the consultation into structured sections.\n"
                "Rules:\n"
                "1) Notes: a concise 3-5 sentence summary of the visit.\n"
                "2) Symptoms: bullet-style list of patient-reported symptoms.\n"
                "3) On Examination: only findings stated by the clinician; if not present, return empty string.\n"
                "4) Issues: clinician's assessment/problems.\n"
                "5) Plan: next steps, investigations, or treatment plan.\n"
                "6) Advice: patient instructions.\n"
                "If Plan or Advice are not explicitly stated, provide a safe, generic clinician plan/advice based on the transcript:\n"
                "- Plan should mention review of current meds, possible eye exam, and follow-up.\n"
                "- Advice should mention adherence to prescribed meds, avoid self-adjusting, and return if worsening.\n"
                "Do not invent specific drugs or dosages."
            )
        },
        {
            "role": "user",
            "content": (
                "Return JSON only in this schema:\n"
                "{\n"
                "  \"notes\": string,\n"
                "  \"symptoms\": string,\n"
                "  \"examination\": string,\n"
                "  \"issues\": string,\n"
                "  \"plan\": string,\n"
                "  \"advice\": string\n"
                "}\n\n"
                f"Transcript:\n{transcript}"
            )
        }
    ]

    url = f"{GROQ_BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": GROQ_CHAT_MODEL,
        "temperature": 0.2,
        "messages": messages,
        "response_format": { "type": "json_object" }
    }
    with httpx.Client(timeout=120) as client:
        resp = client.post(url, headers=headers, json=payload)
    if resp.status_code >= 400:
        raise HTTPException(status_code=500, detail=f"Groq insights failed: {resp.text}")

    content = resp.json()["choices"][0]["message"]["content"]
    try:
        parsed = json.loads(content)
    except Exception:
        # Fallback: try to extract JSON object from text
        start = content.find("{")
        end = content.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                parsed = json.loads(content[start:end+1])
            except Exception:
                raise HTTPException(status_code=500, detail="Groq insights returned invalid JSON")
        else:
            raise HTTPException(status_code=500, detail="Groq insights returned invalid JSON")

    return {"status": "success", "analysis": parsed}
