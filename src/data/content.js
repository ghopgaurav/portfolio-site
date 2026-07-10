export const profile = {
  name: "Gaurav Ghop",
  roles: ["Software Engineer", "Applied AI", "Distributed Systems"],
  role: "Software Engineer · Backend & Applied AI",
  location: "New York, NY",
  email: "gauravghopwork@gmail.com",
  phone: "+1 929-628-4065",
  github: "https://github.com/ghopgaurav",
  linkedin: "https://www.linkedin.com/in/gauravghop",
  available: "Open to SWE / AI roles across the US",
  intro:
    "I'm Gaurav, a software engineer building backend systems, AI applications, and the tooling that makes them reliable.",
};

export const stats = [
  { value: 34, suffix: "%", label: "inference cost cut via model routing" },
  { value: 80, suffix: "K", label: "ops/sec on a hand-built LSM store" },
  { value: 100, suffix: "+", label: "connectors under an automated harness" },
  { value: 50, suffix: "K", label: "labeled examples behind the router" },
];

export const experience = [
  {
    company: "Tiny Archives",
    role: "AI Software Engineer Intern",
    location: "New York, NY",
    period: "Jun 2025 — Aug 2025",
    points: [
      "Cut per-document inference cost 34% by routing simple extractions to a fine-tuned Qwen 2.5 7B and reserving GPT-4o for ambiguous cases — a confidence-based router trained on 50K labeled examples with automated fallback.",
      "Refactored core service modules into a shared, reusable template, cutting new-endpoint time from 6 hours to 90 minutes and enabling on-time delivery of a customer feature.",
    ],
    tags: ["LLM Routing", "Qwen 2.5", "GPT-4o", "Fine-tuning"],
  },
  {
    company: "Duende Ingenious",
    role: "Founding Engineer",
    location: "Pune, India",
    period: "Jul 2023 — Aug 2024",
    points: [
      "Architected an SQS order-queue with dead-letter handling and retries to stop silent order drops during outages — lifting client revenue 15% and cutting failed orders 40%.",
      "Decomposed a monolithic order service into four event-driven microservices with idempotent processing and circuit breaking, cutting feature cycle time from 10 to 6 days and reducing cross-service incidents 28%.",
    ],
    tags: ["AWS SQS", "Microservices", "Event-Driven", "Idempotency"],
  },
  {
    company: "EQ Technologic",
    role: "Software Engineer II",
    location: "Pune, India",
    period: "Aug 2021 — Jun 2023",
    points: [
      "Owned sync reliability on the integration platform — Java Spring Boot services integrating PLM/ERP/CRM via Kafka with idempotent consumers, dead-letter routing, and automated reconciliation across 50 deployments.",
      "Built diagnostic tooling for defense deployments (Lockheed Martin, US Navy) with correlation IDs, structured per-tenant logging, and query templates — cutting time-to-triage 18%.",
      "Built an automated connector test harness for hybrid rollouts (100+ connectors) with env drift detection, smoke tests, and one-command rollback.",
    ],
    tags: ["Java", "Spring Boot", "Kafka", "Reliability"],
  },
];

export const projects = [
  {
    title: "TinyLSM KV Store",
    kind: "Systems",
    stack: "C++17 · WAL · SSTables · Compaction",
    link: "https://github.com/ghopgaurav/tiny_LSM",
    blurb:
      "A from-scratch LSM-tree key/value store — memtable, write-ahead log, immutable SSTables with Bloom filters + sparse index, and a background leveled compactor. Self-describing on-disk format survives a kill at any point.",
    metrics: ["80K ops/sec @ p95 2.5ms on 20GB", "+35% point lookups · −45% disk reads"],
  },
  {
    title: "Flash-Attention Lab",
    kind: "GPU / ML Systems",
    stack: "Triton · CUDA C++ · Roofline",
    link: "https://github.com/ghopgaurav/flash-attn-lab",
    blurb:
      "From-scratch fused attention kernels in Triton and raw CUDA C++, with a cross-architecture roofline study to find the memory-vs-compute crossover across A100, L4, and Blackwell.",
    metrics: ["Fused softmax + matmul, no intermediate writes", "Roofline-profiled across 3 GPU architectures"],
  },
  {
    title: "Efficient Fine-Tuning",
    kind: "Applied AI",
    stack: "Python · QLoRA · FastAPI · Drift Eval",
    link: "https://github.com/ghopgaurav/efficient_fine_tuning",
    blurb:
      "QLoRA fine-tuning of Qwen 2.5 7B served by a 4-bit batched FastAPI inference server, with a PSI/KS drift-evaluation harness measured on a 250-prompt holdout set.",
    metrics: ["4-bit batched serving via FastAPI", "PSI/KS drift checks on a 250-prompt holdout"],
  },
  {
    title: "Shadow Engineer",
    kind: "Agents",
    stack: "AWS Bedrock · MCP · Tool-use · RAG",
    link: "https://github.com/ghopgaurav/ShadowEngineer",
    blurb:
      "An autonomous tool-using onboarding copilot that decomposes each ticket into a multi-step plan, orchestrating MCP tools across Jira, repo structure, commit history, and transcripts to recommend concrete next steps.",
    metrics: ["Plan-act-observe loop with self-correction", "Grounded, cited output · targeting 50% faster ramp-up"],
  },
  {
    title: "Dispatch Engine Simulator",
    kind: "Backend",
    stack: "Java · Spring Boot · PostGIS · Redis · Kafka",
    link: "https://github.com/ghopgaurav/dispatch-engine-simulator",
    blurb:
      "A real-time dispatch engine that matches riders to orders geographically — Spring Boot services over PostGIS spatial queries, Redis for hot state, and Kafka driving the order lifecycle.",
    metrics: ["Geospatial nearest-driver matching", "Event-driven order lifecycle on Kafka"],
  },
  {
    title: "Formulary Analysis",
    kind: "Applied AI",
    stack: "Python · MLX-LM · LoRA · PostgreSQL",
    link: "#",
    blurb:
      "A fully offline pipeline that ingests pharma formulary PDFs into PostgreSQL and LoRA fine-tunes a Q4 Llama 3.2 3B with MLX-LM on Apple Silicon. DB-grounded guardrails fact-check every claim against source data.",
    metrics: ["Hallucinations 29% → 17%, abstention up to 71%", "Perplexity 3.0 · 82% accuracy · 41 tok/s < 4GB RAM"],
  },
  {
    title: "Zero-Day Dojo",
    kind: "AI / Security",
    stack: "Python · Reinforcement Learning",
    link: "https://github.com/ghopgaurav/zero-day-dojo",
    blurb:
      "An AI-powered cybersecurity training platform where RL-driven red and blue team agents face off via self-play to generate realistic, hands-on attack/defense scenarios.",
    metrics: ["RL red vs. blue self-play", "Auto-generated training scenarios"],
  },
  {
    title: "Talk to a Folder",
    kind: "RAG",
    stack: "TypeScript · RAG · Google Drive",
    link: "https://github.com/ghopgaurav/Talk_to_a_folder",
    blurb:
      "“ChatGPT for your Google Drive” — connect a folder and chat across its documents with retrieval-augmented answers grounded in your own files.",
    metrics: ["RAG over Drive folders", "Conversational document search"],
  },
  {
    title: "Guitar Modulation Detection",
    kind: "Audio ML",
    stack: "Python · CNN · Librosa · MFCC",
    link: "https://github.com/ghopgaurav/GuitarModulationDetection",
    blurb:
      "A deep-learning project that analyzes electric-guitar signal chains and classifies effects — distortion, chorus, delay and more — from MFCC features using CNNs, to help recreate signature tones.",
    metrics: ["CNN over MFCC audio features", "Detects distortion, chorus, delay & more"],
  },
];

export const skills = [
  { group: "Languages", items: ["Python", "Java", "TypeScript", "SQL", "C"] },
  {
    group: "AI & Agents",
    items: ["LLM Integration", "Tool-use & MCP", "Multi-step Planning", "Local/Edge Inference", "Eval & Guardrails"],
  },
  {
    group: "Backend & APIs",
    items: ["Microservices", "REST/OpenAPI", "Spring Boot", "FastAPI", "Event-Driven", "Idempotency"],
  },
  {
    group: "Distributed Data",
    items: ["Kafka", "PostgreSQL", "PostGIS", "Elasticsearch", "Redis", "WAL/SSTables (LSM)"],
  },
  {
    group: "Cloud & Infra",
    items: ["AWS (Bedrock, SQS)", "Docker", "Kubernetes", "CI/CD", "CloudWatch", "Linux"],
  },
];

export const education = [
  {
    school: "New York University",
    degree: "M.S. Computer Engineering",
    location: "New York, NY",
    period: "2024 — 2026",
    status: "Graduated May 2026",
    note: "Design & Analysis of Algorithms · High-Performance ML · Distributed Systems",
    highlight: true,
  },
  {
    school: "Vishwakarma Institute of Information Technology",
    degree: "B.Tech. Electronics & Telecommunications",
    location: "Pune, India",
    period: "2017 — 2021",
    status: "",
    note: "",
    highlight: false,
  },
];

export const achievements = [
  { tag: "Scholarship", text: "Merit-based Graduate Tuition Scholarship", org: "NYU" },
  { tag: "Runner-Up", text: "AWS GenAI Hackathon", org: "2025" },
  { tag: "Finalist", text: "Google DeepMind Hackathon", org: "2025" },
  { tag: "Runner-Up", text: "Smart India Hackathon", org: "2020" },
  { tag: "Competitive", text: "ACM ICPC Regionals · Google KickStart · CodeChef 4★", org: "" },
];
