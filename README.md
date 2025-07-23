# 🎵 DJ Set Landing Page - Isla Bonita Punta Ala

Landing page professionale per la vendita di biglietti per l'evento DJ Set del 24 luglio 2025.

## 🚀 Quick Start

### Per Implementazione Immediata (12 ore):
1. **Leggi:** [`docs/RIEPILOGO_FINALE.md`](docs/RIEPILOGO_FINALE.md)
2. **Segui:** [`docs/PIANO_12_ORE.md`](docs/PIANO_12_ORE.md)
3. **Deploy:** [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md)

### Setup Repository Git:
1. **Leggi:** [`GIT_SETUP.md`](GIT_SETUP.md)
2. **Esegui i comandi Git** per inizializzare il repository

## 📁 Struttura Progetto

```
djset-landing-page/
├── 📄 README.md                    # Questo file
├── 📄 .env.example                 # Template variabili ambiente
├── 📄 .gitignore                   # File da ignorare in Git
├── 📄 package.json                 # Configurazione progetto
├── 📄 netlify.toml                 # Configurazione Netlify
├── 📄 railway.json                 # Configurazione Railway
├── 📄 GIT_SETUP.md                 # Istruzioni setup Git
│
├── 📁 frontend/                    # File frontend
│   ├── index.html                  # Pagina principale
│   ├── styles.css                  # Stili CSS responsive
│   ├── script.js                   # JavaScript demo
│   └── script-production.js        # JavaScript produzione
│
├── 📁 backend/                     # Server Node.js
│   ├── package.json                # Dipendenze backend
│   ├── server.js                   # Server Express completo
│   └── .env.example                # Template env backend
│
└── 📁 docs/                        # Documentazione
    ├── RIEPILOGO_FINALE.md         # Overview completa
    ├── PIANO_12_ORE.md             # Timeline implementazione
    ├── DEPLOYMENT_GUIDE.md         # Guida deploy step-by-step
    └── ISTRUZIONI_PRODUZIONE.md    # Requisiti produzione
```

## 🎯 Caratteristiche

### 🎨 Design
- **Estetica:** Italiana e minimalista
- **Colori:** Verde scuro (#2d5016), bianco, nero
- **Responsive:** Ottimizzato per mobile e desktop
- **Font:** Inter (Google Fonts)

### 🎫 Funzionalità
- **3 Tipi di Biglietti:**
  - Standard: €10 (Due Aperol Spritz)
  - Plus: €15 (Due Aperol Spritz + Antipasti) - CONSIGLIATO
  - Divanetti: €50/persona (Prenotazione tavolo)

- **💳 Pagamenti:** Stripe con carta di credito e Apple Pay
- **📱 Wallet:** Integrazione Apple/Google Wallet (in sviluppo)
- **📧 Email:** Conferme automatiche con QR code
- **📊 Admin:** Dashboard vendite semplice

### 🏢 Dettagli Evento
- **Data:** 24 Luglio 2025
- **Orario:** 18:00 - 22:00
- **Location:** Isla Bonita, Punta Ala
- **Organizzatore:** ITALY ON DEMAND in collaborazione con Isla Bonita

## 💻 Stack Tecnologico

### Frontend
- HTML5/CSS3/JavaScript vanilla
- Stripe Elements per pagamenti
- Design responsive mobile-first

### Backend
- Node.js + Express
- PostgreSQL (Supabase)
- Stripe API + Webhooks
- Nodemailer + Resend per email

### Hosting
- **Frontend:** Netlify (CDN globale)
- **Backend:** Railway (auto-scaling)
- **Database:** Supabase (managed PostgreSQL)
- **Email:** Resend (deliverability ottimizzata)

## 💰 Costi

### Gratuiti
- Netlify hosting frontend
- Railway backend (primo mese)
- Supabase database (500MB)
- Resend email (3000/mese)

### A Pagamento
- **Stripe:** 2.9% + €0.25 per transazione
- **Railway:** €5-10/mese dopo primo mese

## 🚀 Deploy

### Frontend (Netlify)
1. Collega repository GitHub
2. Build directory: `frontend/`
3. Deploy automatico su push

### Backend (Railway)
1. Collega repository GitHub
2. Root directory: `backend/`
3. Variabili ambiente da `.env.example`

## 📞 Contatti

**ITALY ON DEMAND**
- **Email:** giacomo.pencosavli@italyondemand.partners
- **Telefono:** +39 339 747 0384
- **Sede:** Via Ponte Vetero 11, 20121 Milano

## 📄 Licenza

MIT License - Vedi file LICENSE per dettagli.

---

**🎯 Obiettivo: Landing page funzionante in 12 ore con dominio GoDaddy!**

*Tutto il codice è pronto, la documentazione è completa, il piano è dettagliato.*

