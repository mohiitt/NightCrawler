# 🚀 MASTER HANDOFF BRIEF & TECHNICAL PLAN: Project NIGHTCRAWLER

**Objective:** Provide complete, end-to-end context for building the MVP of "NIGHTCRAWLER" during a 1-day hackathon. This document serves as the ultimate blueprint, containing both the conceptual narrative and the exact technical implementation steps.

---

## PART 1: The Concept & Demo Narrative

### 1. Project Core Identity
*   **Name:** NIGHTCRAWLER (The Autonomous OSINT & Alpha Broker)
*   **Theme/Track:** "Context Engineering Challenge" (Requires agents that act on the open web, use ground truth, publish to `cited.md`, and transact via agent payment rails using 3+ sponsors).
*   **Target Prize Pool:** ~$8,500 across Guild.ai, OpenUI, Airbyte, ClickHouse/Langfuse, and Composio.
*   **The Pitch:** "Data is public. Intelligence is proprietary. NIGHTCRAWLER reads the open web, connects the dots, mathematically corroborates the evidence, and sells the future to other agents."

### 2. Solving the "Magic Leap" (How we answer the Judges)
Judges will ask: *"How do we know the agent isn't just making a wild guess based on a coincidence?"*

We answer this by showing that NIGHTCRAWLER is not an ETL pipeline; it is a true autonomous agent. It does not just jump to conclusions; it actively seeks corroboration. If it detects an anomaly (e.g., a CEO's flight), it autonomously triggers a secondary validation loop:

*   **Hypothesize:** "Is this flight an indicator of an export ban?"
*   **Validate:** The agent autonomously queries ClickHouse for independent vectors of proof: "Check recent US Commerce Dept RFIs. Check options trading volume for $NVDA. Check Chinese state media sentiment."
*   **Synthesize:** Only when multiple independent data streams converge does it generate a high-confidence signal. We use **Langfuse** to show the judges the exact trace of the agent cross-referencing these secondary sources, proving it is performing rigorous intelligence analysis, not guessing.

### 3. End-to-End MVP Features & Architecture
*   **[Ingest] Airbyte:** Pulls open-web data feeds: FAA flight logs, US Commerce Dept filings, and early options trading volume.
*   **[Storage] ClickHouse:** Airbyte dumps data here. The agent runs sub-second OLAP SQL queries to connect the massive datasets.
*   **[Agent & Governance] Guild.ai:** The agent pauses execution until a human clicks "Approve." We must control the liability of an AI publishing financial intelligence.
*   **[Forensics] Langfuse:** Traces the LLM's logic and SQL queries, proving to the judges how the agent corroborated its findings.
*   **[Visualization] OpenUI (Thesys):** The agent streams OpenUI Lang DSL to render a dynamic "Conspiracy Board" (Node/Edge graph) showing the physical flights linking to financial metrics.
*   **[Execution] Composio:** Autonomously publishes the ground-truth sources to `cited.md`.
*   **[Economy] CDP (Coinbase Developer Platform) / 402:** The actual "Alpha" payload (the semiconductor short/long signal) is locked behind a smart contract. A mock trading agent transfers 50 testnet USDC to decrypt the signal.

### 4. The Exact Demo Flow (3 Minutes)
This is the exact geopolitical narrative we are simulating:

**Act 1: The Vacuum (0:00 - 0:45)**
*   **Action:** Show Airbyte syncing records to ClickHouse.
*   **Script:** *"Humans are too slow to connect the dots on the open web. NIGHTCRAWLER is an intelligence broker that ingests live flight logs, government filings, and options volume into ClickHouse to find hidden correlations."*

**Act 2: The Discovery & Validation Loop (0:45 - 1:30)**
*   **Action:** Run the Nightcrawler Agent. The OpenUI Conspiracy Board begins streaming on screen.
*   **The OSINT Logic (What the judges see):**
    *   *Node 1 (News):* "President Trump lands in Beijing for General Trade Summit."
    *   *Node 2 (Flight Anomaly):* The agent tracks CEO jets. Tim Cook (Apple) and Pat Gelsinger (Intel) landed in Beijing. Jensen Huang (Nvidia) stayed home.
    *   *Node 3 (The Validation Loop):* **[THIS ANSWERS THE JUDGES]** The agent doesn't just guess. It spawns two validation queries:
        *   *Query A:* Are there recent US Commerce Dept filings regarding AI chips? (Yes, found an obscure RFI).
        *   *Query B:* Is there unexplained Put (Short) volume on $NVDA in the last 2 hours? (Yes).
*   **Script:** *"Watch the OpenUI streaming canvas. It found a flight anomaly—Intel went to Beijing, Nvidia stayed home. But instead of jumping to a 'magic leap' conclusion, the agent autonomously sought secondary validation. It found corresponding obscure Commerce Dept filings and anomalous options volume. Because three independent data vectors converged, it synthesized a high-confidence signal: An unannounced AI-chip export ban is being negotiated."*

**Act 3: The Liability Vault (1:30 - 2:15)**
*   **Action:** Switch to Guild.ai. Show the pending approval and Langfuse trace. Click "Approve".
*   **Script:** *"Publishing market-moving data is a massive legal liability. It hits a Guild.ai Approval Gate. We check the Langfuse trace to verify it didn't hallucinate and relied strictly on public data (Mosaic Theory). We authorize publication."*

**Act 4: The A2A Economy (2:15 - 3:00)**
*   **Action:** Show `cited.md` updating via Composio. Run `node mock_buyer.js`. Show the CDP transaction unlocking the payload.
*   **Script:** *"Composio publishes the undeniable public sources to `cited.md`. The actual Alpha—SHORT NVDA, LONG INTC—is put behind a CDP crypto paywall. A trading bot evaluates the proof, sends 50 USDC, and unlocks the trade. NIGHTCRAWLER just earned money while we watched."*

---

## PART 2: Technical Implementation Plan

This is the definitive technical blueprint to build the NIGHTCRAWLER MVP in 1 day. It is structured for **3 teammates working in parallel**.

### 🔑 Prerequisites & Dependencies (Get these NOW)
Share these API keys in a `.env.local` file:
1.  **Guild.ai:** API Key + Organization ID.
2.  **OpenUI (Thesys):** API Key / SDK access.
3.  **Langfuse:** API Key + Public Key.
4.  **Composio:** API Key.
5.  **CDP (Coinbase):** API Key + Testnet Wallet Private Key (Base Sepolia network).
6.  **ClickHouse:** Free tier Cloud URL + Password (or SQLite for speed).
7.  **LLM:** OpenAI (`OPENAI_API_KEY`) or Anthropic (`ANTHROPIC_API_KEY`).

### 👥 Division of Labor (3 Parallel Tracks)

**🧑‍💻 Teammate A: Data & Analytics Engine (The Backend)**
*   **Setup Database:** Spin up ClickHouse (or SQLite). 
*   **The "Trump/China" Mock Data Script:** Write a Node.js script (`seed_db.js`) that populates the database with 1,000 rows of noise, but crucially inserts the "Golden Path" anomaly data (Intel/Apple flights, Nvidia staying home, NVDA put options, Commerce Dept RFI).

**🧑‍💻 Teammate B: The Agent & Governance (The Brain)**
*   **Agent Initialization:** Use the Guild.ai Agent SDK and Langfuse tracing.
*   **SQL Tooling:** Give the agent a tool: `execute_sql(query: string)` to query Teammate A's database.
*   **The Validation Loop Prompt:** Instruct the agent to query flights, then validate via news/options, and output OpenUI Lang DSL.
*   **Guild.ai Approval Gate:** Implement `guild.requestApproval()` to pause execution.
*   **Publish via Composio:** Once approved, trigger a Composio action to append sources to `cited.md`.

**🧑‍💻 Teammate C: Visualization & Economy (Frontend & Web3)**
*   **Next.js Setup:** Initialize a Next.js App Router project.
*   **OpenUI Integration:** Implement the streaming renderer for the `<ConspiracyBoard>` graph.
*   **The CDP Transaction Script:** Write `buyer_bot.js` using `@coinbase/coinbase-sdk` to transfer 50 testnet USDC.

### 📊 Database Schema (For Teammate A)
Use this exact schema so the LLM can query it easily:
```sql
CREATE TABLE flights (
    id UUID, tail_number VARCHAR, owner_entity VARCHAR, destination VARCHAR, timestamp DATETIME
);
CREATE TABLE news_and_filings (
    id UUID, source VARCHAR, headline VARCHAR, content TEXT, timestamp DATETIME
);
CREATE TABLE market_anomalies (
    id UUID, ticker VARCHAR, anomaly_type VARCHAR, severity INT, timestamp DATETIME
);
```

---

## ⚡ AI Fast-Track Prompts (Copy-Paste into Cursor/Claude)
Since you are using top-tier AI models to code, copy and paste these exact prompts to generate your modules instantly.

**Teammate A (Data/ClickHouse) Prompt:**
> "Write a Node.js script that connects to a ClickHouse database using `@clickhouse/client`. Create three tables: `flights` (tail_number, owner_entity, destination, timestamp), `news_and_filings` (source, headline, content, timestamp), and `market_anomalies` (ticker, anomaly_type, severity, timestamp). Write a seed function to populate 50 rows of random noise, and specifically insert this data: Tim Cook and Pat Gelsinger landing in Beijing today. Jensen Huang staying in California. A news headline about Trump in Beijing. An anomaly showing a 500% spike in NVDA put volume. A Commerce Dept filing about AI chips. Use async/await and provide the full runnable code."

**Teammate B (Agent/Guild.ai) Prompt:**
> "Write a Node.js autonomous agent script. It must use the `@guildai/agents-sdk` and connect to OpenAI. The agent needs a tool to execute SQL queries. The system prompt must instruct the agent to: 1. Query the flights table. 2. If a flight anomaly is found, execute secondary queries on the news and market tables to mathematically corroborate the hypothesis. 3. Output the final synthesis in OpenUI Lang DSL format representing a node/edge graph. Wrap the final output execution in a Guild.ai Approval Gate so it pauses until human approval. Include Langfuse tracing middleware. Provide the full codebase."

**Teammate C (Frontend/CDP) Prompt:**
> "I am building a Next.js App Router frontend. First, write a React component called `ConspiracyBoard` that takes a JSON prop of `nodes` and `edges` and renders them as a beautiful, dark-mode visual graph (use `react-flow-renderer`). Second, write a standalone Node.js script using the `@coinbase/coinbase-sdk` that initializes a testnet wallet on Base Sepolia and executes a transfer of 50 USDC to a hardcoded wallet address. Provide both the React component and the CDP script."
