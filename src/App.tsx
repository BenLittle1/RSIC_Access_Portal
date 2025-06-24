import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'
import ProfileSettingsPage from './pages/ProfileSettingsPage'
import UserAuthenticationPage from './pages/UserAuthenticationPage'
import PendingApprovalPage from './pages/PendingApprovalPage'
import AuthWrapper from './components/AuthWrapper'

function App() {
  return (
    <AuthWrapper>
      <Router>
        <div className="min-h-screen bg-white">
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/pending-approval" element={<PendingApprovalPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/profile" element={<ProfileSettingsPage />} />
            <Route path="/settings/authentication" element={<UserAuthenticationPage />} />
          </Routes>
        </div>
      </Router>
    </AuthWrapper>
  )
}

export default App
