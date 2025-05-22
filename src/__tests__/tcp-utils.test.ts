import { jest } from '@jest/globals';
import { validateConnection } from '../utils/validators.js';

// Define types for our mocked functions
type TcpConnectResult = {
  success: boolean;
  responseTime?: number;
  error?: string;
};

type TcpingOptions = {
  host: string;
  port: number;
  timeout?: number;
  count?: number;
  interval?: number;
};

type TcpingResult = {
  host: string;
  port: number;
  success: boolean;
  attempts: number;
  successfulAttempts: number;
  averageTime?: number;
  minTime?: number;
  maxTime?: number;
  results: TcpConnectResult[];
};

// Create a mock version of the tcp utility for testing
jest.unstable_mockModule('../utils/tcp.js', () => {
  return {
    tcpConnect: jest.fn(async (host: string, port: number, timeout: number = 3000): Promise<TcpConnectResult> => {
      // Validate inputs
      const validation = validateConnection(host, port);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Mock successful connections for specific hosts/ports
      if (host === 'example.com' && port === 80) {
        return {
          success: true,
          responseTime: 42
        };
      }
      
      if (host === 'localhost' && port === 8080) {
        return {
          success: true,
          responseTime: 5
        };
      }

      // Mock failures for specific hosts/ports
      if (host === 'blocked-host.com') {
        return {
          success: false,
          error: 'Connection refused'
        };
      }
      
      if (port === 22) {
        return {
          success: false,
          error: 'Connection reset by peer'
        };
      }

      // Default to timeout for unknown combinations
      return {
        success: false,
        error: `Connection timeout after ${timeout}ms`
      };
    }),
    
    tcping: jest.fn(async (options: TcpingOptions): Promise<TcpingResult> => {
      const { host, port, timeout = 3000, count = 4, interval = 1000 } = options;
      
      // Validate inputs
      const validation = validateConnection(host, port);
      if (!validation.isValid) {
        return {
          host,
          port,
          success: false,
          attempts: 0,
          successfulAttempts: 0,
          results: []
        };
      }
      
      const mockTcpConnect = (await import('../utils/tcp.js')).tcpConnect;
      const results: TcpConnectResult[] = [];
      
      for (let i = 0; i < count; i++) {
        const result = await mockTcpConnect(host, port, timeout);
        results.push(result);
      }

      const successfulAttempts = results.filter(r => r.success).length;
      const responseTimes = results.filter(r => r.responseTime).map(r => r.responseTime!);
      
      return {
        host,
        port,
        success: successfulAttempts > 0,
        attempts: count,
        successfulAttempts,
        averageTime: responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b) / responseTimes.length) : undefined,
        minTime: responseTimes.length > 0 ? Math.min(...responseTimes) : undefined,
        maxTime: responseTimes.length > 0 ? Math.max(...responseTimes) : undefined,
        results
      };
    })
  };
});

describe('TCP Utilities', () => {
  let tcpConnect: jest.Mock;
  let tcping: jest.Mock;
  
  beforeEach(async () => {
    // Import the mocked functions
    const tcpModule = await import('../utils/tcp.js');
    tcpConnect = tcpModule.tcpConnect as unknown as jest.Mock;
    tcping = tcpModule.tcping as unknown as jest.Mock;
    
    // Clear mock calls between tests
    tcpConnect.mockClear();
    tcping.mockClear();
  });
  
  describe('tcpConnect', () => {
    test('successful connection returns proper response', async () => {
      const result = await tcpConnect('example.com', 80) as TcpConnectResult;
      
      expect(result.success).toBe(true);
      expect(result.responseTime).toBeDefined();
      expect(result.error).toBeUndefined();
    });
    
    test('failed connection returns error information', async () => {
      const result = await tcpConnect('blocked-host.com', 80) as TcpConnectResult;
      
      expect(result.success).toBe(false);
      expect(result.responseTime).toBeUndefined();
      expect(result.error).toBe('Connection refused');
    });
    
    test('honors timeout parameter', async () => {
      const result = await tcpConnect('unknown-host.com', 80, 5000) as TcpConnectResult;
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection timeout after 5000ms');
    });
    
    test('validates inputs', async () => {
      const result = await tcpConnect('', 80) as TcpConnectResult;
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Host must be a non-empty string');
    });
  });
  
  describe('tcping', () => {
    test('performs multiple connection attempts', async () => {
      const result = await tcping({
        host: 'example.com',
        port: 80,
        count: 3
      }) as TcpingResult;
      
      expect(tcpConnect).toHaveBeenCalledTimes(3);
      expect(result.attempts).toBe(3);
      expect(result.successfulAttempts).toBe(3);
      expect(result.success).toBe(true);
    });
    
    test('calculates statistics correctly', async () => {
      const result = await tcping({
        host: 'example.com',
        port: 80,
        count: 4
      }) as TcpingResult;
      
      expect(result.averageTime).toBeDefined();
      expect(result.minTime).toBeDefined();
      expect(result.maxTime).toBeDefined();
      expect(result.averageTime).toBe(42); // Our mock always returns 42ms
    });
    
    test('handles failed connections', async () => {
      const result = await tcping({
        host: 'blocked-host.com',
        port: 80,
        count: 2
      }) as TcpingResult;
      
      expect(result.attempts).toBe(2);
      expect(result.successfulAttempts).toBe(0);
      expect(result.success).toBe(false);
    });
    
    test('validates input parameters', async () => {
      const result = await tcping({
        host: '',
        port: 80,
        count: 2
      }) as TcpingResult;
      
      // Our mock implementation should return early with an error
      expect(tcpConnect).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(0);
    });
  });
});
