import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './lib/auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LostList from './pages/LostList';
import LostForm from './pages/LostForm';
import FoundList from './pages/FoundList';
import FoundForm from './pages/FoundForm';
import SearchMatches from './pages/SearchMatches';
import ItemDetails from './pages/ItemDetails';
import MyClaims from './pages/MyClaims';
import ClaimForm from './pages/ClaimForm';
import ClaimDetail from './pages/ClaimDetail';
import VerificationQueue from './pages/VerificationQueue';
import Handovers from './pages/Handovers';
import Notifications from './pages/Notifications';
import AdminDashboard from './pages/AdminDashboard';
import Reports from './pages/Reports';
import UsersAdmin from './pages/UsersAdmin';
import CategoriesAdmin from './pages/CategoriesAdmin';

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="lost" element={<LostList />} />
          <Route path="lost/new" element={<LostForm />} />
          <Route path="lost/:id/edit" element={<LostForm />} />
          <Route path="found" element={<FoundList />} />
          <Route path="found/new" element={<FoundForm />} />
          <Route path="found/:id/edit" element={<FoundForm />} />
          <Route path="search" element={<SearchMatches />} />
          <Route path="items/:kind/:id" element={<ItemDetails />} />
          <Route path="claims" element={<MyClaims />} />
          <Route path="claims/new" element={<ClaimForm />} />
          <Route path="claims/:id" element={<ClaimDetail />} />
          <Route path="notifications" element={<Notifications />} />
          <Route element={<ProtectedRoute roles={['staff', 'admin']} />}>
            <Route path="verification" element={<VerificationQueue />} />
            <Route path="handovers" element={<Handovers />} />
          </Route>
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin/reports" element={<Reports />} />
            <Route path="admin/users" element={<UsersAdmin />} />
            <Route path="admin/categories" element={<CategoriesAdmin />} />
          </Route>
          <Route path="*" element={<div className="panel p-10 text-center font-semibold">Page not found</div>} />
        </Route>
      </Route>
    </Routes>
  );
}
