'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Award,
  Download,
  ExternalLink,
  Calendar,
  BookOpen,
  Share2,
  Copy,
  Check,
} from 'lucide-react';

type Certificate = {
  id: string;
  enrollment_id: string;
  verification_code: string;
  issued_at: string;
  expires_at: string | null;
  user_name: string;
  course_name: string;
  course_id: string;
  completed_at: string;
};

export default function MyCertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getVerifyUrl = (code: string) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/verify/${code}`;
    }
    return `/verify/${code}`;
  };

  const handleCopy = async (code: string, certId: string) => {
    try {
      await navigator.clipboard.writeText(getVerifyUrl(code));
      setCopiedId(certId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = async (cert: Certificate) => {
    // Generate a simple certificate PDF using canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size (A4 landscape proportions)
    canvas.width = 1200;
    canvas.height = 850;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 8;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    // Inner border
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.strokeRect(55, 55, canvas.width - 110, canvas.height - 110);

    // Title
    ctx.fillStyle = '#1e3a5f';
    ctx.font = 'bold 48px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('Certificate of Completion', canvas.width / 2, 150);

    // Decorative line
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(300, 180);
    ctx.lineTo(canvas.width - 300, 180);
    ctx.stroke();

    // "This is to certify that"
    ctx.fillStyle = '#666666';
    ctx.font = '24px Georgia, serif';
    ctx.fillText('This is to certify that', canvas.width / 2, 260);

    // Name
    ctx.fillStyle = '#1e3a5f';
    ctx.font = 'bold 44px Georgia, serif';
    ctx.fillText(cert.user_name, canvas.width / 2, 330);

    // "has successfully completed"
    ctx.fillStyle = '#666666';
    ctx.font = '24px Georgia, serif';
    ctx.fillText('has successfully completed the course', canvas.width / 2, 400);

    // Course name
    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 36px Georgia, serif';
    ctx.fillText(cert.course_name, canvas.width / 2, 470);

    // Date
    ctx.fillStyle = '#666666';
    ctx.font = '20px Georgia, serif';
    ctx.fillText(`Issued on ${formatDate(cert.issued_at)}`, canvas.width / 2, 560);

    // Verification code
    ctx.fillStyle = '#888888';
    ctx.font = '16px monospace';
    ctx.fillText(`Verification Code: ${cert.verification_code}`, canvas.width / 2, 620);

    // Verify URL
    ctx.fillStyle = '#2563eb';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Verify at: ${getVerifyUrl(cert.verification_code)}`, canvas.width / 2, 650);

    // Award icon (simple circle with star)
    ctx.fillStyle = '#d4af37';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 720, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('★', canvas.width / 2, 732);

    // LearnHub branding
    ctx.fillStyle = '#666666';
    ctx.font = '16px sans-serif';
    ctx.fillText('LearnHub Learning Platform', canvas.width / 2, 800);

    // Convert to image and download
    const link = document.createElement('a');
    link.download = `certificate-${cert.verification_code}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">My Certificates</h1>
        <div className="text-slate-500">Loading certificates...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">My Certificates</h1>

      {certificates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            No certificates yet
          </h2>
          <p className="text-slate-500 mb-6">
            Complete courses to earn certificates!
          </p>
          <Link
            href="/my-courses"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <BookOpen className="w-4 h-4" />
            View My Courses
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Certificate Preview */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-center">
                <Award className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-white line-clamp-2">
                  {cert.course_name}
                </h3>
              </div>

              {/* Details */}
              <div className="p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                  <Calendar className="w-4 h-4" />
                  <span>Issued {formatDate(cert.issued_at)}</span>
                </div>

                {cert.expires_at && (
                  <div className="text-sm text-amber-600 mb-3">
                    Expires {formatDate(cert.expires_at)}
                  </div>
                )}

                <div className="bg-slate-50 rounded-lg p-3 mb-4">
                  <div className="text-xs text-slate-500 mb-1">
                    Verification Code
                  </div>
                  <div className="font-mono text-sm">{cert.verification_code}</div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(cert)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={() => handleCopy(cert.verification_code, cert.id)}
                    className="flex items-center justify-center gap-2 px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm"
                  >
                    {copiedId === cert.id ? (
                      <>
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Share
                      </>
                    )}
                  </button>
                </div>

                <Link
                  href={`/verify/${cert.verification_code}`}
                  target="_blank"
                  className="mt-3 flex items-center justify-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  View Public Page
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
