import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUpRight, Compass, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import hero from "@/assets/hero-residence.jpg";
import { PropertyCard } from "@/components/property-card";
import { SearchForm } from "@/components/search-form";
import { Button } from "@/components/ui/button";
import { properties } from "@/lib/properties";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "HouseProvider.in — Find a place that feels like home" },
    { name: "description", content: "Explore thoughtfully presented homes across India. Search rentals and homes for sale by location, type and budget." },
    { property: "og:title", content: "HouseProvider.in — Find a place that feels like home" },
    { property: "og:description", content: "Explore thoughtfully presented homes across India." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Home,
});

function Home() {
  return <main>
    <section className="hero"><img className="hero-photo" src={hero} alt="Contemporary residence surrounded by lush greenery" width={1600} height={1056}/><div className="hero-shade"/><div className="hero-inner container-wide"><div className="hero-content"><p className="eyebrow hero-eyebrow"><span className="eyebrow-line"/> A BETTER WAY TO FIND HOME</p><h1>Find a place<br/>that feels like <em>home.</em></h1><p className="hero-subtitle">Discover homes, neighborhoods and spaces intelligently — based on how you actually want to live.</p><div className="hero-actions"><Button asChild className="hero-button"><Link to="/properties">Find my home <ArrowUpRight size={18}/></Link></Button><Link to="/list-property" className="hero-text-link">List your property <ArrowRight size={17}/></Link></div></div><div className="hero-bottom"><span>CURATED SPACES. BETTER BEGINNINGS.</span><a href="#search" aria-label="Scroll to search"><ArrowDown size={19}/></a><span>01 / DISCOVER</span></div></div></section>
    <section id="search" className="search-section"><div className="container-wide"><div className="section-intro search-intro"><div><p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p><h2>Where do you want to live<span className="accent-dot">?</span></h2></div><p>From the neighborhood you love to the little details that matter. Start with what feels right.</p></div><SearchForm /></div></section>
    <section className="featured-section"><div className="container-wide"><div className="section-heading"><div><p className="eyebrow">A PLACE FOR EVERY POSSIBILITY</p><h2>Homes worth <em>coming back to.</em></h2></div><Button asChild variant="outline" className="outline-link"><Link to="/properties">Explore all homes <ArrowUpRight size={17}/></Link></Button></div><div className="property-grid">{properties.slice(0, 3).map((property, index) => <PropertyCard property={property} index={index} key={property.slug}/>)}</div></div></section>
    <section className="philosophy-section"><div className="container-wide philosophy-grid"><div className="philosophy-title"><p className="eyebrow">MORE THAN FOUR WALLS</p><h2>The right home changes <em>everything.</em></h2></div><div className="philosophy-copy"><p>It’s the morning light. The neighborhood coffee shop. The feeling that you belong. Finding a home should be about more than scrolling through listings.</p><Link to="/properties" className="inline-arrow">Start exploring <ArrowUpRight size={18}/></Link></div></div></section>
    <section className="ways-section"><div className="container-wide"><p className="eyebrow">EXPLORE YOUR WAY</p><div className="ways-grid"><Link to="/properties" search={{ intent: "Rent" }} className="way-item"><span className="way-icon"><Compass size={27}/></span><span className="way-number">01 /</span><h3>Find a rental</h3><p>Discover a space that fits your life, right now.</p><ArrowUpRight className="way-arrow" size={22}/></Link><Link to="/properties" search={{ intent: "Buy" }} className="way-item"><span className="way-icon"><MapPin size={27}/></span><span className="way-number">02 /</span><h3>Buy a home</h3><p>Find a place to make your own for years to come.</p><ArrowUpRight className="way-arrow" size={22}/></Link><Link to="/properties" className="way-item"><span className="way-icon"><Sparkles size={27}/></span><span className="way-number">03 /</span><h3>Explore places</h3><p>Get inspired by homes across India's cities.</p><ArrowUpRight className="way-arrow" size={22}/></Link></div></div></section>
    <section className="closing-section"><div className="container-wide closing-inner"><div><p className="eyebrow"><ShieldCheck size={15}/> FIND WITH CONFIDENCE</p><h2>Somewhere good<br/>starts <em>here.</em></h2></div><Button asChild className="closing-button"><Link to="/properties">Explore homes <ArrowUpRight size={18}/></Link></Button></div></section>
  </main>;
}