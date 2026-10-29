import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Cloud,
  ArrowRight,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { TataganLogo } from './TataganLogo';

export interface AuthScreenProps {
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
  theme?: 'dark' | 'light';
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLogin,
  onRegister,
  onRequestPasswordReset,
  theme = 'dark',
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const validateForm = (): string | null => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return 'Informe um endereço de e-mail válido.';
    }
    if (mode === 'forgot') return null;

    if (password.length < 6) {
      return 'A senha deve possuir no mínimo 6 caracteres.';
    }
    if (mode === 'register') {
      if (!displayName.trim()) {
        return 'Informe seu nome ou apelido de treino.';
      }
      if (password !== confirmPassword) {
        return 'As senhas não conferem. Verifique e digite novamente.';
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
          setInfoMsg('Conectado com sucesso! Carregando seus treinos...');
        }
      } else if (mode === 'register') {
        const res = await onRegister(
          email.trim(),
          password,
          displayName.trim()
        );
        if (!res.ok) {
          setErrorMsg(res.error || 'Não foi possível criar sua conta.');
        } else if (res.info) {
          setInfoMsg(res.info);
        } else {
          setInfoMsg('Conta criada com sucesso! Sincronizando dados...');
        }
      } else if (mode === 'forgot') {
        const res = await onRequestPasswordReset(email.trim());
        if (!res.ok) {
          setErrorMsg(
            res.error || 'Não foi possível enviar o e-mail de redefinição.'
          );
        } else {
          setInfoMsg(
            res.info ||
              'Instruções enviadas! Verifique sua caixa de entrada para redefinir a senha.'
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        boxSizing: 'border-box',
        color: '#FFFFFF',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          backgroundColor: '#161618',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 20,
          padding: '28px 22px',
          boxSizing: 'border-box',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Branding & Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              padding: 12,
              borderRadius: 16,
              backgroundColor: 'rgba(0, 114, 245, 0.1)',
              border: '1px solid rgba(0, 114, 245, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TataganLogo theme="dark" size={34} />
          </div>

          <div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: -0.3,
                margin: 0,
                color: '#FFFFFF',
              }}
            >
              {mode === 'login'
                ? 'Entrar no Tatagan.sh'
                : mode === 'register'
                ? 'Criar Nova Conta'
                : 'Recuperar Senha'}
            </h1>
            <p
              style={{
                fontSize: 13,
                color: '#8E8E93',
                margin: '6px 0 0 0',
                lineHeight: 1.4,
              }}
            >
              {mode === 'login'
                ? 'Acesse com sua conta para visualizar suas rotinas e histórico sincronizados.'
                : mode === 'register'
                ? 'Crie sua conta para manter seus treinos e rotinas sincronizados no PC e no celular.'
                : 'Informe seu e-mail para receber as instruções de recuperação.'}
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs (Login / Register) */}
        {mode !== 'forgot' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              backgroundColor: '#242426',
              padding: 4,
              borderRadius: 12,
              gap: 4,
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
                padding: '10px 0',
                borderRadius: 9,
                fontWeight: 700,
                fontSize: 13,
                backgroundColor: mode === 'login' ? '#0072F5' : 'transparent',
                color: mode === 'login' ? '#FFFFFF' : '#8E8E93',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Entrar (Login)
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
                padding: '10px 0',
                borderRadius: 9,
                fontWeight: 700,
                fontSize: 13,
                backgroundColor: mode === 'register' ? '#0072F5' : 'transparent',
                color: mode === 'register' ? '#FFFFFF' : '#8E8E93',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Criar Conta
            </button>
          </div>
        )}

        {/* Alerts & Feedback */}
        {errorMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 12,
              backgroundColor: 'rgba(255, 69, 58, 0.12)',
              border: '1px solid rgba(255, 69, 58, 0.3)',
              color: '#FF453A',
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 14px',
              borderRadius: 12,
              backgroundColor: 'rgba(48, 209, 88, 0.12)',
              border: '1px solid rgba(48, 209, 88, 0.3)',
              color: '#30D158',
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Form Fields */}
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          {/* Display Name (Register only) */}
          {mode === 'register' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#AEAEB2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <UserIcon size={14} color="#0072F5" />
                Seu Nome ou Apelido de Atleta
              </label>
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  required
                  placeholder="Ex: Lucas Silva"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  style={{
                    width: '100%',
                    height: 48,
                    borderRadius: 10,
                    backgroundColor: '#242426',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    padding: '0 14px',
                    color: '#FFFFFF',
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#AEAEB2',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Mail size={14} color="#0072F5" />
              Endereço de E-mail
            </label>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <input
                type="email"
                required
                autoComplete="email"
                autoCapitalize="none"
                inputMode="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 10,
                  backgroundColor: '#242426',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  padding: '0 14px',
                  color: '#FFFFFF',
                  fontSize: 15,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Password (Login / Register) */}
          {mode !== 'forgot' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#AEAEB2',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Lock size={14} color="#0072F5" />
                  Senha de Acesso
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
                      border: 'none',
                      background: 'transparent',
                      color: '#0072F5',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={
                    mode === 'login' ? 'current-password' : 'new-password'
                  }
                  placeholder={
                    mode === 'register'
                      ? 'Mínimo de 6 caracteres'
                      : 'Sua senha'
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    height: 48,
                    borderRadius: 10,
                    backgroundColor: '#242426',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    padding: '0 44px 0 14px',
                    color: '#FFFFFF',
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  style={{
                    position: 'absolute',
                    right: 12,
                    border: 'none',
                    background: 'transparent',
                    color: '#8E8E93',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 4,
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          )}

          {/* Confirm Password (Register only) */}
          {mode === 'register' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#AEAEB2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Lock size={14} color="#0072F5" />
                Confirmar Senha
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="Repita sua senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 10,
                  backgroundColor: '#242426',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  padding: '0 14px',
                  color: '#FFFFFF',
                  fontSize: 15,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              height: 50,
              borderRadius: 12,
              backgroundColor: '#0072F5',
              border: 'none',
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1,
              marginTop: 6,
              transition: 'background-color 0.15s ease',
              boxShadow: '0 4px 14px rgba(0, 114, 245, 0.4)',
            }}
          >
            {loading ? (
              <>
                <Loader2
                  size={18}
                  style={{ animation: 'spin 1s linear infinite' }}
                />
                <span>
                  {mode === 'login'
                    ? 'Conectando...'
                    : mode === 'register'
                    ? 'Criando conta...'
                    : 'Enviando...'}
                </span>
              </>
            ) : mode === 'login' ? (
              <>
                <span>Entrar no Tatagan.sh</span>
                <ArrowRight size={17} />
              </>
            ) : mode === 'register' ? (
              <>
                <Sparkles size={17} />
                <span>Criar Conta e Acessar</span>
              </>
            ) : (
              <>
                <KeyRound size={17} />
                <span>Enviar Link de Recuperação</span>
              </>
            )}
          </button>
        </form>

        {/* Back to Login (when in forgot mode) */}
        {mode === 'forgot' && (
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
              setInfoMsg(null);
            }}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#8E8E93',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            ← Voltar para o Login
          </button>
        )}

        {/* Security & Device Persistence Note */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 12,
            backgroundColor: '#1C1C1E',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: 'rgba(48, 209, 88, 0.12)',
              color: '#30D158',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={18} />
          </div>
          <div style={{ fontSize: 11, color: '#8E8E93', lineHeight: 1.45 }}>
            <strong style={{ color: '#E5E5EA', display: 'block' }}>
              Sessão salva automaticamente
            </strong>
            Após o login, sua conta permanecerá conectada neste aparelho com
            sincronização automática na nuvem.
          </div>
        </div>
      </div>
    </div>
  );
};
