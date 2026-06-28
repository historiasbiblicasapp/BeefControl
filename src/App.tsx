import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Layout } from './components/layout/Layout'
import { Login } from './pages/auth/Login'
import { Register } from './pages/auth/Register'
import { ResetPassword } from './pages/auth/ResetPassword'
import { Dashboard } from './pages/dashboard/Dashboard'
import { SuppliersList } from './pages/suppliers/SuppliersList'
import { AnimalsList } from './pages/animals/AnimalsList'
import { AnimalForm } from './pages/animals/AnimalForm'
import { ButcheringForm } from './pages/butchering/ButcheringForm'
import { InventoryList } from './pages/inventory/InventoryList'
import { SalesNew } from './pages/sales/SalesNew'
import { SalesList } from './pages/sales/SalesList'
import { ClientsList } from './pages/clients/ClientsList'
import { FinancialPage } from './pages/financial/FinancialPage'
import { ReportsPage } from './pages/reports/ReportsPage'
import { IntelligencePage } from './pages/intelligence/IntelligencePage'
import { SettingsPage } from './pages/settings/SettingsPage'

const queryClient = new QueryClient()

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full" /></div>
  if (!user) return <Navigate to="/auth/login" replace />
  return <Layout>{children}</Layout>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full" /></div>
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/auth/cadastro" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/auth/recuperar-senha" element={<PublicRoute><ResetPassword /></PublicRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/fornecedores" element={<PrivateRoute><SuppliersList /></PrivateRoute>} />
      <Route path="/animais" element={<PrivateRoute><AnimalsList /></PrivateRoute>} />
      <Route path="/animais/novo" element={<PrivateRoute><AnimalForm /></PrivateRoute>} />
      <Route path="/animais/:id/editar" element={<PrivateRoute><AnimalForm /></PrivateRoute>} />
      <Route path="/animais/:id/desmanche" element={<PrivateRoute><ButcheringForm /></PrivateRoute>} />
      <Route path="/estoque" element={<PrivateRoute><InventoryList /></PrivateRoute>} />
      <Route path="/vendas" element={<PrivateRoute><SalesList /></PrivateRoute>} />
      <Route path="/vendas/nova" element={<PrivateRoute><SalesNew /></PrivateRoute>} />
      <Route path="/clientes" element={<PrivateRoute><ClientsList /></PrivateRoute>} />
      <Route path="/financeiro" element={<PrivateRoute><FinancialPage /></PrivateRoute>} />
      <Route path="/relatorios" element={<PrivateRoute><ReportsPage /></PrivateRoute>} />
      <Route path="/inteligencia" element={<PrivateRoute><IntelligencePage /></PrivateRoute>} />
      <Route path="/configuracoes" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster position="top-right" toastOptions={{
            style: { background: '#18181b', color: '#e4e4e7', border: '1px solid #27272a' },
          }} />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
