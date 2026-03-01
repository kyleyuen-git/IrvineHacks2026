import { useEffect, useMemo, useState } from "react";
import leaseLensLogo from "./assets/leaselens-logo.svg";

const API_BASE = "/api";

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

const percentNumber = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2
});

const factorLabels = {
  yield: "Gross Yield",
  rent_signal: "Rent Signal",
  market_speed: "Market Speed",
  price_efficiency: "Price Efficiency"
};

const propertyTones = ["rose", "mint", "sky", "sand"];

const footerFaqs = [
  "Renter mode compares real active Irvine listings using modeled rent, list price, gross yield, and time on market.",
  "Landlord mode scores real active Irvine inventory using current listing data and the rent model.",
  "Investor mode ranks the same live Irvine listing set by estimated gross yield."
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalize(value, min, max, invert = false) {
  if (max === min) {
    return 1;
  }

  const normalized = (value - min) / (max - min);
  return invert ? 1 - normalized : normalized;
}

function formatYield(value) {
  if (value == null) {
    return "Unavailable";
  }

  return `${percentNumber.format(value)}%`;
}

function ComparisonTable({ properties }) {
  return (
    <section className="panel comparison-table-card reveal-on-scroll">
      <div className="panel-heading">
        <p className="eyebrow">Current Irvine listings</p>
        <h2>Side-by-side comparison</h2>
      </div>
      <div className="comparison-table comparison-table-wide">
        <div className="comparison-table-row comparison-table-header comparison-table-row-wide">
          <span>Listing</span>
          <span>Price</span>
          <span>Modeled Rent</span>
          <span>Yield</span>
          <span>DOM</span>
        </div>
        {properties.map((property) => (
          <div className="comparison-table-row comparison-table-row-wide" key={property.id}>
            <span>
              <strong>{property.address}</strong>
              <small>
                {property.bedrooms}bd · {property.bathrooms}ba · {property.square_feet} sqft
              </small>
            </span>
            <span>{currency.format(property.estimated_value ?? 0)}</span>
            <span>
              {property.monthly_rent != null ? `${currency.format(property.monthly_rent)}/mo` : "Unavailable"}
            </span>
            <span>{formatYield(property.gross_yield_pct)}</span>
            <span>{property.days_on_market ?? "N/A"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function RenterSelectionPanel({
  searchTerm,
  onSearchChange,
  minPrice,
  onMinPriceChange,
  maxPrice,
  onMaxPriceChange,
  bedroomFilter,
  onBedroomFilterChange,
  propertyTypeFilter,
  onPropertyTypeFilterChange,
  sortMode,
  onSortModeChange,
  propertyTypes,
  filteredProperties,
  comparisonProperties,
  comparisonIds,
  onToggleComparison,
  onSelectId
}) {
  return (
    <section className="panel renter-comparison-panel reveal-on-scroll">
      <div className="panel-heading">
        <p className="eyebrow">Active listings</p>
        <h2>Search, filter, and choose Irvine listings to compare</h2>
      </div>
      <div className="renter-filter-grid">
        <label className="filter-field">
          <span>Search address</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Start typing an Irvine address"
          />
        </label>
        <label className="filter-field">
          <span>Min price</span>
          <input
            type="number"
            inputMode="numeric"
            value={minPrice}
            onChange={(event) => onMinPriceChange(event.target.value)}
            placeholder="500000"
          />
        </label>
        <label className="filter-field">
          <span>Max price</span>
          <input
            type="number"
            inputMode="numeric"
            value={maxPrice}
            onChange={(event) => onMaxPriceChange(event.target.value)}
            placeholder="2500000"
          />
        </label>
        <label className="filter-field">
          <span>Bedrooms</span>
          <select value={bedroomFilter} onChange={(event) => onBedroomFilterChange(event.target.value)}>
            <option value="all">All</option>
            <option value="1">1+ bedrooms</option>
            <option value="2">2+ bedrooms</option>
            <option value="3">3+ bedrooms</option>
            <option value="4">4+ bedrooms</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Property type</span>
          <select value={propertyTypeFilter} onChange={(event) => onPropertyTypeFilterChange(event.target.value)}>
            <option value="all">All types</option>
            {propertyTypes.map((propertyType) => (
              <option key={propertyType} value={propertyType}>
                {propertyType}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Sort by</span>
          <select value={sortMode} onChange={(event) => onSortModeChange(event.target.value)}>
            <option value="newest">Newest</option>
            <option value="yield">Highest yield</option>
            <option value="price_low">Lowest price</option>
            <option value="rent_high">Highest modeled rent</option>
          </select>
        </label>
      </div>
      {comparisonProperties.length ? (
        <div className="selection-chip-row">
          {comparisonProperties.map((property) => (
            <button
              key={property.id}
              type="button"
              className="selection-chip"
              onClick={() => onToggleComparison(property.id)}
            >
              <span>{property.address}</span>
              <strong>Remove</strong>
            </button>
          ))}
        </div>
      ) : null}
      <div className="renter-selection-results">
        {filteredProperties.map((property) => (
          <article className={`renter-result-row ${comparisonIds.includes(property.id) ? "selected" : ""}`} key={property.id}>
            <button type="button" className="renter-result-main" onClick={() => onSelectId(property.id)}>
              <strong>{property.address}</strong>
              <span>
                {property.bedrooms}bd · {property.bathrooms}ba · {property.square_feet} sqft · {property.property_type}
              </span>
            </button>
            <div className="renter-result-metrics">
              <span>{currency.format(property.estimated_value ?? 0)}</span>
              <span>{formatYield(property.gross_yield_pct)}</span>
              <span>{property.days_on_market ?? "N/A"} DOM</span>
            </div>
            <button type="button" className="comparison-select inline" onClick={() => onToggleComparison(property.id)}>
              {comparisonIds.includes(property.id) ? "Selected" : "Add"}
            </button>
          </article>
        ))}
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
        <p className="eyebrow">Score factors</p>
        <h2>Listing score breakdown</h2>
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

function InvestorControlPanel({
  listings,
  propertyTypes,
  investorTypeFilter,
  onInvestorTypeFilterChange,
  investorSortMode,
  onInvestorSortModeChange,
  investorMaxDom,
  onInvestorMaxDomChange
}) {
  return (
    <>
      <section className="panel investor-summary-panel reveal-on-scroll">
        <div className="panel-heading">
          <p className="eyebrow">Investor listings</p>
          <h2>Active Irvine inventory ranked by modeled yield</h2>
        </div>
        <div className="stats-grid compact">
          <article>
            <span>Listings shown</span>
            <strong>{listings.length}</strong>
          </article>
          <article>
            <span>Highest yield</span>
            <strong>{formatYield(listings[0]?.gross_yield_pct)}</strong>
          </article>
          <article>
            <span>Fastest market</span>
            <strong>{listings[0]?.days_on_market ?? "N/A"} days</strong>
          </article>
          <article>
            <span>Coverage</span>
            <strong>Real Irvine data</strong>
          </article>
        </div>
      </section>

      <section className="panel investor-list-panel reveal-on-scroll">
        <div className="panel-heading">
          <p className="eyebrow">Opportunity board</p>
          <h2>Top yield candidates right now</h2>
        </div>
        <div className="renter-filter-grid investor-filter-grid">
          <label className="filter-field">
            <span>Property type</span>
            <select value={investorTypeFilter} onChange={(event) => onInvestorTypeFilterChange(event.target.value)}>
              <option value="all">All types</option>
              {propertyTypes.map((propertyType) => (
                <option key={propertyType} value={propertyType}>
                  {propertyType}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Max days on market</span>
            <select value={investorMaxDom} onChange={(event) => onInvestorMaxDomChange(event.target.value)}>
              <option value="all">Any</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
            </select>
          </label>
          <label className="filter-field">
            <span>Sort by</span>
            <select value={investorSortMode} onChange={(event) => onInvestorSortModeChange(event.target.value)}>
              <option value="yield">Highest yield</option>
              <option value="newest">Newest</option>
              <option value="price_low">Lowest price</option>
              <option value="dom_low">Lowest DOM</option>
            </select>
          </label>
        </div>
        <div className="investor-grid">
          {listings.map((listing) => (
            <article className="investor-card" key={listing.id}>
              <div className="comparison-card-meta">
                <span className="comparison-card-chip">{listing.city}</span>
                <span className="comparison-card-chip soft">{listing.property_type}</span>
              </div>
              <p className="property-name">{listing.address}</p>
              <p className="property-market">
                {listing.bedrooms}bd · {listing.bathrooms}ba · {listing.square_feet} sqft
              </p>
              <div className="investor-card-metrics">
                <div>
                  <span>List price</span>
                  <strong>{currency.format(listing.estimated_value ?? 0)}</strong>
                </div>
                <div>
                  <span>Modeled rent</span>
                  <strong>
                    {listing.monthly_rent != null ? `${currency.format(listing.monthly_rent)}/mo` : "Unavailable"}
                  </strong>
                </div>
                <div>
                  <span>Gross yield</span>
                  <strong>{formatYield(listing.gross_yield_pct)}</strong>
                </div>
                <div>
                  <span>Days on market</span>
                  <strong>{listing.days_on_market ?? "N/A"}</strong>
                </div>
              </div>
              {listing.builder?.development ? (
                <p className="investor-builder">
                  Builder: {listing.builder.name} · {listing.builder.development}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function App() {
  const [properties, setProperties] = useState([]);
  const [view, setView] = useState("intro");
  const [selectedId, setSelectedId] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedForecast, setSelectedForecast] = useState(null);
  const [comparisonIds, setComparisonIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedroomFilter, setBedroomFilter] = useState("all");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("all");
  const [sortMode, setSortMode] = useState("newest");
  const [investorTypeFilter, setInvestorTypeFilter] = useState("all");
  const [investorSortMode, setInvestorSortMode] = useState("yield");
  const [investorMaxDom, setInvestorMaxDom] = useState("all");
  const [activeFactor, setActiveFactor] = useState("yield");
  const [openFooterPanel, setOpenFooterPanel] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("renter");

  useEffect(() => {
    async function loadProperties() {
      try {
        const response = await fetch(`${API_BASE}/properties`);
        if (!response.ok) {
          throw new Error("Failed to load Irvine listings.");
        }

        const data = await response.json();
        const loadedProperties = data.properties ?? [];
        setProperties(loadedProperties);
        setSelectedId(loadedProperties[0]?.id ?? null);
        setComparisonIds(loadedProperties.slice(0, 3).map((property) => property.id));
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
          throw new Error("Failed to load listing details.");
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

  const propertyTypes = useMemo(
    () => [...new Set(properties.map((property) => property.property_type).filter(Boolean))].sort(),
    [properties]
  );

  const filteredRenterProperties = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    const filtered = properties.filter((property) => {
      const price = property.estimated_value ?? 0;
      const matchesSearch =
        !normalizedQuery ||
        property.address?.toLowerCase().includes(normalizedQuery) ||
        property.zip_code?.toString().includes(normalizedQuery);
      const matchesMinPrice = !minPrice || price >= Number(minPrice);
      const matchesMaxPrice = !maxPrice || price <= Number(maxPrice);
      const matchesBedrooms =
        bedroomFilter === "all" || (property.bedrooms ?? 0) >= Number(bedroomFilter);
      const matchesType =
        propertyTypeFilter === "all" || property.property_type === propertyTypeFilter;

      return matchesSearch && matchesMinPrice && matchesMaxPrice && matchesBedrooms && matchesType;
    });

    filtered.sort((left, right) => {
      if (sortMode === "yield") {
        return (right.gross_yield_pct ?? -1) - (left.gross_yield_pct ?? -1);
      }
      if (sortMode === "price_low") {
        return (left.estimated_value ?? Number.MAX_SAFE_INTEGER) - (right.estimated_value ?? Number.MAX_SAFE_INTEGER);
      }
      if (sortMode === "rent_high") {
        return (right.monthly_rent ?? -1) - (left.monthly_rent ?? -1);
      }

      return String(right.listed_date ?? "").localeCompare(String(left.listed_date ?? ""));
    });

    return filtered.slice(0, 12);
  }, [properties, searchTerm, minPrice, maxPrice, bedroomFilter, propertyTypeFilter, sortMode]);

  const comparisonProperties = useMemo(
    () => properties.filter((property) => comparisonIds.includes(property.id)),
    [properties, comparisonIds]
  );

  const featuredInvestorListings = useMemo(
    () =>
      [...properties]
        .filter((property) => {
          const matchesType =
            investorTypeFilter === "all" || property.property_type === investorTypeFilter;
          const matchesDom =
            investorMaxDom === "all" || (property.days_on_market ?? Number.MAX_SAFE_INTEGER) <= Number(investorMaxDom);

          return matchesType && matchesDom;
        })
        .sort(
          (left, right) => {
            if (investorSortMode === "newest") {
              return String(right.listed_date ?? "").localeCompare(String(left.listed_date ?? ""));
            }
            if (investorSortMode === "price_low") {
              return (left.estimated_value ?? Number.MAX_SAFE_INTEGER) - (right.estimated_value ?? Number.MAX_SAFE_INTEGER);
            }
            if (investorSortMode === "dom_low") {
              return (left.days_on_market ?? Number.MAX_SAFE_INTEGER) - (right.days_on_market ?? Number.MAX_SAFE_INTEGER);
            }

            return (
              (right.gross_yield_pct ?? -1) - (left.gross_yield_pct ?? -1) ||
              (left.days_on_market ?? 999) - (right.days_on_market ?? 999)
            );
          }
        )
        .slice(0, 24),
    [properties, investorTypeFilter, investorSortMode, investorMaxDom]
  );

  const bestComparisonFit = useMemo(() => {
    if (!comparisonProperties.length) {
      return null;
    }

    const prices = comparisonProperties.map((property) => property.estimated_value ?? 0);
    const yields = comparisonProperties.map((property) => property.gross_yield_pct ?? 0);
    const days = comparisonProperties.map((property) => property.days_on_market ?? 999);
    const sizes = comparisonProperties.map((property) => property.square_feet ?? 0);

    const ranked = comparisonProperties
      .map((property) => {
        const fitScore = Math.round(
          clamp(
            normalize(property.gross_yield_pct ?? 0, Math.min(...yields), Math.max(...yields)) * 0.35 +
              normalize(property.estimated_value ?? 0, Math.min(...prices), Math.max(...prices), true) * 0.25 +
              normalize(property.days_on_market ?? 999, Math.min(...days), Math.max(...days), true) * 0.25 +
              normalize(property.square_feet ?? 0, Math.min(...sizes), Math.max(...sizes)) * 0.15,
            0,
            1
          ) * 100
        );

        return {
          ...property,
          fitScore
        };
      })
      .sort((left, right) => right.fitScore - left.fitScore);

    return ranked[0];
  }, [comparisonProperties]);

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

  function renderFooterPanel(panelKey) {
    if (panelKey === "about") {
      return (
        <p>
          LeaseLens now uses active Irvine listing data instead of a demo property set, combining
          real list prices with modeled rent estimates.
        </p>
      );
    }

    if (panelKey === "how") {
      return (
        <p>
          Renter mode compares real active listings, landlord mode scores one real listing at a
          time, and investor mode ranks the same Irvine inventory by modeled yield.
        </p>
      );
    }

    if (panelKey === "faq") {
      return (
        <div className="footer-faq-list">
          {footerFaqs.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      );
    }

    if (panelKey === "contact") {
      return (
        <p>
          Contact us at <strong>888-888-8888</strong> for product support or general questions.
        </p>
      );
    }

    if (panelKey === "help") {
      return (
        <p>
          Use renter mode for side-by-side comparison, landlord mode for listing scoring, and
          investor mode for the highest-yield opportunities in the current Irvine feed.
        </p>
      );
    }

    if (panelKey === "disclaimer") {
      return (
        <p>
          Modeled rent and score outputs are decision-support signals only. They are not financial,
          legal, or investment advice.
        </p>
      );
    }

    if (panelKey === "privacy") {
      return (
        <p>
          LeaseLens may collect basic product usage and property-selection activity to improve the
          experience.
        </p>
      );
    }

    if (panelKey === "terms") {
      return (
        <p>
          LeaseLens provides informational market insights only and does not offer financial, legal,
          or investment advice.
        </p>
      );
    }

    return null;
  }

  return (
    <div className="app-shell" id="top">
      {view === "intro" ? (
        <section className="intro-view reveal-on-scroll is-visible">
          <div className="intro-shell">
            <div className="intro-copy">
              <a
                href="#dashboard"
                className="intro-brand"
                onClick={(event) => {
                  event.preventDefault();
                  setView("dashboard");
                }}
              >
                <img src={leaseLensLogo} alt="LeaseLens logo" className="intro-logo" />
                <span>LeaseLens</span>
              </a>
              <p className="eyebrow">Real Irvine inventory</p>
              <h1>Use live Irvine listings across renter, landlord, and investor workflows.</h1>
              <p className="hero-text">
                The app now uses active Irvine listing data with modeled rent, gross yield, list
                price, and days-on-market instead of a hypothetical demo property set.
              </p>
              <div className="intro-actions">
                <button type="button" className="intro-primary" onClick={() => setView("dashboard")}>
                  Enter LeaseLens
                </button>
                <button
                  type="button"
                  className="intro-secondary"
                  onClick={() => {
                    setMode("renter");
                    setView("dashboard");
                  }}
                >
                  Open renter mode
                </button>
              </div>
            </div>
            <div className="intro-panel">
              <p className="card-label">What changed</p>
              <div className="intro-feature-list">
                <article>
                  <span>Renter comparison</span>
                  <strong>Compare real active Irvine listings by price, rent, yield, and DOM.</strong>
                </article>
                <article>
                  <span>Landlord scoring</span>
                  <strong>Score one real listing using current market signals and modeled rent.</strong>
                </article>
                <article>
                  <span>Investor board</span>
                  <strong>Rank live Irvine opportunities by estimated gross yield.</strong>
                </article>
              </div>
              <div className="intro-orb intro-orb-one" />
              <div className="intro-orb intro-orb-two" />
            </div>
          </div>
        </section>
      ) : (
        <>
          <header className="site-header reveal-on-scroll is-visible">
            <a href="#top" className="site-header-brand">
              <img src={leaseLensLogo} alt="LeaseLens logo" className="site-header-logo" />
              <span>LeaseLens</span>
            </a>
            <button
              type="button"
              className={`site-menu-toggle ${menuOpen ? "active" : ""}`}
              onClick={() => setMenuOpen((current) => !current)}
              aria-expanded={menuOpen}
              aria-controls="site-menu-panel"
            >
              <span className="site-menu-label">Menu</span>
              <span className="site-menu-icon" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </button>
          </header>

          {menuOpen ? (
            <aside className="site-menu-panel reveal-on-scroll is-visible" id="site-menu-panel">
              <p className="eyebrow">Navigation</p>
              <div className="site-menu-grid">
                <button
                  type="button"
                  className="site-menu-link"
                  onClick={() => {
                    setView("intro");
                    setMenuOpen(false);
                  }}
                >
                  <span className="site-menu-link-index">01</span>
                  <span>
                    <strong>Home</strong>
                    <small>Return to the introduction page</small>
                  </span>
                </button>
                {[
                  ["renter", "02", "Renter mode", "Compare real active listings"],
                  ["landlord", "03", "Landlord mode", "Score one real listing"],
                  ["investor", "04", "Investor mode", "Rank current Irvine opportunities"]
                ].map(([nextMode, index, label, text]) => (
                  <button
                    key={nextMode}
                    type="button"
                    className="site-menu-link"
                    onClick={() => {
                      setMode(nextMode);
                      setView("dashboard");
                      setMenuOpen(false);
                    }}
                  >
                    <span className="site-menu-link-index">{index}</span>
                    <span>
                      <strong>{label}</strong>
                      <small>{text}</small>
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  className="site-menu-link"
                  onClick={() => {
                    setView("dashboard");
                    setMenuOpen(false);
                    requestAnimationFrame(() => {
                      document.getElementById("footer")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    });
                  }}
                >
                  <span className="site-menu-link-index">05</span>
                  <span>
                    <strong>Support</strong>
                    <small>Open help, FAQ, and contact details</small>
                  </span>
                </button>
              </div>
            </aside>
          ) : null}

          <header className="hero reveal-on-scroll is-visible">
            <div className="hero-copy">
              <p className="eyebrow">LeaseLens</p>
              <h1>Real Irvine listing intelligence across every mode.</h1>
              <p className="hero-text">
                Compare active listings by modeled rent, current list price, estimated yield, and
                days on market. No demo properties, no hypothetical trend history.
              </p>
              <div className="hero-actions">
                {["renter", "landlord", "investor"].map((nextMode) => (
                  <button
                    key={nextMode}
                    className={mode === nextMode ? "active" : ""}
                    onClick={() => setMode(nextMode)}
                  >
                    {nextMode.charAt(0).toUpperCase() + nextMode.slice(1)} mode
                  </button>
                ))}
              </div>
            </div>
            <div className="hero-card">
              <p className="card-label">Current data model</p>
              <h2>List price, modeled rent, gross yield, price efficiency, and market speed.</h2>
              <p>
                Every mode is now anchored to the same active Irvine listing feed so the app stays
                internally consistent.
              </p>
              <div className="hero-art">
                <div className="hero-art-card hero-art-primary">
                  <span>List price</span>
                  <strong>Live</strong>
                </div>
                <div className="hero-art-card hero-art-secondary">
                  <span>Modeled rent</span>
                  <strong>Scored</strong>
                </div>
                <div className="hero-art-card hero-art-tertiary">
                  <span>Gross yield</span>
                  <strong>Ranked</strong>
                </div>
                <div className="hero-art-orb hero-art-orb-one" />
                <div className="hero-art-orb hero-art-orb-two" />
              </div>
            </div>
          </header>

          {loading ? <p className="status">Loading Irvine listings...</p> : null}
          {error ? <p className="status error">{error}</p> : null}

          {!loading && !error ? (
            <main className="dashboard" id="workspace">
              {mode === "renter" ? (
                <>
                  <RenterSelectionPanel
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    minPrice={minPrice}
                    onMinPriceChange={setMinPrice}
                    maxPrice={maxPrice}
                    onMaxPriceChange={setMaxPrice}
                    bedroomFilter={bedroomFilter}
                    onBedroomFilterChange={setBedroomFilter}
                    propertyTypeFilter={propertyTypeFilter}
                    onPropertyTypeFilterChange={setPropertyTypeFilter}
                    sortMode={sortMode}
                    onSortModeChange={setSortMode}
                    propertyTypes={propertyTypes}
                    filteredProperties={filteredRenterProperties}
                    comparisonProperties={comparisonProperties}
                    comparisonIds={comparisonIds}
                    onToggleComparison={toggleComparison}
                    onSelectId={setSelectedId}
                  />

                  <ComparisonTable properties={comparisonProperties} />

                  {bestComparisonFit ? (
                    <section className="panel renter-summary-panel reveal-on-scroll">
                      <div className="panel-heading">
                        <p className="eyebrow">Best fit from your comparison</p>
                        <h2>{bestComparisonFit.address}</h2>
                      </div>
                      <div className="stats-grid compact">
                        <article>
                          <span>List price</span>
                          <strong>{currency.format(bestComparisonFit.estimated_value ?? 0)}</strong>
                        </article>
                        <article>
                          <span>Modeled rent</span>
                          <strong>
                            {bestComparisonFit.monthly_rent != null
                              ? `${currency.format(bestComparisonFit.monthly_rent)}/mo`
                              : "Unavailable"}
                          </strong>
                        </article>
                        <article>
                          <span>Gross yield</span>
                          <strong>{formatYield(bestComparisonFit.gross_yield_pct)}</strong>
                        </article>
                      </div>
                      <p className="decision-copy">{bestComparisonFit.renter_takeaway}</p>
                    </section>
                  ) : null}
                </>
              ) : mode === "investor" ? (
                <InvestorControlPanel
                  listings={featuredInvestorListings}
                  propertyTypes={propertyTypes}
                  investorTypeFilter={investorTypeFilter}
                  onInvestorTypeFilterChange={setInvestorTypeFilter}
                  investorSortMode={investorSortMode}
                  onInvestorSortModeChange={setInvestorSortMode}
                  investorMaxDom={investorMaxDom}
                  onInvestorMaxDomChange={setInvestorMaxDom}
                />
              ) : selectedProperty && selectedForecast ? (
                <>
                  <section className="panel landlord-selector-panel reveal-on-scroll">
                    <div className="panel-heading">
                      <p className="eyebrow">Listing score</p>
                      <h2>Select an Irvine listing to evaluate</h2>
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
                        <p className="eyebrow">Listing details</p>
                        <h2>{selectedProperty.address}</h2>
                        <p className="property-market">
                          {selectedProperty.city}, {selectedProperty.state} {selectedProperty.zip_code}
                        </p>
                      </div>
                      <div className="forecast-score-card">
                        <p className="card-label">Listing score</p>
                        <div className="forecast-score-metric">
                          <strong>{selectedForecast.investment_score}</strong>
                          <span>out of 100</span>
                        </div>
                        <button type="button" className="forecast-decision">
                          Review
                        </button>
                      </div>
                    </div>
                    <div className="panel-heading">
                      <p className="eyebrow">Real-data underwriting</p>
                      <h2>Modeled rent, gross yield, market speed, and price efficiency.</h2>
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
                        <span>List price</span>
                        <strong>{currency.format(selectedProperty.estimated_value ?? 0)}</strong>
                      </article>
                      <article>
                        <span>Modeled rent</span>
                        <strong>
                          {selectedProperty.monthly_rent != null
                            ? `${currency.format(selectedProperty.monthly_rent)}/mo`
                            : "Unavailable"}
                        </strong>
                      </article>
                      <article>
                        <span>Gross yield</span>
                        <strong>{formatYield(selectedProperty.gross_yield_pct)}</strong>
                      </article>
                    </div>
                    <p className="landlord-disclaimer">
                      This score uses current Irvine listing data and rent model output. It is
                      product guidance, not investment advice.
                    </p>
                  </section>

                  <section className="landlord-bottom-grid">
                    <FactorBreakdown
                      forecast={selectedForecast}
                      activeFactor={activeFactor}
                      onSelectFactor={setActiveFactor}
                    />

                    <section className="panel landlord-insights-panel reveal-on-scroll">
                      <div className="panel-heading">
                        <p className="eyebrow">Key insights</p>
                        <h2>Listing metrics and real-data outlook</h2>
                      </div>
                      <ul className="flat-list">
                        {selectedForecast.drivers.map((driver) => (
                          <li key={driver}>{driver}</li>
                        ))}
                      </ul>
                      <div className="stats-grid compact">
                        <article>
                          <span>Modeled rent</span>
                          <strong>{currency.format(selectedForecast.market_metrics.predicted_monthly_rent ?? 0)}</strong>
                        </article>
                        <article>
                          <span>Gross yield</span>
                          <strong>{formatYield(selectedForecast.market_metrics.gross_yield_pct)}</strong>
                        </article>
                        <article>
                          <span>Days on market</span>
                          <strong>{selectedForecast.market_metrics.days_on_market}</strong>
                        </article>
                        <article>
                          <span>Price / sqft</span>
                          <strong>{currency.format(selectedForecast.market_metrics.price_per_sqft ?? 0)}</strong>
                        </article>
                      </div>
                    </section>
                  </section>
                </>
              ) : null}
            </main>
          ) : null}

          <footer className="site-footer reveal-on-scroll" id="footer">
            <div className="footer-shell">
              <div className="footer-brand">
                <p className="eyebrow">LeaseLens</p>
                <h2 className="footer-title">Real Irvine inventory for renters, landlords, and investors.</h2>
                <p className="footer-summary">
                  Housing decisions with current listings, modeled rent, and explainable scoring.
                </p>
              </div>
              <div className="footer-content">
                <div className="footer-column">
                  <p className="footer-column-title">Menu</p>
                  <nav className="footer-links" aria-label="Footer menu">
                    {[
                      ["about", "About us"],
                      ["how", "How it works"],
                      ["faq", "FAQ"]
                    ].map(([key, label]) => (
                      <div key={key} className="footer-link-group">
                        <button
                          type="button"
                          className={`footer-link-button ${openFooterPanel === key ? "active" : ""}`}
                          onClick={() => setOpenFooterPanel((current) => (current === key ? null : key))}
                        >
                          {label}
                        </button>
                        {openFooterPanel === key ? (
                          <div className="footer-inline-panel">{renderFooterPanel(key)}</div>
                        ) : null}
                      </div>
                    ))}
                  </nav>
                </div>
                <div className="footer-column">
                  <p className="footer-column-title">Support</p>
                  <nav className="footer-links" aria-label="Footer support">
                    {[
                      ["contact", "Contact us"],
                      ["help", "Help"],
                      ["disclaimer", "Forecast disclaimer"]
                    ].map(([key, label]) => (
                      <div key={key} className="footer-link-group">
                        <button
                          type="button"
                          className={`footer-link-button ${openFooterPanel === key ? "active" : ""}`}
                          onClick={() => setOpenFooterPanel((current) => (current === key ? null : key))}
                        >
                          {label}
                        </button>
                        {openFooterPanel === key ? (
                          <div className="footer-inline-panel">{renderFooterPanel(key)}</div>
                        ) : null}
                      </div>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

export default App;
