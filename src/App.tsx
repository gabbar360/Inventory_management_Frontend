import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { checkAuth } from '@/slices/authSlice';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Dashboard from '@/pages/Dashboard';
import Categories from '@/pages/Categories';
import Products from '@/pages/Products';
import Vendors from '@/pages/Vendors';
import Customers from '@/pages/Customers';
import Locations from '@/pages/Locations';
import Inward from '@/pages/Inward';
import Outward from '@/pages/Outward';
import Inventory from '@/pages/Inventory';
import Samples from '@/pages/Samples';
import Quotes from '@/pages/Quotes';
import SalesOrders from '@/pages/SalesOrders';
import OrderDispatchPage from '@/pages/OrderDispatchPage';
import Settings from '@/pages/Settings';
import Leads from '@/pages/Leads';
import WebsiteQuotes from '@/pages/WebsiteQuotes';
import ProfitLossAnalysis from '@/pages/ProfitLossAnalysis';
import Users from '@/pages/Users';
import Roles from '@/pages/Roles';
import PurchaseOrders from '@/pages/PurchaseOrders';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  return !isAuthenticated ? (
    <>{children}</>
  ) : (
    <Navigate to="/dashboard" replace />
  );
};

function App() {
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.auth);
  const [authChecked, setAuthChecked] = React.useState(false);

  useEffect(() => {
    // Check auth on initial load using /auth/me
    if (!authChecked) {
      dispatch(checkAuth()).finally(() => setAuthChecked(true));
    }
  }, [dispatch, authChecked]);

  if (loading && !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="leads" element={<Leads />} />
        <Route path="website-quotes" element={<WebsiteQuotes />} />
        <Route path="categories" element={<Categories />} />
        <Route path="products" element={<Products />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="customers" element={<Customers />} />
        <Route path="locations" element={<Locations />} />
        <Route path="inward" element={<Inward />} />
        <Route path="outward" element={<Outward />} />
        <Route path="profit-loss" element={<ProfitLossAnalysis />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="samples" element={<Samples />} />
        <Route path="quotes" element={<Quotes />} />
        <Route path="sales-orders" element={<SalesOrders />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="order-dispatch" element={<OrderDispatchPage />} />
        <Route path="settings" element={<Settings />} />
        <Route path="roles" element={<Roles />} />
        <Route path="users" element={<Users />} />
      </Route>
    </Routes>
  );
}

export default App;
