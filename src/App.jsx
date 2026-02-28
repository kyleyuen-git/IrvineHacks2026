import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://127.0.0.1:8000/api";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1
});

const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 0
});

function Sparkline({ values, stroke = "#184e77" }) {
  if (!values?.length) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1 || 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className="sparkline" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

function HistoryTable({ history }) {
  return (
    <div className="history-table">
      <div className="history-row history-header">
        <span>Month</span>
        <span>Rent index</span>
        <span>Home value</span>
      </div>
      {history.map((entry) => (
        <div className="history-row" key={entry.month}>
          <span>{entry.month}</span>
          <span>{currency.format(entry.rent_index)}</span>
          <span>{compactCurrency.format(entry.home_value_index)}</span>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [properties, setProperties] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedForecast, setSelectedForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [budget, setBudget] = useState(3500);
  const [mode, setMode] = useState("renter");

  useEffect(() => {
    async function loadProperties() {
      try {
        const response = await fetch(`${API_BASE}/properties`);
        if (!response.ok) {
          throw new Error("Failed to load property data.");
        }

        const data = await response.json();
        setProperties(data.properties);
        setSelectedId(data.properties[0]?.id ?? null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProperties();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    async function loadPropertyDetails() {
      try {
        const [propertyResponse, forecastResponse] = await Promise.all([
          fetch(`${API_BASE}/properties/${selectedId}`),
          fetch(`${API_BASE}/valuation/${selectedId}`)
        ]);

        if (!propertyResponse.ok || !forecastResponse.ok) {
          throw new Error("Failed to load market details.");
        }

        const propertyData = await propertyResponse.json();
        const forecastData = await forecastResponse.json();

        setSelectedProperty(propertyData);
        setSelectedForecast(forecastData);
      } catch (err) {
        setError(err.message);
      }
    }

    loadPropertyDetails();
  }, [selectedId]);

  const filteredProperties = useMemo(
    () => properties.filter((property) => property.monthly_rent <= budget),
    [properties, budget]
  );

  useEffect(() => {
    if (!filteredProperties.length) {
      setSelectedProperty(null);
      setSelectedForecast(null);
      return;
    }

    const hasSelectedProperty = filteredProperties.some((property) => property.id === selectedId);
    if (!hasSelectedProperty) {
      setSelectedId(filteredProperties[0].id);
    }
  }, [filteredProperties, selectedId]);

  useEffect(() => {
    const elements = document.querySelectorAll(".reveal-on-scroll");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          } else {
            entry.target.classList.remove("is-visible");
          }
        });
      },
      {
        threshold: 0.18,
        rootMargin: "0px 0px -8% 0px"
      }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [filteredProperties.length, selectedProperty, selectedForecast, mode]);

  const topFit = filteredProperties[0];
  const selectedHistory = selectedProperty?.market_history ?? [];
  const rentSeries = selectedHistory.map((entry) => entry.rent_index);
  const valueSeries = selectedHistory.map((entry) => entry.home_value_index);

  return (
    <div className="app-shell">
      <header className="hero reveal-on-scroll is-visible">
        <div className="hero-copy">
          <p className="eyebrow">LeaseLens</p>
          <h1>Rental decisions with Zillow-style history and forecast signals.</h1>
          <p className="hero-text">
            Explore rental listings, inspect local rent and home-value history, and
            give landlords an explainable prototype score for future upside.
          </p>
          <div className="hero-actions">
            <button
              className={mode === "renter" ? "active" : ""}
              onClick={() => setMode("renter")}
            >
              Renter mode
            </button>
            <button
              className={mode === "landlord" ? "active" : ""}
              onClick={() => setMode("landlord")}
            >
              Landlord mode
            </button>
          </div>
        </div>
        <div className="hero-card">
          <p className="card-label">Product framing</p>
          <h2>Historical market context beats listing-only browsing.</h2>
          <p>
            This prototype uses local sample data shaped after Zillow Research datasets.
            In production, replace the backend sample loader with Zillow data ingestion.
          </p>
        </div>
      </header>

      {loading ? <p className="status">Loading properties...</p> : null}
      {error ? <p className="status error">{error}</p> : null}

      {!loading && !error ? (
        <main className="dashboard">
          <section className="panel filter-panel reveal-on-scroll" style={{ "--reveal-delay": "40ms" }}>
            <div className="panel-heading">
              <p className="eyebrow">Property selector</p>
              <h2>Find rentals by budget</h2>
            </div>

            <label className="budget-control" htmlFor="budget">
              <span>Monthly budget: {currency.format(budget)}</span>
              <input
                id="budget"
                type="range"
                min="1500"
                max="5000"
                step="100"
                value={budget}
                onChange={(event) => setBudget(Number(event.target.value))}
              />
            </label>

            <div className="property-list">
              {filteredProperties.map((property, index) => (
                <button
                  key={property.id}
                  className={`property-card reveal-on-scroll ${
                    selectedId === property.id ? "selected" : ""
                  }`}
                  style={{ "--reveal-delay": `${80 + index * 45}ms` }}
                  onClick={() => setSelectedId(property.id)}
                >
                  <div>
                    <p className="property-name">{property.name}</p>
                    <p className="property-market">{property.city}, {property.state}</p>
                  </div>
                  <div className="property-metrics">
                    <span>{currency.format(property.monthly_rent)}/mo</span>
                    <span>{property.bedrooms} bd</span>
                  </div>
                </button>
              ))}
            </div>

            {topFit ? (
              <div className="fit-card reveal-on-scroll" style={{ "--reveal-delay": "160ms" }}>
                <p className="card-label">Closest match</p>
                <strong>{topFit.name}</strong>
                <span>{topFit.neighborhood}</span>
              </div>
            ) : (
              <p className="status">No rentals match this budget yet.</p>
            )}
          </section>

          {selectedProperty ? (
            <>
              <section className="panel overview-panel reveal-on-scroll" style={{ "--reveal-delay": "90ms" }}>
                <div className="panel-heading">
                  <p className="eyebrow">Selected property</p>
                  <h2>{selectedProperty.name}</h2>
                </div>
                <div className="stats-grid">
                  <article className="reveal-on-scroll" style={{ "--reveal-delay": "120ms" }}>
                    <span>Rent</span>
                    <strong>{currency.format(selectedProperty.monthly_rent)}</strong>
                  </article>
                  <article className="reveal-on-scroll" style={{ "--reveal-delay": "170ms" }}>
                    <span>Market value</span>
                    <strong>{compactCurrency.format(selectedProperty.estimated_value)}</strong>
                  </article>
                  <article className="reveal-on-scroll" style={{ "--reveal-delay": "220ms" }}>
                    <span>Occupancy</span>
                    <strong>{percent.format(selectedProperty.occupancy_rate)}</strong>
                  </article>
                  <article className="reveal-on-scroll" style={{ "--reveal-delay": "270ms" }}>
                    <span>Location</span>
                    <strong>{selectedProperty.neighborhood}</strong>
                  </article>
                </div>

                <div className="insight-grid">
                  <article className="insight-card reveal-on-scroll" style={{ "--reveal-delay": "160ms" }}>
                    <p className="card-label">Rent history</p>
                    <Sparkline values={rentSeries} stroke="#cf8696" />
                    <span>
                      12-month change: {percent.format(selectedProperty.market_summary.rent_growth_12m)}
                    </span>
                  </article>
                  <article className="insight-card reveal-on-scroll" style={{ "--reveal-delay": "220ms" }}>
                    <p className="card-label">Home value history</p>
                    <Sparkline values={valueSeries} stroke="#88b6a2" />
                    <span>
                      12-month change: {percent.format(selectedProperty.market_summary.value_growth_12m)}
                    </span>
                  </article>
                </div>
              </section>

              <section className="panel decision-panel reveal-on-scroll" style={{ "--reveal-delay": "120ms" }}>
                <div className="panel-heading">
                  <p className="eyebrow">
                    {mode === "renter" ? "Renter decision support" : "Landlord forecast"}
                  </p>
                  <h2>
                    {mode === "renter"
                      ? "Should this location make your shortlist?"
                      : "What does the forecast model say?"}
                  </h2>
                </div>

                {mode === "renter" ? (
                  <div className="decision-copy">
                    <p>
                      {selectedProperty.renter_takeaway}
                    </p>
                    <ul className="flat-list">
                      <li>Transit score: {selectedProperty.transit_score}/100</li>
                      <li>Walk score: {selectedProperty.walk_score}/100</li>
                      <li>Lease risk flag: {selectedProperty.market_summary.risk_band}</li>
                    </ul>
                  </div>
                ) : selectedForecast ? (
                  <div className="decision-copy">
                    <div className="forecast-banner reveal-on-scroll" style={{ "--reveal-delay": "150ms" }}>
                      <span className="card-label">Forecast confidence</span>
                      <strong>{percent.format(selectedForecast.appreciation_probability)}</strong>
                    </div>
                    <p>{selectedForecast.summary}</p>
                    <div className="stats-grid compact">
                      <article className="reveal-on-scroll" style={{ "--reveal-delay": "180ms" }}>
                        <span>Projected 12-mo value</span>
                        <strong>{compactCurrency.format(selectedForecast.projected_value_12m)}</strong>
                      </article>
                      <article className="reveal-on-scroll" style={{ "--reveal-delay": "230ms" }}>
                        <span>Expected gain</span>
                        <strong>{compactCurrency.format(selectedForecast.expected_gain_12m)}</strong>
                      </article>
                      <article className="reveal-on-scroll" style={{ "--reveal-delay": "280ms" }}>
                        <span>Yield score</span>
                        <strong>{selectedForecast.investment_score}/100</strong>
                      </article>
                    </div>
                    <ul className="flat-list">
                      {selectedForecast.drivers.map((driver) => (
                        <li key={driver}>{driver}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>

              <section className="panel history-panel reveal-on-scroll" style={{ "--reveal-delay": "160ms" }}>
                <div className="panel-heading">
                  <p className="eyebrow">Historical data</p>
                  <h2>Monthly trend snapshot</h2>
                </div>
                <HistoryTable history={selectedHistory} />
              </section>
            </>
          ) : null}
        </main>
      ) : null}
    </div>
  );
}

export default App;
