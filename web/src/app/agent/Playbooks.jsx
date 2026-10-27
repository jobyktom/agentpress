import { useMemo, useState } from 'react';
import { ReactFlow, Background, Controls, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Workflow, Plus, Trash2, ArrowUp, ArrowDown, MessageSquare, HelpCircle, GitBranch, Wrench, UserRound, Sparkles, Flag, Variable, Zap } from 'lucide-react';
import { useAgent } from './context';
import { PageHeader, Empty, Toggle, Badge } from '../../components/ui';
import { uid } from '../../lib/api';

export const STEP_TYPES = {
  message: { label: 'Message', icon: MessageSquare, color: '#5f7f6a', hint: 'Send a message' },
  ask: { label: 'Ask', icon: HelpCircle, color: '#4f6d8a', hint: 'Ask and save the answer' },
  condition: { label: 'Condition', icon: GitBranch, color: '#8b6b55', hint: 'Branch on a variable' },
  tool: { label: 'Call tool', icon: Wrench, color: '#c99a3c', hint: 'Run an HTTP tool' },
  set: { label: 'Set variable', icon: Variable, color: '#76716a', hint: 'Store a value' },
  ai: { label: 'AI reply', icon: Sparkles, color: '#ee661b', hint: 'Let AI answer with guidance' },
  handoff: { label: 'Handoff', icon: UserRound, color: '#a24b3a', hint: 'Move to the human inbox' },
  end: { label: 'End', icon: Flag, color: '#181715', hint: 'Finish the playbook' },
};

function summary(s, tools) {
  switch (s.type) {
    case 'ask': return `${s.text || ''} → {{${s.variable || s.id}}}`;
    case 'condition': return `if ${s.variable || '?'} ${s.operator || '?'} ${s.value ?? ''}`;
    case 'tool': return `${tools.find((t) => t.id === s.toolId)?.name || 'Choose a tool'} → {{${s.variable || 'result'}}}`;
    case 'set': return `${s.variable || '?'} = ${s.value ?? ''}`;
    case 'end': return s.text || 'End of playbook';
    default: return s.text || '';
  }
}

function StepNode({ data }) {
  const T = STEP_TYPES[data.step.type];
  const Icon = T.icon;
  return (
    <div className={`w-60 rounded-xl border bg-surface shadow-sm transition ${data.selected ? 'border-brand-400 ring-4 ring-brand-100' : 'border-ink-200'}`}>
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-ink-300" />
      <div className="flex items-center gap-2 border-b border-ink-100 px-3 py-1.5">
        <span className="grid h-5 w-5 place-items-center rounded-md text-white" style={{ background: T.color }}><Icon className="h-3 w-3" /></span>
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-500">{T.label}</span>
        <span className="ml-auto font-mono text-[10px] text-ink-300">{data.index + 1}</span>
      </div>
      <div className="line-clamp-2 px-3 py-2 text-xs text-ink-700">{data.summary || <span className="text-ink-300">Empty</span>}</div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-ink-300" />
    </div>
  );
}
function TriggerNode({ data }) {
  return (
    <div className="w-60 rounded-xl bg-ink-900 px-3 py-2.5 text-white shadow-md">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide opacity-80"><Zap className="h-3 w-3" />Trigger</div>
      <div className="mt-0.5 line-clamp-2 text-xs">{data.triggers.length ? data.triggers.map((t) => `“${t}”`).join(', ') : 'Add trigger phrases'}</div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-surface" />
    </div>
  );
}
const nodeTypes = { step: StepNode, trigger: TriggerNode };

function buildGraph(pb, selected, tools) {
  const steps = pb.steps;
  const idx = Object.fromEntries(steps.map((s, i) => [s.id, i]));
  const edges = [];
  const targetsOf = (s, i) => {
    if (s.type === 'end' || s.type === 'handoff') return [];
    if (s.type === 'condition') return [[s.then ?? steps[i + 1]?.id, 'yes'], [s.else ?? steps[i + 1]?.id, 'no']].filter(([t]) => t != null && idx[t] != null);
    const n = s.next ?? steps[i + 1]?.id;
    return n != null && idx[n] != null ? [[n, '']] : [];
  };
  // Layered layout: depth = longest path from the first step, columns spread per layer.
  const depth = {};
  if (steps.length) {
    const q = [[steps[0].id, 0]];
    let guard = 0;
    while (q.length && guard++ < 500) {
      const [id, d] = q.shift();
      if (depth[id] != null && depth[id] >= d) continue;
      depth[id] = d;
      const s = steps[idx[id]];
      for (const [t] of targetsOf(s, idx[id])) if (d + 1 < steps.length + 1) q.push([t, d + 1]);
    }
  }
  steps.forEach((s, i) => { if (depth[s.id] == null) depth[s.id] = i; });
  const layers = {};
  steps.forEach((s) => (layers[depth[s.id]] ||= []).push(s.id));
  const nodes = [{ id: '__trigger', type: 'trigger', position: { x: 0, y: -110 }, data: { triggers: pb.triggers || [] }, draggable: false }];
  steps.forEach((s, i) => {
    const layer = layers[depth[s.id]];
    const col = layer.indexOf(s.id) - (layer.length - 1) / 2;
    nodes.push({ id: s.id, type: 'step', position: { x: col * 290, y: depth[s.id] * 120 }, data: { step: s, index: i, selected: selected === s.id, summary: summary(s, tools) }, draggable: false });
    for (const [t, label] of targetsOf(s, i)) {
      edges.push({ id: `${s.id}-${t}-${label}`, source: s.id, target: t, label: label || undefined, type: 'smoothstep', animated: label === 'yes',
        style: { stroke: label === 'no' ? '#a24b3a' : label === 'yes' ? '#5f7f6a' : '#cfc8bc', strokeWidth: 2 }, labelStyle: { fontSize: 10, fontWeight: 700 }, labelBgStyle: { fill: '#fbfaf7' } });
    }
  });
  if (steps.length) edges.unshift({ id: 'trigger-edge', source: '__trigger', target: steps[0].id, type: 'smoothstep', style: { stroke: '#ee661b', strokeWidth: 2 } });
  return { nodes, edges };
}

export default function Playbooks() {
  const { config, updateConfig, canEdit } = useAgent();
  const [active, setActive] = useState(config.playbooks[0]?.id || null);
  const [selected, setSelected] = useState(null);
  const pb = config.playbooks.find((p) => p.id === active);
  const updatePb = (fn) => updateConfig((c) => { const i = c.playbooks.findIndex((p) => p.id === active); c.playbooks[i] = fn(c.playbooks[i]); return c; });
  const create = () => {
    const p = { id: uid('pb'), name: 'New playbook', description: '', enabled: true, triggers: [], steps: [{ id: uid('s'), type: 'message', text: 'Hi! Let\'s get started.' }, { id: uid('s'), type: 'end' }] };
    updateConfig((c) => ({ ...c, playbooks: [...c.playbooks, p] }));
    setActive(p.id); setSelected(null);
  };
  const graph = useMemo(() => pb ? buildGraph(pb, selected, config.tools) : null, [pb, selected, config.tools]);
  const step = pb?.steps.find((s) => s.id === selected);
  const addStep = (type) => {
    const s = { id: uid('s'), type, ...(type === 'condition' ? { operator: 'equals' } : {}), ...(type === 'ask' ? { validate: 'any' } : {}) };
    updatePb((p) => { const i = p.steps.findIndex((x) => x.id === selected); p.steps.splice(i >= 0 ? i + 1 : p.steps.length, 0, s); return p; });
    setSelected(s.id);
  };
  const setStep = (k, v) => updatePb((p) => { const s = p.steps.find((x) => x.id === selected); if (v === '' || v == null) delete s[k]; else s[k] = v; return p; });
  const move = (d) => updatePb((p) => { const i = p.steps.findIndex((x) => x.id === selected); const j = i + d; if (j < 0 || j >= p.steps.length) return p; [p.steps[i], p.steps[j]] = [p.steps[j], p.steps[i]]; return p; });
  const delStep = () => { updatePb((p) => ({ ...p, steps: p.steps.filter((x) => x.id !== selected) })); setSelected(null); };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-ink-200 bg-surface px-6 py-4">
        <PageHeader icon={Workflow} title="Playbooks" description="Step-by-step flows for the moments that must go exactly right. Everything else is handled by AI using your instructions and knowledge."
          actions={canEdit && <button className="btn btn-primary btn-sm" onClick={create}><Plus className="h-3.5 w-3.5" />New playbook</button>} />
        {config.playbooks.length > 0 && (
          <div className="-mb-4 flex gap-1 overflow-x-auto">
            {config.playbooks.map((p) => (
              <button key={p.id} onClick={() => { setActive(p.id); setSelected(null); }} className={`whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2 text-sm font-semibold ${p.id === active ? 'border-brand-500 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-800'}`}>
                {p.name}{p.enabled === false && <span className="ml-1.5 text-[10px] text-ink-400">off</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      {!pb ? <div className="p-8"><Empty icon={Workflow} title="No playbooks yet" action={canEdit && <button className="btn btn-primary" onClick={create}><Plus className="h-4 w-4" />Create a playbook</button>}>Use playbooks to collect details, branch on answers, call APIs and hand off.</Empty></div> : (
        <div className="flex min-h-0 flex-1 max-xl:flex-col">
          <div className="flex min-h-[420px] min-w-0 flex-1 flex-col">
            {canEdit && (
              <div className="flex flex-wrap items-center gap-1 border-b border-ink-200 bg-surface px-3 py-2">
                <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Add step</span>
                {Object.entries(STEP_TYPES).map(([k, T]) => (
                  <button key={k} onClick={() => addStep(k)} title={`${T.hint}${selected ? ' after the selected step' : ''}`} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-ink-600 hover:bg-ink-50">
                    <T.icon className="h-3.5 w-3.5" style={{ color: T.color }} />{T.label}
                  </button>
                ))}
              </div>
            )}
          <div className="relative flex-1 bg-ink-50">
            <ReactFlow nodes={graph.nodes} edges={graph.edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.25 }} minZoom={0.3} nodesConnectable={false}
              onNodeClick={(_, n) => setSelected(n.id === '__trigger' ? null : n.id)} onPaneClick={() => setSelected(null)} proOptions={{ hideAttribution: true }}>
              <Background gap={18} color="#cfc8bc" />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
          </div>
          <div className="w-full shrink-0 overflow-y-auto border-l border-ink-200 bg-surface p-5 scrollbar-thin xl:w-80">
            {step ? (
              <StepInspector step={step} steps={pb.steps} tools={config.tools} set={setStep} canEdit={canEdit} onMove={move} onDelete={delStep} />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between"><h3 className="font-bold">Playbook settings</h3><Toggle checked={pb.enabled !== false} disabled={!canEdit} onChange={(v) => updatePb((p) => ({ ...p, enabled: v }))} label="Enabled" /></div>
                <label className="block"><span className="label">Name</span><input className="input" disabled={!canEdit} value={pb.name} onChange={(e) => updatePb((p) => ({ ...p, name: e.target.value }))} /></label>
                <label className="block"><span className="label">What it does (helps the AI suggest it)</span><textarea className="input" rows={2} disabled={!canEdit} value={pb.description} onChange={(e) => updatePb((p) => ({ ...p, description: e.target.value }))} /></label>
                <label className="block"><span className="label">Trigger phrases (one per line)</span><textarea className="input" rows={4} disabled={!canEdit} value={(pb.triggers || []).join('\n')} onChange={(e) => updatePb((p) => ({ ...p, triggers: e.target.value.split('\n') }))} placeholder={'where is my order\ntrack my order'} /></label>
                <p className="rounded-lg bg-ink-50 p-3 text-xs text-ink-500">The playbook starts when a message contains a trigger phrase or most of its words. Click a step on the canvas to edit it. New steps are added after the selected step.</p>
                {canEdit && <button className="btn btn-ghost text-rose-600" onClick={() => { if (confirm(`Delete playbook "${pb.name}"?`)) { updateConfig((c) => ({ ...c, playbooks: c.playbooks.filter((p) => p.id !== pb.id) })); setActive(config.playbooks.find((p) => p.id !== pb.id)?.id || null); } }}><Trash2 className="h-4 w-4" />Delete playbook</button>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StepInspector({ step, steps, tools, set, canEdit, onMove, onDelete }) {
  const T = STEP_TYPES[step.type];
  const others = steps.filter((s) => s.id !== step.id);
  const stepOption = (s) => <option key={s.id} value={s.id}>{steps.indexOf(s) + 1}. {STEP_TYPES[s.type].label}: {summary(s, tools).slice(0, 30)}</option>;
  const ro = !canEdit;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg text-white" style={{ background: T.color }}><T.icon className="h-4 w-4" /></span>
        <h3 className="flex-1 font-bold">{T.label}</h3>
        {canEdit && <>
          <button className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100" onClick={() => onMove(-1)} aria-label="Move up"><ArrowUp className="h-4 w-4" /></button>
          <button className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100" onClick={() => onMove(1)} aria-label="Move down"><ArrowDown className="h-4 w-4" /></button>
          <button className="rounded-lg p-1.5 text-ink-400 hover:bg-rose-50 hover:text-rose-600" onClick={onDelete} aria-label="Delete step"><Trash2 className="h-4 w-4" /></button>
        </>}
      </div>
      {['message', 'ask', 'handoff', 'end', 'ai'].includes(step.type) && (
        <label className="block"><span className="label">{step.type === 'ai' ? 'Guidance for the AI' : step.type === 'ask' ? 'Question' : 'Text'}</span>
          <textarea className="input" rows={3} disabled={ro} value={step.text || ''} onChange={(e) => set('text', e.target.value)} placeholder={step.type === 'ai' ? 'Summarise the options and recommend one.' : 'Use {{variable}} to insert saved values.'} />
        </label>
      )}
      {['message', 'ask'].includes(step.type) && (
        <label className="block"><span className="label">Quick replies (comma separated, optional)</span><input className="input" disabled={ro} value={(step.choices || []).join(', ')} onChange={(e) => set('choices', e.target.value ? e.target.value.split(',').map((s) => s.trim()) : null)} /></label>
      )}
      {['ask', 'set', 'tool', 'condition'].includes(step.type) && (
        <label className="block"><span className="label">{step.type === 'condition' ? 'Variable to check' : 'Save to variable'}</span><input className="input font-mono" disabled={ro} value={step.variable || ''} onChange={(e) => set('variable', e.target.value.replace(/[^\w.]/g, ''))} placeholder="orderNumber" /></label>
      )}
      {step.type === 'ask' && <>
        <label className="block"><span className="label">Validate answer</span><select className="input" disabled={ro} value={step.validate || 'any'} onChange={(e) => set('validate', e.target.value)}><option value="any">Anything</option><option value="email">Email</option><option value="phone">Phone number</option><option value="number">Number</option><option value="yesno">Yes / no</option></select></label>
        {step.validate && step.validate !== 'any' && <label className="block"><span className="label">If invalid, say</span><input className="input" disabled={ro} value={step.retryMessage || ''} onChange={(e) => set('retryMessage', e.target.value)} placeholder="That doesn't look right. Could you try again?" /></label>}
      </>}
      {step.type === 'set' && <label className="block"><span className="label">Value</span><input className="input" disabled={ro} value={step.value || ''} onChange={(e) => set('value', e.target.value)} /></label>}
      {step.type === 'condition' && <>
        <div className="grid grid-cols-2 gap-2">
          <select className="input" disabled={ro} value={step.operator} onChange={(e) => set('operator', e.target.value)} aria-label="Operator">
            <option value="equals">equals</option><option value="not_equals">does not equal</option><option value="contains">contains</option><option value="gt">greater than</option><option value="lt">less than</option><option value="is_set">is set</option><option value="is_yes">is yes</option>
          </select>
          {!['is_set', 'is_yes'].includes(step.operator) && <input className="input" disabled={ro} value={step.value || ''} onChange={(e) => set('value', e.target.value)} placeholder="value" aria-label="Value" />}
        </div>
        <label className="block"><span className="label text-emerald-700">If yes, go to</span><select className="input" disabled={ro} value={step.then || ''} onChange={(e) => set('then', e.target.value)}><option value="">Next step</option>{others.map(stepOption)}</select></label>
        <label className="block"><span className="label text-rose-700">If no, go to</span><select className="input" disabled={ro} value={step.else || ''} onChange={(e) => set('else', e.target.value)}><option value="">Next step</option>{others.map(stepOption)}</select></label>
      </>}
      {step.type === 'tool' && <>
        <label className="block"><span className="label">Tool</span><select className="input" disabled={ro} value={step.toolId || ''} onChange={(e) => set('toolId', e.target.value)}><option value="">Choose a tool…</option>{tools.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        {!tools.length && <p className="text-xs text-amber-700">Create a tool on the Tools page first.</p>}
        {tools.find((t) => t.id === step.toolId)?.params.map((p) => (
          <label key={p.name} className="block"><span className="label font-mono">{p.name}</span><input className="input font-mono text-xs" disabled={ro} value={step.args?.[p.name] || ''} onChange={(e) => set('args', { ...(step.args || {}), [p.name]: e.target.value })} placeholder={`{{${p.name}}}`} /></label>
        ))}
      </>}
      {!['condition', 'end', 'handoff'].includes(step.type) && (
        <label className="block"><span className="label">Then go to</span><select className="input" disabled={ro} value={step.next || ''} onChange={(e) => set('next', e.target.value)}><option value="">Next step</option>{others.map(stepOption)}</select></label>
      )}
      <div className="rounded-lg bg-ink-50 p-3 text-[11px] text-ink-500">Step ID <code className="font-mono">{step.id}</code>{step.variable && <> · saves <Badge tone="brand" className="!text-[10px]">{`{{${step.variable}}}`}</Badge></>}</div>
    </div>
  );
}
