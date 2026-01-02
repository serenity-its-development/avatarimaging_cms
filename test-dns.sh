#!/bin/bash

echo "==================================="
echo "DNS & Site Connectivity Test"
echo "==================================="
echo ""

# Test DNS resolution
echo "1. DNS Resolution Test:"
echo "   Testing: crm.avatarimaging.com.au"
echo ""

# Using different DNS servers
echo "   Via System DNS:"
host crm.avatarimaging.com.au 2>&1 | head -4

echo ""
echo "   Via Google DNS (8.8.8.8):"
nslookup crm.avatarimaging.com.au 8.8.8.8 2>&1 | grep -A4 "answer:"

echo ""
echo "   Via Cloudflare DNS (1.1.1.1):"
nslookup crm.avatarimaging.com.au 1.1.1.1 2>&1 | grep -A4 "answer:"

echo ""
echo "==================================="
echo "2. HTTP/HTTPS Connectivity Test:"
echo "==================================="
echo ""

# Test HTTP
echo "   Testing HTTP (should redirect):"
curl -s -o /dev/null -w "   Status: %{http_code}\n   Redirect: %{redirect_url}\n" http://crm.avatarimaging.com.au

echo ""

# Test HTTPS
echo "   Testing HTTPS (should be 200):"
curl -s -o /dev/null -w "   Status: %{http_code}\n   Size: %{size_download} bytes\n   Type: %{content_type}\n" https://crm.avatarimaging.com.au

echo ""
echo "==================================="
echo "3. Content Test:"
echo "==================================="
echo ""

# Get first line of HTML
echo "   First line of HTML:"
curl -s https://crm.avatarimaging.com.au 2>&1 | head -1
echo ""

# Test asset
echo "   Testing JS asset:"
curl -s -o /dev/null -w "   Status: %{http_code}, Size: %{size_download} bytes\n" https://crm.avatarimaging.com.au/assets/index-CFHcVHWf.js

echo ""
echo "==================================="
echo "4. SSL Certificate Test:"
echo "==================================="
echo ""

echo "   Certificate info:"
echo "" | openssl s_client -servername crm.avatarimaging.com.au -connect crm.avatarimaging.com.au:443 2>/dev/null | openssl x509 -noout -issuer -subject -dates 2>/dev/null

echo ""
echo "==================================="
echo "Summary:"
echo "==================================="
echo ""

# Overall test
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://crm.avatarimaging.com.au)

If [ "$HTTP_CODE" = "200" ]; then
    echo "✅ SITE IS WORKING!"
    echo "   URL: https://crm.avatarimaging.com.au"
    echo "   Status: $HTTP_CODE OK"
    echo ""
    echo "If you still see 404 in browser:"
    echo "   1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)"
    echo "   2. Try incognito/private window"
    echo "   3. Flush DNS cache on your computer"
else
    echo "❌ SITE ISSUE DETECTED"
    echo "   Status: $HTTP_CODE"
    echo "   Check Cloudflare dashboard"
fi

echo ""
