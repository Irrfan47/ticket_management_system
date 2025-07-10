import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTickets } from '../context/TicketContext';
import { 
  Ticket, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Users, 
  TrendingUp,
  MessageSquare,
  Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const { user } = useAuth();
  const { tickets } = useTickets();
  const navigate = useNavigate();

  const filteredTickets = user?.role === 'ruser'
    ? tickets.filter(t => t.user_id === user.id)
    : tickets;

  const stats = {
    totalTickets: filteredTickets.length,
    openTickets: filteredTickets.filter(t => t.status === 'open').length,
    resolvedTickets: filteredTickets.filter(t => t.status === 'resolved').length,
    // Only count critical tickets that are not resolved or closed
    criticalTickets: filteredTickets.filter(t => t.priority === 'critical' && t.status !== 'resolved' && t.status !== 'closed').length,
  };

  const recentTickets = filteredTickets.slice(0, 5);

  // Pie chart data
  const pieData = [
    { name: 'Open', value: filteredTickets.filter(t => t.status === 'open').length },
    { name: 'In Progress', value: filteredTickets.filter(t => t.status === 'in-progress').length },
    { name: 'Resolved/Closed', value: filteredTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length },
  ];
  // Only show statuses with value > 0 in the pie chart
  const filteredPieData = pieData.filter(d => d.value > 0);
  const COLORS = ['#3b82f6', '#f59e42', '#10b981'];

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-gray-600">
            Here's what's happening with your helpdesk today.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="bg-blue-500 p-3 rounded-lg">
                <Ticket className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tickets</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTickets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="bg-yellow-500 p-3 rounded-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Open Tickets</p>
              <p className="text-2xl font-bold text-gray-900">{stats.openTickets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="bg-green-500 p-3 rounded-lg">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-gray-900">{stats.resolvedTickets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="bg-red-500 p-3 rounded-lg">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Critical</p>
              <p className="text-2xl font-bold text-gray-900">{stats.criticalTickets}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tickets */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Tickets</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentTickets.map((ticket) => (
                  <div key={ticket.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {ticket.title}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                          {ticket.status}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {ticket.customerName} • {new Date(ticket.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500">0</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions & Activity */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {(user?.role === 'ruser' || user?.role === 'leader') && (
              <>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
                </div>
                <div className="p-6 space-y-3">
                  <button 
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => navigate('/create-ticket')}
                  >
                    <Ticket className="h-4 w-4 mr-2" />
                    Create New Ticket
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Ticket Status Overview</h3>
            </div>
            <div className="p-6 flex flex-col items-center justify-center" style={{ minHeight: 260 }}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={filteredPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, value }) => value > 0 ? value : ''}
                  >
                    {filteredPieData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[pieData.findIndex(d => d.name === entry.name)]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              {/* Custom legend always shows all statuses with their counts and colors */}
              <div className="flex justify-center mt-4 space-x-6">
                {pieData.map((entry, idx) => (
                  <div key={entry.name} className="flex items-center space-x-2">
                    <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }}></span>
                    <span className="text-sm text-gray-700">{entry.name}:</span>
                    <span className="text-sm font-bold text-blue-700">{entry.value}</span>
                  </div>
                ))}
              </div>
              {filteredPieData.length === 0 && (
                <div className="text-gray-400 text-sm mt-4">No tickets to display</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;