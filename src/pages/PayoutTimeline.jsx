import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { base44 } from '@/api/base44Client';
import { C } from '../lib/qudiTokens';
import Header from '../components/qudi/Header';
import KenteStripe from '../components/qudi/KenteStripe';
import NavBar from '../components/qudi/NavBar';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function addPeriods(date, n, freq) {
  const d = new Date(date);
  if (freq === 'weekly') d.setDate(d.getDate() + n * 7);
  else d.setMonth(d.getMonth() + n);
  return d;
}

function fmt(n) { return Number(n || 0).toLocaleString(); }

function buildTimeline(circle, members, sequence) {
  const start = new Date(circle.created_date || Date.now());
  const currentCycle = circle.current_cycle || 1;
  const contribution = circle.contribution_amount || 0;
  const totalMembers = members.length;
  let potBalance = circle.pot_balance || 0;

  return sequence.map((member, idx) => {
    const cycleNum = currentCycle + idx;
    const payoutDate = addPeriods(start, cycleNum - 1, circle.frequency);
    const potBeforePayout = potBalance + contribution * totalMembers;
    potBalance = Math.max(0, potBeforePayout - contribution * totalMembers);
    const health = member.trust_score >= 70 ? 'good' : member.trust_score >= 40 ? 'ok' : 'risk';
    return {
      cycleNum,
      member,
      payoutDate,
      payoutAmount: contribution * totalMembers,
      potAfter: potBalance,
      health,
    };
  });
}

// Group timeline entries by month
function groupByMonth(timeline) {
  const groups = {};
  timeline.forEach(entry => {
    const key = `${entry.payoutDate.getFullYear()}-${entry.payoutDate.getMonth()}`;
    if (!groups[key]) groups[key] = { label: `${MONTHS[entry.payoutDate.getMonth()]} ${entry.payoutDate.getFullYear()}`, entries: [] };
    groups[key].entries.push(entry);
  });
  return Object.values(groups);
}

const HEALTH_STYLE = {
  good: { bg: '#D4EDDA', color: '#155724', icon: '🟢' },
  ok:   { bg: '#FFF8E1', color: '#856404', icon: '🟡' },
  risk: { bg: '#FCE4E4', color: '#721C24', icon: '🔴' },
};

export default function PayoutTimeline() {
  const navigate  = useNavigate();
  const { state } = useLocation();
  const preCircle = state?.circle || null;

  const [circles, setCircles]   = useState([]);
  const [selectedId, setSelectedId] = useState(preCircle?.id || null);
  const [circle, setCircle]     = useState(preCircle);
  const [sequence, setSequence] = useState([]);   // ordered member list
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [view, setView]         = useState('gantt'); // 'gantt' | 'calendar'

  useEffect(() => {
    base44.entities.Circle.list('-created_date', 50).then(data => {
      setCircles(data);
      if (!selectedId && data.length > 0) setSelectedId(data[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setSaved(false);
    const found = circles.find(c => c.id === selectedId);
    if (found) setCircle(found);
    base44.entities.Member.filter({ circle_id: selectedId }).then(members => {
      const eligible = members.filter(m => !m.has_received_payout);
      const sorted = [...eligible].sort((a, b) => (a.payout_position || 0) - (b.payout_position || 0));
      setSequence(sorted);
    });
  }, [selectedId, circles]);

  const timeline = circle && sequence.length > 0 ? buildTimeline(circle, sequence, sequence) : [];
  // Only show next 6 months of entries
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() + 6);
  const visible = timeline.filter(e => e.payoutDate <= cutoff);
  const monthGroups = groupByMonth(visible);

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const src = result.source.index;
    const dst = result.destination.index;
    if (src === dst) return;
    const next = [...sequence];
    const [moved] = next.splice(src, 1);
    next.splice(dst, 0, moved);
    // Reassign payout_position locally
    setSequence(next.map((m, i) => ({ ...m, payout_position: i + 1 })));
    setSaved(false);
  };

  const saveOrder = async () => {
    setSaving(true);
    await Promise.all(
      sequence.map((m, i) =>
        base44.entities.Member.update(m.id, { payout_position: i + 1 })
      )
    );
    setSaving(false);
    setSaved(true);
  };

  // Pot trajectory for mini chart
  const potPoints = visible.map(e => e.potAfter);
  const maxPot = Math.max(...potPoints, 1);

  return (
    <div style={{ minHeight: '100dvh', background: C.cream, maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: C.ink }}>
        <Header dark title="Payout Timeline" subtitle="Drag to reorder · 6-month view" onBack={() => navigate(-1)} />
        <KenteStripe height={3} />
        <div style={{ padding: '10px 16px 14px', display: 'flex', gap: 8 }}>
          <select
            value={selectedId || ''}
            onChange={e => setSelectedId(e.target.value)}
            style={{
              flex: 1, background: 'rgba(255,255,255,0.1)', color: C.gold,
              border: '1px solid rgba(235,160,32,0.4)', borderRadius: 10,
              padding: '8px 12px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
            }}
          >
            {circles.map(c => (
              <option key={c.id} value={c.id} style={{ background: C.ink, color: C.cream }}>{c.name}</option>
            ))}
          </select>
          {/* View toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(235,160,32,0.3)' }}>
            {['gantt','calendar'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '8px 10px', fontSize: 12, fontWeight: 700,
                background: view === v ? C.gold : 'transparent',
                color: view === v ? C.ink : C.gold,
                border: 'none', cursor: 'pointer',
              }}>{v === 'gantt' ? '📊' : '📅'}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
        {loading || !circle ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>Loading…</div>
        ) : sequence.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🎉</div>
            <div style={{ fontWeight: 700, color: C.ink }}>All members have been paid out!</div>
          </div>
        ) : (
          <>
            {/* Pot trajectory mini-chart */}
            <div style={{ margin: '12px 16px 4px', background: C.white, borderRadius: 14, padding: '14px 16px', border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 10, textTransform: 'uppercase' }}>Pot Balance Trajectory</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 56 }}>
                {potPoints.map((p, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{
                      width: '100%', background: p > 0 ? C.gold : C.border,
                      borderRadius: '3px 3px 0 0',
                      height: `${Math.max(4, Math.round((p / maxPot) * 48))}px`,
                      transition: 'height 0.3s',
                    }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 10, color: C.muted }}>Cycle {circle.current_cycle || 1}</span>
                <span style={{ fontSize: 10, color: C.muted }}>+{visible.length} cycles</span>
              </div>
            </div>

            {/* Save button */}
            {!saved && (
              <div style={{ margin: '8px 16px 0' }}>
                <button onClick={saveOrder} disabled={saving} style={{
                  width: '100%', background: saving ? C.muted : C.gold, color: C.ink,
                  border: 'none', borderRadius: 10, padding: '12px', fontSize: 13,
                  fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer',
                }}>
                  {saving ? '⏳ Saving Order…' : '💾 Save Payout Order'}
                </button>
              </div>
            )}
            {saved && (
              <div style={{ margin: '8px 16px 0', background: '#D4EDDA', borderRadius: 10, padding: '10px 14px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#155724' }}>
                ✅ Payout order saved successfully
              </div>
            )}

            {view === 'gantt' ? (
              /* ── GANTT / SEQUENCE VIEW ── */
              <div style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
                  ☝️ Drag members to reorder payout sequence
                </div>
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="payout-sequence">
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}>
                        {visible.map((entry, index) => {
                          const hs = HEALTH_STYLE[entry.health];
                          const dateStr = entry.payoutDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                          return (
                            <Draggable key={entry.member.id} draggableId={entry.member.id} index={index}>
                              {(prov, snap) => (
                                <div
                                  ref={prov.innerRef}
                                  {...prov.draggableProps}
                                  style={{
                                    background: snap.isDragging ? '#FFFDE7' : C.white,
                                    border: `1.5px solid ${snap.isDragging ? C.gold : C.border}`,
                                    borderRadius: 12, marginBottom: 8, overflow: 'hidden',
                                    boxShadow: snap.isDragging ? '0 6px 20px rgba(235,160,32,0.25)' : 'none',
                                    ...prov.draggableProps.style,
                                  }}
                                >
                                  {/* Cycle header bar */}
                                  <div style={{ background: C.ink, padding: '5px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: C.gold, fontSize: 11, fontWeight: 700 }}>Cycle {entry.cycleNum}</span>
                                    <span style={{ color: C.hintOnDark, fontSize: 11 }}>{dateStr}</span>
                                  </div>

                                  <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                    {/* Drag handle */}
                                    <div {...prov.dragHandleProps} style={{ fontSize: 18, color: C.muted, cursor: 'grab', flexShrink: 0 }}>⠿</div>

                                    {/* Avatar */}
                                    <div style={{
                                      width: 40, height: 40, borderRadius: '50%', background: C.ink,
                                      color: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: 14, fontWeight: 800, flexShrink: 0,
                                    }}>
                                      {(entry.member.initials || entry.member.full_name?.slice(0, 2) || '?').toUpperCase()}
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{entry.member.full_name}</div>
                                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                                        Position #{index + 1} · {entry.member.phone || 'no phone'}
                                      </div>
                                    </div>

                                    {/* Payout amount + health */}
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                      <div style={{ fontWeight: 800, fontSize: 15, color: C.goldText || C.gold }}>GHS {fmt(entry.payoutAmount)}</div>
                                      <div style={{ marginTop: 3 }}>
                                        <span style={{ background: hs.bg, color: hs.color, borderRadius: 5, padding: '2px 6px', fontSize: 10, fontWeight: 700 }}>
                                          {hs.icon} {entry.health === 'good' ? 'Reliable' : entry.health === 'ok' ? 'Moderate' : 'At Risk'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Pot impact */}
                                  <div style={{ padding: '6px 12px 10px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 16 }}>
                                    <div>
                                      <span style={{ fontSize: 10, color: C.muted }}>Pot after payout: </span>
                                      <span style={{ fontSize: 11, fontWeight: 700, color: entry.potAfter === 0 ? C.red : C.ink }}>
                                        GHS {fmt(entry.potAfter)}
                                      </span>
                                    </div>
                                    <div>
                                      <span style={{ fontSize: 10, color: C.muted }}>Trust: </span>
                                      <span style={{ fontSize: 11, fontWeight: 700, color: C.ink }}>{entry.member.trust_score ?? 50}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            ) : (
              /* ── CALENDAR VIEW ── */
              <div style={{ padding: '12px 16px' }}>
                {monthGroups.map((group, gi) => (
                  <div key={gi} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.ink, marginBottom: 8, paddingLeft: 4, borderLeft: `3px solid ${C.gold}`, paddingLeft: 8 }}>
                      {group.label}
                    </div>
                    {group.entries.map((entry, ei) => {
                      const hs = HEALTH_STYLE[entry.health];
                      const day = entry.payoutDate.getDate();
                      const dow = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][entry.payoutDate.getDay()];
                      return (
                        <div key={ei} style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'flex-start' }}>
                          {/* Day badge */}
                          <div style={{ flexShrink: 0, width: 44, textAlign: 'center', background: C.ink, borderRadius: 10, padding: '6px 0' }}>
                            <div style={{ fontSize: 10, color: C.hintOnDark }}>{dow}</div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: C.gold }}>{day}</div>
                          </div>
                          {/* Card */}
                          <div style={{ flex: 1, background: C.white, borderRadius: 12, padding: '10px 14px', border: `1px solid ${C.border}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>{entry.member.full_name}</span>
                              <span style={{ fontWeight: 800, fontSize: 14, color: C.gold }}>GHS {fmt(entry.payoutAmount)}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <span style={{ fontSize: 11, color: C.muted }}>Cycle {entry.cycleNum}</span>
                              <span style={{ background: hs.bg, color: hs.color, borderRadius: 5, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>
                                {hs.icon} {entry.health === 'good' ? 'Reliable' : entry.health === 'ok' ? 'Moderate' : 'At Risk'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430 }}>
        <NavBar />
      </div>
    </div>
  );
}