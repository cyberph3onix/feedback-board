# Anonymous Feedback Board

A Midnight smart contract DApp where registered members submit feedback to a public board without ever revealing which member wrote which entry.

[![Generic badge](https://img.shields.io/badge/Compact%20language-0.23-1abc9c.svg)](https://shields.io/)
[![Generic badge](https://img.shields.io/badge/TypeScript-5.9.3-blue.svg)](https://shields.io/)

> Submitted to the Midnight Builder Challenge (Rise In), Level 1.

## Contract Address

**This section is mandatory — fill it in immediately after you deploy.**

| Network | Contract Address |
|---------|------------------|
| Preprod | `<YOUR_DEPLOYED_CONTRACT_ADDRESS>` |

```env
CONTRACT_ADDRESS=<YOUR_DEPLOYED_CONTRACT_ADDRESS>
```

The same placeholder also appears in [`feedback-board-ui/.env.preprod`](feedback-board-ui/.env.preprod) and [`feedback-board-ui/.env.preview`](feedback-board-ui/.env.preview) as `VITE_CONTRACT_ADDRESS` — replace it there too and the web UI will auto-join that contract on load instead of requiring a manual "Join" click.

## Features

- **Anonymous, admin-gated membership.** The first caller to register becomes the admin; the admin whitelists members by a public key commitment handed to them out-of-band (never a real name, email, or wallet identity).
- **Anonymous feedback submission.** Registered members submit free-text feedback that is appended to a public, readable feed — but the contract never records or discloses which member wrote which entry.
- **One submission per member per round.** A zero-knowledge nullifier stops a member submitting twice in the same round, without revealing who submitted.
- **Round-based resets.** The admin can open a new round at any time, letting every member submit fresh feedback again.
- **Full-stack, ready to run.** Compact contract, a shared TypeScript API, an interactive CLI, and a React + Lace-wallet web UI — all wired together end-to-end.

## What This Project Does

Think of it as a whistleblower-style suggestion box for a team, club, or DAO. An admin sets up the board and approves a list of members. From then on, any approved member can post feedback that everyone can read — but nobody, not even the admin, can determine who posted which piece of feedback. The only thing enforced is that each member gets exactly one voice per round, so the same person can't flood the board while still remaining anonymous.

## Privacy Model

**Public (visible to anyone reading the ledger):**
- `admin` — a one-way hash commitment to the admin's secret key (not the key itself).
- `members` — one-way hash commitments to each registered member's secret key.
- `round` / `nextId` — the current feedback round, and the id the next feedback entry will get.
- `feedbacks` — the full public feed of feedback entries, keyed by id.
- `nullifiers` — spent one-time tokens that stop a member posting twice in a round.

**Private (never leaves the caller's device):**
- `localSecretKey` — a witness supplying the caller's personal secret key. It is used inside the zero-knowledge circuit to prove "I am the admin" or "I am a registered member" without ever putting the key itself on-chain.

**What members prove without revealing:**
- That they are a registered member of the board — proven in zero-knowledge from their secret key — **without revealing which member they are**.
- That they haven't already submitted feedback this round — proven via a nullifier derived from their secret key and the current round — **without revealing who they are**.

**An honest caveat:** proving Set membership in zero-knowledge requires disclosing the value being checked, so each `submitFeedback` call discloses a one-way hash of the caller's secret key (their "member key"). This never reveals the secret key or the caller's real-world identity, but it does mean a given member's own posts are linkable to each other via that repeated pseudonym. Real-world identity is never collected by the contract in the first place, so this is a pseudonymity, not full unlinkability, guarantee — see the comments in [`feedback-board.compact`](contract/src/feedback-board.compact) for the full reasoning.

## Tech Stack

- **Compact** — Midnight's smart contract language (`contract/src/feedback-board.compact`)
- **TypeScript** — shared API, CLI, and UI logic
- **React + MUI + Vite** — the web UI (`feedback-board-ui/`)
- **Node.js CLI** (readline-based) — the terminal client (`feedback-board-cli/`)
- **Midnight.js SDK** (`@midnight-ntwrk/midnight-js-*`) — providers for the wallet, proof server, and indexer
- **Vitest** — contract unit tests via an in-memory circuit simulator
- **Docker** — runs the local proof server

## Folder Structure

```
feedback-board/
├── contract/                  # Smart contract in Compact
│   └── src/
│       ├── feedback-board.compact   # The contract itself
│       ├── witnesses.ts             # Private state & witness implementation
│       ├── index.ts                 # Compiled contract + witness bindings
│       └── test/                    # Vitest tests using a circuit simulator
├── api/                        # Shared types & DeployedFeedbackBoardAPI used by CLI and UI
│   └── src/
├── feedback-board-cli/         # Interactive terminal client
│   └── src/
│       ├── index.ts                 # Main menu / driver
│       ├── config.ts                # Network configs (standalone/preview/preprod)
│       └── launcher/                # Entry points per network
└── feedback-board-ui/          # React web UI (Lace wallet integration)
    └── src/
        ├── components/               # Board UI, dialogs, layout
        ├── contexts/                 # Wallet connector + deployment manager
        └── hooks/
```

## Prerequisites

- **Node.js v22+** (checked: `v22.23.1`)
- **Docker**, running, for the local proof server
- The **Compact compiler** (`compact --version` should print a version number)
- A **Midnight Lace wallet** browser extension, if you plan to use the web UI
- Testnet funds from the [Preprod faucet](https://midnight-tmnight-preprod.nethermind.dev/) for the account you deploy from (funding takes 2-3 minutes)

## Installation

```bash
npm install

cd api && npm install && cd ..
cd contract && npm install && cd ..
cd feedback-board-cli && npm install && cd ..
cd feedback-board-ui && npm install && cd ..
```

## Build

```bash
npm run build
```

This builds, in order: `contract` → `api` → `feedback-board-cli` → `feedback-board-ui`.

## Compile

Compiles the Compact contract into `contract/src/managed/feedback-board/` (circuits, keys, zkir, and the generated TypeScript bindings):

```bash
npm run compact
```

Run the local proof server before doing anything that generates a proof (deploying, or calling a circuit):

```bash
docker run -p 6300:6300 midnightnetwork/proof-server
```

## Manual Deployment

Deployment is **intentionally not automated** in this repo — it's the one step you do yourself. This scaffold deploys interactively through the CLI rather than a single non-interactive script:

```bash
cd feedback-board-cli
npm run preprod-remote
```

Then follow the prompts:
1. Build a fresh wallet (or restore one from a seed), and fund it from the [Preprod faucet](https://midnight-tmnight-preprod.nethermind.dev/) using the address it prints (wait ~2-3 minutes for funds to arrive).
2. From the main menu, choose **"Deploy a new feedback board contract"**.
3. Copy the **contract address** printed after deployment.
4. From the same menu, choose **"Register as the admin"** so you can start whitelisting members.

## After Deployment

Once deployed, the only remaining manual steps are:

1. Deploy the Compact contract (above).
2. Copy the deployed contract address.
3. Replace every occurrence of `<YOUR_DEPLOYED_CONTRACT_ADDRESS>` — in this README, and in `feedback-board-ui/.env.preprod` / `feedback-board-ui/.env.preview` (as `VITE_CONTRACT_ADDRESS`).

No additional coding is required — the web UI reads `VITE_CONTRACT_ADDRESS` at startup and automatically joins that contract instead of requiring a manual "Join" click.

## Environment Variables

`feedback-board-ui/.env.preprod` and `feedback-board-ui/.env.preview`:

| Variable | Purpose |
|---|---|
| `VITE_NETWORK_ID` | Midnight network id (`preprod` or `preview`) |
| `VITE_LOGGING_LEVEL` | `pino` log level for the browser console |
| `VITE_CONTRACT_ADDRESS` | Deployed contract address to auto-join on load; leave as `<YOUR_DEPLOYED_CONTRACT_ADDRESS>` to require a manual "Join" instead |

`feedback-board-cli` takes no contract-address environment variable — it always prompts interactively for "deploy new" vs. "join existing" (and for the address, if joining).

## Screenshots

_Add screenshots of the CLI menu and/or the web UI here._

## Initial Idea

_Add your own notes here on how you arrived at this idea, or any variations you considered._

## Troubleshooting

- **`compact: command not found`** — install the Compact compiler and make sure it's on your `PATH`.
- **Proof generation hangs or fails** — make sure the proof server container is running (`docker ps`) and reachable at `localhost:6300`.
- **"No funds received, exiting..." in the CLI** — your wallet seed hasn't received testnet funds yet; check the [Preprod faucet](https://midnight-tmnight-preprod.nethermind.dev/) and wait a few minutes, then retry.
- **`npm install` prints an `EBADENGINE` warning about Node `>=24.11.1`** — this scaffold's `package.json` declares that engine requirement, but everything here was built and tested against Node v22.23.1; the warning is safe to ignore.
- **Lace wallet not detected in the web UI** — make sure the Midnight Lace extension is installed and enabled, and that you're on `http://localhost` (not opening `index.html` directly from disk).
- **"Only registered members may submit feedback"** — you (or the account you're testing with) haven't been added via "Add a member" / the admin panel yet. Copy your member key (shown in the derived-state view / UI) and hand it to whoever holds the admin role.
