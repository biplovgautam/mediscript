from fastapi import FastAPI
from enroll_voice.router import router as enroll_voice_router
from transcribe.router import router as transcribe_router

app = FastAPI()

app.include_router(enroll_voice_router)
app.include_router(transcribe_router)

