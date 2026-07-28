import { FeedbackBoardSimulator } from "./feedback-board-simulator.js";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { describe, it, expect } from "vitest";
import { randomBytes } from "./utils.js";

setNetworkId("undeployed");

const ZERO_KEY = new Uint8Array(32);

describe("Anonymous Feedback Board smart contract", () => {
  it("generates initial ledger state deterministically", () => {
    const key = randomBytes(32);
    const simulator0 = new FeedbackBoardSimulator(key);
    const simulator1 = new FeedbackBoardSimulator(key);
    const ledger0 = simulator0.getLedger();
    const ledger1 = simulator1.getLedger();
    // The Set/Map ledger fields are opaque authenticated-structure wrappers, not plain
    // objects, so we compare their scalar fields and collection contents rather than the
    // whole object via `toEqual`.
    expect(ledger0.admin).toEqual(ledger1.admin);
    expect(ledger0.round).toEqual(ledger1.round);
    expect(ledger0.nextId).toEqual(ledger1.nextId);
    expect(ledger0.members.isEmpty()).toEqual(ledger1.members.isEmpty());
    expect(ledger0.feedbacks.isEmpty()).toEqual(ledger1.feedbacks.isEmpty());
    expect(ledger0.nullifiers.isEmpty()).toEqual(ledger1.nullifiers.isEmpty());
  });

  it("properly initializes ledger state and private state", () => {
    const key = randomBytes(32);
    const simulator = new FeedbackBoardSimulator(key);
    const initialLedgerState = simulator.getLedger();
    expect(initialLedgerState.admin).toEqual(ZERO_KEY);
    expect(initialLedgerState.round).toEqual(1n);
    expect(initialLedgerState.nextId).toEqual(0n);
    expect(initialLedgerState.members.isEmpty()).toEqual(true);
    expect(initialLedgerState.feedbacks.isEmpty()).toEqual(true);
    expect(initialLedgerState.nullifiers.isEmpty()).toEqual(true);
    const initialPrivateState = simulator.getPrivateState();
    expect(initialPrivateState).toEqual({ secretKey: key });
  });

  it("lets the first caller register as admin", () => {
    const simulator = new FeedbackBoardSimulator(randomBytes(32));
    const adminKey = simulator.adminKey();
    const ledgerState = simulator.registerAdmin();
    expect(ledgerState.admin).toEqual(adminKey);
  });

  it("doesn't let a second user register as admin", () => {
    const simulator = new FeedbackBoardSimulator(randomBytes(32));
    simulator.registerAdmin();
    simulator.switchUser(randomBytes(32));
    expect(() => simulator.registerAdmin()).toThrow(
      "failed assert: Admin has already been registered",
    );
  });

  it("lets the admin add a member", () => {
    const adminSecretKey = randomBytes(32);
    const simulator = new FeedbackBoardSimulator(adminSecretKey);
    simulator.registerAdmin();

    const memberSecretKey = randomBytes(32);
    simulator.switchUser(memberSecretKey);
    const memberKey = simulator.memberKey();

    simulator.switchUser(adminSecretKey);
    const ledgerState = simulator.addMember(memberKey);
    expect(ledgerState.members.member(memberKey)).toEqual(true);
    expect(ledgerState.members.size()).toEqual(1n);
  });

  it("doesn't let a non-admin add a member", () => {
    const simulator = new FeedbackBoardSimulator(randomBytes(32));
    simulator.registerAdmin();
    simulator.switchUser(randomBytes(32));
    const someKey = simulator.memberKey();
    expect(() => simulator.addMember(someKey)).toThrow(
      "failed assert: Only the admin can add members",
    );
  });

  it("lets a registered member submit feedback", () => {
    const adminSecretKey = randomBytes(32);
    const simulator = new FeedbackBoardSimulator(adminSecretKey);
    simulator.registerAdmin();

    const memberSecretKey = randomBytes(32);
    simulator.switchUser(memberSecretKey);
    const memberKey = simulator.memberKey();

    simulator.switchUser(adminSecretKey);
    simulator.addMember(memberKey);

    simulator.switchUser(memberSecretKey);
    const ledgerState = simulator.submitFeedback(
      "Great product, could use dark mode.",
    );
    expect(ledgerState.feedbacks.size()).toEqual(1n);
    expect(ledgerState.feedbacks.lookup(0n)).toEqual(
      "Great product, could use dark mode.",
    );
    expect(ledgerState.nextId).toEqual(1n);
  });

  it("doesn't let a non-member submit feedback", () => {
    const simulator = new FeedbackBoardSimulator(randomBytes(32));
    simulator.registerAdmin();
    expect(() => simulator.submitFeedback("I should not be allowed")).toThrow(
      "failed assert: Only registered members may submit feedback",
    );
  });

  it("doesn't let the same member submit feedback twice in one round", () => {
    const adminSecretKey = randomBytes(32);
    const simulator = new FeedbackBoardSimulator(adminSecretKey);
    simulator.registerAdmin();

    const memberSecretKey = randomBytes(32);
    simulator.switchUser(memberSecretKey);
    const memberKey = simulator.memberKey();

    simulator.switchUser(adminSecretKey);
    simulator.addMember(memberKey);

    simulator.switchUser(memberSecretKey);
    simulator.submitFeedback("First piece of feedback.");
    expect(() => simulator.submitFeedback("Trying to post again.")).toThrow(
      "failed assert: This member has already submitted feedback for the current round",
    );
  });

  it("lets a member submit again once the admin opens a new round", () => {
    const adminSecretKey = randomBytes(32);
    const simulator = new FeedbackBoardSimulator(adminSecretKey);
    simulator.registerAdmin();

    const memberSecretKey = randomBytes(32);
    simulator.switchUser(memberSecretKey);
    const memberKey = simulator.memberKey();

    simulator.switchUser(adminSecretKey);
    simulator.addMember(memberKey);

    simulator.switchUser(memberSecretKey);
    simulator.submitFeedback("Round one feedback.");

    simulator.switchUser(adminSecretKey);
    const ledgerAfterNewRound = simulator.openNewRound();
    expect(ledgerAfterNewRound.round).toEqual(2n);

    simulator.switchUser(memberSecretKey);
    const ledgerState = simulator.submitFeedback("Round two feedback.");
    expect(ledgerState.feedbacks.size()).toEqual(2n);
  });

  it("doesn't let a non-admin open a new round", () => {
    const simulator = new FeedbackBoardSimulator(randomBytes(32));
    simulator.registerAdmin();
    simulator.switchUser(randomBytes(32));
    expect(() => simulator.openNewRound()).toThrow(
      "failed assert: Only the admin can open a new round",
    );
  });
});
