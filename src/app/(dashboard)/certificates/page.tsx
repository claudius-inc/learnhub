'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Award,
  Search,
  Download,
  ExternalLink,
  User,
  BookOpen,
} from 'lucide-react';

type Certificate = {
  id: string;
  enrollment_id: string;
  verification_code: string;
  issued_at: string;
  expires_at: string | null;
  user_name: string;
  user_email: string;
  course_name: string;
  course_id: string;
  completed_at: string;
};

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filteredCertificates, setFilteredCertificates] = useState<Certificate[]>([]);

  useEffect(() => {
    const fetchCertificates = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/certificates');
        const data = await res.json();
        setCertificates(data.certificates || []);
      } catch (err) {
        console.error('Failed to load certificates:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCertificates();
  }, []);

  useEffect(() => {
    if (!search) {
      setFilteredCertificates(certificates);
      return;
    }

    const lower = search.toLowerCase();
    setFilteredCertificates(
      certificates.filter(
        (c) =>
          c.user_name.toLowerCase().includes(lower) ||
          c.user_email.toLowerCase().includes(lower) ||
          c.course_name.toLowerCase().includes(lower) ||
          c.verification_code.toLowerCase().includes(lower)
      )
    );
  }, [certificates, search]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleExportCSV = () => {
    const headers = ['User Name', 'Email', 'Course', 'Verification Code', 'Issued Date', 'Expires'];
    const rows = filteredCertificates.map((c) => [
      c.user_name,
      c.user_email,
      c.course_name,
      c.verification_code,
      formatDate(c.issued_at),
      c.expires_at ? formatDate(c.expires_at) : 'Never',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificates-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div>
      {/* Header - stack on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Certificates</h1>
        <button
          onClick={handleExportCSV}
          disabled={filteredCertificates.length === 0}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 w-full sm:w-auto"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 md:mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, course, or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Stats - stack on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 md:mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xl md:text-2xl font-bold text-slate-900">{certificates.length}</div>
          <div className="text-sm text-slate-500">Total Certificates</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xl md:text-2xl font-bold text-slate-900">
            {new Set(certificates.map((c) => c.user_email)).size}
          </div>
          <div className="text-sm text-slate-500">Unique Recipients</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xl md:text-2xl font-bold text-slate-900">
            {new Set(certificates.map((c) => c.course_id)).size}
          </div>
          <div className="text-sm text-slate-500">Courses with Certificates</div>
        </div>
      </div>

      {/* Certificates - Card view on mobile, table on desktop */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading certificates...</div>
        ) : filteredCertificates.length === 0 ? (
          <div className="p-8 text-center">
            <Award className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">
              {search ? 'No certificates found' : 'No certificates issued yet'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="md:hidden divide-y divide-slate-200">
              {filteredCertificates.map((cert) => {
                const isExpired =
                  cert.expires_at && new Date(cert.expires_at) < new Date();

                return (
                  <div key={cert.id} className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 text-sm truncate">
                            {cert.user_name}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {cert.user_email}
                          </div>
                        </div>
                      </div>
                      {isExpired ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs shrink-0">
                          Expired
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs shrink-0">
                          Valid
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                      <BookOpen className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{cert.course_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-slate-500">
                        <code className="px-1.5 py-0.5 bg-slate-100 rounded">
                          {cert.verification_code}
                        </code>
                        <span className="ml-2">{formatDate(cert.issued_at)}</span>
                      </div>
                      <Link
                        href={`/verify/${cert.verification_code}`}
                        target="_blank"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        View
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">
                      Recipient
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">
                      Course
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">
                      Code
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">
                      Issued
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredCertificates.map((cert) => {
                    const isExpired =
                      cert.expires_at && new Date(cert.expires_at) < new Date();

                    return (
                      <tr key={cert.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-slate-500" />
                            </div>
                            <div>
                              <div className="font-medium text-slate-900 text-sm">
                                {cert.user_name}
                              </div>
                              <div className="text-xs text-slate-500">
                                {cert.user_email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-900 text-sm">{cert.course_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <code className="px-2 py-1 bg-slate-100 rounded text-xs">
                            {cert.verification_code}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatDate(cert.issued_at)}
                        </td>
                        <td className="px-4 py-3">
                          {isExpired ? (
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                              Expired
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                              Valid
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/verify/${cert.verification_code}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                          >
                            View
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
