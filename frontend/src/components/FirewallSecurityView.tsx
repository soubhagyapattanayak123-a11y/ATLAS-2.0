import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Lock,
  Unlock,
  RefreshCw,
  Trash2,
  Play,
  CheckCircle2,
  XCircle,
  Sliders,
  Terminal,
  Activity,
  Globe,
  Radio,
  Zap,
  Info,
} from 'lucide-react';
import { api } from '../api';
import type { FirewallStatus, FirewallThreatLog, FirewallTestProbeResult } from '../types';

interface FirewallSecurityViewProps {
  onBackToUsers?: () => void;
}

export const FirewallSecurityView: React.FC<FirewallSecurityViewProps> = () => {
  const [status, setStatus] = useState<FirewallStatus | null>(null);
  const [logs, setLogs] = useState<FirewallThreatLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'logs' | 'rules' | 'ip_rules' | 'simulator'>('logs');

  // Filter logs by threat type
  const [threatFilter, setThreatFilter] = useState<string>('all');

  // IP Access Rule Form
  const [newRuleIp, setNewRuleIp] = useState<string>('');
  const [newRuleType, setNewRuleType] = useState<'block' | 'whitelist'>('block');
  const [newRuleReason, setNewRuleReason] = useState<string>('');
  const [newRuleDuration, setNewRuleDuration] = useState<number | ''>('');

  // Simulator State
  const [probeType, setProbeType] = useState<'sqli' | 'xss' | 'traversal' | 'cmd' | 'scanner'>('sqli');
  const [customPayload, setCustomPayload] = useState<string>('');
  const [probeLoading, setProbeLoading] = useState<boolean>(false);
  const [probeResult, setProbeResult] = useState<FirewallTestProbeResult | null>(null);

  // Toast message
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load status and logs
  const loadFirewallData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const [statusRes, logsRes] = await Promise.all([
        api.getFirewallStatus(),
        api.getFirewallLogs(60, threatFilter !== 'all' ? threatFilter : undefined),
      ]);
      setStatus(statusRes);
      setLogs(logsRes);
    } catch (err: any) {
      console.error('[Firewall] Failed to load data:', err);
      if (!isSilent) {
        showToast(err.message || 'Failed to fetch firewall status', 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [threatFilter]);

  useEffect(() => {
    loadFirewallData();
    // Auto-refresh telemetry every 12 seconds
    const timer = setInterval(() => loadFirewallData(true), 12000);
    return () => clearInterval(timer);
  }, [loadFirewallData]);

  // Handle Rule Toggle
  const handleToggleRule = async (ruleName: string, currentState: boolean) => {
    try {
      await api.toggleFirewallRule(ruleName, !currentState);
      showToast(`Rule '${ruleName}' ${!currentState ? 'enabled' : 'disabled'}`);
      loadFirewallData(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle rule', 'error');
    }
  };

  // Handle Add IP Rule
  const handleAddIpRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleIp.trim()) {
      showToast('Please enter a valid IP address', 'error');
      return;
    }
    try {
      await api.addFirewallIPRule(
        newRuleIp.trim(),
        newRuleType,
        newRuleReason.trim() || 'Manual configuration by Admin',
        newRuleDuration ? Number(newRuleDuration) : undefined
      );
      showToast(`IP ${newRuleIp} added to ${newRuleType} list successfully`);
      setNewRuleIp('');
      setNewRuleReason('');
      setNewRuleDuration('');
      loadFirewallData();
    } catch (err: any) {
      showToast(err.message || 'Failed to add IP rule', 'error');
    }
  };

  // Handle Remove IP Rule
  const handleRemoveIpRule = async (ip: string) => {
    try {
      await api.removeFirewallIPRule(ip);
      showToast(`Rule for IP ${ip} removed`);
      loadFirewallData();
    } catch (err: any) {
      showToast(err.message || 'Failed to remove IP rule', 'error');
    }
  };

  // Handle Clear Logs
  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all firewall threat logs?')) return;
    try {
      await api.clearFirewallLogs();
      showToast('Firewall logs cleared');
      loadFirewallData();
    } catch (err: any) {
      showToast(err.message || 'Failed to clear logs', 'error');
    }
  };

  // Handle Attack Probe Test
  const handleRunProbe = async () => {
    setProbeLoading(true);
    setProbeResult(null);
    try {
      const res = await api.testFirewallProbe(probeType, customPayload.trim() || undefined);
      setProbeResult(res);
      if (res.intercepted) {
        showToast(`Attack successfully blocked by ${res.rule_name}!`, 'success');
        // Refresh logs so newly logged test event shows up
        loadFirewallData(true);
      } else {
        showToast('Payload evaluated clean by active rule set', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Test probe execution failed', 'error');
    } finally {
      setProbeLoading(false);
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'badge-critical';
      case 'HIGH':
        return 'badge-high';
      case 'MEDIUM':
        return 'badge-medium';
      default:
        return 'badge-low';
    }
  };

  return (
    <div className="firewall-security-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`admin-toast-notice ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Main Firewall Header Banner */}
      <div className="firewall-header-banner">
        <div className="banner-title-area">
          <div className="firewall-status-pill active">
            <span className="pulsing-shield-dot"></span>
            <ShieldCheck size={16} color="#10b981" />
            <span className="status-label">ACTIVE FIREWALL DEFENSE (WAF)</span>
          </div>
          <h2 className="firewall-heading">ATLAS 2.0 Web Application Firewall & Security Center</h2>
          <p className="firewall-description">
            Zero-day threat filtering, SQL injection prevention, cross-site scripting (XSS) defense, automated bot mitigation, and intelligent IP rate limiting.
          </p>
        </div>

        <div className="banner-controls">
          <button
            type="button"
            className="btn-firewall-action secondary"
            onClick={() => loadFirewallData()}
            disabled={refreshing}
            title="Refresh Firewall Telemetry"
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="btn-firewall-action danger"
            onClick={handleClearLogs}
            title="Clear all recorded threat logs"
          >
            <Trash2 size={14} />
            <span>Clear Logs</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metric Cards */}
      <div className="firewall-kpi-grid">
        <div className="firewall-kpi-card">
          <div className="kpi-icon-wrapper cyan">
            <Activity size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Requests Inspected</span>
            <h3 className="kpi-value">{status ? status.total_inspected_requests.toLocaleString() : '0'}</h3>
            <span className="kpi-subtext">Clean: {status ? status.clean_requests.toLocaleString() : '0'}</span>
          </div>
        </div>

        <div className="firewall-kpi-card">
          <div className="kpi-icon-wrapper red">
            <ShieldAlert size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Threats Intercepted</span>
            <h3 className="kpi-value threat-count">{status ? status.blocked_threats_count.toLocaleString() : '0'}</h3>
            <span className="kpi-subtext">Interception Rate: 100%</span>
          </div>
        </div>

        <div className="firewall-kpi-card">
          <div className="kpi-icon-wrapper amber">
            <Lock size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Active IP Bans</span>
            <h3 className="kpi-value">{status ? status.active_banned_ips_count : '0'}</h3>
            <span className="kpi-subtext">Whitelisted: {status ? status.whitelisted_ips_count : '0'}</span>
          </div>
        </div>

        <div className="firewall-kpi-card">
          <div className="kpi-icon-wrapper purple">
            <Zap size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Rate-Limit Throttles</span>
            <h3 className="kpi-value">{status ? status.rate_limited_count : '0'}</h3>
            <span className="kpi-subtext">DDoS protection active</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="firewall-subtabs-bar">
        <button
          type="button"
          className={`firewall-subtab-btn ${activeSubTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('logs')}
        >
          <ShieldAlert size={15} />
          <span>Live Threat Logs ({logs.length})</span>
        </button>

        <button
          type="button"
          className={`firewall-subtab-btn ${activeSubTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('rules')}
        >
          <Sliders size={15} />
          <span>Security Rules & WAF Engine</span>
        </button>

        <button
          type="button"
          className={`firewall-subtab-btn ${activeSubTab === 'ip_rules' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('ip_rules')}
        >
          <Globe size={15} />
          <span>IP Access Control ({status?.banned_ips.length || 0} Blocked)</span>
        </button>

        <button
          type="button"
          className={`firewall-subtab-btn ${activeSubTab === 'simulator' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('simulator')}
        >
          <Terminal size={15} />
          <span>Attack Simulator & Probe Tester</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* SUB-TAB 1: LIVE THREAT LOGS                                     */}
      {/* ============================================================== */}
      {activeSubTab === 'logs' && (
        <div className="firewall-tab-panel">
          <div className="firewall-panel-header">
            <div className="panel-title-group">
              <h3 className="panel-heading">Real-Time Threat Interception Feed</h3>
              <p className="panel-subheading">
                All suspicious requests, payload injections, and malicious vulnerability scans blocked by the firewall.
              </p>
            </div>

            {/* Filter by Category */}
            <div className="firewall-filter-bar">
              <label htmlFor="firewall-filter-select">Threat Category:</label>
              <select
                id="firewall-filter-select"
                value={threatFilter}
                onChange={(e) => setThreatFilter(e.target.value)}
                className="firewall-select-input"
              >
                <option value="all">All Threat Types</option>
                <option value="SQL_INJECTION">SQL Injection (SQLi)</option>
                <option value="XSS_SCRIPT">Cross-Site Scripting (XSS)</option>
                <option value="PATH_TRAVERSAL">Directory / Path Traversal</option>
                <option value="COMMAND_INJECTION">Command Injection (RCE)</option>
                <option value="MALICIOUS_SCANNER">Malicious Scanner / Bot</option>
                <option value="RATE_LIMIT_EXCEEDED">Rate Limit Exceeded</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="firewall-loading-state">
              <RefreshCw size={24} className="spin" />
              <span>Inspecting packet logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="firewall-empty-state">
              <ShieldCheck size={48} color="#10b981" />
              <h4>All Systems Secure & Clean</h4>
              <p>No malicious payloads or intrusion attempts detected in the recent inspection window.</p>
            </div>
          ) : (
            <div className="firewall-logs-table-wrapper">
              <table className="firewall-logs-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Client IP</th>
                    <th>Endpoint</th>
                    <th>Threat Category</th>
                    <th>Severity</th>
                    <th>Rule Triggered</th>
                    <th>Action Taken</th>
                    <th>Payload Sample</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => (
                    <tr key={index} className="log-row">
                      <td className="log-cell-time">
                        {log.created_at ? new Date(log.created_at).toLocaleTimeString() : 'Just now'}
                      </td>
                      <td className="log-cell-ip">
                        <code>{log.ip}</code>
                      </td>
                      <td className="log-cell-path">
                        <span className={`method-badge ${log.method?.toLowerCase()}`}>{log.method}</span>
                        <span className="path-text" title={log.path}>{log.path}</span>
                      </td>
                      <td className="log-cell-category">
                        <span className="threat-type-tag">{log.threat_type}</span>
                      </td>
                      <td className="log-cell-severity">
                        <span className={`severity-badge ${getSeverityBadgeClass(log.severity)}`}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="log-cell-rule">{log.rule_name}</td>
                      <td className="log-cell-action">
                        <span className="action-tag blocked">
                          <XCircle size={13} />
                          <span>{log.action_taken || 'BLOCKED_403'}</span>
                        </span>
                      </td>
                      <td className="log-cell-payload">
                        <code className="payload-excerpt" title={log.payload_sample}>
                          {log.payload_sample || '—'}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 2: SECURITY RULES & WAF ENGINES                         */}
      {/* ============================================================== */}
      {activeSubTab === 'rules' && (
        <div className="firewall-tab-panel">
          <div className="firewall-panel-header">
            <div>
              <h3 className="panel-heading">Active Firewall Defense Modules</h3>
              <p className="panel-subheading">
                Toggle and configure individual threat filtering engines in real-time without restarting server services.
              </p>
            </div>
          </div>

          <div className="firewall-rules-grid">
            {/* Rule 1: SQL Injection */}
            <div className={`firewall-rule-card ${status?.rules_enabled.sqli_protection ? 'active' : 'disabled'}`}>
              <div className="rule-card-header">
                <div className="rule-icon-box red">
                  <ShieldAlert size={20} />
                </div>
                <div className="rule-title-group">
                  <h4>SQL Injection (SQLi) Defense</h4>
                  <span className="rule-status-badge">
                    {status?.rules_enabled.sqli_protection ? 'PROTECTING' : 'DISABLED'}
                  </span>
                </div>
              </div>
              <p className="rule-description">
                Inspects all query strings, headers, and request bodies for UNION SELECT, DROP TABLE, OR 1=1, and blind injection signatures.
              </p>
              <div className="rule-footer">
                <span className="rule-stat">Threats Caught: {status?.threat_categories.SQL_INJECTION || 0}</span>
                <button
                  type="button"
                  className={`btn-rule-toggle ${status?.rules_enabled.sqli_protection ? 'on' : 'off'}`}
                  onClick={() => handleToggleRule('sqli_protection', !!status?.rules_enabled.sqli_protection)}
                >
                  {status?.rules_enabled.sqli_protection ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            {/* Rule 2: Cross-Site Scripting (XSS) */}
            <div className={`firewall-rule-card ${status?.rules_enabled.xss_protection ? 'active' : 'disabled'}`}>
              <div className="rule-card-header">
                <div className="rule-icon-box amber">
                  <ShieldCheck size={20} />
                </div>
                <div className="rule-title-group">
                  <h4>Cross-Site Scripting (XSS) Shield</h4>
                  <span className="rule-status-badge">
                    {status?.rules_enabled.xss_protection ? 'PROTECTING' : 'DISABLED'}
                  </span>
                </div>
              </div>
              <p className="rule-description">
                Stops malicious JavaScript tags, svg/onload triggers, document.cookie stealing, and attribute-based script injections.
              </p>
              <div className="rule-footer">
                <span className="rule-stat">Threats Caught: {status?.threat_categories.XSS_SCRIPT || 0}</span>
                <button
                  type="button"
                  className={`btn-rule-toggle ${status?.rules_enabled.xss_protection ? 'on' : 'off'}`}
                  onClick={() => handleToggleRule('xss_protection', !!status?.rules_enabled.xss_protection)}
                >
                  {status?.rules_enabled.xss_protection ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            {/* Rule 3: Path Traversal */}
            <div className={`firewall-rule-card ${status?.rules_enabled.path_traversal ? 'active' : 'disabled'}`}>
              <div className="rule-card-header">
                <div className="rule-icon-box purple">
                  <Lock size={20} />
                </div>
                <div className="rule-title-group">
                  <h4>Path Traversal & LFI Guard</h4>
                  <span className="rule-status-badge">
                    {status?.rules_enabled.path_traversal ? 'PROTECTING' : 'DISABLED'}
                  </span>
                </div>
              </div>
              <p className="rule-description">
                Prevents directory stepping (`../`, `..\\`, `%2e%2e`) and unauthorized access to system files (`/etc/passwd`, `system32`).
              </p>
              <div className="rule-footer">
                <span className="rule-stat">Threats Caught: {status?.threat_categories.PATH_TRAVERSAL || 0}</span>
                <button
                  type="button"
                  className={`btn-rule-toggle ${status?.rules_enabled.path_traversal ? 'on' : 'off'}`}
                  onClick={() => handleToggleRule('path_traversal', !!status?.rules_enabled.path_traversal)}
                >
                  {status?.rules_enabled.path_traversal ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            {/* Rule 4: Remote Command Execution */}
            <div className={`firewall-rule-card ${status?.rules_enabled.command_injection ? 'active' : 'disabled'}`}>
              <div className="rule-card-header">
                <div className="rule-icon-box cyan">
                  <Terminal size={20} />
                </div>
                <div className="rule-title-group">
                  <h4>Command Execution (RCE) Blocker</h4>
                  <span className="rule-status-badge">
                    {status?.rules_enabled.command_injection ? 'PROTECTING' : 'DISABLED'}
                  </span>
                </div>
              </div>
              <p className="rule-description">
                Intercepts shell command separators (`;`, `|`, `&&`, `$()`) executing system commands like `whoami`, `cat`, or `powershell`.
              </p>
              <div className="rule-footer">
                <span className="rule-stat">Threats Caught: {status?.threat_categories.COMMAND_INJECTION || 0}</span>
                <button
                  type="button"
                  className={`btn-rule-toggle ${status?.rules_enabled.command_injection ? 'on' : 'off'}`}
                  onClick={() => handleToggleRule('command_injection', !!status?.rules_enabled.command_injection)}
                >
                  {status?.rules_enabled.command_injection ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            {/* Rule 5: Scanner Bot Protection */}
            <div className={`firewall-rule-card ${status?.rules_enabled.scanner_bot_protection ? 'active' : 'disabled'}`}>
              <div className="rule-card-header">
                <div className="rule-icon-box blue">
                  <Radio size={20} />
                </div>
                <div className="rule-title-group">
                  <h4>Malicious Scanner Bot Filter</h4>
                  <span className="rule-status-badge">
                    {status?.rules_enabled.scanner_bot_protection ? 'PROTECTING' : 'DISABLED'}
                  </span>
                </div>
              </div>
              <p className="rule-description">
                Identifies and instantly blocks automated reconnaissance scanners including sqlmap, nikto, dirbuster, and gobuster.
              </p>
              <div className="rule-footer">
                <span className="rule-stat">Threats Caught: {status?.threat_categories.MALICIOUS_SCANNER || 0}</span>
                <button
                  type="button"
                  className={`btn-rule-toggle ${status?.rules_enabled.scanner_bot_protection ? 'on' : 'off'}`}
                  onClick={() => handleToggleRule('scanner_bot_protection', !!status?.rules_enabled.scanner_bot_protection)}
                >
                  {status?.rules_enabled.scanner_bot_protection ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            {/* Rule 6: Adaptive DDoS Rate Limiting */}
            <div className={`firewall-rule-card ${status?.rules_enabled.rate_limiting ? 'active' : 'disabled'}`}>
              <div className="rule-card-header">
                <div className="rule-icon-box green">
                  <Zap size={20} />
                </div>
                <div className="rule-title-group">
                  <h4>DDoS Adaptive Rate Limiting</h4>
                  <span className="rule-status-badge">
                    {status?.rules_enabled.rate_limiting ? 'PROTECTING' : 'DISABLED'}
                  </span>
                </div>
              </div>
              <p className="rule-description">
                Enforces microsecond sliding-window packet throttling (250 req/min general, 20 req/min sensitive auth) to neutralize flooding attacks.
              </p>
              <div className="rule-footer">
                <span className="rule-stat">Throttles: {status?.rate_limited_count || 0}</span>
                <button
                  type="button"
                  className={`btn-rule-toggle ${status?.rules_enabled.rate_limiting ? 'on' : 'off'}`}
                  onClick={() => handleToggleRule('rate_limiting', !!status?.rules_enabled.rate_limiting)}
                >
                  {status?.rules_enabled.rate_limiting ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 3: IP ACCESS CONTROL MANAGER                            */}
      {/* ============================================================== */}
      {activeSubTab === 'ip_rules' && (
        <div className="firewall-tab-panel">
          <div className="firewall-panel-header">
            <div>
              <h3 className="panel-heading">IP Access Control & Ban Management</h3>
              <p className="panel-subheading">
                Configure permanent or time-based blocklists and trusted whitelists to manage connection permissions.
              </p>
            </div>
          </div>

          {/* Add IP Form */}
          <form className="firewall-ip-form" onSubmit={handleAddIpRule}>
            <div className="ip-form-col">
              <label>IP Address:</label>
              <input
                type="text"
                placeholder="e.g. 192.168.1.50 or 203.0.113.195"
                value={newRuleIp}
                onChange={(e) => setNewRuleIp(e.target.value)}
                className="firewall-text-input"
                required
              />
            </div>

            <div className="ip-form-col">
              <label>Action Policy:</label>
              <select
                value={newRuleType}
                onChange={(e) => setNewRuleType(e.target.value as any)}
                className="firewall-select-input"
              >
                <option value="block">Block IP (Reject 403)</option>
                <option value="whitelist">Whitelist IP (Bypass All)</option>
              </select>
            </div>

            <div className="ip-form-col">
              <label>Reason / Note:</label>
              <input
                type="text"
                placeholder="e.g. Malicious probing attempts"
                value={newRuleReason}
                onChange={(e) => setNewRuleReason(e.target.value)}
                className="firewall-text-input"
              />
            </div>

            <div className="ip-form-col">
              <label>Duration (Minutes):</label>
              <input
                type="number"
                placeholder="Leave blank for permanent"
                value={newRuleDuration}
                onChange={(e) => setNewRuleDuration(e.target.value ? Number(e.target.value) : '')}
                className="firewall-text-input"
                min="1"
              />
            </div>

            <div className="ip-form-actions">
              <button type="submit" className="btn-add-ip-rule">
                <PlusIcon size={14} />
                <span>Add IP Rule</span>
              </button>
            </div>
          </form>

          {/* Active Rules List */}
          <div className="firewall-rules-table-box">
            <h4 className="rules-section-title">Current Access Rules ({status?.stored_ip_rules?.length || 0})</h4>

            {(!status?.stored_ip_rules || status.stored_ip_rules.length === 0) ? (
              <div className="firewall-empty-state small">
                <CheckCircle2 size={36} color="#10b981" />
                <p>No custom IP blocks or whitelists currently active.</p>
              </div>
            ) : (
              <table className="firewall-logs-table">
                <thead>
                  <tr>
                    <th>IP Address</th>
                    <th>Policy Type</th>
                    <th>Reason</th>
                    <th>Created</th>
                    <th>Expires</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {status.stored_ip_rules.map((r) => (
                    <tr key={r.id}>
                      <td><code>{r.ip}</code></td>
                      <td>
                        <span className={`ip-rule-pill ${r.rule_type}`}>
                          {r.rule_type === 'block' ? <Lock size={12} /> : <Unlock size={12} />}
                          <span>{r.rule_type.toUpperCase()}</span>
                        </span>
                      </td>
                      <td>{r.reason || '—'}</td>
                      <td>{new Date(r.created_at).toLocaleString()}</td>
                      <td>{r.expires_at ? new Date(r.expires_at).toLocaleString() : 'Permanent'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-delete-rule"
                          onClick={() => handleRemoveIpRule(r.ip)}
                          title="Remove rule"
                        >
                          <Trash2 size={14} />
                          <span>Remove</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 4: ATTACK SIMULATOR & PROBE TESTER                     */}
      {/* ============================================================== */}
      {activeSubTab === 'simulator' && (
        <div className="firewall-tab-panel">
          <div className="firewall-panel-header">
            <div>
              <h3 className="panel-heading">Interactive Attack Simulator & WAF Tester</h3>
              <p className="panel-subheading">
                Safely test attack payloads against the active firewall to demonstrate real-time interception, logging, and 403 blocking.
              </p>
            </div>
          </div>

          <div className="simulator-grid">
            <div className="simulator-controls-card">
              <h4 className="card-subtitle">Select Simulation Probe:</h4>

              <div className="probe-buttons-row">
                <button
                  type="button"
                  className={`probe-type-btn ${probeType === 'sqli' ? 'active' : ''}`}
                  onClick={() => {
                    setProbeType('sqli');
                    setCustomPayload("SELECT * FROM users WHERE id=1 UNION SELECT password_hash FROM users --");
                  }}
                >
                  <ShieldAlert size={14} />
                  <span>SQL Injection Probe</span>
                </button>

                <button
                  type="button"
                  className={`probe-type-btn ${probeType === 'xss' ? 'active' : ''}`}
                  onClick={() => {
                    setProbeType('xss');
                    setCustomPayload("<script>alert('XSS Exploit Intercepted!')</script>");
                  }}
                >
                  <ShieldCheck size={14} />
                  <span>XSS Script Probe</span>
                </button>

                <button
                  type="button"
                  className={`probe-type-btn ${probeType === 'traversal' ? 'active' : ''}`}
                  onClick={() => {
                    setProbeType('traversal');
                    setCustomPayload("../../../../etc/passwd");
                  }}
                >
                  <Lock size={14} />
                  <span>Path Traversal Probe</span>
                </button>

                <button
                  type="button"
                  className={`probe-type-btn ${probeType === 'cmd' ? 'active' : ''}`}
                  onClick={() => {
                    setProbeType('cmd');
                    setCustomPayload("; cat /etc/passwd | whoami");
                  }}
                >
                  <Terminal size={14} />
                  <span>Command Injection</span>
                </button>

                <button
                  type="button"
                  className={`probe-type-btn ${probeType === 'scanner' ? 'active' : ''}`}
                  onClick={() => {
                    setProbeType('scanner');
                    setCustomPayload("sqlmap/1.6.12#stable");
                  }}
                >
                  <Radio size={14} />
                  <span>Malicious Scanner UA</span>
                </button>
              </div>

              <div className="custom-payload-area">
                <label>Test Payload:</label>
                <textarea
                  className="payload-textarea"
                  rows={4}
                  value={customPayload}
                  onChange={(e) => setCustomPayload(e.target.value)}
                  placeholder="Enter custom attack signature or select a preset above..."
                />
              </div>

              <button
                type="button"
                className="btn-launch-probe"
                onClick={handleRunProbe}
                disabled={probeLoading}
              >
                {probeLoading ? (
                  <>
                    <RefreshCw size={15} className="spin" />
                    <span>Executing Probe...</span>
                  </>
                ) : (
                  <>
                    <Play size={15} />
                    <span>Fire Security Probe</span>
                  </>
                )}
              </button>
            </div>

            {/* Probe Results Box */}
            <div className="simulator-result-card">
              <h4 className="card-subtitle">Firewall Interception Output:</h4>

              {!probeResult ? (
                <div className="simulator-awaiting">
                  <Terminal size={36} color="#64748b" />
                  <p>Awaiting probe trigger. Select an exploit preset on the left and click 'Fire Security Probe'.</p>
                </div>
              ) : (
                <div className={`probe-result-display ${probeResult.intercepted ? 'blocked' : 'passed'}`}>
                  <div className="result-header">
                    {probeResult.intercepted ? (
                      <>
                        <ShieldAlert size={24} color="#ef4444" />
                        <div>
                          <h4 className="result-title text-red">ATTACK INTERCEPTED & BLOCKED (403)</h4>
                          <span className="result-subtitle">Threat neutralized before executing</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={24} color="#10b981" />
                        <div>
                          <h4 className="result-title text-green">PAYLOAD EVALUATED CLEAN</h4>
                          <span className="result-subtitle">No threats triggered</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="result-details-list">
                    <div className="result-detail-item">
                      <span className="detail-key">Action:</span>
                      <span className="detail-val font-mono">{probeResult.firewall_action}</span>
                    </div>

                    {probeResult.threat_category && (
                      <div className="result-detail-item">
                        <span className="detail-key">Threat Category:</span>
                        <span className="detail-val font-bold text-red">{probeResult.threat_category}</span>
                      </div>
                    )}

                    {probeResult.rule_name && (
                      <div className="result-detail-item">
                        <span className="detail-key">Rule Triggered:</span>
                        <span className="detail-val font-bold">{probeResult.rule_name}</span>
                      </div>
                    )}

                    {probeResult.matched_pattern && (
                      <div className="result-detail-item">
                        <span className="detail-key">Matched Signature:</span>
                        <code className="detail-val code-match">{probeResult.matched_pattern}</code>
                      </div>
                    )}

                    <div className="result-detail-item">
                      <span className="detail-key">Tested Payload:</span>
                      <code className="detail-val code-payload">{probeResult.payload_tested}</code>
                    </div>

                    <div className="result-message-box">
                      <Info size={14} />
                      <span>{probeResult.message}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function PlusIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}
