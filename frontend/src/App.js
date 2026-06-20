import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import FriendsPage from './pages/FriendsPage';
import MessagesPage from './pages/MessagesPage';

/**
 * App – Routage principal
 * -----------------------
 * Deux familles de routes :
 *
 * 1. Routes publiques (non authentifie) :
 *    /login   -> LoginPage
 *    /register -> RegisterPage
 *    Redirigent vers "/" si l'utilisateur est deja connecte.
 *
 * 2. Routes protegees (authentifie requis) :
 *    Chaque route est enveloppee dans <ProtectedRoute> qui redirige
 *    vers /login si l'utilisateur n'est pas connecte.
 *    La Navbar est affichee sur toutes ces routes.
 */
const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <Routes>
      {/* ---- Routes publiques ---- */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/" replace /> : <RegisterPage />}
      />

      {/* ---- Routes protegees (avec Navbar) ---- */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <>
              <Navbar />
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/profile/:id" element={<ProfilePage />} />
                <Route path="/friends" element={<FriendsPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                {/* Toute autre URL redirige vers le fil d'actualite */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;
