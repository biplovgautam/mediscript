from fastapi import FastAPI
from enroll_voice.router import router as enroll_voice_router

app = FastAPI()

app.include_router(enroll_voice_router)

