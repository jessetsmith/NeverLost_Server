# NeverLost Backend Server

Backend server for the NeverLost application, built with Express.js and Sanity.io.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the project root:

```bash
# Server Configuration
PORT=3000

# Sanity.io Configuration
SANITY_PROJECT_ID=492nxyas
SANITY_DATASET=production
SANITY_TOKEN=your-sanity-token-here

# JWT Secret (for authentication)
JWT_SECRET=your-jwt-secret-here
```

**Important:**
- Get your Sanity token from: https://sanity.io/manage
- Make sure the token has "Editor" or "Admin" role (not "Viewer")
- Generate a secure JWT_SECRET for production

### 3. Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

## API Endpoints

### Authentication
- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login user

### Layouts
- `GET /api/layouts` - Get all layouts for authenticated user
- `POST /api/layouts` - Create a new layout
- `GET /api/layouts/:layoutId` - Get layout by ID
- `PUT /api/layouts/:layoutId` - Update layout
- `DELETE /api/layouts/:layoutId` - Delete layout

### Health Check
- `GET /health` - Server health check
- `GET /` - Welcome message

## Project Structure

```
NeverLost_Server/
├── src/
│   ├── server.js          # Main server file
│   ├── controllers/       # Request handlers
│   ├── middleware/        # Express middleware
│   └── routes/            # API routes
├── sanity/                # Sanity.io configuration
├── .env                   # Environment variables (create this)
└── package.json
```

## Environment Variables

See `ENV_VARIABLES.md` for detailed information about environment variable configuration.

## Development

- **Lint code:** `npm run lint`
- **Fix linting issues:** `npm run lint:fix`
- **Start dev server:** `npm run dev`

## Deployment

This server can be deployed to any Node.js hosting platform:
- Heroku
- Railway
- Render
- DigitalOcean App Platform
- AWS Elastic Beanstalk
- Google Cloud Run
- etc.

For Firebase Functions deployment (if needed in the future), see `docs/firebase/` directory.

## Troubleshooting

### Sanity Token Errors
- Make sure your Sanity token has "Editor" or "Admin" role
- See `SANITY_TOKEN_SETUP.md` for detailed instructions

### Port Already in Use
- Change `PORT` in `.env` to a different port
- Or stop the process using port 3000

## License

Copyright © Jesse Smith at NowhereMaps - Digital. All rights reserved.
