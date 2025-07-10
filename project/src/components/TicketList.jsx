import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../context/TicketContext';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye,
  Calendar,
  User,
  Tag,
  Trash2
} from 'lucide-react';

const TicketList = () => {
  const navigate = useNavigate();
  const { tickets, fetchTickets } = useTickets();
  const { user, getAuthHeaders } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [adminSearch, setAdminSearch] = useState('');
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'leader') {
      fetch('http://localhost:3001/api/groups', { headers: getAuthHeaders() })
        .then(res => res.ok ? res.json() : [])
        .then(setGroups);
      fetch('http://localhost:3001/api/users', { headers: getAuthHeaders() })
        .then(res => res.ok ? res.json() : [])
        .then(setUsers);
    }
  }, [user]);

  const filteredTickets = tickets.filter(ticket => {
    // Search, status, and priority filters
    const matchesSearch = 
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;

    // Admin filtering (updated)
    if (user?.role === 'admin') {
      if (selectedEntity?.type === 'group') {
        return matchesSearch && matchesStatus && matchesPriority && ticket.group_id == selectedEntity.id;
      }
      if (selectedEntity?.type === 'user') {
        return matchesSearch && matchesStatus && matchesPriority && ticket.user_id === selectedEntity.id;
      }
      // 'All Tickets' or no selection
      return matchesSearch && matchesStatus && matchesPriority;
    }

    // Leader filtering
    if (user?.role === 'leader') {
      console.log('Leader user:', user);
      console.log('All users:', users);
      console.log('All tickets:', tickets);
      // Find all user IDs in the same group
      const groupUserIds = users
        .filter(u => u.groupId === user.groupId)
        .map(u => u.id);
      // Include leader's own ID just in case (if not already included)
      if (!groupUserIds.includes(user.id)) {
        groupUserIds.push(user.id);
      }
      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        groupUserIds.includes(ticket.user_id)
      );
    }

    // Regular user filtering
    if (user?.role === 'ruser') {
      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        ticket.user_id === user.id
      );
    }

    // Default: show nothing
    return false;
  });

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

  const handleDeleteTicket = (ticket) => {
    setTicketToDelete(ticket);
  };

  const confirmDeleteTicket = async () => {
    if (!ticketToDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`http://localhost:3001/api/tickets/${ticketToDelete.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        fetchTickets();
        setTicketToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting ticket:', error);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDeleteTicket = () => setTicketToDelete(null);

  // Admin: Filtered groups and users for search
  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
    (g.location || '').toLowerCase().includes(adminSearch.toLowerCase())
  );
  const filteredNoGroupUsers = users.filter(u =>
    !u.groupId && u.role !== 'admin' && (
      (u.firstName + ' ' + u.lastName).toLowerCase().includes(adminSearch.toLowerCase()) ||
      (u.location || '').toLowerCase().includes(adminSearch.toLowerCase())
    )
  );

  // Combine groups and users for dropdown
  const allTicketsOption = { type: 'all', id: null, name: 'All Tickets', location: null };
  const groupOptions = groups.map(g => ({ type: 'group', id: g.id, name: g.name, location: g.location }));
  const userOptions = users.filter(u => !u.groupId && u.role !== 'admin').map(u => ({ type: 'user', id: u.id, name: `${u.firstName} ${u.lastName}`, location: u.location }));
  const entityOptions = [allTicketsOption, ...groupOptions, ...userOptions];

  // Default selection
  useEffect(() => {
    if (user?.role === 'admin' && !selectedEntity) {
      setSelectedEntity(allTicketsOption);
    } else if (!selectedEntity && entityOptions.length > 0) {
      setSelectedEntity(entityOptions[0]);
    }
    // eslint-disable-next-line
  }, [user, entityOptions]);

  const handleSelectEntity = (entity) => {
    setSelectedEntity(entity);
    setDropdownOpen(false);
  };

  // Before rendering, guard against null selectedEntity for admin
  if (user?.role === 'admin' && !selectedEntity) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-gray-400 text-lg">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
          <p className="text-gray-600">
            Manage and track support tickets
          </p>
        </div>
        {(user?.role === 'ruser' || user?.role === 'leader') && (
          <button
            onClick={() => navigate('/create-ticket')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Ticket
          </button>
        )}
      </div>

      {/* Admin: Selectable List View for Groups and Users Without Group */}
      {user?.role === 'admin' && (
        <div className="space-y-6">
          <div className="relative w-full max-w-full mb-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex items-center px-6 py-4 cursor-pointer w-full" onClick={() => setDropdownOpen(v => !v)}>
              {selectedEntity ? (
                <>
                  <div className="flex-1 flex flex-row items-center space-x-4">
                    <span className="font-bold text-blue-700 text-base mr-2">{selectedEntity.name}</span>
                    <span className="text-gray-500 text-sm">Location: {selectedEntity.location || '-'}</span>
                    <span className="text-gray-700 text-sm font-medium ml-4">Total: {
                      selectedEntity.type === 'group'
                        ? tickets.filter(t => t.group_id == selectedEntity.id).length
                        : selectedEntity.type === 'user'
                          ? tickets.filter(t => t.user_id === selectedEntity.id).length
                          : tickets.length
                    }</span>
                    <span className="text-gray-700 text-sm font-medium ml-2">Pending: {
                      selectedEntity.type === 'group'
                        ? tickets.filter(t => t.group_id == selectedEntity.id && t.status !== 'resolved' && t.status !== 'closed').length
                        : selectedEntity.type === 'user'
                          ? tickets.filter(t => t.user_id === selectedEntity.id && t.status !== 'resolved' && t.status !== 'closed').length
                          : tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed').length
                    }</span>
                  </div>
                  <button type="button" className="ml-4 text-gray-500 hover:text-gray-700 focus:outline-none">
                    <svg className={`h-5 w-5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </>
              ) : <span className="text-gray-400">Select group or user</span>}
            </div>
            {dropdownOpen && (
              <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {entityOptions.map(entity => {
                  let total = 0;
                  let pending = 0;
                  if (entity.type === 'group') {
                    total = tickets.filter(t => t.group_id == entity.id).length;
                    pending = tickets.filter(t => t.group_id == entity.id && t.status !== 'resolved' && t.status !== 'closed').length;
                  } else if (entity.type === 'user') {
                    total = tickets.filter(t => t.user_id === entity.id).length;
                    pending = tickets.filter(t => t.user_id === entity.id && t.status !== 'resolved' && t.status !== 'closed').length;
                  } else if (entity.type === 'all') {
                    total = tickets.length;
                    pending = tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed').length;
                  }
                  return (
                    <button
                      key={entity.type + '-' + entity.id}
                      className={`w-full text-left px-6 py-3 hover:bg-blue-50 flex flex-col ${selectedEntity && selectedEntity.type === entity.type && selectedEntity.id === entity.id ? 'bg-blue-100 font-semibold' : ''}`}
                      onClick={() => handleSelectEntity(entity)}
                    >
                      <div className="flex flex-row items-center justify-between w-full">
                        <span className="text-base text-blue-700 truncate max-w-[180px]">{entity.name}</span>
                        <div className="flex flex-row items-center space-x-4 min-w-[140px] justify-end">
                          <span className="text-gray-700 text-xs font-medium">Total: {total}</span>
                          <span className="text-gray-700 text-xs font-medium">Pending: {pending}</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 mt-1">Location: {entity.location || '-'}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                    {ticket.ticket_number || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {ticket.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        #{ticket.id} • {ticket.category}
                      </div>
                      {ticket.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {ticket.tags.slice(0, 2).map(tag => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              <Tag className="h-2 w-2 mr-1" />
                              {tag}
                            </span>
                          ))}
                          {ticket.tags.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{ticket.tags.length - 2} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="bg-blue-100 h-8 w-8 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {ticket.customerName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {ticket.customerEmail}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(ticket.createdAt).toLocaleDateString()} {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                      {user && (user.role === 'ruser' || user.role === 'leader') && ticket.user_id === user.id && (
                        <button
                          onClick={() => handleDeleteTicket(ticket)}
                          className="text-red-600 hover:text-red-900 flex items-center"
                          title="Delete Ticket"
                          disabled={deleting}
                        >
                          <Trash2 className="h-4 w-4 ml-1" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Ticket Modal */}
      {ticketToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Ticket</h3>
            <p className="mb-4 text-gray-700">Are you sure you want to delete ticket <span className="font-semibold">{ticketToDelete.ticket_number || ticketToDelete.id}</span>? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDeleteTicket}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTicket}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketList;