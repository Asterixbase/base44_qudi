import { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { C } from '../../lib/qudiTokens';

function trustLevel(score) {
  if (score >= 90) return 'Trusted';
  if (score >= 70) return 'Verified';
  if (score >= 40) return 'Building Trust';
  return 'New Member';
}

const STATUS_STYLE = {
  paid:    { bg: '#D4EDDA', color: '#155724', label: 'PAID' },
  pending: { bg: '#FFF8E1', color: '#856404', label: 'PENDING' },
  failed:  { bg: '#FCE4E4', color: '#721C24', label: 'FAILED' },
  overdue: { bg: '#FCE4E4', color: '#721C24', label: 'OVERDUE' },
};

function PDFTemplate({ circle, members }) {
  const contribution = circle.contribution_amount || 200;
  const paidMembers  = members.filter(m => m.payment_status === 'paid');
  const totalCollected = paidMembers.length * contribution;
  const target = (circle.max_members || members.length) * contribution;
  const shortfall = Math.max(0, target - totalCollected);
  const recipient = members.find(m => m.payout_position === (circle.current_cycle || 1));
  const sorted = [...members].sort((a, b) => (a.payout_position || 0) - (b.payout_position || 0));
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ width: 794, background: '#FFFFFF', fontFamily: 'Arial, sans-serif', color: '#1A1208' }}>
      {/* Header */}
      <div style={{ background: '#1A1208', padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: '#EBA020', fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>Qudi 🫂</div>
          <div style={{ color: '#C4B080', fontSize: 13, marginTop: 4 }}>Circle Cycle Summary Report</div>
        </div>
        <div style={{ textAlign: 'right', color: '#C4B080', fontSize: 12 }}>
          <div style={{ color: '#EBA020', fontWeight: 700, fontSize: 15 }}>{circle.name}</div>
          <div style={{ marginTop: 4 }}>Cycle {circle.current_cycle || 1}</div>
          <div>{circle.frequency?.charAt(0).toUpperCase()}{circle.frequency?.slice(1) || 'Monthly'} · {members.length} members</div>
          <div style={{ marginTop: 4 }}>Generated: {date}</div>
        </div>
      </div>

      {/* Kente stripe */}
      <div style={{ display: 'flex', height: 6 }}>
        {['#EBA020','#1A1208','#2D6A2D','#8B1A1A','#EBA020','#1A1208','#2D6A2D','#8B1A1A'].map((c, i) => (
          <div key={i} style={{ flex: 1, background: c }} />
        ))}
      </div>

      <div style={{ padding: '28px 40px' }}>
        {/* Summary cards */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Total Collected',  value: `GHS ${totalCollected.toLocaleString()}`, bg: '#D4EDDA', color: '#155724' },
            { label: 'Cycle Target',     value: `GHS ${target.toLocaleString()}`,         bg: '#FFF8E1', color: '#856404' },
            { label: 'Members Paid',     value: `${paidMembers.length} / ${members.length}`, bg: '#D1ECF1', color: '#0C5460' },
            { label: 'Shortfall',        value: shortfall > 0 ? `GHS ${shortfall.toLocaleString()}` : '✓ None', bg: shortfall > 0 ? '#FCE4E4' : '#D4EDDA', color: shortfall > 0 ? '#721C24' : '#155724' },
          ].map((card, i) => (
            <div key={i} style={{ flex: 1, background: card.bg, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: card.color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>{card.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Payout recipient */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1208', borderBottom: '2px solid #EBA020', paddingBottom: 6, marginBottom: 12 }}>
            Cycle {circle.current_cycle || 1} Payout Recipient
          </div>
          {recipient ? (
            <div style={{ background: '#FFF8E1', border: '1px solid #EBA020', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#EBA020', color: '#1A1208', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                {(recipient.initials || recipient.full_name?.slice(0, 2) || 'M').toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1A1208' }}>{recipient.full_name}</div>
                <div style={{ fontSize: 12, color: '#6B5A3A', marginTop: 2 }}>Position #{recipient.payout_position} · {recipient.phone || 'N/A'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#EBA020' }}>GHS {target.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: recipient.has_received_payout ? '#155724' : '#856404', fontWeight: 700, marginTop: 4 }}>
                  {recipient.has_received_payout ? '✓ DISBURSED' : '⏳ PENDING DISBURSEMENT'}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: '#6B5A3A', fontSize: 13, fontStyle: 'italic' }}>No payout scheduled for this cycle.</div>
          )}
        </div>

        {/* Member table */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1208', borderBottom: '2px solid #EBA020', paddingBottom: 6, marginBottom: 0 }}>
            Member Payment Status & Trust Scores
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#1A1208' }}>
                {['#', 'Member', 'Phone', 'Status', 'Trust Score', 'Level', 'Payout Received'].map(h => (
                  <th key={h} style={{ color: '#EBA020', padding: '8px 10px', textAlign: 'left', fontWeight: 700, fontSize: 10 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((m, i) => {
                const st = STATUS_STYLE[m.payment_status] || STATUS_STYLE.pending;
                return (
                  <tr key={m.id} style={{ background: i % 2 === 0 ? '#FDFAF4' : '#F7F2E8' }}>
                    <td style={{ padding: '8px 10px', color: '#6B5A3A', fontWeight: 700 }}>{m.payout_position || i + 1}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1A1208' }}>{m.full_name}</td>
                    <td style={{ padding: '8px 10px', color: '#6B5A3A' }}>{m.phone || '—'}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ background: st.bg, color: st.color, borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>{st.label}</span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 60, height: 6, background: '#E0DBC4', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${m.trust_score || 50}%`, height: '100%', background: (m.trust_score || 50) >= 70 ? '#2D6A2D' : (m.trust_score || 50) >= 40 ? '#8A5C00' : '#8B1A1A' }} />
                        </div>
                        <span style={{ fontSize: 11, color: '#1A1208' }}>{m.trust_score ?? 50}</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 10px', color: '#6B5A3A' }}>{trustLevel(m.trust_score ?? 50)}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <span style={{ color: m.has_received_payout ? '#155724' : '#856404', fontWeight: 700, fontSize: 11 }}>
                        {m.has_received_payout ? '✓ Yes' : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Notes */}
        {circle.description && (
          <div style={{ marginTop: 20, background: '#F7F2E8', border: '1px solid #E0DBC4', borderRadius: 8, padding: '12px 14px', fontSize: 11, color: '#6B5A3A' }}>
            <strong style={{ color: '#1A1208' }}>Circle Notes: </strong>{circle.description}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ background: '#1A1208', padding: '14px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#6B5A3A', fontSize: 10 }}>
          Qudi — Money Circles, Built on Trust · Auto-generated report · Not a financial statement
        </div>
        <div style={{ color: '#EBA020', fontSize: 10, fontWeight: 700 }}>qudi.app</div>
      </div>
    </div>
  );
}

export default function CircleSummaryPDF({ circle, members }) {
  const [generating, setGenerating] = useState(false);
  const templateRef = useRef(null);

  const generate = async () => {
    setGenerating(true);
    try {
      const element = templateRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const ratio = pdfW / canvas.width;
      const totalH = canvas.height * ratio;

      let position = 0;
      let page = 0;
      while (position < totalH) {
        if (page > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -position, pdfW, totalH);
        position += pdfH;
        page++;
      }

      pdf.save(`Qudi_${(circle.name || 'Circle').replace(/\s+/g, '_')}_Cycle${circle.current_cycle || 1}.pdf`);
    } catch (e) {
      console.error('PDF generation error:', e);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      {/* Hidden render template */}
      <div style={{ position: 'fixed', left: -9999, top: 0, zIndex: -1, pointerEvents: 'none' }}>
        <div ref={templateRef}>
          <PDFTemplate circle={circle} members={members} />
        </div>
      </div>

      <button
        onClick={generate}
        disabled={generating}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: generating ? C.border : C.white,
          color: C.ink, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: '8px 14px',
          fontSize: 13, fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer',
          minWidth: 120,
        }}
      >
        {generating ? '⏳ Generating…' : '📄 Export PDF'}
      </button>
    </>
  );
}