/**
 * Anonymous Feedback Board common types and abstractions.
 *
 * @module
 */

import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { FeedbackBoardPrivateState, Contract, Witnesses } from '../../contract/src/index';

export const feedbackBoardPrivateStateKey = 'feedbackBoardPrivateState';
export type PrivateStateId = typeof feedbackBoardPrivateStateKey;

/**
 * The private states consumed throughout the application.
 *
 * @remarks
 * {@link PrivateStates} can be thought of as a type that describes a schema for all
 * private states for all contracts used in the application. Each key represents
 * the type of private state consumed by a particular type of contract.
 * The key is used by the deployed contract when interacting with a private state provider,
 * and the type (i.e., `typeof PrivateStates[K]`) represents the type of private state
 * expected to be returned.
 *
 * Since there is only one contract type for the feedback board example, we only define a
 * single key/type in the schema.
 *
 * @public
 */
export type PrivateStates = {
  /**
   * Key used to provide the private state for {@link FeedbackBoardContract} deployments.
   */
  readonly feedbackBoardPrivateState: FeedbackBoardPrivateState;
};

/**
 * Represents an anonymous feedback board contract and its private state.
 *
 * @public
 */
export type FeedbackBoardContract = Contract<FeedbackBoardPrivateState, Witnesses<FeedbackBoardPrivateState>>;

/**
 * The keys of the circuits exported from {@link FeedbackBoardContract}.
 *
 * @public
 */
export type FeedbackBoardCircuitKeys = Exclude<keyof FeedbackBoardContract['impureCircuits'], number | symbol>;

/**
 * The providers required by {@link FeedbackBoardContract}.
 *
 * @public
 */
export type FeedbackBoardProviders = MidnightProviders<FeedbackBoardCircuitKeys, PrivateStateId, FeedbackBoardPrivateState>;

/**
 * A {@link FeedbackBoardContract} that has been deployed to the network.
 *
 * @public
 */
export type DeployedFeedbackBoardContract = FoundContract<FeedbackBoardContract>;

/**
 * A single, publicly readable, anonymously authored piece of feedback.
 *
 * @public
 */
export type FeedbackEntry = {
  readonly id: bigint;
  readonly content: string;
};

/**
 * A type that represents the derived combination of public (ledger) and private state.
 */
export type FeedbackBoardDerivedState = {
  /** The public key commitment of the registered admin (all-zero if none has registered yet). */
  readonly admin: Uint8Array;
  /** The current feedback round. Only one feedback per member is allowed per round. */
  readonly round: bigint;
  /** The number of members currently whitelisted to submit feedback. */
  readonly memberCount: bigint;
  /** Every piece of feedback submitted so far, oldest first. */
  readonly feedbacks: readonly FeedbackEntry[];

  /**
   * `true` if the current user's secret key corresponds to the registered admin.
   */
  readonly isAdmin: boolean;

  /**
   * `true` if the current user's secret key has been whitelisted as a member.
   */
  readonly isMember: boolean;

  /**
   * `true` if the current user has already submitted feedback in the current round
   * (and so `submitFeedback` would be rejected by the contract).
   *
   * @remarks
   * This is computed locally, without disclosing anything, by deriving the nullifier the
   * user *would* disclose if they submitted now, and checking whether it is already present
   * in the public `nullifiers` set.
   */
  readonly hasSubmittedThisRound: boolean;

  /**
   * The public key commitment the current user would need to be added under, in order to
   * become a member. Handy for a member to hand to the admin out-of-band.
   */
  readonly ownMemberKey: Uint8Array;
};
