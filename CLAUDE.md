# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

B-Rider is a delivery rider dispatch system (배민 라이더 배차 서비스) implementing a microservices architecture for matching orders with riders. The system is designed to handle high-throughput location updates (40k TPS for 200k riders updating every 5 seconds) and ensure dispatch consistency through distributed locking.

**Core Technical Challenges:**
- Real-time location tracking using Redis Geohashing
- Preventing duplicate dispatch assignments via distributed locks
- Maintaining consistency for order-to-rider matching while prioritizing availability for other features

## Development Commands

### Building and Running
```bash
npm run build                 # Build all services
npm run start:dev            # Start in watch mode (default: api-gateway)
nest start rider-service --watch  # Start specific service in watch mode
```

### Code Quality
```bash
npm run lint                 # Run ESLint with auto-fix
npm run format              # Format code with Prettier
```

### Testing
```bash
npm test                    # Run all unit tests
npm run test:watch         # Run tests in watch mode
npm run test:cov           # Run tests with coverage
npm run test:e2e           # Run e2e tests
```

### Working with Specific Services
The monorepo contains multiple NestJS applications in `apps/`:
- `api-gateway`: Main entry point for client requests (authorization, data aggregation)
- `rider`: Manages rider state and operations

To run a specific service:
```bash
nest start <service-name> --watch
```

## Architecture

### Microservices Design
The system follows MSA principles with planned services:
1. **API Gateway** (Nest.js): Authorization, data aggregation, SSL termination
2. **Delivery Service**: Order routing and delivery management
3. **Rider Service**: Rider state management (online/offline/delivering)
4. **Location Service**: Real-time location tracking with Redis Geohashing
5. **Offer Matching Service**: Dispatch algorithm and offer management
6. **Store Service**: Store information and cooking time estimates
7. **Admin Service**: Manual dispatch override and cancellation
8. **Notification Service**: Push notifications to riders/customers

### Key Technical Decisions

**Location Database: Redis Geohashing**
- Chosen over PostGIS and naive RDBMS approaches
- Rationale: Handles 40k TPS location updates with minimal latency
- Trade-off: In-memory storage cost vs. write performance
- Implementation: Uses Redis ZSET with Geohash encoding for spatial queries

**Consistency vs Availability**
- Dispatch matching: Prioritizes consistency (distributed locks prevent duplicate assignments)
- Other features: Prioritize availability
- Critical: One order must match exactly one rider

### Core Entities
Key domain models (see README.md for full specifications):
- **Rider**: status (배달중/오프라인/대기중), location tracking
- **Delivery**: pickup/destination coordinates, status (대기/완료/배달중/매칭중), ETA
- **DeliveryOffer**: rider-delivery matching with 10-second accept/reject window
- **Location**: lat/long coordinates for geospatial operations
- **Store**: pickup locations with cooking time estimates

### API Patterns
- Rider endpoints: `/rider/*` (JWT authenticated)
- Admin endpoints: `/admin/*` (manual dispatch override)
- Store endpoints: `/stores/*` (cooking time updates)
- Location updates: `PATCH /locations` with `{lat, long}` body
- Offer acceptance: `PATCH /delivery-offers/{offer_id}/accept` with `{accept: boolean}`

## Project Structure

```
apps/
  api-gateway/          # Main gateway service
  rider-service/        # Rider management service
  [future services]     # Delivery, Location, Offer, Store, Admin, Notification

dist/                   # Compiled output
public/                 # Design diagrams and documentation images
```

Each service follows standard NestJS structure:
- `src/main.ts`: Bootstrap file
- `src/*.module.ts`: Module definitions
- `src/*.controller.ts`: HTTP endpoints
- `src/*.service.ts`: Business logic
- `test/`: E2E tests

## Important Constraints

1. **Port Configuration**: Services default to port 3000. When running multiple services locally, configure different ports via environment variables.

2. **Monorepo Navigation**: Use `nest-cli.json` to understand service configurations. The root `sourceRoot` points to `api-gateway` by default.

3. **TypeScript Configuration**:
   - Target: ES2023 with NodeNext module resolution
   - Decorators enabled for NestJS
   - `noImplicitAny: false` for gradual typing

4. **Testing**: Jest configured with roots in `apps/` directory. Each service has its own e2e test configuration.

5. **Functional Requirements**:
   - Riders have 10 seconds to accept/reject auto-dispatch offers
   - Riders can cancel before pickup
   - Admins can manually cancel or reassign deliveries
   - Location updates must support high-frequency writes (5-second intervals)

6. **Non-Functional Requirements**:
   - Dispatch matching requires strong consistency (no duplicate assignments)
   - Other features prioritize availability over consistency
   - System must scale horizontally for peak traffic
   - Stateless architecture: state stored in Redis/PostgreSQL, not local memory

## Development Notes

- The project is in early stages with basic scaffolding. Most planned services are not yet implemented.
- Refer to README.md for detailed system design, entity specifications, and API contracts.
- High-level design diagrams are available in `public/` directory.
- The codebase uses Korean comments and documentation in some places (e.g., entity status values).
