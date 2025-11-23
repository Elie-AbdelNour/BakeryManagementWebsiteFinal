# Bakery Management System - Deployment Checklist

## ✅ Pre-Deployment Completed

### Security

- ✅ Helmet middleware configured for security headers
- ✅ Rate limiting added (100 requests/15min for API, 10 requests/15min for auth)
- ✅ CORS configured with environment-based origins
- ✅ Body parser limits set (10mb for JSON and URL-encoded)
- ✅ JWT authentication with HTTP-only cookies

### Configuration

- ✅ `.env.example` template created
- ✅ `.gitignore` updated (excludes node_modules, .env, uploads, invoices, logs)
- ✅ `package.json` configured with:
  - Start script: `node server.js`
  - Dev script: `nodemon server.js`
  - Node engine: >=14.0.0
  - NPM engine: >=6.0.0
  - Project metadata (name, version, description, license)

### File Structure

- ✅ `uploads/products/` directory exists
- ✅ `invoices/` directory exists
- ✅ Static files properly served from `/FrontEnd`

## 📋 Before Deployment

### 1. Environment Setup

- [ ] Copy `.env.example` to `.env` on production server
- [ ] Set production database credentials
- [ ] Generate strong JWT_SECRET (use `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- [ ] Configure email service credentials
- [ ] Set `NODE_ENV=production`
- [ ] Set `FRONTEND_URL` to your production domain

### 2. Database Setup

- [ ] Create MySQL database on production server
- [ ] Run database schema (create tables: users, products, orders, order_details, cart_items, reviews)
- [ ] Add unique constraint: `ALTER TABLE cart_items ADD UNIQUE KEY unique_user_product (user_id, product_id);`
- [ ] Ensure `total_amount` column exists in orders table
- [ ] Seed initial admin user

### 3. Security Review

- [ ] Review CORS `allowedOrigins` in `app.js` - update for production domain
- [ ] Verify helmet CSP settings if using inline scripts
- [ ] Check rate limiting values are appropriate
- [ ] Ensure no sensitive data in code/logs
- [ ] Review file upload size limits (currently 5MB)

### 4. Testing

- [ ] Test all features locally with production build
- [ ] Test authentication flow (login, OTP, JWT)
- [ ] Test file uploads (products, images)
- [ ] Test order workflow (cart → order → status updates → delivery)
- [ ] Test review system (only for delivered orders)
- [ ] Test role-based access (customer, driver, admin)
- [ ] Test rate limiting behavior
- [ ] Test email notifications

### 5. Platform-Specific Setup

#### For Heroku:

```bash
heroku create your-bakery-app
heroku addons:create jawsdb:kitefin  # MySQL addon
heroku config:set NODE_ENV=production JWT_SECRET=your_secret
git push heroku main
heroku open
```

#### For Railway:

```bash
railway login
railway init
railway add mysql  # Add MySQL service
railway up
```

#### For Render:

- Create new Web Service
- Connect GitHub repository
- Set build command: `npm install`
- Set start command: `node server.js`
- Add environment variables from `.env.example`
- Add MySQL database service

#### For VPS (DigitalOcean/AWS):

```bash
# Install Node.js and MySQL
# Clone repository
npm install --production
# Setup PM2 for process management
npm install -g pm2
pm2 start server.js --name bakery-api
pm2 startup
pm2 save
# Setup nginx reverse proxy
# Configure SSL with Let's Encrypt
```

## 🚀 Deployment Steps

1. **Push to Git:**

   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Deploy to Platform:** Follow platform-specific steps above

3. **Configure Environment:** Set all environment variables on hosting platform

4. **Database Migration:** Run SQL schema on production database

5. **Verify Deployment:**
   - Check `/api/health` endpoint
   - Test login functionality
   - Verify file uploads work
   - Check logs for errors

## 📝 Post-Deployment

- [ ] Monitor error logs
- [ ] Set up database backups
- [ ] Configure SSL certificate
- [ ] Set up monitoring (UptimeRobot, New Relic, etc.)
- [ ] Document production URL and admin credentials
- [ ] Test email delivery
- [ ] Monitor rate limiting effectiveness

## 🔧 Recommended Tools

- **Process Manager:** PM2 (for VPS)
- **Monitoring:** New Relic, DataDog, or PM2 Plus
- **Logging:** Winston or Morgan with file rotation
- **Database Backups:** Automated MySQL backups
- **SSL:** Let's Encrypt (free) or Cloudflare

## 📞 Support

For issues during deployment:

- Check logs: `pm2 logs bakery-api` (VPS) or platform logs
- Verify environment variables are set
- Ensure database connection is working
- Check firewall/security group settings for port access
