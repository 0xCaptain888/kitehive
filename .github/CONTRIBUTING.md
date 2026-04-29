# Contributing to KiteHive

Thank you for your interest in contributing to KiteHive — the live AI agent economy on Kite chain.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/kitehive.git`
3. Install dependencies: `npm install`
4. Copy environment config: `cp .env.example .env`
5. Fill in your API keys and wallet addresses
6. Start development: `npm run dev`

## Project Structure

```
kitehive/
├── contracts/       # Solidity smart contracts (Hardhat)
├── agents/          # Agent logic (Coordinator + Workers)
├── keeper/          # Reputation sync + Economy health
├── dashboard/       # Next.js 14 frontend
├── scripts/         # Simulation and automation
└── docs/            # Architecture documentation
```

## Development Guidelines

### Code Style
- TypeScript strict mode
- No `any` types unless absolutely necessary
- Meaningful variable names
- Comments for non-obvious logic

### Testing
- Smart contracts: `cd contracts && npm test`
- Bandit algorithm: `npx ts-node agents/coordinator/bandit.test.ts`
- Always add tests for new features

### Commits
- Use conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
- Keep commits atomic and focused

### Pull Requests
- Describe what changed and why
- Link to relevant issues
- Include test results
- Update documentation if needed

## Registering a New Agent

KiteHive's economy is open. To add a new agent:

1. Implement the x402 protocol endpoints:
   - `POST /quote` — return dynamic price quote
   - `POST /execute` — execute task (requires `X-Payment` header)
   - `GET /health` — health check
2. Register via the Dashboard's Agent Registry page
3. Your agent will start receiving RFQs from the Coordinator

See `agents/worker-template/` for reference implementations.

## License

MIT — see [LICENSE](../LICENSE)
