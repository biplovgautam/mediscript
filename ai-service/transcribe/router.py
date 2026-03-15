
from fastapi import APIRouter, File, UploadFile, HTTPException, Form
import json
import whisper
import os
import shutil
import torch
import torchaudio
import torch.nn.functional as F
from pydantic import BaseModel

router = APIRouter()

device = "mps" if torch.backends.mps.is_available() else "cpu"

print(f"Loading Whisper model on {device}...")
try:
    try:
        model = whisper.load_model("turbo", device=device)
    except:
        print("Turbo not available, falling back to 'medium'...")
        model = whisper.load_model("medium", device=device)
    print("Whisper model loaded successfully!")
except Exception as e:
    print(f"Error loading whisper: {e}")
    model = None

# Import speechbrain classifier from enroll_voice
from enroll_voice.router import classifier

@router.post("/api/ai/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    doctor_embedding: str = Form(None)
):
    print(f"[ai.transcribe] request file={file.filename} content_type={file.content_type}", flush=True)
    if model is None:
        raise HTTPException(status_code=500, detail="Whisper model not loaded.")
    
    temp_filename = f"temp_transcribe_{file.filename}"
    try:
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save temp file: {e}")
        
    try:
        # Transcribe with segments
        result = model.transcribe(temp_filename)
        segments = result.get("segments", [])
        print(f"[ai.transcribe] segments_found={len(segments)}", flush=True)
        
        doc_emb_tensor = None
        if doctor_embedding and classifier is not None:
            try:
                emb_list = json.loads(doctor_embedding)
                if isinstance(emb_list, list) and len(emb_list) > 0:
                    doc_emb_tensor = torch.tensor(emb_list).to(device)
                    print(f"[ai.transcribe] doctor_embedding_len={len(emb_list)}", flush=True)
            except:
                pass
        
        parsed_segments = []
        
        if doc_emb_tensor is not None and classifier is not None:
            # Diarization approach
            # Load full audio
            signal, fs = torchaudio.load(temp_filename)
            # Ensure 16000Hz for speechbrain
            if fs != 16000:
                resampler = torchaudio.transforms.Resample(fs, 16000)
                signal = resampler(signal)
                fs = 16000
            
            # If stereo, convert to mono
            if signal.shape[0] > 1:
                signal = signal.mean(dim=0, keepdim=True)
                
            for seg in segments:
                start_time = seg['start']
                end_time = seg['end']
                text = seg['text'].strip()
                if not text:
                    continue
                
                # Extract snippet
                start_sample = int(start_time * fs)
                end_sample = int(end_time * fs)
                snippet = signal[:, start_sample:end_sample].to(device)
                
                # Too short? fallback
                if snippet.shape[1] < fs * 0.5: # less than 0.5s
                    role = "Unknown"
                else:
                    emb = classifier.encode_batch(snippet).squeeze()
                    # Cosine similarity
                    sim = F.cosine_similarity(emb, doc_emb_tensor, dim=0).item()
                    # Threshold for doctor
                    # 0.25 is usually a good threshold for ECAPA-TDNN embeddings cosine similarity
                    if sim > 0.25:
                        role = "Doctor"
                    else:
                        role = "Patient"
                
                parsed_segments.append({
                    "start": start_time,
                    "end": end_time,
                    "text": text,
                    "role": role
                })
        else:
            for seg in segments:
                parsed_segments.append({
                    "start": seg['start'],
                    "end": seg['end'],
                    "text": seg['text'].strip(),
                    "role": "Unknown"
                })

        print(f"[ai.transcribe] parsed_segments={len(parsed_segments)}", flush=True)
        return {"status": "success", "segments": parsed_segments, "full_transcript": result["text"].strip()}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
