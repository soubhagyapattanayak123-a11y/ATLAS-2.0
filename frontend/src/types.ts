export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Status = 'todo' | 'in_progress' | 'done';

export interface AtlasItem {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: Status;
  created_at: string;
  updated_at: string;
}

export interface ItemCreateInput {
  title: string;
  description?: string;
  category?: string;
  priority?: Priority;
  status?: Status;
}

export interface ItemUpdateInput {
  title?: string;
  description?: string;
  category?: string;
  priority?: Priority;
  status?: Status;
}

export interface ItemStats {
  total: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  by_category: Record<string, number>;
}

export interface HealthResponse {
  status: string;
  database: string;
  version: string;
  items_count: number;
  timestamp: string;
}

export interface FilterOptions {
  status?: string;
  category?: string;
  priority?: string;
  search?: string;
}

// ==========================================
// User & Auth Types
// ==========================================

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  dob?: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  username_or_email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  full_name?: string;
  dob?: string;
  otp_code?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  token_type: string;
  message: string;
}

export interface DemoAccountInfo {
  username: string;
  role: string;
  full_name: string;
  email: string;
  password_hint: string;
  description: string;
}

export interface UserProfileUpdate {
  full_name?: string;
  email?: string;
}

export interface UserPasswordChange {
  current_password: string;
  new_password: string;
}

export interface SendOTPRequest {
  email: string;
  purpose?: string;
}

export interface SendOTPResponse {
  status: string;
  message: string;
  email: string;
  expires_in_seconds: number;
  cooldown_seconds: number;
  delivered_via: string;
  dev_otp?: string | null;
}

export interface VerifyOTPRequest {
  email: string;
  otp_code: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp_code: string;
  new_password: string;
}

// ==========================================
// Admin Control Panel Types
// ==========================================

export interface AdminUser extends User {
  active_sessions: number;
}

export interface AdminStats {
  total_users: number;
  admins_count: number;
  regular_users: number;
  developers_count: number;
  active_sessions: number;
  total_nodes: number;
}

// ==========================================
// Logic & Rules Engine Types
// ==========================================

export type ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'is_empty';
export type ActionType = 'set_status' | 'set_priority' | 'send_notification' | 'trigger_webhook' | 'add_tag' | 'log_audit';

export interface RuleCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
}

export interface RuleAction {
  action_type: ActionType;
  parameters: Record<string, any>;
}

export interface LogicRule {
  id: number;
  name: string;
  description: string;
  trigger_event: string;
  condition_operator: 'ALL' | 'ANY';
  conditions: RuleCondition[];
  actions: RuleAction[];
  is_active: boolean;
  execution_count: number;
  last_executed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LogicRuleCreateInput {
  name: string;
  description?: string;
  trigger_event: string;
  condition_operator: 'ALL' | 'ANY';
  conditions: RuleCondition[];
  actions: RuleAction[];
  is_active?: boolean;
}

export interface LogicRuleUpdateInput {
  name?: string;
  description?: string;
  trigger_event?: string;
  condition_operator?: 'ALL' | 'ANY';
  conditions?: RuleCondition[];
  actions?: RuleAction[];
  is_active?: boolean;
}

export interface LogicRuleConditionEvaluation {
  field: string;
  operator: string;
  expected_value: any;
  actual_value: any;
  passed: boolean;
  reason: string;
}

export interface LogicRuleTestResult {
  rule_id: number;
  rule_name: string;
  matched: boolean;
  condition_operator: string;
  condition_evaluations: LogicRuleConditionEvaluation[];
  executed_actions: RuleAction[];
  simulated_output: Record<string, any>;
}
export interface FlashcardItem {
  id?: string | number;
  q: string;
  a: string;
  category: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export interface TopicQuizQuestion {
  id: string;
  category: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export type ActivityType = 'math' | 'qa' | 'image_scan' | 'pdf_scan' | 'flashcard' | 'voice' | 'quiz' | 'geography';

export interface LearningActivity {
  id: number | string;
  user_id?: number | null;
  activity_type: ActivityType;
  title: string;
  details?: string;
  solution?: string;
  score?: string;
  language?: string;
  created_at: string;
}

export interface LearningActivityInput {
  activity_type: ActivityType;
  title: string;
  details?: string;
  solution?: string;
  score?: string;
  language?: string;
}

export interface DailyVoiceTopic {
  id: string;
  dayIndex: number; // 0=Mon ... 6=Sun
  category: 'Science' | 'Space' | 'History' | 'Nature' | 'Inventions' | 'Curious GK' | 'AI Generated';
  icon: string;
  title: string;
  text: string;
  summary: string;
  duration: string;
  tag?: string;
}

// ==========================================
// Firewall & Security Center Types
// ==========================================

export interface FirewallStoredIPRule {
  id: number;
  ip: string;
  rule_type: 'block' | 'whitelist';
  reason: string;
  created_at: string;
  expires_at: string | null;
}

export interface FirewallStatus {
  status: string;
  shield_version: string;
  uptime_seconds: number;
  total_inspected_requests: number;
  clean_requests: number;
  blocked_threats_count: number;
  rate_limited_count: number;
  active_banned_ips_count: number;
  whitelisted_ips_count: number;
  threat_categories: Record<string, number>;
  rules_enabled: Record<string, boolean>;
  banned_ips: string[];
  whitelisted_ips: string[];
  stored_ip_rules?: FirewallStoredIPRule[];
}

export interface FirewallThreatLog {
  id?: number;
  ip: string;
  path: string;
  method: string;
  threat_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  rule_name: string;
  payload_sample: string;
  user_agent: string;
  action_taken: string;
  created_at: string;
}

export interface FirewallTestProbeResult {
  intercepted: boolean;
  firewall_action: string;
  threat_category?: string;
  severity?: string;
  rule_name?: string;
  matched_pattern?: string;
  payload_tested: string;
  message: string;
}


