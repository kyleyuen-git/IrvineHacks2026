from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

try:
    import joblib
except ImportError:  # pragma: no cover - optional runtime dependency
    joblib = None

try:
    import pandas as pd
except ImportError:  # pragma: no cover - optional runtime dependency
    pd = None

try:
    from sklearn.preprocessing import LabelEncoder
except ImportError:  # pragma: no cover - optional runtime dependency
    LabelEncoder = None

try:
    import torch
except ImportError:  # pragma: no cover - optional runtime dependency
    torch = None


BASE_DIR = Path(__file__).parent
DATA_PATH = BASE_DIR / "data" / "properties.json"
ACTIVE_LISTINGS_PATH = BASE_DIR / "data" / "active_listings.json"
FILTERED_RENT_PATH = BASE_DIR / "data" / "filtered_rent.json"
RENT_MODEL_PATH = BASE_DIR / "models" / "rent_model.joblib"
MARKET_FORECAST_STEPS = 12
MARKET_FORECAST_HISTORY = 12

_investor_runtime: dict[str, Any] | None = None
_market_forecast_runtime: dict[str, Any] | None = None


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as source:
        return json.load(source)


def load_properties() -> list[dict]:
    return load_json(DATA_PATH)


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


def load_column_oriented_json(path: Path) -> list[dict]:
    payload = load_json(path)
    if isinstance(payload, list):
        return payload
    if not isinstance(payload, dict) or not payload:
        return []

    first_column = next(iter(payload.values()))
    if not isinstance(first_column, dict):
        return []

    row_ids = list(first_column.keys())
    rows: list[dict] = []
    for row_id in row_ids:
        row = {}
        for column, values in payload.items():
            if isinstance(values, dict):
                row[column] = values.get(row_id)
        rows.append(row)
    return rows


def parse_listing_date(value: Any) -> datetime | None:
    if not value or not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def to_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def to_int(value: Any) -> int | None:
    number = to_float(value)
    if number is None:
        return None
    return int(round(number))


def parse_market_month(value: Any) -> datetime | None:
    if not value or not isinstance(value, str):
        return None
    try:
        return datetime.strptime(value, "%Y-%m")
    except ValueError:
        return None


def format_market_month(value: datetime) -> str:
    return value.strftime("%Y-%m")


def add_months(value: datetime, months: int) -> datetime:
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    return datetime(year, month, 1)


def load_market_rent_series() -> list[dict[str, Any]]:
    monthly_values: dict[str, list[float]] = {}
    for property_record in load_properties():
        for point in property_record.get("market_history", []):
            month = point.get("month")
            rent_index = to_float(point.get("rent_index"))
            if not month or rent_index is None:
                continue
            monthly_values.setdefault(month, []).append(rent_index)

    series: list[dict[str, Any]] = []
    for month in sorted(monthly_values):
        values = monthly_values[month]
        series.append(
            {
                "month": month,
                "value": round(sum(values) / len(values), 2),
            }
        )
    return series


def build_persistence_forecast(actual_series: list[dict[str, Any]], warnings: list[str]) -> dict[str, Any]:
    recent_actual = actual_series[-min(MARKET_FORECAST_HISTORY, len(actual_series)) :]
    if not recent_actual:
        return {
            "meta": {
                "model_ready": False,
                "method": "unavailable",
                "warnings": ["No market history is available for forecasting."],
                "actual_points": 0,
                "forecast_points": 0,
            },
            "actual": [],
            "forecast": [],
        }

    last_point = recent_actual[-1]
    last_date = parse_market_month(last_point["month"])
    if last_date is None:
        warnings.append("Market-history dates could not be parsed for forecasting.")
        return {
            "meta": {
                "model_ready": False,
                "method": "unavailable",
                "warnings": warnings,
                "actual_points": len(recent_actual),
                "forecast_points": 0,
            },
            "actual": recent_actual,
            "forecast": [],
        }

    forecast = [
        {
            "month": format_market_month(add_months(last_date, step)),
            "value": round(float(last_point["value"]), 2),
        }
        for step in range(1, MARKET_FORECAST_STEPS + 1)
    ]

    return {
        "meta": {
            "model_ready": False,
            "method": "persistence",
            "warnings": warnings,
            "actual_points": len(recent_actual),
            "forecast_points": len(forecast),
        },
        "actual": recent_actual,
        "forecast": forecast,
    }


def build_market_forecast() -> dict[str, Any]:
    warnings: list[str] = []
    actual_series = load_market_rent_series()

    if len(actual_series) < 2:
        return build_persistence_forecast(actual_series, warnings)

    if torch is None:
        warnings.append("PyTorch is not installed. Showing a persistence forecast instead.")
        return build_persistence_forecast(actual_series, warnings)

    values = [float(point["value"]) for point in actual_series]
    lag_size = min(12, max(2, len(values) - 1))
    if len(values) <= lag_size:
        warnings.append("Not enough history to train the neural forecast. Showing a persistence forecast instead.")
        return build_persistence_forecast(actual_series, warnings)

    mean_value = sum(values) / len(values)
    variance = sum((value - mean_value) ** 2 for value in values) / len(values)
    std_value = variance ** 0.5 or 1.0
    normalized_values = [(value - mean_value) / std_value for value in values]

    features: list[list[float]] = []
    targets: list[float] = []
    for index in range(lag_size, len(normalized_values)):
        features.append(normalized_values[index - lag_size : index])
        targets.append(normalized_values[index])

    if not features:
        warnings.append("Unable to build lagged training samples. Showing a persistence forecast instead.")
        return build_persistence_forecast(actual_series, warnings)

    torch.manual_seed(7)

    class MarketForecastNN(torch.nn.Module):
        def __init__(self, input_dim: int):
            super().__init__()
            self.layer1 = torch.nn.Linear(input_dim, 32)
            self.layer2 = torch.nn.Linear(32, 16)
            self.layer3 = torch.nn.Linear(16, 1)

        def forward(self, x):
            x = torch.relu(self.layer1(x))
            x = torch.relu(self.layer2(x))
            return self.layer3(x)

    model = MarketForecastNN(lag_size)
    inputs = torch.tensor(features, dtype=torch.float32)
    outputs = torch.tensor(targets, dtype=torch.float32).view(-1, 1)

    split_index = max(1, int(len(features) * 0.8))
    if split_index >= len(features):
        split_index = len(features) - 1

    if split_index <= 0:
        warnings.append("Forecast sample size is too small to validate. Showing a persistence forecast instead.")
        return build_persistence_forecast(actual_series, warnings)

    train_inputs = inputs[:split_index]
    train_outputs = outputs[:split_index]
    validation_inputs = inputs[split_index:]
    validation_outputs = outputs[split_index:]

    criterion = torch.nn.L1Loss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01)

    for _ in range(240):
        model.train()
        optimizer.zero_grad()
        predictions = model(train_inputs)
        loss = criterion(predictions, train_outputs)
        loss.backward()
        optimizer.step()

    validation_mae = None
    if len(validation_inputs):
        model.eval()
        with torch.no_grad():
            validation_predictions = model(validation_inputs).view(-1)
            mae = torch.mean(torch.abs(validation_predictions - validation_outputs.view(-1))).item()
            validation_mae = round(mae * std_value, 2)

    recent_actual = actual_series[-min(MARKET_FORECAST_HISTORY, len(actual_series)) :]
    last_date = parse_market_month(actual_series[-1]["month"])
    if last_date is None:
        warnings.append("Market-history dates could not be parsed for neural forecasting.")
        return build_persistence_forecast(actual_series, warnings)

    rolling_window = normalized_values[-lag_size:]
    forecast: list[dict[str, Any]] = []

    model.eval()
    with torch.no_grad():
        for step in range(1, MARKET_FORECAST_STEPS + 1):
            model_input = torch.tensor([rolling_window], dtype=torch.float32)
            predicted_normalized = float(model(model_input).item())
            predicted_value = round(predicted_normalized * std_value + mean_value, 2)
            forecast.append(
                {
                    "month": format_market_month(add_months(last_date, step)),
                    "value": predicted_value,
                }
            )
            rolling_window = [*rolling_window[1:], predicted_normalized]

    return {
        "meta": {
            "model_ready": True,
            "method": "pytorch-lag-network",
            "lag_size": lag_size,
            "training_points": len(features),
            "actual_points": len(recent_actual),
            "forecast_points": len(forecast),
            "validation_mae": validation_mae,
            "warnings": warnings,
        },
        "actual": recent_actual,
        "forecast": forecast,
    }


def get_market_forecast() -> dict[str, Any]:
    global _market_forecast_runtime
    if _market_forecast_runtime is None:
        _market_forecast_runtime = build_market_forecast()
    return _market_forecast_runtime


def build_listing_features(listing: dict) -> dict[str, Any] | None:
    listed_date = parse_listing_date(listing.get("listedDate"))
    zip_code = to_int(listing.get("zipCode"))
    bedrooms = to_float(listing.get("bedrooms"))
    bathrooms = to_float(listing.get("bathrooms"))
    square_footage = to_float(listing.get("squareFootage"))
    property_type = listing.get("propertyType")

    if not listed_date or zip_code is None or not property_type:
        return None
    if bedrooms is None or bathrooms is None or square_footage is None:
        return None

    return {
        "zipCode": zip_code,
        "propertyType": property_type,
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "squareFootage": square_footage,
        "listedYear": listed_date.year,
        "listedMonth": listed_date.month,
        "listedDay": listed_date.day,
    }


def build_investor_runtime() -> dict[str, Any]:
    warnings: list[str] = []
    runtime: dict[str, Any] = {
        "warnings": warnings,
        "active_listings": [],
        "model_ready": False,
        "active_listings_ready": False,
        "encoders_ready": False,
    }

    if not ACTIVE_LISTINGS_PATH.exists():
        warnings.append("Missing backend/data/active_listings.json.")
        return runtime

    runtime["active_listings"] = load_column_oriented_json(ACTIVE_LISTINGS_PATH)
    runtime["active_listings_ready"] = True

    if joblib is None or pd is None or LabelEncoder is None:
        warnings.append("Model dependencies are not installed.")
        return runtime

    if not FILTERED_RENT_PATH.exists():
        warnings.append("Missing backend/data/filtered_rent.json.")
        return runtime

    if not RENT_MODEL_PATH.exists():
        warnings.append("Missing backend/models/rent_model.joblib.")
        return runtime

    filtered_rent = pd.read_json(FILTERED_RENT_PATH)
    property_encoder = LabelEncoder()
    property_encoder.fit(filtered_rent["propertyType"])

    zip_encoder = LabelEncoder()
    zip_encoder.fit(filtered_rent["zipCode"])

    runtime["model"] = joblib.load(RENT_MODEL_PATH)
    runtime["property_encoder"] = property_encoder
    runtime["zip_encoder"] = zip_encoder
    runtime["encoders_ready"] = True
    runtime["model_ready"] = True
    return runtime


def get_investor_runtime() -> dict[str, Any]:
    global _investor_runtime
    if _investor_runtime is None:
        _investor_runtime = build_investor_runtime()
    return _investor_runtime


def predict_rent(listing: dict, runtime: dict[str, Any]) -> float | None:
    if not runtime.get("model_ready"):
        return None

    features = build_listing_features(listing)
    if features is None:
        return None

    property_encoder = runtime["property_encoder"]
    zip_encoder = runtime["zip_encoder"]

    property_type = features["propertyType"]
    zip_code = features["zipCode"]
    if property_type not in property_encoder.classes_:
        return None
    if zip_code not in zip_encoder.classes_:
        return None

    row = {
        "zipCode": int(zip_encoder.transform([zip_code])[0]),
        "bedrooms": features["bedrooms"],
        "bathrooms": features["bathrooms"],
        "squareFootage": features["squareFootage"],
        "listedYear": features["listedYear"],
        "listedMonth": features["listedMonth"],
        "listedDay": features["listedDay"],
        "propertyTypeNum": int(property_encoder.transform([property_type])[0]),
    }

    frame = pd.DataFrame([row])
    prediction = runtime["model"].predict(frame)[0]
    return round(float(prediction), 2)


def serialize_investor_listing(listing: dict, runtime: dict[str, Any]) -> dict:
    predicted_rent = predict_rent(listing, runtime)
    price = to_float(listing.get("price"))
    gross_yield = None
    if predicted_rent is not None and price and price > 0:
        gross_yield = round((predicted_rent * 12 / price) * 100, 2)

    return {
        "id": listing.get("id"),
        "formatted_address": listing.get("formattedAddress"),
        "city": listing.get("city"),
        "state": listing.get("state"),
        "zip_code": listing.get("zipCode"),
        "property_type": listing.get("propertyType"),
        "bedrooms": listing.get("bedrooms"),
        "bathrooms": listing.get("bathrooms"),
        "square_feet": listing.get("squareFootage"),
        "list_price": listing.get("price"),
        "listed_date": listing.get("listedDate"),
        "days_on_market": listing.get("daysOnMarket"),
        "status": listing.get("status"),
        "builder": listing.get("builder"),
        "predicted_monthly_rent": predicted_rent,
        "estimated_gross_yield_pct": gross_yield,
        "prediction_ready": predicted_rent is not None,
    }


def build_renter_takeaway(predicted_rent: float | None, gross_yield: float | None, days_on_market: Any) -> str:
    dom = to_int(days_on_market) or 0

    if predicted_rent is None:
        return "Modeled rent is unavailable for this listing, so compare it on price, size, and days on market."
    if gross_yield is not None and gross_yield >= 4.2 and dom <= 14:
        return "This listing pairs strong modeled rent efficiency with fresh market activity, which makes it stand out in Irvine."
    if gross_yield is not None and gross_yield >= 3.7:
        return "This listing looks relatively efficient for Irvine on modeled rent versus list price."
    if dom >= 45:
        return "This listing has lingered longer on market, so there may be more room to negotiate."

    return "This listing sits closer to the middle of the current Irvine market on rent efficiency and market speed."


def build_real_property_record(listing: dict, runtime: dict[str, Any]) -> dict:
    investor_listing = serialize_investor_listing(listing, runtime)
    gross_yield = investor_listing["estimated_gross_yield_pct"]
    price = to_float(investor_listing["list_price"]) or 0
    square_feet = to_float(investor_listing["square_feet"]) or 0
    price_per_sqft = round(price / square_feet, 2) if price and square_feet else None

    return {
        "id": investor_listing["id"],
        "name": listing.get("addressLine1") or investor_listing["formatted_address"],
        "address": investor_listing["formatted_address"],
        "city": investor_listing["city"],
        "state": investor_listing["state"],
        "zip_code": investor_listing["zip_code"],
        "neighborhood": f"ZIP {investor_listing['zip_code']}",
        "bedrooms": investor_listing["bedrooms"],
        "bathrooms": investor_listing["bathrooms"],
        "square_feet": investor_listing["square_feet"],
        "monthly_rent": investor_listing["predicted_monthly_rent"],
        "estimated_value": investor_listing["list_price"],
        "days_on_market": investor_listing["days_on_market"],
        "listed_date": investor_listing["listed_date"],
        "status": investor_listing["status"],
        "property_type": investor_listing["property_type"],
        "builder": investor_listing["builder"],
        "gross_yield_pct": gross_yield,
        "price_per_sqft": price_per_sqft,
        "prediction_ready": investor_listing["prediction_ready"],
        "renter_takeaway": build_renter_takeaway(
            investor_listing["predicted_monthly_rent"],
            gross_yield,
            investor_listing["days_on_market"],
        ),
    }


def load_real_properties() -> list[dict]:
    runtime = get_investor_runtime()
    properties = [build_real_property_record(listing, runtime) for listing in runtime["active_listings"]]
    properties.sort(key=lambda item: item.get("listed_date") or "", reverse=True)
    return properties


def valuation_for_real_property(property_record: dict) -> dict:
    gross_yield = to_float(property_record.get("gross_yield_pct")) or 0
    monthly_rent = to_float(property_record.get("monthly_rent")) or 0
    square_feet = to_float(property_record.get("square_feet")) or 0
    days_on_market = to_int(property_record.get("days_on_market")) or 0
    price_per_sqft = to_float(property_record.get("price_per_sqft")) or 0
    builder = property_record.get("builder") or {}

    yield_score = max(1, min(99, round(gross_yield * 18)))
    rent_signal_score = max(1, min(99, round(((monthly_rent / square_feet) * 18) if square_feet else 1)))
    market_speed_score = max(1, min(99, round(99 - min(days_on_market, 90) * 0.9)))
    price_efficiency_score = max(1, min(99, round(99 - min(price_per_sqft, 1400) / 14)))

    score = (
        yield_score * 0.34
        + rent_signal_score * 0.24
        + market_speed_score * 0.22
        + price_efficiency_score * 0.20
    )
    investment_score = max(1, min(99, round(score)))
    appreciation_probability = max(0.05, min(0.95, round(investment_score / 100, 2)))

    projected_value = round((property_record.get("estimated_value") or 0) * (1 + gross_yield / 100 * 0.35))
    expected_gain = projected_value - (property_record.get("estimated_value") or 0)

    drivers = [
        f"Estimated gross yield is {gross_yield:.2f}% based on modeled rent versus current list price.",
        f"Modeled monthly rent is {round(monthly_rent):,} for this {property_record.get('property_type', 'listing').lower()}.",
        f"Days on market is {days_on_market}, which informs current market speed.",
    ]

    if builder.get("development"):
        drivers.append(f"Builder inventory is tied to {builder['development']}.")

    return {
        "property_id": property_record["id"],
        "investment_score": investment_score,
        "appreciation_probability": appreciation_probability,
        "projected_value_12m": projected_value,
        "expected_gain_12m": expected_gain,
        "summary": (
            "This Irvine listing score is based on real active inventory, modeled rent, gross yield, "
            "days on market, and price efficiency. It is product guidance, not investment advice."
        ),
        "drivers": drivers,
        "factor_breakdown": {
            "yield": yield_score,
            "rent_signal": rent_signal_score,
            "market_speed": market_speed_score,
            "price_efficiency": price_efficiency_score,
        },
        "market_metrics": {
            "predicted_monthly_rent": round(monthly_rent),
            "gross_yield_pct": round(gross_yield, 2),
            "days_on_market": days_on_market,
            "price_per_sqft": round(price_per_sqft, 2),
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
    return {"properties": load_real_properties()}


@app.get("/api/properties/{property_id}")
def property_details(property_id: str) -> dict:
    properties = load_real_properties()
    for property_record in properties:
        if property_record["id"] == property_id:
            return property_record

    raise HTTPException(status_code=404, detail="Property not found")


@app.get("/api/valuation/{property_id}")
def property_valuation(property_id: str) -> dict:
    properties = load_real_properties()
    for property_record in properties:
        if property_record["id"] == property_id:
            return valuation_for_real_property(property_record)

    raise HTTPException(status_code=404, detail="Property not found")


@app.get("/api/market-rent-forecast")
def market_rent_forecast() -> dict:
    return get_market_forecast()


@app.get("/api/investor/listings")
def investor_listings(limit: int = 100) -> dict:
    runtime = get_investor_runtime()
    listings = [serialize_investor_listing(item, runtime) for item in runtime["active_listings"]]
    listings.sort(key=lambda item: item.get("listed_date") or "", reverse=True)

    safe_limit = max(1, min(limit, 500))
    return {
        "meta": {
            "active_listings_ready": runtime["active_listings_ready"],
            "model_ready": runtime["model_ready"],
            "encoders_ready": runtime["encoders_ready"],
            "warnings": runtime["warnings"],
            "total": len(listings),
            "returned": min(len(listings), safe_limit),
        },
        "listings": listings[:safe_limit],
    }


@app.get("/api/investor/listings/{listing_id}")
def investor_listing_details(listing_id: str) -> dict:
    runtime = get_investor_runtime()
    for listing in runtime["active_listings"]:
        if listing.get("id") == listing_id:
            return {
                "meta": {
                    "active_listings_ready": runtime["active_listings_ready"],
                    "model_ready": runtime["model_ready"],
                    "encoders_ready": runtime["encoders_ready"],
                    "warnings": runtime["warnings"],
                },
                "listing": serialize_investor_listing(listing, runtime),
                "raw_listing": listing,
            }

    raise HTTPException(status_code=404, detail="Listing not found")
