# Cloudflare Workers Deployment Guide

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Node.js**: Version 18+ (you already have v24.4.0 ✅)
3. **Git**: For version control (optional but recommended)

## Step 1: Install Wrangler CLI

```bash
# Install Wrangler globally
npm install -g wrangler

# Verify installation
wrangler --version
```

## Step 2: Login to Cloudflare

```bash
# Login to your Cloudflare account
wrangler auth login
```

This opens a browser window. Click "Allow" to authenticate.

## Step 3: Update Project Configuration

Your project is already configured with the necessary files:
- `wrangler.toml` - Cloudflare configuration
- `src/worker.js` - Backend worker code
- Updated `package.json` with deployment scripts

## Step 4: Create KV Namespace (for data storage)

```bash
# Create a KV namespace for storing processing results
wrangler kv:namespace create "DATA_STORE"
```

Copy the returned namespace ID and update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "DATA_STORE"
id = "your-actual-namespace-id-here"
```

## Step 5: Set Environment Variables

Create a `.env.production` file with your production settings:

```bash
# Copy the template
cp .env.example .env.production
```

Edit `.env.production` with your actual values:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=https://salesforce-data-cleaner.your-subdomain.workers.dev
```

## Step 6: Build and Deploy

```bash
# Build the frontend
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name salesforce-data-cleaner

# Deploy the worker (optional, for backend processing)
wrangler deploy
```

## Step 7: Configure Pages Project

After first deployment:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Pages** → **salesforce-data-cleaner**
3. Go to **Settings** → **Environment variables**
4. Add your environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_OPENAI_API_KEY` (if using AI)
   - `VITE_ANTHROPIC_API_KEY` (if using AI)

## Step 8: Set Up Automatic Deployments (Optional)

Connect your GitHub repository for automatic deployments:

1. In Pages dashboard, go to **Settings** → **Builds & deployments**
2. Connect to Git repository
3. Set build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/`

## Step 9: Test Your Deployment

Your app will be available at:
- `https://salesforce-data-cleaner.pages.dev`

Test the functionality:
1. Upload a CSV file
2. Select columns for matching
3. Configure similarity threshold
4. Process duplicates
5. Export results

## Step 10: Custom Domain (Optional)

To use your own domain:

1. In Pages dashboard, go to **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain name
4. Follow DNS configuration instructions
5. SSL certificate will be automatically provisioned

## Troubleshooting

### Common Issues:

1. **Build fails**: Check that all dependencies are installed
   ```bash
   npm install
   npm run build
   ```

2. **Environment variables not working**: Make sure they're set in Cloudflare Pages dashboard, not just locally

3. **Worker deployment fails**: Check `wrangler.toml` configuration and KV namespace ID

4. **CORS issues**: The worker includes CORS headers, but verify they match your domain

### Useful Commands:

```bash
# View deployment logs
wrangler pages deployment list

# View worker logs
wrangler tail

# Delete deployment
wrangler pages deployment delete <deployment-id>

# Update worker
wrangler deploy

# View KV data
wrangler kv:key list --binding DATA_STORE
```

## Architecture Overview

Your deployed application consists of:

1. **Cloudflare Pages**: Hosts the React frontend
2. **Cloudflare Workers**: Handles CSV processing (optional)
3. **KV Storage**: Stores processing results
4. **Supabase**: Database for persistent storage

## Performance Benefits

- **Global CDN**: Sub-100ms response times worldwide
- **Edge Computing**: Processing happens close to users
- **Automatic Scaling**: Handles traffic spikes automatically
- **Zero Cold Starts**: Workers start instantly
- **Unlimited Bandwidth**: No bandwidth charges

## Cost Estimation

Cloudflare's free tier includes:
- **Pages**: Unlimited static requests
- **Workers**: 100,000 requests/day
- **KV**: 100,000 reads/day, 1,000 writes/day

For most use cases, this will be completely free!

## Security Features

- **Automatic HTTPS**: SSL certificates managed automatically
- **DDoS Protection**: Built-in protection
- **Bot Management**: Automatic bot detection
- **WAF**: Web Application Firewall protection

## Next Steps

1. **Monitor Usage**: Check Cloudflare Analytics
2. **Optimize Performance**: Use Cloudflare's optimization features
3. **Set Up Alerts**: Monitor for errors or high usage
4. **Backup Strategy**: Regular exports of KV data
5. **Custom Domain**: Set up your branded domain

## Support

- **Cloudflare Docs**: [developers.cloudflare.com](https://developers.cloudflare.com)
- **Community**: [community.cloudflare.com](https://community.cloudflare.com)
- **Discord**: Cloudflare Developers Discord