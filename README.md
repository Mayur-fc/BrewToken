# BrewToken

BrewToken is a full-stack café ordering and digital token management system built with Vanilla HTML/CSS/JS on the frontend, Node.js/Express on the backend, and Firebase Firestore as the database.

## Project Structure

- `/frontend`
  - `index.html` — main frontend UI
  - `style.css` — design, layout, dark theme, animations
  - `script.js` — API integration, cart, order tracking, admin UI logic
  - `assets/` — placeholder for images or icons
- `/backend`
  - `server.js` — Express server setup
  - `/routes` — API route definitions
  - `/controllers` — request handlers and Firestore logic
  - `/firebase` — Firebase admin initialization
  - `/middleware` — error handling utilities
- `.env.example` — environment variables template

## Features

- Full product menu fetching from backend
- Cart + checkout flow
- Simulated payment flow with method selection
- Order token generation: `CAF101`, `CAF102`, ...
- Admin login validation using env variables
- Product management: add, edit, delete, availability toggle
- Order management: view live orders, update statuses, history
- Firestore persistence for products and orders
- Mobile-friendly UI, responsive layout, modern dark theme

## Setup

### 1. Create Firebase Service Account

1. Go to Firebase Console and create a project.
2. Enable Firestore in the project.
3. Create a service account key in Project Settings > Service Accounts.
4. Download the JSON file.
5. Place it at `backend/serviceAccount.json` or set `FIREBASE_SERVICE_ACCOUNT` in `.env`.

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cd backend
copy ..\.env.example .env
```

Then edit `backend/.env` and add your admin credentials and Firebase service account path.

### 3. Install Backend Dependencies

```bash
cd backend
npm install
```

### 4. Run the Backend Server

```bash
cd backend
npm run dev
```

The backend will be available at `http://localhost:5001`.

### 5. Run the Frontend

You can open `frontend/index.html` directly in the browser, but a local static server is recommended.

Using `npx serve`:

```bash
cd frontend
npx serve .
```

Or using Python:

```bash
cd frontend
python -m http.server 5500
```

Then open the served URL in your browser.

## Admin Login

Use the credentials from `backend/.env`:

- Username: `admin`
- Password: `admin123`

## Firebase Collections

- `products`
- `orders`
- `meta` (used to store the next token counter)

## Notes

- No real payment gateway is integrated. Payment is simulated and stored as verified.
- The frontend communicates with backend APIs via `fetch()`.
- Firebase secret keys are never exposed in the frontend.
