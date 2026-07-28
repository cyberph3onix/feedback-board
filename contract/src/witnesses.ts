/*
 * This file defines the shape of the feedback board's private state, as well
 * as the single witness function that accesses it.
 */

import { Ledger } from "./managed/feedback-board/contract/index.js";
import { WitnessContext } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";

/* **********************************************************************
 * The only hidden state needed by the feedback board contract is the
 * user's secret key. It doubles as an admin key or a member key
 * depending on which role the caller has registered for.
 */

export type FeedbackBoardPrivateState = {
  readonly secretKey: Uint8Array;
};

export const createFeedbackBoardPrivateState = (secretKey: Uint8Array) => ({
  secretKey,
});

/* **********************************************************************
 * The witnesses object for the feedback board contract is an object
 * with a field for each witness function, mapping the name of the
 * function to its implementation.
 *
 * The implementation of each function always takes as its first argument
 * a value of type WitnessContext<L, PS>, where L is the ledger object type
 * that corresponds to the ledger declaration in the Compact code, and PS
 * is the private state type, like FeedbackBoardPrivateState defined above.
 *
 * The localSecretKey witness does not need the ledger or contractAddress
 * from the WitnessContext, so it uses the parameter notation that puts
 * only the binding for the privateState in scope.
 */
export const witnesses = {
  localSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, FeedbackBoardPrivateState>): [
    FeedbackBoardPrivateState,
    Uint8Array,
  ] => [privateState, privateState.secretKey],
};
