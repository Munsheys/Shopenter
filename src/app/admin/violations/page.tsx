'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, XCircle, Lock } from 'lucide-react';

interface AbuseReport {
  _id: string;
  reporterEmail: string;
  reportedMerchantId: { _id: string; shopName?: string; email?: string } | string;
  violationType: string;
  description: string;
  status: 'open' | 'investigating' | 'warning_issued' | 'suspended' | 'terminated' | 'dismissed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionTaken: 'none' | 'warning' | 'suspension' | 'termination';
  createdAt: string;
  resolvedAt?: string;
}

export default function ViolationsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(true);

  const [reports, setReports] = useState<AbuseReport[]>([]);
  const [filter, setFilter] = useState<'open' | 'investigating' | 'all'>('open');
  const [error, setError] = useState('');
  const [actingOn, setActingOn] = useState<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem('sys_admin_secret');
    if (saved) {
      verifySecret(saved);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchReports();
  }, [filter, isAuthenticated]);

  async function verifySecret(secret: string) {
    setVerifying(true);
    setLoginError('');
    try {
      const res = await fetch('/api/admin/abuse-report', {
        headers: { 'x-admin-secret': secret }
      });
      if (res.ok) {
        sessionStorage.setItem('sys_admin_secret', secret);
        setIsAuthenticated(true);
      } else {
        setLoginError('Invalid Administrator Passcode.');
        sessionStorage.removeItem('sys_admin_secret');
      }
    } catch {
      setLoginError('Connection error.');
    } finally {
      setVerifying(false);
      setLoading(false);
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode.trim() || verifying) return;
    verifySecret(passcode.trim());
  }

  async function fetchReports() {
    const secret = sessionStorage.getItem('sys_admin_secret') || '';
    try {
      setLoading(true);
      const query = filter !== 'all' ? `?status=${filter}` : '';
      const res = await fetch(`/api/admin/abuse-report${query}`, {
        headers: { 'x-admin-secret': secret }
      });
      const data = await res.json();

      if (res.ok) {
        setReports(data.reports || []);
      } else {
        setError(data.error || 'Failed to fetch reports');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function takeAction(reportId: string, actionTaken: string, status: string) {
    const secret = sessionStorage.getItem('sys_admin_secret') || '';
    setActingOn(reportId);
    try {
      const res = await fetch(`/api/admin/abuse-report/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ status, actionTaken }),
      });
      if (res.ok) {
        await fetchReports();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update report');
      }
    } catch {
      setError('Network error');
    } finally {
      setActingOn(null);
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'open':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'investigating':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'warning_issued':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'suspended':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'terminated':
        return <XCircle className="w-5 h-5 text-red-700" />;
      case 'dismissed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return null;
    }
  }

  function getSeverityBadge(severity: string) {
    const colors: { [key: string]: string } = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return colors[severity] || colors.medium;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={20} className="text-gray-700" />
            <h1 className="text-xl font-bold text-gray-900">Admin Access</h1>
          </div>
          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
              {loginError}
            </div>
          )}
          <input
            type="password"
            value={passcode}
            onChange={e => setPasscode(e.target.value)}
            placeholder="Administrator passcode"
            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
            autoFocus
          />
          <button
            type="submit"
            disabled={verifying}
            className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-3 text-sm transition"
          >
            {verifying ? 'Verifying...' : 'Unlock'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Abuse Reports & Enforcement</h1>
          <p className="text-gray-600 mt-2">Review and manage policy violations reported by customers</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Filter tabs */}
        <div className="bg-white rounded-lg shadow mb-6 border-b border-gray-200">
          <div className="flex gap-8 px-6 py-4">
            {['open', 'investigating', 'all'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status as any)}
                className={`font-medium pb-2 border-b-2 transition ${
                  filter === status
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
            <p>No abuse reports found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map(report => {
              const merchantInfo = typeof report.reportedMerchantId === 'object' ? report.reportedMerchantId : null;
              return (
                <div key={report._id} className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-400">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      {getStatusIcon(report.status)}
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {report.violationType.replace(/_/g, ' ').toUpperCase()}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Shop: {merchantInfo?.shopName || merchantInfo?.email || String(report.reportedMerchantId)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Reported by: {report.reporterEmail || 'Anonymous'}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded ${getSeverityBadge(report.severity)}`}>
                      {report.severity.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-gray-700 mb-4">{report.description}</p>

                  <div className="flex gap-4 mb-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Status:</span> {report.status.replace(/_/g, ' ')}
                    </div>
                    <div>
                      <span className="font-medium">Action:</span> {report.actionTaken}
                    </div>
                    <div>
                      <span className="font-medium">Reported:</span>{' '}
                      {new Date(report.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {!['terminated', 'dismissed'].includes(report.status) && (
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                      <button
                        disabled={actingOn === report._id}
                        onClick={() => takeAction(report._id, 'none', 'investigating')}
                        className="text-xs font-medium px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
                      >
                        Mark Investigating
                      </button>
                      <button
                        disabled={actingOn === report._id}
                        onClick={() => takeAction(report._id, 'warning', 'warning_issued')}
                        className="text-xs font-medium px-3 py-1.5 rounded bg-orange-100 hover:bg-orange-200 text-orange-700 disabled:opacity-50"
                      >
                        Issue Warning
                      </button>
                      <button
                        disabled={actingOn === report._id}
                        onClick={() => takeAction(report._id, 'suspension', 'suspended')}
                        className="text-xs font-medium px-3 py-1.5 rounded bg-red-100 hover:bg-red-200 text-red-700 disabled:opacity-50"
                      >
                        Suspend (30 days)
                      </button>
                      <button
                        disabled={actingOn === report._id}
                        onClick={() => takeAction(report._id, 'termination', 'terminated')}
                        className="text-xs font-medium px-3 py-1.5 rounded bg-red-700 hover:bg-red-800 text-white disabled:opacity-50"
                      >
                        Terminate
                      </button>
                      <button
                        disabled={actingOn === report._id}
                        onClick={() => takeAction(report._id, 'none', 'dismissed')}
                        className="text-xs font-medium px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
