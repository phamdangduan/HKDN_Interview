import { Navigate, Route, Routes } from 'react-router-dom'
import { PositionsPage } from '@/pages/PositionsPage'
import { RoundPrepPage } from '@/pages/RoundPrepPage'
import { SessionPage } from '@/pages/SessionPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/positions" replace />} />
      <Route path="/positions" element={<PositionsPage />} />
      <Route path="/positions/:id/rounds/:roundId" element={<RoundPrepPage />} />
      <Route path="/positions/:id/rounds/:roundId/session" element={<SessionPage />} />
      <Route path="*" element={<Navigate to="/positions" replace />} />
    </Routes>
  )
}