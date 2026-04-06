/**
 * Compliance Dashboard — GRA/BoG Reporting
 * Audit trail, VAT export, payout reports
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ComplianceAudit } from '@/lib/complianceAudit';
import { FileText, CheckCircle, AlertCircle, Download } from 'lucide-react';
import OfflineSyncBanner from '@/components/OfflineSyncBanner';

export default function ComplianceDashboard() {
  const navigate = useNavigate();
  const [audit] = useState(new ComplianceAudit('shop-001', 'user-001'));
  const [report, setReport] = useState(null);
  const [integrity, setIntegrity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompliance();
  }, []);

  const loadCompliance = async () => {
    setLoading(true);
    try {
      const comp = audit.exportForCompliance();
      setReport(comp);
      setIntegrity(comp.integrity);
    } catch (err) {
      console.error('Compliance load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadVATReturn = () => {
    if (!report?.vatReturn) return;
    const csv = `Period,Total Revenue (GHS),Total VAT (GHS),Transactions\n${report.vatReturn.period},${report.vatReturn.totalRevenue},${report.vatReturn.totalVAT},${report.vatReturn.transactions}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VAT-Return-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const downloadBoGReport = () => {
    if (!report?.bogReport) return;
    const json = JSON.stringify(report.bogReport, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BoG-Payout-Report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <OfflineSyncBanner />

      <div className="bg-primary text-white p-4 sticky top-0 z-40">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6" />
          Compliance & Audit
        </h1>
        <p className="text-sm text-primary-light">GRA + Bank of Ghana Reporting</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-foreground/60">Loading audit trail...</p>
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-6">
          {/* Integrity Status */}
          <div className={`rounded-lg p-4 border-2 ${integrity?.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-start gap-3">
              {integrity?.valid ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              )}
              <div>
                <h3 className={`font-semibold ${integrity?.valid ? 'text-green-900' : 'text-red-900'}`}>
                  {integrity?.valid ? 'Audit Trail Verified' : 'Integrity Issue'}
                </h3>
                <p className={`text-sm ${integrity?.valid ? 'text-green-800' : 'text-red-800'}`}>
                  {integrity?.message}
                </p>
              </div>
            </div>
          </div>

          {/* VAT Return */}
          {report?.vatReturn && (
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-lg">VAT Return (Monthly)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-foreground/60 uppercase">Total Revenue</p>
                  <p className="text-xl font-bold text-primary">GHS {report.vatReturn.totalRevenue?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground/60 uppercase">Total VAT</p>
                  <p className="text-xl font-bold text-accent">GHS {report.vatReturn.totalVAT?.toFixed(2)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-foreground/60 uppercase">Transactions</p>
                  <p className="text-lg font-semibold">{report.vatReturn.transactions}</p>
                </div>
              </div>
              <button
                onClick={downloadVATReturn}
                className="w-full bg-primary text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-primary-light transition"
              >
                <Download className="w-4 h-4" />
                Export VAT Return (CSV)
              </button>
            </div>
          )}

          {/* Bank of Ghana Report */}
          {report?.bogReport && (
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-lg">Bank of Ghana Payout Report</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-foreground/60 uppercase">Total Payouts</p>
                  <p className="text-xl font-bold text-primary">GHS {report.bogReport.totalPayouts?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-foreground/60 uppercase">Count</p>
                  <p className="text-lg font-semibold">{report.bogReport.payoutCount}</p>
                </div>
              </div>
              <button
                onClick={downloadBoGReport}
                className="w-full bg-primary text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-primary-light transition"
              >
                <Download className="w-4 h-4" />
                Export BoG Report (JSON)
              </button>
            </div>
          )}

          {/* Audit Hash */}
          {report?.vatReturn?.auditHash && (
            <div className="bg-muted rounded-lg p-4">
              <p className="text-xs text-foreground/60 uppercase mb-1">Cryptographic Audit Hash</p>
              <p className="font-mono text-xs break-all text-foreground">{report.vatReturn.auditHash}</p>
              <p className="text-xs text-foreground/50 mt-2">Hash chain verifies transaction integrity for regulatory compliance</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}