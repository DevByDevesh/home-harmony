/** No travel time is shown until a future provider supplies verified route data. */
export type VerifiedCommute = { minutes: number; source: string; verified: true };
export interface CommuteProvider {
  getVerifiedCommute(propertyId: string, destination: string): Promise<VerifiedCommute | null>;
}
export const unavailableCommuteProvider: CommuteProvider = {
  async getVerifiedCommute() { return null; },
};
export function commuteLabel(commute: VerifiedCommute | null | undefined): string {
  return commute?.verified && Number.isFinite(commute.minutes) && commute.minutes >= 0 && commute.source
    ? `${Math.round(commute.minutes)} min` : "Not available";
}