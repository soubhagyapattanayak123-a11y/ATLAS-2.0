import React, { useState, useMemo } from 'react';
import {
  Target,
  Sliders,
  Play,
  Download,
  Copy,
  RefreshCw,
  BarChart2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Info,
  Check,
  Brain,
  Camera,
  Layers,
  Swords,
} from 'lucide-react';

export type ModelId = 'solver' | 'vision' | 'classifier' | 'quiz';

export interface InferenceSample {
  id: string;
  query: string;
  actual: string;
  predicted: string;
  confidence: number;
  outcome: 'TP' | 'FP' | 'TN' | 'FN' | 'Correct' | 'Misclassified';
  timestamp: string;
}

export const ConfusionMatrixView: React.FC = () => {
  // Model & View Configuration
  const [selectedModel, setSelectedModel] = useState<ModelId>('solver');
  const [viewMode, setViewMode] = useState<'binary' | 'multiclass'>('binary');
  const [threshold, setThreshold] = useState<number>(0.5);
  const [sampleSize, setSampleSize] = useState<number>(1000);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Live Test Simulator Input
  const [simInput, setSimInput] = useState<string>('');
  const [simResult, setSimResult] = useState<{
    query: string;
    predictedClass: string;
    confidence: number;
    thresholdPassed: boolean;
    category: string;
  } | null>(null);

  // Model Presets Configuration
  const modelProfiles = {
    solver: {
      name: 'Atlas Academic Problem Solver (DeepSeek-V3 Engine)',
      icon: <Brain size={18} color="#6366f1" />,
      domain: 'Step-by-step Mathematical & Academic Problem Verification',
      basePositiveRate: 0.72,
      qualityScore: 0.94,
    },
    vision: {
      name: 'Multimodal Vision OCR & Handwritten Math Extractor',
      icon: <Camera size={18} color="#06b6d4" />,
      domain: 'Document OCR Text, Formula & Diagram Recognition',
      basePositiveRate: 0.68,
      qualityScore: 0.91,
    },
    classifier: {
      name: 'Multi-Class Subject Classifier (Domain Taxonomy)',
      icon: <Layers size={18} color="#a855f7" />,
      domain: 'Academic Subject Routing (Math, Science, Geography, Logic)',
      basePositiveRate: 0.75,
      qualityScore: 0.95,
    },
    quiz: {
      name: 'Battle of Brains Quiz Speed Evaluator',
      icon: <Swords size={18} color="#f43f5e" />,
      domain: 'Live Student Speed Duel Answer Verification',
      basePositiveRate: 0.65,
      qualityScore: 0.93,
    },
  };

  // Dynamically calculate binary confusion matrix based on threshold and model profile
  const binaryStats = useMemo(() => {
    const profile = modelProfiles[selectedModel];
    const total = sampleSize;
    const actualPositives = Math.round(total * profile.basePositiveRate);
    const actualNegatives = total - actualPositives;

    // True Positive Rate decreases as threshold increases
    // False Positive Rate decreases more rapidly as threshold increases
    const sensitivityFactor = Math.max(0.4, Math.min(0.99, profile.qualityScore - (threshold - 0.5) * 0.45));
    const specificityFactor = Math.max(0.5, Math.min(0.995, profile.qualityScore + (threshold - 0.5) * 0.5));

    const tp = Math.round(actualPositives * sensitivityFactor);
    const fn = actualPositives - tp;

    const tn = Math.round(actualNegatives * specificityFactor);
    const fp = actualNegatives - tn;

    const accuracy = (tp + tn) / total;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const specificity = tn + fp > 0 ? tn / (tn + fp) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    const fpr = fp + tn > 0 ? fp / (fp + tn) : 0;
    const fnr = fn + tp > 0 ? fn / (fn + tp) : 0;

    return {
      total,
      actualPositives,
      actualNegatives,
      tp,
      fp,
      fn,
      tn,
      accuracy,
      precision,
      recall,
      specificity,
      f1,
      fpr,
      fnr,
    };
  }, [selectedModel, threshold, sampleSize]);

  // Multi-class 4x4 matrix data
  const multiClassData = useMemo(() => {
    const classes = ['Math', 'Science', 'Geography', 'Logic'];
    const baseCount = Math.floor(sampleSize / 4);

    // Distribution matrices
    const matrix = [
      [Math.round(baseCount * 0.95), Math.round(baseCount * 0.025), Math.round(baseCount * 0.015), Math.round(baseCount * 0.01)],
      [Math.round(baseCount * 0.02), Math.round(baseCount * 0.94), Math.round(baseCount * 0.02), Math.round(baseCount * 0.02)],
      [Math.round(baseCount * 0.01), Math.round(baseCount * 0.03), Math.round(baseCount * 0.93), Math.round(baseCount * 0.03)],
      [Math.round(baseCount * 0.015), Math.round(baseCount * 0.015), Math.round(baseCount * 0.02), Math.round(baseCount * 0.95)],
    ];

    const perClassStats = classes.map((cls, idx) => {
      const rowSum = matrix[idx].reduce((a, b) => a + b, 0);
      const colSum = matrix.reduce((sum, r) => sum + r[idx], 0);
      const correct = matrix[idx][idx];
      const prec = colSum > 0 ? correct / colSum : 0;
      const rec = rowSum > 0 ? correct / rowSum : 0;
      const f1Val = prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0;

      return {
        className: cls,
        total: rowSum,
        precision: prec,
        recall: rec,
        f1: f1Val,
      };
    });

    const totalCorrect = matrix.reduce((acc, row, i) => acc + row[i], 0);
    const overallAccuracy = totalCorrect / sampleSize;

    return {
      classes,
      matrix,
      perClassStats,
      overallAccuracy,
    };
  }, [sampleSize]);

  // Sample recent inferences log
  const recentSamples: InferenceSample[] = useMemo(() => {
    return [
      {
        id: 'INF-9182',
        query: 'Calculate derivative of e^(2x) · cos(x)',
        actual: 'Pass (Valid Math)',
        predicted: 'Pass (Valid Math)',
        confidence: 0.97,
        outcome: 'TP',
        timestamp: 'Just now',
      },
      {
        id: 'INF-9181',
        query: 'What is the role of ribosomes in eukaryotic translation?',
        actual: 'Pass (Valid Science)',
        predicted: 'Pass (Valid Science)',
        confidence: 0.94,
        outcome: 'TP',
        timestamp: '1m ago',
      },
      {
        id: 'INF-9180',
        query: 'Random unstructured noise 999xyz#@!',
        actual: 'Fail (Malformed Query)',
        predicted: 'Fail (Flagged)',
        confidence: 0.88,
        outcome: 'TN',
        timestamp: '3m ago',
      },
      {
        id: 'INF-9179',
        query: 'Explain difference between mitosis and meiosis in plants',
        actual: 'Pass (Valid Science)',
        predicted: threshold > 0.85 ? 'Fail (Flagged)' : 'Pass (Valid Science)',
        confidence: 0.83,
        outcome: threshold > 0.85 ? 'FN' : 'TP',
        timestamp: '5m ago',
      },
      {
        id: 'INF-9178',
        query: 'Non-academic chat conversational greeting',
        actual: 'Fail (Off-Topic)',
        predicted: threshold < 0.25 ? 'Pass (Valid)' : 'Fail (Flagged)',
        confidence: 0.28,
        outcome: threshold < 0.25 ? 'FP' : 'TN',
        timestamp: '8m ago',
      },
    ];
  }, [threshold]);

  // Simulate inference batch
  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
    }, 700);
  };

  // Test custom query simulator
  const handleTestSimulator = () => {
    if (!simInput.trim()) return;
    const lower = simInput.toLowerCase();
    let detectedCat = 'Math';
    let conf = 0.92;

    if (lower.includes('cell') || lower.includes('photosynthesis') || lower.includes('atom') || lower.includes('organism')) {
      detectedCat = 'Science';
      conf = 0.94;
    } else if (lower.includes('river') || lower.includes('island') || lower.includes('capital') || lower.includes('mountain')) {
      detectedCat = 'Geography';
      conf = 0.91;
    } else if (lower.includes('logic') || lower.includes('boolean') || lower.includes('binary') || lower.includes('true')) {
      detectedCat = 'Logic';
      conf = 0.95;
    }

    setSimResult({
      query: simInput,
      predictedClass: detectedCat,
      confidence: conf,
      thresholdPassed: conf >= threshold,
      category: detectedCat,
    });
  };

  // Export JSON
  const handleExportJSON = () => {
    const exportData = {
      model: modelProfiles[selectedModel].name,
      threshold,
      sampleSize,
      binaryConfusionMatrix: {
        truePositive: binaryStats.tp,
        falsePositive: binaryStats.fp,
        falseNegative: binaryStats.fn,
        trueNegative: binaryStats.tn,
        metrics: {
          accuracy: Number(binaryStats.accuracy.toFixed(4)),
          precision: Number(binaryStats.precision.toFixed(4)),
          recall: Number(binaryStats.recall.toFixed(4)),
          specificity: Number(binaryStats.specificity.toFixed(4)),
          f1_score: Number(binaryStats.f1.toFixed(4)),
        },
      },
      multiClassMatrix: multiClassData,
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atlas_confusion_matrix_${selectedModel}_t${threshold.toFixed(2)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy Markdown Summary for ML Reporting
  const handleCopySummary = () => {
    const p = modelProfiles[selectedModel];
    const s = binaryStats;
    const text = `### Model Evaluation & Confusion Matrix Report
**Model**: ${p.name}
**Domain**: ${p.domain}
**Threshold (τ)**: ${threshold.toFixed(2)} | **Sample Size (N)**: ${s.total}

| Actual \\ Predicted | Predicted Positive (1) | Predicted Negative (0) |
|---|---|---|
| **Actual Positive (1)** | **TP: ${s.tp}** (${((s.tp / s.total) * 100).toFixed(1)}%) | **FN: ${s.fn}** (${((s.fn / s.total) * 100).toFixed(1)}%) |
| **Actual Negative (0)** | **FP: ${s.fp}** (${((s.fp / s.total) * 100).toFixed(1)}%) | **TN: ${s.tn}** (${((s.tn / s.total) * 100).toFixed(1)}%) |

**Core Performance Metrics**:
- Accuracy: ${(s.accuracy * 100).toFixed(2)}%
- Precision: ${(s.precision * 100).toFixed(2)}%
- Recall (Sensitivity): ${(s.recall * 100).toFixed(2)}%
- Specificity: ${(s.specificity * 100).toFixed(2)}%
- F1-Score: ${(s.f1 * 100).toFixed(2)}%
- False Positive Rate (FPR): ${(s.fpr * 100).toFixed(2)}%
- False Negative Rate (FNR): ${(s.fnr * 100).toFixed(2)}%
`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <div className="cm-dashboard-container">
      {/* Top Banner & Model Switcher */}
      <div className="cm-control-header">
        <div className="cm-title-group">
          <div className="cm-badge-row">
            <span className="cm-pill-badge">
              <Target size={13} />
              AI CLASSIFICATION & EVALUATION
            </span>
            <span className="cm-pill-tag">Confusion Matrix 2.0</span>
          </div>
          <h2 className="cm-main-title">Model Confusion Matrix & Performance Metrics</h2>
          <p className="cm-subtitle">
            Comprehensive diagnostic matrix comparing Ground Truth vs Model Predictions with real-time threshold tuning.
          </p>
        </div>

        {/* Global Actions */}
        <div className="cm-header-actions">
          <button
            type="button"
            className="cm-action-btn secondary"
            onClick={handleRunSimulation}
            disabled={isSimulating}
            title="Simulate inference batch"
          >
            <RefreshCw size={14} className={isSimulating ? 'spin' : ''} />
            <span>{isSimulating ? 'Evaluating...' : 'Re-run Inference'}</span>
          </button>
          <button
            type="button"
            className="cm-action-btn secondary"
            onClick={handleCopySummary}
            title="Copy markdown performance summary"
          >
            {copiedSummary ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            <span>{copiedSummary ? 'Copied Report!' : 'Copy Summary'}</span>
          </button>
          <button
            type="button"
            className="cm-action-btn primary"
            onClick={handleExportJSON}
            title="Export raw confusion matrix JSON"
          >
            <Download size={14} />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Control Selector Row: Model, Dataset, View Mode */}
      <div className="cm-selectors-bar">
        {/* Model Dropdown */}
        <div className="cm-select-field">
          <label className="cm-field-label">Evaluated Model</label>
          <div className="cm-select-wrapper">
            {modelProfiles[selectedModel].icon}
            <select
              className="cm-styled-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as ModelId)}
            >
              <option value="solver">Atlas Academic Problem Solver (DeepSeek-V3)</option>
              <option value="vision">Multimodal Vision OCR & Formula Extractor</option>
              <option value="classifier">Multi-Class Subject Classifier (Domain Taxonomy)</option>
              <option value="quiz">Battle of Brains Quiz Speed Evaluator</option>
            </select>
          </div>
        </div>

        {/* Dataset Size Toggle */}
        <div className="cm-select-field">
          <label className="cm-field-label">Test Evaluation Batch</label>
          <div className="cm-pill-toggle-group">
            {[500, 1000, 2500, 5000].map((size) => (
              <button
                key={size}
                type="button"
                className={`cm-pill-toggle ${sampleSize === size ? 'active' : ''}`}
                onClick={() => setSampleSize(size)}
              >
                {size >= 1000 ? `${size / 1000}k` : size}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode Toggle: Binary vs Multi-Class */}
        <div className="cm-select-field">
          <label className="cm-field-label">Matrix Format</label>
          <div className="cm-pill-toggle-group">
            <button
              type="button"
              className={`cm-pill-toggle ${viewMode === 'binary' ? 'active' : ''}`}
              onClick={() => setViewMode('binary')}
            >
              Binary (2x2)
            </button>
            <button
              type="button"
              className={`cm-pill-toggle ${viewMode === 'multiclass' ? 'active' : ''}`}
              onClick={() => setViewMode('multiclass')}
            >
              Multi-Class (4x4)
            </button>
          </div>
        </div>
      </div>

      {/* Threshold Slider Bar (for Binary Mode) */}
      {viewMode === 'binary' && (
        <div className="cm-threshold-card">
          <div className="cm-threshold-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sliders size={18} color="#6366f1" />
              <span className="cm-threshold-title">Decision Confidence Threshold (τ)</span>
            </div>
            <div className="cm-threshold-value-badge">
              τ = {threshold.toFixed(2)} ({Math.round(threshold * 100)}% Confidence)
            </div>
          </div>
          <p className="cm-threshold-desc">
            Adjust the classification boundary: lower thresholds maximize Sensitivity/Recall (fewer False Negatives), while higher thresholds maximize Precision (fewer False Positives).
          </p>
          <div className="cm-slider-row">
            <span className="cm-slider-min">0.05 (High Recall)</span>
            <input
              type="range"
              min="0.05"
              max="0.95"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="cm-range-slider"
            />
            <span className="cm-slider-max">0.95 (High Precision)</span>
          </div>
        </div>
      )}

      {/* KPI Key Metric Cards Grid */}
      <div className="cm-kpi-grid">
        <div className="cm-kpi-metric-card primary">
          <div className="cm-kpi-top">
            <span className="cm-kpi-label">Overall Accuracy</span>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div className="cm-kpi-number">
            {(
              (viewMode === 'binary' ? binaryStats.accuracy : multiClassData.overallAccuracy) * 100
            ).toFixed(1)}
            %
          </div>
          <span className="cm-kpi-formula">(TP + TN) / Total Instances</span>
        </div>

        <div className="cm-kpi-metric-card cyan">
          <div className="cm-kpi-top">
            <span className="cm-kpi-label">Precision (PPV)</span>
            <Target size={18} color="#06b6d4" />
          </div>
          <div className="cm-kpi-number">
            {(
              (viewMode === 'binary' ? binaryStats.precision : multiClassData.perClassStats[0].precision) * 100
            ).toFixed(1)}
            %
          </div>
          <span className="cm-kpi-formula">TP / (TP + FP)</span>
        </div>

        <div className="cm-kpi-metric-card emerald">
          <div className="cm-kpi-top">
            <span className="cm-kpi-label">Recall / Sensitivity</span>
            <BarChart2 size={18} color="#10b981" />
          </div>
          <div className="cm-kpi-number">
            {(
              (viewMode === 'binary' ? binaryStats.recall : multiClassData.perClassStats[0].recall) * 100
            ).toFixed(1)}
            %
          </div>
          <span className="cm-kpi-formula">TP / (TP + FN)</span>
        </div>

        <div className="cm-kpi-metric-card purple">
          <div className="cm-kpi-top">
            <span className="cm-kpi-label">F1-Score (Harmonic Mean)</span>
            <Sparkles size={18} color="#a855f7" />
          </div>
          <div className="cm-kpi-number">
            {((viewMode === 'binary' ? binaryStats.f1 : multiClassData.perClassStats[0].f1) * 100).toFixed(1)}%
          </div>
          <span className="cm-kpi-formula">2 · (P · R) / (P + R)</span>
        </div>

        <div className="cm-kpi-metric-card amber">
          <div className="cm-kpi-top">
            <span className="cm-kpi-label">Specificity (TNR)</span>
            <Info size={18} color="#f59e0b" />
          </div>
          <div className="cm-kpi-number">{(binaryStats.specificity * 100).toFixed(1)}%</div>
          <span className="cm-kpi-formula">TN / (TN + FP)</span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* VIEW: BINARY CONFUSION MATRIX (2x2 HEATMAP)                    */}
      {/* ============================================================== */}
      {viewMode === 'binary' && (
        <div className="cm-matrix-card">
          <div className="cm-card-header">
            <div>
              <h3 className="cm-card-title">Binary 2×2 Heatmap Matrix</h3>
              <p className="cm-card-desc">
                Cross-tabulation of Actual Ground Truth vs. Predicted Classification at τ = {threshold.toFixed(2)}
              </p>
            </div>
            <div className="cm-total-badge">N = {sampleSize} Samples</div>
          </div>

          <div className="cm-heatmap-layout">
            {/* Corner guide */}
            <div className="cm-axis-header top">
              <span className="cm-axis-title">PREDICTED CLASS →</span>
              <div className="cm-col-headers">
                <span className="cm-col-header">Predicted Positive (1)</span>
                <span className="cm-col-header">Predicted Negative (0)</span>
              </div>
            </div>

            <div className="cm-matrix-body-row">
              {/* Row Header 1: Actual Positive */}
              <div className="cm-matrix-row">
                <div className="cm-row-label">
                  <span className="cm-row-name">Actual Positive (1)</span>
                  <span className="cm-row-sub">Total: {binaryStats.actualPositives}</span>
                </div>

                {/* Top-Left: True Positive (TP) */}
                <div className="cm-quadrant tp">
                  <div className="cm-quadrant-badge">
                    <CheckCircle2 size={14} color="#059669" />
                    <span>True Positive (TP)</span>
                  </div>
                  <div className="cm-quadrant-count">{binaryStats.tp}</div>
                  <div className="cm-quadrant-pct">
                    {((binaryStats.tp / binaryStats.total) * 100).toFixed(1)}% of total •{' '}
                    {((binaryStats.tp / binaryStats.actualPositives) * 100).toFixed(1)}% class recall
                  </div>
                  <p className="cm-quadrant-desc">Correctly classified valid questions</p>
                </div>

                {/* Top-Right: False Negative (FN) - Type II Error */}
                <div className="cm-quadrant fn">
                  <div className="cm-quadrant-badge">
                    <XCircle size={14} color="#e11d48" />
                    <span>False Negative (FN)</span>
                  </div>
                  <div className="cm-quadrant-count">{binaryStats.fn}</div>
                  <div className="cm-quadrant-pct">
                    {((binaryStats.fn / binaryStats.total) * 100).toFixed(1)}% of total •{' '}
                    {((binaryStats.fn / binaryStats.actualPositives) * 100).toFixed(1)}% miss rate
                  </div>
                  <p className="cm-quadrant-desc">Type II Error: Actual positive missed as negative</p>
                </div>
              </div>

              {/* Row Header 2: Actual Negative */}
              <div className="cm-matrix-row">
                <div className="cm-row-label">
                  <span className="cm-row-name">Actual Negative (0)</span>
                  <span className="cm-row-sub">Total: {binaryStats.actualNegatives}</span>
                </div>

                {/* Bottom-Left: False Positive (FP) - Type I Error */}
                <div className="cm-quadrant fp">
                  <div className="cm-quadrant-badge">
                    <AlertTriangle size={14} color="#d97706" />
                    <span>False Positive (FP)</span>
                  </div>
                  <div className="cm-quadrant-count">{binaryStats.fp}</div>
                  <div className="cm-quadrant-pct">
                    {((binaryStats.fp / binaryStats.total) * 100).toFixed(1)}% of total •{' '}
                    {((binaryStats.fp / binaryStats.actualNegatives) * 100).toFixed(1)}% false alarm
                  </div>
                  <p className="cm-quadrant-desc">Type I Error: Actual negative falsely flagged</p>
                </div>

                {/* Bottom-Right: True Negative (TN) */}
                <div className="cm-quadrant tn">
                  <div className="cm-quadrant-badge">
                    <CheckCircle2 size={14} color="#4338ca" />
                    <span>True Negative (TN)</span>
                  </div>
                  <div className="cm-quadrant-count">{binaryStats.tn}</div>
                  <div className="cm-quadrant-pct">
                    {((binaryStats.tn / binaryStats.total) * 100).toFixed(1)}% of total •{' '}
                    {((binaryStats.tn / binaryStats.actualNegatives) * 100).toFixed(1)}% specificity
                  </div>
                  <p className="cm-quadrant-desc">Correctly rejected invalid/off-topic inputs</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW: MULTI-CLASS CONFUSION MATRIX (4x4)                       */}
      {/* ============================================================== */}
      {viewMode === 'multiclass' && (
        <div className="cm-matrix-card">
          <div className="cm-card-header">
            <div>
              <h3 className="cm-card-title">Multi-Class Confusion Matrix (Subject Taxonomy)</h3>
              <p className="cm-card-desc">
                Cross-classification distribution across 4 academic domains (diagonal values are correct predictions)
              </p>
            </div>
            <div className="cm-total-badge">
              Accuracy: {(multiClassData.overallAccuracy * 100).toFixed(1)}%
            </div>
          </div>

          <div className="table-responsive">
            <table className="cm-table-multiclass">
              <thead>
                <tr>
                  <th style={{ width: '180px' }}>Actual \\ Predicted</th>
                  {multiClassData.classes.map((cls) => (
                    <th key={cls} style={{ textAlign: 'center' }}>
                      Predicted {cls}
                    </th>
                  ))}
                  <th style={{ textAlign: 'center' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>Recall</th>
                </tr>
              </thead>
              <tbody>
                {multiClassData.classes.map((rowCls, rIdx) => {
                  const stat = multiClassData.perClassStats[rIdx];
                  return (
                    <tr key={rowCls}>
                      <td className="cm-row-title">
                        <strong>Actual {rowCls}</strong>
                      </td>
                      {multiClassData.classes.map((colCls, cIdx) => {
                        const val = multiClassData.matrix[rIdx][cIdx];
                        const isDiag = rIdx === cIdx;
                        return (
                          <td
                            key={colCls}
                            className={`cm-cell ${isDiag ? 'diag' : val > 0 ? 'off-diag' : 'zero'}`}
                          >
                            <span className="cm-cell-val">{val}</span>
                            <span className="cm-cell-sub">
                              {((val / stat.total) * 100).toFixed(1)}%
                            </span>
                          </td>
                        );
                      })}
                      <td className="cm-cell-total">{stat.total}</td>
                      <td className="cm-cell-metric">{(stat.recall * 100).toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="cm-row-title">
                    <strong>Precision</strong>
                  </td>
                  {multiClassData.perClassStats.map((st) => (
                    <td key={st.className} className="cm-cell-metric">
                      {(st.precision * 100).toFixed(1)}%
                    </td>
                  ))}
                  <td colSpan={2} className="cm-cell-metric overall">
                    F1: {(multiClassData.perClassStats[0].f1 * 100).toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Inference Simulator */}
      <div className="cm-sim-card">
        <div className="cm-sim-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Play size={18} color="#06b6d4" />
            <h3 className="cm-sim-title">Live Inference Classification Tester</h3>
          </div>
          <span className="cm-pill-tag">Interactive Diagnostic Sandbox</span>
        </div>
        <p className="cm-sim-desc">
          Enter an academic query to test model confidence against the active threshold (τ = {threshold.toFixed(2)}) and determine its quadrant placement.
        </p>

        <div className="cm-sim-input-row">
          <input
            type="text"
            className="cm-sim-input"
            placeholder="Type sample query (e.g. 'Solve quadratic equation 2x^2 + 4x - 6 = 0', 'Explain ATP synthesis')..."
            value={simInput}
            onChange={(e) => setSimInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTestSimulator();
            }}
          />
          <button type="button" className="cm-action-btn primary" onClick={handleTestSimulator}>
            <Sparkles size={14} />
            <span>Classify Query</span>
          </button>
        </div>

        {simResult && (
          <div className="cm-sim-result-box">
            <div className="cm-sim-res-top">
              <span className="cm-res-label">Inference Result:</span>
              <span
                className={`cm-res-status ${
                  simResult.thresholdPassed ? 'passed' : 'flagged'
                }`}
              >
                {simResult.thresholdPassed
                  ? `✓ Accepted (${simResult.category})`
                  : `✗ Flagged Below Threshold (${simResult.category})`}
              </span>
            </div>
            <div className="cm-sim-res-grid">
              <div>
                <span className="cm-meta-label">Predicted Domain</span>
                <span className="cm-meta-val">{simResult.predictedClass}</span>
              </div>
              <div>
                <span className="cm-meta-label">Model Confidence</span>
                <span className="cm-meta-val">
                  {(simResult.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="cm-meta-label">Decision Boundary</span>
                <span className="cm-meta-val">
                  {simResult.confidence >= threshold ? '≥ Threshold (Pass)' : '< Threshold (Flag)'}
                </span>
              </div>
              <div>
                <span className="cm-meta-label">Assigned Cell</span>
                <span className="cm-meta-val" style={{ color: '#059669', fontWeight: 800 }}>
                  {simResult.thresholdPassed ? 'True Positive (TP)' : 'True Negative / Filtered (TN)'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Inferences Table */}
      <div className="cm-matrix-card">
        <div className="cm-card-header">
          <div>
            <h3 className="cm-card-title">Recent Inference Validation Samples</h3>
            <p className="cm-card-desc">Ground Truth vs Live Classification for Latest Queries</p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="cm-inferences-table">
            <thead>
              <tr>
                <th>Sample ID</th>
                <th>Query / Input Payload</th>
                <th>Ground Truth (Actual)</th>
                <th>Model Prediction</th>
                <th>Confidence</th>
                <th>Quadrant Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {recentSamples.map((sample) => (
                <tr key={sample.id}>
                  <td className="cm-mono">{sample.id}</td>
                  <td className="cm-query-cell">{sample.query}</td>
                  <td>{sample.actual}</td>
                  <td>{sample.predicted}</td>
                  <td>
                    <div className="cm-conf-bar-wrap">
                      <div
                        className="cm-conf-bar"
                        style={{ width: `${sample.confidence * 100}%` }}
                      />
                      <span>{(sample.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`cm-outcome-badge ${sample.outcome.toLowerCase()}`}>
                      {sample.outcome}
                    </span>
                  </td>
                  <td className="cm-time">{sample.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
