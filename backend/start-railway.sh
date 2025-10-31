#!/bin/bash
python init_db.py || true
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
