# Professional Book Editor

AI-powered manuscript editing with tracked changes following Reach House Style Guide.

## Features

- Upload Microsoft Word documents (.doc, .docx)
- AI-powered editing following UK English standards
- Track Changes output for easy review
- Progress saving and resume capability
- Download edited documents with visual change tracking

## Deployment with Docker

### Prerequisites

- Docker installed
- Anthropic API key

### Quick Start

1. Clone this repository
2. Create a `.env` file with your API key:
   ```
   ANTHROPIC_API_KEY=your_key_here
   ```
3. Build and run:
   ```bash
   docker-compose up -d --build
   ```
4. Access at `http://localhost:3001`

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| ANTHROPIC_API_KEY | Yes | - | Your Anthropic API key |
| PORT | No | 3001 | Server port |

## Manual Development Setup

### Backend
```bash
npm install
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Architecture

```
├── server.js          # Express backend server
├── frontend/          # React frontend application
├── Dockerfile         # Docker build configuration
├── docker-compose.yml # Docker Compose configuration
└── public/            # Built frontend (generated)
```

## License

Private - Reach House
