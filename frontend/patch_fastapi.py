import sys

path = "/Users/biplovgautam/Desktop/hackathon/tsn.mediscript/ai-service/enroll_voice/router.py"
with open(path, "r") as f:
    text = f.read()

text = text.replace('def enroll_voice(file: UploadFile = File(...)):', 'def enroll_voice(file: UploadFile = File(...)):\n    print("--- FASTAPI ENROLL_VOICE HIT ---")\n    print("Filename:", file.filename)')
with open(path, "w") as f:
    f.write(text)
