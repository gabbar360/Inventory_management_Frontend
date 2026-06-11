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
import BarcodePrint from '@/pages/BarcodePrint';

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
        path="/print-barcodes/:source/:id"
        element={
          <ProtectedRoute>
            <BarcodePrint />
          </ProtectedRoute>
        }
      />
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
        <Route path="categories/add" element={<Categories />} />
        <Route path="categories/edit/:id" element={<Categories />} />
        <Route path="products" element={<Products />} />
        <Route path="products/add" element={<Products />} />
        <Route path="products/edit/:id" element={<Products />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="vendors/add" element={<Vendors />} />
        <Route path="vendors/edit/:id" element={<Vendors />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/add" element={<Customers />} />
        <Route path="customers/edit/:id" element={<Customers />} />
        <Route path="locations" element={<Locations />} />
        <Route path="locations/add" element={<Locations />} />
        <Route path="locations/edit/:id" element={<Locations />} />
        <Route path="inward" element={<Inward />} />
        <Route path="inward/add" element={<Inward />} />
        <Route path="inward/edit/:id" element={<Inward />} />
        <Route path="outward" element={<Outward />} />
        <Route path="outward/add" element={<Outward />} />
        <Route path="outward/edit/:id" element={<Outward />} />
        <Route path="profit-loss" element={<ProfitLossAnalysis />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="samples" element={<Samples />} />
        <Route path="samples/add" element={<Samples />} />
        <Route path="samples/edit/:id" element={<Samples />} />
        <Route path="quotes" element={<Quotes />} />
        <Route path="quotes/add" element={<Quotes />} />
        <Route path="quotes/edit/:id" element={<Quotes />} />
        <Route path="sales-orders" element={<SalesOrders />} />
        <Route path="sales-orders/add" element={<SalesOrders />} />
        <Route path="sales-orders/edit/:id" element={<SalesOrders />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="purchase-orders/add" element={<PurchaseOrders />} />
        <Route path="purchase-orders/edit/:id" element={<PurchaseOrders />} />
        <Route path="order-dispatch" element={<OrderDispatchPage />} />
        <Route path="order-dispatch/add" element={<OrderDispatchPage />} />
        <Route path="order-dispatch/edit/:id" element={<OrderDispatchPage />} />
        <Route path="order-dispatch/view/:id" element={<OrderDispatchPage />} />
        <Route path="settings" element={<Settings />} />
        <Route path="roles" element={<Roles />} />
        <Route path="roles/add" element={<Roles />} />
        <Route path="roles/edit/:id" element={<Roles />} />
        <Route path="users" element={<Users />} />
        <Route path="users/add" element={<Users />} />
        <Route path="users/edit/:id" element={<Users />} />
      </Route>
    </Routes>
  );
}

export default App;