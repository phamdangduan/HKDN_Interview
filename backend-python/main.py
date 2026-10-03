import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import campaigns, candidates, interviews

# Create tables in MySQL if not exists (safeguard)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TalentAI Core Backend API",
    description="Hệ thống Backend API cho Nền tảng Phỏng vấn AI & Tự động sàng lọc ứng viên (TalentAI).",
    version="1.0.0"
)

# Enable CORS for Frontend HTML access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(campaigns.router)
app.include_router(candidates.router)
app.include_router(interviews.router)

@app.get("/", tags=["Health Check"])
def root():
    return {
        "status": "online",
        "service": "TalentAI Backend API",
        "database": "MySQL (talentai_db)",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    port = int(os.getenv("APP_PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
