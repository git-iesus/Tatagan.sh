import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { AuthSession } from '../utils/cloudSync';
import { TataganLogo } from './TataganLogo';

interface AuthModalProps {
  session: AuthSession | null;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  onRegister: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onLogout: () => void;
  onForceSync: () => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  session,
  syncStatus,
  onClose,
  onLogin,
  onRegister,
  onLogout,
  onForceSync,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const validateForm = (): string | null => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return 'Informe um endereço de e-mail válido.';
    }
    if (password.length < 6) {
      return 'A senha deve possuir pelo menos 6 caracteres.';
    }
    if (mode === 'register') {
      if (!displayName.trim()) {
        return 'Informe seu nome ou apelido de atleta.';
      }
      if (password !== confirmPassword) {
        return 'A confirmação de senha não confere.';
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const validationError = validateForm();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await onLogin(email.trim(), password);
        if (!res.ok) {
          setErrorMsg(res.error || 'Não foi possível entrar na conta.');
        } else {
          setSuccessMsg(
            'Login realizado! Suas rotinas e histórico foram sincronizados.'
          );
          setTimeout(() => onClose(), 700);
        }
      } else {
        const res = await onRegister(
          email.trim(),
          password,
          displayName.trim()
        );
        if (!res.ok) {
          setErrorMsg(res.error || 'Não foi possível criar a conta.');
        } else {
          setSuccessMsg(
            'Conta criada e dados locais sincronizados com a nuvem!'
          );
          setTimeout(() => onClose(), 700);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hevy-modal-backdrop" onClick={onClose}>
      <div
        className="hevy-modal-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: 20,
          gap: 16,
          maxHeight: '94%',
          overflowY: 'auto',
        }}
      >
        {/* Top Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <TataganLogo size={24} />
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--hevy-elevated)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--hevy-text)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {session ? (
          /* LOGGED IN VIEW */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              className="hevy-card"
              style={{
                background:
                  'linear-gradient(135deg, rgba(42, 204, 88, 0.16) 0%, rgba(28, 28, 30, 0.96) 100%)',
                borderColor: 'rgba(42, 204, 88, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    backgroundColor: 'var(--hevy-green-soft)',
                    color: 'var(--hevy-green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Cloud size={22} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--hevy-green)',
                      textTransform: 'uppercase',
                    }}
                  >
                    CONTA CONECTADA & SINCRONIZADA
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                    {session.email}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--hevy-text-secondary)',
                      marginTop: 2,
                    }}
                  >
                    ID: {session.userId} • Última sinc.:{' '}
                    {new Date(session.lastSyncedAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            </div>

            <p
              style={{
                fontSize: 13,
                color: 'var(--hevy-text-secondary)',
                lineHeight: 1.5,
              }}
            >
              Suas rotinas criadas ou editadas no computador e seus treinos
              concluídos no celular são vinculados automaticamente ao seu{' '}
              <code>user_id</code> na nuvem.
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="hevy-btn-primary"
                style={{ flex: 1 }}
                disabled={syncStatus === 'syncing'}
                onClick={onForceSync}
              >
                <RefreshCw
                  size={16}
                  style={{
                    animation:
                      syncStatus === 'syncing'
                        ? 'spin 1s linear infinite'
                        : undefined,
                  }}
                />
                {syncStatus === 'syncing'
                  ? 'Sincronizando...'
                  : 'Sincronizar Agora'}
              </button>

              <button
                type="button"
                className="hevy-btn-secondary"
                style={{ color: 'var(--hevy-red)', borderColor: 'rgba(255,75,75,0.3)' }}
                onClick={() => {
                  onLogout();
                  onClose();
                }}
              >
                <LogOut size={16} /> Sair (Logout)
              </button>
            </div>
          </div>
        ) : (
          /* LOGIN / REGISTER FORM VIEW */
          <>
            <div>
              <h3 style={{ fontSize: 19, fontWeight: 700 }}>
                {mode === 'login'
                  ? 'Entrar na sua Conta Tatagan.sh'
                  : 'Criar Conta na Nuvem Tatagan.sh'}
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--hevy-text-secondary)',
                  marginTop: 4,
                  lineHeight: 1.45,
                }}
              >
                Acesse suas rotinas, tempos de descanso e histórico de treinos
                tanto no computador quanto no navegador do celular.
              </p>
            </div>

            {/* Mode Switcher */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                backgroundColor: 'var(--hevy-elevated)',
                padding: 3,
                borderRadius: 10,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                style={{
                  border: 'none',
                  padding: '9px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  backgroundColor:
                    mode === 'login' ? 'var(--hevy-card)' : 'transparent',
                  color:
                    mode === 'login'
                      ? 'var(--hevy-text)'
                      : 'var(--hevy-text-secondary)',
                }}
              >
                Login (Já tenho conta)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                }}
                style={{
                  border: 'none',
                  padding: '9px',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  backgroundColor:
                    mode === 'register' ? 'var(--hevy-card)' : 'transparent',
                  color:
                    mode === 'register'
                      ? 'var(--hevy-text)'
                      : 'var(--hevy-text-secondary)',
                }}
              >
                Cadastro (Criar conta)
              </button>
            </div>

            {errorMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 10,
                  backgroundColor: 'var(--hevy-red-soft)',
                  color: 'var(--hevy-red)',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 10,
                  backgroundColor: 'var(--hevy-green-soft)',
                  color: 'var(--hevy-green)',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {mode === 'register' && (
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--hevy-text-secondary)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Seu Nome / Apelido
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: 'var(--hevy-elevated)',
                      borderRadius: 10,
                      padding: '0 12px',
                      height: 44,
                      marginTop: 4,
                      border: '1px solid var(--hevy-border)',
                    }}
                  >
                    <User size={17} color="var(--hevy-text-muted)" />
                    <input
                      type="text"
                      placeholder="Ex: Iesus Candido"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      style={{
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: 16,
                      }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--hevy-text-secondary)',
                    textTransform: 'uppercase',
                  }}
                >
                  E-mail
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: 'var(--hevy-elevated)',
                    borderRadius: 10,
                    padding: '0 12px',
                    height: 44,
                    marginTop: 4,
                    border: '1px solid var(--hevy-border)',
                  }}
                >
                  <Mail size={17} color="var(--hevy-text-muted)" />
                  <input
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    style={{
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      width: '100%',
                      fontSize: 16,
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--hevy-text-secondary)',
                    textTransform: 'uppercase',
                  }}
                >
                  Senha
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    backgroundColor: 'var(--hevy-elevated)',
                    borderRadius: 10,
                    padding: '0 12px',
                    height: 44,
                    marginTop: 4,
                    border: '1px solid var(--hevy-border)',
                  }}
                >
                  <Lock size={17} color="var(--hevy-text-muted)" />
                  <input
                    type="password"
                    placeholder="Mínimo de 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={
                      mode === 'login' ? 'current-password' : 'new-password'
                    }
                    style={{
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      width: '100%',
                      fontSize: 16,
                    }}
                  />
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--hevy-text-secondary)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Confirmar Senha
                  </label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: 'var(--hevy-elevated)',
                      borderRadius: 10,
                      padding: '0 12px',
                      height: 44,
                      marginTop: 4,
                      border: '1px solid var(--hevy-border)',
                    }}
                  >
                    <Lock size={17} color="var(--hevy-text-muted)" />
                    <input
                      type="password"
                      placeholder="Repita sua senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      style={{
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: 16,
                      }}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="hevy-btn-primary"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '13px',
                  fontSize: 15,
                  marginTop: 4,
                  opacity: loading ? 0.75 : 1,
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} />
                    <span>Conectando e Sincronizando...</span>
                  </>
                ) : mode === 'login' ? (
                  'Entrar e Sincronizar Dados'
                ) : (
                  'Criar Conta e Salvar na Nuvem'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
