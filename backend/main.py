from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware


DATA_PATH = Path(__file__).parent / "data" / "properties.json"


def load_properties() -> list[dict]:
    with DATA_PATH.open("r", encoding="utf-8") as source:
        return json.load(source)


def growth_rate(history: list[dict], key: str) -> float:
    first = history[0][key]
    last = history[-1][key]
    return (last - first) / first


def summarize_market(property_record: dict) -> dict:
    history = property_record["market_history"]
    rent_growth = growth_rate(history, "rent_index")
    value_growth = growth_rate(history, "home_value_index")

    if value_growth >= 0.08 and property_record["occupancy_rate"] >= 0.94:
        risk_band = "Low"
    elif value_growth >= 0.04:
        risk_band = "Moderate"
    else:
        risk_band = "Elevated"

    return {
        "rent_growth_12m": round(rent_growth, 4),
        "value_growth_12m": round(value_growth, 4),
        "risk_band": risk_band,
    }


def valuation_for(property_record: dict) -> dict:
    summary = summarize_market(property_record)
    value_growth = summary["value_growth_12m"]
    rent_growth = summary["rent_growth_12m"]
    occupancy_rate = property_record["occupancy_rate"]

    score = (
        value_growth * 340
        + rent_growth * 260
        + occupancy_rate * 20
        + (property_record["walk_score"] / 100) * 10
        + (property_record["transit_score"] / 100) * 10
    )
    investment_score = max(1, min(99, round(score)))
    appreciation_probability = max(0.05, min(0.95, round(investment_score / 100, 2)))
    projected_value = round(
        property_record["estimated_value"] * (1 + value_growth * 0.7 + rent_growth * 0.3)
    )

    drivers = [
        f"Observed 12-month rent growth is {round(rent_growth * 100, 1)}%.",
        f"Observed 12-month home-value growth is {round(value_growth * 100, 1)}%.",
        f"Occupancy is {round(occupancy_rate * 100, 1)}%, which supports income stability.",
    ]

    if property_record["walk_score"] >= 75:
        drivers.append("Neighborhood accessibility is strong enough to support renter demand.")

    return {
        "property_id": property_record["id"],
        "investment_score": investment_score,
        "appreciation_probability": appreciation_probability,
        "projected_value_12m": projected_value,
        "expected_gain_12m": projected_value - property_record["estimated_value"],
        "summary": (
            "This prototype forecast favors markets with positive recent rent growth, positive home-value "
            "momentum, and high occupancy. It is an explainable scoring model, not a guarantee."
        ),
        "drivers": drivers,
    }


app = FastAPI(title="LeaseLens API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/properties")
def list_properties() -> dict:
    properties = load_properties()
    trimmed = []
    for property_record in properties:
        trimmed.append(
            {
                "id": property_record["id"],
                "name": property_record["name"],
                "city": property_record["city"],
                "state": property_record["state"],
                "neighborhood": property_record["neighborhood"],
                "bedrooms": property_record["bedrooms"],
                "monthly_rent": property_record["monthly_rent"],
            }
        )

    return {"properties": trimmed}


@app.get("/api/properties/{property_id}")
def property_details(property_id: str) -> dict:
    properties = load_properties()
    for property_record in properties:
        if property_record["id"] == property_id:
            property_record["market_summary"] = summarize_market(property_record)
            return property_record

    raise HTTPException(status_code=404, detail="Property not found")


@app.get("/api/valuation/{property_id}")
def property_valuation(property_id: str) -> dict:
    properties = load_properties()
    for property_record in properties:
        if property_record["id"] == property_id:
            return valuation_for(property_record)

    raise HTTPException(status_code=404, detail="Property not found")
