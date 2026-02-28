import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://127.0.0.1:8000/api";
const CHART_COLORS = ["#d88b9a", "#88b6a2", "#89a8d8", "#f2b880"];
const WINDOW_SIZE = 12;

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

const factorLabels = {
  rent_growth: "Rent Growth",
  value_growth: "Value Growth",
  occupancy: "Occupancy",
  neighborhood: "Neighborhood"
};

function ComparisonChart({ title, months, series, valueKey, formatter }) {
  const visibleMonths = months.slice(0, WINDOW_SIZE);

  if (!visibleMonths.length || !series.length) {
    return null;
  }

  const values = series.flatMap((property) =>
    property.market_history.slice(0, WINDOW_SIZE).map((entry) => entry[valueKey])
  );
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  return (
    <section className="comparison-chart-card reveal-on-scroll">
      <div className="panel-heading">
        <p className="eyebrow">{title}</p>
        <h2>{title} (24 months)</h2>
      </div>
      <div className="chart-stage">
        <div className="chart-axis chart-axis-y">
          <span>{formatter(max)}</span>
          <span>{formatter(min + range * 0.66)}</span>
          <span>{formatter(min + range * 0.33)}</span>
          <span>{formatter(min)}</span>
        </div>
        <div className="chart-main">
          <svg viewBox="0 0 1000 320" className="comparison-chart" preserveAspectRatio="none">
            {series.map((property, index) => {
              const points = property.market_history
                .slice(0, WINDOW_SIZE)
                .map((entry, pointIndex) => {
                  const x = (pointIndex / (WINDOW_SIZE - 1 || 1)) * 1000;
                  const y = 280 - ((entry[valueKey] - min) / range) * 240;
                  return `${x},${y}`;
                })
                .join(" ");

              const color = CHART_COLORS[index % CHART_COLORS.length];

              return (
                <g key={`${property.id}-${valueKey}`}>
                  <polyline
                    className="comparison-line"
                    fill="none"
                    stroke={color}
                    strokeWidth="6"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={points}
                  />
                  {property.market_history.slice(0, WINDOW_SIZE).map((entry, pointIndex) => {
                    const x = (pointIndex / (WINDOW_SIZE - 1 || 1)) * 1000;
                    const y = 280 - ((entry[valueKey] - min) / range) * 240;
                    return <circle key={`${property.id}-${entry.month}`} cx={x} cy={y} r="5" fill={color} />;
                  })}
                </g>
              );
            })}
          </svg>
          <div className="chart-axis chart-axis-x">
            {visibleMonths.map((month) => (
              <span key={month}>{month.slice(5)}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="chart-legend">
        {series.map((property, index) => (
          <span key={`${property.id}-legend`}>
            <i style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
            {property.name} ({valueKey === "rent_index" ? "Rent" : "Value"})
          </span>
        ))}
      </div>
    </section>
  );
}

function ComparisonTable({ properties }) {
  return (
    <section className="panel comparison-table-card reveal-on-scroll">
      <div className="panel-heading">
        <p className="eyebrow">Current details</p>
        <h2>Property comparison</h2>
      </div>
      <div className="comparison-table">
        <div className="comparison-table-row comparison-table-header">
          <span>Property</span>
          <span>Rent</span>
          <span>Value</span>
          <span>$/sqft</span>
        </div>
        {properties.map((property) => (
          <div className="comparison-table-row" key={property.id}>
            <span>
              <strong>{property.name}</strong>
              <small>
                {property.bedrooms}bd · {property.bathrooms}ba · {property.square_feet} sqft
              </small>
            </span>
            <span>{currency.format(property.monthly_rent)}</span>
            <span>{currency.format(property.estimated_value)}</span>
            <span>{currency.format(property.monthly_rent / property.square_feet)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function LandlordTrendChart({ property, activeIndex, onSelectPoint }) {
  const history = property.market_history;
  const rentValues = history.map((entry) => entry.rent_index);
  const valueValues = history.map((entry) => entry.home_value_index / 100);
  const rentMin = Math.min(...rentValues);
  const rentMax = Math.max(...rentValues);
  const rentRange = rentMax - rentMin || 1;
  const valueMin = Math.min(...valueValues);
  const valueMax = Math.max(...valueValues);
  const valueRange = valueMax - valueMin || 1;

  const rentPoints = history
    .map((entry, index) => {
      const x = (index / (history.length - 1 || 1)) * 1000;
      const y = 270 - ((entry.rent_index - rentMin) / rentRange) * 230;
      return `${x},${y}`;
    })
    .join(" ");

  const valuePoints = history
    .map((entry, index) => {
      const x = (index / (history.length - 1 || 1)) * 1000;
      const y = 270 - ((entry.home_value_index / 100 - valueMin) / valueRange) * 230;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <section className="panel landlord-trend-panel reveal-on-scroll">
      <div className="panel-heading">
        <p className="eyebrow">Historical trends</p>
        <h2>Historical Trends (24 months)</h2>
      </div>
      <div className="chart-stage landlord-chart-stage">
        <div className="chart-axis chart-axis-y">
          <span>{Math.round(rentMax).toLocaleString("en-US")}</span>
          <span>{Math.round(rentMin + rentRange * 0.66).toLocaleString("en-US")}</span>
          <span>{Math.round(rentMin + rentRange * 0.33).toLocaleString("en-US")}</span>
          <span>{Math.round(rentMin).toLocaleString("en-US")}</span>
        </div>
        <div className="chart-main">
          <svg viewBox="0 0 1000 320" className="comparison-chart landlord-chart" preserveAspectRatio="none">
            <polyline
              className="comparison-line"
              fill="none"
              stroke="#d88b9a"
              strokeWidth="6"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={rentPoints}
            />
            <polyline
              className="comparison-line"
              fill="none"
              stroke="#88b6a2"
              strokeWidth="6"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={valuePoints}
            />
            {history.map((entry, index) => {
              const x = (index / (history.length - 1 || 1)) * 1000;
              const rentY = 270 - ((entry.rent_index - rentMin) / rentRange) * 230;
              const valueY = 270 - ((entry.home_value_index / 100 - valueMin) / valueRange) * 230;
              const isActive = index === activeIndex;

              return (
                <g key={entry.month}>
                  <circle
                    cx={x}
                    cy={rentY}
                    r={isActive ? "8" : "5"}
                    fill="#d88b9a"
                    onMouseEnter={() => onSelectPoint(index)}
                  />
                  <circle
                    cx={x}
                    cy={valueY}
                    r={isActive ? "8" : "5"}
                    fill="#88b6a2"
                    onMouseEnter={() => onSelectPoint(index)}
                  />
                </g>
              );
            })}
          </svg>
          <div className="chart-axis chart-axis-x landlord-chart-axis-x">
            {history.map((entry) => (
              <span key={entry.month}>{entry.month.slice(5)}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="chart-legend">
        <span>
          <i style={{ backgroundColor: "#d88b9a" }} />
          Rent ($)
        </span>
        <span>
          <i style={{ backgroundColor: "#88b6a2" }} />
          Value ($100s)
        </span>
      </div>
      <div className="landlord-chart-detail">
        <strong>{history[activeIndex]?.month}</strong>
        <span>Rent: {currency.format(history[activeIndex]?.rent_index ?? 0)}</span>
        <span>Value: {currency.format(history[activeIndex]?.home_value_index ?? 0)}</span>
      </div>
    </section>
  );
}

function FactorBreakdown({ forecast, activeFactor, onSelectFactor }) {
  const activeLabel = factorLabels[activeFactor];
  const activeValue = forecast.factor_breakdown[activeFactor];

  return (
    <section className="panel factor-breakdown-panel reveal-on-scroll">
      <div className="panel-heading">
        <p className="eyebrow">Score factor breakdown</p>
        <h2>Score Factor Breakdown</h2>
      </div>
      <div className="factor-scale">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
      <div className="factor-list">
        {Object.entries(forecast.factor_breakdown).map(([key, value]) => (
          <button
            key={key}
            type="button"
            className={`factor-row ${activeFactor === key ? "active" : ""}`}
            onMouseEnter={() => onSelectFactor(key)}
            onClick={() => onSelectFactor(key)}
          >
            <span className="factor-name">{factorLabels[key]}</span>
            <div className="factor-bar-track">
              <div className="factor-bar-fill" style={{ width: `${value}%` }} />
            </div>
            <span className="factor-score">{value}/100</span>
          </button>
        ))}
      </div>
      <div className="factor-focus-card">
        <p className="card-label">Focused factor</p>
        <strong>{activeLabel}</strong>
        <span>{activeValue}/100</span>
      </div>
    </section>
  );
}

function App() {
  const [properties, setProperties] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedForecast, setSelectedForecast] = useState(null);
  const [comparisonIds, setComparisonIds] = useState(["742-evergreen-terrace", "221b-baker-street"]);
  const [visibleWindowStart, setVisibleWindowStart] = useState(0);
  const [windowDirection, setWindowDirection] = useState(1);
  const [landlordTrendIndex, setLandlordTrendIndex] = useState(23);
  const [activeFactor, setActiveFactor] = useState("value_growth");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

        setSelectedProperty(await propertyResponse.json());
        setSelectedForecast(await forecastResponse.json());
      } catch (err) {
        setError(err.message);
      }
    }

    loadPropertyDetails();
  }, [selectedId]);

  useEffect(() => {
    if (!selectedProperty?.market_history?.length) {
      return;
    }

    setLandlordTrendIndex(selectedProperty.market_history.length - 1);
  }, [selectedProperty]);

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
  }, [properties.length, selectedProperty, selectedForecast, comparisonIds, mode]);

  const comparisonProperties = useMemo(
    () => properties.filter((property) => comparisonIds.includes(property.id)),
    [properties, comparisonIds]
  );

  const maxWindowStart = Math.max(0, (comparisonProperties[0]?.market_history?.length ?? 0) - WINDOW_SIZE);

  useEffect(() => {
    if (mode !== "renter" || maxWindowStart <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setVisibleWindowStart((current) => {
        if (current >= maxWindowStart) {
          setWindowDirection(-1);
          return Math.max(0, current - 1);
        }

        if (current <= 0 && windowDirection < 0) {
          setWindowDirection(1);
          return 1;
        }

        return current + windowDirection;
      });
    }, 1800);

    return () => window.clearInterval(timer);
  }, [mode, maxWindowStart, windowDirection]);

  const visibleComparisonProperties = useMemo(
    () =>
      comparisonProperties.map((property) => ({
        ...property,
        market_history: property.market_history.slice(
          visibleWindowStart,
          visibleWindowStart + WINDOW_SIZE
        )
      })),
    [comparisonProperties, visibleWindowStart]
  );

  const visibleMonths = visibleComparisonProperties[0]?.market_history.map((entry) => entry.month) ?? [];

  function toggleComparison(propertyId) {
    setComparisonIds((current) => {
      if (current.includes(propertyId)) {
        if (current.length === 1) {
          return current;
        }
        return current.filter((id) => id !== propertyId);
      }

      if (current.length >= 4) {
        return [...current.slice(1), propertyId];
      }

      return [...current, propertyId];
    });
  }

  return (
    <div className="app-shell">
      <header className="hero reveal-on-scroll is-visible">
        <div className="hero-copy">
          <p className="eyebrow">LeaseLens</p>
          <h1>Compare rent and home-value trends before you sign.</h1>
          <p className="hero-text">
            Renters can compare selected listings across 24 months of rent and home-value
            history. Landlords stay on a separate valuation view.
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
          <p className="card-label">Comparison workflow</p>
          <h2>Select properties, compare trends, then inspect the current numbers.</h2>
          <p>
            The comparison module only appears for renters. The landlord page remains focused on
            forecast and appreciation signals.
          </p>
        </div>
      </header>

      {loading ? <p className="status">Loading properties...</p> : null}
      {error ? <p className="status error">{error}</p> : null}

      {!loading && !error ? (
        <main className="dashboard">
          {mode === "renter" ? (
            <>
              <section className="panel renter-comparison-panel reveal-on-scroll">
                <div className="panel-heading">
                  <p className="eyebrow">Available properties</p>
                  <h2>Choose the listings you want to compare</h2>
                </div>
                <div className="comparison-property-list">
                  {properties.map((property, index) => (
                    <article
                      key={property.id}
                      className={`comparison-property-card reveal-on-scroll ${
                        comparisonIds.includes(property.id) ? "selected" : ""
                      }`}
                      style={{ "--reveal-delay": `${index * 35}ms` }}
                    >
                      <button
                        className="comparison-select"
                        onClick={() => toggleComparison(property.id)}
                        type="button"
                      >
                        {comparisonIds.includes(property.id) ? "Selected" : "Compare"}
                      </button>
                      <button
                        className="comparison-focus"
                        type="button"
                        onClick={() => setSelectedId(property.id)}
                      >
                        <p className="property-name">{property.address}</p>
                        <p className="property-market">{property.city}, {property.state}</p>
                        <p className="property-market">
                          {property.bedrooms}bd · {property.bathrooms}ba · {property.square_feet} sqft
                        </p>
                        <strong>{currency.format(property.monthly_rent)}/mo</strong>
                      </button>
                    </article>
                  ))}
                </div>
              </section>

              <section className="panel chart-controls-panel reveal-on-scroll">
                <div className="panel-heading">
                  <p className="eyebrow">Comparison window</p>
                  <h2>
                    Showing {visibleMonths[0]} to {visibleMonths[visibleMonths.length - 1]}
                  </h2>
                </div>
                <label className="budget-control" htmlFor="timeline-window">
                  <span>Move through the 24-month timeline</span>
                  <input
                    id="timeline-window"
                    type="range"
                    min="0"
                    max={maxWindowStart}
                    value={visibleWindowStart}
                    onChange={(event) => setVisibleWindowStart(Number(event.target.value))}
                  />
                </label>
              </section>

              <ComparisonChart
                title="Rent history"
                months={visibleMonths}
                series={visibleComparisonProperties}
                valueKey="rent_index"
                formatter={(value) => Math.round(value).toLocaleString("en-US")}
              />

              <ComparisonChart
                title="Home value history"
                months={visibleMonths}
                series={visibleComparisonProperties}
                valueKey="home_value_index"
                formatter={(value) => Math.round(value).toLocaleString("en-US")}
              />

              <ComparisonTable properties={comparisonProperties} />

              {selectedProperty ? (
                <section className="panel renter-summary-panel reveal-on-scroll">
                  <div className="panel-heading">
                    <p className="eyebrow">Focused property</p>
                    <h2>{selectedProperty.address}</h2>
                  </div>
                  <div className="stats-grid compact">
                    <article>
                      <span>Monthly rent</span>
                      <strong>{currency.format(selectedProperty.monthly_rent)}</strong>
                    </article>
                    <article>
                      <span>Estimated value</span>
                      <strong>{currency.format(selectedProperty.estimated_value)}</strong>
                    </article>
                    <article>
                      <span>Rent growth</span>
                      <strong>{percent.format(selectedProperty.market_summary.rent_growth_12m)}</strong>
                    </article>
                  </div>
                  <p className="decision-copy">{selectedProperty.renter_takeaway}</p>
                </section>
              ) : null}
            </>
          ) : selectedProperty && selectedForecast ? (
            <>
              <section className="panel landlord-selector-panel reveal-on-scroll">
                <div className="panel-heading">
                  <p className="eyebrow">Investment forecast</p>
                  <h2>Select an address to evaluate</h2>
                </div>
                <label className="landlord-select-wrap" htmlFor="landlord-property">
                  <span>Property address</span>
                  <select
                    id="landlord-property"
                    className="landlord-select"
                    value={selectedId ?? ""}
                    onChange={(event) => setSelectedId(event.target.value)}
                  >
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.address}
                      </option>
                    ))}
                  </select>
                </label>
              </section>

              <section className="panel overview-panel reveal-on-scroll">
                <div className="landlord-overview-top">
                  <div className="panel-heading">
                    <p className="eyebrow">Property details</p>
                    <h2>{selectedProperty.address}</h2>
                    <p className="property-market">
                      {selectedProperty.city}, {selectedProperty.state} {selectedProperty.zip_code}
                    </p>
                  </div>
                  <div className="forecast-score-card">
                    <p className="card-label">Forecast score</p>
                    <strong>{selectedForecast.investment_score}</strong>
                    <span>out of 100</span>
                    <button type="button" className="forecast-decision">
                      Buy
                    </button>
                  </div>
                </div>
                <div className="panel-heading">
                  <p className="eyebrow">Investment forecast</p>
                  <h2>Explainable predictions for property value appreciation potential.</h2>
                </div>
                <div className="stats-grid">
                  <article>
                    <span>Beds</span>
                    <strong>{selectedProperty.bedrooms}</strong>
                  </article>
                  <article>
                    <span>Baths</span>
                    <strong>{selectedProperty.bathrooms}</strong>
                  </article>
                  <article>
                    <span>Sqft</span>
                    <strong>{selectedProperty.square_feet}</strong>
                  </article>
                  <article>
                    <span>Current Rent</span>
                    <strong>{currency.format(selectedProperty.monthly_rent)}/mo</strong>
                  </article>
                  <article>
                    <span>Estimated Value</span>
                    <strong>{currency.format(selectedProperty.estimated_value)}</strong>
                  </article>
                </div>
                <p className="landlord-disclaimer">
                  This forecast is an explainable heuristic based on historical data, not financial
                  advice. Consult a professional before making investment decisions.
                </p>
              </section>

              <LandlordTrendChart
                property={selectedProperty}
                activeIndex={landlordTrendIndex}
                onSelectPoint={setLandlordTrendIndex}
              />

              <section className="landlord-bottom-grid">
                <FactorBreakdown
                  forecast={selectedForecast}
                  activeFactor={activeFactor}
                  onSelectFactor={setActiveFactor}
                />

                <section className="panel landlord-insights-panel reveal-on-scroll">
                  <div className="panel-heading">
                    <p className="eyebrow">Key insights</p>
                    <h2>Market metrics and outlook</h2>
                  </div>
                  <ul className="flat-list">
                    {selectedForecast.drivers.map((driver) => (
                      <li key={driver}>{driver}</li>
                    ))}
                  </ul>
                  <div className="stats-grid compact">
                    <article>
                      <span>Occupancy Rate</span>
                      <strong>{selectedForecast.market_metrics.occupancy_rate}%</strong>
                    </article>
                    <article>
                      <span>Neighborhood Score</span>
                      <strong>{selectedForecast.market_metrics.neighborhood_score}/100</strong>
                    </article>
                    <article>
                      <span>Projected 12-mo value</span>
                      <strong>{compactCurrency.format(selectedForecast.projected_value_12m)}</strong>
                    </article>
                    <article>
                      <span>Expected gain</span>
                      <strong>{compactCurrency.format(selectedForecast.expected_gain_12m)}</strong>
                    </article>
                  </div>
                </section>
              </section>
            </>
          ) : null}
        </main>
      ) : null}
    </div>
  );
}

export default App;
