import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  ShieldCheck,
  Sparkles,
  Shield,
  KeyRound,
  Send,
  Clock,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { api } from '../api';
import type { User, LoginCredentials, RegisterData } from '../types';
import { playWelcomeSound } from '../utils/soundEffects';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
  defaultMode?: 'login' | 'register';
}

export function AuthModal({
  isOpen,
  onClose,
  onAuthSuccess,
  defaultMode = 'login',
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Email OTP States
  const [otpStep, setOtpStep] = useState<'email' | 'code'>('email');
  const [otpEmail, setOtpEmail] = useState<string>('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState<number>(0);
  const [otpSending, setOtpSending] = useState<boolean>(false);
  const [otpVerifying, setOtpVerifying] = useState<boolean>(false);

  // Sign Up / Register OTP Verification States
  const [registerStep, setRegisterStep] = useState<'form' | 'otp'>('form');
  const [registerSending, setRegisterSending] = useState<boolean>(false);

  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [otpTimer]);

  // Form States
  const [loginForm, setLoginForm] = useState<LoginCredentials>({
    username_or_email: '',
    password: '',
  });

  const [registerForm, setRegisterForm] = useState<RegisterData & { confirmPassword: '' }>({
    full_name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  if (!isOpen) return null;

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const targetEmail = (otpEmail.trim() || loginForm.username_or_email.trim()).toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      setError('Please provide a valid email address to receive OTP.');
      return;
    }

    setOtpEmail(targetEmail);
    setOtpSending(true);

    try {
      const res = await api.sendEmailOTP({ email: targetEmail, purpose: 'login' });
      setOtpStep('code');
      setOtpTimer(res.cooldown_seconds || 60);
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        const firstInput = document.getElementById('modal-otp-input-0');
        if (firstInput) (firstInput as HTMLInputElement).focus();
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch OTP code.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const code = otpDigits.join('').trim();
    if (code.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setOtpVerifying(true);
    try {
      const res = await api.verifyEmailOTP({
        email: otpEmail.trim(),
        otp_code: code,
      });
      playWelcomeSound();
      onAuthSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = clean;
    setOtpDigits(updated);

    if (clean && index < 5) {
      const nextInput = document.getElementById(`modal-otp-input-${index + 1}`);
      if (nextInput) (nextInput as HTMLInputElement).focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`modal-otp-input-${index - 1}`);
      if (prevInput) (prevInput as HTMLInputElement).focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const updated = ['', '', '', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        updated[i] = pasted[i];
      }
      setOtpDigits(updated);
      const targetFocusIdx = Math.min(pasted.length, 5);
      const targetInput = document.getElementById(`modal-otp-input-${targetFocusIdx}`);
      if (targetInput) (targetInput as HTMLInputElement).focus();
    }
  };


  const handleFillDemoAdmin = () => {
    setMode('login');
    setLoginForm({
      username_or_email: 'atlas_admin',
      password: 'AtlasAdmin123!',
    });
    setError(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loginForm.username_or_email.trim() || !loginForm.password) {
      setError('Please provide username/email and password.');
      return;
    }

    if (api.isOfflineMode()) {
      const isSoubhagya = loginForm.username_or_email.toLowerCase().includes('soubhagya');
      const profileName = isSoubhagya ? 'Soubhagya Pattanayak' : (loginForm.username_or_email.split('@')[0] || 'ATLAS Scholar');
      const role = isSoubhagya ? 'admin' : 'student';
      const authRes = api.loginOffline(profileName, role, loginForm.username_or_email.trim());
      playWelcomeSound();
      onAuthSuccess(authRes.user);
      onClose();
      return;
    }

    setLoading(true);
    try {
      const res = await api.login(loginForm);
      playWelcomeSound();
      onAuthSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1 of Sign Up: Validate Details & Dispatch Mandatory OTP
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!registerForm.username.trim() || !registerForm.email.trim() || !registerForm.password) {
      setError('All required fields must be filled.');
      return;
    }

    if (registerForm.username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (!registerForm.email.trim().includes('@') || !registerForm.email.trim().includes('.')) {
      setError('Please enter a valid email address for account verification.');
      return;
    }

    if (registerForm.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (api.isOfflineMode()) {
      const isSoubhagya = (registerForm.email + ' ' + registerForm.username).toLowerCase().includes('soubhagya');
      const profileName = registerForm.full_name?.trim() || registerForm.username.trim() || 'ATLAS Scholar';
      const role = isSoubhagya ? 'admin' : 'student';
      const authRes = api.loginOffline(profileName, role, registerForm.email.trim());
      playWelcomeSound();
      onAuthSuccess(authRes.user);
      onClose();
      return;
    }

    setRegisterSending(true);
    try {
      const res = await api.sendEmailOTP({
        email: registerForm.email.trim(),
        purpose: 'register',
      });
      setOtpEmail(registerForm.email.trim());
      setRegisterStep('otp');
      setOtpTimer(res.cooldown_seconds || 60);
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        const firstInput = document.getElementById('modal-otp-input-0');
        if (firstInput) (firstInput as HTMLInputElement).focus();
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification code. Please check your email.');
    } finally {
      setRegisterSending(false);
    }
  };

  // Step 2 of Sign Up: Verify OTP & Create Account
  const handleVerifyRegisterOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const code = otpDigits.join('').trim();
    if (code.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.register({
        username: registerForm.username.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password,
        full_name: registerForm.full_name?.trim() || '',
        otp_code: code,
      });
      playWelcomeSound();
      onAuthSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendRegisterOtp = async () => {
    setError(null);
    setRegisterSending(true);
    try {
      const target = registerForm.email.trim();
      const res = await api.sendEmailOTP({ email: target, purpose: 'register' });
      setOtpTimer(res.cooldown_seconds || 60);
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code.');
    } finally {
      setRegisterSending(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content auth-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="auth-header-title">
            <div className="auth-icon-badge">
              {mode === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}
            </div>
            <div>
              <h3>{mode === 'login' ? 'Welcome Back' : 'Create an Account'}</h3>
              <p className="auth-subtitle">
                {mode === 'login'
                  ? 'Sign in to access your ATLAS 2.0 workspace'
                  : registerStep === 'otp'
                  ? 'Enter the 6-digit email verification code'
                  : 'Register a new account (Mandatory Email OTP)'}
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs-container">
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setRegisterStep('form');
              setError(null);
            }}
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setRegisterStep('form');
              setError(null);
            }}
          >
            <UserPlus size={15} />
            <span>Create Account</span>
          </button>
        </div>

        {/* Method Toggle (Password vs Email OTP) */}
        {mode === 'login' && (
          <div className="login-method-toggle" style={{ margin: '0.75rem 1.25rem 0' }}>
            <button
              type="button"
              className={`method-toggle-btn ${loginMethod === 'password' ? 'active' : ''}`}
              onClick={() => {
                setLoginMethod('password');
                setError(null);
              }}
            >
              <Lock size={14} />
              <span>Password</span>
            </button>
            <button
              type="button"
              className={`method-toggle-btn ${loginMethod === 'otp' ? 'active' : ''}`}
              onClick={() => {
                setLoginMethod('otp');
                setError(null);
                if (loginForm.username_or_email.includes('@')) {
                  setOtpEmail(loginForm.username_or_email.trim());
                }
              }}
            >
              <Shield size={14} />
              <span>Email OTP</span>
              <span className="secure-badge">Instant</span>
            </button>
          </div>
        )}

        {/* Demo Account Quick-Fill Pill (only for password mode) */}
        {mode === 'login' && loginMethod === 'password' && (
          <div className="demo-credentials-banner" onClick={handleFillDemoAdmin} title="Click to autofill credentials">
            <Sparkles size={14} className="sparkle-icon" />
            <span>Quick Demo: Click here to auto-fill default admin credentials (<code>atlas_admin</code>)</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="auth-error-box">
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' ? (
          loginMethod === 'otp' ? (
            otpStep === 'email' ? (
              <form onSubmit={handleSendOtp} className="modal-body auth-form-body">
                <div className="otp-info-callout" style={{ margin: '0 0 1rem 0' }}>
                  <Shield size={16} className="otp-info-icon" />
                  <div>
                    <strong>Secure Email OTP Login</strong>
                    <p>Enter your email to receive a single-use 6-digit access code.</p>
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="modal-otp-email">Email Address *</label>
                  <div className="input-with-icon">
                    <Mail size={16} className="input-icon-left" />
                    <input
                      id="modal-otp-email"
                      type="email"
                      required
                      placeholder="e.g. user@atlas.dev"
                      value={otpEmail || (loginForm.username_or_email.includes('@') ? loginForm.username_or_email : '')}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="auth-footer-actions">
                  <button
                    type="submit"
                    className="btn-primary auth-submit-btn"
                    disabled={otpSending}
                  >
                    {otpSending ? (
                      <>
                        <RefreshCw size={16} className="spin" />
                        <span>Sending Code...</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Send 6-Digit Code</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="modal-body auth-form-body">
                <div className="otp-sent-banner" style={{ margin: '0 0 1rem 0' }}>
                  <div>
                    <span>Code sent to: </span>
                    <strong>{otpEmail}</strong>
                  </div>
                  <button
                    type="button"
                    className="btn-change-email"
                    onClick={() => {
                      setOtpStep('email');
                      setOtpDigits(['', '', '', '', '', '']);
                      setError(null);
                    }}
                  >
                    Change email
                  </button>
                </div>

                <div className="form-field" style={{ textAlign: 'center' }}>
                  <label>Enter 6-Digit Code</label>
                  <div className="otp-digits-container">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`modal-otp-input-${idx}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                        onPaste={handleOtpPaste}
                        className="otp-digit-input"
                        autoFocus={idx === 0}
                      />
                    ))}
                  </div>
                </div>


                <div className="auth-footer-actions">
                  <button
                    type="submit"
                    className="btn-primary auth-submit-btn"
                    disabled={otpVerifying || otpDigits.join('').length !== 6}
                  >
                    {otpVerifying ? (
                      <>
                        <RefreshCw size={16} className="spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound size={16} />
                        <span>Verify & Sign In</span>
                      </>
                    )}
                  </button>

                  <div className="otp-resend-row">
                    {otpTimer > 0 ? (
                      <span className="otp-timer-text">
                        <Clock size={13} /> Resend in <strong>{otpTimer}s</strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn-resend-otp"
                        onClick={() => handleSendOtp()}
                        disabled={otpSending}
                      >
                        <RotateCcw size={13} /> Resend code
                      </button>
                    )}
                  </div>
                </div>
              </form>
            )
          ) : (
          <form onSubmit={handleLoginSubmit} className="modal-body auth-form-body">
            <div className="form-field">
              <label htmlFor="login-username">Username or Email *</label>
              <div className="input-with-icon">
                <UserIcon size={16} className="input-icon-left" />
                <input
                  id="login-username"
                  type="text"
                  required
                  placeholder="e.g. atlas_admin or admin@atlas.dev"
                  value={loginForm.username_or_email}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, username_or_email: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="login-password">Password *</label>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon-left" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={loginForm.password}
                  onChange={(e) =>
                    setLoginForm({ ...loginForm, password: e.target.value })
                  }
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="auth-footer-actions">
              <button
                type="submit"
                className="btn-primary auth-submit-btn"
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Sign In to ATLAS 2.0'}
              </button>
              <p className="auth-switch-text">
                Don't have an account?{' '}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setMode('register');
                    setRegisterStep('form');
                    setError(null);
                  }}
                >
                  Create one now
                </button>
              </p>
            </div>
          </form>
          )
        ) : registerStep === 'otp' ? (
          /* ========================================================= */
          /* MANDATORY REGISTER EMAIL OTP VERIFICATION FORM            */
          /* ========================================================= */
          <form onSubmit={handleVerifyRegisterOtp} className="modal-body auth-form-body">
            <div className="otp-sent-banner" style={{ margin: '0 0 1rem 0' }}>
              <div>
                <span>Verification code sent to: </span>
                <strong>{registerForm.email}</strong>
              </div>
              <button
                type="button"
                className="btn-change-email"
                onClick={() => {
                  setRegisterStep('form');
                  setOtpDigits(['', '', '', '', '', '']);
                  setError(null);
                }}
              >
                Edit details
              </button>
            </div>

            <div className="otp-info-callout" style={{ margin: '0 0 1rem 0' }}>
              <Shield size={16} className="otp-info-icon" />
              <div>
                <strong>Mandatory Email Verification</strong>
                <p>A 6-digit verification code is required to create your ATLAS 2.0 account.</p>
              </div>
            </div>

            <div className="otp-digits-container" style={{ margin: '0 0 1rem 0' }}>
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  id={`modal-otp-input-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                  onPaste={handleOtpPaste}
                  className="otp-digit-input"
                  autoFocus={idx === 0}
                  autoComplete="one-time-code"
                />
              ))}
            </div>


            <div className="auth-footer-actions">
              <button
                type="submit"
                className="btn-primary auth-submit-btn"
                disabled={loading || otpDigits.join('').length !== 6}
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Verify & Create Account</span>
                  </>
                )}
              </button>

              <div className="otp-resend-row" style={{ marginTop: '0.75rem', justifyContent: 'center' }}>
                {otpTimer > 0 ? (
                  <span className="otp-timer-text">
                    <Clock size={13} /> Resend code in <strong>{otpTimer}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn-resend-otp"
                    onClick={handleResendRegisterOtp}
                    disabled={registerSending}
                  >
                    <RotateCcw size={13} /> Resend verification code
                  </button>
                )}
              </div>
            </div>
          </form>
        ) : (
          /* Register Form Step 1 */
          <form onSubmit={handleRegisterSubmit} className="modal-body auth-form-body">
            <div className="form-field">
              <label htmlFor="reg-fullname">Full Name</label>
              <div className="input-with-icon">
                <ShieldCheck size={16} className="input-icon-left" />
                <input
                  id="reg-fullname"
                  type="text"
                  placeholder="e.g. Elena Rostova"
                  value={registerForm.full_name}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, full_name: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="reg-username">Username *</label>
                <div className="input-with-icon">
                  <UserIcon size={16} className="input-icon-left" />
                  <input
                    id="reg-username"
                    type="text"
                    required
                    placeholder="e.g. elena_core"
                    value={registerForm.username}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, username: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="reg-email">Email Address *</label>
                <div className="input-with-icon">
                  <Mail size={16} className="input-icon-left" />
                  <input
                    id="reg-email"
                    type="email"
                    required
                    placeholder="elena@atlas.dev"
                    value={registerForm.email}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, email: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="reg-password">Password *</label>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon-left" />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Min. 6 chars"
                    value={registerForm.password}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, password: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="reg-confirm">Confirm Password *</label>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon-left" />
                  <input
                    id="reg-confirm"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Repeat password"
                    value={registerForm.confirmPassword}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, confirmPassword: e.target.value as any })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="password-security-hint" style={{ margin: '0.25rem 0 1rem 0' }}>
              <ShieldCheck size={14} className="security-icon" />
              <span>256-bit cryptographic salting &amp; server pepper active — anti-hack protection</span>
            </div>

            <div className="auth-footer-actions">
              <button
                type="submit"
                className="btn-primary auth-submit-btn"
                disabled={registerSending}
              >
                {registerSending ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>Sending Verification Code...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to Email Verification</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
              <p className="auth-switch-text">
                Already registered?{' '}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setMode('login');
                    setRegisterStep('form');
                    setError(null);
                  }}
                >
                  Sign in here
                </button>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
