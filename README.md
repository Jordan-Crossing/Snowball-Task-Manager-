# Snowball Task Manager

A cross-platform todo application that runs on Linux desktop and Android mobile from a single codebase.

## Tech Stack

- **React + TypeScript + Vite** - Core web application
- **Electron** - Linux desktop binary (AppImage)
- **Capacitor** - Android APK wrapper
- **SQLite** - Persistent data storage (better-sqlite3 on Electron, @capacitor-community/sqlite on Android)
- **Single codebase** - Same React app deployed to both platforms via different wrappers

## Architecture

This project uses a web-first approach where the React application is built once and wrapped for different platforms:
- **Desktop**: Electron wraps the app in a native window with system webview
- **Mobile**: Capacitor wraps the app for Android with native API access
- **No platform-specific UI code** - one React app for everything

### Database Layer

The app includes a unified SQLite database layer that works seamlessly across platforms:
- **Platform-agnostic API** - Same code works on Electron and Capacitor
- **Automatic detection** - Detects which platform it's running on and uses the appropriate implementation
- **GTD-inspired schema** - Support for Eisenhower Matrix (Q1-Q4) and Maslow's hierarchy
- **Full type safety** - TypeScript interfaces for all database entities

See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed information about the database schema and usage.

## Development

### Prerequisites

- Node.js and npm
- Java 21 (for Android builds)
- Android SDK (for Android builds)

### Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build web app
npm run build
```

### Building for Platforms

#### Linux Desktop (Electron)

```bash
# Build and test locally
npm run electron

# Build AppImage
npm run package:linux
```

Output: `release/Snowball Task Manager-0.0.0.AppImage`

#### Android (Capacitor)

```bash
# Sync React build to Android
npm run android:sync

# Build APK
npm run android:build
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

## Project Structure

```
├── src/
│   ├── db/              # Database layer (SQLite abstraction)
│   │   ├── types.ts     # TypeScript interfaces
│   │   ├── schema.ts    # SQLite schema definition
│   │   ├── electron.ts  # Electron (better-sqlite3) implementation
│   │   ├── capacitor.ts # Capacitor (Android) implementation
│   │   └── index.ts     # Factory & platform detection
│   ├── App.tsx          # Main React component
│   └── main.tsx         # React entry point
├── electron/            # Electron main process
├── android/             # Capacitor Android project
├── dist/                # Vite build output
├── dist-electron/       # Compiled Electron files
└── release/             # Packaged desktop binaries
```
