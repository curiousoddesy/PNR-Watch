# PNR Tracker Web Application

A comprehensive web application for tracking Indian Railway PNR (Passenger Name Record) statuses with real-time notifications and persistent tracking.

## Features

- **User Authentication**: Secure registration and login system
- **PNR Management**: Add, track, and manage multiple PNRs
- **Real-time Updates**: Automatic status checking with configurable intervals
- **Notifications**: Email, push, and in-app notifications for status changes
- **History Tracking**: Complete history of PNR status changes
- **Responsive Design**: Mobile-friendly interface
- **Progressive Web App**: Installable on mobile devices

## Architecture

This application is built with a modern tech stack:

### Backend
- **Node.js** with **Express.js** and **TypeScript**
- **PostgreSQL** for data persistence
- **Redis** for caching and session management
- **JWT** for authentication
- **Socket.io** for real-time updates

### Frontend
- **React** with **TypeScript**
- **Material-UI** for responsive design
- **React Query** for state management
- **Vite** for fast development and building

## Project Structure

```
pnr-tracker-webapp/
├── backend/                 # Backend API server
│   ├── src/
│   │   ├── services/       # Core business logic
│   │   ├── config/         # Configuration files
│   │   └── index.ts        # Server entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API clients
│   │   └── main.tsx        # App entry point
│   ├── package.json
│   └── tsconfig.json
└── package.json           # Root workspace configuration
```

## Migrated Functionality

This application builds upon the existing CLI tool (`check-pnr-status`) and migrates the following core functionality:

### From `tools.js`:
- ✅ PNR validation (`validatePnr` → `PNRValidatorService`)
- ✅ HTML parsing (`getDataFromHtml` → `HTMLParserService`)
- ✅ Data formatting (`fixFormatting` → `HTMLParserService.fixFormatting`)

### From `checkPnrStatus.js`:
- ✅ IRCTC request handling (`performRequest` → `IRCTCScraperService.performRequest`)
- ✅ Flushed PNR detection
- ✅ Error handling and timeouts

### From `addPnr.js`, `getPnrs.js`, `deletePnrs.js`:
- ✅ PNR management (`PNRManagementService`)
- ✅ Storage operations (enhanced for database)
- ✅ Duplicate prevention

### From `checkAllPnrStatus.js`:
- ✅ Batch PNR processing (`checkMultiplePNRs`)
- ✅ Sequential processing with rate limiting
- ✅ Progress tracking

### From `defineSelectors.js`:
- ✅ CSS selectors for IRCTC HTML parsing
- ✅ Table headers configuration

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- Redis 6+

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

4. Configure your database and other services in the `.env` files

### Development

Start both frontend and backend in development mode:

```bash
npm run dev
```

This will start:
- Backend server on http://localhost:3001
- Frontend development server on http://localhost:3000

### Building for Production

```bash
npm run build
```

### Testing

```bash
npm test
```

## API Endpoints

The backend provides RESTful APIs for:

- **Authentication**: `/api/auth/*`
- **PNR Management**: `/api/pnrs/*`
- **Notifications**: `/api/notifications/*`
- **User Profile**: `/api/users/*`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

Built upon the excellent work of the original `check-pnr-status` CLI tool by Siddharth Kannan.