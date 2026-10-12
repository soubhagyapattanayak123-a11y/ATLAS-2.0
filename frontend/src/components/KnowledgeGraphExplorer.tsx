import React, { useState, useMemo } from 'react';
import {
  Search,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  BookOpen,
  ArrowRight,
  HelpCircle,
  Plus,
  Compass,
} from 'lucide-react';

export interface ConceptNode {
  id: string;
  label: string;
  category: 'Math' | 'Physics' | 'Chemistry' | 'Biology' | 'Tech' | 'Geography';
  x: number;
  y: number;
  radius: number;
  color: string;
  summary: string;
  prerequisites: string[];
  applications: string[];
  equationOrFormula?: string;
}

export interface ConceptEdge {
  from: string;
  to: string;
  label: string;
}

const INITIAL_NODES: ConceptNode[] = [
  // Mathematics
  {
    id: 'algebra',
    label: 'Algebra',
    category: 'Math',
    x: 220,
    y: 180,
    radius: 36,
    color: '#818cf8',
    summary: 'The universal language of unknown quantities and symbolic equation balance.',
    prerequisites: ['Arithmetic', 'Fractions'],
    applications: ['Coding algorithms', 'Financial modeling', 'Physics motion equations'],
    equationOrFormula: 'ax + b = c',
  },
  {
    id: 'calculus',
    label: 'Calculus',
    category: 'Math',
    x: 400,
    y: 130,
    radius: 42,
    color: '#6366f1',
    summary: 'The mathematics of continuous change, instantaneous rates, and smooth curves.',
    prerequisites: ['Algebra', 'Trigonometry', 'Functions'],
    applications: ['Orbital mechanics', 'Neural network gradient descent', 'Fluid dynamics'],
    equationOrFormula: 'f\'(x) = lim[h→0] (f(x+h) - f(x)) / h',
  },
  {
    id: 'linear_algebra',
    label: 'Linear Algebra',
    category: 'Math',
    x: 580,
    y: 160,
    radius: 38,
    color: '#a855f7',
    summary: 'Vector spaces and matrix transformations that power modern 3D graphics and AI.',
    prerequisites: ['Algebra'],
    applications: ['Computer graphics', 'Quantum mechanics states', 'Large language models'],
    equationOrFormula: 'A · v = λ · v',
  },

  // Physics
  {
    id: 'kinematics',
    label: 'Classical Mechanics',
    category: 'Physics',
    x: 320,
    y: 280,
    radius: 40,
    color: '#38bdf8',
    summary: 'Newton\'s laws describing how forces cause objects to accelerate and move.',
    prerequisites: ['Calculus', 'Vectors'],
    applications: ['Automotive braking systems', 'Rocket launches', 'Bridge structural design'],
    equationOrFormula: 'F = m · a',
  },
  {
    id: 'electromagnetism',
    label: 'Electromagnetism',
    category: 'Physics',
    x: 500,
    y: 270,
    radius: 38,
    color: '#06b6d4',
    summary: 'Maxwell\'s unification of electricity, magnetism, and radiant light.',
    prerequisites: ['Calculus', 'Classical Mechanics'],
    applications: ['Electric motors', 'Wi-Fi & 5G radio transmission', 'MRI medical scans'],
    equationOrFormula: '∇ × E = -∂B/∂t',
  },
  {
    id: 'quantum',
    label: 'Quantum Mechanics',
    category: 'Physics',
    x: 650,
    y: 260,
    radius: 36,
    color: '#c084fc',
    summary: 'Wave-particle duality and probabilistic behavior of subatomic particles.',
    prerequisites: ['Linear Algebra', 'Electromagnetism'],
    applications: ['Semiconductors', 'Laser surgery', 'Quantum computing qubits'],
    equationOrFormula: 'iħ ∂Ψ/∂t = ĤΨ',
  },

  // Chemistry
  {
    id: 'atomic_structure',
    label: 'Atomic Structure',
    category: 'Chemistry',
    x: 540,
    y: 390,
    radius: 38,
    color: '#34d399',
    summary: 'Protons, neutrons, and electron orbital shells forming elements on the periodic table.',
    prerequisites: ['Electromagnetism'],
    applications: ['Lithium batteries', 'Pharmaceutical synthesis', 'Nuclear energy'],
    equationOrFormula: 'E = h · ν',
  },
  {
    id: 'thermodynamics',
    label: 'Thermodynamics',
    category: 'Chemistry',
    x: 380,
    y: 400,
    radius: 36,
    color: '#10b981',
    summary: 'Heat, work, entropy, and the fundamental laws of energy conservation.',
    prerequisites: ['Classical Mechanics'],
    applications: ['Refrigeration', 'Rocket propellant efficiency', 'Biological metabolism'],
    equationOrFormula: 'ΔU = Q - W',
  },

  // Biology
  {
    id: 'cell_biology',
    label: 'Cell Biology',
    category: 'Biology',
    x: 440,
    y: 520,
    radius: 38,
    color: '#14b8a6',
    summary: 'The microscopic building blocks of life, membranes, organelles, and DNA transcription.',
    prerequisites: ['Atomic Structure'],
    applications: ['Gene therapy (CRISPR)', 'Vaccine development', 'Synthetic biology'],
  },
  {
    id: 'photosynthesis',
    label: 'Photosynthesis',
    category: 'Biology',
    x: 270,
    y: 510,
    radius: 36,
    color: '#10b981',
    summary: 'Solar energy conversion into glucose and breathable oxygen via chlorophyll.',
    prerequisites: ['Cell Biology', 'Thermodynamics'],
    applications: ['Agriculture crop yield', 'Carbon capture', 'Biofuels'],
    equationOrFormula: '6CO₂ + 6H₂O + Light → C₆H₁₂O₆ + 6O₂',
  },

  // Computer Science & Tech
  {
    id: 'machine_learning',
    label: 'Machine Learning',
    category: 'Tech',
    x: 720,
    y: 130,
    radius: 40,
    color: '#ec4899',
    summary: 'Algorithms that optimize weights from data patterns rather than explicit programming.',
    prerequisites: ['Linear Algebra', 'Calculus', 'Probability'],
    applications: ['Autonomous driving', 'Speech synthesis', 'Medical diagnosis imaging'],
    equationOrFormula: 'w ← w - η ∇L(w)',
  },
  {
    id: 'algorithms',
    label: 'Algorithms & Data Structures',
    category: 'Tech',
    x: 760,
    y: 280,
    radius: 38,
    color: '#f43f5e',
    summary: 'Computational efficiency, sorting, trees, graphs, and Big-O asymptotic analysis.',
    prerequisites: ['Algebra'],
    applications: ['Google search indexing', 'GPS route pathfinding', 'Database queries'],
    equationOrFormula: 'O(V + E) / O(N log N)',
  },

  // Geography & Earth
  {
    id: 'plate_tectonics',
    label: 'Plate Tectonics',
    category: 'Geography',
    x: 180,
    y: 360,
    radius: 38,
    color: '#f59e0b',
    summary: 'Convection in Earth\'s mantle driving continental drift, earthquakes, and the Himalayas.',
    prerequisites: ['Thermodynamics'],
    applications: ['Earthquake hazard early warning', 'Mineral exploration', 'Tsunami modeling'],
  },
  {
    id: 'monsoon_climate',
    label: 'Atmospheric Systems & Monsoons',
    category: 'Geography',
    x: 150,
    y: 490,
    radius: 36,
    color: '#eab308',
    summary: 'Coriolis effect, solar differential heating, and seasonal wind reversal across India.',
    prerequisites: ['Thermodynamics', 'Plate Tectonics'],
    applications: ['Agricultural sowing planning', 'Disaster weather forecasting', 'Hydroelectric reservoirs'],
  },
];

const INITIAL_EDGES: ConceptEdge[] = [
  { from: 'algebra', to: 'calculus', label: 'Extends to infinite limits' },
  { from: 'algebra', to: 'linear_algebra', label: 'Multi-dimensional vectors' },
  { from: 'calculus', to: 'kinematics', label: 'Derivatives of position (dx/dt)' },
  { from: 'calculus', to: 'machine_learning', label: 'Backpropagation gradient descent' },
  { from: 'linear_algebra', to: 'quantum', label: 'Hilbert state vectors' },
  { from: 'linear_algebra', to: 'machine_learning', label: 'Matrix tensor dot products' },
  { from: 'kinematics', to: 'thermodynamics', label: 'Kinetic energy of gas particles' },
  { from: 'electromagnetism', to: 'quantum', label: 'Photon quantization' },
  { from: 'electromagnetism', to: 'atomic_structure', label: 'Coulomb electrostatic attraction' },
  { from: 'atomic_structure', to: 'cell_biology', label: 'Macromolecular biochemistry' },
  { from: 'thermodynamics', to: 'photosynthesis', label: 'Gibbs free energy absorption' },
  { from: 'thermodynamics', to: 'plate_tectonics', label: 'Mantle convection currents' },
  { from: 'plate_tectonics', to: 'monsoon_climate', label: 'Himalayas blocking cold winds' },
  { from: 'linear_algebra', to: 'algorithms', label: 'Graph adjacency matrices' },
  { from: 'cell_biology', to: 'photosynthesis', label: 'Chloroplast thylakoid membranes' },
];

interface KnowledgeGraphProps {
  selectedLanguage?: 'English' | 'Hindi' | 'Odia';
  onSolveProblem?: (problemText: string) => void;
  onExploreTopic?: (conceptName: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const KnowledgeGraphExplorer: React.FC<KnowledgeGraphProps> = ({
  selectedLanguage: _selectedLanguage,
  onSolveProblem,
  onExploreTopic,
  onNavigateToTab,
}) => {
  const [nodes, setNodes] = useState<ConceptNode[]>(INITIAL_NODES);
  const [edges] = useState<ConceptEdge[]>(INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('calculus');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Custom concept generator state
  const [customConceptInput, setCustomConceptInput] = useState<string>('');

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      const matchesCat = selectedCategory === 'All' || n.category === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.summary.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [nodes, selectedCategory, searchQuery]);

  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.0, z + 0.2));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.6, z - 0.2));
  const handleReset = () => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'circle' || (e.target as HTMLElement).tagName === 'text') {
      return;
    }
    setIsPanning(true);
    setStartPan({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanOffset({
      x: e.clientX - startPan.x,
      y: e.clientY - startPan.y,
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  // Add custom concept node
  const handleAddCustomConcept = () => {
    const name = customConceptInput.trim();
    if (!name) return;

    const id = name.toLowerCase().replace(/\s+/g, '_');
    const newNode: ConceptNode = {
      id,
      label: name,
      category: 'Tech',
      x: 450 + (Math.random() - 0.5) * 200,
      y: 350 + (Math.random() - 0.5) * 200,
      radius: 36,
      color: '#38bdf8',
      summary: `Custom explored topic: ${name}. Connects foundational principles with modern applications.`,
      prerequisites: ['Foundational Logic', 'Algebra'],
      applications: ['Innovative research', 'Advanced problem solving'],
    };

    setNodes([...nodes, newNode]);
    setSelectedNodeId(id);
    setCustomConceptInput('');
  };

  return (
    <div className="knowledge-graph-container">
      {/* Top Header & Controls */}
      <div className="kg-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Compass size={22} className="text-indigo-400" />
            <h2 className="kg-title">Interactive Knowledge Graph</h2>
          </div>
          <p className="kg-subtitle">
            Explore how Mathematics, Physics, Chemistry, Biology, Tech, and Geography interconnect into one unified web of knowledge.
          </p>
        </div>

        {/* Viewport Zoom Controls */}
        <div className="kg-viewport-tools">
          <button type="button" className="kg-tool-btn" onClick={handleZoomIn} title="Zoom In">
            <ZoomIn size={16} />
          </button>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
            {Math.round(zoomLevel * 100)}%
          </span>
          <button type="button" className="kg-tool-btn" onClick={handleZoomOut} title="Zoom Out">
            <ZoomOut size={16} />
          </button>
          <button type="button" className="kg-tool-btn" onClick={handleReset} title="Reset Position">
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="kg-filters-bar">
        <div className="kg-search-box">
          <Search size={15} color="#94a3b8" />
          <input
            type="text"
            className="kg-search-input"
            placeholder="Search concepts (e.g. Calculus, Quantum, Photosynthesis)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="kg-category-pills">
          {['All', 'Math', 'Physics', 'Chemistry', 'Biology', 'Tech', 'Geography'].map((cat) => (
            <button
              key={cat}
              type="button"
              className={`kg-cat-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Graph Grid Layout: Interactive SVG Canvas (Left) + Detail Inspector (Right) */}
      <div className="kg-split-layout">
        {/* SVG Interactive Canvas */}
        <div
          className="kg-canvas-card"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg
            className="kg-svg-element"
            viewBox="0 0 900 650"
            style={{
              cursor: isPanning ? 'grabbing' : 'grab',
            }}
          >
            <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`}>
              {/* Edges / Connector Lines */}
              {edges.map((edge, idx) => {
                const source = nodes.find((n) => n.id === edge.from);
                const target = nodes.find((n) => n.id === edge.to);
                if (!source || !target) return null;

                const isConnectedToSelected =
                  source.id === selectedNodeId || target.id === selectedNodeId;

                return (
                  <g key={idx}>
                    <line
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={isConnectedToSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.12)'}
                      strokeWidth={isConnectedToSelected ? 2.5 : 1.2}
                      strokeDasharray={isConnectedToSelected ? 'none' : '4,4'}
                      opacity={isConnectedToSelected ? 0.9 : 0.4}
                    />
                  </g>
                );
              })}

              {/* Concept Nodes */}
              {filteredNodes.map((node) => {
                const isSelected = node.id === selectedNodeId;

                return (
                  <g
                    key={node.id}
                    className="kg-node-group"
                    onClick={() => setSelectedNodeId(node.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Outer Glow Halo for Selected Node */}
                    {isSelected && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.radius + 12}
                        fill="none"
                        stroke={node.color}
                        strokeWidth={2.5}
                        opacity={0.7}
                        className="animate-pulse"
                      />
                    )}

                    {/* Main Node Circle */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.radius}
                      fill={node.color}
                      opacity={isSelected ? 1 : 0.85}
                      stroke="#ffffff"
                      strokeWidth={isSelected ? 2.5 : 1}
                      filter="drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5))"
                    />

                    {/* Node Text Label */}
                    <text
                      x={node.x}
                      y={node.y + 4}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize={node.radius > 38 ? 12 : 11}
                      fontWeight="700"
                      pointerEvents="none"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Quick Legend at bottom of canvas */}
          <div className="kg-canvas-legend">
            <span className="legend-item"><span className="dot dot-math" /> Math</span>
            <span className="legend-item"><span className="dot dot-phys" /> Physics</span>
            <span className="legend-item"><span className="dot dot-chem" /> Chemistry</span>
            <span className="legend-item"><span className="dot dot-bio" /> Biology</span>
            <span className="legend-item"><span className="dot dot-tech" /> Tech & CS</span>
            <span className="legend-item"><span className="dot dot-geo" /> Geography</span>
          </div>
        </div>

        {/* Selected Node Details Drawer */}
        <div className="kg-inspector-card">
          <div className="kg-inspector-header">
            <span className="kg-node-category-tag" style={{ color: selectedNode.color }}>
              {selectedNode.category}
            </span>
            <h3 className="kg-node-title">{selectedNode.label}</h3>
          </div>

          <p className="kg-node-summary">{selectedNode.summary}</p>

          {selectedNode.equationOrFormula && (
            <div className="kg-equation-box">
              <span className="kg-eq-label">Governing Formula / Principle:</span>
              <code className="kg-eq-code">{selectedNode.equationOrFormula}</code>
            </div>
          )}

          <div className="kg-detail-block">
            <h4 className="kg-detail-title">Prerequisite Foundations:</h4>
            <div className="kg-pill-list">
              {selectedNode.prerequisites.map((p, pIdx) => (
                <span key={pIdx} className="kg-prereq-pill">{p}</span>
              ))}
            </div>
          </div>

          <div className="kg-detail-block">
            <h4 className="kg-detail-title">Real-World Applications:</h4>
            <ul className="kg-apps-list">
              {selectedNode.applications.map((app, aIdx) => (
                <li key={aIdx}>{app}</li>
              ))}
            </ul>
          </div>

          {/* Connected Concepts */}
          <div className="kg-detail-block">
            <h4 className="kg-detail-title">Interconnected Branches:</h4>
            <div className="kg-connections-list">
              {edges
                .filter((e) => e.from === selectedNode.id || e.to === selectedNode.id)
                .map((e, eIdx) => {
                  const otherId = e.from === selectedNode.id ? e.to : e.from;
                  const otherNode = nodes.find((n) => n.id === otherId);
                  if (!otherNode) return null;

                  return (
                    <button
                      key={eIdx}
                      type="button"
                      className="kg-connected-btn"
                      onClick={() => setSelectedNodeId(otherId)}
                    >
                      <span>{otherNode.label}</span>
                      <span className="kg-connection-reason">({e.label})</span>
                      <ArrowRight size={13} />
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Actions: Solve Math or Ask AI */}
          <div className="kg-actions-row">
            {onExploreTopic && (
              <button
                type="button"
                className="kg-action-btn primary"
                onClick={() => onExploreTopic(selectedNode.label)}
              >
                <BookOpen size={15} />
                <span>Explore with AI</span>
              </button>
            )}

            {onSolveProblem && (
              <button
                type="button"
                className="kg-action-btn secondary"
                onClick={() => onSolveProblem(`Explain step-by-step concepts and applications of ${selectedNode.label}`)}
              >
                <HelpCircle size={15} />
                <span>Solve & Practice</span>
              </button>
            )}

            {onNavigateToTab && (
              <button
                type="button"
                className="kg-action-btn secondary"
                onClick={() => onNavigateToTab('ask-question')}
              >
                <HelpCircle size={15} />
                <span>Ask Question</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add Custom Concept Node Bar */}
      <div className="kg-add-custom-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <Plus size={16} color="#0284c7" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
            Add Custom Concept to Graph:
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', flex: 1, maxWidth: '500px' }}>
          <input
            type="text"
            className="kg-custom-input"
            placeholder="e.g. Black Holes, Photosynthesis, Thermodynamics..."
            value={customConceptInput}
            onChange={(e) => setCustomConceptInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCustomConcept();
            }}
          />
          <button
            type="button"
            onClick={handleAddCustomConcept}
            disabled={!customConceptInput.trim()}
            style={{
              padding: '0.5rem 1.1rem',
              fontSize: '0.82rem',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: customConceptInput.trim() ? 'pointer' : 'not-allowed',
              opacity: customConceptInput.trim() ? 1 : 0.5,
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)',
              whiteSpace: 'nowrap',
            }}
          >
            Add Node
          </button>
        </div>
      </div>
    </div>
  );
};
