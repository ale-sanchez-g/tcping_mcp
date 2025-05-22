/**
 * Validates if a string is a valid hostname or IP address
 * 
 * @param host The hostname or IP address to validate
 * @returns boolean indicating if the host is valid
 */
export function isValidHost(host: string): boolean {
  if (!host || typeof host !== 'string') {
    return false;
  }
  
  // Manually validate IPv4 to ensure octet ranges and format are correct
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = host.match(ipv4Pattern);
  
  if (ipv4Match) {
    // Check for exactly 4 octets
    if (ipv4Match[0].split('.').length !== 4) {
      return false;
    }
    
    // Validate each octet
    for (let i = 1; i <= 4; i++) {
      const octet = parseInt(ipv4Match[i], 10);
      if (octet < 0 || octet > 255) {
        return false;
      }
    }
    return true;
  }
  
  // Simple IPv6 regex (not exhaustive, but catches common cases)
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  
  if (ipv6Regex.test(host)) {
    return true;
  }
  
  // Check for incomplete IPv4 addresses
  if (/^(\d{1,3}\.){0,3}\d{1,3}$/.test(host) && host.split('.').length < 4) {
    return false;
  }
  
  // Check for IPv4 with too many octets
  if (/^(\d{1,3}\.){4,}\d{1,3}$/.test(host)) {
    return false;
  }
  
  // Check if it's a valid hostname
  // Simplified hostname regex
  const hostnameRegex = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;
  
  return hostnameRegex.test(host);
}

/**
 * Validates if a number is a valid port
 * 
 * @param port The port number to validate
 * @returns boolean indicating if the port is valid
 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * Validates connection parameters
 * 
 * @param host The hostname or IP address
 * @param port The port number
 * @returns Object containing validation result and any error message
 */
export function validateConnection(host: string, port: number): { isValid: boolean; error?: string } {
  if (!host || typeof host !== 'string') {
    return { isValid: false, error: 'Host must be a non-empty string' };
  }
  
  if (!isValidHost(host)) {
    return { isValid: false, error: 'Invalid hostname or IP address format' };
  }
  
  if (!isValidPort(port)) {
    return { isValid: false, error: 'Port must be an integer between 1 and 65535' };
  }
  
  return { isValid: true };
}
