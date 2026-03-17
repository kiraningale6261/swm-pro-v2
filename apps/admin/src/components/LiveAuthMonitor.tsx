'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Activity, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface OTPRecord {
  id: number;
  mobile: string;
  otp_code: string;
  is_verified: boolean;
  attempts: number;
  expires_at: string;
  created_at: string;
}

export default function LiveAuthMonitor() {
  const [otpRecords, setOtpRecords] = useState<OTPRecord[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch latest OTP records
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['otp-records'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('otp_records')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        return (data as OTPRecord[]) || [];
      } catch (error) {
        console.error('Error fetching OTP records:', error);
        return [];
      }
    },
    refetchInterval: autoRefresh ? 5000 : false, // Refresh every 5 seconds if enabled
  });

  useEffect(() => {
    setOtpRecords(records);
  }, [records]);

  const getStatusIcon = (record: OTPRecord) => {
    if (record.is_verified) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
    if (record.attempts >= 3) {
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
    return <Activity className="w-4 h-4 text-yellow-600" />;
  };

  const getStatusText = (record: OTPRecord) => {
    if (record.is_verified) return 'Verified';
    if (record.attempts >= 3) return 'Blocked';
    return 'Pending';
  };

  const getStatusColor = (record: OTPRecord) => {
    if (record.is_verified) return 'bg-green-50 border-green-200';
    if (record.attempts >= 3) return 'bg-red-50 border-red-200';
    return 'bg-yellow-50 border-yellow-200';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="glass-card-lg p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-sky-600" />
          <h2 className="text-2xl font-bold text-gray-800">Live Auth Monitor</h2>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span className="text-sm text-gray-700">Auto-refresh</span>
        </label>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{otpRecords.filter((r) => r.is_verified).length}</p>
          <p className="text-xs text-gray-600 mt-1">Verified</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{otpRecords.filter((r) => !r.is_verified && r.attempts < 3).length}</p>
          <p className="text-xs text-gray-600 mt-1">Pending</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{otpRecords.filter((r) => r.attempts >= 3).length}</p>
          <p className="text-xs text-gray-600 mt-1">Blocked</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-sky-600">{otpRecords.length}</p>
          <p className="text-xs text-gray-600 mt-1">Total</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent OTP Requests</h3>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading...</p>
          </div>
        ) : otpRecords.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No OTP records yet</p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-2">
            {otpRecords.map((record) => (
              <div
                key={record.id}
                className={`glass-card p-3 border-l-4 transition-all ${getStatusColor(record)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(record)}
                      <span className="font-semibold text-gray-800">{record.mobile}</span>
                      <span className="text-xs px-2 py-1 rounded-full bg-white/50 text-gray-600">
                        {getStatusText(record)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-600 ml-6">
                      <span>OTP: {record.otp_code}</span>
                      <span>Attempts: {record.attempts}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(record.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-white/20">
        <p className="text-xs text-gray-600 mb-3 font-semibold">Status Legend</p>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-gray-700">OTP verified</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-yellow-600" />
            <span className="text-gray-700">Awaiting verification</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-gray-700">Too many attempts</span>
          </div>
        </div>
      </div>

      {/* Real-time Indicator */}
      <div className="mt-4 flex items-center gap-2 text-xs text-gray-600">
        <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
        <span>{autoRefresh ? 'Live updates enabled' : 'Live updates disabled'}</span>
      </div>
    </div>
  );
}
