#!/bin/bash

# Add DNS record for crm.avatarimaging.com.au
# This script adds a CNAME record pointing to the Workers frontend

set -e

# Configuration
DOMAIN="avatarimaging.com.au"
SUBDOMAIN="crm"
TARGET="avatarimaging-crm.mona-08d.workers.dev"
PROXIED=true

# Get Zone ID
echo "🔍 Getting zone ID for ${DOMAIN}..."
ZONE_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=${DOMAIN}" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" | jq -r '.result[0].id')

if [ "$ZONE_ID" == "null" ] || [ -z "$ZONE_ID" ]; then
  echo "❌ Error: Could not find zone for ${DOMAIN}"
  echo "Make sure the domain is added to your Cloudflare account"
  exit 1
fi

echo "✅ Zone ID: ${ZONE_ID}"

# Check if DNS record already exists
echo "🔍 Checking if DNS record already exists..."
EXISTING_RECORD=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${SUBDOMAIN}.${DOMAIN}" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" | jq -r '.result[0].id')

if [ "$EXISTING_RECORD" != "null" ] && [ -n "$EXISTING_RECORD" ]; then
  echo "⚠️  DNS record already exists (ID: ${EXISTING_RECORD})"
  echo "🔄 Updating existing record..."

  # Update existing record
  RESPONSE=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${EXISTING_RECORD}" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "{
      \"type\": \"CNAME\",
      \"name\": \"${SUBDOMAIN}\",
      \"content\": \"${TARGET}\",
      \"ttl\": 1,
      \"proxied\": ${PROXIED}
    }")

  SUCCESS=$(echo "$RESPONSE" | jq -r '.success')

  if [ "$SUCCESS" == "true" ]; then
    echo "✅ DNS record updated successfully!"
  else
    echo "❌ Error updating DNS record:"
    echo "$RESPONSE" | jq .
    exit 1
  fi
else
  echo "➕ Creating new DNS record..."

  # Create new record
  RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "{
      \"type\": \"CNAME\",
      \"name\": \"${SUBDOMAIN}\",
      \"content\": \"${TARGET}\",
      \"ttl\": 1,
      \"proxied\": ${PROXIED}
    }")

  SUCCESS=$(echo "$RESPONSE" | jq -r '.success')

  if [ "$SUCCESS" == "true" ]; then
    RECORD_ID=$(echo "$RESPONSE" | jq -r '.result.id')
    echo "✅ DNS record created successfully!"
    echo "   Record ID: ${RECORD_ID}"
  else
    echo "❌ Error creating DNS record:"
    echo "$RESPONSE" | jq .
    exit 1
  fi
fi

# Display DNS record details
echo ""
echo "📋 DNS Record Details:"
echo "   Type:    CNAME"
echo "   Name:    ${SUBDOMAIN}.${DOMAIN}"
echo "   Target:  ${TARGET}"
echo "   Proxied: ${PROXIED}"
echo "   TTL:     Auto"
echo ""
echo "🌐 Your CRM will be available at:"
echo "   https://${SUBDOMAIN}.${DOMAIN}"
echo ""
echo "⏱️  DNS propagation may take 1-5 minutes"
echo "   Test with: curl -I https://${SUBDOMAIN}.${DOMAIN}"
echo ""
echo "✅ Done!"
