const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ['https://eventi.puntala.info', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use('/webhook', express.raw({ type: 'application/json' }));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Resend email client
const resend = new Resend(process.env.RESEND_API_KEY);

// Ticket types configuration
const TICKET_TYPES = {
  standard: {
    id: 'standard',
    name: 'Standard',
    description: 'Due Aperol Spritz',
    price: 1000, // €10.00 in cents
    currency: 'eur'
  },
  plus: {
    id: 'plus', 
    name: 'Plus',
    description: 'Due Aperol Spritz + Antipasti',
    price: 1500, // €15.00 in cents
    currency: 'eur'
  }
};

// Initialize database
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        ticket_id VARCHAR(255) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL,
        quantity INTEGER NOT NULL,
        total_amount INTEGER NOT NULL,
        currency VARCHAR(3) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50),
        payment_intent_id VARCHAR(255),
        payment_status VARCHAR(50) DEFAULT 'pending',
        qr_code TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS divanetti_requests (
        id SERIAL PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Generate unique ticket ID
function generateTicketId() {
  return 'DJSET-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Generate QR code
async function generateQRCode(ticketId) {
  try {
    const qrData = JSON.stringify({
      ticketId,
      event: 'DJ Set - Isla Bonita',
      date: '2025-07-24',
      time: '18:00-22:00',
      location: 'Isla Bonita, Punta Ala'
    });
    
    const qrCode = await QRCode.toDataURL(qrData);
    return qrCode;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return null;
  }
}

// Generate PDF ticket
async function generateTicketPDF(ticketData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      
      // Header
      doc.fontSize(24).text('DJ SET - ISLA BONITA', 50, 50);
      doc.fontSize(16).text('Punta Ala', 50, 80);
      
      // Event details
      doc.fontSize(14).text('Data: 24 Luglio 2025', 50, 120);
      doc.text('Orario: 18:00 - 22:00', 50, 140);
      doc.text('Luogo: Isla Bonita, Punta Ala', 50, 160);
      
      // Ticket details
      doc.fontSize(16).text('BIGLIETTO', 50, 200);
      doc.fontSize(12).text(`ID: ${ticketData.ticket_id}`, 50, 220);
      doc.text(`Tipo: ${ticketData.type_name}`, 50, 240);
      doc.text(`Quantità: ${ticketData.quantity}`, 50, 260);
      doc.text(`Totale: €${(ticketData.total_amount / 100).toFixed(2)}`, 50, 280);
      
      // Customer details
      doc.text(`Nome: ${ticketData.customer_name}`, 50, 320);
      doc.text(`Email: ${ticketData.customer_email}`, 50, 340);
      
      // QR Code (if available)
      if (ticketData.qr_code) {
        const qrBuffer = Buffer.from(ticketData.qr_code.split(',')[1], 'base64');
        doc.image(qrBuffer, 400, 200, { width: 100 });
      }
      
      // Footer
      doc.fontSize(10).text('Organizzato da ITALY ON DEMAND in collaborazione con Isla Bonita', 50, 500);
      doc.text('Contatti: giacomo.pencosavli@italyondemand.partners - 3397470384', 50, 520);
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Send confirmation email
async function sendConfirmationEmail(ticketData, pdfBuffer) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'eventi@italyondemand.partners',
      to: [ticketData.customer_email],
      subject: 'Conferma Biglietto - DJ Set Isla Bonita',
      html: `
        <h2>Grazie per il tuo acquisto!</h2>
        <p>Ciao ${ticketData.customer_name},</p>
        <p>Il tuo biglietto per il DJ Set è stato confermato!</p>
        
        <h3>Dettagli Evento:</h3>
        <ul>
          <li><strong>Data:</strong> 24 Luglio 2025</li>
          <li><strong>Orario:</strong> 18:00 - 22:00</li>
          <li><strong>Luogo:</strong> Isla Bonita, Punta Ala</li>
        </ul>
        
        <h3>Dettagli Biglietto:</h3>
        <ul>
          <li><strong>ID:</strong> ${ticketData.ticket_id}</li>
          <li><strong>Tipo:</strong> ${ticketData.type_name}</li>
          <li><strong>Quantità:</strong> ${ticketData.quantity}</li>
          <li><strong>Totale:</strong> €${(ticketData.total_amount / 100).toFixed(2)}</li>
        </ul>
        
        <p>Il tuo biglietto è allegato a questa email. Presentalo all'ingresso insieme a un documento di identità.</p>
        
        <p>Per informazioni: giacomo.pencosavli@italyondemand.partners - 3397470384</p>
        
        <p>Ci vediamo alla festa!</p>
        <p><strong>ITALY ON DEMAND</strong></p>
      `,
      attachments: [
        {
          filename: `biglietto-${ticketData.ticket_id}.pdf`,
          content: pdfBuffer
        }
      ]
    });

    if (error) {
      console.error('Error sending email:', error);
      return false;
    }

    console.log('Confirmation email sent:', data);
    return true;
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return false;
  }
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'DJ Set Ticket API'
  });
});

// Get available tickets
app.get('/api/tickets', (req, res) => {
  res.json({
    success: true,
    tickets: Object.values(TICKET_TYPES)
  });
});

// Create payment intent
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { ticketType, quantity, customerInfo } = req.body;
    
    if (!TICKET_TYPES[ticketType]) {
      return res.status(400).json({ error: 'Invalid ticket type' });
    }
    
    const ticket = TICKET_TYPES[ticketType];
    const amount = ticket.price * quantity;
    
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: ticket.currency,
      metadata: {
        ticketType,
        quantity: quantity.toString(),
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone || ''
      }
    });
    
    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      amount,
      currency: ticket.currency
    });
    
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Purchase tickets (alternative to Stripe)
app.post('/api/purchase', async (req, res) => {
  try {
    const { ticketType, quantity, customerInfo } = req.body;
    
    if (!TICKET_TYPES[ticketType]) {
      return res.status(400).json({ error: 'Invalid ticket type' });
    }
    
    const ticket = TICKET_TYPES[ticketType];
    const ticketId = generateTicketId();
    const totalAmount = ticket.price * quantity;
    const qrCode = await generateQRCode(ticketId);
    
    // Save to database
    const result = await pool.query(`
      INSERT INTO tickets (
        ticket_id, type, quantity, total_amount, currency,
        customer_name, customer_email, customer_phone,
        payment_status, qr_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      ticketId, ticketType, quantity, totalAmount, ticket.currency,
      customerInfo.name, customerInfo.email, customerInfo.phone || null,
      'completed', qrCode
    ]);
    
    const ticketData = {
      ...result.rows[0],
      type_name: ticket.name
    };
    
    // Generate PDF
    const pdfBuffer = await generateTicketPDF(ticketData);
    
    // Send email
    await sendConfirmationEmail(ticketData, pdfBuffer);
    
    res.json({
      success: true,
      ticket: {
        id: ticketData.ticket_id,
        type: ticket.name,
        quantity,
        total: totalAmount,
        currency: ticket.currency
      }
    });
    
  } catch (error) {
    console.error('Error processing purchase:', error);
    res.status(500).json({ error: 'Failed to process purchase' });
  }
});

// Divanetti contact request
app.post('/api/divanetti', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    
    // Save to database
    await pool.query(`
      INSERT INTO divanetti_requests (customer_name, customer_email, customer_phone, message)
      VALUES ($1, $2, $3, $4)
    `, [name, email, phone, message || '']);
    
    // Send notification email
    try {
      await resend.emails.send({
        from: process.env.FROM_EMAIL || 'eventi@italyondemand.partners',
        to: ['giacomo.pencosavli@italyondemand.partners'],
        subject: 'Nuova Richiesta Divanetti - DJ Set',
        html: `
          <h2>Nuova Richiesta Divanetti</h2>
          <p><strong>Nome:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Telefono:</strong> ${phone}</p>
          <p><strong>Messaggio:</strong> ${message || 'Nessun messaggio'}</p>
          <p><strong>Data:</strong> ${new Date().toLocaleString('it-IT')}</p>
        `
      });
    } catch (emailError) {
      console.error('Error sending divanetti notification:', emailError);
    }
    
    res.json({ success: true, message: 'Richiesta inviata con successo' });
    
  } catch (error) {
    console.error('Error processing divanetti request:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Stripe webhook
app.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    
    try {
      const ticketId = generateTicketId();
      const qrCode = await generateQRCode(ticketId);
      
      // Save to database
      const result = await pool.query(`
        INSERT INTO tickets (
          ticket_id, type, quantity, total_amount, currency,
          customer_name, customer_email, customer_phone,
          payment_intent_id, payment_status, qr_code
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        ticketId,
        paymentIntent.metadata.ticketType,
        parseInt(paymentIntent.metadata.quantity),
        paymentIntent.amount,
        paymentIntent.currency,
        paymentIntent.metadata.customerName,
        paymentIntent.metadata.customerEmail,
        paymentIntent.metadata.customerPhone,
        paymentIntent.id,
        'completed',
        qrCode
      ]);
      
      const ticketData = {
        ...result.rows[0],
        type_name: TICKET_TYPES[paymentIntent.metadata.ticketType].name
      };
      
      // Generate PDF and send email
      const pdfBuffer = await generateTicketPDF(ticketData);
      await sendConfirmationEmail(ticketData, pdfBuffer);
      
    } catch (error) {
      console.error('Error processing successful payment:', error);
    }
  }

  res.json({ received: true });
});

// Admin routes (protected by token)
app.get('/api/admin/tickets', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const result = await pool.query(`
      SELECT * FROM tickets 
      ORDER BY created_at DESC
    `);
    
    res.json({
      success: true,
      tickets: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

app.get('/api/admin/stats', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_tickets,
        SUM(quantity) as total_quantity,
        SUM(total_amount) as total_revenue,
        COUNT(CASE WHEN payment_status = 'completed' THEN 1 END) as completed_payments
      FROM tickets
    `);
    
    const typeStats = await pool.query(`
      SELECT 
        type,
        COUNT(*) as count,
        SUM(quantity) as quantity,
        SUM(total_amount) as revenue
      FROM tickets
      WHERE payment_status = 'completed'
      GROUP BY type
    `);
    
    res.json({
      success: true,
      stats: stats.rows[0],
      byType: typeStats.rows
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Start server
app.listen(port, '0.0.0.0', async () => {
  console.log(`🚀 Server running on port ${port}`);
  await initDatabase();
});
