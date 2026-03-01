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

    rent_growth_score = max(1, min(99, round(rent_growth * 340)))
    value_growth_score = max(1, min(99, round(value_growth * 860)))
    occupancy_score = max(1, min(99, round(occupancy_rate * 100)))
    neighborhood_score = max(
        1,
        min(
            99,
            round(
                property_record["walk_score"] * 0.65
                + property_record["transit_score"] * 0.35
                + 7
            ),
        ),
    )

    score = (
        rent_growth_score * 0.16
        + value_growth_score * 0.28
        + occupancy_score * 0.24
        + neighborhood_score * 0.22
        + 3
    )
    investment_score = max(1, min(99, round(score)))
    appreciation_probability = max(0.05, min(0.95, round(investment_score / 100, 2)))
    projected_value = round(
        property_record["estimated_value"] * (1 + value_growth * 0.7 + rent_growth * 0.3)
    )

    drivers = [
        f"Strong rent growth at {rent_growth_score / 10:.1f}% annually.",
        f"Excellent home value appreciation at {value_growth_score / 10:.1f}%.",
        f"High occupancy indicates strong demand at {occupancy_score}%.",
    ]

    if neighborhood_score >= 80:
        drivers.append("Excellent neighborhood accessibility.")

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
        "factor_breakdown": {
            "rent_growth": rent_growth_score,
            "value_growth": value_growth_score,
            "occupancy": occupancy_score,
            "neighborhood": neighborhood_score,
        },
        "market_metrics": {
            "occupancy_rate": round(occupancy_rate * 100),
            "neighborhood_score": neighborhood_score,
        },
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
                "address": property_record["address"],
                "city": property_record["city"],
                "state": property_record["state"],
                "neighborhood": property_record["neighborhood"],
                "bedrooms": property_record["bedrooms"],
                "bathrooms": property_record["bathrooms"],
                "square_feet": property_record["square_feet"],
                "monthly_rent": property_record["monthly_rent"],
                "estimated_value": property_record["estimated_value"],
                "market_history": property_record["market_history"],
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
