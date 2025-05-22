# TCPING MCP Server

A Model Context Protocol (MCP) server that provides TCP connectivity testing capabilities for network and firewall validation using natural language commands.

## Features

- **TCPING**: Test TCP connectivity to specific hosts and ports
- **Firewall Rule Validation**: Validate multiple firewall rules with expected outcomes
- **Network Scanning**: Scan port ranges on target hosts
- **Natural Language Interface**: Use conversational commands through Claude

## Installation

1. **Clone or create the project**:
```bash
# Option 1: Clone from repository (if available)
git clone <repository-url> tcping-mcp-server
cd tcping-mcp-server

```

2. **Build the project**:
```bash
npm run build
```

## Configuration

### Claude Desktop Configuration

Add this to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**VSCode***:

#### Example json
``` json
            "tcping": {
                "type": "stdio",
                "command": "node",
                "args": ["~/tcping_mcp/dist/index.js"]
            }
```

Update the path to match your installation directory.

## Usage Examples

Once configured, you can use natural language commands with Claude:

### Basic TCP Connectivity Testing
```
"Test if I can connect to google.com on port 80"
"Check connectivity to 192.168.1.1 port 22 with 5 second timeout"
"Ping TCP port 443 on example.com 10 times"
```

Image: ![tcping-mcp tcp](/img/google-example.png)


### Firewall Rule Validation
```
"Validate these firewall rules:
- Web traffic to google.com:80 should work
- SSH to internal server 10.0.1.5:22 should be blocked
- HTTPS to api.example.com:443 should work"
```

Image: ![tcping-mcp firewall](/img/firewall-example.png)


### Network Scanning
```
"Scan ports 20-30 on 192.168.1.1"
"Check which common ports are open on example.com between 80-443"
```

Image: ![tcping-mcp Network](/img/network-example.png)



## Tool Functions

### tcping
Tests TCP connectivity to a host and port.
- **host**: Target hostname or IP address
- **port**: Target port number
- **timeout**: Connection timeout in milliseconds (default: 3000)
- **count**: Number of connection attempts (default: 4)
- **interval**: Interval between attempts in milliseconds (default: 1000)

### validate_firewall_rule
Validates firewall connectivity by testing multiple host:port combinations.
- **rules**: Array of firewall rules with expected outcomes
- **timeout**: Connection timeout in milliseconds (default: 3000)

### network_scan
Scans a range of ports on a target host.
- **host**: Target hostname or IP address
- **startPort**: Starting port number
- **endPort**: Ending port number
- **timeout**: Connection timeout in milliseconds (default: 1000)

## Example Natural Language Commands

### Engineering Consultant Scenarios

**Pre-deployment Testing**:
```
"Before deploying the new application, validate that:
1. Load balancer can reach app servers on port 8080
2. App servers can connect to database on port 5432
3. External API calls to api.stripe.com:443 are working"
```

**Firewall Change Validation**:
```
"After the firewall change, verify:
- Internal subnet 10.0.1.0/24 can still reach file server on port 445
- External access to web server port 80 is blocked as intended
- Management access to switches on port 22 works from admin network"
```

**Troubleshooting Network Issues**:
```
"Help me troubleshoot connectivity to our service:
- Test if port 3306 is reachable on db.company.com
- Scan ports 80, 443, 8080, 8443 on app-server.company.com
- Verify that backup server 10.0.2.50 port 22 is accessible"
```

**Security Validation**:
```
"Validate our security posture by confirming:
- External connections to internal DB port 3306 are blocked
- Public web ports 80 and 443 are accessible
- SSH access (port 22) is only available from management subnet"
```


## Benefits for Engineering Consultants

1. **Natural Language Interface**: No need to remember complex command syntax
2. **Comprehensive Reporting**: Detailed output with timing and success rates
3. **Batch Validation**: Test multiple rules simultaneously
4. **Documentation Ready**: Output can be directly included in reports
5. **Cross-Platform**: Works on Windows, macOS, and Linux
6. **No External Dependencies**: Uses Node.js built-in networking capabilities

## Development

### Project Structure
```
├── dist/             # Compiled JavaScript files
├── src/              # TypeScript source
│   └── index.ts      # Main application file
├── package.json      # Project configuration
└── tsconfig.json     # TypeScript configuration
```

### Modifying the Server

To modify or extend the server:

```bash
# Make changes to src/index.ts
npm run build
# Restart Claude Desktop to pick up changes
```

### Adding New Tools

To add a new tool to the MCP server:

1. Define the tool schema in the `ListToolsRequestSchema` handler
2. Add a new case in the `CallToolRequestSchema` handler switch statement
3. Implement the handler function for the new tool
4. Build and restart the server

Example:
```typescript
// In the ListToolsRequestSchema handler
{
  name: "my_new_tool",
  description: "Description of the new tool",
  inputSchema: {
    type: "object",
    properties: {
      // Define properties here
    },
    required: ["requiredProperty"]
  }
}

// In the CallToolRequestSchema handler
case "my_new_tool":
  return await this.handleMyNewTool(args);

// Implement the handler
private async handleMyNewTool(args: any) {
  // Implementation goes here
}
```

## Troubleshooting

### Common Issues

- Ensure Node.js is installed and accessible in your PATH
- Verify the path in Claude Desktop configuration is correct
- Check Claude Desktop logs for any error messages
- Test the server independently: `node dist/index.js`

### TypeScript Errors

If you encounter TypeScript compiler errors:

1. **Server Constructor Error**: The `Server` constructor from the MCP SDK takes a single object parameter that includes all configuration. The correct format is:
   ```typescript
   this.server = new Server({
     name: "tcping-mcp",
     version: "1.0.0",
     capabilities: {
       tools: {},
     },
   });
   ```

2. **Type Conversion Errors**: When handling tool arguments, use proper type assertions with `unknown`:
   ```typescript
   return await this.handleTcping(args as unknown as TcpingOptions);
   ```

3. **TypeScript Configuration**: Make sure your `tsconfig.json` is correctly configured, especially module settings for ESM support.

## License

MIT License - Feel free to modify and distribute as needed.

## Publishing to npm

This project is configured with GitHub Actions to automatically build and publish to the npm registry when you create a new release tag.

### Setup Instructions

1. **Generate an npm Access Token**:
   - Log in to your npm account on [npmjs.com](https://www.npmjs.com/)
   - Go to your profile → Access Tokens
   - Create a new token with "Automation" type (recommended)
   - Copy the generated token

2. **Add the token to your GitHub repository**:
   - Go to your GitHub repository
   - Click on "Settings" → "Secrets and variables" → "Actions"
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste your npm token
   - Click "Add secret"

3. **Publish a new version**:
   - Update the version in `package.json`
   - Commit and push your changes
   - Create and push a new tag:
     ```bash
     git tag v1.0.1
     git push origin v1.0.1
     ```
   - The GitHub Action will automatically trigger and publish your package

Alternatively, you can manually trigger the workflow from the "Actions" tab in your GitHub repository.
## Testing

This project includes a comprehensive test suite using Jest. The tests cover utility functions and validators to ensure the application behaves correctly.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (useful during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests and build (used in CI pipeline)
npm run ci
```

### Test Structure

- **Unit Tests**: Test individual functions in isolation
- **Integration Tests**: Verify different components work together
- **Validation Tests**: Ensure input validation works correctly

### Test Coverage

The project maintains high test coverage to ensure reliability:
- Statements: >90%
- Branches: >90%
- Functions: 100%
- Lines: >90%

### Continuous Integration

Testing is automatically run in the GitHub Actions CI/CD pipeline before publishing to npm. If tests fail, the package won't be published.

