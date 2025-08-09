# Overview

This is a cryptocurrency trading grid bot laboratory application built with React and Express. The app allows users to configure and simulate grid trading strategies for Coin-M futures contracts. Users can set up grid parameters, visualize candlestick data, analyze performance metrics, and test different allocation strategies (geometric vs ATR-based). The application provides real-time visualization of grid levels, capital performance, and ROI calculations to help traders optimize their grid trading strategies.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on top of Radix UI primitives with Tailwind CSS for styling
- **State Management**: React hooks for local state, TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with a custom dark trading theme using CSS variables
- **Charts**: Chart.js with React wrapper for candlestick and performance visualizations

## Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **Database ORM**: Drizzle ORM configured for PostgreSQL with Neon serverless database
- **API Design**: RESTful API structure with `/api` prefix for all endpoints
- **Session Management**: Express sessions with PostgreSQL session store via connect-pg-simple
- **Development Tools**: TSX for TypeScript execution, hot reload in development

## Data Storage Solutions
- **Primary Database**: PostgreSQL (configured for Neon serverless platform)
- **Schema Design**: Three main tables:
  - `grid_configurations`: Stores grid trading parameters and settings
  - `candlestick_data`: Stores OHLC price data linked to configurations
  - `grid_levels`: Stores individual grid level data with price, contracts, and status
- **Migrations**: Drizzle Kit handles schema migrations with files stored in `/migrations`
- **Fallback Storage**: In-memory storage implementation for development/testing

## Authentication and Authorization
- **Session-based Authentication**: Express sessions with PostgreSQL backing store
- **User Management**: Basic user schema with username/ID system
- **CRUD Operations**: Standardized storage interface for user operations

## External Dependencies
- **Database**: Neon PostgreSQL serverless database
- **UI Components**: Radix UI primitives for accessible component foundation
- **Charting**: Chart.js for financial data visualization
- **Date Handling**: date-fns for date manipulation and formatting
- **Form Validation**: React Hook Form with Zod resolver for type-safe form handling
- **Development**: Replit-specific plugins for development environment integration

## Design Patterns
- **Component Composition**: Shadcn/ui pattern for customizable, accessible components
- **Custom Hooks**: Utility hooks for mobile detection and toast notifications
- **Type Safety**: Full TypeScript implementation with shared schemas between client/server
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints
- **Error Handling**: Centralized error handling with toast notifications
- **Code Splitting**: Vite handles automatic code splitting and bundling optimization