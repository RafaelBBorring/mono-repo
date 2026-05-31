import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { reviewAPI } from './api/client'
import UploadPage    from './pages/Upload'
import DashboardPage from './pages/Dashboard'
import ReviewPage    from './pages/Review'
import SurfistsPage  from './pages/Surfists'
import FolderPage    from './pages/Folder'
import { Waves, Upload, LayoutGrid, Eye, Users } from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { to: '/',         icon: Upload,     label: 'Upload'    },
  { to: '/dashboard',icon: LayoutGrid, label: 'Dashboard' },
  { to: '/review',   icon: Eye,        label: 'Review'    },
  { to: '/surfists', icon: Users,      label: 'Surfers'   },
]

function Sidebar() {
  const { data: progress } = useQuery({
    queryKey: ['review-progress'],
    queryFn: reviewAPI.progress,
    refetchInterval: 15_000,
  })

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-slate-900 border-r border-slate-800 min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-800">
        <Waves className="text-sky-400" size={22} />
        <span className="font-bold text-white tracking-tight">SurfClassify</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sky-500/15 text-sky-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Review progress pill */}
      {progress && (
        <div className="px-4 py-4 border-t border-slate-800">
          <div className="text-xs text-slate-500 mb-1.5">Review Progress</div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all"
              style={{ width: `${progress.review_completion_pct}%` }}
            />
          </div>
          <div className="text-xs text-slate-400 mt-1.5">
            {progress.review_completion_pct}% complete
          </div>
          {progress.pending_review > 0 && (
            <div className="mt-2 text-xs font-medium text-amber-400">
              {progress.pending_review} pending review
            </div>
          )}
        </div>
      )}
    </aside>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/"          element={<UploadPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/folder/:folderType" element={<FolderPage />} />
            <Route path="/folder/:folderType/:folderId" element={<FolderPage />} />
            <Route path="/review"    element={<ReviewPage />} />
            <Route path="/surfists"  element={<SurfistsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
