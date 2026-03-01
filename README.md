# LeaseLens

LeaseLens is a React + FastAPI housing workflow app built around real active Irvine listings.

The app supports three views over the same listing dataset:

- `Renter mode`: search, filter, and compare active Irvine listings
- `Landlord mode`: score a single listing using modeled rent and current listing signals
- `Investor mode`: rank active listings by estimated gross yield and market speed

## What Changed

This project no longer depends on the original hypothetical demo workflow for the main user experience.

The current app uses:

- real active Irvine listing data from `backend/data/active_listings.json`
- a trained rent model in `backend/models/rent_model.joblib`
- encoder reconstruction data from `backend/data/filtered_rent.json`

The backend still contains `backend/data/properties.json`, but the current renter and landlord flows are driven by the Irvine listing pipeline instead of the old demo records.

## Stack

- Frontend: React + Vite
- Backend: FastAPI + Uvicorn
- Runtime data processing: pandas
- Rent model inference: scikit-learn + joblib

## Product Modes

### Renter Mode

Renter mode is a comparison workflow over current Irvine inventory.

Features:

- search by address or zip
- filter by min/max price
- filter by bedrooms
- filter by property type
- sort by newest, highest yield, lowest price, or highest modeled rent
- select up to 4 listings to compare
- compare selected listings by:
  - list price
  - modeled monthly rent
  - estimated gross yield
  - days on market

### Landlord Mode

Landlord mode evaluates one active Irvine listing at a time.

Features:

- select a listing from a dropdown
- inspect current listing facts:
  - list price
  - beds / baths
  - square footage
  - modeled rent
  - estimated gross yield
- view an explainable listing score
- inspect factor breakdowns for:
  - gross yield
  - rent signal
  - market speed
  - price efficiency

### Investor Mode

Investor mode is a ranked board over the same real listing dataset.

Features:

- filter by property type
- filter by max days on market
- sort by:
  - highest yield
  - newest
  - lowest price
  - lowest days on market
- inspect builder/development metadata when available

## Data Model

The current app combines:

### Real current listing data

From `backend/data/active_listings.json`:

- address
- city / state / zip
- bedrooms / bathrooms
- square footage
- list price
- listed date
- days on market
- property type
- status
- builder metadata

### Modeled rent output

From `backend/models/rent_model.joblib`:

- predicted monthly rent

### Derived metrics

Calculated in the backend from real data + modeled rent:

- gross yield percentage
- price per square foot
- landlord listing score
- factor breakdown

## Important Accuracy Note

This app is not "pure raw data only."

It uses:

- real listing inputs
- predicted rent from a trained model
- heuristic scoring derived from those inputs

That means:

- list price, sqft, DOM, property type, and builder data are factual listing fields
- modeled rent, gross yield, and landlord score are computed outputs

## Backend Files

Main runtime files:

- `backend/main.py`
- `backend/requirements.txt`
- `backend/data/active_listings.json`
- `backend/data/filtered_rent.json`
- `backend/models/rent_model.joblib`

## API

### `GET /api/health`

Basic health endpoint.

Example response:

```json
{
  "status": "ok"
}
```

### `GET /api/properties`

Returns the real Irvine listing objects used by renter and landlord mode.

Representative fields:

```json
{
  "properties": [
    {
      "id": "185-Sash,-Irvine,-CA-92618",
      "name": "185 Sash",
      "address": "185 Sash, Irvine, CA 92618",
      "city": "Irvine",
      "state": "CA",
      "zip_code": 92618,
      "neighborhood": "ZIP 92618",
      "bedrooms": 4,
      "bathrooms": 4,
      "square_feet": 2847,
      "monthly_rent": 7132.54,
      "estimated_value": 2298000,
      "days_on_market": 12,
      "listed_date": "2026-02-17T00:00:00.000Z",
      "status": "Active",
      "property_type": "Single Family",
      "gross_yield_pct": 3.72,
      "price_per_sqft": 807.27,
      "prediction_ready": true,
      "renter_takeaway": "This listing looks relatively efficient for Irvine on modeled rent versus list price."
    }
  ]
}
```

### `GET /api/properties/{property_id}`

Returns the full listing object for one Irvine property.

### `GET /api/valuation/{property_id}`

Returns the landlord scoring object for one real Irvine listing.

Representative response:

```json
{
  "property_id": "185-Sash,-Irvine,-CA-92618",
  "investment_score": 74,
  "appreciation_probability": 0.74,
  "projected_value_12m": 2328000,
  "expected_gain_12m": 30000,
  "summary": "This Irvine listing score is based on real active inventory, modeled rent, gross yield, days on market, and price efficiency. It is product guidance, not investment advice.",
  "drivers": [
    "Estimated gross yield is 3.72% based on modeled rent versus current list price.",
    "Modeled monthly rent is 7,133 for this single family.",
    "Days on market is 12, which informs current market speed."
  ],
  "factor_breakdown": {
    "yield": 67,
    "rent_signal": 72,
    "market_speed": 88,
    "price_efficiency": 68
  },
  "market_metrics": {
    "predicted_monthly_rent": 7133,
    "gross_yield_pct": 3.72,
    "days_on_market": 12,
    "price_per_sqft": 807.27
  }
}
```

### `GET /api/investor/listings`

Returns the investor-mode listing board.

Representative response:

```json
{
  "meta": {
    "active_listings_ready": true,
    "model_ready": true,
    "encoders_ready": true,
    "warnings": [],
    "total": 573,
    "returned": 24
  },
  "listings": [
    {
      "id": "28-Brigmore-Aisle,-Irvine,-CA-92603",
      "formatted_address": "28 Brigmore Aisle, Irvine, CA 92603",
      "city": "Irvine",
      "state": "CA",
      "zip_code": 92603,
      "property_type": "Condo",
      "bedrooms": 3,
      "bathrooms": 3.5,
      "square_feet": 2547,
      "list_price": 2085000,
      "listed_date": "2026-02-28T00:00:00.000Z",
      "days_on_market": 1,
      "status": "Active",
      "predicted_monthly_rent": 6639.31,
      "estimated_gross_yield_pct": 3.82,
      "prediction_ready": true
    }
  ]
}
```

### `GET /api/investor/listings/{listing_id}`

Returns one raw investor listing plus its serialized listing view.

## Local Development

### 1. Start the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
python3 -m uvicorn main:app --reload --port 8000
```

### 2. Start the frontend

From the repo root:

```bash
npm install
npm run dev
```

The Vite app proxies `/api` to the backend.

## Dependencies

### Frontend

From `package.json`:

- `react`
- `react-dom`
- `vite`
- `@vitejs/plugin-react`

### Backend

From `backend/requirements.txt`:

- `fastapi==0.115.5`
- `uvicorn[standard]==0.32.1`
- `pandas==2.2.3`
- `scikit-learn==1.5.2`
- `joblib==1.4.2`

## Notes

- The app is currently tuned for local development.
- The backend expects the Irvine listing JSON, filtered training JSON, and model file to exist locally.
- If `active_listings.json`, `filtered_rent.json`, or `rent_model.joblib` are missing, investor/model-backed functionality will degrade or fail.

## Future Improvements

- replace the current rent model with a version that persists encoders cleanly
- add details drawers/modals for renter and investor listing inspection
- add map support
- add more robust historical market sources for real non-simulated trend charts
- separate truly factual listing views from predictive outputs more explicitly in the UI
