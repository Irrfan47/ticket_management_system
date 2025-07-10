import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTickets } from '../context/TicketContext';
import { useAuth } from '../context/AuthContext';
import { useRef } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  Clock, 
  MessageSquare, 
  Edit,
  Send,
  Paperclip,
  Tag,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getTicketById, fetchComments, getCommentsByTicketId, addComment, updateTicket } = useTickets();
  const { user, getAuthHeaders } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState('');
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [commentAttachments, setCommentAttachments] = useState({});
  const [selectedCommentFiles, setSelectedCommentFiles] = useState([]);
  const [commentFileSizeWarning, setCommentFileSizeWarning] = useState('');
  const commentFileInputRef = useRef();

  const ticket = id ? getTicketById(id) : null;
  const comments = id ? getCommentsByTicketId(id) : [];

  useEffect(() => {
    if (id) {
      fetchComments(id);
    }
  }, [id, fetchComments]);

  useEffect(() => {
    setLocalStatus(ticket?.status || '');
  }, [ticket?.status]);

  useEffect(() => {
    if (ticket?.id) {
      fetch(`http://localhost:3001/api/tickets/${ticket.id}/attachments`, {
        headers: getAuthHeaders(),
      })
        .then(res => res.ok ? res.json() : [])
        .then(setAttachments);
    }
  }, [ticket?.id]);

  // Fetch attachments for all comments
  useEffect(() => {
    if (comments.length > 0) {
      Promise.all(
        comments.map(comment =>
          fetch(`http://localhost:3001/api/comments/${comment.id}/attachments`, {
            headers: getAuthHeaders(),
          })
            .then(res => res.ok ? res.json() : [])
        )
      ).then(results => {
        // results is an array of arrays, one per comment
        setCommentAttachments(
          comments.reduce((acc, comment, idx) => {
            acc[comment.id] = results[idx];
            return acc;
          }, {})
        );
      });
    }
  }, [comments]);

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">
          <AlertCircle className="h-12 w-12 mx-auto mb-4" />
          <p className="text-lg font-medium">Ticket not found</p>
          <p className="text-sm">The ticket you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const handleCommentFileChange = (e) => {
    const files = Array.from(e.target.files);
    const tooLarge = files.find(file => file.size > 2 * 1024 * 1024);
    if (tooLarge) {
      setCommentFileSizeWarning('Each file must be 2MB or less.');
      return;
    }
    setCommentFileSizeWarning('');
    setSelectedCommentFiles(prev => {
      const existing = prev.map(f => f.name + f.size);
      const newFiles = files.filter(f => !existing.includes(f.name + f.size));
      return [...prev, ...newFiles];
    });
    e.target.value = '';
  };

  const removeCommentAttachment = (fileToRemove) => {
    setSelectedCommentFiles(prev => prev.filter(file => file !== fileToRemove));
  };

  const handleCommentBrowseClick = () => {
    commentFileInputRef.current.click();
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append('content', newComment.trim());
      selectedCommentFiles.forEach(file => form.append('attachments', file));
      const res = await fetch(`http://localhost:3001/api/tickets/${ticket.id}/comments`, {
        method: 'POST',
        headers: { 'Authorization': getAuthHeaders().Authorization },
        body: form,
      });
      if (res.ok) {
        fetchComments(ticket.id);
        setNewComment('');
        setSelectedCommentFiles([]);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    if (user?.role === 'admin') {
      setPendingStatus(newStatus);
      setShowStatusConfirm(true);
    } else {
      setLocalStatus(newStatus);
      updateTicket(ticket.id, {
        status: newStatus,
        priority: ticket.priority
      });
    }
  };

  const confirmStatusChange = async () => {
    setStatusLoading(true);
    setLocalStatus(pendingStatus);
    await updateTicket(ticket.id, {
      status: pendingStatus,
      priority: ticket.priority
    });
    setShowStatusConfirm(false);
    setStatusLoading(false);
  };

  const cancelStatusChange = () => {
    setShowStatusConfirm(false);
    setPendingStatus('');
  };

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

  const handleDownload = async (att) => {
    try {
      const res = await fetch(`http://localhost:3001/uploads/${att.id}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        alert('Failed to download file');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.original_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Download error');
    }
  };

  const handleCommentAttachmentDownload = async (att) => {
    try {
      const res = await fetch(`http://localhost:3001/uploads/${att.id}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        alert('Failed to download file');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.original_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Download error');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/tickets')}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{ticket.title}</h1>
            <p className="text-gray-600">Ticket #{ticket.id}</p>
          </div>
        </div>
        
        {user?.role === 'admin' ? (
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700">Change Status</span>
            <select
              value={localStatus}
              onChange={handleStatusChange}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
              {ticket.status}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Ticket Details</h2>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                  {ticket.status}
                </span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                  {ticket.priority}
                </span>
              </div>
            </div>
            
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
            </div>

            {ticket.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {ticket.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                  >
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {attachments.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Attachments</h4>
                <ul>
                  {attachments.map(att => (
                    <li key={att.id}>
                      <button
                        onClick={() => handleDownload(att)}
                        className="text-blue-600 hover:underline"
                      >
                        {att.original_name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Comments</h3>
            </div>
            
            <div className="p-6 space-y-4">
              {comments.map(comment => (
                <div
                  key={comment.id}
                  className={`p-4 rounded-lg ${
                    comment.isInternal 
                      ? 'bg-yellow-50 border-l-4 border-yellow-400' 
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {comment.userName}
                      </span>
                      {comment.isInternal && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                          Internal
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">
                    {comment.content}
                  </p>
                  {commentAttachments[comment.id] && commentAttachments[comment.id].length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs font-semibold">Attachments:</span>
                      <ul>
                        {commentAttachments[comment.id].map(att => (
                          <li key={att.id}>
                            <button
                              onClick={() => handleCommentAttachmentDownload(att)}
                              className="text-blue-600 hover:underline text-xs"
                            >
                              {att.original_name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add Comment Form */}
            <div className="border-t border-gray-200 p-6">
              <form onSubmit={handleAddComment} className="space-y-4">
                <div>
                  <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                    Add a comment
                  </label>
                  <textarea
                    id="comment"
                    rows={4}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Write your comment here..."
                    required
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <input
                      type="file"
                      multiple
                      ref={commentFileInputRef}
                      style={{ display: 'none' }}
                      onChange={handleCommentFileChange}
                    />
                    <button
                      type="button"
                      className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
                      onClick={handleCommentBrowseClick}
                    >
                      <Paperclip className="h-4 w-4 mr-1" />
                      Attach file
                    </button>
                    {selectedCommentFiles.length > 0 && (
                      <ul className="ml-2 text-xs text-gray-700">
                        {selectedCommentFiles.map((file, idx) => (
                          <li key={idx} className="flex items-center">
                            <span>{file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeCommentAttachment(file)}
                              className="ml-1 text-red-600 hover:text-red-800 font-bold text-lg focus:outline-none"
                              aria-label="Remove file"
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {commentFileSizeWarning && (
                    <div className="text-red-600 text-xs mb-2">{commentFileSizeWarning}</div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={loading || !newComment.trim()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="bg-blue-100 h-10 w-10 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{ticket.customerName}</p>
                  <p className="text-sm text-gray-500">{ticket.customerEmail}</p>
                  <p className="text-sm text-gray-500">Group: {ticket.groupName || '-'}</p>
                  <p className="text-sm text-gray-500">Location: {ticket.groupLocation || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Ticket Meta */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Ticket Information</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Category</span>
                <span className="text-sm font-medium text-gray-900">{ticket.category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Created</span>
                <span className="text-sm font-medium text-gray-900 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {new Date(ticket.createdAt).toLocaleDateString()} {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Updated</span>
                <span className="text-sm font-medium text-gray-900 flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {new Date(ticket.updatedAt).toLocaleDateString()} {new Date(ticket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>

          {/* Activity Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Comments
                </span>
                <span className="text-sm font-medium text-gray-900">{comments.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Status Changes
                </span>
                <span className="text-sm font-medium text-gray-900">1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {user?.role === 'admin' && showStatusConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Change Ticket Status</h3>
            <p className="mb-4 text-gray-700">Are you sure you want to change the status to <span className="font-semibold">{pendingStatus}</span>?</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelStatusChange}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={statusLoading}
              >
                Cancel
              </button>
              <button
                onClick={confirmStatusChange}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={statusLoading}
              >
                {statusLoading ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetail;