from fastapi import APIRouter, File, UploadFile, HTTPException
import whisper
import os
import shutil
import torch

router = APIRouter()

device = "mps" if torch.backends.mps.is_available() else "cpu"

print(f"Loading Whisper model on {device}...")
try:
    # "turbo" refers to large-v3-turbo, which is very fast and incredibly accurate for multi-lingual tasks
    # If standard whisper library on this version doesn't support 'turbo', it will fallback to "medium"
    try:
        model = whisper.load_model("turbo", device=device)
    except:
        print("Turbo not available, falling back to 'medium'...")
        model = whisper.load_model("medium", device=device)
    print("Whisper model loaded successfully!")
except Exception as e:
    print(f"Error loading whisper: {e}")
    model = None

@router.post("/api/ai/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=500, detail="Whisper model not loaded.")
    
    temp_filename = f"temp_transcribe_{file.filename}"
    try:
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save temp file: {e}")
        
    try:
        # Transcribe the audio
        # Whisper natively handles code-switching (mixing English, Nepali, Hindi) in a single audio file perfectly.
        result = model.transcribe(temp_filename)
        return {"status": "success", "transcript": result["text"].strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        # Cleanup temp file
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
