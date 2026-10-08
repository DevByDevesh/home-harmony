import { useMemo, useState } from "react";
import { Calculator, CalendarCheck, ExternalLink, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Home, Listing, ListingDetails } from "@/lib/catalog";
import { LocationIntelligenceMap } from "@/components/location-intelligence-map";

type IntelligenceHome = Home & Partial<ListingDetails>;

function formatInr(value: number) {
  return "₹" + Math.round(value).toLocaleString("en-IN");
}

function googleMapsUrl(home: IntelligenceHome) {
  if (home.lat && home.lng) {
    return "https://www.google.com/maps/search/?api=1&query=" + home.lat + "," + home.lng;
  }
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(home.neighborhood + ", " + home.city);
}

export function PropertySectionNav({ home }: { home: IntelligenceHome }) {
  const items = [
    ["overview", "Overview"],
    ["details", "Details"],
    ["amenities", "Amenities"],
    ["location", "Location"],
    ...(home.floorPlanImages?.length ? [["floor-plans", "Floor plans"]] : []),
    ...(home.mode === "Buy" ? [["emi", "EMI calculator"]] : []),
    ["visit", "Schedule visit"],
  ] as const;

  return (
    <nav className="property-section-nav" aria-label="Property sections">
      <div>{items.map(([id, label]) => <a href={"#" + id} key={id}>{label}</a>)}</div>
    </nav>
  );
}

export function MortgageCalculator({ home }: { home: IntelligenceHome }) {
  const [downPayment, setDownPayment] = useState(Math.round(home.price * 0.2));
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);
  const loanAmount = Math.max(home.price - downPayment, 0);
  const emi = useMemo(() => {
    const months = years * 12;
    const monthlyRate = rate / 1200;
    if (!loanAmount || !months) return 0;
    if (!monthlyRate) return loanAmount / months;
    const factor = Math.pow(1 + monthlyRate, months);
    return (loanAmount * monthlyRate * factor) / (factor - 1);
  }, [loanAmount, rate, years]);

  return (
    <section id="emi" className="property-feature-section">
      <div className="property-section-heading">
        <div><p className="kicker">BUYING TOOLS</p><h2>Estimate your monthly EMI.</h2></div>
        <Calculator size={24} />
      </div>
      <div className="mortgage-layout">
        <div className="mortgage-controls">
          <label><span>Down payment</span><div className="range-value">{formatInr(downPayment)}</div>
            <input type="range" min={0} max={home.price} step={Math.max(10000, Math.round(home.price / 100))} value={downPayment} onChange={e => setDownPayment(Number(e.target.value))} aria-label="Down payment" />
          </label>
          <label><span>Interest rate</span><div className="range-value">{rate.toFixed(1)}%</div>
            <input type="range" min={5} max={15} step={0.1} value={rate} onChange={e => setRate(Number(e.target.value))} aria-label="Interest rate" />
          </label>
          <label><span>Loan tenure</span><div className="range-value">{years} years</div>
            <input type="range" min={5} max={30} step={1} value={years} onChange={e => setYears(Number(e.target.value))} aria-label="Loan tenure" />
          </label>
        </div>
        <div className="mortgage-result">
          <span>Estimated EMI</span>
          <strong>{formatInr(emi)}<small>/ month</small></strong>
          <div><span>Property price</span><b>{formatInr(home.price)}</b></div>
          <div><span>Loan amount</span><b>{formatInr(loanAmount)}</b></div>
          <p>Illustrative estimate only. Actual loan terms, rates, taxes and fees depend on the lender and borrower.</p>
        </div>
      </div>
    </section>
  );
}

export function PropertyIntelligence({ home, listings }: { home: IntelligenceHome; listings: Listing[] }) {
  return (
    <div className="property-intelligence">
      <section id="location" className="property-feature-section location-section">
        <div className="property-section-heading">
          <div><p className="kicker">LOCATION</p><h2>Know where you’re moving.</h2></div>
          <Button asChild variant="outline"><a href={googleMapsUrl(home)} target="_blank" rel="noreferrer">Open in Google Maps <ExternalLink size={15} /></a></Button>
        </div>
        <div className="location-card">
          <div className="location-icon"><MapPin size={20} /></div>
          <div><strong>{home.neighborhood}</strong><p>{home.city}</p>{typeof home.lat === "number" && typeof home.lng === "number" && home.lat !== 0 && home.lng !== 0 && <small>{home.lat.toFixed(4)}, {home.lng.toFixed(4)}</small>}</div>
          <a className="location-action" href={googleMapsUrl(home)} target="_blank" rel="noreferrer"><Navigation size={16} /> Get directions</a>
        </div>
      </section>

      <LocationIntelligenceMap home={home as Listing} listings={listings} />

      {home.floorPlanImages?.length ? (
        <section id="floor-plans" className="property-feature-section">
          <div className="property-section-heading"><div><p className="kicker">FLOOR PLANS</p><h2>See how the space is arranged.</h2></div></div>
          <div className="floor-plan-grid">{home.floorPlanImages.map((src, index) => <figure key={src + "-floor-" + index}><img src={src} alt={"Floor plan " + (index + 1) + " for " + home.name} loading="lazy" /><figcaption>Floor plan {index + 1}</figcaption></figure>)}</div>
        </section>
      ) : null}

      {home.mode === "Buy" ? <MortgageCalculator home={home} /> : null}

      <section id="visit" className="property-feature-section property-visit-strip">
        <div><p className="kicker">NEXT STEP</p><h2>Want to see it in person?</h2><p>Pick a convenient slot and send a visit request to the property owner.</p></div>
        <a className="visit-anchor" href="#visit-request"><CalendarCheck size={17} /> Schedule a visit</a>
      </section>
    </div>
  );
}
