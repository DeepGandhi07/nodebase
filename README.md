# Nodebase

**Nodebase** is a full-stack workflow automation platform inspired by tools like **n8n, Zapier, and Make**.

It allows users to build automated workflows visually by connecting triggers, actions, APIs, and AI-powered nodes in a node-based editor. Workflows can run asynchronously, process data between steps, and integrate with external services.

## ✨ Highlights

- Visual drag-and-drop workflow builder
- Trigger- and action-based workflow execution
- Background job processing with **Inngest**
- AI integrations with **OpenAI, Anthropic Claude, and Google Gemini**
- Webhooks and HTTP API integrations
- Slack and Discord integrations
- Authentication and protected user workflows
- Secure credential management
- Workflow execution history
- SaaS subscription support
- Error monitoring and production tooling

## 🛠 Tech Stack

**Frontend:** Next.js, React, TypeScript, Tailwind CSS, XYFlow  
**Backend:** tRPC, Prisma, PostgreSQL, Inngest  
**Authentication:** Better Auth  
**AI:** OpenAI, Anthropic Claude, Google Gemini  
**Other:** TanStack Query, Jotai, Zod, Polar, Sentry

## ⚙️ How It Works

A workflow is created by connecting multiple nodes:

```text
Webhook Trigger
      ↓
HTTP Request
      ↓
AI Processing
      ↓
Slack Message
```

When a workflow is triggered, Nodebase executes the connected nodes in sequence and passes the output of one step to the next.

## 💡 What I Learned

This project gave me hands-on experience with:

- Building a production-style full-stack application
- Designing type-safe APIs and database models
- Implementing asynchronous background workflows
- Working with authentication and secure credentials
- Integrating AI models and third-party APIs
- Building interactive node-based user interfaces
- Structuring and maintaining a larger TypeScript codebase

## 📌 Project Background

I used the project to understand how modern workflow automation platforms are designed, how their execution engines work, and how frontend, backend, database, authentication, background processing, and external integrations fit together.
