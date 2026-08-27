/**
 * The explicit-approval enforcement mechanism. See
 * spec/05-technical-spec.md §14 and spec/03-agent-spec.md §8.
 *
 * `tools/createBooking.ts` requires a valid ApprovalToken as a
 * parameter — constructible only here. TypeScript can't fabricate one
 * from outside this module (the branded field can't be faked without
 * `as any`), which is enforcement above the UI layer, not just a
 * checked checkbox: `issueApprovalToken` must only ever be called in
 * direct response to the user's explicit confirmation action (e.g.
 * the "Confirm Booking" button's onClick), never speculatively.
 */

export interface ApprovalToken {
  readonly __brand: 'ApprovalToken';
  readonly scopeId: string;
}

/**
 * Issues a token scoped to one specific booking-worthy thing (a
 * train/date/class combination for Smart Search, later a
 * TatkalPreparation id for Tatkal). Call this only inside the
 * handler for an explicit user confirmation action.
 */
export function issueApprovalToken(scopeId: string): ApprovalToken {
  return { __brand: 'ApprovalToken', scopeId };
}
