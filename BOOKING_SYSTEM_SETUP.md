# Public Booking System Setup Guide

## Overview
Your public booking widget is now live at:
- **Main URL**: https://avatarimaging_cms.mona-08d.workers.dev/book
- **Custom Subdomain**: https://book.avatarimaging.com.au/book

## Features Implemented
✅ 3-step booking flow (Date → Time → Details → Confirmation)
✅ Real-time availability checking
✅ Professional email confirmations (Resend API)
✅ SMS confirmations (MobileMessage API)
✅ Automatic contact creation/matching
✅ Mobile responsive design
✅ Avatar Imaging branding

## Setup Steps

### 1. Configure Email Confirmations (Resend API)

**Get your Resend API key:**
1. Sign up at https://resend.com
2. Verify your domain (bookings@avatarimaging.com.au)
3. Create an API key

**Set the secret:**
```bash
export CLOUDFLARE_API_TOKEN=jy_1Mz08hOoJAziZ5E0CsEehCeDHYNjeYTButWy8
npx wrangler secret put RESEND_API_KEY --env=""
# Paste your Resend API key when prompted
```

### 2. Configure SMS Confirmations (MobileMessage API)

**Get your MobileMessage API key:**
1. Login to your MobileMessage account
2. Get your API key from dashboard
3. Update the phone number in wrangler.toml

**Set the secret:**
```bash
npx wrangler secret put MOBILEMESSAGE_API_KEY --env=""
# Paste your MobileMessage API key when prompted
```

**Update the from number in wrangler.toml:**
```toml
SMS_FROM_NUMBER = "+61412345678"  # Your actual number
MOBILEMESSAGE_FROM_NUMBER = "+61412345678"
```

Then redeploy:
```bash
export CLOUDFLARE_API_TOKEN=jy_1Mz08hOoJAziZ5E0CsEehCeDHYNjeYTButWy8
npx wrangler deploy --env=""
```

### 3. Embed in Wix

**Option A: iframe Embed (Recommended for now)**

1. Add an HTML iframe element to your Wix page
2. Use this code:

```html
<iframe
  src="https://book.avatarimaging.com.au/book"
  width="100%"
  height="900px"
  frameborder="0"
  style="border: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"
></iframe>
```

3. Position and style the iframe to match your Wix design

**Option B: Full Page Redirect**

Simply link to: https://book.avatarimaging.com.au/book

**Option C: Custom Wix Velo Integration (Future)**

For perfect styling integration, we can build a Wix Velo app that:
- Matches your exact Wix theme
- Uses Wix's native form components
- Sends bookings to your CRM API
- Requires Wix development work

## Email Template Customization

The email template includes:
- Avatar Imaging logo and branding
- Appointment details card
- Important notes section
- Contact buttons (Contact Us, Book Another)

To customize the email:
1. Edit [src/services/EmailService.ts](src/services/EmailService.ts)
2. Update the `generateBookingConfirmationHTML()` method
3. Change phone number, address, or styling
4. Redeploy the worker

## SMS Template Customization

Current SMS format:
```
Hi {name}, your {service} appointment is confirmed for {date} at {time}.
Booking ID: {id}. Avatar Imaging
```

To customize:
1. Edit [src/router/Router.ts](src/router/Router.ts#L308)
2. Update the `smsMessage` variable
3. Keep under 160 characters to avoid splitting
4. Redeploy the worker

## Testing the Booking System

### Test the public booking page:
1. Visit: https://book.avatarimaging.com.au/book
2. Select a service type
3. Choose a date and time
4. Fill in your details
5. Submit the booking

### Check confirmations:
- Email should arrive within seconds (check spam folder initially)
- SMS should arrive within seconds (if API key is configured)
- Booking should appear in CRM under Bookings page

### View booking in CRM:
1. Visit: https://crm.avatarimaging.com.au/bookings
2. Filter by "public_widget" source
3. View contact details (tagged with "online_booking")

## Availability Configuration

Current settings:
- **Operating hours**: 9:00 AM - 5:00 PM
- **Slot duration**: 30 minutes
- **Time slots**: Every 30 minutes (9:00, 9:30, 10:00, etc.)

To customize:
1. Edit [src/router/Router.ts](src/router/Router.ts#L319-L323)
2. Change hours or interval
3. Redeploy the worker

## Service Types

Current services:
- Skin Cancer Screening
- Medical Imaging
- General Consultation
- Follow-up Appointment

To add/modify services:
1. Edit [src/frontend/pages/PublicBooking.tsx](src/frontend/pages/PublicBooking.tsx#L42-L47)
2. Add your service to the dropdown
3. Rebuild and redeploy: `npm run build && npx wrangler deploy --env=""`

## Troubleshooting

### Email not sending
- Check RESEND_API_KEY is set: `npx wrangler secret list --env=""`
- Verify domain in Resend dashboard
- Check worker logs: `npx wrangler tail --env=""`
- Look for "Email sent successfully" or error messages

### SMS not sending
- Check MOBILEMESSAGE_API_KEY is set
- Verify phone number format (+61 prefix)
- Check worker logs for errors
- Ensure you have SMS credits

### Booking not appearing in CRM
- Check network tab in browser for API errors
- Verify database migrations are applied
- Check worker logs: `npx wrangler tail --env=""`

### Availability showing incorrect times
- Ensure timezone is correct in the code (currently using UTC)
- Consider adding timezone conversion for AU/Sydney
- Check existing bookings aren't blocking slots

## Next Steps (Optional Enhancements)

1. **Calendar Integration (.ics files)**
   - Send calendar invites with email confirmations
   - Allow adding to Google Calendar, Outlook, etc.

2. **Reminder System**
   - Send reminders 24 hours before appointment
   - Send reminder 1 hour before appointment
   - Use Cloudflare Cron triggers

3. **Online Payment Integration**
   - Integrate Stripe for deposits or full payment
   - Reduce no-shows with payment requirement
   - Automatic refund handling

4. **Cancellation/Rescheduling**
   - Add unique booking links to emails
   - Allow customers to cancel or reschedule
   - Update CRM automatically

5. **Multi-location Support**
   - Add location selector to booking form
   - Different availability per location
   - Location-specific email templates

6. **Staff Assignment**
   - Allow customers to choose preferred staff
   - Auto-assign based on availability
   - Staff-specific calendars

## Support

For technical issues or questions:
- Check worker logs: `npx wrangler tail --env=""`
- Review this documentation
- Check the code in:
  - [src/frontend/pages/PublicBooking.tsx](src/frontend/pages/PublicBooking.tsx) - Frontend UI
  - [src/router/Router.ts](src/router/Router.ts) - Backend API
  - [src/services/EmailService.ts](src/services/EmailService.ts) - Email templates

## Deployment Commands Reference

```bash
# Set API token (required for all commands)
export CLOUDFLARE_API_TOKEN=jy_1Mz08hOoJAziZ5E0CsEehCeDHYNjeYTButWy8

# Deploy
npx wrangler deploy --env=""

# View logs
npx wrangler tail --env=""

# List secrets
npx wrangler secret list --env=""

# Set a secret
npx wrangler secret put SECRET_NAME --env=""

# Build frontend
npm run build

# Test locally
npm run dev
```

## URLs Quick Reference

- **CRM Dashboard**: https://crm.avatarimaging.com.au
- **Public Booking**: https://book.avatarimaging.com.au/book
- **Worker API**: https://avatarimaging_cms.mona-08d.workers.dev
- **Resend Dashboard**: https://resend.com/emails
- **Cloudflare Dashboard**: https://dash.cloudflare.com

---

**Status**: ✅ System deployed and ready to use!
**Next**: Configure RESEND_API_KEY and MOBILEMESSAGE_API_KEY to enable email/SMS confirmations.
