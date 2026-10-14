import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  LogOut,
  Key,
  Mail,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Download,
  Eye,
  Activity,
  Layers,
  UserCheck,
  Camera,
  FileText,
  Target,
} from 'lucide-react';
import { api } from '../api';
import type { User, AdminUser, AdminStats } from '../types';
import { ConfusionMatrixView } from './ConfusionMatrixView';
import { FirewallSecurityView } from './FirewallSecurityView';

interface AdminControlPanelProps {
  currentUser: User | null;
  onNavigateToDashboard: () => void;
  onNavigateToImageScanner?: () => void;
  onNavigateToPdfScanner?: () => void;
  onNavigateToWorkspace: () => void;
  onLogout: () => void;
}

export function AdminControlPanel({
  currentUser,
  onNavigateToDashboard,
  onNavigateToImageScanner,
  onNavigateToPdfScanner,
  onNavigateToWorkspace,
  onLogout,
}: AdminControlPanelProps) {
  const [adminActiveTab, setAdminActiveTab] = useState<'users' | 'confusion_matrix' | 'firewall'>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user' | 'developer'>('all');

  // Modals
  const [selectedUserForInspect, setSelectedUserForInspect] = useState<AdminUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState<boolean>(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<AdminUser | null>(null);

  // New User Form State
  const [newUserData, setNewUserData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    dob: '',
    role: 'user',
  });

  // Action status message
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch Users & Stats
  const loadAdminData = async () => {
    setRefreshing(true);
    try {
      const [usersData, statsData] = await Promise.all([
        api.getAdminUsers(),
        api.getAdminStats(),
      ]);
      setUsers(usersData);
      setStats(statsData);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch admin users and telemetry', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.full_name && u.full_name.toLowerCase().includes(search.toLowerCase()));

      const matchesRole = roleFilter === 'all' || u.role.toLowerCase() === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  // Handle Delete User
  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    try {
      await api.adminDeleteUser(deleteConfirmUser.id);
      showToast(`User ${deleteConfirmUser.username} removed successfully.`);
      setDeleteConfirmUser(null);
      await loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete user', 'error');
    }
  };

  // Handle Role Change
  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await api.adminUpdateRole(userId, newRole);
      showToast(`Updated user role to ${newRole}`);
      await loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update user role', 'error');
    }
  };

  // Handle Password Reset
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser || !newPassword.trim()) return;
    try {
      await api.adminResetPassword(resetPasswordUser.id, newPassword.trim());
      showToast(`Password updated for ${resetPasswordUser.username}`);
      setResetPasswordUser(null);
      setNewPassword('');
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password', 'error');
    }
  };

  // Handle Create User
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.username.trim() || !newUserData.email.trim() || !newUserData.password.trim()) {
      showToast('Username, Email, and Password are required', 'error');
      return;
    }
    try {
      await api.adminCreateUser(newUserData);
      showToast(`User ${newUserData.username} created successfully!`);
      setIsAddUserModalOpen(false);
      setNewUserData({
        username: '',
        email: '',
        password: '',
        full_name: '',
        dob: '',
        role: 'user',
      });
      await loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create user', 'error');
    }
  };

  // Export Users JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(users, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `atlas_users_export_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Exported users database to JSON');
  };

  return (
    <div className="admin-dashboard-layout">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`admin-toast ${toastMessage.type}`}>
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={16} className="toast-icon text-emerald" />
          ) : (
            <AlertCircle size={16} className="toast-icon text-rose" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="admin-header">
        <div className="admin-brand-area">
          <div className="admin-logo-circle">
            <img src="/atlas-logo.png" alt="ATLAS 2.0" className="admin-logo-img" />
          </div>
          <div className="admin-title-group">
            <div className="admin-badge-row">
              <span className="admin-pill-badge" style={{ background: 'rgba(168, 85, 247, 0.2)', border: '1px solid rgba(168, 85, 247, 0.5)', color: '#c084fc', letterSpacing: '0.04em' }}>
                🛡️ ISOLATED HIGH-SECURITY ADMIN GATE
              </span>
              <span className="admin-live-pulse-pill">
                <span className="pulse-dot green" />
                Live Database Active
              </span>
            </div>
            <h1 className="admin-main-heading">ATLAS 2.0 User & Data Management</h1>
            <p className="admin-subheading">
              Full control over all platform users, permissions, profiles, sessions, and telemetry
            </p>
          </div>
        </div>

        {/* Admin Navigation & User Badge */}
        <div className="admin-nav-actions">
          <div className="admin-user-identity">
            <div className="admin-avatar">
              {currentUser?.full_name ? currentUser.full_name[0].toUpperCase() : 'A'}
            </div>
            <div className="admin-identity-info">
              <span className="admin-name">{currentUser?.full_name || currentUser?.username}</span>
              <span className="admin-email-tag">{currentUser?.email}</span>
            </div>
          </div>

          <div className="admin-nav-buttons">
            <button
              id="admin-nav-btn-lock-dashboard"
              type="button"
              className="admin-action-btn"
              onClick={onNavigateToDashboard}
              title="Lock Admin Panel and Return to Student Dashboard"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                fontWeight: 700
              }}
            >
              <Lock size={15} />
              <span>Lock & Return to Dashboard</span>
            </button>
            <button
              id="admin-nav-btn-image-scanner"
              type="button"
              className="admin-action-btn secondary"
              onClick={() => {
                if (onNavigateToImageScanner) onNavigateToImageScanner();
                else onNavigateToDashboard();
              }}
              title="Open Image Scanner & Vision AI"
            >
              <Camera size={15} />
              <span>Image Scanner</span>
            </button>
            <button
              id="admin-nav-btn-pdf-scanner"
              type="button"
              className="admin-action-btn secondary"
              onClick={() => {
                if (onNavigateToPdfScanner) onNavigateToPdfScanner();
                else onNavigateToDashboard();
              }}
              title="Open PDF Scanner & AI Solver"
            >
              <FileText size={15} />
              <span>PDF Scanner</span>
            </button>
            <button
              type="button"
              className="admin-action-btn secondary"
              onClick={onNavigateToWorkspace}
              title="Return to Architecture Workspace"
            >
              <Layers size={15} />
              <span>Workspace</span>
            </button>
            <button
              type="button"
              className={`admin-action-btn ${adminActiveTab === 'confusion_matrix' ? 'primary' : 'secondary'}`}
              onClick={() => setAdminActiveTab(adminActiveTab === 'confusion_matrix' ? 'users' : 'confusion_matrix')}
              title="AI Model Confusion Matrix & Classification Metrics"
              style={adminActiveTab === 'confusion_matrix' ? { background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#fff', border: 'none' } : undefined}
            >
              <Target size={15} />
              <span>Confusion Matrix</span>
            </button>
            <button
              type="button"
              className={`admin-action-btn ${adminActiveTab === 'firewall' ? 'primary' : 'secondary'}`}
              onClick={() => setAdminActiveTab(adminActiveTab === 'firewall' ? 'users' : 'firewall')}
              title="ATLAS 2.0 Web Application Firewall & Security Center"
              style={adminActiveTab === 'firewall' ? { background: 'linear-gradient(135deg, #059669, #10b981)', color: '#fff', border: 'none' } : undefined}
            >
              <ShieldAlert size={15} />
              <span>Firewall Security</span>
            </button>
            <button
              type="button"
              className="admin-action-btn refresh"
              onClick={loadAdminData}
              disabled={refreshing}
              title="Refresh User List"
            >
              <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              className="admin-action-btn logout"
              onClick={onLogout}
              title="Log out of session"
            >
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* KPI Stats Overview Cards */}
      <section className="admin-stats-row">
        <div className="admin-kpi-card">
          <div className="kpi-icon-box cyan">
            <Users size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-title">Total Users</span>
            <span className="kpi-number">{stats?.total_users ?? users.length}</span>
            <span className="kpi-desc">Registered across platform</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-icon-box purple">
            <ShieldCheck size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-title">Administrators</span>
            <span className="kpi-number">{stats?.admins_count ?? users.filter(u => u.role === 'admin').length}</span>
            <span className="kpi-desc">Full system authority</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-icon-box emerald">
            <Activity size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-title">Active Sessions</span>
            <span className="kpi-number">{stats?.active_sessions ?? users.reduce((acc, u) => acc + (u.active_sessions || 0), 0)}</span>
            <span className="kpi-desc">Valid bearer auth tokens</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-icon-box amber">
            <Layers size={22} />
          </div>
          <div className="kpi-content">
            <span className="kpi-title">Database Nodes</span>
            <span className="kpi-number">{stats?.total_nodes ?? '12'}</span>
            <span className="kpi-desc">SQLite WAL storage</span>
          </div>
        </div>
      </section>

      {/* Section Switcher Tabs */}
      <div className="admin-section-tabs-bar">
        <button
          type="button"
          className={`admin-section-tab ${adminActiveTab === 'users' ? 'active' : ''}`}
          onClick={() => setAdminActiveTab('users')}
        >
          <Users size={16} />
          <span>User & Session Management</span>
          <span className="admin-tab-count">{users.length}</span>
        </button>
        <button
          type="button"
          className={`admin-section-tab ${adminActiveTab === 'confusion_matrix' ? 'active' : ''}`}
          onClick={() => setAdminActiveTab('confusion_matrix')}
        >
          <Target size={16} />
          <span>AI Confusion Matrix</span>
          <span className="admin-tab-tag">ML Analytics</span>
        </button>
        <button
          type="button"
          className={`admin-section-tab ${adminActiveTab === 'firewall' ? 'active' : ''}`}
          onClick={() => setAdminActiveTab('firewall')}
        >
          <ShieldAlert size={16} />
          <span>Firewall & Security Center</span>
          <span className="admin-tab-tag" style={{ background: '#ecfdf5', color: '#065f46' }}>WAF Shield</span>
        </button>
      </div>

      {adminActiveTab === 'firewall' ? (
        <FirewallSecurityView />
      ) : adminActiveTab === 'confusion_matrix' ? (
        <ConfusionMatrixView />
      ) : (
        /* Main Table Container */
        <main className="admin-main-section">
        {/* Search & Actions Toolbar */}
        <div className="admin-toolbar">
          <div className="admin-search-wrapper">
            <Search size={16} className="search-icon-inside" />
            <input
              type="text"
              className="admin-search-input"
              placeholder="Search by username, email, or full name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearch('')}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="admin-filter-pills">
            {(['all', 'admin', 'user', 'developer'] as const).map((r) => (
              <button
                key={r}
                type="button"
                className={`role-filter-pill ${roleFilter === r ? 'active' : ''}`}
                onClick={() => setRoleFilter(r)}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
                {r === 'all'
                  ? ` (${users.length})`
                  : ` (${users.filter((u) => u.role.toLowerCase() === r).length})`}
              </button>
            ))}
          </div>

          <div className="admin-toolbar-right-btns">
            <button
              type="button"
              className="admin-btn-action export"
              onClick={handleExportJSON}
            >
              <Download size={15} />
              <span>Export JSON</span>
            </button>
            <button
              type="button"
              className="admin-btn-action primary"
              onClick={() => setIsAddUserModalOpen(true)}
            >
              <Plus size={16} />
              <span>Add New User</span>
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="admin-table-card">
          <div className="table-responsive">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>User Identity</th>
                  <th>Email Address</th>
                  <th>Date of Birth</th>
                  <th>Role / Access</th>
                  <th>Active Sessions</th>
                  <th>Joined Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="table-loading-cell">
                      <RefreshCw size={24} className="spin text-cyan" />
                      <p>Loading platform users data...</p>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="table-empty-cell">
                      <Users size={32} className="text-muted" />
                      <p>No users found matching "{search}"</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = currentUser?.id === u.id;
                    const roleBadgeClass =
                      u.role === 'admin'
                        ? 'badge-admin'
                        : u.role === 'developer'
                        ? 'badge-dev'
                        : 'badge-user';

                    return (
                      <tr key={u.id} className={isSelf ? 'row-self' : ''}>
                        {/* User Identity */}
                        <td>
                          <div className="user-cell-flex">
                            <div className="user-avatar-small">
                              {u.full_name ? u.full_name[0].toUpperCase() : u.username[0].toUpperCase()}
                            </div>
                            <div className="user-names-column">
                              <span className="user-display-name">
                                {u.full_name || u.username}
                                {isSelf && <span className="self-tag">(You)</span>}
                              </span>
                              <span className="user-username-tag">@{u.username}</span>
                            </div>
                          </div>
                        </td>

                        {/* Email Address */}
                        <td>
                          <div className="email-cell">
                            <Mail size={14} className="cell-icon text-muted" />
                            <span className="email-text">{u.email}</span>
                          </div>
                        </td>

                        {/* DOB */}
                        <td>
                          <span className="dob-text">{u.dob ? u.dob : '—'}</span>
                        </td>

                        {/* Role */}
                        <td>
                          <div className="role-selector-cell">
                            <span className={`role-badge ${roleBadgeClass}`}>
                              {u.role === 'admin' ? (
                                <ShieldCheck size={12} className="mr-1" />
                              ) : (
                                <UserCheck size={12} className="mr-1" />
                              )}
                              {u.role.toUpperCase()}
                            </span>
                            {!isSelf && (
                              <select
                                className="role-quick-dropdown"
                                value={u.role}
                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                title="Change role"
                              >
                                <option value="user">User</option>
                                <option value="developer">Developer</option>
                                <option value="admin">Admin</option>
                              </select>
                            )}
                          </div>
                        </td>

                        {/* Active Sessions */}
                        <td>
                          <div className="sessions-cell">
                            <span className={`session-indicator ${u.active_sessions > 0 ? 'online' : 'offline'}`} />
                            <span>
                              {u.active_sessions} {u.active_sessions === 1 ? 'session' : 'sessions'}
                            </span>
                          </div>
                        </td>

                        {/* Joined Date */}
                        <td>
                          <span className="date-text">
                            {new Date(u.created_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'right' }}>
                          <div className="actions-cell-row">
                            <button
                              type="button"
                              className="action-icon-btn inspect"
                              title="Inspect full user record & telemetry"
                              onClick={() => setSelectedUserForInspect(u)}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              type="button"
                              className="action-icon-btn key"
                              title="Reset user password"
                              onClick={() => {
                                setResetPasswordUser(u);
                                setNewPassword('');
                              }}
                            >
                              <Key size={15} />
                            </button>
                            {!isSelf && (
                              <button
                                type="button"
                                className="action-icon-btn delete"
                                title="Delete user"
                                onClick={() => setDeleteConfirmUser(u)}
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="table-footer-status">
            <span>
              Showing {filteredUsers.length} of {users.length} total registered accounts
            </span>
          </div>
        </div>
      </main>
      )}

      {/* =================================================================== */}
      {/* MODAL 1: INSPECT USER RECORD & TELEMETRY                           */}
      {/* =================================================================== */}
      {selectedUserForInspect && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedUserForInspect(null)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div className="modal-title-row">
                <UserIcon size={18} className="text-cyan" />
                <h3>User Data Record: @{selectedUserForInspect.username}</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedUserForInspect(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="inspect-grid">
                <div className="inspect-field">
                  <label>Database User ID</label>
                  <span>#{selectedUserForInspect.id}</span>
                </div>
                <div className="inspect-field">
                  <label>Username</label>
                  <span>{selectedUserForInspect.username}</span>
                </div>
                <div className="inspect-field">
                  <label>Email Address</label>
                  <span>{selectedUserForInspect.email}</span>
                </div>
                <div className="inspect-field">
                  <label>Full Name</label>
                  <span>{selectedUserForInspect.full_name || 'Not provided'}</span>
                </div>
                <div className="inspect-field">
                  <label>Date of Birth</label>
                  <span>{selectedUserForInspect.dob || 'Not provided'}</span>
                </div>
                <div className="inspect-field">
                  <label>Role</label>
                  <span className="role-tag-inspect">{selectedUserForInspect.role.toUpperCase()}</span>
                </div>
                <div className="inspect-field">
                  <label>Active Sessions</label>
                  <span>{selectedUserForInspect.active_sessions} tokens active</span>
                </div>
                <div className="inspect-field">
                  <label>Account Created At</label>
                  <span>{new Date(selectedUserForInspect.created_at).toLocaleString()}</span>
                </div>
                <div className="inspect-field">
                  <label>Last Record Update</label>
                  <span>{new Date(selectedUserForInspect.updated_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="inspect-raw-json">
                <label>Raw SQLite Database Payload</label>
                <pre>{JSON.stringify(selectedUserForInspect, null, 2)}</pre>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn-action secondary"
                onClick={() => setSelectedUserForInspect(null)}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: RESET PASSWORD                                            */}
      {/* =================================================================== */}
      {resetPasswordUser && (
        <div className="admin-modal-backdrop" onClick={() => setResetPasswordUser(null)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div className="modal-title-row">
                <Key size={18} className="text-amber" />
                <h3>Reset Password: @{resetPasswordUser.username}</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setResetPasswordUser(null)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleResetPasswordSubmit}>
              <div className="admin-modal-body">
                <p className="modal-description-p">
                  Enter a new password for account <strong>{resetPasswordUser.email}</strong>. The password will be immediately hashed using PBKDF2-HMAC-SHA256 with 100,000 iterations.
                </p>
                <div className="admin-form-group">
                  <label>New Password:</label>
                  <div className="input-with-icon">
                    <Lock size={16} className="input-icon" />
                    <input
                      type="text"
                      className="admin-form-input"
                      placeholder="Enter new password (min 4 characters)..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={4}
                      autoFocus
                    />
                  </div>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn-action secondary"
                  onClick={() => setResetPasswordUser(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn-action primary">
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: ADD NEW USER                                              */}
      {/* =================================================================== */}
      {isAddUserModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsAddUserModalOpen(false)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div className="modal-title-row">
                <Plus size={18} className="text-cyan" />
                <h3>Register New Platform User</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsAddUserModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateUserSubmit}>
              <div className="admin-modal-body">
                <div className="form-grid-two">
                  <div className="admin-form-group">
                    <label>Username *</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      placeholder="e.g. rahul_sharma"
                      value={newUserData.username}
                      onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>Email Address *</label>
                    <input
                      type="email"
                      className="admin-form-input"
                      placeholder="e.g. rahul@example.com"
                      value={newUserData.email}
                      onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      className="admin-form-input"
                      placeholder="e.g. Rahul Sharma"
                      value={newUserData.full_name}
                      onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>Date of Birth</label>
                    <input
                      type="date"
                      className="admin-form-input"
                      value={newUserData.dob}
                      onChange={(e) => setNewUserData({ ...newUserData, dob: e.target.value })}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>Password *</label>
                    <input
                      type="password"
                      className="admin-form-input"
                      placeholder="Choose account password"
                      value={newUserData.password}
                      onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                      required
                      minLength={4}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>Role</label>
                    <select
                      className="admin-form-select"
                      value={newUserData.role}
                      onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                    >
                      <option value="user">User (Standard)</option>
                      <option value="developer">Developer</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn-action secondary"
                  onClick={() => setIsAddUserModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="admin-btn-action primary">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 4: DELETE CONFIRMATION                                       */}
      {/* =================================================================== */}
      {deleteConfirmUser && (
        <div className="admin-modal-backdrop" onClick={() => setDeleteConfirmUser(null)}>
          <div className="admin-modal-box danger-box" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div className="modal-title-row">
                <ShieldAlert size={20} className="text-rose" />
                <h3>Confirm User Deletion</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setDeleteConfirmUser(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="admin-modal-body">
              <p className="danger-warning-text">
                Are you sure you want to delete user <strong>@{deleteConfirmUser.username}</strong> ({deleteConfirmUser.email})?
              </p>
              <p className="danger-subtext">
                This will permanently delete their account and invalidate all of their active session tokens in SQLite. This action cannot be undone.
              </p>
            </div>
            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn-action secondary"
                onClick={() => setDeleteConfirmUser(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn-action danger"
                onClick={handleDeleteUser}
              >
                Permanently Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default AdminControlPanel;
