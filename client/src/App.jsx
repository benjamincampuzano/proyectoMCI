import { Suspense, lazy, useEffect, useState, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useLoading } from './context/LoadingContext';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { ThemeProvider } from './context/ThemeContext';
import { LoadingProvider } from './context/LoadingContext';
import Layout from './layouts/Layout';
import ConnectivityHandler from './components/ConnectivityHandler';
import LoadingOverlay from './components/LoadingOverlay';
import TransitionLoader from './components/TransitionLoader';
import ChangePasswordModal from './components/ChangePasswordModal';
import api from './utils/api';
import './utils/logger';
import mobileDebug from './utils/mobileDebug';

// Lazy load pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Ganar = lazy(() => import('./pages/Ganar'));
const Home = lazy(() => import('./pages/Home'));
const Consolidar = lazy(() => import('./pages/Consolidar'));
const Discipular = lazy(() => import('./pages/Discipular'));
const Enviar = lazy(() => import('./pages/Enviar'));
const NetworkAssignment = lazy(() => import('./components/NetworkAssignment'));
const Convenciones = lazy(() => import('./pages/Convenciones'));
const Encuentros = lazy(() => import('./pages/Encuentros'));
const KidsModule = lazy(() => import('./pages/KidsModule'));
const EscuelaDeArtes = lazy(() => import('./pages/EscuelaDeArtes'));
const AuditDashboard = lazy(() => import('./pages/AuditDashboard'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const SetupWizard = lazy(() => import('./pages/SetupWizard'));
const Metas = lazy(() => import('./pages/Metas'));
const PublicGuestRegistration = lazy(() => import('./pages/PublicGuestRegistration'));
const LegalDocuments = lazy(() => import('./pages/LegalDocuments'));

// 

const PrivateRoute = ({ children }) => {
  const { user, loading, isInitialized } = useAuth();
  
  // Show loading while checking authentication and initialization status
  if (loading) return <div>Loading...</div>;
  
  // If no user is logged in
  if (!user) {
    // If system is not initialized, go to setup
    if (!isInitialized) {
      return <Navigate to="/setup" />;
    }
    // If system is initialized, go to login
    return <Navigate to="/login" />;
  }
  
  // User is logged in, allow access
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div>Loading...</div>;
  const authorized = isAdmin();
  return user && authorized ? children : <Navigate to="/" />;
};

const UserManagementRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  const roles = user?.roles || [];
  const authorized = roles.some(r => ['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA'].includes(r));
  return user && authorized ? children : <Navigate to="/" />;
};

const KidsModuleRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div>Loading...</div>;
  
  // Check if user is ADMIN (always has access)
  if (isAdmin()) {
    return children;
  }
  
  // For non-admin users, we need to check if they have relationship with KIDS module
  // This will be checked asynchronously
  const [hasKidsAccess, setHasKidsAccess] = useState(null);
  
  useEffect(() => {
    const checkKidsAccess = async () => {
      try {
        // Check if user is coordinator of KIDS module
        const coordinatorRes = await api.get('/coordinators/module/kids');
        if (coordinatorRes.data && coordinatorRes.data.id === user.id) {
          setHasKidsAccess(true);
          return;
        }
        
        // Check if user has students enrolled in KIDS
        const studentsRes = await api.get('/kids/students/check-access');
        if (studentsRes.data.hasAccess) {
          setHasKidsAccess(true);
          return;
        }
        
        setHasKidsAccess(false);
      } catch (error) {
        console.error('Error checking KIDS access:', error);
        setHasKidsAccess(false);
      }
    };
    
    if (user) {
      checkKidsAccess();
    }
  }, [user]);
  
  if (hasKidsAccess === null) {
    return <div>Loading...</div>;
  }
  
  return user && hasKidsAccess ? children : <Navigate to="/" />;
};

const LegalDocumentsRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div>Loading...</div>;
  
  // Check if user is ADMIN (always has access)
  if (isAdmin()) {
    return children;
  }
  
  // For non-admin users, we need to check if they have relationship with KIDS module
  // This will be checked asynchronously
  const [hasKidsAccess, setHasKidsAccess] = useState(null);
  
  useEffect(() => {
    const checkKidsAccess = async () => {
      try {
        // Check if user is coordinator of KIDS module
        const coordinatorRes = await api.get('/coordinators/module/kids');
        if (coordinatorRes.data && coordinatorRes.data.id === user.id) {
          setHasKidsAccess(true);
          return;
        }
        
        // Check if user has students enrolled in KIDS
        const studentsRes = await api.get('/kids/students/check-access');
        if (studentsRes.data.hasAccess) {
          setHasKidsAccess(true);
          return;
        }
        
        setHasKidsAccess(false);
      } catch (error) {
        console.error('Error checking Legal Documents access:', error);
        setHasKidsAccess(false);
      }
    };
    
    if (user) {
      checkKidsAccess();
    }
  }, [user]);
  
  if (hasKidsAccess === null) {
    return <div>Loading...</div>;
  }
  
  return user && hasKidsAccess ? children : <Navigate to="/" />;
};

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[100dvh]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
);

const RouteTransitionHandler = () => {
  const location = useLocation();
  const { startLoading, stopLoading, updateProgress } = useLoading();
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPathRef.current) {
      startLoading();
      prevPathRef.current = location.pathname;

      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += Math.random() * 20;
        if (currentProgress > 90) {
          currentProgress = 95;
          clearInterval(interval);
        }
        updateProgress(Math.floor(currentProgress));
      }, 40);

      let isFinished = false;
      const finish = () => {
        if (!isFinished) {
          isFinished = true;
          stopLoading();
          clearInterval(interval);
        }
      };

      const timeout = setTimeout(finish, 1000);

      return () => {
        clearTimeout(timeout);
        finish();
      };
    }
  }, [location.pathname, startLoading, stopLoading, updateProgress]);

  return null;
};

// import { Toaster } from 'react-hot-toast';

function App() {
  // Initialize mobile debugging in development only if enabled
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && import.meta.env.VITE_DEBUG_MOBILE) {
      mobileDebug.init();
    }
  }, []);

  return (
    <ThemeProvider>
      <LoadingProvider>
        <BrowserRouter>
          <AuthProvider>
            <ConnectivityHandler />
            <RouteTransitionHandler />
            <LoadingOverlay />
            {/* <Toaster position="top-right" toastOptions={{ duration: 4000 }} /> */}
            <Suspense fallback={<TransitionLoader />}>
              <Routes>
                <Route path="/setup" element={<SetupWizard />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/public-guest-registration" element={<PublicGuestRegistration />} />

                <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                  <Route index element={<Home />} />
                  <Route path="metas" element={<Metas />} />
                  <Route path="ganar" element={<Ganar />} />
                  <Route path="consolidar" element={<Consolidar />} />
                  <Route path="discipular" element={<Discipular />} />
                  <Route path="enviar" element={<Enviar />} />
                  <Route path="encuentros" element={<Encuentros />} />
                  <Route path="kids" element={<KidsModuleRoute><KidsModule /></KidsModuleRoute>} />
                  <Route path="escuela-de-artes" element={<EscuelaDeArtes />} />
                  <Route path="convenciones" element={<Convenciones />} />
                  <Route path="network" element={<NetworkAssignment />} />
                  <Route path="usuarios" element={<UserManagementRoute><UserManagement /></UserManagementRoute>} />
                  <Route path="auditoria" element={<AdminRoute><AuditDashboard /></AdminRoute>} />
                  <Route path="documentos-legales" element={<LegalDocumentsRoute><LegalDocuments /></LegalDocumentsRoute>} />
                </Route>
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </LoadingProvider>
    </ThemeProvider>
  );
}

export default App;
