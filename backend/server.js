const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { Pool } = require('pg');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const Joi = require('joi');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const port = process.env.PORT || 3000;

// Security and middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "https://js.stripe.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com"]
    }
  }
}));

app.use(compression());
app.use(morgan('combined'));

app.use(cors({
  origin: [
    'https://eventi.puntala.info',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use('/webhook/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection with retry logic
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Email client
const resend = new Resend(process.env.RESEND_API_KEY);

// Event configuration
const EVENT_CONFIG = {
  name: 'DJ Set - Isla Bonita',
  date: '2025-07-24',
  time: '18:00-22:00',
  location: 'Isla Bonita, Punta Ala',
  organizer: 'ITALY ON DEMAND',
  contact: {
    email: 'giacomo.pencosavli@italyondemand.partners',
    phone: '3397470384'
  }
};

// Ticket types with detailed configuration
const TICKET_TYPES = {
  standard: {
    id: 'standard',
    name: 'Standard',
    description: 'Due Aperol Spritz',
    price: 1000, // €10.00 in cents
    currency: 'eur',
    maxQuantity: 10,
    available: true,
    features: ['2x Aperol Spritz', 'Ingresso evento', 'Musica DJ set']
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    description: 'Due Aperol Spritz + Antipasti',
    price: 1500, // €15.00 in cents
    currency: 'eur',
    maxQuantity: 10,
    available: true,
    features: ['2x Aperol Spritz', 'Antipasti selezionati', 'Ingresso evento', 'Musica DJ set']
  }
};

// Validation schemas
const purchaseSchema = Joi.object({
  ticketType: Joi.string().valid(...Object.keys(TICKET_TYPES)).required(),
  quantity: Joi.number().integer().min(1).max(10).required(),
  customerInfo: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().min(8).max(20).optional()
  }).required()
});

const divanettiSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().min(8).max(20).required(),
  message: Joi.string().max(500).optional()
});

// Database initialization
async function initDatabase() {
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id SERIAL PRIMARY KEY,
        ticket_id VARCHAR(255) UNIQUE NOT NULL,
        order_id VARCHAR(255) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price INTEGER NOT NULL,
        total_amount INTEGER NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'eur',
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50),
        payment_intent_id VARCHAR(255),
        payment_status VARCHAR(50) DEFAULT 'pending',
        qr_code TEXT,
        apple_wallet_url TEXT,
        google_wallet_url TEXT,
        pdf_path TEXT,
        used BOOLEAN DEFAULT FALSE,
        used_at TIMESTAMP,
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
        status VARCHAR(50) DEFAULT 'pending',
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tickets_email ON tickets(customer_email);
      CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(payment_status);
      CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at);
      CREATE INDEX IF NOT EXISTS idx_tickets_order ON tickets(order_id);
    `);
    
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

// Utility functions
function generateTicketId() {
  return `DJSET-${moment().format('YYYYMMDD')}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
}

function generateOrderId() {
  return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

async function generateQRCode(data) {
  try {
    const qrData = JSON.stringify({
      ticketId: data.ticketId,
      orderId: data.orderId,
      event: EVENT_CONFIG.name,
      date: EVENT_CONFIG.date,
      time: EVENT_CONFIG.time,
      location: EVENT_CONFIG.location,
      customerName: data.customerName,
      type: data.type,
      quantity: data.quantity,
      validationCode: uuidv4().substr(0, 8).toUpperCase()
    });
    
    return await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return null;
  }
}

async function generateTicketPDF(ticketData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Header with branding
      doc.fontSize(28)
         .fillColor('#2E7D32')
         .text('DJ SET', 50, 50);
      
      doc.fontSize(20)
         .fillColor('#1B5E20')
         .text('ISLA BONITA', 50, 85);
      
      doc.fontSize(12)
         .fillColor('#666666')
         .text('Punta Ala', 50, 110);
      
      // Event details box
      doc.rect(50, 140, 500, 100)
         .stroke('#E0E0E0');
      
      doc.fontSize(14)
         .fillColor('#333333')
         .text('DETTAGLI EVENTO', 60, 150);
      
      doc.fontSize(11)
         .text(`Data: ${EVENT_CONFIG.date}`, 60, 170)
         .text(`Orario: ${EVENT_CONFIG.time}`, 60, 185)
         .text(`Luogo: ${EVENT_CONFIG.location}`, 60, 200)
         .text(`Organizzatore: ${EVENT_CONFIG.organizer}`, 60, 215);
      
      // Ticket details
      doc.fontSize(16)
         .fillColor('#2E7D32')
         .text('BIGLIETTO', 50, 270);
      
      doc.fontSize(12)
         .fillColor('#333333')
         .text(`ID Biglietto: ${ticketData.ticket_id}`, 50, 295)
         .text(`Ordine: ${ticketData.order_id}`, 50, 310)
         .text(`Tipo: ${ticketData.type_name}`, 50, 325)
         .text(`Quantità: ${ticketData.quantity}`, 50, 340)
         .text(`Totale: €${(ticketData.total_amount / 100).toFixed(2)}`, 50, 355);
      
      // Customer details
      doc.fontSize(14)
         .fillColor('#2E7D32')
         .text('INTESTATARIO', 50, 390);
      
      doc.fontSize(12)
         .fillColor('#333333')
         .text(`Nome: ${ticketData.customer_name}`, 50, 415)
         .text(`Email: ${ticketData.customer_email}`, 50, 430);
      
      if (ticketData.customer_phone) {
        doc.text(`Telefono: ${ticketData.customer_phone}`, 50, 445);
      }
      
      // QR Code
      if (ticketData.qr_code) {
        try {
          const qrBuffer = Buffer.from(ticketData.qr_code.split(',')[1], 'base64');
          doc.image(qrBuffer, 400, 270, { width: 120 });
          
          doc.fontSize(10)
             .fillColor('#666666')
             .text('Scansiona per validare', 420, 400);
        } catch (qrError) {
          console.error('Error adding QR code to PDF:', qrError);
        }
      }
      
      // Terms and conditions
      doc.fontSize(8)
         .fillColor('#999999')
         .text('CONDIZIONI:', 50, 500)
         .text('• Biglietto valido solo per la data indicata', 50, 515)
         .text('• Presentare documento di identità all\'ingresso', 50, 525)
         .text('• Il biglietto non è rimborsabile', 50, 535)
         .text('• Vietata la rivendita non autorizzata', 50, 545);
      
      // Footer
      doc.fontSize(10)
         .fillColor('#666666')
         .text(`Contatti: ${EVENT_CONFIG.contact.email} - ${EVENT_CONFIG.contact.phone}`, 50, 580);
      
      doc.fontSize(8)
         .fillColor('#999999')
         .text('Organizzato da ITALY ON DEMAND in collaborazione con Isla Bonita', 50, 600)
         .text(`Generato il ${moment().format('DD/MM/YYYY HH:mm')}`, 50, 615);
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

async function sendConfirmationEmail(ticketData, pdfBuffer) {
  try {
    const ticketType = TICKET_TYPES[ticketData.type];
    
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'eventi@italyondemand.partners',
      to: [ticketData.customer_email],
      subject: `🎵 Conferma Biglietto - ${EVENT_CONFIG.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: #2E7D32; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .ticket-info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .features { list-style-type: none; padding: 0; }
            .features li { padding: 5px 0; }
            .features li:before { content: "✓ "; color: #2E7D32; font-weight: bold; }
            .footer { background: #f0f0f0; padding: 15px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎵 ${EVENT_CONFIG.name}</h1>
            <p>Grazie per il tuo acquisto!</p>
          </div>
          
          <div class="content">
            <p>Ciao <strong>${ticketData.customer_name}</strong>,</p>
            <p>Il tuo biglietto per il DJ Set è stato confermato! 🎉</p>
            
            <div class="ticket-info">
              <h3>📅 Dettagli Evento</h3>
              <p><strong>Data:</strong> ${EVENT_CONFIG.date}</p>
              <p><strong>Orario:</strong> ${EVENT_CONFIG.time}</p>
              <p><strong>Luogo:</strong> ${EVENT_CONFIG.location}</p>
            </div>
            
            <div class="ticket-info">
              <h3>🎫 Dettagli Biglietto</h3>
              <p><strong>ID:</strong> ${ticketData.ticket_id}</p>
              <p><strong>Ordine:</strong> ${ticketData.order_id}</p>
              <p><strong>Tipo:</strong> ${ticketData.type_name}</p>
              <p><strong>Quantità:</strong> ${ticketData.quantity}</p>
              <p><strong>Totale:</strong> €${(ticketData.total_amount / 100).toFixed(2)}</p>
              
              <h4>Cosa include:</h4>
              <ul class="features">
                ${ticketType.features.map(feature => `<li>${feature}</li>`).join('')}
              </ul>
            </div>
            
            <p><strong>📱 Aggiungi al Wallet:</strong></p>
            <p>Riceverai presto i link per aggiungere il biglietto ad Apple Wallet e Google Wallet!</p>
            
            <p><strong>📋 Istruzioni:</strong></p>
            <ul>
              <li>Presenta il biglietto (PDF o Wallet) all'ingresso</li>
              <li>Porta un documento di identità</li>
              <li>Arriva puntuale per evitare code</li>
            </ul>
            
            <p>Non vediamo l'ora di vederti alla festa! 🎶</p>
            <p><strong>Team ITALY ON DEMAND</strong></p>
          </div>
          
          <div class="footer">
            <p>Per informazioni: ${EVENT_CONFIG.contact.email} - ${EVENT_CONFIG.contact.phone}</p>
            <p>Organizzato da ITALY ON DEMAND in collaborazione con Isla Bonita</p>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: `biglietto-${ticketData.ticket_id}.pdf`,
          content: pdfBuffer
        }
      ]
    });

    if (error) {
      console.error('❌ Error sending email:', error);
      return false;
    }

    console.log('✅ Confirmation email sent:', data?.id);
    return true;
  } catch (error) {
    console.error('❌ Error sending confirmation email:', error);
    return false;
  }
}

// Routes

// Health check with detailed info
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const dbResult = await pool.query('SELECT NOW() as timestamp');
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'DJ Set Ticket API v2.0',
      database: 'connected',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      db_timestamp: dbResult.rows[0].timestamp
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      service: 'DJ Set Ticket API v2.0',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Get available tickets with detailed info
app.get('/api/tickets', (req, res) => {
  try {
    const tickets = Object.values(TICKET_TYPES).map(ticket => ({
      ...ticket,
      priceFormatted: `€${(ticket.price / 100).toFixed(2)}`,
      available: ticket.available
    }));
    
    res.json({
      success: true,
      event: EVENT_CONFIG,
      tickets,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching tickets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tickets',
      timestamp: new Date().toISOString()
    });
  }
});

// Create Stripe payment intent
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    // Validate input
    const { error, value } = purchaseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input data',
        details: error.details[0].message
      });
    }
    
    const { ticketType, quantity, customerInfo } = value;
    const ticket = TICKET_TYPES[ticketType];
    
    if (!ticket.available) {
      return res.status(400).json({
        success: false,
        error: 'Ticket type not available'
      });
    }
    
    const amount = ticket.price * quantity;
    const orderId = generateOrderId();
    
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: ticket.currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId,
        ticketType,
        quantity: quantity.toString(),
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        customerPhone: customerInfo.phone || '',
        eventName: EVENT_CONFIG.name,
        eventDate: EVENT_CONFIG.date
      },
      description: `${EVENT_CONFIG.name} - ${ticket.name} x${quantity}`
    });
    
    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      orderId,
      amount,
      currency: ticket.currency,
      description: `${ticket.name} x${quantity}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment intent',
      timestamp: new Date().toISOString()
    });
  }
});

// Direct purchase (for testing without Stripe)
app.post('/api/purchase', async (req, res) => {
  try {
    // Validate input
    const { error, value } = purchaseSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input data',
        details: error.details[0].message
      });
    }
    
    const { ticketType, quantity, customerInfo } = value;
    const ticket = TICKET_TYPES[ticketType];
    
    if (!ticket.available) {
      return res.status(400).json({
        success: false,
        error: 'Ticket type not available'
      });
    }
    
    const ticketId = generateTicketId();
    const orderId = generateOrderId();
    const totalAmount = ticket.price * quantity;
    
    // Generate QR code
    const qrCode = await generateQRCode({
      ticketId,
      orderId,
      customerName: customerInfo.name,
      type: ticketType,
      quantity
    });
    
    // Save to database
    const result = await pool.query(`
      INSERT INTO tickets (
        ticket_id, order_id, type, quantity, unit_price, total_amount, currency,
        customer_name, customer_email, customer_phone,
        payment_status, qr_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      ticketId, orderId, ticketType, quantity, ticket.price, totalAmount, ticket.currency,
      customerInfo.name, customerInfo.email, customerInfo.phone || null,
      'completed', qrCode
    ]);
    
    const ticketData = {
      ...result.rows[0],
      type_name: ticket.name
    };
    
    // Generate PDF
    const pdfBuffer = await generateTicketPDF(ticketData);
    
    // Send confirmation email
    const emailSent = await sendConfirmationEmail(ticketData, pdfBuffer);
    
    res.json({
      success: true,
      ticket: {
        id: ticketData.ticket_id,
        orderId: ticketData.order_id,
        type: ticket.name,
        quantity,
        unitPrice: ticket.price,
        total: totalAmount,
        currency: ticket.currency,
        customerName: customerInfo.name,
        customerEmail: customerInfo.email
      },
      emailSent,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error processing purchase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process purchase',
      timestamp: new Date().toISOString()
    });
  }
});

// Divanetti contact request
app.post('/api/divanetti', async (req, res) => {
  try {
    // Validate input
    const { error, value } = divanettiSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input data',
        details: error.details[0].message
      });
    }
    
    const { name, email, phone, message } = value;
    
    // Save to database
    const result = await pool.query(`
      INSERT INTO divanetti_requests (customer_name, customer_email, customer_phone, message)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at
    `, [name, email, phone, message || '']);
    
    // Send notification email to organizer
    try {
      await resend.emails.send({
        from: process.env.FROM_EMAIL || 'eventi@italyondemand.partners',
        to: [EVENT_CONFIG.contact.email],
        subject: `🛋️ Nuova Richiesta Divanetti - ${EVENT_CONFIG.name}`,
        html: `
          <h2>🛋️ Nuova Richiesta Divanetti</h2>
          <p><strong>Nome:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Telefono:</strong> ${phone}</p>
          <p><strong>Messaggio:</strong> ${message || 'Nessun messaggio'}</p>
          <p><strong>Data:</strong> ${moment().format('DD/MM/YYYY HH:mm')}</p>
          <p><strong>ID Richiesta:</strong> ${result.rows[0].id}</p>
          
          <hr>
          <p><small>Sistema automatico - ${EVENT_CONFIG.name}</small></p>
        `
      });
    } catch (emailError) {
      console.error('❌ Error sending divanetti notification:', emailError);
    }
    
    res.json({
      success: true,
      message: 'Richiesta inviata con successo. Ti contatteremo presto!',
      requestId: result.rows[0].id,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error processing divanetti request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process request',
      timestamp: new Date().toISOString()
    });
  }
});

// Stripe webhook handler
app.post('/webhook/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`✅ Received Stripe webhook: ${event.type}`);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }

  res.json({ received: true });
});

async function handlePaymentSuccess(paymentIntent) {
  try {
    const ticketId = generateTicketId();
    const qrCode = await generateQRCode({
      ticketId,
      orderId: paymentIntent.metadata.orderId,
      customerName: paymentIntent.metadata.customerName,
      type: paymentIntent.metadata.ticketType,
      quantity: parseInt(paymentIntent.metadata.quantity)
    });
    
    // Save to database
    const result = await pool.query(`
      INSERT INTO tickets (
        ticket_id, order_id, type, quantity, unit_price, total_amount, currency,
        customer_name, customer_email, customer_phone,
        payment_intent_id, payment_status, qr_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      ticketId,
      paymentIntent.metadata.orderId,
      paymentIntent.metadata.ticketType,
      parseInt(paymentIntent.metadata.quantity),
      paymentIntent.amount / parseInt(paymentIntent.metadata.quantity),
      paymentIntent.amount,
      paymentIntent.currency,
      paymentIntent.metadata.customerName,
      paymentIntent.metadata.customerEmail,
      paymentIntent.metadata.customerPhone || null,
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
    
    console.log(`✅ Payment processed successfully for order: ${paymentIntent.metadata.orderId}`);
    
  } catch (error) {
    console.error('❌ Error processing successful payment:', error);
    throw error;
  }
}

async function handlePaymentFailed(paymentIntent) {
  try {
    console.log(`❌ Payment failed for order: ${paymentIntent.metadata.orderId}`);
    
    // Could send failure notification email here
    // await sendPaymentFailureEmail(paymentIntent.metadata);
    
  } catch (error) {
    console.error('❌ Error processing failed payment:', error);
    throw error;
  }
}

// Admin authentication middleware
function authenticateAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized access'
    });
  }
  
  next();
}

// Admin routes
app.get('/api/admin/tickets', authenticateAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    const result = await pool.query(`
      SELECT 
        t.*,
        CASE 
          WHEN t.type = 'standard' THEN 'Standard'
          WHEN t.type = 'plus' THEN 'Plus'
          ELSE t.type
        END as type_name
      FROM tickets t 
      ORDER BY t.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    const countResult = await pool.query('SELECT COUNT(*) FROM tickets');
    const totalTickets = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      tickets: result.rows,
      pagination: {
        page,
        limit,
        total: totalTickets,
        pages: Math.ceil(totalTickets / limit)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching admin tickets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tickets'
    });
  }
});

app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    // Overall stats
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(quantity) as total_tickets,
        SUM(total_amount) as total_revenue,
        COUNT(CASE WHEN payment_status = 'completed' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN used = true THEN 1 END) as used_tickets
      FROM tickets
    `);
    
    // Stats by ticket type
    const typeStatsResult = await pool.query(`
      SELECT 
        type,
        COUNT(*) as orders,
        SUM(quantity) as tickets,
        SUM(total_amount) as revenue,
        AVG(total_amount) as avg_order_value
      FROM tickets
      WHERE payment_status = 'completed'
      GROUP BY type
      ORDER BY revenue DESC
    `);
    
    // Daily sales (last 30 days)
    const dailySalesResult = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(quantity) as tickets,
        SUM(total_amount) as revenue
      FROM tickets
      WHERE payment_status = 'completed'
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    
    // Divanetti requests
    const divanettiResult = await pool.query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN status = 'processed' THEN 1 END) as processed_requests
      FROM divanetti_requests
    `);
    
    const stats = statsResult.rows[0];
    
    res.json({
      success: true,
      stats: {
        ...stats,
        total_revenue_formatted: `€${(parseInt(stats.total_revenue || 0) / 100).toFixed(2)}`,
        avg_order_value: stats.total_orders > 0 ? 
          Math.round(stats.total_revenue / stats.total_orders) / 100 : 0
      },
      byType: typeStatsResult.rows.map(row => ({
        ...row,
        revenue_formatted: `€${(parseInt(row.revenue) / 100).toFixed(2)}`,
        avg_order_value_formatted: `€${(parseFloat(row.avg_order_value) / 100).toFixed(2)}`
      })),
      dailySales: dailySalesResult.rows.map(row => ({
        ...row,
        revenue_formatted: `€${(parseInt(row.revenue) / 100).toFixed(2)}`
      })),
      divanetti: divanettiResult.rows[0],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// Get divanetti requests (admin)
app.get('/api/admin/divanetti', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM divanetti_requests 
      ORDER BY created_at DESC
    `);
    
    res.json({
      success: true,
      requests: result.rows,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error fetching divanetti requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch requests'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { 
      details: error.message,
      stack: error.stack 
    })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  
  try {
    await pool.end();
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  
  try {
    await pool.end();
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
  
  process.exit(0);
});

// Start server
app.listen(port, '0.0.0.0', async () => {
  console.log(`🚀 DJ Set Ticket API v2.0 running on port ${port}`);
  console.log(`📅 Event: ${EVENT_CONFIG.name}`);
  console.log(`📍 Location: ${EVENT_CONFIG.location}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  try {
    await initDatabase();
    console.log('✅ Server startup completed successfully');
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
});
