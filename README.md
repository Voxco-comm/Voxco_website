# Voxco Number Ordering Portal

A Next.js application for ordering phone numbers and managing communications services for Voxco Communications.

## Tech Stack

- **Framework**: Next.js 15
- **Authentication**: Supabase Auth 
- **Database**: Supabase (PostgreSQL)  
- **Styling**: Tailwind CSS
- **Icons**: Lucide React 

## Getting Started  

### Prerequisites

- Node.js 18+ installed     
- A Supabase project (get one at [supabase.com](https://supabase.com))  

### Installation

1. Install dependencies: 
```bash
npm install
```

2. Set up environment variables:
   - Copy `env.exampl e` to `.env.local`
   - Fill in your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── layout.js     # Root layout with AuthProvider
│   ├── page.js       # Home page (orders)
│   ├── sign-in/      # Sign in page
│   ├── sign-up/      # Sign up page
│   ├── numbers/      # Numbers ordering page
│   └── orders/       # Orders page
├── components/       # React components
│   ├── AuthContext.jsx  # Supabase auth context
│   ├── Header.jsx       # Navigation header
│   ├── Sidebar.jsx      # Side navigation
│   ├── Signin.jsx       # Sign in component
│   ├── Signup.jsx       # Sign up component
│   ├── OrdersPage.jsx   # Orders page component
│   └── Numbers.jsx     # Numbers ordering component
├── lib/
│   └── supabase/     # Supabase client utilities
│       ├── client.js    # Browser client
│       ├── server.js    # Server client
│       └── middleware.js # Auth middleware
└── data/
    └── counrty.js    # Country data
```

## Features

- ✅ User authentication with Supabase
- ✅ Protected routes
- ✅ Number ordering interface
- ✅ Product selection (Port IN, Port OUT, SIPTRUNK)
- ✅ Responsive design

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API
3. Copy your Project URL and anon/public key
4. Add them to `.env.local`

### Database Schema

The application uses Supabase Auth for user management. Additional tables can be created as needed for:
- Orders
- Number inventory
- Porting requests
- etc.

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

### Environment variables

Copy `env.example` to `.env.local` (local) or set these in your hosting provider (Vercel, etc.):

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (for approve-signup and server-side actions) |
| `NEXT_PUBLIC_SITE_URL` | Yes (prod) | Your app URL, e.g. `https://your-domain.com` (used for email callbacks) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Yes | SMTP settings for order/signup emails |

Optional: `GROQ_API_KEY` or `HUGGINGFACE_API_KEY` for AI-assisted country requirements.

### Build and run

```bash
npm install
npm run build
npm run start
```

### Database migrations

Apply Supabase migrations before or right after deploy:

- Using Supabase CLI: `supabase db push`
- Or run the SQL files in `supabase/migrations/` in order in the Supabase SQL Editor (Dashboard → SQL Editor).

Ensure all migrations are applied, including:

- `20260130_custom_number_requests.sql`
- `20260130_orders_admin_request_changes.sql`
- `20260130_search_numbers_exact_filter.sql`
- `20260130_admin_settings_and_notification_email.sql` (admin_settings table + get_notification_email for email alerts)
- `20260130_grants_new_tables.sql`

### Production notes

- **Test SMTP** (`/api/test-smtp`) is disabled in production (`NODE_ENV !== 'development'`).
- Set `NEXT_PUBLIC_SITE_URL` to your production URL so approval emails and links work correctly.
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret; it bypasses RLS.
- After deploy, set **Admin → Settings → Notification email** so new order and signup request emails are sent to that address.

## Migration from React/Vite

This project was migrated from a React + Vite setup to Next.js with Supabase authentication. Key changes:
- Replaced React Router with Next.js App Router
- Replaced LocalStorage auth with Supabase Auth
- Added server-side authentication checks
- Updated all navigation to use Next.js routing
