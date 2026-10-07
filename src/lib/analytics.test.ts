import test from "node:test";
import assert from "node:assert/strict";
import { ownerAnalyticsMetrics } from "./analytics.ts";

test("Owner analytics returns requested live metrics and approval rate", () => {
  const m = ownerAnalyticsMetrics({
    users: { USER: 8, ADMIN: 2, ACTIVE: 7, SUSPENDED: 3 },
    properties: { ACTIVE: 5, UNDER_REVIEW: 2, REJECTED: 1, EXPIRED: 1, SUSPENDED: 1 },
    enquiries: 12, visits: 9, messages: 20, newUsers: 4, newListings: 3, approvedListings: 8, rejectedListings: 2,
  });
  assert.equal(m.totalUsers, 10);
  assert.equal(m.activeUsers, 7);
  assert.equal(m.bannedUsers, 3);
  assert.equal(m.totalListings, 10);
  assert.equal(m.activeListings, 5);
  assert.equal(m.pendingListings, 2);
  assert.equal(m.rejectedListings, 1);
  assert.equal(m.expiredListings, 1);
  assert.equal(m.suspendedListings, 1);
  assert.equal(m.totalEnquiries, 12);
  assert.equal(m.totalVisits, 9);
  assert.equal(m.totalMessages, 20);
  assert.equal(m.newUsers, 4);
  assert.equal(m.newListings, 3);
  assert.equal(m.listingApprovalRate, "80.0%");
});

test("Owner listing approval rate is undefined when there are no decided listings", () => {
  assert.equal(ownerAnalyticsMetrics({
    users: {}, properties: {}, enquiries: 0, visits: 0, messages: 0, newUsers: 0, newListings: 0, approvedListings: 0, rejectedListings: 0,
  }).listingApprovalRate, "—");
});
