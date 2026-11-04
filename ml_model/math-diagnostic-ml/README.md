---
title: ReasonFirst ML
emoji: 🧠
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
---

# ReasonFirst ML — Math Diagnostic Engine (Class 3 Subtraction)

An explainable, psychometrically-calibrated diagnostic engine designed to detect arithmetic misconceptions in Class 3 subtraction with regrouping (e.g., 61 - 24 = 37 vs 43).

## Endpoints
- `GET /health` — Service health check & engine version
- `POST /predict` — Diagnostic prediction for single probe or combined chat dialogue reasoning
- `POST /diagnose/session` — Multi-probe session evidence synthesis
- `GET /curriculum/probes` — Curated probes catalogue
