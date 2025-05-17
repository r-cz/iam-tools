# Architecture Guide

## Overview

IAM Tools is a collection of specialized tools for Identity and Access Management (IAM) development and debugging. The application is built using a feature-based architecture pattern that organizes code by functionality rather than technical role.

## Core Architecture Principles

1. **Feature-First Organization**: Each tool or functionality exists as a self-contained feature module
2. **Co-location**: Related code is kept together, minimizing cross-module dependencies
3. **Clear Module Boundaries**: Features export only what's needed by other parts of the app
4. **Shared Infrastructure**: Common utilities, hooks, and components are shared across features

## Technical Stack

- **Build Tool**: Vite
- **Frontend Framework**: React with TypeScript
- **UI**: Tailwind CSS v4 + shadcn/ui components
- **Package Manager & Runtime**: Bun
- **Routing**: React Router
- **State Management**: React Hooks + Context
- **Testing**: Bun Test + React Testing Library
- **Deployment**: Cloudflare Pages
- **Backend Functions**: Cloudflare Functions

## Application Layers

### 1. Feature Modules

Feature modules are self-contained units that implement specific tools or functionality. Each feature module typically includes:

- **Components**: UI components specific to the feature
- **Pages**: Top-level components that serve as routes
- **Utils**: Utility functions specific to the feature
- **Data**: Static data, constants, and configuration
- **Types**: TypeScript types specific to the feature

### 2. Core Infrastructure

- **Components**: Reusable UI components shared across features
- **Hooks**: Custom React hooks for common patterns
- **Lib**: Utility functions and shared libraries
- **Types**: Shared TypeScript type definitions

### 3. API Layer

The application includes serverless backend functions:

- **CORS Proxy**: `/api/cors-proxy/` - Enables cross-origin requests to external APIs
- **JWKS Endpoint**: `/api/jwks/` - Provides JSON Web Key Sets for token validation

## Data Flow

1. **User Interaction**: Users interact with a feature's UI components
2. **Data Processing**: Components use hooks and utilities to process data
3. **External Requests**: When needed, the application makes requests to external APIs via the CORS proxy
4. **State Management**: State is managed locally within components using React's useState and useContext
5. **Persistence**: Some data is persisted in localStorage using custom hooks

## Cloudflare Integration

The application is deployed to Cloudflare Pages, which provides:

1. **Static Site Hosting**: Main application code
2. **Cloudflare Functions**: Backend API functionality
3. **Continuous Deployment**: Automatic deployments from Git

## Caching Strategy

The application implements strategic caching for frequently accessed resources to improve performance and reduce external API calls.

### OIDC Configuration Caching

- **Purpose**: Caches OpenID Connect configuration documents from identity providers
- **Storage**: In-memory and localStorage
- **TTL**: 1 hour (memory), 24 hours (storage)
- **Implementation**: `OidcConfigCache` class in `/lib/cache/oidc-config-cache.ts`

### JWKS Caching

- **Purpose**: Caches JSON Web Key Sets (JWKS) used for token signature verification
- **Storage**: In-memory and localStorage
- **TTL**: 5 minutes (memory), 1 hour (storage) - shorter than OIDC config due to key rotation
- **Implementation**: `JwksCache` class in `/lib/cache/jwks-cache.ts`
- **Special Features**:
  - Automatic refresh on validation failure (handles key rotation scenarios)
  - Integration with `verifySignatureWithRefresh` for seamless key rotation handling
  - Shared singleton instance for consistent caching across the application

### Cache Management

Both cache implementations support:
- LRU (Least Recently Used) eviction strategy
- Maximum entry limits to prevent unbounded growth
- URL normalization for consistent key management
- TTL-based expiration
- Manual cache clearing and specific entry removal

## Future Architecture Considerations

- **State Management**: As the application grows, consider introducing more structured state management
- **Enhanced Caching**: Expand caching to other resources like user info endpoints
- **Offline Support**: Evaluate Progressive Web App (PWA) capabilities for offline functionality
- **Performance Monitoring**: Add performance tracking for core features
