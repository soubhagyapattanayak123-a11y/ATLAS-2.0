import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    is_dev = os.environ.get("RENDER") is None and os.environ.get("ENV") != "production"
    print(f"Starting ATLAS 2.0 FastAPI Backend on 0.0.0.0:{port} (reload={is_dev}) ...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=is_dev)
