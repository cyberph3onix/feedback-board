import {
  type CircuitContext,
  QueryContext,
  sampleContractAddress,
  createConstructorContext,
  CostModel,
} from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  type Ledger,
  ledger,
} from "../managed/feedback-board/contract/index.js";
import { type FeedbackBoardPrivateState, witnesses } from "../witnesses.js";

/**
 * Serves as a testbed to exercise the contract in tests
 */
export class FeedbackBoardSimulator {
  readonly contract: Contract<FeedbackBoardPrivateState>;
  circuitContext: CircuitContext<FeedbackBoardPrivateState>;

  constructor(secretKey: Uint8Array) {
    this.contract = new Contract<FeedbackBoardPrivateState>(witnesses);
    const {
      currentPrivateState,
      currentContractState,
      currentZswapLocalState,
    } = this.contract.initialState(
      createConstructorContext({ secretKey }, "0".repeat(64)),
    );
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(
        currentContractState.data,
        sampleContractAddress(),
      ),
    };
  }

  /***
   * Switch to a different secret key for a different user
   */
  public switchUser(secretKey: Uint8Array) {
    this.circuitContext.currentPrivateState = {
      secretKey,
    };
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public getPrivateState(): FeedbackBoardPrivateState {
    return this.circuitContext.currentPrivateState;
  }

  public registerAdmin(): Ledger {
    this.circuitContext = this.contract.impureCircuits.registerAdmin(
      this.circuitContext,
    ).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public addMember(memberPk: Uint8Array): Ledger {
    this.circuitContext = this.contract.impureCircuits.addMember(
      this.circuitContext,
      memberPk,
    ).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public openNewRound(): Ledger {
    this.circuitContext = this.contract.impureCircuits.openNewRound(
      this.circuitContext,
    ).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public submitFeedback(content: string): Ledger {
    this.circuitContext = this.contract.impureCircuits.submitFeedback(
      this.circuitContext,
      content,
    ).context;
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  public adminKey(): Uint8Array {
    return this.contract.circuits.adminKey(
      this.circuitContext,
      this.getPrivateState().secretKey,
    ).result;
  }

  public memberKey(): Uint8Array {
    return this.contract.circuits.memberKey(
      this.circuitContext,
      this.getPrivateState().secretKey,
    ).result;
  }
}
