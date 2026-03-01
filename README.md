# LeaseLens

LeaseLens is a prototype rental intelligence app for two audiences:

- Renters comparing properties using local rent and home-value history.
- Landlords checking an explainable forecast score for whether a property is likely to gain value.

The current build uses a local sample dataset shaped after Zillow Research rental and home-value time series. The Zillow Research data portal referenced for production ingestion is:

- https://www.zillow.com/research/data/

## Stack

- Frontend: React + Vite + CSS
- Backend: FastAPI
- Data model: local JSON fixture that mirrors Zillow-style monthly history

## Project structure

```text
.
├── backend
│   ├── data/properties.json
│   ├── main.py
│   └── requirements.txt
├── src
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── index.html
├── package.json
└── vite.config.js
```

## Run locally

### Backend

```bash
cd /Users/mytruong/staging-planner
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload
```

### Frontend

In a second terminal:

```bash
cd /Users/mytruong/staging-planner
npm install
npm run dev
```

Open the Vite URL that prints in the terminal. The frontend expects the backend at `http://127.0.0.1:8000`.

## Notes on Zillow integration

This repo does not pull Zillow data directly yet. The next backend step is to replace `backend/data/properties.json` with an ingestion pipeline that:

1. Downloads the selected Zillow CSVs.
2. Normalizes city/ZIP/metro identifiers.
3. Joins the market history to landlord-owned properties.
4. Recomputes the forecast features from the real data.

## Important product note

The current landlord recommendation is not actual AI or financial advice. It is an explainable heuristic based on recent rent growth, home-value growth, occupancy, and neighborhood accessibility.
