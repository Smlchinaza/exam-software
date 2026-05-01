// Security Dashboard Component
// Comprehensive security monitoring and management interface

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
    Shield, 
    AlertTriangle, 
    CheckCircle, 
    XCircle, 
    Users, 
    Activity,
    Eye,
    Download,
    RefreshCw,
    Search,
    Filter,
    Calendar,
    Ban,
    Clock,
    TrendingUp,
    TrendingDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const SecurityDashboard = () => {
    const [stats, setStats] = useState({});
    const [securityEvents, setSecurityEvents] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loginAttempts, setLoginAttempts] = useState([]);
    const [activeSessions, setActiveSessions] = useState([]);
    const [analytics, setAnalytics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // Filter states
    const [eventFilters, setEventFilters] = useState({
        severity: 'all',
        event_type: 'all',
        resolved: 'all'
    });
    const [auditFilters, setAuditFilters] = useState({
        action: 'all',
        resource_type: 'all',
        date_from: '',
        date_to: ''
    });
    const [loginFilters, setLoginFilters] = useState({
        success: 'all',
        date_from: '',
        date_to: ''
    });

    useEffect(() => {
        fetchSecurityData();
    }, [activeTab]);

    const fetchSecurityData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('schoolAdminToken');
            
            if (!token) {
                toast.error('Authentication required');
                return;
            }

            const [statsResponse] = await Promise.all([
                fetch('/api/school-admin/security/dashboard/stats', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (!statsResponse.ok) {
                throw new Error('Failed to fetch security data');
            }

            const statsData = await statsResponse.json();
            setStats(statsData.data);

            // Fetch additional data based on active tab
            if (activeTab === 'events') {
                await fetchSecurityEvents();
            } else if (activeTab === 'audit') {
                await fetchAuditLogs();
            } else if (activeTab === 'sessions') {
                await fetchActiveSessions();
            } else if (activeTab === 'analytics') {
                await fetchAnalytics();
            }

        } catch (error) {
            console.error('Error fetching security data:', error);
            toast.error('Failed to load security data');
        } finally {
            setLoading(false);
        }
    };

    const fetchSecurityEvents = async () => {
        try {
            const token = localStorage.getItem('schoolAdminToken');
            const params = new URLSearchParams(eventFilters);
            const response = await fetch(`/api/school-admin/security/events?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setSecurityEvents(data.data);
            }
        } catch (error) {
            console.error('Error fetching security events:', error);
        }
    };

    const fetchAuditLogs = async () => {
        try {
            const token = localStorage.getItem('schoolAdminToken');
            const params = new URLSearchParams(auditFilters);
            const response = await fetch(`/api/school-admin/security/audit-trail?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setAuditLogs(data.data);
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        }
    };

    const fetchLoginAttempts = async () => {
        try {
            const token = localStorage.getItem('schoolAdminToken');
            const params = new URLSearchParams(loginFilters);
            const response = await fetch(`/api/school-admin/security/login-attempts?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setLoginAttempts(data.data);
            }
        } catch (error) {
            console.error('Error fetching login attempts:', error);
        }
    };

    const fetchActiveSessions = async () => {
        try {
            const token = localStorage.getItem('schoolAdminToken');
            const response = await fetch('/api/school-admin/security/active-sessions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setActiveSessions(data.data);
            }
        } catch (error) {
            console.error('Error fetching active sessions:', error);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const token = localStorage.getItem('schoolAdminToken');
            const response = await fetch('/api/school-admin/security/analytics?period=30', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setAnalytics(data.data);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        }
    };

    const handleResolveEvent = async (eventId, resolutionNotes) => {
        try {
            const token = localStorage.getItem('schoolAdminToken');
            const response = await fetch(`/api/school-admin/security/events/${eventId}/resolve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ resolution_notes })
            });

            if (response.ok) {
                toast.success('Security event resolved successfully');
                fetchSecurityEvents();
            } else {
                throw new Error('Failed to resolve event');
            }
        } catch (error) {
            console.error('Error resolving event:', error);
            toast.error('Failed to resolve security event');
        }
    };

    const handleTerminateSession = async (sessionId) => {
        if (!confirm('Are you sure you want to terminate this session?')) {
            return;
        }

        try {
            const token = localStorage.getItem('schoolAdminToken');
            const response = await fetch(`/api/school-admin/security/sessions/${sessionId}/terminate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                toast.success('Session terminated successfully');
                fetchActiveSessions();
            } else {
                throw new Error('Failed to terminate session');
            }
        } catch (error) {
            console.error('Error terminating session:', error);
            toast.error('Failed to terminate session');
        }
    };

    const handleExport = async (type) => {
        try {
            const token = localStorage.getItem('schoolAdminToken');
            const response = await fetch(`/api/school-admin/security/export?type=${type}&format=csv`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${type}-export-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                toast.success('Data exported successfully');
            } else {
                throw new Error('Failed to export data');
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            toast.error('Failed to export data');
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'critical': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'low': return <Shield className="h-4 w-4" />;
            case 'medium': return <AlertTriangle className="h-4 w-4" />;
            case 'high': return <XCircle className="h-4 w-4" />;
            case 'critical': return <Ban className="h-4 w-4" />;
            default: return <Shield className="h-4 w-4" />;
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatNumber = (num) => {
        return num ? num.toLocaleString() : '0';
    };

    if (loading && activeTab === 'overview') {
        return (
            <div className="p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-24 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Security Dashboard</h1>
                    <p className="text-gray-600 mt-1">Monitor and manage security for your school</p>
                </div>
                <div className="flex items-center space-x-3">
                    <Button variant="outline" onClick={fetchSecurityData}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Select onValueChange={(value) => handleExport(value)}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Export" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="events">Security Events</SelectItem>
                            <SelectItem value="audit">Audit Trail</SelectItem>
                            <SelectItem value="login">Login Attempts</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {['overview', 'events', 'audit', 'sessions', 'analytics'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`
                                py-2 px-1 border-b-2 font-medium text-sm capitalize
                                ${activeTab === tab
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }
                            `}
                        >
                            {tab}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <>
                    {/* Security Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Total Logins (7 days)</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {formatNumber(stats.total_logins_week)}
                                        </p>
                                        <p className="text-xs text-green-600 mt-1">
                                            {formatNumber(stats.successful_logins_week)} successful
                                        </p>
                                    </div>
                                    <Users className="h-8 w-8 text-blue-500" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Failed Logins (7 days)</p>
                                        <p className="text-2xl font-bold text-red-600">
                                            {formatNumber(stats.failed_logins_week)}
                                        </p>
                                        <p className="text-xs text-red-600 mt-1">
                                            Requires attention
                                        </p>
                                    </div>
                                    <XCircle className="h-8 w-8 text-red-500" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Security Events</p>
                                        <p className="text-2xl font-bold text-orange-600">
                                            {formatNumber(stats.security_events_week)}
                                        </p>
                                        <p className="text-xs text-orange-600 mt-1">
                                            {formatNumber(stats.high_severity_events_week)} high severity
                                        </p>
                                    </div>
                                    <AlertTriangle className="h-8 w-8 text-orange-500" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                                        <p className="text-2xl font-bold text-green-600">
                                            {formatNumber(stats.active_sessions_today)}
                                        </p>
                                        <p className="text-xs text-green-600 mt-1">
                                            {formatNumber(stats.unique_users_today)} unique users
                                        </p>
                                    </div>
                                    <Activity className="h-8 w-8 text-green-500" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recent Security Events */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-lg">Recent Security Events</CardTitle>
                            <Button variant="outline" size="sm">
                                View All
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {securityEvents.slice(0, 5).map((event) => (
                                    <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <Badge className={getSeverityColor(event.severity)}>
                                                {getSeverityIcon(event.severity)}
                                                <span className="ml-1 capitalize">{event.severity}</span>
                                            </Badge>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{event.description}</p>
                                                <p className="text-xs text-gray-500">
                                                    {event.user_name || 'System'} • {formatDate(event.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                        {!event.resolved && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    const notes = prompt('Enter resolution notes:');
                                                    if (notes) handleResolveEvent(event.id, notes);
                                                }}
                                            >
                                                Resolve
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Security Events Tab */}
            {activeTab === 'events' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Security Events</CardTitle>
                        <div className="flex flex-col sm:flex-row gap-4 mt-4">
                            <Select value={eventFilters.severity} onValueChange={(value) => setEventFilters(prev => ({ ...prev, severity: value }))}>
                                <SelectTrigger className="w-full sm:w-40">
                                    <SelectValue placeholder="Severity" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Severities</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={eventFilters.resolved} onValueChange={(value) => setEventFilters(prev => ({ ...prev, resolved: value }))}>
                                <SelectTrigger className="w-full sm:w-40">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="true">Resolved</SelectItem>
                                    <SelectItem value="false">Unresolved</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button onClick={fetchSecurityEvents}>
                                <Search className="h-4 w-4 mr-2" />
                                Apply Filters
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {securityEvents.map((event) => (
                                <SecurityEventCard
                                    key={event.id}
                                    event={event}
                                    onResolve={handleResolveEvent}
                                    getSeverityColor={getSeverityColor}
                                    getSeverityIcon={getSeverityIcon}
                                    formatDate={formatDate}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Audit Trail Tab */}
            {activeTab === 'audit' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Audit Trail</CardTitle>
                        <div className="flex flex-col sm:flex-row gap-4 mt-4">
                            <Input
                                type="date"
                                placeholder="From date"
                                value={auditFilters.date_from}
                                onChange={(e) => setAuditFilters(prev => ({ ...prev, date_from: e.target.value }))}
                            />
                            <Input
                                type="date"
                                placeholder="To date"
                                value={auditFilters.date_to}
                                onChange={(e) => setAuditFilters(prev => ({ ...prev, date_to: e.target.value }))}
                            />
                            <Button onClick={fetchAuditLogs}>
                                <Search className="h-4 w-4 mr-2" />
                                Apply Filters
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {auditLogs.map((log) => (
                                <AuditLogCard
                                    key={log.id}
                                    log={log}
                                    formatDate={formatDate}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Active Sessions Tab */}
            {activeTab === 'sessions' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Active Sessions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {activeSessions.map((session) => (
                                <SessionCard
                                    key={session.id}
                                    session={session}
                                    onTerminate={handleTerminateSession}
                                    formatDate={formatDate}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Security Analytics (30 days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {analytics.map((data) => (
                                <div key={data.date} className="border-b pb-4 last:border-b-0">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-gray-900">{formatDate(data.date)}</p>
                                            <p className="text-sm text-gray-600 mt-1">
                                                Login attempts: {data.login_attempts} | 
                                                Failed: {data.failed_logins} | 
                                                Security events: {data.security_events}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-medium ${
                                                data.failure_rate > 10 ? 'text-red-600' : 'text-green-600'
                                            }`}>
                                                Failure rate: {data.failure_rate}%
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

// Security Event Card Component
const SecurityEventCard = ({ event, onResolve, getSeverityColor, getSeverityIcon, formatDate }) => {
    return (
        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <Badge className={getSeverityColor(event.severity)}>
                            {getSeverityIcon(event.severity)}
                            <span className="ml-1 capitalize">{event.severity}</span>
                        </Badge>
                        <Badge variant={event.resolved ? 'default' : 'secondary'}>
                            {event.resolved ? 'Resolved' : 'Open'}
                        </Badge>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{event.description}</h3>
                    <div className="space-y-1 text-sm text-gray-600">
                        {event.user_name && <p>User: {event.user_name}</p>}
                        {event.ip_address && <p>IP: {event.ip_address}</p>}
                        <p>Created: {formatDate(event.created_at)}</p>
                        {event.resolved && event.resolved_at && (
                            <p>Resolved: {formatDate(event.resolved_at)}</p>
                        )}
                    </div>
                </div>
                {!event.resolved && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                            const notes = prompt('Enter resolution notes:');
                            if (notes) onResolve(event.id, notes);
                        }}
                    >
                        Resolve
                    </Button>
                )}
            </div>
        </div>
    );
};

// Audit Log Card Component
const AuditLogCard = ({ log, formatDate }) => {
    const getActionColor = (action) => {
        switch (action) {
            case 'CREATE': return 'bg-green-100 text-green-800';
            case 'UPDATE': return 'bg-blue-100 text-blue-800';
            case 'DELETE': return 'bg-red-100 text-red-800';
            case 'LOGIN': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <Badge className={getActionColor(log.action)}>
                            {log.action}
                        </Badge>
                        <Badge variant="outline">
                            {log.resource_type}
                        </Badge>
                        <Badge variant={log.success ? 'default' : 'destructive'}>
                            {log.success ? 'Success' : 'Failed'}
                        </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                        {log.user_name && <p>User: {log.user_name}</p>}
                        {log.admin_name && <p>Admin: {log.admin_name}</p>}
                        {log.ip_address && <p>IP: {log.ip_address}</p>}
                        <p>Created: {formatDate(log.created_at)}</p>
                        {log.error_message && (
                            <p className="text-red-600">Error: {log.error_message}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Session Card Component
const SessionCard = ({ session, onTerminate, formatDate }) => {
    const getIdleTime = (idleSeconds) => {
        if (idleSeconds < 60) return `${Math.round(idleSeconds)}s`;
        if (idleSeconds < 3600) return `${Math.round(idleSeconds / 60)}m`;
        return `${Math.round(idleSeconds / 3600)}h`;
    };

    return (
        <div className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline">
                            {session.role}
                        </Badge>
                        <Badge variant="outline">
                            Active
                        </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                        <p>User: {session.user_name}</p>
                        <p>Email: {session.user_email}</p>
                        <p>IP: {session.ip_address}</p>
                        <p>Started: {formatDate(session.created_at)}</p>
                        <p>Last activity: {formatDate(session.last_activity)}</p>
                        <p>Idle for: {getIdleTime(session.idle_seconds)}</p>
                    </div>
                </div>
                <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onTerminate(session.id)}
                >
                    Terminate
                </Button>
            </div>
        </div>
    );
};

export default SecurityDashboard;
