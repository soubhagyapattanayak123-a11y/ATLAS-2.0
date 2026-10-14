import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Search,
  Plus,
  Trash2,
  Edit3,
  X,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Server,
  LogIn,
  LogOut,
  ShieldCheck,
  Camera,
  FileText,
} from 'lucide-react';
import { api } from './api';
import { AuthModal } from './components/AuthModal';
import { LoginPage } from './components/LoginPage';
import { AcademicSolverPage, type AcademicActiveTab } from './components/AcademicSolverPage';
import { AdminControlPanel } from './components/AdminControlPanel';
import { WelcomeCelebrationModal } from './components/WelcomeCelebrationModal';
import { playWelcomeSound } from './utils/soundEffects';
import {
  setActiveUserStorageId,
  clearActiveUserStorageId,
  purgeLegacyGlobalStorage,
} from './utils/userStorage';
import type {
  AtlasItem,
  HealthResponse,
  ItemStats,
  Priority,
  Status,
  ItemCreateInput,
  User,
} from './types';

export function App() {
  const [currentView, setCurrentView] = useState<'auth' | 'dashboard' | 'nodes' | 'admin'>('auth');
  const [academicTab, setAcademicTab] = useState<AcademicActiveTab>('home');
  const [items, setItems] = useState<AtlasItem[]>([]);
  const [stats, setStats] = useState<ItemStats | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [healthError, setHealthError] = useState<boolean>(false);

  // User & Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [welcomeCelebrationUser, setWelcomeCelebrationUser] = useState<User | null>(null);


  // Filters
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Node CRUD Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<AtlasItem | null>(null);
  const [formData, setFormData] = useState<ItemCreateInput>({
    title: '',
    description: '',
    category: 'Architecture',
    priority: 'medium',
    status: 'todo',
  });

  // Toasts
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const addToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Listen for Network Mode toggles across components
  useEffect(() => {
    const handleNetworkModeChanged = (e: any) => {
      const isNowOffline = !!e.detail?.offline;
      if (isNowOffline) {
        const offlineUser = api.getOfflineUser();
        setActiveUserStorageId(offlineUser.id);
        setUser(offlineUser);
        addToast('Switched to Offline Mode (Zero Internet)', 'success');
      } else {
        addToast('Switched to Online Mode', 'success');
      }
      loadData();
    };
    window.addEventListener('atlas_network_mode_changed', handleNetworkModeChanged);
    return () => window.removeEventListener('atlas_network_mode_changed', handleNetworkModeChanged);
  }, []);

  // Check existing session token on mount
  useEffect(() => {
    if (api.isOfflineMode()) {
      const offlineUser = api.getOfflineUser();
      setActiveUserStorageId(offlineUser.id);
      setUser(offlineUser);
      setAcademicTab('home');
      setCurrentView('dashboard');
      return;
    }

    if (api.getToken()) {
      api.getMe()
        .then((userData) => {
          setActiveUserStorageId(userData.id);
          purgeLegacyGlobalStorage();
          setUser(userData);
          setAcademicTab('home');
          setCurrentView('dashboard');
        })
        .catch(() => {
          const offlineUser = api.getOfflineUser();
          if (offlineUser && offlineUser.email && api.isOfflineMode()) {
            setActiveUserStorageId(offlineUser.id);
            setUser(offlineUser);
            setAcademicTab('home');
            setCurrentView('dashboard');
            return;
          }
          api.clearToken();
          clearActiveUserStorageId();
          purgeLegacyGlobalStorage();
          setUser(null);
          setCurrentView('auth');
        });
    } else {
      clearActiveUserStorageId();
      purgeLegacyGlobalStorage();
      setUser(null);
      setCurrentView('auth');
    }
  }, []);

  // Initial load & Polling
  const loadData = async () => {
    try {
      if (api.isOfflineMode()) {
        const [healthData, statsData, itemsData] = await Promise.all([
          api.getHealth().catch(() => null),
          api.getStats().catch(() => null),
          api.getItems({
            status: statusFilter,
            category: categoryFilter,
            priority: priorityFilter,
            search: search.trim() || undefined,
          }).catch(() => []),
        ]);
        if (healthData) {
          setHealth(healthData);
        }
        setHealthError(false);
        if (statsData) setStats(statsData);
        setItems(itemsData);
        setLoading(false);
        return;
      }

      const [healthData, statsData, itemsData] = await Promise.all([
        api.getHealth().catch(() => null),
        api.getStats().catch(() => null),
        api.getItems({
          status: statusFilter,
          category: categoryFilter,
          priority: priorityFilter,
          search: search.trim() || undefined,
        }).catch(() => []),
      ]);

      if (healthData) {
        setHealth(healthData);
        setHealthError(false);
      } else {
        setHealthError(true);
      }

      if (statsData) setStats(statsData);
      setItems(itemsData);
    } catch {
      if (!api.isOfflineMode()) {
        addToast('Failed to sync with backend', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (api.isOfflineMode()) {
        setHealthError(false);
        return;
      }
      api.getHealth()
        .then((h) => {
          setHealth(h);
          setHealthError(false);
        })
        .catch(() => setHealthError(true));
    }, 10000);
    return () => clearInterval(interval);
  }, [statusFilter, categoryFilter, priorityFilter, search]);

  const handleOpenLogin = () => {
    setCurrentView('auth');
  };

  const handleAuthSuccess = (authenticatedUser: User) => {
    setActiveUserStorageId(authenticatedUser.id);
    purgeLegacyGlobalStorage();
    setUser(authenticatedUser);
    addToast(`Authenticated as ${authenticatedUser.full_name || authenticatedUser.username}!`);
    // Trigger welcome sound and celebratory greeting overlay
    playWelcomeSound();
    setWelcomeCelebrationUser(authenticatedUser);
    // When user logs in, always show the Home page first
    setAcademicTab('home');
    setCurrentView('dashboard');
  };

  const handleCelebrationNavigate = (tab: AcademicActiveTab) => {
    setAcademicTab(tab);
    setCurrentView('dashboard');
    setWelcomeCelebrationUser(null);
  };

  const handleLogout = async () => {
    await api.logout();
    clearActiveUserStorageId();
    purgeLegacyGlobalStorage();
    setUser(null);
    setCurrentView('auth');
    addToast('Logged out of session');
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      description: '',
      category: 'Architecture',
      priority: 'medium',
      status: 'todo',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: AtlasItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      category: item.category,
      priority: item.priority,
      status: item.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      addToast('Title is required', 'error');
      return;
    }

    try {
      if (editingItem) {
        await api.updateItem(editingItem.id, formData);
        addToast(`Updated "${formData.title}"`);
      } else {
        await api.createItem(formData);
        addToast(`Created "${formData.title}"`);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Action failed', 'error');
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`Delete node "${title}"?`)) return;
    try {
      await api.deleteItem(id);
      addToast(`Deleted "${title}"`);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Delete failed', 'error');
    }
  };

  const handleQuickStatusChange = async (item: AtlasItem) => {
    const nextStatusMap: Record<Status, Status> = {
      todo: 'in_progress',
      in_progress: 'done',
      done: 'todo',
    };
    const nextStatus = nextStatusMap[item.status];
    try {
      await api.updateItem(item.id, { status: nextStatus });
      addToast(`Status changed to ${nextStatus.replace('_', ' ')}`);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Status update failed', 'error');
    }
  };

  // Derive unique categories for the dropdown filter
  const categories = useMemo(() => {
    const set = new Set<string>(['all', 'Architecture', 'Frontend', 'Database', 'Telemetry', 'Security', 'General']);
    items.forEach((item) => set.add(item.category));
    return Array.from(set);
  }, [items]);



  // Dedicated Full-Screen Login & Auth View
  if (currentView === 'auth') {
    return (
      <>
        <LoginPage
          currentUser={user}
          onLoginSuccess={(authedUser) => {
            handleAuthSuccess(authedUser);
          }}
          onLogout={handleLogout}
          onBackToDashboard={() => {
            if (!user) {
              addToast('Please sign in or create an account to access the dashboard.', 'error');
              return;
            }
            setAcademicTab('home');
            if (user?.role === 'admin') {
              setCurrentView('admin');
            } else {
              setCurrentView('dashboard');
            }
          }}
        />

        {/* Floating Toast Alerts */}
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast ${toast.type}`}>
              {toast.type === 'success' ? (
                <CheckCircle2 size={16} color="var(--accent-emerald)" />
              ) : (
                <AlertCircle size={16} color="var(--accent-rose)" />
              )}
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  // Dedicated Admin Control Panel & User Management
  if (currentView === 'admin') {
    return (
      <>
        <AdminControlPanel
          currentUser={user}
          onNavigateToDashboard={() => {
            setAcademicTab('home');
            setCurrentView('dashboard');
          }}
          onNavigateToImageScanner={() => {
            setAcademicTab('image-scanner');
            setCurrentView('dashboard');
          }}
          onNavigateToPdfScanner={() => {
            setAcademicTab('pdf-scanner');
            setCurrentView('dashboard');
          }}
          onNavigateToWorkspace={() => setCurrentView('nodes')}
          onLogout={handleLogout}
        />

        {/* Welcome Celebration Modal */}
        {welcomeCelebrationUser && (
          <WelcomeCelebrationModal
            user={welcomeCelebrationUser}
            onClose={() => setWelcomeCelebrationUser(null)}
            onNavigateToFeature={handleCelebrationNavigate}
          />
        )}

        {/* Floating Toast Alerts */}
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast ${toast.type}`}>
              {toast.type === 'success' ? (
                <CheckCircle2 size={16} color="var(--accent-emerald)" />
              ) : (
                <AlertCircle size={16} color="var(--accent-rose)" />
              )}
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  // Dedicated Academic Problem Solver (Second Page from User's Design)
  if (currentView === 'dashboard') {
    if (!user) {
      return (
        <>
          <LoginPage
            currentUser={null}
            onLoginSuccess={(authedUser) => {
              handleAuthSuccess(authedUser);
            }}
            onLogout={handleLogout}
            onBackToDashboard={() => {
              addToast('Please sign in or create an account to access the dashboard.', 'error');
            }}
          />
          <div className="toast-container">
            {toasts.map((toast) => (
              <div key={toast.id} className={`toast ${toast.type}`}>
                {toast.type === 'success' ? (
                  <CheckCircle2 size={16} color="var(--accent-emerald)" />
                ) : (
                  <AlertCircle size={16} color="var(--accent-rose)" />
                )}
                <span>{toast.message}</span>
              </div>
            ))}
          </div>
        </>
      );
    }

    return (
      <>
        <AcademicSolverPage
          currentUser={user}
          activeTab={academicTab}
          onTabChange={(tab) => setAcademicTab(tab)}
          onNavigateToAuth={() => setCurrentView('auth')}
          onNavigateToAdmin={() => setCurrentView('admin')}
          onNavigateToWorkspace={(user?.role === 'admin' || user?.role === 'developer') ? () => setCurrentView('nodes') : undefined}
          onLogout={handleLogout}
          stats={stats}
        />

        {/* Welcome Celebration Modal */}
        {welcomeCelebrationUser && (
          <WelcomeCelebrationModal
            user={welcomeCelebrationUser}
            onClose={() => setWelcomeCelebrationUser(null)}
            onNavigateToFeature={handleCelebrationNavigate}
          />
        )}

        {/* Floating Toast Alerts */}
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast ${toast.type}`}>
              {toast.type === 'success' ? (
                <CheckCircle2 size={16} color="var(--accent-emerald)" />
              ) : (
                <AlertCircle size={16} color="var(--accent-rose)" />
              )}
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  // Restrict Database Workspace access: regular users cannot access nodes view
  if (currentView === 'nodes' && user?.role !== 'admin' && user?.role !== 'developer') {
    return (
      <>
        <AcademicSolverPage
          currentUser={user}
          activeTab={academicTab}
          onTabChange={(tab) => setAcademicTab(tab)}
          onNavigateToAuth={() => setCurrentView('auth')}
          onNavigateToAdmin={user?.role === 'admin' ? () => setCurrentView('admin') : undefined}
          onLogout={handleLogout}
          stats={stats}
        />

        {/* Welcome Celebration Modal */}
        {welcomeCelebrationUser && (
          <WelcomeCelebrationModal
            user={welcomeCelebrationUser}
            onClose={() => setWelcomeCelebrationUser(null)}
            onNavigateToFeature={handleCelebrationNavigate}
          />
        )}

        {/* Floating Toast Alerts */}
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast ${toast.type}`}>
              {toast.type === 'success' ? (
                <CheckCircle2 size={16} color="var(--accent-emerald)" />
              ) : (
                <AlertCircle size={16} color="var(--accent-rose)" />
              )}
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <header className="top-nav">
        <div className="brand-section">
          <div className="brand-logo-badge">
            <img src="/atlas-logo.png" alt="ATLAS 2.0 Logo" className="brand-header-logo-img" />
          </div>
          <div className="brand-text">
            <h1>
              ATLAS 2.0 <span className="brand-tag">v2.0 Core</span>
            </h1>
            <p className="brand-subtitle">React + TypeScript • FastAPI • SQLite Engine</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="view-toggle-nav">
          {user?.role === 'admin' && (
            <button
              id="nav-tab-admin"
              className="nav-tab-btn"
              onClick={() => setCurrentView('admin')}
              style={{ color: '#c084fc', borderColor: 'rgba(168, 85, 247, 0.35)' }}
            >
              <ShieldCheck size={14} />
              <span>Admin Panel</span>
            </button>
          )}
          <button
            id="nav-tab-image-scanner"
            className="nav-tab-btn"
            onClick={() => {
              setAcademicTab('image-scanner');
              setCurrentView('dashboard');
            }}
          >
            <Camera size={14} />
            <span>Image Scanner</span>
          </button>
          <button
            id="nav-tab-pdf-scanner"
            className="nav-tab-btn"
            onClick={() => {
              setAcademicTab('pdf-scanner');
              setCurrentView('dashboard');
            }}
          >
            <FileText size={14} />
            <span>PDF Scanner</span>
          </button>
          <button
            id="nav-tab-academic"
            className="nav-tab-btn"
            onClick={() => {
              setAcademicTab('home');
              setCurrentView('dashboard');
            }}
          >
            <span>🏠 Home</span>
          </button>
          {(user?.role === 'admin' || user?.role === 'developer') && (
            <button
              id="nav-tab-workspace"
              className="nav-tab-btn active"
              onClick={() => setCurrentView('nodes')}
            >
              <Layers size={14} />
              <span>Workspace</span>
            </button>
          )}
          <button
            id="nav-tab-auth"
            className="nav-tab-btn"
            onClick={() => setCurrentView('auth')}
          >
            <ShieldCheck size={14} />
            <span>{user ? 'Account Portal' : 'Sign In / Register'}</span>
          </button>
        </div>

        <div className="nav-actions">
          <div className={`health-pill ${healthError ? 'error' : ''}`}>
            <span className="pulse-dot" />
            {healthError ? (
              <span>API Offline</span>
            ) : (
              <span>
                {health?.database ? `SQLite Live (${health.items_count} items)` : 'Connecting...'}
              </span>
            )}
          </div>

          <button
            className="btn-secondary"
            onClick={loadData}
            title="Refresh State"
            aria-label="Refresh State"
          >
            <RefreshCw size={15} className={loading ? 'pulse-dot' : ''} />
            <span>Sync</span>
          </button>

          {/* User Profile / Auth Toggle */}
          {user ? (
            <div
              className="user-badge-nav"
              onClick={() => setCurrentView('auth')}
              title="Open Account & Security Portal"
              style={{ cursor: 'pointer' }}
            >
              <div className="user-avatar-circle">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
              </div>
              <div className="user-nav-details">
                <span className="user-nav-name">{user.username}</span>
                <span className="user-role-tag">{user.role}</span>
              </div>
              <button
                className="logout-icon-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogout();
                }}
                title="Log Out of ATLAS 2.0"
                aria-label="Log Out"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button className="btn-secondary" onClick={handleOpenLogin}>
              <LogIn size={15} />
              <span>Sign In</span>
            </button>
          )}

          {currentView === 'nodes' && (
            <button className="btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} />
              <span>New Node</span>
            </button>
          )}
        </div>
      </header>

      {/* Metrics Row */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Total Nodes</div>
            <div className="stat-value">{stats?.total ?? items.length}</div>
            <div className="stat-subtext">Active database records</div>
          </div>
          <div className="stat-icon" style={{ color: 'var(--accent-cyan)' }}>
            <Server size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">In Progress</div>
            <div className="stat-value" style={{ color: '#60a5fa' }}>
              {stats?.by_status?.in_progress ?? 0}
            </div>
            <div className="stat-subtext">Active developments</div>
          </div>
          <div className="stat-icon" style={{ color: '#60a5fa' }}>
            <Clock size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Completed</div>
            <div className="stat-value" style={{ color: 'var(--accent-emerald)' }}>
              {stats?.by_status?.done ?? 0}
            </div>
            <div className="stat-subtext">Verified pipelines</div>
          </div>
          <div className="stat-icon" style={{ color: 'var(--accent-emerald)' }}>
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Critical / High</div>
            <div className="stat-value" style={{ color: 'var(--accent-rose)' }}>
              {(stats?.by_priority?.critical ?? 0) + (stats?.by_priority?.high ?? 0)}
            </div>
            <div className="stat-subtext">Priority attention items</div>
          </div>
          <div className="stat-icon" style={{ color: 'var(--accent-rose)' }}>
            <AlertCircle size={22} />
          </div>
        </div>
      </section>

      {/* Control Toolbar */}
      <section className="toolbar-section">
        <div className="search-box">
          <Search size={16} className="search-icon-pos" />
          <input
            type="text"
            placeholder="Search nodes by title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          {/* Status Tab Group */}
          <div className="status-tabs">
            {(['all', 'todo', 'in_progress', 'done'] as const).map((st) => (
              <button
                key={st}
                className={`status-tab ${statusFilter === st ? 'active' : ''}`}
                onClick={() => setStatusFilter(st)}
              >
                {st === 'all'
                  ? 'All'
                  : st === 'in_progress'
                  ? 'In Progress'
                  : st.charAt(0).toUpperCase() + st.slice(1)}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                Category: {cat}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            className="filter-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">Priority: All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </section>

      {/* Main Grid */}
      <main className="items-grid">
        {loading ? (
          <div className="empty-state">
            <RefreshCw size={32} className="pulse-dot" style={{ color: 'var(--accent-indigo)' }} />
            <h3>Synchronizing ATLAS 2.0 Node Graph...</h3>
            <p>Querying SQLite database via FastAPI backend.</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <Sparkles size={36} style={{ color: 'var(--accent-indigo)' }} />
            <h3>No nodes matched your query</h3>
            <p>Adjust your search criteria or create a new node to register in the database.</p>
            <button className="btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} /> Create First Node
            </button>
          </div>
        ) : (
          items.map((item) => (
            <article key={item.id} className="item-card">
              <div className="item-card-top">
                <div className="item-card-header">
                  <div className="pill-group">
                    <span className="category-badge">{item.category}</span>
                    <span className={`priority-pill priority-${item.priority}`}>
                      {item.priority}
                    </span>
                  </div>

                  <div className="item-actions">
                    <button
                      className="icon-btn"
                      onClick={() => handleOpenEdit(item)}
                      title="Edit Item"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={() => handleDelete(item.id, item.title)}
                      title="Delete Item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <h3 className="item-title">{item.title}</h3>
                <p className="item-description">{item.description || 'No description provided.'}</p>
              </div>

              <div className="item-footer">
                <button
                  className={`status-pill-select status-${item.status}`}
                  onClick={() => handleQuickStatusChange(item)}
                  title="Click to cycle status"
                >
                  <span className="pulse-dot" style={{ width: 6, height: 6 }} />
                  {item.status === 'in_progress'
                    ? 'In Progress'
                    : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </button>

                <span className="font-mono" style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                  ID #{item.id}
                </span>
              </div>
            </article>
          ))
        )}
      </main>

      {/* Node Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingItem ? 'Edit Node' : 'Register New Node'}</h3>
              <button
                className="icon-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-field">
                  <label htmlFor="title">Node Title *</label>
                  <input
                    id="title"
                    type="text"
                    required
                    placeholder="e.g. Implement High-Throughput Ingestion"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="category">Category</label>
                    <input
                      id="category"
                      type="text"
                      placeholder="e.g. Architecture, Frontend"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="priority">Priority</label>
                    <select
                      id="priority"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="status">Initial Status</label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Status })}
                  >
                    <option value="todo">Todo</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    rows={4}
                    placeholder="Describe the node's scope, specifications, or notes..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingItem ? 'Save Changes' : 'Create Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Authentication Modal (Sign In / Create Account) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        defaultMode="login"
      />

      {/* Welcome Celebration Modal */}
      {welcomeCelebrationUser && (
        <WelcomeCelebrationModal
          user={welcomeCelebrationUser}
          onClose={() => setWelcomeCelebrationUser(null)}
          onNavigateToFeature={handleCelebrationNavigate}
        />
      )}

      {/* Floating Toast Alerts */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.type === 'success' ? (
              <CheckCircle2 size={16} color="var(--accent-emerald)" />
            ) : (
              <AlertCircle size={16} color="var(--accent-rose)" />
            )}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
