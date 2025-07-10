const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root', // Change as needed
  password: process.env.DB_PASSWORD || 'Kaungkhant123', // Change as needed
  database: process.env.DB_NAME || 'ticket_management_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Set up storage for multer (store in memory for database storage)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure nodemailer transporter (replace with your SMTP details)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'kaungkhant12359@gmail.com', // your SMTP user
    pass: 'ohctfrldgxdgizsq',    // your SMTP password
  },
});

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Admin or Leader middleware
const requireAdminOrLeader = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'leader') {
    return res.status(403).json({ error: 'Admin or Leader access required' });
  }
  next();
};

// Auth Routes
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ? AND status = "active"',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        groupId: user.group_id
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        groupId: user.group_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User Routes
app.get('/api/users', authenticateToken, requireAdminOrLeader, async (req, res) => {
  try {
    const [users] = await pool.execute(`
      SELECT u.*, g.name as group_name 
      FROM users u 
      LEFT JOIN user_groups g ON u.group_id = g.id 
      ORDER BY u.created_at DESC
    `);
    
    const formattedUsers = users.map(user => ({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      status: user.status,
      groupId: user.group_id,
      groupName: user.group_name,
      location: user.location, // <-- Add this line
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/users', authenticateToken, requireAdminOrLeader, async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, groupId, location } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    let userLocation = location || null;
    if (groupId) {
      // Fetch group location
      const [groups] = await pool.execute('SELECT location FROM user_groups WHERE id = ?', [groupId]);
      if (groups.length > 0) {
        userLocation = groups[0].location;
      }
    }
    const [result] = await pool.execute(
      'INSERT INTO users (first_name, last_name, email, password, role, group_id, location) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [firstName, lastName, email, hashedPassword, role, groupId || null, userLocation]
    );
    res.json({ 
      id: result.insertId, 
      message: 'User created successfully' 
    });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.put('/api/users/:id', authenticateToken, requireAdminOrLeader, async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, role, groupId, status } = req.body;
    
    await pool.execute(
      'UPDATE users SET first_name = ?, last_name = ?, email = ?, role = ?, group_id = ?, status = ? WHERE id = ?',
      [firstName, lastName, email, role, groupId || null, status, id]
    );

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/users/:id', authenticateToken, requireAdminOrLeader, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Group Routes
app.get('/api/groups', authenticateToken, requireAdminOrLeader, async (req, res) => {
  try {
    const [groups] = await pool.execute('SELECT * FROM user_groups ORDER BY name');
    res.json(groups);
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/groups', authenticateToken, requireAdminOrLeader, async (req, res) => {
  try {
    const { name, description, location } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO user_groups (name, location, description) VALUES (?, ?, ?)',
      [name, location, description]
    );
    res.json({ 
      id: result.insertId, 
      message: 'Group created successfully' 
    });
  } catch (error) {
    console.error('Create group error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Group name already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.put('/api/groups/:id', authenticateToken, requireAdminOrLeader, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    await pool.execute(
      'UPDATE user_groups SET name = ?, description = ? WHERE id = ?',
      [name, description, id]
    );

    res.json({ message: 'Group updated successfully' });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/groups/:id', authenticateToken, requireAdminOrLeader, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Update users to remove group reference
    await pool.execute('UPDATE users SET group_id = NULL WHERE group_id = ?', [id]);
    
    // Delete the group
    await pool.execute('DELETE FROM user_groups WHERE id = ?', [id]);
    
    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ticket Routes
app.get('/api/tickets', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT t.*, 
             u.first_name as user_first_name, u.last_name as user_last_name, u.email as user_email,
             g.name as group_name, g.location as group_location
      FROM tickets t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN user_groups g ON t.group_id = g.id
    `;
    
    let params = [];
    
    if (req.user.role === 'ruser' || req.user.role === 'leader') {
      if (req.user.groupId) {
        query += ' WHERE t.user_id = ? OR t.group_id = ?';
        params.push(req.user.id, req.user.groupId);
      } else {
        query += ' WHERE t.user_id = ?';
        params.push(req.user.id);
      }
    }
    query += ' ORDER BY t.created_at DESC';
    
    const [tickets] = await pool.execute(query, params);
    
    const formattedTickets = tickets.map(ticket => ({
      id: ticket.id,
      ticket_number: ticket.ticket_number,
      group_id: ticket.group_id,
      groupName: ticket.group_name,
      groupLocation: ticket.group_location,
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status,
      category: ticket.category,
      user_id: ticket.user_id,
      customerName: `${ticket.user_first_name} ${ticket.user_last_name}`,
      customerEmail: ticket.user_email,
      tags: (typeof ticket.tags === 'string' && ticket.tags.trim().startsWith('[')) ? JSON.parse(ticket.tags) : [],
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at
    }));

    res.json(formattedTickets);
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/tickets', authenticateToken, upload.array('attachments'), async (req, res) => {
  try {
    const { title, description, priority, category, tags } = req.body;
    const userId = req.user.id;
    const tagsArray = tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : [];

    // Insert ticket
    const groupId = req.user.groupId || null;
    const [result] = await pool.execute(
      'INSERT INTO tickets (title, description, priority, category, tags, user_id, group_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [title, description, priority, category, JSON.stringify(tagsArray), userId, groupId, 'open']
    );
    const ticketId = result.insertId;
    const ticketNumber = `TCKT-${ticketId.toString().padStart(5, '0')}`;
    await pool.execute(
      'UPDATE tickets SET ticket_number = ? WHERE id = ?',
      [ticketNumber, ticketId]
    );

    // Handle attachments
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
        await pool.execute(
          'INSERT INTO attachments (ticket_id, filename, original_name, mimetype, size, file_data) VALUES (?, ?, ?, ?, ?, ?)',
          [ticketId, filename, file.originalname, file.mimetype, file.size, file.buffer]
        );
      }
    }

    // Fetch user info for email
    const [users] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
    const user = users[0];

    // Fetch group name if available
    let groupName = '-';
    if (user.group_id) {
      const [groups] = await pool.execute('SELECT name FROM user_groups WHERE id = ?', [user.group_id]);
      if (groups.length > 0) {
        groupName = groups[0].name;
      }
    }

    // Prepare attachments for email if any
    let emailAttachments = [];
    if (req.files && req.files.length > 0) {
      emailAttachments = req.files.map(file => ({
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype
      }));
    }

    // Convert newlines in description to <br> for email formatting
    const formattedDescription = description.replace(/\n/g, '<br>');

    // Prepare email content
    const mailOptions = {
      from: 'kaungkhant12359@gmail.com', // sender address
      to: 'kaungkhant12359@gmail.com',   // destination email
      subject: `${title} (${ticketNumber})`,
      html: `
        <h2>New Ticket Created</h2>
        <p>${formattedDescription}</p>
        <p><strong>Priority:</strong> ${priority}</p>
        <p><strong>Category:</strong> ${category}</p>
        <p><strong>Tags:</strong> ${tagsArray.join(', ')}</p>
        <hr />
        <h3>Customer Information</h3>
        <p><strong>Name:</strong> ${user.first_name} ${user.last_name}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Role:</strong> ${user.role}</p>
        <p><strong>Location:</strong> ${user.location || '-'}</p>
        <p><strong>Group Name:</strong> ${groupName}</p>
      `,
      attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
    };

    // Send email (do not block response on error)
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending ticket creation email:', error);
      } else {
        console.log('Ticket creation email sent:', info.response);
      }
    });

    res.json({ id: ticketId, ticketNumber, message: 'Ticket created successfully' });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/tickets/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    let query = `
      SELECT t.*, 
             u.first_name as user_first_name, u.last_name as user_last_name, u.email as user_email,
             g.name as group_name, g.location as group_location
      FROM tickets t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN user_groups g ON t.group_id = g.id
      WHERE t.id = ?
    `;
    
    let params = [id];
    
    // Regular users can only see their own tickets
    if (req.user.role === 'ruser' || req.user.role === 'leader') {
      query += ' AND t.user_id = ?';
      params.push(req.user.id);
    }
    
    const [tickets] = await pool.execute(query, params);
    
    if (tickets.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    const ticket = tickets[0];
    const formattedTicket = {
      id: ticket.id,
      ticket_number: ticket.ticket_number,
      group_id: ticket.group_id,
      groupName: ticket.group_name,
      groupLocation: ticket.group_location,
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status,
      category: ticket.category,
      user_id: ticket.user_id,
      customerName: `${ticket.user_first_name} ${ticket.user_last_name}`,
      customerEmail: ticket.user_email,
      tags: (typeof ticket.tags === 'string' && ticket.tags.trim().startsWith('[')) ? JSON.parse(ticket.tags) : [],
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at
    };

    res.json(formattedTicket);
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/tickets/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority } = req.body;
    
    // Only admins can update tickets
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    await pool.execute(
      'UPDATE tickets SET status = ?, priority = ? WHERE id = ?',
      [status, priority, id]
    );

    res.json({ message: 'Ticket updated successfully' });
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/tickets/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    let query = 'DELETE FROM tickets WHERE id = ?';
    let params = [id];

    // Regular users can only delete their own tickets
    if (req.user.role === 'ruser' || req.user.role === 'leader') {
      query += ' AND user_id = ?';
      params.push(req.user.id);
    }

    // 1. Delete attachments related to the ticket
    await pool.execute('DELETE FROM attachments WHERE ticket_id = ?', [id]);

    // 2. Find all comment IDs for this ticket
    const [comments] = await pool.execute('SELECT id FROM comments WHERE ticket_id = ?', [id]);
    const commentIds = comments.map(c => c.id);
    if (commentIds.length > 0) {
      // 3. Delete attachments related to those comments
      await pool.execute(`DELETE FROM attachments WHERE comment_id IN (${commentIds.map(() => '?').join(',')})`, commentIds);
      // 4. Delete comments themselves
      await pool.execute(`DELETE FROM comments WHERE id IN (${commentIds.map(() => '?').join(',')})`, commentIds);
    }

    // 5. Delete the ticket itself
    const [result] = await pool.execute(query, params);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Ticket not found or not authorized' });
    }
    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Delete ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Comment Routes
app.get('/api/tickets/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    let query = `
      SELECT c.*, u.first_name, u.last_name
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.ticket_id = ?
    `;
    
    // Regular users cannot see internal comments
    // (Removed: if (req.user.role === 'ruser' || req.user.role === 'leader') { query += ' AND c.is_internal = FALSE'; })
    
    query += ' ORDER BY c.created_at ASC';
    
    const [comments] = await pool.execute(query, [id]);
    
    const formattedComments = comments.map(comment => ({
      id: comment.id,
      ticketId: comment.ticket_id,
      userId: comment.user_id,
      userName: `${comment.first_name} ${comment.last_name}`,
      content: comment.content,
      createdAt: comment.created_at
    }));

    res.json(formattedComments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update comment creation to remove isInternal
app.post('/api/tickets/:id/comments', authenticateToken, upload.array('attachments'), async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    // Insert comment
    const [result] = await pool.execute(
      'INSERT INTO comments (ticket_id, user_id, content, createdAt) VALUES (?, ?, ?, NOW())',
      [id, userId, content]
    );
    const commentId = result.insertId;
    // Handle attachments
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
        await pool.execute(
          'INSERT INTO attachments (comment_id, filename, original_name, mimetype, size, file_data) VALUES (?, ?, ?, ?, ?, ?)',
          [commentId, filename, file.originalname, file.mimetype, file.size, file.buffer]
        );
      }
    }
    res.json({ id: commentId, message: 'Comment added successfully' });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint to fetch attachments for a comment
app.get('/api/comments/:id/attachments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [attachments] = await pool.execute(
      'SELECT id, filename, original_name, mimetype, size, upload_date FROM attachments WHERE comment_id = ?',
      [id]
    );
    res.json(attachments);
  } catch (error) {
    console.error('Get comment attachments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get attachments for a ticket
app.get('/api/tickets/:id/attachments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [attachments] = await pool.execute(
      'SELECT id, filename, original_name, mimetype, size, upload_date FROM attachments WHERE ticket_id = ?',
      [id]
    );
    res.json(attachments);
  } catch (error) {
    console.error('Get attachments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve uploaded files from database
app.get('/uploads/:id', authenticateToken, async (req, res) => {
  try {
    const [attachments] = await pool.execute(
      'SELECT file_data, mimetype, original_name FROM attachments WHERE id = ?',
      [req.params.id]
    );
    if (attachments.length > 0) {
      const attachment = attachments[0];
      res.setHeader('Content-Type', attachment.mimetype);
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.original_name}"`);
      res.send(attachment.file_data);
    } else {
      res.status(404).send('File not found');
    }
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).send('Error serving file');
  }
});

// Change Password Route
app.post('/api/change-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const frontendBuildPath = path.join(__dirname, '..', 'dist'); // Go up to PROJECT, then into dist

app.use(express.static(frontendBuildPath));

// For SPAs, catch all other routes and serve index.html
app.get('*', (req, res) => {
    // Ensure you send the index.html from the correct path
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Serving frontend from: ${frontendBuildPath}`); // Add log for clarity
});