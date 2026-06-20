import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Page Inscription — WentzyFace
 * --------------------------------
 * Formulaire de creation de compte avec :
 *   - Validation de complexite du mot de passe cote client (8+ cars,
 *     majuscule, minuscule, chiffre, caractere special) — identique au backend
 *   - Bouton "œil" afficher/masquer sur chaque champ mot de passe
 *   - Confirmation du mot de passe avant soumission
 */

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

/** Champ mot de passe avec bouton oeil (reutilise pour password + confirmPassword) */
const PasswordField = ({ id, name, value, onChange, placeholder, label, hint }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required
          minLength={8}
          style={{ paddingRight: '42px' }}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          title={visible ? 'Masquer le mot de passe' : 'Voir le mot de passe'}
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
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {hint && <span className="text-muted">{hint}</span>}
    </div>
  );
};

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!PASSWORD_REGEX.test(form.password)) {
      setError(
        'Le mot de passe doit contenir au moins 8 caracteres, dont une majuscule, une minuscule, un chiffre et un caractere special.'
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      await register({
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password
      });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la creation du compte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-layout">
        <div className="auth-brand">
          <h1>WentzyFace</h1>
          <p>Rejoins la communaute et partage tes moments.</p>
        </div>

        <div className="card auth-card">
          <h2>Creer un compte</h2>

          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="fullName">Nom complet</label>
              <input
                id="fullName" type="text" name="fullName"
                value={form.fullName} onChange={handleChange}
                placeholder="Jean Dupont" required maxLength={60}
              />
            </div>

            <div className="field">
              <label htmlFor="username">Nom d'utilisateur</label>
              <input
                id="username" type="text" name="username"
                value={form.username} onChange={handleChange}
                placeholder="jean.dupont" required minLength={3} maxLength={30}
                pattern="[a-zA-Z0-9._]+"
                title="Lettres, chiffres, points et underscores uniquement"
              />
            </div>

            <div className="field">
              <label htmlFor="email">Adresse e-mail</label>
              <input
                id="email" type="email" name="email"
                value={form.email} onChange={handleChange}
                placeholder="exemple@email.com" required
              />
            </div>

            <PasswordField
              id="password" name="password"
              value={form.password} onChange={handleChange}
              label="Mot de passe"
              placeholder="Ex: Wentzy2025!"
              hint="8 caracteres min. — majuscule, minuscule, chiffre, caractere special (ex: ! @ # ?)"
            />

            <PasswordField
              id="confirmPassword" name="confirmPassword"
              value={form.confirmPassword} onChange={handleChange}
              label="Confirmer le mot de passe"
              placeholder="Repete ton mot de passe"
            />

            <button
              type="submit"
              className="btn btn--primary btn--block"
              disabled={loading}
              style={{ marginTop: '8px', padding: '12px', fontSize: '16px' }}
            >
              {loading ? 'Creation...' : "S'inscrire"}
            </button>
          </form>

          <hr className="auth-card__divider" />

          <div className="auth-card__footer-link">
            <span className="text-muted">Deja un compte ?&nbsp;</span>
            <Link to="/login">Se connecter</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
