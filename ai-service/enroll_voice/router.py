from fastapi import APIRouter, File, UploadFile, HTTPException
import torch
import os
import shutil

router = APIRouter()

SpeechBrainEncoderClassifier = None
speechbrain_import_error: str | None = None

try:
    # Newer SpeechBrain versions
    from speechbrain.inference.speaker import EncoderClassifier as SpeechBrainEncoderClassifier
except Exception as first_error:
    try:
        # Backward compatibility with older SpeechBrain versions
        from speechbrain.pretrained import EncoderClassifier as SpeechBrainEncoderClassifier
    except Exception as second_error:
        speechbrain_import_error = f"{first_error}; fallback failed: {second_error}"

# Hardware Acceleration: Check for Apple's Metal Performance Shaders (mps)
# Speechbrain needs string device names like "mps" or "cpu"
device_str = "mps" if torch.backends.mps.is_available() else "cpu"

# Model Loading: Load SpeechBrain's ECAPA-TDNN model (Completely OPEN, No HuggingFace Token Needed)
try:
    if SpeechBrainEncoderClassifier is None:
        raise RuntimeError(speechbrain_import_error or "SpeechBrain import failed")

    print("Loading SpeechBrain Encoder...")
    classifier = SpeechBrainEncoderClassifier.from_hparams(
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
        detail = "Model not loaded successfully."
        if speechbrain_import_error:
            detail = f"{detail} SpeechBrain import error: {speechbrain_import_error}"
        raise HTTPException(status_code=500, detail=detail)

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
