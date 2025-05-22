import { jest } from '@jest/globals';
import { isValidHost, isValidPort, validateConnection } from '../utils/validators';

describe('TCP Validation Utilities', () => {
  describe('isValidHost', () => {
    test('valid IPv4 addresses return true', () => {
      expect(isValidHost('192.168.1.1')).toBe(true);
      expect(isValidHost('10.0.0.1')).toBe(true);
      expect(isValidHost('127.0.0.1')).toBe(true);
      expect(isValidHost('255.255.255.255')).toBe(true);
    });
    
    test('invalid IPv4 addresses return false', () => {
      // The regex we're using allows values over 255, but for basic tests this is acceptable
      // In a production environment, you would want a more robust validation
      expect(isValidHost('300.0.0.1')).toBe(false);
      expect(isValidHost('192.168.1')).toBe(false);
      expect(isValidHost('192.168.1.1.1')).toBe(false);
      expect(isValidHost('192.168.1.-1')).toBe(false);
    });
    
    test('valid hostnames return true', () => {
      expect(isValidHost('localhost')).toBe(true);
      expect(isValidHost('example.com')).toBe(true);
      expect(isValidHost('sub.example.com')).toBe(true);
      expect(isValidHost('sub-domain.example.com')).toBe(true);
    });
    
    test('invalid hostnames return false', () => {
      expect(isValidHost('')).toBe(false);
      expect(isValidHost('example..com')).toBe(false);
      expect(isValidHost('-example.com')).toBe(false);
      expect(isValidHost('example-.com')).toBe(false);
    });
  });
  
  describe('isValidPort', () => {
    test('valid ports return true', () => {
      expect(isValidPort(1)).toBe(true);
      expect(isValidPort(80)).toBe(true);
      expect(isValidPort(443)).toBe(true);
      expect(isValidPort(8080)).toBe(true);
      expect(isValidPort(65535)).toBe(true);
    });
    
    test('invalid ports return false', () => {
      expect(isValidPort(0)).toBe(false);
      expect(isValidPort(-1)).toBe(false);
      expect(isValidPort(65536)).toBe(false);
      expect(isValidPort(80.5)).toBe(false);
      expect(isValidPort(NaN)).toBe(false);
    });
  });
  
  describe('validateConnection', () => {
    test('valid connection parameters return isValid=true', () => {
      expect(validateConnection('192.168.1.1', 80)).toEqual({ isValid: true });
      expect(validateConnection('example.com', 443)).toEqual({ isValid: true });
    });
    
    test('invalid host returns appropriate error', () => {
      // For an empty string, validateConnection returns "Host must be a non-empty string"
      expect(validateConnection('', 80)).toEqual({ 
        isValid: false, 
        error: 'Host must be a non-empty string' 
      });
      
      // For IP address with invalid octet (over 255)
      expect(validateConnection('300.0.0.1', 80)).toEqual({ 
        isValid: false, 
        error: 'Invalid hostname or IP address format'
      });
    });
    
    test('invalid port returns appropriate error', () => {
      expect(validateConnection('example.com', 0)).toEqual({ 
        isValid: false, 
        error: 'Port must be an integer between 1 and 65535'
      });
      
      expect(validateConnection('example.com', 65536)).toEqual({ 
        isValid: false, 
        error: 'Port must be an integer between 1 and 65535'
      });
    });
    
    test('handles non-string host', () => {
      // @ts-ignore: Testing invalid input type
      expect(validateConnection(123, 80)).toEqual({ 
        isValid: false, 
        error: 'Host must be a non-empty string'
      });
      
      // @ts-ignore: Testing invalid input type
      expect(validateConnection(null, 80)).toEqual({ 
        isValid: false, 
        error: 'Host must be a non-empty string'
      });
    });
  });
});
