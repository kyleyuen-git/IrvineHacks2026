# LeaseLens

LeaseLens is a prototype rental intelligence app for two audiences:

- Renters comparing properties using local rent and home-value history.
- Landlords checking an explainable forecast score for whether a property is likely to gain value.

The current build uses a local sample dataset shaped after Zillow Research rental and home-value time series. The Zillow Research data portal referenced for future production ingestion is:

- https://www.zillow.com/research/data/

## Stack

- Frontend: React + Vite + CSS
- Backend: Python + FastAPI + Uvicorn
- Data model: local JSON fixture that mirrors Zillow-style monthly history

## Current product features

### Renter mode

- Compare selected properties across 24 months of rent history
- Compare selected properties across 24 months of home-value history
- View a current-details comparison table with rent, value, and dollars per square foot
- Focus a single property for a short renter-facing summary

### Landlord mode

- Select a property from an address dropdown
- View property details, current rent, and estimated value
- See an explainable investment forecast score
- Inspect an interactive historical trend chart
- Inspect a factor-by-factor score breakdown
- Review key insights and market metrics

## Demo dataset

The current sample property set includes:

- 742 Evergreen Terrace, San Francisco, CA
- 1640 Riverside Drive, San Francisco, CA
- 221B Baker Street, Oakland, CA
- 4 Privet Drive, San Jose, CA
- 124 Conch Street, Berkeley, CA
- 1313 Mockingbird Lane, Palo Alto, CA

These are demo/sample records for product prototyping. They are not live Zillow-linked listings.

## Forecast formula

The landlord forecast is currently an explainable heuristic, not a trained AI model.

### Growth formulas

- `rent_growth = (last_rent_index - first_rent_index) / first_rent_index`
- `value_growth = (last_home_value_index - first_home_value_index) / first_home_value_index`

### Factor scores

- `rent_growth_score = clamp(round(rent_growth * 340), 1, 99)`
- `value_growth_score = clamp(round(value_growth * 860), 1, 99)`
- `occupancy_score = clamp(round(occupancy_rate * 100), 1, 99)`
- `neighborhood_score = clamp(round(walk_score * 0.65 + transit_score * 0.35 + 7), 1, 99)`

### Investment score

- `investment_score = clamp(round(rent_growth_score*0.16 + value_growth_score*0.28 + occupancy_score*0.24 + neighborhood_score*0.22 + 3), 1, 99)`

### Additional outputs

- `appreciation_probability = clamp(investment_score / 100, 0.05, 0.95)`
- `projected_value_12m = estimated_value * (1 + value_growth*0.7 + rent_growth*0.3)`
- `expected_gain_12m = projected_value_12m - estimated_value`

## Variable meanings

- `rent_index`: historical monthly rent value
- `home_value_index`: historical monthly home value
- `occupancy_rate`: estimated occupancy share, for example `0.95 = 95%`
- `walk_score`: neighborhood walkability score
- `transit_score`: neighborhood transit access score
- `estimated_value`: current estimated property value

## API contract

This is the current frontend/backend contract that should remain stable as real data and model code are integrated.

### `GET /api/health`

Purpose:

- basic backend health check

Response:

```json
{
  "status": "ok"
}
```

### `GET /api/properties`

Purpose:

- returns the property list used by renter comparison cards and charts

Response:

```json
{
  "properties": [
    {
      "id": "742-evergreen-terrace",
      "name": "742 Evergreen Terrace",
      "address": "742 Evergreen Terrace",
      "city": "San Francisco",
      "state": "CA",
      "neighborhood": "Sunset District",
      "bedrooms": 2,
      "bathrooms": 2,
      "square_feet": 1200,
      "monthly_rent": 3800,
      "estimated_value": 875000,
      "occupancy_rate": 0.95,
      "walk_score": 82,
      "transit_score": 78,
      "renter_takeaway": "Stable rent appreciation and strong transit access make this a dependable comparison anchor for renters who want a balanced San Francisco option.",
      "market_history": [
        {
          "month": "2024-03",
          "rent_index": 3320,
          "home_value_index": 801000
        }
      ]
    }
  ]
}
```

Required fields for frontend:

- `id`
- `name`
- `address`
- `city`
- `state`
- `bedrooms`
- `bathrooms`
- `square_feet`
- `monthly_rent`
- `estimated_value`
- `occupancy_rate`
- `walk_score`
- `transit_score`
- `renter_takeaway`
- `market_history`

### `GET /api/properties/:id`

Purpose:

- returns full property detail for the selected property

Response:

```json
{
  "id": "742-evergreen-terrace",
  "name": "742 Evergreen Terrace",
  "address": "742 Evergreen Terrace",
  "city": "San Francisco",
  "state": "CA",
  "zip_code": "94102",
  "neighborhood": "Sunset District",
  "bedrooms": 2,
  "bathrooms": 2,
  "square_feet": 1200,
  "monthly_rent": 3800,
  "estimated_value": 875000,
  "occupancy_rate": 0.95,
  "walk_score": 82,
  "transit_score": 78,
  "renter_takeaway": "Stable rent appreciation and strong transit access make this a dependable comparison anchor for renters who want a balanced San Francisco option.",
  "market_history": [
    {
      "month": "2024-03",
      "rent_index": 3320,
      "home_value_index": 801000
    }
  ],
  "market_summary": {
    "rent_growth_12m": 0.14,
    "value_growth_12m": 0.09,
    "risk_band": "Low"
  }
}
```

Required fields for frontend:

- everything from `/api/properties`
- plus:
  - `zip_code`
  - `market_summary.rent_growth_12m`
  - `market_summary.value_growth_12m`
  - `market_summary.risk_band`

### `GET /api/valuation/:id`

Purpose:

- returns the landlord forecast object

Response:

```json
{
  "property_id": "742-evergreen-terrace",
  "investment_score": 75,
  "appreciation_probability": 0.75,
  "projected_value_12m": 910000,
  "expected_gain_12m": 35000,
  "summary": "This prototype forecast favors markets with positive recent rent growth, positive home-value momentum, and high occupancy. It is an explainable scoring model, not a guarantee.",
  "drivers": [
    "Strong rent growth at 4.9% annually.",
    "Excellent home value appreciation at 7.9%.",
    "High occupancy indicates strong demand at 95%.",
    "Excellent neighborhood accessibility."
  ],
  "factor_breakdown": {
    "rent_growth": 49,
    "value_growth": 79,
    "occupancy": 95,
    "neighborhood": 88
  },
  "market_metrics": {
    "occupancy_rate": 95,
    "neighborhood_score": 88
  }
}
```

Required fields for frontend:

- `property_id`
- `investment_score`
- `appreciation_probability`
- `projected_value_12m`
- `expected_gain_12m`
- `summary`
- `drivers`
- `factor_breakdown.rent_growth`
- `factor_breakdown.value_growth`
- `factor_breakdown.occupancy`
- `factor_breakdown.neighborhood`
- `market_metrics.occupancy_rate`
- `market_metrics.neighborhood_score`

### Contract rules

- Do not remove or rename required fields without updating the frontend.
- Adding extra fields is safe.
- Model outputs should be added in new fields rather than replacing current ones immediately.
- `market_history` entries should stay in this shape:

```json
{
  "month": "YYYY-MM",
  "rent_index": 0,
  "home_value_index": 0
}
```

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

Open the Vite URL that prints in the terminal. The frontend now uses relative `/api` calls and Vite proxies them to the FastAPI backend during local development.

## Teammate setup

For a new teammate to run the project locally, they need:

- Node.js and npm
- Python 3

Then they run:

```bash
cd /path/to/staging-planner
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
npm install
```

To start the app:

```bash
# terminal 1
source .venv/bin/activate
uvicorn backend.main:app --reload
```

```bash
# terminal 2
npm run dev
```

Important:

- `localhost` only works on the same machine running the app
- teammates cannot see your `localhost` from their computer unless they run the app themselves or you create a public deployment/tunnel

## Notes on Zillow integration

This repo does not pull Zillow data directly yet. The next backend step is to replace `backend/data/properties.json` with an ingestion pipeline that:

1. Downloads the selected Zillow CSVs.
2. Normalizes city/ZIP/metro identifiers.
3. Joins the market history to landlord-owned properties.
4. Recomputes the forecast features from the real data.

## Important product note

The current landlord recommendation is not actual AI or financial advice. It is an explainable heuristic based on recent rent growth, home-value growth, occupancy, and neighborhood accessibility.
