import net from 'net';

/**
 * Attempts to establish a TCP connection to the specified host and port
 * 
 * @param host The hostname or IP address to connect to
 * @param port The port number to connect to
 * @param timeout Connection timeout in milliseconds
 * @returns Promise resolving to connection result
 */
export async function tcpConnect(host: string, port: number, timeout: number = 3000): Promise<{ success: boolean; responseTime?: number; error?: string }> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = new net.Socket();

    const timeoutHandler = setTimeout(() => {
      socket.destroy();
      resolve({
        success: false,
        error: `Connection timeout after ${timeout}ms`,
      });
    }, timeout);

    socket.connect(port, host, () => {
      clearTimeout(timeoutHandler);
      const responseTime = Date.now() - startTime;
      socket.destroy();
      resolve({
        success: true,
        responseTime,
      });
    });

    socket.on('error', (error) => {
      clearTimeout(timeoutHandler);
      socket.destroy();
      resolve({
        success: false,
        error: error.message,
      });
    });
  });
}

/**
 * Performs multiple TCP connection attempts to a host and port
 * 
 * @param host The hostname or IP address to connect to
 * @param port The port number to connect to
 * @param timeout Connection timeout in milliseconds
 * @param count Number of connection attempts
 * @param interval Interval between attempts in milliseconds
 * @returns Promise resolving to connection result with statistics
 */
export async function tcping(options: {
  host: string;
  port: number;
  timeout?: number;
  count?: number;
  interval?: number;
}) {
  const { host, port, timeout = 3000, count = 4, interval = 1000 } = options;
  const results: Array<{ success: boolean; responseTime?: number; error?: string }> = [];
  
  for (let i = 0; i < count; i++) {
    const result = await tcpConnect(host, port, timeout);
    results.push(result);
    
    if (i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, interval));
    }
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
}
