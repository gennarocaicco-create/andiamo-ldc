import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, signUp } from '../services/auth.js';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp(pseudo, password);
      } else {
        await signIn(pseudo, password);
      }
      navigate('/');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="app-shell"
      style={{
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: 40,
        background: 'radial-gradient(130% 90% at 50% 0%, #12275C 0%, #0A1A45 45%, #081538 100%)',
        color: '#fff',
      }}
    >
      <div style={{ textAlign: 'center', marginTop: 64, padding: '0 24px' }}>
        <svg viewBox="0 0 24 24" fill="none" style={{ width: 44, height: 44, margin: '0 auto 16px', display: 'block' }}>
          <path
            d="M12 1.5l2.9 6.6 7.1.7-5.4 4.8 1.6 7.1L12 17.1l-6.2 3.6 1.6-7.1L2 9.8l7.1-.7L12 1.5z"
            fill="#F3DA8C"
          />
        </svg>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 32 }}>Andiamo-LDC</div>
        <div style={{ width: 52, height: 2, background: 'var(--gold)', margin: '10px auto' }} />
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>
          Pronostics · Ligue des Champions 🚀
        </div>
      </div>

      <div style={{ display: 'flex', margin: '40px 24px 22px', background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 4 }}>
        {['login', 'signup'].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 11, border: 'none', cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 13.5,
              background: mode === m ? '#fff' : 'transparent',
              color: mode === m ? 'var(--navy)' : 'rgba(255,255,255,0.55)',
            }}
          >
            {m === 'login' ? 'Se connecter' : 'Créer un compte'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '0 24px' }}>
        <div style={{ marginBottom: 14 }}>
          <label className="field-label" style={{ color: 'rgba(255,255,255,0.5)' }}>Pseudo</label>
          <input
            className="field-input"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)', color: '#fff' }}
            type="text"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            placeholder="Ton pseudo"
            required
            minLength={3}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label className="field-label" style={{ color: 'rgba(255,255,255,0.5)' }}>Mot de passe</label>
          <div style={{ position: 'relative' }}>
            <input
              className="field-input"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1.5px solid rgba(255,255,255,0.12)', color: '#fff', paddingRight: 44 }}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                display: 'flex', alignItems: 'center',
              }}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2">
                  <path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-10-8-10-8a18.4 18.4 0 015.06-6.06M9.9 4.24A10.94 10.94 0 0112 4c7 0 10 8 10 8a18.5 18.5 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {error && <div className="error-text">{error}</div>}

        <button type="submit" className="btn btn-gold btn-block" style={{ marginTop: 22 }} disabled={loading}>
          {loading ? 'Un instant...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
        </button>
      </form>

      <div style={{ textAlign: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: 'rgba(255,255,255,0.4)', marginTop: 'auto', paddingTop: 30 }}>
        En continuant, tu confirmes que ton pseudo sera visible de <b style={{ color: 'rgba(255,255,255,0.65)' }}>tous les participants</b> dans le classement.
      </div>
    </div>
  );
}

function friendlyError(err) {
  const code = err?.code || '';
  if (code.includes('wrong-password') || code.includes('invalid-credential')) return 'Pseudo ou mot de passe incorrect.';
  if (code.includes('email-already-in-use')) return 'Ce pseudo est déjà pris.';
  if (code.includes('weak-password')) return 'Le mot de passe doit faire au moins 8 caractères.';
  if (code.includes('user-not-found')) return 'Aucun compte avec ce pseudo.';
  return err.message || 'Une erreur est survenue.';
}
