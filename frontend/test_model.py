import torch
import torchaudio
device_str = "mps" if torch.backends.mps.is_available() else "cpu"
print("Using device:", device_str)
from speechbrain.pretrained import EncoderClassifier
print("Loading model...")
classifier = EncoderClassifier.from_hparams(
    source="speechbrain/spkrec-ecapa-voxceleb", 
    savedir="pretrained_models/spkrec-ecapa-voxceleb",
    run_opts={"device": device_str}
)
print("Model loaded.")
# dummy tensor
print("Testing prediction on dummy tensor...")
dummy = torch.randn(1, 16000).to(device_str)
embedding = classifier.encode_batch(dummy)
print("Prediction size:", embedding.shape)
