# Snowball Task Manager

A cross-platform todo application that runs on Linux desktop and Android mobile from a single codebase.

## Tech Stack

- **React + TypeScript + Vite** - Core web application
- **Electron** - Linux desktop binary (AppImage)
- **Capacitor** - Android APK wrapper
- **Single codebase** - Same React app deployed to both platforms via different wrappers

## Architecture

This project uses a web-first approach where the React application is built once and wrapped for different platforms:
- **Desktop**: Electron wraps the app in a native window with system webview
- **Mobile**: Capacitor wraps the app for Android with native API access
- **No platform-specific UI code** - one React app for everything

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
├── src/                 # React application source
├── electron/            # Electron main process
├── android/             # Capacitor Android project
├── dist/                # Vite build output
├── dist-electron/       # Compiled Electron files
└── release/             # Packaged desktop binaries
```
