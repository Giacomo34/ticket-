const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Email transporter
const transporter = nodemailer.createTransporter({
  host: 'smtp.resend.com',
  port: 587,
  secure: false,
  auth: {
    user: 'resend',
    pass: process.env.RESEND_API_KEY
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Stripe webhook - deve essere prima di express.json()
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      await handleSuccessfulPayment(paymentIntent);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});

app.use(express.json());

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Create payment intent
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { ticketType, price, customerInfo } = req.body;

    // Validate input
    if (!ticketType || !price || !customerInfo?.email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate ticket type and price
    const validTickets = {
      'standard': 10,
      'plus': 15
    };

    if (!validTickets[ticketType] || validTickets[ticketType] !== price) {
      return res.status(400).json({ error: 'Invalid ticket type or price' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: price * 100, // Convert to cents
      currency: 'eur',
      metadata: {
        ticketType,
        customerEmail: customerInfo.email,
        customerName: customerInfo.name || '',
        customerPhone: customerInfo.phone || ''
      },
      receipt_email: customerInfo.email
    });

    res.json({
      clientSecret: paymentIntent.client_secret
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle divanetti contact request
app.post('/contact-divanetti', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Send email to ITALY ON DEMAND
    await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'eventi@italyondemand.partners',
      to: 'giacomo.pencosavli@italyondemand.partners',
      subject: 'Richiesta Prenotazione Divanetti - DJ Set 24 Luglio',
      html: generateDivanettiEmailTemplate({ name, email, phone, message })
    });

    // Send confirmation to customer
    await transporter.sendMail({
      from: process.env.FROM_EMAIL || 'eventi@italyondemand.partners',
      to: email,
      subject: 'Richiesta Ricevuta - Prenotazione Divanetti',
      html: generateCustomerConfirmationTemplate({ name })
    });

    res.json({ success: true, message: 'Richiesta inviata con successo' });

  } catch (error) {
    console.error('Error handling divanetti contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get ticket by ID (for verification)
app.get('/ticket/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT id, type, price, customer_name, created_at FROM tickets WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin endpoint - get all tickets (basic auth required)
app.get('/admin/tickets', async (req, res) => {
  try {
    // Basic auth check
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${process.env.ADMIN_TOKEN}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      'SELECT id, type, price, customer_name, customer_email, created_at FROM tickets ORDER BY created_at DESC'
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Functions

async function handleSuccessfulPayment(paymentIntent) {
  try {
    const ticketId = uuidv4();
    const qrCodeData = await QRCode.toDataURL(`https://${process.env.FRONTEND_DOMAIN}/verify/${ticketId}`);

    // Save ticket to database
    await pool.query(
      `INSERT INTO tickets (id, type, price, customer_name, customer_email, customer_phone, stripe_payment_id, qr_code, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        ticketId,
        paymentIntent.metadata.ticketType,
        paymentIntent.amount / 100,
        paymentIntent.metadata.customerName,
        paymentIntent.metadata.customerEmail,
        paymentIntent.metadata.customerPhone,
        paymentIntent.id,
        qrCodeData
      ]
    );

    // Send ticket email
    await sendTicketEmail({
      id: ticketId,
      type: paymentIntent.metadata.ticketType,
      price: paymentIntent.amount / 100,
      customerName: paymentIntent.metadata.customerName,
      customerEmail: paymentIntent.metadata.customerEmail,
      qrCode: qrCodeData
    });

    console.log(`Ticket ${ticketId} created and sent to ${paymentIntent.metadata.customerEmail}`);

  } catch (error) {
    console.error('Error handling successful payment:', error);
  }
}

async function sendTicketEmail(ticketData) {
  const ticketTypes = {
    'standard': 'Standard - Due Aperol Spritz',
    'plus': 'Plus - Due Aperol Spritz + Antipasti'
  };

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2d5016; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .ticket-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .qr-code { text-align: center; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎵 DJ SET - ISLA BONITA</h1>
          <p>Il tuo biglietto è confermato!</p>
        </div>
        
        <div class="content">
          <h2>Ciao ${ticketData.customerName || 'Cliente'}!</h2>
          <p>Grazie per aver acquistato il biglietto per il nostro evento DJ Set.</p>
          
          <div class="ticket-info">
            <h3>📋 Dettagli Biglietto</h3>
            <p><strong>ID Biglietto:</strong> ${ticketData.id}</p>
            <p><strong>Tipo:</strong> ${ticketTypes[ticketData.type]}</p>
            <p><strong>Prezzo:</strong> €${ticketData.price}</p>
            <p><strong>Data Evento:</strong> 24 Luglio 2025</p>
            <p><strong>Orario:</strong> 18:00 - 22:00</p>
            <p><strong>Location:</strong> Isla Bonita, Punta Ala</p>
          </div>

          <div class="qr-code">
            <h3>🎫 Il Tuo Biglietto</h3>
            <p>Mostra questo QR code all'ingresso:</p>
            <img src="${ticketData.qrCode}" alt="QR Code Biglietto" style="max-width: 200px;">
          </div>

          <div class="ticket-info">
            <h3>ℹ️ Informazioni Importanti</h3>
            <ul>
              <li>Conserva questa email come conferma del tuo acquisto</li>
              <li>Mostra il QR code all'ingresso dell'evento</li>
              <li>L'evento si svolge all'aperto, vestiti di conseguenza</li>
              <li>Per informazioni: giacomo.pencosavli@italyondemand.partners</li>
            </ul>
          </div>
        </div>

        <div class="footer">
          <p>ITALY ON DEMAND in collaborazione con Isla Bonita</p>
          <p>Via Ponte Vetero 11, 20121 Milano</p>
          <p>+39 339 747 0384</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: process.env.FROM_EMAIL || 'eventi@italyondemand.partners',
    to: ticketData.customerEmail,
    subject: '🎵 Il tuo biglietto per DJ Set - Isla Bonita',
    html: emailHtml
  });
}

function generateDivanettiEmailTemplate({ name, email, phone, message }) {
  return `
    <h2>Nuova Richiesta Prenotazione Divanetti</h2>
    <p><strong>Nome:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Telefono:</strong> ${phone || 'Non fornito'}</p>
    <p><strong>Messaggio:</strong></p>
    <p>${message || 'Nessun messaggio aggiuntivo'}</p>
    <hr>
    <p><strong>Evento:</strong> DJ Set - 24 Luglio 2025</p>
    <p><strong>Prezzo Divanetti:</strong> €50 a persona</p>
  `;
}

function generateCustomerConfirmationTemplate({ name }) {
  return `
    <h2>Richiesta Ricevuta</h2>
    <p>Ciao ${name},</p>
    <p>Abbiamo ricevuto la tua richiesta per la prenotazione dei divanetti per l'evento DJ Set del 24 luglio.</p>
    <p>Ti contatteremo entro 24 ore per confermare la disponibilità e finalizzare la prenotazione.</p>
    <p><strong>Prezzo:</strong> €50 a persona</p>
    <p>Grazie per il tuo interesse!</p>
    <hr>
    <p>ITALY ON DEMAND<br>
    giacomo.pencosavli@italyondemand.partners<br>
    +39 339 747 0384</p>
  `;
}

// Initialize database
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id UUID PRIMARY KEY,
        type VARCHAR(20) NOT NULL,
        price INTEGER NOT NULL,
        customer_name VARCHAR(255),
        customer_email VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50),
        stripe_payment_id VARCHAR(255) NOT NULL,
        qr_code TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  await initDatabase();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  pool.end();
  process.exit(0);
});

