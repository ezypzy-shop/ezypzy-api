# Ezy Pzy Shop - Web Frontend

This is the Next.js web frontend for the Ezy Pzy Shop e-commerce platform.

## Features

- 🛍️ Product browsing and search
- 🛒 Shopping cart functionality
- 📦 Checkout and order placement
- 🎁 Special offers display
- 📱 Responsive design
- 🚀 Server-side rendering with Next.js 15

## Getting Started

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Neon)

### Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=your_database_url
SENDGRID_API_KEY=your_sendgrid_key
```

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at http://localhost:4000

### Production Build

```bash
npm run build
npm start
```

## Deployment to Vercel

### Step 1: Push to GitHub

1. Create a new repository on GitHub
2. Initialize git in your project (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
3. Add your GitHub repository as remote:
   ```bash
   git remote add origin https://github.com/yourusername/your-repo.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (or the path to your web folder)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

5. Add Environment Variables:
   - `DATABASE_URL` - Your Neon database connection string
   - `SENDGRID_API_KEY` - Your SendGrid API key
   - Any other API keys you need

6. Click "Deploy"

### Step 3: Add Custom Domain

1. Once deployed, go to your project settings in Vercel
2. Navigate to "Domains"
3. Click "Add Domain"
4. Enter your custom domain (e.g., `shop.yourdomain.com`)
5. Follow Vercel's instructions to update your DNS records:
   - Add a CNAME record pointing to `cname.vercel-dns.com`
   - Or add A records if using root domain

6. Wait for DNS propagation (can take up to 48 hours, usually much faster)

## Project Structure

```
/app
  /(pages)
    /shop - Product listing page
    /product/[id] - Product detail page
    /cart - Shopping cart
    /checkout - Checkout page
    /order-success - Order confirmation
  /api - Backend API routes (already exist)
  layout.tsx - Root layout with header/footer
  page.tsx - Homepage
/components
  Header.tsx - Site header with navigation
  Footer.tsx - Site footer
  ProductCard.tsx - Product display card
  Hero.tsx - Homepage hero section
  OfferBanner.tsx - Offer display component
```

## API Routes

All API routes are in `/app/api/` and are automatically deployed with your Next.js app:

- `POST /api/orders` - Place an order
- `GET /api/products` - Get products (with filtering)
- `GET /api/ads` - Get offers/ads
- And many more...

## Technologies Used

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Neon PostgreSQL** - Database
- **SendGrid** - Email notifications

## Notes

- The cart is stored in localStorage (client-side only)
- For production, consider adding user authentication
- Images are loaded from external URLs (ensure CORS is configured)
- The app is fully responsive and works on mobile/tablet/desktop
