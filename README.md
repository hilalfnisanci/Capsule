# Capsule

A personal time capsule app that lets you record moments, thoughts, and memories to be revisited later.

## Product Description

Capsule allows users to capture written notes, photos, and voice memos and seal them as time capsules. Each capsule has a scheduled unlock date — when the date arrives, the user receives a notification and can revisit what they saved. Think of it as a letter to your future self, but richer and more interactive.

## Core MVP Idea

- Create a capsule with text, images, or audio
- Set a future unlock date
- Receive a notification when the capsule unlocks
- Open the capsule and replay the memory

## Planned Main Features

- **Capsule creation** — compose entries with text, photos, and voice recordings
- **Scheduled unlocking** — choose when a capsule becomes viewable
- **Notifications** — push or email alerts when a capsule is ready to open
- **Memory replay** — browse and relive past capsules in a timeline view
- **Sharing** — optionally share a capsule with friends or family
- **Privacy controls** — private, shared, or public capsules

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm 9 or later

### Installation

```bash
# Install dependencies
npm install
```

### Environment variables

Copy the example file and fill in any values:

```bash
cp .env.example .env.local
```

### Running locally

```bash
# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Other commands

```bash
# Type-check
npx tsc --noEmit

# Lint
npm run lint

# Format
npm run format

# Production build
npm run build
npm run start
```

## Project Structure

```
src/
  app/           # Next.js App Router — pages, layouts, and routes
  components/    # Shared React components (to be added)
  lib/           # Utility functions and shared logic (to be added)
public/          # Static assets
```

## Development Roadmap

| Phase | Description                           | Status      |
| ----- | ------------------------------------- | ----------- |
| 0     | Repository setup                      | Done        |
| 1     | Project scaffolding and CI            | In progress |
| 2     | Core data models and API              | Planned     |
| 3     | Capsule creation and storage          | Planned     |
| 4     | Scheduled unlocking and notifications | Planned     |
| 5     | Frontend and mobile client            | Planned     |
| 6     | Sharing and privacy controls          | Planned     |

## Contributing

Contribution guidelines will be added once the project structure is established.

## License

License TBD.
