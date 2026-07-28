import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";

export * from "./managed/feedback-board/contract/index.js";
export * from "./witnesses";

import * as CompiledFeedbackBoardContract from "./managed/feedback-board/contract/index.js";
import * as Witnesses from "./witnesses";

export const CompiledFeedbackBoardContractContract = CompiledContract.make<
  CompiledFeedbackBoardContract.Contract<Witnesses.FeedbackBoardPrivateState>
>("FeedbackBoard", CompiledFeedbackBoardContract.Contract<Witnesses.FeedbackBoardPrivateState>).pipe(
  CompiledContract.withWitnesses(Witnesses.witnesses),
  CompiledContract.withCompiledFileAssets("./managed/feedback-board"),
);
