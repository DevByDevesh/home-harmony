import { parseQuery, type ParsedSearch } from "./nl-parser";
import { writeListing, type ListingContent, type ListingFacts } from "./listing-assistant";
import { explainMatch, type MatchResult } from "../match";

/**
 * AI provider seam. Business logic calls getAIProvider() and never a vendor SDK directly.
 * A real LLM provider must run on the server (API keys stay server-side) and return these same
 * shapes, so the parser output still flows into the existing filter engine.
 */
export interface AIProvider {
  id: string;
  /** User-facing name. Must say "preview"/"local" when no real model is connected. */
  label: string;
  isDemo: boolean;
  generateSearchParameters(query: string): Promise<ParsedSearch>;
  generateListingContent(facts: ListingFacts, variant: number): Promise<ListingContent>;
  generateMatchExplanation(result: MatchResult): Promise<string>;
}

const pause = () => new Promise(r => setTimeout(r, 280)); // brief, honest "processing" beat for the UI

/** Deterministic, on-device rules. No model, no network, no keys. */
export const localRulesProvider: AIProvider = {
  id: "local-rules",
  label: "Smart Search preview · local rules, no AI model connected",
  isDemo: true,
  async generateSearchParameters(query) { await pause(); return parseQuery(query); },
  async generateListingContent(facts, variant) { await pause(); return writeListing(facts, variant); },
  async generateMatchExplanation(result) { return explainMatch(result); },
};

export function getAIProvider(): AIProvider {
  // Future: return a server-backed provider when one is configured.
  return localRulesProvider;
}
