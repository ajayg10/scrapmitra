# Planned Lambda boundaries

Phase 4 implements upload_url and scan. Later phases add speech, recyclers, correct, offer_check, impact, and price_refresh. No handler currently returns a fabricated success. The contracts in `backend/core/models.py` are the present integration boundary.
