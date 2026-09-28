import hinjewadi from "@/assets/property-hinjewadi.jpg";
import bandra from "@/assets/property-bandra.jpg";
import bengaluru from "@/assets/property-bengaluru.jpg";
import hyderabad from "@/assets/property-hyderabad.jpg";
import puneHouse from "@/assets/property-pune-house.jpg";
import chennai from "@/assets/property-chennai.jpg";

export type Property = {
  slug: string;
  title: string;
  city: string;
  locality: string;
  price: number;
  intent: "Rent" | "Buy";
  type: "Apartment" | "House" | "Room" | "PG" | "Commercial";
  beds: number;
  baths: number;
  area: number;
  furnishing: string;
  image: string;
  description: string;
  amenities: string[];
  available: string;
};

// Fictional showcase records. No verification or availability is implied beyond this demo catalog.
export const properties: Property[] = [
  { slug: "2bhk-furnished-hinjewadi-pune-1001", title: "The Courtyard Apartment", city: "Pune", locality: "Hinjewadi Phase 1", price: 28000, intent: "Rent", type: "Apartment", beds: 2, baths: 2, area: 920, furnishing: "Fully furnished", image: hinjewadi, description: "A bright, considered home with an open living space, generous windows and room to settle in. Set in a well-connected corner of Hinjewadi.", amenities: ["Covered parking", "Balcony", "Lift", "Power backup", "Security"], available: "Availability to be confirmed" },
  { slug: "3bhk-apartment-bandra-mumbai-1002", title: "The Bayview Residence", city: "Mumbai", locality: "Bandra West", price: 145000, intent: "Rent", type: "Apartment", beds: 3, baths: 3, area: 1650, furnishing: "Fully furnished", image: bandra, description: "An airy urban retreat with wide windows, soft natural light and space to gather. A calm address in the heart of Bandra.", amenities: ["Covered parking", "Balcony", "Lift", "Security", "Air conditioning"], available: "Availability to be confirmed" },
  { slug: "2bhk-apartment-indiranagar-bengaluru-1003", title: "The Garden Flat", city: "Bengaluru", locality: "Indiranagar", price: 45000, intent: "Rent", type: "Apartment", beds: 2, baths: 2, area: 1100, furnishing: "Semi furnished", image: bengaluru, description: "A peaceful apartment with leafy outlooks, an easy layout and a balcony made for slow mornings.", amenities: ["Balcony", "Lift", "Security", "Power backup"], available: "Availability to be confirmed" },
  { slug: "3bhk-apartment-gachibowli-hyderabad-1004", title: "The Greenline Home", city: "Hyderabad", locality: "Gachibowli", price: 62000, intent: "Rent", type: "Apartment", beds: 3, baths: 3, area: 1480, furnishing: "Fully furnished", image: hyderabad, description: "Warm materials and a generous living room make this a comfortable base for the everyday, close to Gachibowli's workplaces.", amenities: ["Covered parking", "Balcony", "Lift", "Power backup"], available: "Availability to be confirmed" },
  { slug: "4bhk-house-baner-pune-1005", title: "The Banyan House", city: "Pune", locality: "Baner", price: 26500000, intent: "Buy", type: "House", beds: 4, baths: 4, area: 2450, furnishing: "Unfurnished", image: puneHouse, description: "A contemporary independent home shaped around a planted courtyard, with room to grow and space to breathe.", amenities: ["Private garden", "Covered parking", "Terrace", "Study"], available: "Availability to be confirmed" },
  { slug: "2bhk-apartment-adyar-chennai-1006", title: "The Palm Apartment", city: "Chennai", locality: "Adyar", price: 38000, intent: "Rent", type: "Apartment", beds: 2, baths: 2, area: 980, furnishing: "Semi furnished", image: chennai, description: "A light-filled home with a relaxed living space, balcony greenery and a warm, welcoming feel.", amenities: ["Balcony", "Lift", "Security", "Air conditioning"], available: "Availability to be confirmed" },
];

export type SearchFilters = { location?: string | undefined; intent?: string | undefined; type?: string | undefined; budget?: string | undefined };

export function filterProperties(items: Property[], filters: SearchFilters) {
  const location = filters.location?.trim().toLocaleLowerCase() ?? "";
  const maxBudget = Number(filters.budget);
  return items.filter((property) =>
    (!location || `${property.city} ${property.locality} ${property.title}`.toLocaleLowerCase().includes(location)) &&
    (!filters.intent || property.intent === filters.intent) &&
    (!filters.type || property.type === filters.type) &&
    (!filters.budget || !Number.isFinite(maxBudget) || property.price <= maxBudget)
  );
}

export function formatPrice(property: Property) {
  if (property.intent === "Buy") return `₹${(property.price / 10000000).toFixed(2)} Cr`;
  return `₹${property.price.toLocaleString("en-IN")}`;
}