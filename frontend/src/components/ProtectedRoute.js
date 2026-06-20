import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute
 * --------------
 * Empeche l'acces a une page si l'utilisateur n'est pas connecte.
 * Pendant la verification initiale de la session (`loading`), on affiche
 * un simple indicateur de chargement pour eviter un "flash" vers /login.
 *
 * Utilisation dans App.js :
 *   <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="spinner" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
