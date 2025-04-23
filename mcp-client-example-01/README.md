### Overview

This example demonstrates how to set up and run an MCP (Message Communication Protocol) client to interact with an MCP server. The client sends requests to the server and processes the responses, showcasing how to implement communication between the two.

### Prerequisites

Before running this example, ensure you have the following:

- **Node.js**: Version 22.x or higher installed on your system.
- **TypeScript**: Installed globally or locally in your project.
- **MCP Server**: A compiled binary or running instance of an MCP server. You can use the `mcp-server-example` as a reference.
- An anthropic api-key in .env

### Setup Instructions

Follow these steps to set up and run the MCP client:

1. **Clone the Repository**  
   Clone the repository containing the `mcp-client-example-01` project.

2. **Install Dependencies**  
   Navigate to the project directory and install the required dependencies:

   ```shell
   cd mcp-client-example-01
   npm install
   ```

3. **Add ANTHROPIC_API_KEY to env file**

   ```shell
   echo "ANTHROPIC_API_KEY=<your key here>" > .env
   ```

4. **Build the Client**  
   Compile the TypeScript code into JavaScript:

   ```shell
   npm run build
   ```

5. **Run the Client**  
   Execute the client against an existing or running MCP server. Replace the path to the server binary with the actual path to your MCP server:
   ```shell
   node build/main.js "/path/to/mcp-server/build/server.js"
   ```

### Sample Response

When the client successfully communicates with the server, you should see a response similar to the following in your terminal:

```
Connected to server with tools: [ 'get-alerts' ]

MCP Client Started!
Type your queries or 'quit' to exit.
Query: <type-your-query>
```

This indicates that the client has successfully sent a request and received a response from the server.

### Notes

- Ensure the MCP server is running before starting the client.
- Update the server path in the command to match your local setup.
- Refer to the `mcp-server-example` documentation for more details on setting up the server.

### Command

```shell
node build/main.js  "/Users/mac/Documents/Ghost rider/Learning/mcp-examples/mcp-server-example/build/server.js"
```
