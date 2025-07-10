import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const TicketContext = createContext();

export const useTickets = () => {
  const context = useContext(TicketContext);
  if (!context) {
    throw new Error('useTickets must be used within a TicketProvider');
  }
  return context;
};

export const TicketProvider = ({ children }) => {
  const [tickets, setTickets] = useState([]);
  const [comments, setComments] = useState({});
  const { getAuthHeaders, user } = useAuth();

  const fetchTickets = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/tickets', {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const createTicket = async (ticketData, isFormData = false) => {
    try {
      const options = {
        method: 'POST',
        headers: isFormData ? { 'Authorization': getAuthHeaders().Authorization } : getAuthHeaders(),
        body: isFormData ? ticketData : JSON.stringify(ticketData),
      };
      const response = await fetch('http://localhost:3001/api/tickets', options);
      if (response.ok) {
        fetchTickets();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error creating ticket:', error);
      return false;
    }
  };

  const updateTicket = async (ticketId, updates) => {
    try {
      const response = await fetch(`http://localhost:3001/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        fetchTickets();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating ticket:', error);
      return false;
    }
  };

  const getTicketById = (id) => {
    return tickets.find(ticket => ticket.id === parseInt(id));
  };

  const fetchComments = async (ticketId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/tickets/${ticketId}/comments`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setComments(prev => ({
          ...prev,
          [ticketId]: data
        }));
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const addComment = async (commentData) => {
    try {
      const response = await fetch(`http://localhost:3001/api/tickets/${commentData.ticketId}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          content: commentData.content,
          isInternal: commentData.isInternal
        }),
      });

      if (response.ok) {
        fetchComments(commentData.ticketId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding comment:', error);
      return false;
    }
  };

  const getCommentsByTicketId = (ticketId) => {
    return comments[ticketId] || [];
  };

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  const value = {
    tickets,
    createTicket,
    updateTicket,
    getTicketById,
    fetchComments,
    addComment,
    getCommentsByTicketId,
    fetchTickets
  };

  return (
    <TicketContext.Provider value={value}>
      {children}
    </TicketContext.Provider>
  );
};