import React, { useState, useEffect, useMemo } from 'react';
import {
  Zap,
  Play,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Search,
  ArrowRight,
  Cpu,
  Terminal,
  Activity,
  Sliders,
  Check,
} from 'lucide-react';
import { api } from '../api';
import type {
  LogicRule,
  LogicRuleCreateInput,
  RuleCondition,
  ConditionOperator,
  ActionType,
  LogicRuleTestResult,
} from '../types';

interface LogicPageProps {
  onBackToDashboard?: () => void;
  addToast: (message: string, type?: 'success' | 'error') => void;
}
const TRIGGER_EVENTS = [
  { value: 'node.created', label: 'Node Created', icon: Plus },
  { value: 'node.updated', label: 'Node Updated', icon: Sliders },
  { value: 'telemetry.spike', label: 'Telemetry Spike', icon: Activity },
  { value: 'manual.trigger', label: 'Manual Trigger', icon: Play },
];

const CONDITION_OPERATORS: { value: ConditionOperator; label: string; symbol: string }[] = [
  { value: 'equals', label: 'Equals', symbol: '==' },
  { value: 'not_equals', label: 'Not Equals', symbol: '!=' },
  { value: 'contains', label: 'Contains Substring', symbol: '⊃' },
  { value: 'greater_than', label: 'Greater Than (Numeric)', symbol: '>' },
  { value: 'less_than', label: 'Less Than (Numeric)', symbol: '<' },
  { value: 'in', label: 'In List (comma separated)', symbol: '∈' },
  { value: 'is_empty', label: 'Is Empty / Null', symbol: '∅' },
];

const ACTION_TYPES: { value: ActionType; label: string; desc: string }[] = [
  { value: 'set_status', label: 'Update Status', desc: 'Sets node status to todo, in_progress, or done' },
  { value: 'set_priority', label: 'Update Priority', desc: 'Sets priority level to low, medium, high, critical' },
  { value: 'send_notification', label: 'Send Alert Notification', desc: 'Dispatches instant operator alert' },
  { value: 'add_tag', label: 'Add Metadata Tag', desc: 'Appends classification tag to payload' },
  { value: 'log_audit', label: 'Log Security Audit', desc: 'Writes audit entry into operational ledger' },
  { value: 'trigger_webhook', label: 'Dispatch Webhook', desc: 'Triggers external REST endpoint integration' },
];

const PRESET_SIMULATION_PAYLOADS = [
  {
    name: 'Critical Incident',
    desc: 'High priority task in todo state',
    payload: {
      priority: 'critical',
      status: 'todo',
      category: 'Architecture',
      title: 'Database connection pool failure',
    },
  },
  {
    name: 'Latency SLA Violation',
    desc: 'Backend service metric crossing 250ms threshold',
    payload: {
      latency_ms: 312,
      service: 'atlas-fastapi-core',
      endpoint: '/api/items',
      status: 'warning',
    },
  },
  {
    name: 'Security Node Ingestion',
    desc: 'New security compliance architecture item',
    payload: {
      category: 'Security',
      title: 'Implement PKCE OAuth flow',
      priority: 'medium',
      status: 'todo',
    },
  },
  {
    name: 'Completed Item Archive',
    desc: 'Node marked done ready for archival logging',
    payload: {
      status: 'done',
      title: 'SQLite WAL mode initialization',
      category: 'Database',
    },
  },
];

export function LogicPage({ onBackToDashboard, addToast }: LogicPageProps) {
  const [rules, setRules] = useState<LogicRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterActive, setFilterActive] = useState<string>('all'); // all, active, inactive
  const [filterTrigger, setFilterTrigger] = useState<string>('all');

  // Modal State for Rule Creation / Editing
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRule, setEditingRule] = useState<LogicRule | null>(null);
  const [ruleFormData, setRuleFormData] = useState<LogicRuleCreateInput>({
    name: '',
    description: '',
    trigger_event: 'node.created',
    condition_operator: 'ALL',
    conditions: [{ field: 'priority', operator: 'equals', value: 'critical' }],
    actions: [{ action_type: 'set_status', parameters: { status: 'in_progress' } }],
    is_active: true,
  });

  // Simulator State
  const [simRuleId, setSimRuleId] = useState<number | 'all'>('all');
  const [simPayloadJson, setSimPayloadJson] = useState<string>(
    JSON.stringify(PRESET_SIMULATION_PAYLOADS[0].payload, null, 2)
  );
  const [simResults, setSimResults] = useState<LogicRuleTestResult[] | null>(null);
  const [simLoading, setSimLoading] = useState<boolean>(false);
  const [simError, setSimError] = useState<string | null>(null);

  // Load rules on mount
  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await api.getLogicRules();
      setRules(data);
    } catch (err: any) {
      addToast(err.message || 'Failed to load logic rules', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  // Filtered Rules
  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      if (filterActive === 'active' && !r.is_active) return false;
      if (filterActive === 'inactive' && r.is_active) return false;
      if (filterTrigger !== 'all' && r.trigger_event !== filterTrigger) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = r.name.toLowerCase().includes(query);
        const matchesDesc = (r.description || '').toLowerCase().includes(query);
        const matchesField = r.conditions.some((c) => c.field.toLowerCase().includes(query));
        return matchesName || matchesDesc || matchesField;
      }
      return true;
    });
  }, [rules, filterActive, filterTrigger, search]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const total = rules.length;
    const active = rules.filter((r) => r.is_active).length;
    const totalExecutions = rules.reduce((acc, r) => acc + (r.execution_count || 0), 0);
    return { total, active, totalExecutions };
  }, [rules]);

  // Rule Toggle Handler
  const handleToggle = async (ruleId: number) => {
    try {
      const updated = await api.toggleLogicRule(ruleId);
      setRules((prev) => prev.map((r) => (r.id === ruleId ? updated : r)));
      addToast(`Rule "${updated.name}" is now ${updated.is_active ? 'active' : 'inactive'}`);
    } catch (err: any) {
      addToast(err.message || 'Failed to toggle rule', 'error');
    }
  };

  // Rule Delete Handler
  const handleDelete = async (rule: LogicRule) => {
    if (!window.confirm(`Delete rule "${rule.name}"? This cannot be undone.`)) return;
    try {
      await api.deleteLogicRule(rule.id);
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
      addToast(`Rule "${rule.name}" deleted`);
    } catch (err: any) {
      addToast(err.message || 'Failed to delete rule', 'error');
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingRule(null);
    setRuleFormData({
      name: '',
      description: '',
      trigger_event: 'node.created',
      condition_operator: 'ALL',
      conditions: [{ field: 'priority', operator: 'equals', value: 'critical' }],
      actions: [{ action_type: 'set_status', parameters: { status: 'in_progress' } }],
      is_active: true,
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (rule: LogicRule) => {
    setEditingRule(rule);
    setRuleFormData({
      name: rule.name,
      description: rule.description,
      trigger_event: rule.trigger_event,
      condition_operator: rule.condition_operator,
      conditions: rule.conditions.length > 0 ? rule.conditions : [{ field: 'priority', operator: 'equals', value: '' }],
      actions: rule.actions.length > 0 ? rule.actions : [{ action_type: 'set_status', parameters: {} }],
      is_active: rule.is_active,
    });
    setIsModalOpen(true);
  };

  // Form Submit Handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleFormData.name.trim()) {
      addToast('Rule name is required', 'error');
      return;
    }

    try {
      if (editingRule) {
        const updated = await api.updateLogicRule(editingRule.id, ruleFormData);
        setRules((prev) => prev.map((r) => (r.id === editingRule.id ? updated : r)));
        addToast(`Rule "${updated.name}" updated!`);
      } else {
        const created = await api.createLogicRule(ruleFormData);
        setRules((prev) => [created, ...prev]);
        addToast(`Rule "${created.name}" created!`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      addToast(err.message || 'Failed to save logic rule', 'error');
    }
  };

  // Add/Remove Condition Row
  const handleAddCondition = () => {
    setRuleFormData((prev) => ({
      ...prev,
      conditions: [...prev.conditions, { field: 'status', operator: 'equals', value: 'todo' }],
    }));
  };

  const handleRemoveCondition = (index: number) => {
    setRuleFormData((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };

  const handleConditionChange = (index: number, key: keyof RuleCondition, val: any) => {
    setRuleFormData((prev) => {
      const updated = [...prev.conditions];
      updated[index] = { ...updated[index], [key]: val };
      return { ...prev, conditions: updated };
    });
  };

  // Add/Remove Action Row
  const handleAddAction = () => {
    setRuleFormData((prev) => ({
      ...prev,
      actions: [...prev.actions, { action_type: 'send_notification', parameters: { message: 'Alert triggered' } }],
    }));
  };

  const handleRemoveAction = (index: number) => {
    setRuleFormData((prev) => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index),
    }));
  };

  const handleActionTypeChange = (index: number, actionType: ActionType) => {
    let defaultParams: Record<string, any> = {};
    if (actionType === 'set_status') defaultParams = { status: 'in_progress' };
    else if (actionType === 'set_priority') defaultParams = { priority: 'high' };
    else if (actionType === 'send_notification') defaultParams = { message: 'Rule condition matched' };
    else if (actionType === 'add_tag') defaultParams = { tag: 'escalated' };
    else if (actionType === 'log_audit') defaultParams = { message: 'Automated audit event' };
    else if (actionType === 'trigger_webhook') defaultParams = { url: 'https://api.example.com/webhook' };

    setRuleFormData((prev) => {
      const updated = [...prev.actions];
      updated[index] = { action_type: actionType, parameters: defaultParams };
      return { ...prev, actions: updated };
    });
  };

  const handleActionParamChange = (index: number, paramKey: string, paramValue: any) => {
    setRuleFormData((prev) => {
      const updated = [...prev.actions];
      updated[index] = {
        ...updated[index],
        parameters: { ...updated[index].parameters, [paramKey]: paramValue },
      };
      return { ...prev, actions: updated };
    });
  };

  // Execute Simulation Test
  const handleRunSimulation = async () => {
    setSimError(null);
    let parsedPayload: Record<string, any>;
    try {
      parsedPayload = JSON.parse(simPayloadJson);
    } catch {
      setSimError('Invalid JSON payload syntax. Please check brackets and quotes.');
      return;
    }

    setSimLoading(true);
    try {
      if (simRuleId === 'all') {
        const results = await api.evaluateAllRules(parsedPayload);
        setSimResults(results);
        addToast(`Evaluated ${results.length} active rules against simulation payload`);
      } else {
        const result = await api.testLogicRule(Number(simRuleId), parsedPayload);
        setSimResults([result]);
        addToast(`Rule "${result.rule_name}" simulation completed`);
      }
      // Refresh rules to see updated execution counts
      api.getLogicRules().then(setRules).catch(() => {});
    } catch (err: any) {
      setSimError(err.message || 'Simulation execution failed');
    } finally {
      setSimLoading(false);
    }
  };

  const handleLoadPreset = (preset: (typeof PRESET_SIMULATION_PAYLOADS)[0]) => {
    setSimPayloadJson(JSON.stringify(preset.payload, null, 2));
    setSimError(null);
    setSimResults(null);
  };

  return (
    <div className="logic-page-wrapper">
      {/* Top Engine Banner */}
      <section className="logic-hero-banner">
        <div className="logic-hero-info">
          <div className="engine-badge">
            <span className="live-dot pulse-emerald"></span>
            <span>ATLAS 2.0 • LOGIC ENGINE & AUTOMATION</span>
          </div>
          <h1>Logic & Workflow Automation Engine</h1>
          <p>
            Build, test, and execute declarative event-driven logic rules with zero-latency SQLite WAL mode evaluation.
          </p>
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="btn-card-action"
              style={{ width: 'fit-content', marginTop: '0.4rem', border: '1px solid rgba(255, 255, 255, 0.15)' }}
            >
              <span>← Go to Workspace Dashboard</span>
            </button>
          )}
        </div>

        {/* Live Metrics Row */}
        <div className="logic-metrics-strip">
          <div className="logic-metric-card">
            <div className="metric-icon-wrap bg-cyan-subtle">
              <Cpu size={20} className="text-cyan" />
            </div>
            <div className="metric-details">
              <span className="metric-count">{stats.total}</span>
              <span className="metric-title">Registered Rules</span>
            </div>
          </div>

          <div className="logic-metric-card">
            <div className="metric-icon-wrap bg-emerald-subtle">
              <Zap size={20} className="text-emerald" />
            </div>
            <div className="metric-details">
              <span className="metric-count text-emerald">{stats.active}</span>
              <span className="metric-title">Active Automations</span>
            </div>
          </div>

          <div className="logic-metric-card">
            <div className="metric-icon-wrap bg-indigo-subtle">
              <Activity size={20} className="text-indigo" />
            </div>
            <div className="metric-details">
              <span className="metric-count font-mono">{stats.totalExecutions}</span>
              <span className="metric-title">Total Executions</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content: Split Rules View and Simulator */}
      <div className="logic-main-grid">
        {/* Left Column: Rules Management */}
        <section className="logic-rules-section">
          {/* Controls & Filter Bar */}
          <div className="rules-control-bar">
            <div className="rules-search-wrap">
              <Search size={16} className="search-icon" />
              <input
                id="search-logic-rules"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search rules, fields, conditions..."
              />
            </div>

            <div className="rules-filters-row">
              <select
                id="filter-rule-status"
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>

              <select
                id="filter-rule-trigger"
                value={filterTrigger}
                onChange={(e) => setFilterTrigger(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Triggers</option>
                {TRIGGER_EVENTS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>

              <button
                id="btn-create-rule"
                className="btn-create-rule"
                onClick={handleOpenCreate}
              >
                <Plus size={16} />
                <span>New Logic Rule</span>
              </button>
            </div>
          </div>

          {/* Rules List */}
          {loading ? (
            <div className="logic-loading-state">
              <RefreshCw size={28} className="spin text-cyan" />
              <span>Querying Logic Engine Schema...</span>
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="logic-empty-state">
              <Sliders size={40} className="text-muted" />
              <h3>No matching logic rules found</h3>
              <p>Adjust your search criteria or create a new automation rule.</p>
              <button className="btn-accent" onClick={handleOpenCreate}>
                <Plus size={16} />
                <span>Create Your First Rule</span>
              </button>
            </div>
          ) : (
            <div className="rules-card-list">
              {filteredRules.map((rule) => {
                const triggerObj = TRIGGER_EVENTS.find((t) => t.value === rule.trigger_event);
                const TriggerIcon = triggerObj ? triggerObj.icon : Zap;

                return (
                  <div
                    key={rule.id}
                    className={`rule-card ${rule.is_active ? 'active-rule' : 'inactive-rule'}`}
                  >
                    {/* Card Header */}
                    <div className="rule-card-header">
                      <div className="rule-title-group">
                        <div className="rule-trigger-pill">
                          <TriggerIcon size={13} className="text-cyan" />
                          <span>{triggerObj?.label || rule.trigger_event}</span>
                        </div>
                        <h3 className="rule-name">{rule.name}</h3>
                        {rule.description && <p className="rule-desc">{rule.description}</p>}
                      </div>

                      <div className="rule-toggle-wrap">
                        <button
                          id={`toggle-rule-${rule.id}`}
                          className={`btn-toggle-switch ${rule.is_active ? 'on' : 'off'}`}
                          onClick={() => handleToggle(rule.id)}
                          title={rule.is_active ? 'Deactivate rule' : 'Activate rule'}
                        >
                          {rule.is_active ? (
                            <>
                              <ToggleRight size={22} className="text-emerald" />
                              <span className="toggle-label text-emerald">Active</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft size={22} className="text-muted" />
                              <span className="toggle-label text-muted">Inactive</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Condition Flow */}
                    <div className="rule-pipeline-box">
                      <div className="pipeline-conditions">
                        <div className="pipeline-label">
                          <span>IF CONDITIONS</span>
                          <span className={`operator-tag tag-${rule.condition_operator.toLowerCase()}`}>
                            MATCH {rule.condition_operator}
                          </span>
                        </div>
                        <div className="conditions-chips">
                          {rule.conditions.map((cond, idx) => {
                            const opObj = CONDITION_OPERATORS.find((o) => o.value === cond.operator);
                            return (
                              <div key={idx} className="condition-chip">
                                <span className="cond-field">{cond.field}</span>
                                <span className="cond-op">{opObj?.symbol || cond.operator}</span>
                                <span className="cond-val">{JSON.stringify(cond.value)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pipeline-arrow">
                        <ArrowRight size={18} className="text-cyan" />
                      </div>

                      {/* Action Outputs */}
                      <div className="pipeline-actions">
                        <div className="pipeline-label">
                          <span>THEN EXECUTE ACTIONS</span>
                          <span className="action-count-pill">{rule.actions.length} action(s)</span>
                        </div>
                        <div className="actions-chips">
                          {rule.actions.map((act, idx) => (
                            <div key={idx} className="action-chip">
                              <span className="action-type">{act.action_type}</span>
                              <span className="action-params">
                                {Object.entries(act.parameters)
                                  .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
                                  .join(', ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="rule-card-footer">
                      <div className="rule-execution-meta">
                        <span className="execution-pill font-mono">
                          <Zap size={12} className="text-indigo" />
                          <span>Executed {rule.execution_count} times</span>
                        </span>
                        {rule.last_executed_at && (
                          <span className="last-run-text">
                            Last run:{' '}
                            {new Date(rule.last_executed_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      <div className="rule-actions-group">
                        <button
                          id={`test-rule-btn-${rule.id}`}
                          className="btn-card-action btn-test"
                          onClick={() => {
                            setSimRuleId(rule.id);
                            // Set suitable mock preset if available
                            if (rule.trigger_event === 'telemetry.spike') {
                              handleLoadPreset(PRESET_SIMULATION_PAYLOADS[1]);
                            } else if (rule.conditions.some((c) => c.field === 'category')) {
                              handleLoadPreset(PRESET_SIMULATION_PAYLOADS[2]);
                            } else {
                              handleLoadPreset(PRESET_SIMULATION_PAYLOADS[0]);
                            }
                          }}
                          title="Load into Simulator"
                        >
                          <Play size={13} />
                          <span>Simulate</span>
                        </button>

                        <button
                          id={`edit-rule-btn-${rule.id}`}
                          className="btn-card-action"
                          onClick={() => handleOpenEdit(rule)}
                          title="Edit Rule Configuration"
                        >
                          <Edit3 size={13} />
                          <span>Edit</span>
                        </button>

                        <button
                          id={`delete-rule-btn-${rule.id}`}
                          className="btn-card-action btn-danger"
                          onClick={() => handleDelete(rule)}
                          title="Delete Rule"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Column: Interactive Simulator & Sandbox */}
        <section className="logic-simulator-section">
          <div className="simulator-card">
            <div className="simulator-header">
              <div className="simulator-title-wrap">
                <Terminal size={20} className="text-cyan" />
                <div>
                  <h3>Interactive Logic Simulator</h3>
                  <p>Dispatch mock payloads and verify evaluation breakdown in real time.</p>
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="simulator-presets-box">
              <span className="presets-label">Preset Event Scenarios:</span>
              <div className="preset-buttons-row">
                {PRESET_SIMULATION_PAYLOADS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="btn-preset-pill"
                    onClick={() => handleLoadPreset(p)}
                    title={p.desc}
                  >
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Simulator Target Selector */}
            <div className="simulator-target-row">
              <label htmlFor="sim-rule-target">Target Rule:</label>
              <select
                id="sim-rule-target"
                value={String(simRuleId)}
                onChange={(e) =>
                  setSimRuleId(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                className="sim-target-select"
              >
                <option value="all">Evaluate ALL Active Rules</option>
                {rules.map((r) => (
                  <option key={r.id} value={r.id}>
                    Rule #{r.id}: {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* JSON Payload Editor */}
            <div className="simulator-editor-box">
              <div className="editor-label-bar">
                <span>EVENT PAYLOAD (JSON)</span>
                <span className="font-mono text-muted">format: object</span>
              </div>
              <textarea
                id="sim-payload-textarea"
                rows={7}
                value={simPayloadJson}
                onChange={(e) => setSimPayloadJson(e.target.value)}
                className="font-mono simulator-textarea"
                placeholder='{\n  "priority": "critical",\n  "status": "todo"\n}'
              />
            </div>

            {simError && (
              <div className="auth-alert alert-error">
                <AlertCircle size={16} />
                <span>{simError}</span>
              </div>
            )}

            {/* Run Simulation Action Button */}
            <button
              id="btn-run-simulation"
              type="button"
              className="btn-run-simulation"
              onClick={handleRunSimulation}
              disabled={simLoading}
            >
              {simLoading ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  <span>Evaluating Conditions...</span>
                </>
              ) : (
                <>
                  <Play size={16} />
                  <span>Run Logic Simulation</span>
                </>
              )}
            </button>

            {/* Simulation Results Drawer */}
            {simResults && (
              <div className="sim-results-container">
                <div className="sim-results-header">
                  <h4>Evaluation Report ({simResults.length} rule tested)</h4>
                </div>

                <div className="sim-results-list">
                  {simResults.map((res, i) => (
                    <div
                      key={i}
                      className={`sim-result-card ${res.matched ? 'result-matched' : 'result-skipped'}`}
                    >
                      <div className="result-top-bar">
                        <div className="result-title-group">
                          <span className="rule-idx">#{res.rule_id}</span>
                          <strong className="result-name">{res.rule_name}</strong>
                        </div>
                        <span className={`result-status-pill ${res.matched ? 'pill-matched' : 'pill-skipped'}`}>
                          {res.matched ? (
                            <>
                              <CheckCircle2 size={14} className="text-emerald" />
                              <span>MATCHED & TRIGGERED</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={14} className="text-muted" />
                              <span>SKIPPED</span>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Condition Breakdown */}
                      <div className="result-conditions-breakdown">
                        <div className="breakdown-title">
                          Condition Checks ({res.condition_operator}):
                        </div>
                        {res.condition_evaluations.map((ce, cIdx) => (
                          <div
                            key={cIdx}
                            className={`condition-eval-row ${ce.passed ? 'eval-pass' : 'eval-fail'}`}
                          >
                            <div className="eval-status-icon">
                              {ce.passed ? (
                                <Check size={14} className="text-emerald" />
                              ) : (
                                <XCircle size={14} className="text-rose" />
                              )}
                            </div>
                            <div className="eval-explanation">
                              <span className="eval-field font-mono">{ce.field}</span>
                              <span className="eval-op">{ce.operator}</span>
                              <span className="eval-target font-mono">{JSON.stringify(ce.expected_value)}</span>
                              <span className="eval-reason text-muted">({ce.reason})</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Action Outputs & Transformed Payload */}
                      {res.matched && (
                        <div className="result-output-box">
                          <div className="output-section-title">Executed Action Outputs:</div>
                          <div className="executed-actions-tags">
                            {res.executed_actions.map((ea, aIdx) => (
                              <span key={aIdx} className="action-executed-pill">
                                ⚡ {ea.action_type}: {JSON.stringify(ea.parameters)}
                              </span>
                            ))}
                          </div>

                          <div className="output-section-title" style={{ marginTop: '0.6rem' }}>
                            Simulated Transformed State:
                          </div>
                          <pre className="output-json-preview font-mono">
                            {JSON.stringify(res.simulated_output, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ========================================================= */}
      {/* MODAL: CREATE / EDIT LOGIC RULE                           */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="logic-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <Sliders size={20} className="text-cyan" />
                <h3>{editingRule ? `Edit Rule: ${editingRule.name}` : 'Create Automation Logic Rule'}</h3>
              </div>
              <button
                className="btn-modal-close"
                onClick={() => setIsModalOpen(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="logic-rule-form">
              <div className="form-group">
                <label htmlFor="rule-name-input">Rule Name *</label>
                <input
                  id="rule-name-input"
                  type="text"
                  value={ruleFormData.name}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, name: e.target.value })}
                  placeholder="e.g. Critical Node Auto-Escalation"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="rule-desc-input">Description</label>
                <input
                  id="rule-desc-input"
                  type="text"
                  value={ruleFormData.description}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, description: e.target.value })}
                  placeholder="Explain when this rule triggers and what it automates..."
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="rule-trigger-select">Trigger Event</label>
                  <select
                    id="rule-trigger-select"
                    value={ruleFormData.trigger_event}
                    onChange={(e) =>
                      setRuleFormData({ ...ruleFormData, trigger_event: e.target.value })
                    }
                  >
                    {TRIGGER_EVENTS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label} ({t.value})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="rule-operator-select">Condition Matching Strategy</label>
                  <select
                    id="rule-operator-select"
                    value={ruleFormData.condition_operator}
                    onChange={(e) =>
                      setRuleFormData({
                        ...ruleFormData,
                        condition_operator: e.target.value as 'ALL' | 'ANY',
                      })
                    }
                  >
                    <option value="ALL">Match ALL Conditions (AND)</option>
                    <option value="ANY">Match ANY Condition (OR)</option>
                  </select>
                </div>
              </div>

              {/* Conditions Builder */}
              <div className="builder-section">
                <div className="builder-header">
                  <span className="builder-title">IF CONDITIONS</span>
                  <button
                    type="button"
                    className="btn-builder-add"
                    onClick={handleAddCondition}
                  >
                    <Plus size={14} />
                    <span>Add Condition</span>
                  </button>
                </div>

                <div className="builder-rows-list">
                  {ruleFormData.conditions.map((cond, idx) => (
                    <div key={idx} className="builder-row">
                      <div className="builder-field-wrap">
                        <label>Field</label>
                        <input
                          type="text"
                          value={cond.field}
                          onChange={(e) => handleConditionChange(idx, 'field', e.target.value)}
                          placeholder="e.g. priority, status, latency_ms"
                          required
                        />
                      </div>

                      <div className="builder-operator-wrap">
                        <label>Operator</label>
                        <select
                          value={cond.operator}
                          onChange={(e) =>
                            handleConditionChange(idx, 'operator', e.target.value as ConditionOperator)
                          }
                        >
                          {CONDITION_OPERATORS.map((op) => (
                            <option key={op.value} value={op.value}>
                              {op.label} ({op.symbol})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="builder-value-wrap">
                        <label>Target Value</label>
                        <input
                          type="text"
                          value={cond.value ?? ''}
                          onChange={(e) => handleConditionChange(idx, 'value', e.target.value)}
                          placeholder="e.g. critical, todo, 250"
                        />
                      </div>

                      {ruleFormData.conditions.length > 1 && (
                        <button
                          type="button"
                          className="btn-builder-remove"
                          onClick={() => handleRemoveCondition(idx)}
                          title="Remove condition"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions Builder */}
              <div className="builder-section">
                <div className="builder-header">
                  <span className="builder-title">THEN ACTIONS</span>
                  <button
                    type="button"
                    className="btn-builder-add"
                    onClick={handleAddAction}
                  >
                    <Plus size={14} />
                    <span>Add Action</span>
                  </button>
                </div>

                <div className="builder-rows-list">
                  {ruleFormData.actions.map((act, idx) => (
                    <div key={idx} className="builder-action-row">
                      <div className="action-type-select-wrap">
                        <label>Action Type</label>
                        <select
                          value={act.action_type}
                          onChange={(e) =>
                            handleActionTypeChange(idx, e.target.value as ActionType)
                          }
                        >
                          {ACTION_TYPES.map((at) => (
                            <option key={at.value} value={at.value}>
                              {at.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Parameters Configuration Input */}
                      <div className="action-params-input-wrap">
                        <label>Action Parameter</label>
                        {act.action_type === 'set_status' && (
                          <select
                            value={act.parameters.status || 'in_progress'}
                            onChange={(e) => handleActionParamChange(idx, 'status', e.target.value)}
                          >
                            <option value="todo">todo</option>
                            <option value="in_progress">in_progress</option>
                            <option value="done">done</option>
                          </select>
                        )}

                        {act.action_type === 'set_priority' && (
                          <select
                            value={act.parameters.priority || 'high'}
                            onChange={(e) => handleActionParamChange(idx, 'priority', e.target.value)}
                          >
                            <option value="low">low</option>
                            <option value="medium">medium</option>
                            <option value="high">high</option>
                            <option value="critical">critical</option>
                          </select>
                        )}

                        {act.action_type === 'send_notification' && (
                          <input
                            type="text"
                            value={act.parameters.message || ''}
                            onChange={(e) => handleActionParamChange(idx, 'message', e.target.value)}
                            placeholder="Notification text message"
                          />
                        )}

                        {act.action_type === 'add_tag' && (
                          <input
                            type="text"
                            value={act.parameters.tag || ''}
                            onChange={(e) => handleActionParamChange(idx, 'tag', e.target.value)}
                            placeholder="Tag name (e.g. escalated, review)"
                          />
                        )}

                        {act.action_type === 'log_audit' && (
                          <input
                            type="text"
                            value={act.parameters.message || ''}
                            onChange={(e) => handleActionParamChange(idx, 'message', e.target.value)}
                            placeholder="Audit entry message"
                          />
                        )}

                        {act.action_type === 'trigger_webhook' && (
                          <input
                            type="url"
                            value={act.parameters.url || ''}
                            onChange={(e) => handleActionParamChange(idx, 'url', e.target.value)}
                            placeholder="https://hooks.slack.com/services/..."
                          />
                        )}
                      </div>

                      {ruleFormData.actions.length > 1 && (
                        <button
                          type="button"
                          className="btn-builder-remove"
                          onClick={() => handleRemoveAction(idx)}
                          title="Remove action"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Toggle & Modal Buttons */}
              <div className="modal-footer-row">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={ruleFormData.is_active}
                    onChange={(e) =>
                      setRuleFormData({ ...ruleFormData, is_active: e.target.checked })
                    }
                  />
                  <span className="checkbox-label">Rule Active upon creation</span>
                </label>

                <div className="modal-action-buttons">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    <Check size={16} />
                    <span>{editingRule ? 'Save Changes' : 'Create Rule'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
