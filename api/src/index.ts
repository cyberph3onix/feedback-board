/**
 * Provides types and utilities for working with anonymous feedback board contracts.
 *
 * @packageDocumentation
 */

import * as FeedbackBoard from '../../contract/src/managed/feedback-board/contract/index.js';

import { type ContractAddress, convertFieldToBytes } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type Logger } from 'pino';
import {
  type FeedbackBoardDerivedState,
  type FeedbackBoardContract,
  type FeedbackBoardProviders,
  type DeployedFeedbackBoardContract,
  type FeedbackEntry,
  feedbackBoardPrivateStateKey,
} from './common-types.js';
import { CompiledFeedbackBoardContractContract } from '../../contract/src/index';
import * as utils from './utils/index.js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { combineLatest, map, tap, from, type Observable } from 'rxjs';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { FeedbackBoardPrivateState, createFeedbackBoardPrivateState } from '../../contract/src/witnesses.js';

/** @internal */

/**
 * An API for a deployed anonymous feedback board.
 */
export interface DeployedFeedbackBoardAPI {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<FeedbackBoardDerivedState>;

  registerAdmin: () => Promise<void>;
  addMember: (memberPk: Uint8Array) => Promise<void>;
  openNewRound: () => Promise<void>;
  submitFeedback: (content: string) => Promise<void>;
}

/**
 * Provides an implementation of {@link DeployedFeedbackBoardAPI} by adapting a deployed
 * anonymous feedback board contract.
 *
 * @remarks
 * The `FeedbackBoardPrivateState` is managed at the DApp level by a private state provider. As
 * such, this private state is shared between all instances of {@link FeedbackBoardAPI}, and their
 * underlying deployed contracts. The private state defines a `'secretKey'` property that
 * effectively identifies the current user, and is used to determine that user's role (admin,
 * member, neither) as the observable contract state changes.
 */
export class FeedbackBoardAPI implements DeployedFeedbackBoardAPI {
  /** @internal */
  private constructor(
    public readonly deployedContract: DeployedFeedbackBoardContract,
    providers: FeedbackBoardProviders,
    private readonly logger?: Logger,
  ) {
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    providers.privateStateProvider.setContractAddress(this.deployedContractAddress);
    this.state$ = combineLatest(
      [
        // Combine public (ledger) state with...
        providers.publicDataProvider.contractStateObservable(this.deployedContractAddress, { type: 'latest' }).pipe(
          map((contractState) => FeedbackBoard.ledger(contractState.data)),
          tap((ledgerState) =>
            logger?.trace({
              ledgerStateChanged: {
                ledgerState: {
                  admin: toHex(ledgerState.admin),
                  round: ledgerState.round,
                  memberCount: ledgerState.members.size(),
                  feedbackCount: ledgerState.feedbacks.size(),
                },
              },
            }),
          ),
        ),
        // ...private state...
        //    since the private state of the feedback board application never changes, we can query
        //    the private state once and always use the same value with `combineLatest`. In
        //    applications where the private state is expected to change, we would need to make this
        //    an `Observable`.
        from(providers.privateStateProvider.get(feedbackBoardPrivateStateKey) as Promise<FeedbackBoardPrivateState>),
      ],
      // ...and combine them to produce the required derived state.
      (ledgerState, privateState) => {
        const secretKey = privateState.secretKey;
        const ownAdminKey = FeedbackBoard.pureCircuits.adminKey(secretKey);
        const ownMemberKey = FeedbackBoard.pureCircuits.memberKey(secretKey);
        const ownNullifier = FeedbackBoard.pureCircuits.nullifierFor(
          secretKey,
          convertFieldToBytes(32, ledgerState.round, 'api/src/index.ts'),
        );

        const feedbacks: FeedbackEntry[] = Array.from(ledgerState.feedbacks, ([id, content]) => ({ id, content })).sort(
          (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
        );

        return {
          admin: ledgerState.admin,
          round: ledgerState.round,
          memberCount: ledgerState.members.size(),
          feedbacks,
          isAdmin: toHex(ledgerState.admin) === toHex(ownAdminKey),
          isMember: ledgerState.members.member(ownMemberKey),
          hasSubmittedThisRound: ledgerState.nullifiers.member(ownNullifier),
          ownMemberKey,
        };
      },
    );
  }

  /**
   * Gets the address of the current deployed contract.
   */
  readonly deployedContractAddress: ContractAddress;

  /**
   * Gets an observable stream of state changes based on the current public (ledger),
   * and private state data.
   */
  readonly state$: Observable<FeedbackBoardDerivedState>;

  /**
   * Attempts to claim the (one-time) admin role for the current user.
   *
   * @remarks
   * This method can fail during local circuit execution if an admin has already registered.
   */
  async registerAdmin(): Promise<void> {
    this.logger?.info('registeringAdmin');

    const txData = await this.deployedContract.callTx.registerAdmin();

    this.logger?.trace({
      transactionAdded: {
        circuit: 'registerAdmin',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  /**
   * Attempts to whitelist a new member by their public key commitment.
   *
   * @param memberPk The prospective member's public key commitment, as returned by
   * {@link FeedbackBoardDerivedState.ownMemberKey} on their own device.
   *
   * @remarks
   * This method can fail during local circuit execution if the current user isn't the registered admin.
   */
  async addMember(memberPk: Uint8Array): Promise<void> {
    this.logger?.info('addingMember');

    const txData = await this.deployedContract.callTx.addMember(memberPk);

    this.logger?.trace({
      transactionAdded: {
        circuit: 'addMember',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  /**
   * Attempts to open a new feedback round, allowing every member to submit feedback again.
   *
   * @remarks
   * This method can fail during local circuit execution if the current user isn't the registered admin.
   */
  async openNewRound(): Promise<void> {
    this.logger?.info('openingNewRound');

    const txData = await this.deployedContract.callTx.openNewRound();

    this.logger?.trace({
      transactionAdded: {
        circuit: 'openNewRound',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  /**
   * Attempts to anonymously submit a new piece of feedback to the board.
   *
   * @param content The feedback text to submit.
   *
   * @remarks
   * This method can fail during local circuit execution if the current user isn't a registered
   * member, or if they have already submitted feedback in the current round.
   */
  async submitFeedback(content: string): Promise<void> {
    this.logger?.info(`submittingFeedback: ${content}`);

    const txData = await this.deployedContract.callTx.submitFeedback(content);

    this.logger?.trace({
      transactionAdded: {
        circuit: 'submitFeedback',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  /**
   * Deploys a new anonymous feedback board contract to the network.
   *
   * @param providers The feedback board providers.
   * @param logger An optional 'pino' logger to use for logging.
   * @returns A `Promise` that resolves with a {@link FeedbackBoardAPI} instance that manages the
   * newly deployed {@link DeployedFeedbackBoardContract}; or rejects with a deployment error.
   */
  static async deploy(providers: FeedbackBoardProviders, logger?: Logger): Promise<FeedbackBoardAPI> {
    logger?.info('deployContract');

    const deployedFeedbackBoardContract = await deployContract(providers, {
      compiledContract: CompiledFeedbackBoardContractContract,
      privateStateId: feedbackBoardPrivateStateKey,
      initialPrivateState: createFeedbackBoardPrivateState(utils.randomBytes(32)),
    });

    logger?.trace({
      contractDeployed: {
        finalizedDeployTxData: deployedFeedbackBoardContract.deployTxData.public,
      },
    });

    return new FeedbackBoardAPI(deployedFeedbackBoardContract, providers, logger);
  }

  /**
   * Finds an already deployed anonymous feedback board contract on the network, and joins it.
   *
   * @param providers The feedback board providers.
   * @param contractAddress The contract address of the deployed feedback board contract to search for and join.
   * @param logger An optional 'pino' logger to use for logging.
   * @returns A `Promise` that resolves with a {@link FeedbackBoardAPI} instance that manages the joined
   * {@link DeployedFeedbackBoardContract}; or rejects with an error.
   */
  static async join(
    providers: FeedbackBoardProviders,
    contractAddress: ContractAddress,
    logger?: Logger,
  ): Promise<FeedbackBoardAPI> {
    logger?.info({
      joinContract: {
        contractAddress,
      },
    });

    const deployedFeedbackBoardContract = await findDeployedContract<FeedbackBoardContract>(providers, {
      contractAddress,
      compiledContract: CompiledFeedbackBoardContractContract,
      privateStateId: feedbackBoardPrivateStateKey,
      initialPrivateState: await FeedbackBoardAPI.getPrivateState(providers, contractAddress),
    });

    logger?.trace({
      contractJoined: {
        finalizedDeployTxData: deployedFeedbackBoardContract.deployTxData.public,
      },
    });

    return new FeedbackBoardAPI(deployedFeedbackBoardContract, providers, logger);
  }

  private static async getPrivateState(
    providers: FeedbackBoardProviders,
    contractAddress: ContractAddress,
  ): Promise<FeedbackBoardPrivateState> {
    providers.privateStateProvider.setContractAddress(contractAddress);
    const existingPrivateState = await providers.privateStateProvider.get(feedbackBoardPrivateStateKey);
    return existingPrivateState ?? createFeedbackBoardPrivateState(utils.randomBytes(32));
  }
}

/**
 * A namespace that represents the exports from the `'utils'` sub-package.
 *
 * @public
 */
export * as utils from './utils/index.js';

export * from './common-types.js';
