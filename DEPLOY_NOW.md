# LineOA SaaS - Deploy to Production NOW

**Goal**: Get your app live in 30 minutes

---

## Step 1: Prepare MongoDB (5 minutes)

### Option A: Free (MongoDB Atlas)

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up (free account)
3. Create a **free cluster**
   - Choose region closest to you
   - Name it: `lineoa-saas`
4. Create a **database user**
   - Username: `saasadmin`
   - Password: Generate strong password (save it!)
5. Get your connection string:
   - Click "Connect"
   - Choose "Drivers"
   - Copy the URI: `mongodb+srv://saasadmin:PASSWORD@cluster.mongodb.net/lineoa`
   - Replace `PASSWORD` with your actual password
6. Whitelist your IP:
   - Go to "Network Access"
   - Add IP: `0.0.0.0/0` (allow all for now)
   - Later you can restrict to Vercel IPs

**Save this connection string** - you'll need it in Step 3.

### Option B: Paid (Recommended for Production)
Use MongoDB Atlas shared cluster (starts at $9/month) for better performance.

---

## Step 2: Verify Local Build Works (2 minutes)

```bash
cd /Users/madeinheaven/Work/PROJECTS/lineoa-saas

# Build the project
npm run build

# Check for errors
echo "If no errors above, you're good to deploy!"
```

**Expected output:**
```
✓ Compiled successfully in 7.3s
✓ Generating static pages...
✓ Finalizing page optimization...

Route (app)
├ ○ /
├ ○ /dashboard
...
```

---

## Step 3: Choose Deployment Platform

### OPTION A: Vercel (EASIEST - 10 minutes)

Vercel is the creator of Next.js - best choice for this project.

#### 3A.1: Connect GitHub

1. Push your code to GitHub:
```bash
cd /Users/madeinheaven/Work/PROJECTS/lineoa-saas

# Initialize git if not already
git init
git add .
git commit -m "Initial LineOA SaaS deployment"

# Create repo on GitHub.com
# Then push
git remote add origin https://github.com/YOUR_USERNAME/lineoa-saas.git
git branch -M main
git push -u origin main
```

2. Go to https://vercel.com
3. Sign up (GitHub auth is easiest)
4. Click "New Project"
5. Select your `lineoa-saas` repository
6. Click "Import"

#### 3A.2: Set Environment Variables

1. In Vercel dashboard, go to your project
2. Click "Settings" → "Environment Variables"
3. Add these variables:

```
MONGODB_URI = mongodb+srv://saasadmin:PASSWORD@cluster.mongodb.net/lineoa
JWT_SECRET = generate_a_random_string_here_at_least_32_characters
NODE_ENV = production
```

**To generate JWT_SECRET**, run this:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. Click "Save"

#### 3A.3: Deploy

1. Vercel automatically deploys on push
2. Or click "Deploy" button in dashboard
3. Wait 2-3 minutes for deployment to complete
4. Get your live URL: https://lineoa-saas.vercel.app (example)

**Done! Your app is live!** ✅

---

### OPTION B: Self-Hosted (Heroku - 15 minutes)

If you prefer not to use Vercel:

1. Create Heroku account: https://heroku.com
2. Create new app:
   ```bash
   npm install -g heroku
   heroku login
   heroku create lineoa-saas
   ```

3. Set environment variables:
   ```bash
   heroku config:set MONGODB_URI="mongodb+srv://..."
   heroku config:set JWT_SECRET="your-secret-here"
   heroku config:set NODE_ENV="production"
   ```

4. Deploy:
   ```bash
   git push heroku main
   ```

5. View live:
   ```bash
   heroku open
   ```

---

### OPTION C: AWS / DigitalOcean / VPS

More complex, skip for now. Deploy to Vercel first, then migrate later if needed.

---

## Step 4: Test Your Production Deployment (5 minutes)

1. **Visit your live domain**
   - Example: https://lineoa-saas.vercel.app
   - You should see the landing page

2. **Test Sign-Up**
   - Click "Get Started Free"
   - Fill in: 
     - Shop Name: "Test Shop"
     - Email: "test@example.com"
     - Password: "TestPassword123"
   - Click "Create Shop Account"
   - Should redirect to dashboard
   - ✅ If this works, deployment is successful!

3. **Test Products**
   - In dashboard, go to "Products" tab
   - Click "Add Product"
   - Fill in test product
   - Save
   - Visit your storefront URL
   - ✅ Product should appear

4. **Test Data Isolation** (Optional but important)
   - Sign up as 2nd merchant
   - Create different product
   - Verify 1st merchant can't see 2nd merchant's product
   - ✅ Complete isolation confirmed

---

## Step 5: Configure Custom Domain (10 minutes - OPTIONAL)

### If using Vercel:

1. In Vercel dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add your domain (e.g., `lineoa.com`)
4. Follow DNS setup instructions
5. Wait for DNS propagation (usually 24 hours)

### If using Heroku:

```bash
heroku domains:add lineoa.com
```

Then update DNS with Heroku's details.

---

## Step 6: Monitor Your Deployment

### Vercel (Easiest)
- **Logs**: Dashboard → "Analytics" or "Logs" tab
- **Errors**: Check "Deployments" tab
- **Monitoring**: Built-in analytics

### Heroku
```bash
heroku logs --tail
```

### What to monitor:
- ✅ App loads without errors
- ✅ Sign-up works
- ✅ MongoDB connection successful
- ✅ No 500 errors in logs

---

## Common Issues & Fixes

### ❌ "MongoDB connection error"
**Solution:**
1. Verify `MONGODB_URI` is correct (copy from MongoDB Atlas)
2. Check that your IP is whitelisted in MongoDB (Network Access)
3. Verify `saasadmin` user exists in MongoDB
4. Check password doesn't have special characters that need escaping

### ❌ "JWT validation failed"
**Solution:**
1. Make sure `JWT_SECRET` is set in production env vars
2. Check it matches what you set (no typos)
3. Try signing up again (new JWT will be generated)

### ❌ "Site won't load"
**Solution:**
1. Check Vercel/Heroku logs for errors
2. Verify all environment variables are set
3. Try redeploying: `git push vercel main` (Vercel) or `git push heroku main` (Heroku)

### ❌ "Products won't save"
**Solution:**
1. Check MongoDB connection in logs
2. Verify database has proper permissions
3. Check that `runtime = 'nodejs'` is set in API routes

---

## Success Checklist

- ☑️ MongoDB cluster created and connected
- ☑️ Local build succeeds (`npm run build`)
- ☑️ Deployed to Vercel or Heroku
- ☑️ Environment variables set in production
- ☑️ Landing page loads at your domain
- ☑️ Sign-up works
- ☑️ Can create products
- ☑️ Storefront displays correctly
- ☑️ Data isolation verified (2+ merchants)
- ☑️ No errors in production logs

---

## What Happens Next After Deployment?

### Week 1:
- ✅ App is live
- ✅ You can test as a user
- ✅ Share link with friends for feedback

### Week 2:
- → Customize branding (logo, colors, text)
- → Configure LINE OA credentials (if using)
- → Set up PromptPay IDs

### Week 3:
- → Start marketing to potential customers
- → Onboard first merchants
- → Gather feedback

### Month 2:
- → Iterate based on user feedback
- → Add more features
- → Optimize performance

---

## Quick Command Reference

```bash
# Build locally
npm run build

# Start dev server
npm run dev

# Deploy to Vercel
vercel --prod

# Deploy to Heroku
git push heroku main

# Check Vercel logs
vercel logs

# Check Heroku logs
heroku logs --tail

# See environment variables
heroku config
```

---

## You're Ready!

Your LineOA SaaS platform is production-ready. Follow these steps and you'll be live within 30 minutes.

**Next Action**: 
1. Create MongoDB Atlas cluster (5 min)
2. Set up Vercel/Heroku (5 min)
3. Deploy (5 min)
4. Test (5 min)
5. **You're Live!** 🚀

---

## Support

If you get stuck:
1. Check the error messages in logs
2. Review DEPLOYMENT_GUIDE.md for more details
3. Verify MongoDB connection string
4. Verify all environment variables are set correctly

Good luck! 🚀
