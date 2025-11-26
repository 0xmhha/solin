# AI Platform Integration Guide

Complete guide to integrate Solin with ChatGPT, Claude, and Gemini AI assistants.

> **Note**: REST API server features (ChatGPT Custom GPT, Gemini integration, cloud deployment) are planned for future releases. See [roadmap.md](roadmap.md) for details. Currently, only MCP integration with Claude Desktop is fully supported.

## Overview

Solin can be integrated with major AI platforms in different ways:

| Platform           | Method                | Difficulty  | Best For                          |
| ------------------ | --------------------- | ----------- | --------------------------------- |
| **Claude Desktop** | MCP (Native)          | Easy     | Best experience, full MCP support |
| **ChatGPT**        | Custom GPT + REST API | EasyMedium | Web-based, no installation        |
| **Gemini**         | REST API              | EasyMedium | API integration                   |

---

## Claude Desktop (Recommended)

Claude Desktop has **native MCP support**, making it the easiest and best integration.

### Step 1: Install Claude Desktop

Download from: https://claude.ai/download

### Step 2: Start Solin MCP Server

```bash
# Build Solin first
npm run build

# Start MCP server
npm run mcp-server
```

### Step 3: Configure Claude Desktop

**On macOS:**
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`

**On Windows:**
Edit `%APPDATA%\Claude\claude_desktop_config.json`

**On Linux:**
Edit `~/.config/Claude/claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "solin": {
      "command": "node",
      "args": ["/absolute/path/to/solin/dist/mcp/server.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Important:** Replace `/absolute/path/to/solin/` with your actual path!

**Example (macOS):**

```json
{
  "mcpServers": {
    "solin": {
      "command": "node",
      "args": ["/Users/username/projects/solin/dist/mcp/server.js"]
    }
  }
}
```

**Example (Windows):**

```json
{
  "mcpServers": {
    "solin": {
      "command": "node",
      "args": ["C:\\Users\\username\\projects\\solin\\dist\\mcp\\server.js"]
    }
  }
}
```

### Step 4: Restart Claude Desktop

Close and reopen Claude Desktop. You should see "Solin" available in the tools menu.

### Step 5: Use Solin in Claude

Now you can ask Claude to analyze Solidity code:

**Example prompts:**

- "Analyze this Solidity contract: [paste code]"
- "List all security rules in Solin"
- "Explain the reentrancy rule"
- "Check this contract for vulnerabilities: [paste code]"

### Verification

In Claude Desktop, you should see:

- Tools icon with "Solin" listed
- 4 available tools: analyze_solidity, list_rules, explain_rule, suggest_fixes

---

## ChatGPT (Custom GPT + REST API)

ChatGPT doesn't support MCP natively, but we can use **Custom GPTs with Actions** to call Solin's REST API.

### Step 1: Deploy Solin REST API

You need a **publicly accessible** Solin instance. Options:

**Option A: Local with ngrok (for testing)**

```bash
# Terminal 1: Start Solin
npm run server

# Terminal 2: Expose with ngrok
npx ngrok http 3000

# Copy the ngrok URL (e.g., https://abc123.ngrok.io)
```

**Option B: Deploy to cloud (recommended for production)**

- Deploy to Heroku, Railway, Render, or any cloud platform
- See deployment section below

### Step 2: Create Custom GPT

1. Go to https://chat.openai.com/gpts/editor
2. Click "Create a GPT"
3. Configure:

**Name:** Solin - Solidity Security Analyzer

**Description:**

```
Expert Solidity security analyzer and linter. Analyzes smart contracts for vulnerabilities,
gas optimization, and code quality issues. Powered by 150+ rules covering security,
best practices, and gas optimization.
```

**Instructions:**

```
You are a Solidity security expert using the Solin static analyzer. When users provide
Solidity code, analyze it using the analyze endpoint and provide clear, actionable feedback.

Capabilities:
1. Analyze Solidity contracts for security vulnerabilities and code quality
2. List all available analysis rules
3. Explain specific security rules and best practices
4. Suggest fixes for detected issues

When analyzing code:
- Use the analyze_contract action with the provided Solidity code
- Parse the results and explain issues in clear language
- Prioritize security issues (errors) over warnings
- Provide specific line numbers and fix recommendations
- Suggest best practices and gas optimizations

Be concise, security-focused, and always recommend fixes.
```

**Conversation starters:**

```
- Analyze this Solidity contract for vulnerabilities
- What security rules does Solin check?
- Explain the reentrancy vulnerability
- How can I optimize gas in my contract?
```

### Step 3: Configure Actions

Click "Configure" → "Actions" → "Create new action"

**Schema:**

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "Solin API",
    "description": "Solidity static analysis and security scanner",
    "version": "0.1.0"
  },
  "servers": [
    {
      "url": "https://your-solin-instance.com"
    }
  ],
  "paths": {
    "/api/analyze": {
      "post": {
        "operationId": "analyzeContract",
        "summary": "Analyze Solidity smart contract code",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "code": {
                    "type": "string",
                    "description": "Solidity source code to analyze"
                  },
                  "format": {
                    "type": "string",
                    "enum": ["json", "stylish"],
                    "default": "json"
                  }
                },
                "required": ["code"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Analysis results",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean" },
                    "result": { "type": "string" },
                    "issues": { "type": "number" },
                    "errors": { "type": "number" },
                    "warnings": { "type": "number" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/rules": {
      "get": {
        "operationId": "listRules",
        "summary": "List all available analysis rules",
        "parameters": [
          {
            "name": "category",
            "in": "query",
            "schema": {
              "type": "string",
              "enum": ["lint", "security", "all"]
            }
          },
          {
            "name": "severity",
            "in": "query",
            "schema": {
              "type": "string",
              "enum": ["error", "warning", "info", "all"]
            }
          }
        ],
        "responses": {
          "200": {
            "description": "List of rules",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean" },
                    "rules": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": { "type": "string" },
                          "title": { "type": "string" },
                          "description": { "type": "string" },
                          "category": { "type": "string" },
                          "severity": { "type": "string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/suggest-fixes": {
      "post": {
        "operationId": "suggestFixes",
        "summary": "Get fix suggestions for code issues",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "code": {
                    "type": "string",
                    "description": "Solidity source code with issues"
                  }
                },
                "required": ["code"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Fix suggestions",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Important:** Replace `https://your-solin-instance.com` with your actual URL!

### Step 4: Test Your Custom GPT

Click "Test" and try:

```
Analyze this contract:
contract Test {
    function transfer() public {
        msg.sender.call.value(1 ether)("");
    }
}
```

### Step 5: Publish (Optional)

- Click "Publish" → "Public" to share with everyone
- Or "Only me" for private use

---

## Google Gemini (REST API Integration)

Gemini doesn't have MCP support yet, but you can use **Function Calling** with Solin's REST API.

### Method 1: Direct API Calls (Python SDK)

```python
import google.generativeai as genai
import requests

# Configure Gemini
genai.configure(api_key="YOUR_GEMINI_API_KEY")

# Define Solin function
analyze_contract = genai.protos.FunctionDeclaration(
    name="analyze_solidity_contract",
    description="Analyzes Solidity smart contract code for security vulnerabilities and code quality issues",
    parameters=genai.protos.Schema(
        type=genai.protos.Type.OBJECT,
        properties={
            "code": genai.protos.Schema(
                type=genai.protos.Type.STRING,
                description="The Solidity source code to analyze"
            ),
        },
        required=["code"]
    )
)

# Create model with tools
model = genai.GenerativeModel(
    model_name='gemini-1.5-pro',
    tools=[analyze_contract]
)

# Function to call Solin API
def call_solin_api(code):
    response = requests.post(
        'http://localhost:3000/api/analyze',
        json={'code': code, 'format': 'json'}
    )
    return response.json()

# Chat with function calling
chat = model.start_chat()

user_message = """
Analyze this Solidity contract:
contract Test {
    function unsafeTransfer() public {
        msg.sender.call.value(1 ether)("");
    }
}
"""

response = chat.send_message(user_message)

# Check if function call is requested
if response.candidates[0].content.parts[0].function_call:
    function_call = response.candidates[0].content.parts[0].function_call

    # Call Solin API
    result = call_solin_api(function_call.args['code'])

    # Send result back to Gemini
    response = chat.send_message(
        genai.protos.Part(
            function_response=genai.protos.FunctionResponse(
                name="analyze_solidity_contract",
                response={"result": result}
            )
        )
    )

    print(response.text)
```

### Method 2: Gemini Extensions (Future)

Google is working on Extensions for Gemini. When available, Solin can be integrated as an extension.

---

## Smithery.ai Registration

[Smithery](https://smithery.ai) is the official MCP server registry. Here's how to register Solin:

### Step 1: Prepare Package

Ensure your `package.json` has MCP metadata:

```json
{
  "name": "solin",
  "version": "0.1.0",
  "description": "Advanced Solidity static analysis tool with MCP support",
  "keywords": [
    "solidity",
    "security",
    "static-analysis",
    "mcp",
    "model-context-protocol",
    "claude",
    "ai-tools"
  ],
  "mcp": {
    "server": {
      "command": "node",
      "args": ["dist/mcp/server.js"]
    }
  }
}
```

### Step 2: Create `.smithery.json`

Create a Smithery configuration file in your project root:

```json
{
  "name": "solin",
  "displayName": "Solin - Solidity Security Analyzer",
  "description": "Comprehensive Solidity static analyzer with 150+ rules for security vulnerabilities, gas optimization, and code quality. Detects reentrancy, access control issues, and provides actionable fix suggestions.",
  "category": "development",
  "tags": [
    "solidity",
    "ethereum",
    "security",
    "smart-contracts",
    "static-analysis",
    "linter",
    "vulnerability-detection"
  ],
  "icon": "",
  "homepage": "https://github.com/0xmhha/solin",
  "repository": "https://github.com/0xmhha/solin",
  "license": "MIT",
  "author": {
    "name": "Solin Contributors",
    "url": "https://github.com/0xmhha/solin"
  },
  "mcp": {
    "version": "1.0",
    "serverType": "stdio",
    "capabilities": {
      "tools": true,
      "resources": false,
      "prompts": false
    }
  },
  "installation": {
    "npm": "npm install -g solin",
    "requirements": {
      "node": ">=18.0.0"
    }
  },
  "tools": [
    {
      "name": "analyze_solidity",
      "description": "Analyze Solidity smart contract code for bugs, vulnerabilities, and code quality issues",
      "inputSchema": {
        "type": "object",
        "properties": {
          "code": {
            "type": "string",
            "description": "The Solidity source code to analyze"
          },
          "format": {
            "type": "string",
            "enum": ["stylish", "json"],
            "description": "Output format"
          }
        },
        "required": ["code"]
      }
    },
    {
      "name": "list_rules",
      "description": "List all available analysis rules with filtering",
      "inputSchema": {
        "type": "object",
        "properties": {
          "category": {
            "type": "string",
            "enum": ["lint", "security", "all"]
          },
          "severity": {
            "type": "string",
            "enum": ["error", "warning", "info", "all"]
          }
        }
      }
    },
    {
      "name": "explain_rule",
      "description": "Get detailed explanation of a specific rule",
      "inputSchema": {
        "type": "object",
        "properties": {
          "ruleId": {
            "type": "string",
            "description": "Rule ID (e.g., 'security/reentrancy')"
          }
        },
        "required": ["ruleId"]
      }
    },
    {
      "name": "suggest_fixes",
      "description": "Analyze code and provide specific fix suggestions",
      "inputSchema": {
        "type": "object",
        "properties": {
          "code": {
            "type": "string",
            "description": "Solidity code with issues"
          }
        },
        "required": ["code"]
      }
    }
  ],
  "examples": [
    {
      "title": "Analyze Contract for Vulnerabilities",
      "description": "Scan a Solidity contract for security issues",
      "conversation": [
        {
          "role": "user",
          "content": "Analyze this contract: contract Test { function transfer() public { msg.sender.call.value(1 ether)(\"\"); } }"
        }
      ]
    },
    {
      "title": "List Security Rules",
      "description": "Get all security-related analysis rules",
      "conversation": [
        {
          "role": "user",
          "content": "List all security rules in Solin"
        }
      ]
    }
  ]
}
```

### Step 3: Publish to npm

Smithery auto-discovers packages published to npm:

```bash
# Login to npm
npm login

# Publish package
npm publish --access public
```

### Step 4: Register on Smithery

1. Go to https://smithery.ai
2. Click "Submit Server"
3. Enter your npm package name: `solin`
4. Smithery will automatically detect `.smithery.json` and list your server

### Step 5: Verify Listing

Check that Solin appears at: `https://smithery.ai/server/solin`

---

## Cloud Deployment Options

For ChatGPT and Gemini integrations, you need a publicly accessible Solin instance.

### Option 1: Railway.app (Easiest)

1. Create `railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run server",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

2. Deploy:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

3. Get your URL from Railway dashboard

### Option 2: Render.com

1. Create `render.yaml`:

```yaml
services:
  - type: web
    name: solin
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm run server
    envVars:
      - key: REST_ENABLED
        value: 'true'
      - key: REST_PORT
        value: '10000'
```

2. Push to GitHub and connect to Render

### Option 3: Heroku

```bash
# Create Procfile
echo "web: npm run server" > Procfile

# Deploy
heroku create solin-analyzer
git push heroku main
```

### Option 4: Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "server"]
```

```bash
docker build -t solin .
docker run -p 3000:3000 solin
```

---

## Comparison Table

| Feature              | Claude Desktop | ChatGPT Custom GPT | Gemini Function Calling |
| -------------------- | -------------- | ------------------ | ----------------------- |
| **Setup Difficulty** | Easy        | EasyMedium        | MediumAdvanced         |
| **Integration Type** | Native MCP     | REST API           | REST API                |
| **Deployment**       | Local          | Cloud required     | Cloud required          |
| **Cost**             | Free           | Free (+ cloud)     | Free (+ cloud)          |
| **Best Use Case**    | Development    | Public sharing     | Custom apps             |
| **Real-time**        | Yes         | Yes             | Yes                  |
| **Privacy**          | Local       | Cloud           | Cloud                |

---

## Troubleshooting

### Claude Desktop

**Issue:** "Solin not showing in tools"

- Check config file path is correct
- Ensure absolute paths (not relative)
- Restart Claude Desktop completely
- Check Node.js is installed: `node --version`

**Issue:** "Connection failed"

- Verify MCP server is running
- Check dist/mcp/server.js exists
- Run `npm run build` first

### ChatGPT

**Issue:** "Action endpoint not reachable"

- Ensure Solin REST API is publicly accessible
- Test URL directly: `curl https://your-url.com/api/health`
- Check ngrok is running (if using ngrok)

**Issue:** "Invalid schema"

- Validate OpenAPI schema at https://editor.swagger.io
- Ensure all required fields are present

### Gemini

**Issue:** "Function not called"

- Verify function declaration matches API
- Check API endpoint is accessible
- Review Gemini API key permissions

---

## Additional Resources

- **MCP Documentation**: https://modelcontextprotocol.io
- **Smithery**: https://smithery.ai
- **Claude API**: https://docs.anthropic.com
- **ChatGPT Custom GPTs**: https://help.openai.com/en/articles/8554397-creating-a-gpt
- **Gemini Function Calling**: https://ai.google.dev/docs/function_calling

---

## Support

- **GitHub Issues**: https://github.com/0xmhha/solin/issues

---

