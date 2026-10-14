# ATLAS 2.0: Full System Architecture Specification

This document provides the definitive, end-to-end architecture blueprint for **ATLAS 2.0 (Accessible Academic Learning & Computational Intelligence Platform)**. It includes comprehensive Mermaid architectural diagrams, data flows, security topologies, and deployment infrastructure models.

---

## 1. High-Level System Architecture

The following diagram illustrates the complete end-to-end topology across Client Devices, Edge Frontend CDN, Gateway & Security Layers, Core Backend Services, AI Intelligence Pipelines, and Data Stores.

```mermaid
flowchart TB
    subgraph Clients["1. Client Tier (Multi-Platform)"]
        WebDesktop["💻 Desktop Browser\n(Chrome, Edge, Firefox)"]
        WebMobile["📱 Mobile / Tablet\n(Android / iOS PWA)"]
        ScreenReader["🔊 Screen Readers & A11y\n(NVDA, JAWS, TalkBack)"]
    end

    subgraph FrontendEdge["2. Frontend Presentation & Edge Tier (Vercel)"]
        VercelCDN["⚡ Vercel Global Edge Network\n(Static Assets, HTML5, PWA Caching)"]
        SPAApp["⚛️ React 18 + Vite SPA Engine\n(TypeScript, Glassmorphic UI)"]
        OfflineEngine["🛡️ Zero-Net Client Engine\n(Deterministic Math, Symbolic Rules, Local Cache)"]
        SoundEngine["🎵 Sound & Audio Feedback Engine\n(Web Audio API & Synthesizer)"]
    end

    subgraph SecurityGateway["3. Security & Gateway Tier"]
        VercelRewrite["🔀 Vercel /api Proxy Rewrite\n(HTTPS Port 443, CORS Guard)"]
        FirewallMiddleware["🛡️ ATLAS Adaptive Security Firewall\n(IP Whitelist/Blacklist, Rate Limiting)"]
        SSRFShield["🔒 SSRF & Payload Sanitizer\n(Safe Urlopen, Image/PDF MIME Validator)"]
    end

    subgraph BackendCore["4. Application Services Tier (FastAPI / Render)"]
        FastAPIServer["⚡ FastAPI Core Async Server\n(Python 3.12, Uvicorn ASGI)"]
        AuthModule["🔐 Auth & Identity Engine\n(PBKDF2-HMAC-SHA256, Peppering, Session Tokens)"]
        AITutorRouter["🎓 Academic AI Tutor Router\n(Step-by-Step Pedagogical Structuring)"]
        MathSolverRouter["➗ Symbolic & Computational Math Engine\n(Regex JSON Extraction, LaTeX Output)"]
        TTSService["🎙️ Multilingual TTS Engine\n(Odia, Hindi, English Voice Synthesis)"]
        CurrentAffairsModule["📰 Live Current Affairs Hub\n(Verified Feeds & Categorization)"]
    end

    subgraph AIEngine["5. Multi-Model AI Orchestrator Tier"]
        AIRouter["🔀 Intelligent AI Model Failover Controller"]
        GPT4oMini["🧠 OpenAI GPT-4o-mini\n(Primary Ultra-Fast Solver: 1-2s latency)"]
        DeepSeekChat["🔬 DeepSeek-Chat\n(Advanced Calculus, STEM, Proofs)"]
        Qwen72B["🌐 Qwen 2.5 72B Instruct\n(Pure Odia Unicode & Indic Specialist)"]
        Llama33["🦙 Meta LLaMA 3.3 70B Instruct\n(Deep Context Reasoning Failover)"]
        MistralSmall["⚡ Mistral Small 24B\n(High-Efficiency Reasoning Backup)"]
    end

    subgraph DataTier["6. Persistence & Storage Tier"]
        SQLiteDB["🗄️ SQLite Database (WAL Mode)\n(Users, Roles, Learning History, Logic Rules)"]
        AuditLogs["📋 Security & Threat Audit Logs\n(IP Probes, Block History)"]
        LocalClientDB["💾 Client-Side Storage\n(LocalStorage, CacheStorage, IndexedDB)"]
    end

    subgraph ExternalChannels["7. External Delivery Channels"]
        BrevoHTTPS["📧 Brevo HTTPS REST API\n(Port 443, Zero-Block Cloud Fast-Path)"]
        GmailSMTP["✉️ Authenticated Gmail SMTP\n(Fallback Port 587/465, SPF/DKIM Verified)"]
    end

    %% Client to Edge
    Clients --> VercelCDN
    VercelCDN --> SPAApp
    SPAApp <--> OfflineEngine
    SPAApp --> SoundEngine
    SPAApp <--> LocalClientDB

    %% Frontend to Backend
    SPAApp -->|HTTPS /api/| VercelRewrite
    VercelRewrite --> FirewallMiddleware
    FirewallMiddleware --> SSRFShield
    SSRFShield --> FastAPIServer

    %% Backend internal routing
    FastAPIServer --> AuthModule
    FastAPIServer --> AITutorRouter
    FastAPIServer --> MathSolverRouter
    FastAPIServer --> TTSService
    FastAPIServer --> CurrentAffairsModule

    %% Backend to AI
    AITutorRouter --> AIRouter
    MathSolverRouter --> AIRouter
    AIRouter --> GPT4oMini
    AIRouter -.->|Failover 1| DeepSeekChat
    AIRouter -.->|Failover 2| Qwen72B
    AIRouter -.->|Failover 3| Llama33
    AIRouter -.->|Failover 4| MistralSmall

    %% Backend to Storage
    AuthModule <--> SQLiteDB
    FastAPIServer <--> SQLiteDB
    FirewallMiddleware <--> AuditLogs

    %% External Email Channels
    AuthModule -->|Primary Cloud Port 443| BrevoHTTPS
    AuthModule -.->|Secondary Fallback| GmailSMTP
```

---

## 2. Dual-Mode Architecture: Online Cloud vs. Zero-Net Offline

ATLAS 2.0 employs an architectural model guaranteeing that **no student is ever locked out** due to slow network, rural bandwidth constraints, or cloud server cold starts.

```mermaid
graph TD
    UserArrival["👤 User Accesses ATLAS 2.0 Web Application"]
    CheckMode{"Network Mode Selected?"}
    
    UserArrival --> CheckMode

    %% Offline Path
    subgraph OfflineModeEngine["Zero-Net Client-Side Architecture (100% Local)"]
        OfflineDirect["⚡ Instant Direct Entry\n(Zero OTP, Zero API Latency)"]
        ClientMathEngine["🧮 Embedded Deterministic Solver\n(BODMAS, Polynomial, Fractions, Trigonometry)"]
        ClientRulesEngine["📖 Heuristic Subject Knowledge Bank\n(Mechanics, Botany, Ohm's Law, Constitution, Odisha Studies)"]
        ClientStorage["💾 Encrypted Browser Storage\n(IndexedDB / LocalStorage Session)"]
        LocalPlotter["📈 HTML5 Canvas 2D/3D Graph Plotter\n(No Server Dependency)"]
    end

    %% Online Path
    subgraph OnlineCloudEngine["Cloud Intelligence Architecture"]
        HealthProbe{"Health Probe\n(/api/health)"}
        ServerAwake["🟢 Server Active\n(< 1.2s response)"]
        ServerSleeping["🟡 Server Cold/Asleep\n(Render 45s wake-up)"]
        
        BypassPrompt["⚡ 1-Click Offline Bypass Option\n('Create Account / Login Instantly')"]
        CloudOTP["🔐 Brevo HTTPS Cryptographic OTP\n(10-minute expiry, CSPRNG code)"]
        CloudAI["🤖 Multi-LLM AI Router\n(GPT-4o-mini / DeepSeek / Qwen 72B)"]
    end

    CheckMode -->|Offline Mode| OfflineDirect
    OfflineDirect --> ClientMathEngine
    OfflineDirect --> ClientRulesEngine
    OfflineDirect --> ClientStorage
    OfflineDirect --> LocalPlotter

    CheckMode -->|Online Mode| HealthProbe
    HealthProbe -->|Active| ServerAwake
    HealthProbe -->|Timeout > 3.5s| ServerSleeping
    
    ServerSleeping --> BypassPrompt
    BypassPrompt -->|Click Instant Bypass| OfflineDirect
    
    ServerAwake --> CloudOTP
    ServerAwake --> CloudAI
```

---

## 3. Security, Authentication & Cryptographic Topology

The security perimeter of ATLAS 2.0 is built on defense-in-depth principles:

```mermaid
flowchart LR
    subgraph ClientShield["Client Shield"]
        InMemoryToken["🛡️ In-Memory Token Shield\n(Mitigates XSS Token Theft)"]
        SessionStore["🔒 SessionStorage Fallback"]
    end

    subgraph NetworkShield["Network & Transport Shield"]
        HTTPSOnly["🔐 Strict HTTPS Transport\n(TLS 1.3 Encryption)"]
        CORSSecurity["🌐 Origin Isolation\n(Strict CORS Allowed Origins)"]
    end

    subgraph FirewallCore["Adaptive Application Firewall"]
        RateLimiter["⏱️ Rate Limiter (60s OTP Cooldown)"]
        IPBlocklist["🚫 Dynamic IP Blacklist Engine"]
        MIMEInspection["🔍 Magic Byte MIME Verifier\n(PNG, JPEG, WebP, PDF)"]
        SSRFBlock["🛡️ RFC1918 Private IP Filter\n(Blocks 127.0.0.1, 10.x, 192.168.x)"]
    end

    subgraph CryptoStore["Cryptographic Credential Storage"]
        SaltPepper["🧂 CSPRNG Salt + Server-Side Pepper (256-bit)"]
        HashFunction["🔑 PBKDF2-HMAC-SHA256\n(100,000 Iterations)"]
        DBStore["🗄️ SQLite Users Table"]
    end

    ClientShield --> NetworkShield
    NetworkShield --> FirewallCore
    FirewallCore --> CryptoStore
    CryptoStore --> DBStore
```

---

## 4. Multi-LLM AI Academic & Math Orchestration Flow

```mermaid
sequenceDiagram
    autonumber
    actor Student as 🎓 Student / User
    participant UI as 💻 Frontend (React + Vite)
    participant API as ⚡ FastAPI Backend
    participant Router as 🔀 AI Model Orchestrator
    participant M1 as 🧠 OpenAI GPT-4o-mini
    participant M2 as 🔬 DeepSeek-Chat
    participant M3 as 🌐 Qwen 2.5 72B (Odia)
    participant Fallback as 🛡️ Deterministic Fallback Engine

    Student->>UI: Enters academic question or math equation
    UI->>API: POST /api/ai/ask or /api/ai/solve-math
    Note over API: Validates payload & applies 35s dynamic timeout
    
    API->>Router: Dispatch with pedagogical system prompt
    
    alt Primary Provider (GPT-4o-mini) Available
        Router->>M1: Request chat completion (temp=0.3)
        M1-->>Router: Returns verified step-by-step solution (< 2.5s)
    else Provider 1 Rate-Limited or Down
        Router->>M2: Failover to DeepSeek-Chat
        M2-->>Router: Returns advanced STEM derivation
    else Odia Language Script Query
        Router->>M3: Target Qwen 2.5 72B Instruct
        M3-->>Router: Returns pure Unicode Odia (0x0B00-0x0B7F)
    else All Upstream APIs Unreachable
        Router->>Fallback: Execute local rule-based solver
        Fallback-->>Router: Structured 4-step pedagogical fallback
    end

    Router->>API: Raw response
    Note over API: Regex extracts JSON { steps: [...], result: "..." }
    API-->>UI: Structured JSON response
    UI-->>Student: Renders formatted steps, LaTeX equations & voice audio
```

---

## 5. Deployment & Infrastructure Architecture

```mermaid
flowchart TD
    subgraph GitHubRepo["GitHub Repository"]
        GitMain["📦 soubhagyapattanayak123-a11y/ATLAS-2.0\n(Branch: main)"]
    end

    subgraph VercelInfra["Vercel Cloud Platform (Frontend)"]
        VercelHook["🪝 Vercel GitHub Webhook / CI/CD"]
        BuildStep["🔨 Build: cd frontend && npm install && npm run build"]
        DistOutput["📁 Output: frontend/dist (Vite Production Bundle)"]
        EdgeRoutes["🌐 Edge Routing & /api Proxy Rewrites"]
    end

    subgraph RenderInfra["Render Cloud Platform (Backend)"]
        RenderHook["🪝 Render GitHub Webhook"]
        DockerBuild["🐳 Python 3.12 Environment Setup"]
        UvicornStart["🚀 gunicorn / uvicorn backend.app.main:app"]
        LiveBackend["🌐 https://atlas-2-0-zf9q.onrender.com"]
    end

    GitMain -->|Auto Push Trigger| VercelHook
    VercelHook --> BuildStep --> DistOutput --> EdgeRoutes
    
    GitMain -->|Auto Push Trigger| RenderHook
    RenderHook --> DockerBuild --> UvicornStart --> LiveBackend

    EdgeRoutes -.->|Reverse Proxy /api/| LiveBackend
```

---

## 6. Component Directory & Responsibility Mapping

| Layer | Primary Files | Architectural Responsibility |
| :--- | :--- | :--- |
| **Frontend Presentation** | [`frontend/src/App.tsx`](file:///c:/Users/soubh/OneDrive/Desktop/ATLAS%202.0/frontend/src/App.tsx), [`LoginPage.tsx`](file:///c:/Users/soubh/OneDrive/Desktop/ATLAS%202.0/frontend/src/components/LoginPage.tsx) | User experience, authentication UI, smart offline mode toggle, responsive layouts |
| **Frontend State & API** | [`frontend/src/api.ts`](file:///c:/Users/soubh/OneDrive/Desktop/ATLAS%202.0/frontend/src/api.ts) | Unified HTTP client, 35s adaptive timeout, client-side offline solvers, script normalizer |
| **Backend Core & Routing** | [`backend/app/main.py`](file:///c:/Users/soubh/OneDrive/Desktop/ATLAS%202.0/backend/app/main.py) | FastAPI application lifecycle, REST endpoints, CORS/Firewall registration, error handlers |
| **AI Academic Engine** | [`backend/app/ai_tutor.py`](file:///c:/Users/soubh/OneDrive/Desktop/ATLAS%202.0/backend/app/ai_tutor.py), [`ai_service.py`](file:///c:/Users/soubh/OneDrive/Desktop/ATLAS%202.0/backend/app/ai_service.py) | Multi-model failover orchestrator (GPT-4o-mini, DeepSeek, Qwen), regex JSON parsing |
| **Email Dispatch** | [`backend/app/email_service.py`](file:///c:/Users/soubh/OneDrive/Desktop/ATLAS%202.0/backend/app/email_service.py) | Brevo HTTPS Port 443 cloud fast-path (<1s) with authenticated Gmail SMTP fallback |
| **Security & Firewall** | [`backend/app/firewall.py`](file:///c:/Users/soubh/OneDrive/Desktop/ATLAS%202.0/backend/app/firewall.py), [`security_utils.py`](file:///c:/Users/soubh/OneDrive/Desktop/ATLAS%202.0/backend/app/security_utils.py) | Adaptive IP blacklist, SSRF protection, MIME validation, CSPRNG salting/peppering |
| **Persistence** | [`backend/app/database.py`](file:///c:/Users/soubh/OneDrive/Desktop/ATLAS%202.0/backend/app/database.py), [`crud.py`](file:///c:/Users/soubh/OneDrive/Desktop/ATLAS%202.0/backend/app/crud.py) | SQLite connection pool with WAL mode enabled, atomic transactions, schema migrations |
