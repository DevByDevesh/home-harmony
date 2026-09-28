import { Link } from "@tanstack/react-router";
import { ArrowUpRight, BedDouble, MapPin, MoveUpRight } from "lucide-react";
import { type Property, formatPrice } from "@/lib/properties";

export function PropertyCard({ property, index = 0 }: { property: Property; index?: number }) {
  return <article className="property-card reveal" style={{ animationDelay: `${Math.min(index, 5) * 90}ms` }}>
    <Link to="/property/$slug" params={{ slug: property.slug }} className="property-image-link" aria-label={`View ${property.title}`}>
      <img src={property.image} alt={`Interior or exterior of ${property.title}`} width={1008} height={768} loading="lazy" />
      <span className="property-image-label">{property.intent === "Rent" ? "For rent" : "For sale"}</span>
      <span className="property-image-arrow"><MoveUpRight size={19}/></span>
    </Link>
    <div className="property-card-body"><div className="property-card-top"><span className="property-location"><MapPin size={14}/>{property.locality}, {property.city}</span><span className="property-price">{formatPrice(property)}{property.intent === "Rent" && <small> / mo</small>}</span></div>
      <Link to="/property/$slug" params={{ slug: property.slug }} className="property-title">{property.title}<ArrowUpRight size={17}/></Link>
      <div className="property-meta"><span><BedDouble size={15}/>{property.beds} BHK</span><span>{property.area.toLocaleString("en-IN")} sq.ft.</span><span>{property.furnishing}</span></div>
    </div>
  </article>;
}