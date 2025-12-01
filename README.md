# LUXE - Modern Fashion E-commerce & POS

A high-end, minimalist e-commerce platform and browser-based POS system for a women's fashion brand.

## Tech Stack
- **Backend**: Go (Echo Framework) + PostgreSQL
- **Frontend**: Next.js 14 (App Router) + TailwindCSS + Shadcn UI
- **Infrastructure**: Docker + Docker Compose

## Prerequisites
- Docker & Docker Compose

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd luxe-fashion
   ```

2. **Start the application**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   - **Storefront**: [http://localhost:3000](http://localhost:3000)
   - **POS System**: [http://localhost:3000/pos](http://localhost:3000/pos)
   - **Admin Dashboard**: [http://localhost:3000/admin](http://localhost:3000/admin)
   - **Backend API**: [http://localhost:8080](http://localhost:8080)

## Development

### Backend
The backend is located in `/backend`.
- **Generate SQL Code**: Run `docker run --rm -v $(pwd):/src -w /src kjconroy/sqlc generate` in the `backend` directory.
- **Run Locally**: `go run cmd/api/main.go` (requires local Postgres).

### Frontend
The frontend is located in `/frontend`.
- **Install Dependencies**: `npm install`
- **Run Locally**: `npm run dev`

## Features
- **Modern Minimalist Design**: Black & white luxury aesthetic.
- **Web POS**: Offline-ready point of sale system with barcode support.
- **Gift Cards**: Secure gift card generation and redemption.
- **Dockerized**: Full stack containerization for easy deployment.
