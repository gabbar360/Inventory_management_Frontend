import React, { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { checkAuth } from '@/slices/authSlice';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import { usePermission } from '@/hooks/usePermission';

// Lazy-loaded pages
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Categories = lazy(() => import('@/pages/Categories'));
const Products = lazy(() => import('@/pages/Products'));
const Vendors = lazy(() => import('@/pages/Vendors'));
const Customers = lazy(() => import('@/pages/Customers'));
const Locations = lazy(() => import('@/pages/Locations'));
const Inward = lazy(() => import('@/pages/Inward'));
const Outward = lazy(() => import('@/pages/Outward'));
const Inventory = lazy(() => import('@/pages/Inventory'));
const Samples = lazy(() => import('@/pages/Samples'));
const Quotes = lazy(() => import('@/pages/Quotes'));
const SalesOrders = lazy(() => import('@/pages/SalesOrders'));
const OrderDispatchPage = lazy(() => import('@/pages/OrderDispatchPage'));
const Settings = lazy(() => import('@/pages/Settings'));
const Leads = lazy(() => import('@/pages/Leads'));
const WebsiteQuotes = lazy(() => import('@/pages/WebsiteQuotes'));
const ProfitLossAnalysis = lazy(() => import('@/pages/ProfitLossAnalysis'));
const Users = lazy(() => import('@/pages/Users'));
const Roles = lazy(() => import('@/pages/Roles'));
const Menus = lazy(() => import('@/pages/Menus'));
const PurchaseOrders = lazy(() => import('@/pages/PurchaseOrders'));
const BarcodePrint = lazy(() => import('@/pages/BarcodePrint'));
const PaymentsReceived = lazy(() => import('@/pages/PaymentsReceived'));
const PaymentsMade = lazy(() => import('@/pages/PaymentsMade'));
const AccountLedger = lazy(() => import('@/pages/AccountLedger'));


const ProtectedRoute: React.FC<{ children: React.ReactNode; permission?: string }> = ({
  children,
  permission,
}) => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { hasPermission } = usePermission();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <div className="text-xs font-semibold text-gray-500">Loading page...</div>
          </div>
        </div>
      }
    >
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
          <Route path="vendors/:id" element={<Vendors />} />
          <Route path="vendors/:id/purchase" element={<Vendors />} />
          <Route path="vendors/:id/statement" element={<Vendors />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/add" element={<Customers />} />
          <Route path="customers/edit/:id" element={<Customers />} />
          <Route path="customers/:id" element={<Customers />} />
          <Route path="customers/:id/sales" element={<Customers />} />
          <Route path="customers/:id/statement" element={<Customers />} />
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
          <Route path="quotes/:id" element={<Quotes />} />
          <Route path="sales-orders" element={<SalesOrders />} />
          <Route path="sales-orders/add" element={<SalesOrders />} />
          <Route path="sales-orders/edit/:id" element={<SalesOrders />} />
          <Route path="paymentsreceived" element={<PaymentsReceived />} />
          <Route path="paymentsreceived/add" element={<PaymentsReceived />} />
          <Route path="paymentsreceived/edit/:id" element={<PaymentsReceived />} />
          <Route path="account-ledger" element={<Navigate to="/account-ledger/customer" replace />} />
          <Route path="account-ledger/customer" element={<AccountLedger />} />
          <Route path="account-ledger/vendor" element={<AccountLedger />} />
          <Route path="purchase-orders" element={<PurchaseOrders />} />
          <Route path="purchase-orders/add" element={<PurchaseOrders />} />
          <Route path="purchase-orders/edit/:id" element={<PurchaseOrders />} />
          <Route path="paymentsmade" element={<PaymentsMade />} />
          <Route path="paymentsmade/add" element={<PaymentsMade />} />
          <Route path="paymentsmade/edit/:id" element={<PaymentsMade />} />
          <Route path="order-dispatch" element={<OrderDispatchPage />} />
          <Route path="order-dispatch/add" element={<OrderDispatchPage />} />
          <Route path="order-dispatch/edit/:id" element={<OrderDispatchPage />} />
          <Route path="order-dispatch/view/:id" element={<OrderDispatchPage />} />
          <Route path="settings" element={<Settings />} />
          <Route path="roles" element={<Roles />} />
          <Route path="roles/add" element={<Roles />} />
          <Route path="roles/edit/:id" element={<Roles />} />
          <Route
            path="menus"
            element={
              <ProtectedRoute permission="roles.read">
                <Menus />
              </ProtectedRoute>
            }
          />
          <Route
            path="menus/add"
            element={
              <ProtectedRoute permission="roles.update">
                <Menus />
              </ProtectedRoute>
            }
          />
          <Route
            path="menus/edit/:id"
            element={
              <ProtectedRoute permission="roles.update">
                <Menus />
              </ProtectedRoute>
            }
          />
          <Route path="users" element={<Users />} />
          <Route path="users/add" element={<Users />} />
          <Route path="users/edit/:id" element={<Users />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;