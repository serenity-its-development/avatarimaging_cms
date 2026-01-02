/**
 * IP Address Utilities
 * Supports IPv4 and IPv6 CIDR matching for IP whitelist
 */

/**
 * Check if an IP address matches a CIDR range
 * Supports both IPv4 and IPv6
 *
 * Examples:
 * - isIPInCIDR('192.168.1.5', '192.168.1.0/24') => true
 * - isIPInCIDR('10.0.0.1', '192.168.1.0/24') => false
 * - isIPInCIDR('2001:db8::1', '2001:db8::/32') => true
 */
export function isIPInCIDR(ip: string, cidr: string): boolean {
  const version = getIPVersion(ip)

  if (version === 4) {
    return isIPv4InCIDR(ip, cidr)
  } else if (version === 6) {
    return isIPv6InCIDR(ip, cidr)
  }

  return false
}

/**
 * Detect IP version (4 or 6)
 */
export function getIPVersion(ip: string): 4 | 6 | null {
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
    return 4
  } else if (/^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/.test(ip)) {
    return 6
  }
  return null
}

/**
 * Check if IPv4 address is in CIDR range
 */
function isIPv4InCIDR(ip: string, cidr: string): boolean {
  const [range, bits = '32'] = cidr.split('/')
  const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1)

  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(range) & mask)
}

/**
 * Convert IPv4 address to integer
 */
function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((int, oct) => (int << 8) + parseInt(oct, 10), 0) >>> 0
}

/**
 * Check if IPv6 address is in CIDR range
 * Simplified implementation - for production, use ip-address library
 */
function isIPv6InCIDR(ip: string, cidr: string): boolean {
  const [range, bits = '128'] = cidr.split('/')

  // Expand both IP and range to full format
  const ipExpanded = expandIPv6(ip)
  const rangeExpanded = expandIPv6(range)

  // Convert to binary strings
  const ipBinary = ipv6ToBinary(ipExpanded)
  const rangeBinary = ipv6ToBinary(rangeExpanded)

  // Compare first N bits
  const prefixLength = parseInt(bits, 10)
  return ipBinary.substring(0, prefixLength) === rangeBinary.substring(0, prefixLength)
}

/**
 * Expand IPv6 address to full format
 * Example: 2001:db8::1 => 2001:0db8:0000:0000:0000:0000:0000:0001
 */
function expandIPv6(ip: string): string {
  // Handle :: compression
  if (ip.includes('::')) {
    const [left, right] = ip.split('::')
    const leftParts = left ? left.split(':') : []
    const rightParts = right ? right.split(':') : []
    const missingParts = 8 - leftParts.length - rightParts.length

    const middleParts = Array(missingParts).fill('0000')
    const allParts = [...leftParts, ...middleParts, ...rightParts]

    return allParts.map(part => part.padStart(4, '0')).join(':')
  }

  // Already expanded or needs padding
  return ip.split(':').map(part => part.padStart(4, '0')).join(':')
}

/**
 * Convert IPv6 address to binary string
 */
function ipv6ToBinary(ip: string): string {
  return ip
    .split(':')
    .map(hex => parseInt(hex, 16).toString(2).padStart(16, '0'))
    .join('')
}

/**
 * Validate CIDR notation
 */
export function isValidCIDR(cidr: string): boolean {
  const [ip, bits] = cidr.split('/')

  if (!bits) return false

  const version = getIPVersion(ip)
  const maxBits = version === 4 ? 32 : version === 6 ? 128 : 0

  const numBits = parseInt(bits, 10)
  return numBits >= 0 && numBits <= maxBits
}

/**
 * Normalize IP address (remove IPv6 compression, etc.)
 */
export function normalizeIP(ip: string): string {
  const version = getIPVersion(ip)

  if (version === 6) {
    return expandIPv6(ip)
  }

  return ip
}
