import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ArrowRight,
  Zap,
  Laptop,
  Shield,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  UserPlus,
  LogIn,
  Calendar,
  AtSign,
  KeyRound,
  Send,
  Clock,
  RotateCcw,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import { api } from '../api';
import type { User, LoginCredentials, RegisterData } from '../types';
import { playWelcomeSound } from '../utils/soundEffects';

interface LoginPageProps {
  currentUser: User | null;
  onLoginSuccess: (user: User) => void;
  onLogout: () => void;
  onBackToDashboard: () => void;
}

export function LoginPage({
  currentUser,
  onLoginSuccess,
  onLogout,
  onBackToDashboard,
}: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot_password'>('login');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [dob, setDob] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sign-Up Step States
  const [signupStep, setSignupStep] = useState<'form' | 'otp'>('form');
  const [signupSending, setSignupSending] = useState<boolean>(false);

  // Forgot Password States
  const [forgotStep, setForgotStep] = useState<'email' | 'code'>('email');
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [forgotNewPassword, setForgotNewPassword] = useState<string>('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState<string>('');
  const [forgotShowPassword, setForgotShowPassword] = useState<boolean>(false);
  const [forgotSending, setForgotSending] = useState<boolean>(false);
  const [forgotResetting, setForgotResetting] = useState<boolean>(false);

  // Email OTP States
  const [otpStep, setOtpStep] = useState<'email' | 'code'>('email');
  const [otpEmail, setOtpEmail] = useState<string>('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState<number>(0);
  const [otpSending, setOtpSending] = useState<boolean>(false);
  const [otpVerifying, setOtpVerifying] = useState<boolean>(false);

  const getOtpInputId = (idx: number) => {
    if (mode === 'forgot_password') {
      return `forgot-otp-input-${idx}`;
    }
    return (mode === 'signup' && signupStep === 'otp')
      ? `signup-otp-input-${idx}`
      : `otp-input-${idx}`;
  };

  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [otpTimer]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const targetEmail = (otpEmail.trim() || email.trim()).toLowerCase();
    if (!targetEmail) {
      setError('Please provide a valid email address.');
      return;
    }

    if (!targetEmail.includes('@') || !targetEmail.includes('.')) {
      setError('Please enter a valid email address format.');
      return;
    }

    setOtpEmail(targetEmail);
    setOtpSending(true);

    try {
      const res = await api.sendEmailOTP({ email: targetEmail, purpose: 'login' });
      setOtpStep('code');
      setOtpTimer(res.cooldown_seconds || 60);
      setOtpDigits(['', '', '', '', '', '']);
      setSuccessMessage(res.message || `Verification code sent to ${targetEmail}`);
      setTimeout(() => {
        const firstInput = document.getElementById('otp-input-0');
        if (firstInput) (firstInput as HTMLInputElement).focus();
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP verification code.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMessage(null);

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
      setSuccessMessage('Email verified successfully! Logging you in...');
      setTimeout(() => {
        onLoginSuccess(res.user);
      }, 350);
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
      const nextInput = document.getElementById(getOtpInputId(index + 1));
      if (nextInput) (nextInput as HTMLInputElement).focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(getOtpInputId(index - 1));
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
      const targetInput = document.getElementById(getOtpInputId(targetFocusIdx));
      if (targetInput) (targetInput as HTMLInputElement).focus();
    }
  };


  // Submit Handler for standard password form (or Step 1 of Sign Up)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }

    if (mode === 'signup') {
      if (!username.trim()) {
        setError('Please enter a username.');
        return;
      }
      if (username.trim().length < 3) {
        setError('Username must be at least 3 characters.');
        return;
      }
      if (!email.trim().includes('@') || !email.trim().includes('.')) {
        setError('Please enter a valid email address for account verification.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }

      // Mandatory OTP Step: Request 6-digit registration code via email
      setLoading(true);
      try {
        const res = await api.sendEmailOTP({ email: email.trim(), purpose: 'register' });
        setOtpEmail(email.trim());
        setSignupStep('otp');
        setOtpTimer(res.cooldown_seconds || 60);
        setOtpDigits(['', '', '', '', '', '']);
        setSuccessMessage(res.message || `A 6-digit verification code has been sent to ${email.trim()}. Please enter it to complete account creation.`);
        setTimeout(() => {
          const firstInput = document.getElementById('signup-otp-input-0');
          if (firstInput) (firstInput as HTMLInputElement).focus();
        }, 120);
      } catch (err: any) {
        setError(err.message || 'Failed to send verification code. Please check your email.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);

    try {
      const credentials: LoginCredentials = {
        username_or_email: email.trim(),
        password: password,
      };
      const res = await api.login(credentials);
      playWelcomeSound();
      setSuccessMessage('Login successful! Redirecting to Home Dashboard...');
      setTimeout(() => {
        onLoginSuccess(res.user);
      }, 350);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Handler for Step 2 of Sign Up (Verifying OTP + Creating Account)
  const handleVerifySignupOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const code = otpDigits.join('').trim();
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const regData: RegisterData = {
        username: username.trim(),
        email: (otpEmail || email).trim(),
        password: password,
        full_name: fullName.trim() || undefined,
        dob: dob.trim() || undefined,
        otp_code: code,
      };
      const res = await api.register(regData);
      playWelcomeSound();
      setSuccessMessage('Account verified & created successfully! Logging you in...');
      setTimeout(() => {
        onLoginSuccess(res.user);
      }, 350);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendSignupOtp = async () => {
    setError(null);
    setSuccessMessage(null);
    setSignupSending(true);
    try {
      const target = (otpEmail || email).trim();
      const res = await api.sendEmailOTP({ email: target, purpose: 'register' });
      setOtpTimer(res.cooldown_seconds || 60);
      setSuccessMessage(res.message || `New verification code sent to ${target}`);
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code.');
    } finally {
      setSignupSending(false);
    }
  };

  const handleSendForgotOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const targetEmail = (forgotEmail.trim() || email.trim()).toLowerCase();
    if (!targetEmail) {
      setError('Please enter your registered email address.');
      return;
    }

    if (!targetEmail.includes('@') || !targetEmail.includes('.')) {
      setError('Please enter a valid email address format.');
      return;
    }

    setForgotEmail(targetEmail);
    setForgotSending(true);

    try {
      const res = await api.sendEmailOTP({ email: targetEmail, purpose: 'reset_password' });
      setForgotStep('code');
      setOtpTimer(res.cooldown_seconds || 60);
      setOtpDigits(['', '', '', '', '', '']);
      setSuccessMessage(res.message || `Password reset code sent to ${targetEmail}`);
      setTimeout(() => {
        const firstInput = document.getElementById('forgot-otp-input-0');
        if (firstInput) (firstInput as HTMLInputElement).focus();
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code. Please check your email.');
    } finally {
      setForgotSending(false);
    }
  };

  const handleResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const code = otpDigits.join('').trim();
    if (code.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    if (!forgotNewPassword) {
      setError('Please enter a new password.');
      return;
    }

    if (forgotNewPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setForgotResetting(true);
    try {
      const res = await api.resetPasswordWithOTP({
        email: forgotEmail.trim().toLowerCase(),
        otp_code: code,
        new_password: forgotNewPassword,
      });
      playWelcomeSound();
      setSuccessMessage('Password reset successfully! Logging you in...');
      setTimeout(() => {
        onLoginSuccess(res.user);
      }, 400);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please check the code.');
    } finally {
      setForgotResetting(false);
    }
  };

  const handleResendForgotOtp = async () => {
    setError(null);
    setSuccessMessage(null);
    setForgotSending(true);
    try {
      const target = forgotEmail.trim().toLowerCase();
      const res = await api.sendEmailOTP({ email: target, purpose: 'reset_password' });
      setOtpTimer(res.cooldown_seconds || 60);
      setSuccessMessage(res.message || `New reset code sent to ${target}`);
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err: any) {
      setError(err.message || 'Failed to resend reset code.');
    } finally {
      setForgotSending(false);
    }
  };



  // If already logged in, show account status card with option to go to dashboard or logout
  if (currentUser) {
    return (
      <div className="login-screen-split">
        {/* Left Side: Brand & Visuals */}
        <div className="login-visual-panel">
          <div className="visual-panel-top">
            <div className="app-brand-badge">
              <img src="/atlas-logo.png" alt="ATLAS 2.0 Logo" className="app-brand-logo-img" />
              <span className="app-brand-name">ATLAS 2.0</span>
            </div>
          </div>

          <div className="visual-panel-content">
            <h1 className="visual-hero-title">Welcome Back!</h1>
            <p className="visual-hero-subtitle">
              You are signed in as <strong>{currentUser.full_name || currentUser.username}</strong> ({currentUser.email}).
            </p>
          </div>

          <div className="visual-features-list">
            <div className="visual-feature-item">
              <div className="feature-icon-box">
                <Zap size={20} className="feature-svg" />
              </div>
              <div className="feature-texts">
                <h4>Fast & Secure</h4>
                <p>Your data is always protected.</p>
              </div>
            </div>

            <div className="visual-feature-item">
              <div className="feature-icon-box">
                <Laptop size={20} className="feature-svg" />
              </div>
              <div className="feature-texts">
                <h4>Access Anywhere</h4>
                <p>Use it on any device, anytime.</p>
              </div>
            </div>

            <div className="visual-feature-item">
              <div className="feature-icon-box">
                <Shield size={20} className="feature-svg" />
              </div>
              <div className="feature-texts">
                <h4>Built for You</h4>
                <p>Simple. Reliable. Always.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Logged-in session box */}
        <div className="login-form-panel">
          <div className="login-form-container">
            <h2 className="form-main-heading">Active Session</h2>
            <p className="form-main-subtitle">You are already authenticated</p>

            <div className="active-user-card">
              <div className="active-user-avatar">
                {currentUser.full_name ? currentUser.full_name.charAt(0).toUpperCase() : currentUser.username.charAt(0).toUpperCase()}
              </div>
              <div className="active-user-meta">
                <span className="active-user-name">{currentUser.full_name || currentUser.username}</span>
                <span className="active-user-role">{currentUser.role} • {currentUser.email}</span>
              </div>
            </div>

            <button
              type="button"
              className="btn-login-submit"
              onClick={onBackToDashboard}
              style={{ marginTop: '1.25rem' }}
            >
              <span>Continue to Home Dashboard</span>
              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              className="btn-google-auth"
              onClick={onLogout}
              style={{ marginTop: '0.85rem' }}
            >
              <span>Sign Out of Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-screen-split">
      {/* ========================================================= */}
      {/* LEFT PANEL: Twilight Mountains with Branding & Features   */}
      {/* ========================================================= */}
      <div className="login-visual-panel">
        <div className="visual-panel-top">
          <div className="app-brand-badge">
            <img src="/atlas-logo.png" alt="ATLAS 2.0 Logo" className="app-brand-logo-img" />
            <span className="app-brand-name">ATLAS 2.0</span>
          </div>
        </div>

        <div className="visual-panel-content">
          <h1 className="visual-hero-title">Welcome Back!</h1>
          <p className="visual-hero-subtitle">
            Sign in to continue to your account and explore more.
          </p>
        </div>

        {/* 3 Highlights from the reference design */}
        <div className="visual-features-list">
          <div className="visual-feature-item">
            <div className="feature-icon-box">
              <Zap size={20} className="feature-svg" />
            </div>
            <div className="feature-texts">
              <h4>Fast & Secure</h4>
              <p>Your data is always protected.</p>
            </div>
          </div>

          <div className="visual-feature-item">
            <div className="feature-icon-box">
              <Laptop size={20} className="feature-svg" />
            </div>
            <div className="feature-texts">
              <h4>Access Anywhere</h4>
              <p>Use it on any device, anytime.</p>
            </div>
          </div>

          <div className="visual-feature-item">
            <div className="feature-icon-box">
              <Shield size={20} className="feature-svg" />
            </div>
            <div className="feature-texts">
              <h4>Built for You</h4>
              <p>Simple. Reliable. Always.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT PANEL: Pure White Clean Login Form                  */}
      {/* ========================================================= */}
      <div className="login-form-panel">
        <div className="login-form-container">
          <h2 className="form-main-heading">
            {mode === 'forgot_password'
              ? 'Reset Password'
              : mode === 'login'
              ? 'Login'
              : 'Sign Up'}
          </h2>
          <p className="form-main-subtitle">
            {mode === 'forgot_password'
              ? (forgotStep === 'code'
                  ? 'Enter the 6-digit verification code from your email and set a new password'
                  : 'Enter your registered email address to receive a verification code')
              : mode === 'login'
              ? (loginMethod === 'otp'
                  ? 'Sign in securely using a 6-digit one-time code'
                  : 'Enter your email and password to continue')
              : (signupStep === 'otp'
                  ? 'Enter the 6-digit verification code sent to your email'
                  : 'Enter your details to create an account (Mandatory Email OTP)')}
          </p>

          {/* Login Method Toggle (Password vs Email OTP) - Only shown in login mode */}
          {mode === 'login' && (
            <div className="login-method-toggle">
              <button
                type="button"
                className={`method-toggle-btn ${loginMethod === 'password' ? 'active' : ''}`}
                onClick={() => {
                  setLoginMethod('password');
                  setError(null);
                  setSuccessMessage(null);
                }}
              >
                <Lock size={15} />
                <span>Password</span>
              </button>
              <button
                type="button"
                className={`method-toggle-btn ${loginMethod === 'otp' ? 'active' : ''}`}
                onClick={() => {
                  setLoginMethod('otp');
                  setError(null);
                  setSuccessMessage(null);
                  if (email.trim() && email.includes('@')) {
                    setOtpEmail(email.trim());
                  }
                }}
              >
                <Shield size={15} />
                <span>Email OTP</span>
                <span className="secure-badge">Instant</span>
              </button>
            </div>
          )}

          {/* Feedback Alerts */}
          {error && (
            <div className="login-feedback-box error" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
              {(error.includes('VITE_API_URL') || error.includes('Backend URL') || error.includes('405')) && (
                <button
                  type="button"
                  onClick={() => {
                    const currentUrl = localStorage.getItem('atlas_api_url') || '';
                    const entered = prompt(
                      'Enter your Render backend API URL (e.g. https://your-backend.onrender.com/api):',
                      currentUrl || 'https://'
                    );
                    if (entered && entered.trim() && (window as any).setAtlasBackendUrl) {
                      (window as any).setAtlasBackendUrl(entered.trim());
                    }
                  }}
                  style={{
                    alignSelf: 'flex-start',
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    background: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    marginTop: '2px',
                  }}
                >
                  ⚡ Connect Backend URL Now
                </button>
              )}
            </div>
          )}

          {successMessage && (
            <div className="login-feedback-box success">
              <CheckCircle2 size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* FORGOT PASSWORD WORKFLOW (When mode === 'forgot_password') */}
          {/* ========================================================= */}
          {mode === 'forgot_password' ? (
            forgotStep === 'email' ? (
              <form onSubmit={handleSendForgotOtp} className="login-actual-form">
                <div className="otp-info-callout">
                  <KeyRound size={18} className="otp-info-icon" />
                  <div>
                    <strong>Forgot Your Password?</strong>
                    <p>Enter your registered email address and we'll send you a confidential 6-digit verification code.</p>
                  </div>
                </div>

                <div className="login-input-group">
                  <Mail size={18} className="input-leading-icon" />
                  <input
                    id="forgot-email-input"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    required
                    autoFocus
                    autoComplete="email"
                  />
                </div>

                <button
                  id="btn-send-reset-code"
                  type="submit"
                  className="btn-login-submit"
                  disabled={forgotSending}
                >
                  {forgotSending ? (
                    <>
                      <RefreshCw size={18} className="spin" />
                      <span>Sending Reset Code...</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>Send Reset Code</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn-change-email"
                  style={{ alignSelf: 'center', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>Back to Login</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="login-actual-form">
                <div className="otp-sent-banner">
                  <div>
                    <span>Reset code sent to: </span>
                    <strong>{forgotEmail}</strong>
                  </div>
                  <button
                    type="button"
                    className="btn-change-email"
                    onClick={() => {
                      setForgotStep('email');
                      setOtpDigits(['', '', '', '', '', '']);
                      setError(null);
                    }}
                  >
                    Change email
                  </button>
                </div>

                <div className="otp-info-callout">
                  <Shield size={18} className="otp-info-icon" />
                  <div>
                    <strong>Enter Verification Code & New Password</strong>
                    <p>Check your email for the 6-digit verification code to reset your password.</p>
                  </div>
                </div>

                {/* 6 Digit Box Inputs */}
                <div className="otp-digits-container">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`forgot-otp-input-${idx}`}
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

                {/* New Password */}
                <div className="login-input-group">
                  <Lock size={18} className="input-leading-icon" />
                  <input
                    id="forgot-new-password"
                    type={forgotShowPassword ? 'text' : 'password'}
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="New password (min 6 characters)"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="input-trailing-action"
                    onClick={() => setForgotShowPassword(!forgotShowPassword)}
                  >
                    {forgotShowPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Confirm New Password */}
                <div className="login-input-group">
                  <Lock size={18} className="input-leading-icon" />
                  <input
                    id="forgot-confirm-password"
                    type={forgotShowPassword ? 'text' : 'password'}
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    minLength={6}
                  />
                </div>

                {/* Password Salting Security Notice */}
                <div className="password-security-hint">
                  <ShieldCheck size={14} className="security-icon" />
                  <span>256-bit cryptographic salt &amp; PBKDF2 600,000 rounds</span>
                </div>

                <button
                  id="btn-reset-password-submit"
                  type="submit"
                  className="btn-login-submit"
                  disabled={forgotResetting || otpDigits.join('').length !== 6 || !forgotNewPassword}
                >
                  {forgotResetting ? (
                    <>
                      <RefreshCw size={18} className="spin" />
                      <span>Resetting Password...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Reset Password & Log In</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <div className="otp-resend-row">
                  {otpTimer > 0 ? (
                    <span className="otp-timer-text">
                      <Clock size={14} /> Resend code in <strong>{otpTimer}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn-resend-otp"
                      onClick={() => handleResendForgotOtp()}
                      disabled={forgotSending}
                    >
                      <RotateCcw size={14} /> Resend verification code
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="btn-change-email"
                  style={{ alignSelf: 'center', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>Cancel & Return to Login</span>
                </button>
              </form>
            )
          ) : mode === 'login' && loginMethod === 'otp' ? (
            otpStep === 'email' ? (
              <form onSubmit={handleSendOtp} className="login-actual-form">
                <div className="otp-info-callout">
                  <Shield size={18} className="otp-info-icon" />
                  <div>
                    <strong>Passwordless OTP Sign In</strong>
                    <p>Enter your email to receive an instant, cryptographically verified 6-digit access code.</p>
                  </div>
                </div>

                <div className="login-input-group">
                  <Mail size={18} className="input-leading-icon" />
                  <input
                    id="otp-email-input"
                    type="email"
                    value={otpEmail || email}
                    onChange={(e) => {
                      setOtpEmail(e.target.value);
                      setEmail(e.target.value);
                    }}
                    placeholder="Enter your email address"
                    required
                    autoFocus
                    autoComplete="email"
                  />
                </div>

                <button
                  id="btn-send-otp"
                  type="submit"
                  className="btn-login-submit"
                  disabled={otpSending}
                >
                  {otpSending ? (
                    <>
                      <RefreshCw size={18} className="spin" />
                      <span>Sending Verification Code...</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>Send 6-Digit Code</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="login-actual-form">
                <div className="otp-sent-banner">
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

                {/* 6 Digit Box Inputs */}
                <div className="otp-digits-container">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-input-${idx}`}
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


                <button
                  id="btn-verify-otp"
                  type="submit"
                  className="btn-login-submit"
                  disabled={otpVerifying || otpDigits.join('').length !== 6}
                >
                  {otpVerifying ? (
                    <>
                      <RefreshCw size={18} className="spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound size={18} />
                      <span>Verify & Access Account</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <div className="otp-resend-row">
                  {otpTimer > 0 ? (
                    <span className="otp-timer-text">
                      <Clock size={14} /> Resend code in <strong>{otpTimer}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn-resend-otp"
                      onClick={() => handleSendOtp()}
                      disabled={otpSending}
                    >
                      <RotateCcw size={14} /> Resend verification code
                    </button>
                  )}
                </div>
              </form>
            )
          ) : mode === 'signup' && signupStep === 'otp' ? (
            /* ========================================================= */
            /* MANDATORY SIGN UP EMAIL OTP VERIFICATION FORM             */
            /* ========================================================= */
            <form onSubmit={handleVerifySignupOtp} className="login-actual-form">
              <div className="otp-sent-banner">
                <div>
                  <span>Verification code sent to: </span>
                  <strong>{otpEmail || email}</strong>
                </div>
                <button
                  type="button"
                  className="btn-change-email"
                  onClick={() => {
                    setSignupStep('form');
                    setOtpDigits(['', '', '', '', '', '']);
                    setError(null);
                  }}
                >
                  Edit details
                </button>
              </div>

              {/* Mandatory Notice */}
              <div className="otp-info-callout" style={{ borderColor: 'rgba(37,99,235,0.3)', background: 'rgba(37,99,235,0.04)' }}>
                <Shield size={18} className="otp-info-icon" style={{ color: '#2563eb' }} />
                <div>
                  <strong>Mandatory Email Verification</strong>
                  <p>A 6-digit verification code is required to create your ATLAS 2.0 account.</p>
                </div>
              </div>

              {/* 6 Digit Box Inputs */}
              <div className="otp-digits-container">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`signup-otp-input-${idx}`}
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


              <button
                id="btn-verify-signup-otp"
                type="submit"
                className="btn-login-submit"
                disabled={loading || otpDigits.join('').length !== 6}
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Verify & Create Account</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div className="otp-resend-row">
                {otpTimer > 0 ? (
                  <span className="otp-timer-text">
                    <Clock size={14} /> Resend code in <strong>{otpTimer}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn-resend-otp"
                    onClick={() => handleResendSignupOtp()}
                    disabled={signupSending}
                  >
                    <RotateCcw size={14} /> Resend verification code
                  </button>
                )}
              </div>
            </form>
          ) : (
            /* ========================================================= */
            /* STANDARD PASSWORD FORM (Login or Sign Up)                 */
            /* ========================================================= */
            <form onSubmit={handleSubmit} className="login-actual-form">
            {/* Sign Up Mode Fields: Username, Full Name, DOB */}
            {mode === 'signup' && (
              <>
                {/* Username Field */}
                <div className="login-input-group">
                  <AtSign size={18} className="input-leading-icon" />
                  <input
                    id="signup-username-input"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    required
                    autoComplete="username"
                  />
                </div>

                {/* Full Name Field */}
                <div className="login-input-group">
                  <UserIcon size={18} className="input-leading-icon" />
                  <input
                    id="signup-name-input"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full name (optional)"
                    autoComplete="name"
                  />
                </div>

                {/* Date of Birth Field */}
                <div className="login-input-group">
                  <Calendar size={18} className="input-leading-icon" />
                  <input
                    id="signup-dob-input"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    placeholder="Date of Birth"
                    title="Date of Birth (DOB)"
                  />
                </div>
              </>
            )}

            {/* Email Field */}
            <div className="login-input-group">
              <Mail size={18} className="input-leading-icon" />
              <input
                id="login-email-input"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email or username"
                required
                autoComplete="username"
              />
            </div>

            {/* Password Field */}
            <div className="login-input-group">
              <Lock size={18} className="input-leading-icon" />
              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="input-trailing-action"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password Salting Security Notice */}
            {mode === 'signup' && (
              <div className="password-security-hint">
                <ShieldCheck size={14} className="security-icon" />
                <span>256-bit cryptographic salting &amp; server pepper active — anti-hack protection</span>
              </div>
            )}

            {/* Remember Me & Forgot Password Row */}
            {mode === 'login' && (
              <div className="login-options-row">
                <label className="remember-me-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>

                <button
                  id="btn-forgot-password-link"
                  type="button"
                  className="btn-forgot-password"
                  onClick={() => {
                    setMode('forgot_password');
                    setForgotStep('email');
                    setForgotEmail(email.trim());
                    setError(null);
                    setSuccessMessage(null);
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Primary Submit Button (Login or Sign Up Step 1) */}
            <button
              id="btn-login-submit"
              type="submit"
              className="btn-login-submit"
              disabled={loading || signupSending}
            >
              {loading || signupSending ? (
                <>
                  <RefreshCw size={18} className="spin" />
                  <span>{signupSending ? 'Sending Verification Code...' : 'Processing...'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Login' : 'Continue to Email Verification'}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          )}

          {/* OR Divider */}
          <div className="login-or-divider">
            <span className="divider-line"></span>
            <span className="divider-text">OR</span>
            <span className="divider-line"></span>
          </div>

          {/* Create New Account Option */}
          <button
            id="btn-create-account-option"
            type="button"
            className="btn-google-auth"
            onClick={() => {
              if (mode === 'forgot_password') {
                setMode('login');
              } else {
                setMode(mode === 'login' ? 'signup' : 'login');
                setSignupStep('form');
              }
              setError(null);
              setSuccessMessage(null);
            }}
          >
            {mode === 'forgot_password' ? (
              <>
                <LogIn size={18} style={{ color: '#2563eb' }} />
                <span>Return to Login</span>
              </>
            ) : mode === 'login' ? (
              <>
                <UserPlus size={18} style={{ color: '#2563eb' }} />
                <span>Create New Account</span>
              </>
            ) : (
              <>
                <LogIn size={18} style={{ color: '#2563eb' }} />
                <span>Already have an account? Login</span>
              </>
            )}
          </button>

          {/* Back to Dashboard (Only for already authenticated user revisiting login page) */}
          {currentUser && (
            <button
              id="btn-back-to-dashboard"
              type="button"
              className="btn-google-auth"
              style={{
                marginTop: '0.5rem',
                color: '#475569',
                background: '#f8fafc',
                borderColor: '#e2e8f0',
              }}
              onClick={onBackToDashboard}
            >
              <span>← Back to Home Dashboard</span>
            </button>
          )}


          {/* Toggle between Login and Sign up */}
          <div className="login-footer-switch">
            {mode === 'login' ? (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  className="link-switch-mode"
                  onClick={() => {
                    setMode('signup');
                    setSignupStep('form');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                >
                  Sign up
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  className="link-switch-mode"
                  onClick={() => {
                    setMode('login');
                    setSignupStep('form');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                >
                  Login
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
