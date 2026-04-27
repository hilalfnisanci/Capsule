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

- Node.js 18+
- npm, yarn, or pnpm

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/hilalfnisanci/Capsule.git
   cd Capsule
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and fill in any required values.

4. Start the development server:

   ```bash
   npm run dev
   ```

   The app will be available at [http://localhost:3000](http://localhost:3000).

### Available Scripts

| Command                | Description                      |
| ---------------------- | -------------------------------- |
| `npm run dev`          | Start the development server     |
| `npm run build`        | Build for production             |
| `npm run start`        | Start the production server      |
| `npm run lint`         | Run ESLint                       |
| `npm run format`       | Format code with Prettier        |
| `npm run format:check` | Check formatting without writing |

## Project Structure

```
capsule/
├── app/                  # Next.js App Router
│   ├── globals.css       # Global styles (Tailwind)
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Homepage
├── .env.example          # Environment variable template
├── eslint.config.mjs     # ESLint configuration
├── next.config.ts        # Next.js configuration
├── postcss.config.mjs    # PostCSS configuration
├── tailwind.config.ts    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
```

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Linting:** ESLint (next/core-web-vitals)
- **Formatting:** Prettier

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
