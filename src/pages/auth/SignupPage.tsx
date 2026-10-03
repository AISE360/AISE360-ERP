import { Navigate } from 'react-router-dom'

// Email/password signup removed — OTP login at /login auto-creates the account.
export default function SignupPage() {
  return <Navigate to="/login" replace />
}
