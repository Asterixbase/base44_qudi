import { useState } from 'react';
import { jsPDF } from 'jspdf';
import { C } from '../../lib/qudiTokens';

function trustLevel(score) {
  if (score >= 90) return 'Trusted';
  if (score >= 70) return 'Verified';
  if (score >= 40) return 'Building trust';
  return 'New member';
}

export default function CircleSummaryPDF({ circle, members }) {
  const [generating, setGenerating] = useState(false);

  const generate = () => {
    setGenerating(true);

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const margin = 48;
    let y = 0;

    // ── Header band ──
    doc.setFillColor(28, 25, 23); // ink
    doc.rect(0, 0, W, 80, 'F');

    doc.setTextColor(247, 197, 72); // gold
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Qudi', margin, 34);

    doc.setTextColor(230, 220, 200); // cream
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Circle Cycle Summary Report', margin, 52);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin, 66);

    y = 110;

    // ── Circle info ──
    doc.setTextColor(28, 25, 23);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(circle.name || 'Circle', margin, y);
    y += 20;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 90, 80);
    const freq = circle.frequency ? circle.frequency.charAt(0).toUpperCase() + circle.frequency.slice(1) : 'Monthly';
    doc.text(`Cycle ${circle.current_cycle || 1}  ·  ${freq}  ·  ${circle.max_members || members.length} members`, margin, y);
    y += 28;

    // ── Summary cards (3 boxes) ──
    const contribution = circle.contribution_amount || 200;
    const totalCollected = members.filter(m => m.payment_status === 'paid').length * contribution;
    const target = (circle.max_members || members.length) * contribution;
    const paidCount = members.filter(m => m.payment_status === 'paid').length;
    const boxW = (W - margin * 2 - 16) / 3;

    const boxes = [
      { label: 'Total Contributions', value: `GHS ${totalCollected.toLocaleString()}` },
      { label: 'Target This Cycle',   value: `GHS ${target.toLocaleString()}` },
      { label: 'Members Paid',        value: `${paidCount} / ${members.length}` },
    ];

    boxes.forEach((b, i) => {
      const x = margin + i * (boxW + 8);
      doc.setFillColor(245, 240, 230);
      doc.roundedRect(x, y, boxW, 52, 6, 6, 'F');
      doc.setTextColor(100, 90, 80);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(b.label.toUpperCase(), x + 10, y + 17);
      doc.setTextColor(28, 25, 23);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(b.value, x + 10, y + 38);
    });
    y += 72;

    // ── Payout status ──
    doc.setTextColor(28, 25, 23);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Payout Status', margin, y);
    y += 14;
    doc.setDrawColor(220, 210, 190);
    doc.line(margin, y, W - margin, y);
    y += 14;

    const recipient = members.find(m => m.payout_position === (circle.current_cycle || 1));
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 50, 40);
    if (recipient) {
      doc.text(`Cycle ${circle.current_cycle || 1} Recipient: ${recipient.full_name}  (Position #${recipient.payout_position})`, margin, y);
      y += 16;
      doc.text(`Payout Amount: GHS ${target.toLocaleString()}`, margin, y);
      y += 16;
      const payoutStatus = recipient.payment_status === 'paid' ? 'DISBURSED' : 'PENDING COLLECTION';
      doc.setTextColor(recipient.payment_status === 'paid' ? 34 : 133, recipient.payment_status === 'paid' ? 139 : 100, recipient.payment_status === 'paid' ? 34 : 20);
      doc.setFont('helvetica', 'bold');
      doc.text(`Status: ${payoutStatus}`, margin, y);
      y += 24;
    } else {
      doc.text('No payout scheduled for this cycle.', margin, y);
      y += 24;
    }

    // ── Member trust scores ──
    doc.setTextColor(28, 25, 23);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Member Trust Score Updates', margin, y);
    y += 14;
    doc.setDrawColor(220, 210, 190);
    doc.line(margin, y, W - margin, y);
    y += 14;

    // Table header
    doc.setFillColor(240, 234, 220);
    doc.rect(margin, y, W - margin * 2, 20, 'F');
    doc.setTextColor(80, 70, 60);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('#', margin + 6, y + 13);
    doc.text('Member', margin + 24, y + 13);
    doc.text('Status', margin + 190, y + 13);
    doc.text('Trust Score', margin + 270, y + 13);
    doc.text('Level', margin + 340, y + 13);
    doc.text('Δ This Cycle', margin + 410, y + 13);
    y += 20;

    const sorted = [...members].sort((a, b) => a.payout_position - b.payout_position);
    sorted.forEach((m, i) => {
      const rowBg = i % 2 === 0 ? [255, 252, 245] : [245, 240, 230];
      doc.setFillColor(...rowBg);
      doc.rect(margin, y, W - margin * 2, 20, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(28, 25, 23);
      doc.text(`${m.payout_position}`, margin + 6, y + 13);
      doc.text(m.full_name, margin + 24, y + 13);

      // Status color
      const statusColors = { paid: [21, 87, 36], pending: [133, 100, 4], failed: [114, 28, 36], overdue: [114, 28, 36] };
      const sc = statusColors[m.payment_status] || [60, 50, 40];
      doc.setTextColor(...sc);
      doc.text((m.payment_status || 'pending').toUpperCase(), margin + 190, y + 13);

      doc.setTextColor(28, 25, 23);
      doc.text(`${m.trust_score ?? 50}%`, margin + 270, y + 13);
      doc.text(trustLevel(m.trust_score ?? 50), margin + 340, y + 13);

      const delta = m.trust_delta ?? 0;
      doc.setTextColor(delta > 0 ? 34 : delta < 0 ? 180 : 100, delta > 0 ? 139 : 30, delta > 0 ? 34 : delta < 0 ? 30 : 80);
      doc.setFont('helvetica', 'bold');
      doc.text(delta > 0 ? `+${delta}` : `${delta}`, margin + 410, y + 13);

      y += 20;

      if (y > doc.internal.pageSize.getHeight() - 60) {
        doc.addPage();
        y = 48;
      }
    });

    y += 20;

    // ── Footer ──
    doc.setFillColor(28, 25, 23);
    doc.rect(0, doc.internal.pageSize.getHeight() - 36, W, 36, 'F');
    doc.setTextColor(150, 140, 120);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Qudi — Funds held in escrow. This report is auto-generated and does not constitute a financial statement.', margin, doc.internal.pageSize.getHeight() - 14);

    doc.save(`Qudi_${(circle.name || 'Circle').replace(/\s+/g, '_')}_Cycle${circle.current_cycle || 1}.pdf`);
    setGenerating(false);
  };

  return (
    <button
      onClick={generate}
      disabled={generating}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: generating ? C.border : C.white,
        color: C.ink, border: `1px solid ${C.border}`,
        borderRadius: 8, padding: '8px 14px',
        fontSize: 13, fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer',
      }}
    >
      {generating ? '⏳ Generating…' : '📄 Cycle PDF'}
    </button>
  );
}