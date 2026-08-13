# Food Factory POS - Agents

This project uses opencode agents for development assistance.

## Available Agents

### UI Designer (`ui-designer`)
- **Focus**: Responsive layouts, Tailwind CSS, shadcn/ui components, framer-motion animations, dark mode
- **Expertise**: Orange/amber gradient theme, mobile-first design, glass-morphism effects
- **Commands**: `npx opencode -a ui-designer "..."`

### Frontend Developer (`frontend-dev`)
- **Focus**: React/TypeScript components, state management, routing, API integration
- **Expertise**: React 18, Context API, react-router-dom v6, @tanstack/react-query
- **Commands**: `npx opencode -a frontend-dev "..."`

### Backend Developer (`backend-dev`)
- **Focus**: Supabase database, RLS policies, Prisma schema, API integrations
- **Expertise**: PostgreSQL, Supabase auth, database migrations
- **Commands**: `npx opencode -a backend-dev "..."`

### Tester (`tester`)
- **Focus**: Unit/integration tests using Vitest and React Testing Library
- **Expertise**: Auth flow testing, cart operations, component testing
- **Commands**: `npx opencode -a tester "..."`

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Testing**: Vitest, React Testing Library
- **UI Library**: shadcn/ui, Radix UI primitives
- **Animations**: framer-motion
- **Mobile**: Capacitor for Android
