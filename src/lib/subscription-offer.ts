export type FreeOfferState = {
  claimed: boolean;
  showClaim: boolean;
  badge: boolean;
};

export function getFreeOfferState(claimed: boolean): FreeOfferState {
  return {
    claimed,
    showClaim: !claimed,
    badge: claimed,
  };
}
