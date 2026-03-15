from fastapi import APIRouter, File, UploadFile, HTTPException
import torch
import torchaudio
import os
import shutil
# Using older SpeechBrain imports since 0.5.16 uses pretrained instead of inference
from speechbrain.pretrained import EncoderClassifier

router = APIRouter()

# Hardware Acceleration: Check for Apple's Metal Performance Shaders (mps)
# Speechbrain needs string device names like "mps" or "cpu"
device_str = "mps" if torch.backends.mps.is_available() else "cpu"

# Model Loading: Load SpeechBrain's ECAPA-TDNN model (Completely OPEN, No HuggingFace Token Needed)
try:
    print("Loading SpeechBrain Encoder...")
    classifier = EncoderClassifier.from_hparams(
        source="speechbrain/spkrec-ecapa-voxceleb", 
        savedir="pretrained_models/spkrec-ecapa-voxceleb",
        run_opts={"device": device_str}
    )
    print("SpeechBrain Encoder loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
    classifier = None

@router.post("/api/ai/enroll-voice")
async def enroll_voice(file: UploadFile = File(...)):
    if classifier is None:
        raise HTTPException(status_code=500, detail="Model not loaded successfully.")

    temp_filename = f"temp_enrollment_{file.filename}"
    
    # Save the incoming UploadFile to a temporary file on disk
    try:
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save temporary file: {e}")

    try:
        # Load audio using SpeechBrain's built-in loader (handles tensor conversion)
        signal = classifier.load_audio(temp_filename)
        
        # Pass the signal to extract the voice embedding
        # Resulting shape: [batch, time, features] -> we squeeze it to a 1D vector
        embedding = classifier.encode_batch(signal)
        
        # Convert it to a standard, flat Python list
        embedding_list = embedding.squeeze().tolist()
            
        return {"status": "success", "embedding": embedding_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice enrollment failed: {str(e)}")
    finally:
        # Cleanup: Ensure temporary audio file is deleted
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
