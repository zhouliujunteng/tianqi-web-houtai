import type { ReactElement } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { LoadingRows } from '@/components/common'
import { useAuth } from '@/lib/auth'
import type { Role } from '@/lib/enums'
import AccountsPage from '@/pages/accounts'
import DocsPage from '@/pages/docs'
import FeedbacksPage from '@/pages/feedbacks'
import HomePage from '@/pages/home'
import LibraryPage from '@/pages/library'
import LoginPage from '@/pages/login'
import NotFoundPage from '@/pages/not-found'
import ParentsPage from '@/pages/parents'
import PlanDetailPage from '@/pages/plan-detail'
import PlanWizardPage from '@/pages/plan-wizard'
import PlansPage from '@/pages/plans'
import QuotaPage from '@/pages/quota'
import ReviewQueuePage from '@/pages/review-queue'

function Guard({ roles, children }: { roles?: Role[]; children: ReactElement }) {
  const { account, loading } = useAuth()
  const loc = useLocation()
  if (loading) return <AppShell><LoadingRows rows={5} /></AppShell>
  if (!account) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  if (roles && !roles.includes(account.role)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/docs" element={<Guard><DocsPage /></Guard>} />
      <Route path="/docs/:type" element={<Guard><DocsPage /></Guard>} />
      <Route path="/" element={<Guard><HomePage /></Guard>} />
      <Route path="/plans" element={<Guard><PlansPage /></Guard>} />
      <Route path="/plans/new" element={<Guard roles={['家长']}><PlanWizardPage /></Guard>} />
      <Route path="/plans/:id" element={<Guard><PlanDetailPage /></Guard>} />
      <Route path="/plans/:id/edit" element={<Guard roles={['家长']}><PlanWizardPage /></Guard>} />
      <Route path="/review" element={<Guard roles={['总管', '超级管理员']}><ReviewQueuePage /></Guard>} />
      <Route path="/review/:id" element={<Guard roles={['总管', '超级管理员']}><PlanDetailPage /></Guard>} />
      <Route path="/feedbacks" element={<Guard roles={['总管', '总监', '监护专员', '超级管理员']}><FeedbacksPage /></Guard>} />
      <Route path="/accounts" element={<Guard roles={['总管', '超级管理员']}><AccountsPage /></Guard>} />
      <Route path="/parents" element={<Guard roles={['客户端管理者']}><ParentsPage /></Guard>} />
      <Route path="/quota" element={<Guard roles={['总管', '超级管理员', '客户端管理者']}><QuotaPage /></Guard>} />
      <Route path="/library" element={<Guard roles={['超级管理员', '总管']}><LibraryPage /></Guard>} />
      <Route path="/library/:tab" element={<Guard roles={['超级管理员', '总管']}><LibraryPage /></Guard>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
