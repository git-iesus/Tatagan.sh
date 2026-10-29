import React, { useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  RefreshCw,
  Database,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';
import type { SyncStatus } from '../hooks/useSupabaseSync';
import { TataganLogo } from './TataganLogo';

export interface AuthModalProps {
  user: SupabaseUser | null;
  status: SyncStatus;
  configured: boolean;
  lastSyncedAt: number | null;
  lastError?: string | null;
  routinesCount?: number;
  onClose: () => void;
  onLogin: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onRegister: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ ok: boolean; error?: string; info?: string }>;
  onRequestPasswordReset: (
    email: string
  ) => Promise<{ ok: boolean; error?: string; info?: string }>;
  onLogout: () => void | Promise<void>;
  onForceSync: () => Promise<void>;
  onPushToCloud?: () => Promise<void>;
  onPullFromCloud?: () => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  user,
  status,
  configured,
  lastSyncedAt,
  lastError,
  routinesCount,
  onClose,
  onLogin,
  onRegister,
  onRequestPasswordReset,
  onLogout,
  onForceSync,
  onPushToCloud,
  onPullFromCloud,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const validateForm = (): string | null => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return 'Informe um endereço de e-mail válido.';
    }
    if (mode === 'forgot') return null;

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
    setInfoMsg(null);

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
          setInfoMsg('Login realizado com sucesso! Sincronizando dados...');
          setTimeout(() => onClose(), 800);
        }
      } else if (mode === 'register') {
        const res = await onRegister(
          email.trim(),
          password,
          displayName.trim()
        );
        if (!res.ok) {
          setErrorMsg(res.error || 'Não foi possível criar a conta.');
        } else if (res.info) {
          setInfoMsg(res.info);
        } else {
          setInfoMsg('Conta criada com sucesso! Sincronizando dados...');
          setTimeout(() => onClose(), 800);
        }
      } else if (mode === 'forgot') {
        const res = await onRequestPasswordReset(email.trim());
        if (!res.ok) {
          setErrorMsg(res.error || 'Não foi possível enviar o e-mail de redefinição.');
        } else {
          setInfoMsg(
            res.info ||
              'Se este e-mail estiver cadastrado, enviamos as instruções de redefinição de senha.'
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyEnvSample = () => {
    const text = `VITE_SUPABASE_URL=https://xyzcompany.supabase.co\nVITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`;
    navigator.clipboard?.writeText(text);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
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
        {/* Top Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TataganLogo size={24} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--hevy-blue)',
                backgroundColor: 'rgba(0, 114, 245, 0.12)',
                padding: '3px 8px',
                borderRadius: 6,
                letterSpacing: 0.5,
              }}
            >
              SUPABASE CLOUD
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
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
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ==================== CASE 1: SUPABASE NOT CONFIGURED ==================== */}
        {!configured ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              className="hevy-card"
              style={{
                background:
                  'linear-gradient(135deg, rgba(255, 149, 0, 0.14) 0%, rgba(28, 28, 30, 0.96) 100%)',
                borderColor: 'rgba(255, 149, 0, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 149, 0, 0.2)',
                    color: 'var(--hevy-orange)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Database size={20} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--hevy-orange)',
                      textTransform: 'uppercase',
                    }}
                  >
                    CONFIGURAÇÃO DO BANCO SUPABASE
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                    Aguardando Credenciais de Nuvem
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: 13,
                color: 'var(--hevy-text-secondary)',
                lineHeight: 1.55,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <p>
                O código de sincronização com o <strong>Supabase</strong> já
                está pronto e integrado ao aplicativo! Para ativar a
                sincronização automática entre o computador e o celular:
              </p>

              <ol
                style={{
                  margin: 0,
                  paddingLeft: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <li>
                  Acesse <strong>supabase.com</strong>, crie um projeto
                  gratuito e abra o menu <strong>SQL Editor</strong>.
                </li>
                <li>
                  Cole e execute o conteúdo do arquivo{' '}
                  <code style={{ color: 'var(--hevy-blue)' }}>
                    supabase_schema.sql
                  </code>{' '}
                  incluso no projeto.
                </li>
                <li>
                  Vá em <strong>Project Settings → API</strong> e copie a{' '}
                  <strong>Project URL</strong> e a <strong>anon public API key</strong>.
                </li>
                <li>
                  No painel da <strong>Vercel</strong> (Settings → Environment
                  Variables) ou no arquivo <code>.env</code> local, adicione:
                  <div
                    style={{
                      backgroundColor: 'var(--hevy-elevated)',
                      padding: 10,
                      borderRadius: 8,
                      marginTop: 6,
                      fontFamily: 'monospace',
                      fontSize: 12,
                      color: 'var(--hevy-text)',
                      overflowX: 'auto',
                    }}
                  >
                    VITE_SUPABASE_URL=https://seu-projeto.supabase.co
                    <br />
                    VITE_SUPABASE_ANON_KEY=sua-chave-anon-public
                  </div>
                </li>
              </ol>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 8,
                  backgroundColor: 'var(--hevy-green-soft)',
                  color: 'var(--hevy-green)',
                  fontSize: 12,
                }}
              >
                <ShieldCheck size={16} />
                <span>
                  Seus dados continuam salvos com segurança no armazenamento
                  local deste dispositivo.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                className="hevy-btn-secondary"
                style={{ flex: 1, fontSize: 13 }}
                onClick={handleCopyEnvSample}
              >
                {copiedEnv ? 'Copiado!' : 'Copiar Variáveis (.env)'}
              </button>
              <button
                type="button"
                className="hevy-btn-primary"
                style={{ flex: 1, fontSize: 13 }}
                onClick={onClose}
              >
                Entendido
              </button>
            </div>
          </div>
        ) : user ? (
          /* ==================== CASE 2: LOGGED IN USER ==================== */
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
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    backgroundColor: 'var(--hevy-green-soft)',
                    color: 'var(--hevy-green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Cloud size={24} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--hevy-green)',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}
                  >
                    CONTA SUPABASE CONECTADA
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      marginTop: 2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {user.email}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--hevy-text-secondary)',
                      marginTop: 2,
                    }}
                  >
                    ID: {user.id.slice(0, 12)}... •{' '}
                    {lastSyncedAt
                      ? `Sincronizado às ${new Date(
                          lastSyncedAt
                        ).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}`
                      : 'Sincronizado'}
                  </div>
                </div>
              </div>
            </div>

            {/* Sync status card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 10,
                backgroundColor: 'var(--hevy-elevated)',
                fontSize: 12,
              }}
            >
              {status === 'syncing' ? (
                <>
                  <RefreshCw
                    size={15}
                    color="var(--hevy-blue)"
                    style={{ animation: 'spin 1s linear infinite' }}
                  />
                  <span>Sincronizando dados com o banco Supabase...</span>
                </>
              ) : status === 'offline' ? (
                <>
                  <WifiOff size={15} color="var(--hevy-orange)" />
                  <span>
                    Sem conexão no momento. Alterações serão enviadas ao
                    reconectar.
                  </span>
                </>
              ) : status === 'error' ? (
                <>
                  <AlertCircle size={15} color="var(--hevy-red)" />
                  <span style={{ color: 'var(--hevy-red)' }}>
                    {lastError
                      ? `Erro: ${lastError}`
                      : 'Erro ao sincronizar. Verifique a internet e tente novamente.'}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} color="var(--hevy-green)" />
                  <span>
                    Sincronização ativa. {routinesCount !== undefined ? `${routinesCount} rotinas neste aparelho.` : ''} Dados na nuvem.
                  </span>
                </>
              )}
            </div>

            <p
              style={{
                fontSize: 13,
                color: 'var(--hevy-text-secondary)',
                lineHeight: 1.5,
              }}
            >
              Qualquer treino salvo ou rotina editada no computador aparece
              instantaneamente no celular, e vice-versa.
            </p>

            {/* Quick Sync & Directional Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                className="hevy-btn-primary"
                style={{ width: '100%', padding: '12px' }}
                disabled={status === 'syncing'}
                onClick={onForceSync}
              >
                <RefreshCw
                  size={16}
                  style={{
                    animation:
                      status === 'syncing'
                        ? 'spin 1s linear infinite'
                        : undefined,
                  }}
                />
                {status === 'syncing'
                  ? 'Sincronizando...'
                  : 'Sincronizar Tudo (Auto)'}
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {onPullFromCloud && (
                  <button
                    type="button"
                    className="hevy-btn-secondary"
                    style={{ fontSize: 12, padding: '10px 8px' }}
                    disabled={status === 'syncing'}
                    onClick={async () => {
                      await onPullFromCloud();
                      setInfoMsg('Dados baixados da nuvem!');
                      setTimeout(() => setInfoMsg(null), 3000);
                    }}
                    title="Baixar as rotinas salvas na nuvem para este aparelho"
                  >
                    ⬇️ Baixar da Nuvem
                  </button>
                )}

                {onPushToCloud && (
                  <button
                    type="button"
                    className="hevy-btn-secondary"
                    style={{ fontSize: 12, padding: '10px 8px' }}
                    disabled={status === 'syncing'}
                    onClick={async () => {
                      await onPushToCloud();
                      setInfoMsg('Dados deste aparelho salvos na nuvem!');
                      setTimeout(() => setInfoMsg(null), 3000);
                    }}
                    title="Enviar as rotinas deste aparelho para a nuvem"
                  >
                    ⬆️ Subir para Nuvem
                  </button>
                )}
              </div>

              <button
                type="button"
                className="hevy-btn-secondary"
                style={{
                  color: 'var(--hevy-red)',
                  borderColor: 'rgba(255,75,75,0.3)',
                  marginTop: 4,
                  padding: '10px',
                }}
                onClick={async () => {
                  await onLogout();
                  onClose();
                }}
              >
                <LogOut size={16} /> Sair (Logout)
              </button>
            </div>
          </div>
        ) : (
          /* ==================== CASE 3: LOGIN / REGISTER / FORGOT FORM ==================== */
          <>
            <div>
              <h3 style={{ fontSize: 19, fontWeight: 700 }}>
                {mode === 'login'
                  ? 'Entrar na sua Conta Tatagan.sh'
                  : mode === 'register'
                  ? 'Criar Conta no Supabase'
                  : 'Redefinir Senha'}
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--hevy-text-secondary)',
                  marginTop: 4,
                  lineHeight: 1.45,
                }}
              >
                {mode === 'forgot'
                  ? 'Informe seu e-mail para receber as instruções de recuperação.'
                  : 'Mantenha rotinas, descanso e histórico sincronizados no celular e no computador.'}
              </p>
            </div>

            {/* Mode Switcher */}
            {mode !== 'forgot' && (
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
                    setInfoMsg(null);
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
                    cursor: 'pointer',
                  }}
                >
                  Login (Já tenho conta)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg(null);
                    setInfoMsg(null);
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
                    cursor: 'pointer',
                  }}
                >
                  Cadastro (Criar conta)
                </button>
              </div>
            )}

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

            {infoMsg && (
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
                <span>{infoMsg}</span>
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
                    <UserIcon size={17} color="var(--hevy-text-muted)" />
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
                        fontSize: 15,
                        color: 'var(--hevy-text)',
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
                      fontSize: 15,
                      color: 'var(--hevy-text)',
                    }}
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
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
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          setErrorMsg(null);
                          setInfoMsg(null);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: 11,
                          color: 'var(--hevy-blue)',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        Esqueci a senha
                      </button>
                    )}
                  </div>
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
                        fontSize: 15,
                        color: 'var(--hevy-text)',
                      }}
                    />
                  </div>
                </div>
              )}

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
                        fontSize: 15,
                        color: 'var(--hevy-text)',
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
                  marginTop: 6,
                  opacity: loading ? 0.75 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Conectando ao Supabase...</span>
                  </>
                ) : mode === 'login' ? (
                  'Entrar e Sincronizar'
                ) : mode === 'register' ? (
                  'Criar Conta e Salvar na Nuvem'
                ) : (
                  'Enviar Link de Recuperação'
                )}
              </button>

              {mode === 'forgot' && (
                <button
                  type="button"
                  className="hevy-btn-secondary"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                    setInfoMsg(null);
                  }}
                  style={{ width: '100%', fontSize: 13 }}
                >
                  Voltar para o Login
                </button>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
};
