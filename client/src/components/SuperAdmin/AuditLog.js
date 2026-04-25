import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Eye, 
  Search, 
  Filter, 
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Ban,
  RefreshCw,
  Loader2
} from 'lucide-react';

const AuditLog = () => {
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(50);

  useEffect(() => {
    fetchAuditLog();
  }, [actionFilter, page]);

  const fetchAuditLog = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        limit: pageSize,
        offset: page * pageSize
      });

      if (actionFilter !== 'all') {
        params.append('action', actionFilter);
      }

      const response = await fetch(`/api/super-admin/audit-log?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit log');
      }

      const data = await response.json();
      setAuditLog(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'suspended':
        return <Ban className="h-4 w-4 text-gray-600" />;
      case 'reactivated':
        return <RefreshCw className="h-4 w-4 text-blue-600" />;
      case 'modified':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Eye className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-gray-100 text-gray-800';
      case 'reactivated': return 'bg-blue-100 text-blue-800';
      case 'modified': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const exportAuditLog = () => {
    const csvContent = [
      ['Date', 'Action', 'School', 'Performed By', 'Performer Email', 'Reason', 'IP Address'],
      ...auditLog.auditLog?.map(entry => [
        formatDate(entry.performed_at),
        entry.action,
        entry.school_name,
        entry.performer_name,
        entry.performer_email,
        entry.reason || 'N/A',
        entry.ip_address || 'N/A'
      ]) || []
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredAuditLog = auditLog.auditLog?.filter(entry =>
    entry.school_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.performer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.performer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading && auditLog.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Log</h2>
          <p className="text-gray-600 mt-1">
            Complete history of all administrative actions and decisions
          </p>
        </div>
        <Button onClick={exportAuditLog} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search audit log..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="reactivated">Reactivated</SelectItem>
                <SelectItem value="modified">Modified</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Administrative Actions</CardTitle>
          <p className="text-sm text-gray-600">
            Showing {filteredAuditLog.length} of {auditLog.pagination?.total || 0} actions
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredAuditLog.length === 0 ? (
            <div className="text-center py-8">
              <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No audit entries found</h3>
              <p className="text-gray-600">
                {searchTerm || actionFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'No administrative actions have been recorded yet'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Date & Time</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Action</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">School</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Performed By</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Reason</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditLog.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-600">
                        {formatDate(entry.performed_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {getActionIcon(entry.action)}
                          <Badge className={getActionColor(entry.action)}>
                            {entry.action}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-900 font-medium">
                        {entry.school_name}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="text-gray-900">{entry.performer_name}</div>
                          <div className="text-xs text-gray-600">{entry.performer_email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                        {entry.reason || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {entry.ip_address || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {auditLog.pagination && auditLog.pagination.total > pageSize && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, auditLog.pagination.total)} of {auditLog.pagination.total} actions
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {page + 1} of {Math.ceil(auditLog.pagination.total / pageSize)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={!auditLog.pagination.hasMore}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLog;
