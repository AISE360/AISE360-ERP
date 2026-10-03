import { Navigate } from 'react-router-dom'

// Password reset removed — OTP login is passwordless.
export default function ForgotPasswordPage() {
  return <Navigate to="/login" replace />
}
