import { configureStore } from '@reduxjs/toolkit';
import authSlice from '../slices/authSlice';
import productSlice from '../slices/productSlice';
import categorySlice from '../slices/categorySlice';
import customerSlice from '../slices/customerSlice';
import vendorSlice from '../slices/vendorSlice';
import locationSlice from '../slices/locationSlice';
import inventorySlice from '../slices/inventorySlice';
import inwardSlice from '../slices/inwardSlice';
import outwardSlice from '../slices/outwardSlice';
import dashboardSlice from '../slices/dashboardSlice';
import sampleSlice from '../slices/sampleSlice';
import quoteSlice from '../slices/quoteSlice';
import settingsSlice from '../slices/settingsSlice';
import leadSlice from '../slices/leadSlice';
import notificationSlice from '../slices/notificationSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    products: productSlice,
    categories: categorySlice,
    customers: customerSlice,
    vendors: vendorSlice,
    locations: locationSlice,
    inventory: inventorySlice,
    inward: inwardSlice,
    outward: outwardSlice,
    dashboard: dashboardSlice,
    samples: sampleSlice,
    quotes: quoteSlice,
    settings: settingsSlice,
    leads: leadSlice,
    notifications: notificationSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
