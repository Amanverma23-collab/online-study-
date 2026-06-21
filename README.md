# Officers Saga - Online NDA & CDS Test Prep Platform

Officers Saga is a modern, responsive, and robust online test preparation and evaluation portal tailored specifically for NDA (National Defence Academy), CDS (Combined Defence Services), and OTA (Officers Training Academy) candidate training.

## Key Features

- **Dynamic Student Dashboard**: Live mock examinations, progress reviews, and dynamic score analysis.
- **Paid Test Series**: Premium structured course bundles and sequential mock briefings.
- **Self-Paced Class Tracking**: Live classes schedule and recorded lectures archive.
- **Admin Panel Control**: Cadet management, test scheduling, PDF/Excel bulk imports, and result analytics.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Amanverma23-collab/online-study-.git
   cd online-study-
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env`:
   ```env
   DATABASE_URL="your-postgresql-url"
   DIRECT_URL="your-direct-postgresql-url"
   NEXTAUTH_SECRET="your-nextauth-secret"
   NEXTAUTH_URL="http://localhost:3000"
   GEMINI_API_KEY="your-gemini-api-key"
   ```

4. Run database migrations:
   ```bash
   npx prisma db push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) to view the portal.
