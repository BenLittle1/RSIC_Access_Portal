# SRIC Access Portal

A React-based guest management system for SRIC building access, built with Vite, TypeScript, and Supabase.

## Features

- **User Authentication**: Secure login/signup with email verification
- **Role-based Access**: Different permissions for Security and Organization users
- **Guest Management**: Add, view, and track guest visits
- **Floor Access Control**: Multi-floor access permissions
- **Calendar Integration**: Date-based guest scheduling
- **Real-time Updates**: Live guest status tracking

## Project Structure

```
sric-access-portal/
├── database/                 # Database files
│   ├── schemas/             # Complete database schemas
│   ├── migrations/          # Database migration scripts
│   └── README.md           # Database documentation
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── AddGuestModal.tsx
│   │   ├── CalendarView.tsx
│   │   ├── GuestList.tsx
│   │   ├── Login.tsx
│   │   ├── PasswordStrength.tsx
│   │   └── SignUp.tsx
│   ├── pages/             # Main application pages
│   │   ├── DashboardPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── PendingApprovalPage.tsx
│   │   ├── ProfileSettingsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── SignUpPage.tsx
│   │   └── UserAuthenticationPage.tsx
│   ├── lib/               # External service configurations
│   │   └── supabase.ts
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/             # Utility functions
│   │   ├── constants.ts   # Application constants
│   │   └── formatters.ts  # Data formatting functions
│   ├── assets/            # Static assets
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # Application entry point
│   └── index.css         # Global styles
├── public/               # Public assets
├── package.json          # Dependencies and scripts
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── tsconfig*.json       # TypeScript configuration
```

## Organizations

- **Security**: Administrative access to all features
  - User authentication management
  - Cross-organization guest visibility
  - Full system administration
- **AXL**: Standard organization access
- **Knowledgehook**: Standard organization access  
- **Yscope**: Standard organization access

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd sric-access-portal
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
# Update src/lib/supabase.ts with your Supabase credentials
```

4. Set up the database
```bash
# Run the SQL scripts in database/schemas/ in your Supabase SQL Editor
# Apply any migrations from database/migrations/
```

5. Start the development server
```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Routing**: React Router
- **Date Handling**: date-fns
- **Calendar**: react-day-picker

## Key Features Detail

### Guest Management
- Add guests for single or multiple dates
- Multi-floor access permissions
- Automatic requester email tracking
- Real-time arrival status updates

### User Roles
- **Security Users**: Full administrative access
- **Organization Users**: Limited to their organization's guests

### Authentication Flow
1. User signs up with email verification required
2. Account pending approval by Security team
3. Security team approves/denies access
4. Approved users can access the system

## Development Guidelines

### Adding New Features
1. Create types in `src/types/index.ts`
2. Add utilities to `src/utils/`
3. Build components in `src/components/`
4. Create pages in `src/pages/`
5. Update database schema in `database/schemas/`

### Code Organization
- Use TypeScript for all new code
- Centralize types in `src/types/`
- Keep utilities in `src/utils/`
- Follow existing naming conventions

## Contributing

1. Follow the established folder structure
2. Use TypeScript types from `src/types/`
3. Update documentation when adding features
4. Test database changes thoroughly

## License

[Your License Here]
