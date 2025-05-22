#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "child_process";
import { promisify } from "util";
import net from "net";

interface TcpingOptions {
  host: string;
  port: number;
  timeout?: number;
  count?: number;
  interval?: number;
}

interface TcpingResult {
  host: string;
  port: number;
  success: boolean;
  responseTime?: number;
  error?: string;
  attempts: number;
  successfulAttempts: number;
  averageTime?: number;
  minTime?: number;
  maxTime?: number;
}

class TcpingMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server({
        name: "tcping-mcp",
        version: "1.0.0",
        capabilities: {
          tools: {},
        },
      });

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "tcping",
            description: "Test TCP connectivity to a host and port using tcping-like functionality",
            inputSchema: {
              type: "object",
              properties: {
                host: {
                  type: "string",
                  description: "Target hostname or IP address",
                },
                port: {
                  type: "number",
                  description: "Target port number",
                },
                timeout: {
                  type: "number",
                  description: "Connection timeout in milliseconds (default: 3000)",
                  default: 3000,
                },
                count: {
                  type: "number",
                  description: "Number of connection attempts (default: 4)",
                  default: 4,
                },
                interval: {
                  type: "number",
                  description: "Interval between attempts in milliseconds (default: 1000)",
                  default: 1000,
                },
              },
              required: ["host", "port"],
            },
          },
          {
            name: "validate_firewall_rule",
            description: "Validate firewall connectivity by testing multiple host:port combinations",
            inputSchema: {
              type: "object",
              properties: {
                rules: {
                  type: "array",
                  description: "Array of firewall rules to validate",
                  items: {
                    type: "object",
                    properties: {
                      name: {
                        type: "string",
                        description: "Rule name or description",
                      },
                      host: {
                        type: "string",
                        description: "Target hostname or IP address",
                      },
                      port: {
                        type: "number",
                        description: "Target port number",
                      },
                      expected: {
                        type: "boolean",
                        description: "Expected connectivity result (true = should connect, false = should be blocked)",
                      },
                    },
                    required: ["name", "host", "port", "expected"],
                  },
                },
                timeout: {
                  type: "number",
                  description: "Connection timeout in milliseconds (default: 3000)",
                  default: 3000,
                },
              },
              required: ["rules"],
            },
          },
          {
            name: "network_scan",
            description: "Scan a range of ports on a target host",
            inputSchema: {
              type: "object",
              properties: {
                host: {
                  type: "string",
                  description: "Target hostname or IP address",
                },
                startPort: {
                  type: "number",
                  description: "Starting port number",
                },
                endPort: {
                  type: "number",
                  description: "Ending port number",
                },
                timeout: {
                  type: "number",
                  description: "Connection timeout in milliseconds (default: 1000)",
                  default: 1000,
                },
              },
              required: ["host", "startPort", "endPort"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "tcping":
            return await this.handleTcping(args as unknown as TcpingOptions);
          case "validate_firewall_rule":
            return await this.handleFirewallValidation(args);
          case "network_scan":
            return await this.handleNetworkScan(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    });
  }

  private async tcpConnect(host: string, port: number, timeout: number = 3000): Promise<{ success: boolean; responseTime?: number; error?: string }> {
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

  private async handleTcping(options: TcpingOptions) {
    const { host, port, timeout = 3000, count = 4, interval = 1000 } = options;
    const results: Array<{ success: boolean; responseTime?: number; error?: string }> = [];
    
    for (let i = 0; i < count; i++) {
      const result = await this.tcpConnect(host, port, timeout);
      results.push(result);
      
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    const successfulAttempts = results.filter(r => r.success).length;
    const responseTimes = results.filter(r => r.responseTime).map(r => r.responseTime!);
    
    const tcpingResult: TcpingResult = {
      host,
      port,
      success: successfulAttempts > 0,
      attempts: count,
      successfulAttempts,
      averageTime: responseTimes.length > 0 ? Math.round(responseTimes.reduce((a, b) => a + b) / responseTimes.length) : undefined,
      minTime: responseTimes.length > 0 ? Math.min(...responseTimes) : undefined,
      maxTime: responseTimes.length > 0 ? Math.max(...responseTimes) : undefined,
    };

    let output = `TCPING ${host}:${port}\n`;
    output += `\nResults:\n`;
    
    results.forEach((result, index) => {
      if (result.success) {
        output += `  Attempt ${index + 1}: Connected - ${result.responseTime}ms\n`;
      } else {
        output += `  Attempt ${index + 1}: Failed - ${result.error}\n`;
      }
    });

    output += `\nSummary:\n`;
    output += `  Success Rate: ${successfulAttempts}/${count} (${Math.round(successfulAttempts/count*100)}%)\n`;
    
    if (responseTimes.length > 0) {
      output += `  Response Times: min=${tcpingResult.minTime}ms, avg=${tcpingResult.averageTime}ms, max=${tcpingResult.maxTime}ms\n`;
    }

    return {
      content: [
        {
          type: "text",
          text: output,
        },
      ],
    };
  }

  private async handleFirewallValidation(args: any) {
    const { rules, timeout = 3000 } = args;
    const results = [];
    
    let output = "Firewall Rule Validation Results:\n";
    output += "=" .repeat(50) + "\n\n";

    for (const rule of rules) {
      const { name, host, port, expected } = rule;
      const result = await this.tcpConnect(host, port, timeout);
      
      const status = result.success === expected ? "✅ PASS" : "❌ FAIL";
      const actualResult = result.success ? "CONNECTED" : "BLOCKED/FAILED";
      const expectedResult = expected ? "CONNECTED" : "BLOCKED";
      
      output += `Rule: ${name}\n`;
      output += `  Target: ${host}:${port}\n`;
      output += `  Expected: ${expectedResult}\n`;
      output += `  Actual: ${actualResult}\n`;
      output += `  Status: ${status}\n`;
      
      if (result.success && result.responseTime) {
        output += `  Response Time: ${result.responseTime}ms\n`;
      } else if (!result.success && result.error) {
        output += `  Error: ${result.error}\n`;
      }
      
      output += "\n";
      
      results.push({
        name,
        host,
        port,
        expected,
        actual: result.success,
        passed: result.success === expected,
        responseTime: result.responseTime,
        error: result.error,
      });
    }

    const passedRules = results.filter(r => r.passed).length;
    output += `Overall Result: ${passedRules}/${results.length} rules passed\n`;

    return {
      content: [
        {
          type: "text",
          text: output,
        },
      ],
    };
  }

  private async handleNetworkScan(args: any) {
    const { host, startPort, endPort, timeout = 1000 } = args;
    const openPorts = [];
    
    let output = `Network Scan: ${host}:${startPort}-${endPort}\n`;
    output += "=" .repeat(50) + "\n\n";

    for (let port = startPort; port <= endPort; port++) {
      const result = await this.tcpConnect(host, port, timeout);
      
      if (result.success) {
        openPorts.push({ port, responseTime: result.responseTime });
        output += `Port ${port}: OPEN (${result.responseTime}ms)\n`;
      }
    }

    if (openPorts.length === 0) {
      output += "No open ports found in the specified range.\n";
    } else {
      output += `\nSummary: Found ${openPorts.length} open ports\n`;
    }

    return {
      content: [
        {
          type: "text",
          text: output,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("TCPING MCP server running on stdio");
  }
}

const server = new TcpingMCPServer();
server.run().catch(console.error);