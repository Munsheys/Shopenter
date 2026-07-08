'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

interface AbuseReport {
  _id: string;
  reporterEmail: string;
  reportedMerchantId: string;
  violationType: string;
  description: string;
  status: 'open' | 'investigating' | 'warning_issued' | 'suspended' | 'terminated' | 'dismissed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  actionTaken: 'none' | 'warning' | 'suspension' | 'termination';
  createdAt: string;
  resolvedAt?: string;
}

export default function ViolationsPage() {
  const [reports, setReports] = useState<AbuseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'open' | 'investigating' | 'all'>('open');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReports();
  }, [filter]);

  async function fetchReports() {
    try {
      setLoading(true);
      const query = filter !== 'all' ? `?status=${filter}` : '';
      const res = await fetch(`/api/admin/abuse-report${query}`);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Abuse Reports & Enforcement</h1>
          <p className="text-gray-600 mt-2">Review and manage policy violations</p>
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

        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
            Loading reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
            <p>No abuse reports found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map(report => (
              <div key={report._id} className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-400">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    {getStatusIcon(report.status)}
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {report.violationType.replace(/_/g, ' ').toUpperCase()}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Reported by: {report.reporterEmail}
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

                <Link
                  href={`/admin/violations/${report._id}`}
                  className="text-green-600 hover:text-green-700 font-medium text-sm"
                >
                  Review & Take Action →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
