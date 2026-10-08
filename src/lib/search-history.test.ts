import test from "node:test";
import assert from "node:assert/strict";
import { buildSearchSuggestions, pushRecentSearch } from "./search-history.ts";

test("search suggestions combine matching locations and recent searches without duplicates", () => {
  const result = buildSearchSuggestions("pun", ["Pune", "Mumbai", "Pune"], ["Pune", "Pimpri-Chinchwad", "Mumbai"]);
  assert.deepEqual(result, ["Pune"]);
});

test("recent searches are newest-first and capped", () => {
  assert.deepEqual(pushRecentSearch(["Pune", "Mumbai"], "Mumbai", 3), ["Mumbai", "Pune"]);
  assert.deepEqual(pushRecentSearch(["A", "B", "C"], "D", 3), ["D", "A", "B"]);
});
