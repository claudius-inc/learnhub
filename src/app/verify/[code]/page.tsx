'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  User,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type VerificationResult = {
  valid: boolean;
  expired?: boolean;
  error?: string;
  certificate?: {
    verification_code: string;
    user_name: string;
    course_name: string;
    issued_at: string;
    expires_at: string | null;
    completed_at?: string;
  };
};

export default function VerifyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verify = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/certificates/verify?code=${code}`);
        const data = await res.json();
        setResult(data);
      } catch (err) {
        console.error('Verification failed:', err);
        setResult({ valid: false, error: 'Failed to verify certificate' });
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [code]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500">Verifying certificate...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
            <Award className="w-6 h-6 text-blue-600" />
            LearnHub
          </Link>
          <span className="text-sm text-slate-500">Certificate Verification</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        {/* Valid Certificate */}
        {result?.valid && result.certificate && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Success Banner */}
            <div className="bg-green-600 text-white px-6 py-4 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6" />
              <div>
                <h1 className="font-semibold">Certificate Verified</h1>
                <p className="text-green-100 text-sm">
                  This certificate is authentic and valid
                </p>
              </div>
            </div>

            {/* Certificate Details */}
            <div className="p-8">
              {/* Decorative Border */}
              <div className="border-4 border-double border-slate-200 rounded-xl p-8 bg-gradient-to-br from-white to-slate-50">
                <div className="text-center mb-8">
                  <Award className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-serif text-slate-800">
                    Certificate of Completion
                  </h2>
                </div>

                <div className="text-center mb-8">
                  <p className="text-slate-500 mb-2">This is to certify that</p>
                  <p className="text-3xl font-semibold text-slate-900 mb-4">
                    {result.certificate.user_name}
                  </p>
                  <p className="text-slate-500 mb-2">
                    has successfully completed the course
                  </p>
                  <p className="text-xl font-medium text-blue-700">
                    {result.certificate.course_name}
                  </p>
                </div>

                <div className="flex justify-center gap-8 text-sm text-slate-500 border-t border-slate-200 pt-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Issued: {formatDate(result.certificate.issued_at)}
                    </span>
                  </div>
                  {result.certificate.expires_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Expires: {formatDate(result.certificate.expires_at)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-6 text-center">
                  <span className="inline-block px-4 py-2 bg-slate-100 rounded-lg font-mono text-sm text-slate-600">
                    Verification Code: {result.certificate.verification_code}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expired Certificate */}
        {result?.expired && result.certificate && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-amber-500 text-white px-6 py-4 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6" />
              <div>
                <h1 className="font-semibold">Certificate Expired</h1>
                <p className="text-amber-100 text-sm">
                  This certificate has passed its expiration date
                </p>
              </div>
            </div>

            <div className="p-8 text-center">
              <div className="mb-6">
                <User className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-lg font-medium text-slate-900">
                  {result.certificate.user_name}
                </p>
              </div>

              <div className="mb-6">
                <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-lg text-slate-700">
                  {result.certificate.course_name}
                </p>
              </div>

              <div className="text-sm text-slate-500">
                <p>Issued: {formatDate(result.certificate.issued_at)}</p>
                {result.certificate.expires_at && (
                  <p className="text-red-500 font-medium">
                    Expired: {formatDate(result.certificate.expires_at)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Invalid / Not Found */}
        {!result?.valid && !result?.expired && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-red-600 text-white px-6 py-4 flex items-center gap-3">
              <XCircle className="w-6 h-6" />
              <div>
                <h1 className="font-semibold">Certificate Not Found</h1>
                <p className="text-red-100 text-sm">
                  {result?.error || 'This verification code is not valid'}
                </p>
              </div>
            </div>

            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <p className="text-slate-600 mb-4">
                The verification code <code className="bg-slate-100 px-2 py-1 rounded">{code}</code> could not be found in our system.
              </p>
              <p className="text-sm text-slate-500">
                Please check the code and try again, or contact the certificate holder.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p className="mb-2">
            This verification page confirms the authenticity of certificates issued by LearnHub.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
          >
            Learn more about LearnHub
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </main>
    </div>
  );
}
