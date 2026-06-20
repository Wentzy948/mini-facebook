import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Page Connexion — WentzyFace
 * ----------------------------
 * Formulaire email + mot de passe avec bouton oeil afficher/masquer.
 * Appelle login() du AuthContext → POST /api/auth/login → token JWT
 * stocke en localStorage → redirection vers le fil d'actualite.
 */
const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Email ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-layout">
        <div className="auth-brand">
          <h1>WentzyFace</h1>
          <p>Connecte-toi avec tes amis et partage tes moments.</p>
        </div>

        <div className="card auth-card">
          <h2>Connexion</h2>

          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Adresse e-mail</label>
              <input
                id="email" type="email" name="email"
                value={form.email} onChange={handleChange}
                placeholder="exemple@email.com"
                autoComplete="email" required
              />
            </div>

            {/* Champ mot de passe avec bouton œil afficher/masquer */}
            <div className="field">
              <label htmlFor="password">Mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  style={{ paddingRight: '42px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  title={showPassword ? 'Masquer le mot de passe' : 'Voir le mot de passe'}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                    lineHeight: 0,
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn--primary btn--block"
              disabled={loading}
              style={{ marginTop: '8px', padding: '12px', fontSize: '17px' }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <hr className="auth-card__divider" />

          <div className="auth-card__footer-link">
            <span className="text-muted">Pas encore de compte ?&nbsp;</span>
            <Link to="/register">Cree un compte</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
