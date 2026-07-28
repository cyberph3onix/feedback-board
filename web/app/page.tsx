import Link from "next/link";

const features = [
  {
    title: "Anonymous Membership",
    desc: "Admin-gated via zero-knowledge proofs — no real names, emails, or wallet identities.",
  },
  {
    title: "Private Feedback",
    desc: "Submit free-text entries that are publicly readable but never linked to you.",
  },
  {
    title: "One Per Round",
    desc: "ZK nullifiers prevent double-submission without revealing who submitted.",
  },
  {
    title: "Round Management",
    desc: "Admins open new rounds, resetting submission privileges for all members.",
  },
  {
    title: "Full-Stack",
    desc: "Compact contract, TypeScript API, interactive CLI, and React+Lace web UI.",
  },
  {
    title: "Zero-Knowledge",
    desc: "Prove membership without revealing which member you are — pseudonymity by design.",
  },
];

export default function Home() {
  return (
    <main
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "4rem 1.5rem",
      }}
    >
      <header style={{ marginBottom: "3rem" }}>
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: 700,
            marginBottom: "0.5rem",
          }}
        >
          Anonymous Feedback Board
        </h1>
        <p
          style={{
            fontSize: "1.125rem",
            color: "var(--color-text-muted)",
            maxWidth: 640,
          }}
        >
          A Midnight smart contract DApp where registered members submit feedback
          to a public board — without ever revealing who wrote what.
        </p>
        <span
          style={{
            display: "inline-block",
            marginTop: "0.75rem",
            background: "var(--color-accent)",
            color: "#000",
            padding: "0.25rem 0.75rem",
            borderRadius: 999,
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Midnight Builder Challenge &middot; Level 1
        </span>
      </header>

      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
          How It Works
        </h2>
        <p style={{ color: "var(--color-text-muted)", marginBottom: "1rem" }}>
          A whistleblower-style suggestion box for teams, clubs, or DAOs. An
          admin sets up the board and approves members. Approved members can
          post feedback that everyone reads — but nobody, not even the admin,
          can determine who posted what.
        </p>
      </section>

      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Features</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1rem",
          }}
        >
          {features.map((f) => (
            <article
              key={f.title}
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                padding: "1.25rem",
              }}
            >
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--color-text-muted)",
                }}
              >
                {f.desc}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
          Tech Stack
        </h2>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          {[
            "Compact",
            "TypeScript",
            "React",
            "MUI",
            "Vite",
            "Midnight.js",
            "Docker",
            "Vitest",
          ].map((tech) => (
            <span
              key={tech}
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 4,
                padding: "0.25rem 0.75rem",
                fontSize: "0.8125rem",
              }}
            >
              {tech}
            </span>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
          Quick Start
        </h2>
        <pre>
          <code>{`git clone <repo-url>
cd feedback-board
npm install
cd api && npm install && cd ..
cd contract && npm install && cd ..
cd feedback-board-cli && npm install && cd ..
cd feedback-board-ui && npm install && cd ..
npm run build`}</code>
        </pre>
      </section>

      <footer
        style={{
          borderTop: "1px solid var(--color-border)",
          paddingTop: "2rem",
          fontSize: "0.8125rem",
          color: "var(--color-text-muted)",
        }}
      >
        <p>
          Built for the{" "}
          <Link href="https://midnightbuilders.io/" target="_blank">
            Midnight Builder Challenge
          </Link>
          . Licensed under Apache-2.0.
        </p>
      </footer>
    </main>
  );
}
