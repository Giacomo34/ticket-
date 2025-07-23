# 🚀 Guida Deployment Completa - Landing Page DJ Set

**Obiettivo:** Implementare la landing page funzionante in 12 ore utilizzando il dominio GoDaddy esistente.

---

## 📋 PREREQUISITI

### Account Necessari
- **GoDaddy:** Già disponibile ✅
- **Stripe:** Account business (registrazione gratuita)
- **Netlify:** Account gratuito per frontend hosting
- **Railway/Render:** Account gratuito per backend hosting
- **Supabase:** Account gratuito per database PostgreSQL
- **Resend:** Account gratuito per email service

### Strumenti Richiesti
- **Git:** Per version control
- **Node.js:** Versione 18+ per backend
- **Editor di codice:** VS Code consigliato

---

## 🔧 FASE 1: SETUP SERVIZI (ORE 1-2)

### Stripe Configuration

#### Registrazione Account Stripe
1. Vai su [stripe.com](https://stripe.com)
2. Clicca "Start now" e registra account business
3. Completa la verifica business (può richiedere tempo)
4. Vai su Dashboard → Developers → API keys
5. Copia le chiavi:
   - **Publishable key:** `pk_test_...` (per test) / `pk_live_...` (per produzione)
   - **Secret key:** `sk_test_...` (per test) / `sk_live_...` (per produzione)

#### Configurazione Webhook
1. Vai su Dashboard → Developers → Webhooks
2. Clicca "Add endpoint"
3. URL endpoint: `https://your-backend-url.com/webhook` (sostituire dopo deploy backend)
4. Eventi da ascoltare: `payment_intent.succeeded`
5. Copia il **Webhook signing secret:** `whsec_...`

### Database Setup (Supabase)

#### Creazione Progetto
1. Vai su [supabase.com](https://supabase.com)
2. Clicca "Start your project" → "New project"
3. Nome progetto: `djset-event`
4. Password database: genera password sicura
5. Regione: Europe (West) per performance in Italia

#### Configurazione Database
1. Vai su SQL Editor nel dashboard Supabase
2. Esegui questo script per creare la tabella:

```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL,
  price INTEGER NOT NULL,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  stripe_payment_id VARCHAR(255) NOT NULL,
  qr_code TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX idx_tickets_email ON tickets(customer_email);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE INDEX idx_tickets_stripe_payment ON tickets(stripe_payment_id);
```

3. Vai su Settings → Database
4. Copia la **Connection string:** `postgresql://postgres:[password]@[host]:5432/postgres`

### Email Service Setup (Resend)

#### Registrazione e Configurazione
1. Vai su [resend.com](https://resend.com)
2. Registra account gratuito (3000 email/mese)
3. Vai su API Keys → Create API Key
4. Nome: "DJ Set Event"
5. Copia la **API Key:** `re_...`

#### Verifica Dominio (Opzionale ma Consigliato)
1. Vai su Domains → Add Domain
2. Inserisci il tuo dominio: `italyondemand.partners`
3. Aggiungi i record DNS richiesti su GoDaddy:
   - **TXT record:** `_resend` → valore fornito da Resend
   - **CNAME record:** `resend._domainkey` → valore fornito da Resend

---

## 🌐 FASE 2: DEPLOY BACKEND (ORE 3-5)

### Preparazione Codice

#### Setup Repository Git
```bash
# Crea repository su GitHub
git init
git add .
git commit -m "Initial commit - DJ Set landing page"
git branch -M main
git remote add origin https://github.com/yourusername/djset-landing.git
git push -u origin main
```

#### Configurazione Environment Variables
Crea file `.env` nella cartella `backend/`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_actual_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Database Configuration
DATABASE_URL=postgresql://postgres:your_password@your_host:5432/postgres

# Email Configuration
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=eventi@italyondemand.partners

# Frontend Configuration
FRONTEND_URL=https://your-domain.com
FRONTEND_DOMAIN=your-domain.com

# Admin Configuration
ADMIN_TOKEN=generate_secure_random_token_here

# Server Configuration
PORT=3000
NODE_ENV=production
```

### Deploy su Railway

#### Setup Railway
1. Vai su [railway.app](https://railway.app)
2. Registra account con GitHub
3. Clicca "New Project" → "Deploy from GitHub repo"
4. Seleziona il repository creato
5. Seleziona la cartella `backend/`

#### Configurazione Railway
1. Vai su Variables tab
2. Aggiungi tutte le variabili d'ambiente dal file `.env`
3. Vai su Settings → Domains
4. Genera dominio Railway: `your-app-name.railway.app`
5. Opzionale: aggiungi dominio personalizzato

#### Test Deploy
1. Vai su Deployments tab
2. Attendi completamento deploy (5-10 minuti)
3. Testa endpoint: `https://your-backend-url.railway.app/health`
4. Dovresti vedere: `{"status":"OK","timestamp":"..."}`

### Aggiornamento Webhook Stripe
1. Torna su Stripe Dashboard → Webhooks
2. Modifica l'endpoint creato prima
3. Nuovo URL: `https://your-backend-url.railway.app/webhook`
4. Salva modifiche

---

## 🎨 FASE 3: DEPLOY FRONTEND (ORE 6-8)

### Preparazione Frontend

#### Aggiornamento Configurazione
1. Apri `script-production.js`
2. Modifica le configurazioni:

```javascript
// Configuration
const API_BASE_URL = 'https://your-backend-url.railway.app';
const STRIPE_PUBLISHABLE_KEY = 'pk_live_your_actual_publishable_key';
```

3. Rinomina `script-production.js` in `script.js` (sostituisci quello esistente)
4. Aggiungi Stripe.js all'HTML:

```html
<!-- Aggiungi prima del tag </head> in index.html -->
<script src="https://js.stripe.com/v3/"></script>
```

### Deploy su Netlify

#### Setup Netlify
1. Vai su [netlify.com](https://netlify.com)
2. Registra account con GitHub
3. Clicca "New site from Git"
4. Seleziona GitHub → autorizza Netlify
5. Seleziona il repository
6. Build settings:
   - **Build command:** (lascia vuoto)
   - **Publish directory:** `/` (root)
7. Clicca "Deploy site"

#### Configurazione Dominio GoDaddy
1. Netlify genererà un URL temporaneo: `random-name.netlify.app`
2. Vai su Site settings → Domain management
3. Clicca "Add custom domain"
4. Inserisci il tuo dominio: `your-domain.com`

#### Configurazione DNS su GoDaddy
1. Accedi al pannello GoDaddy
2. Vai su "My Products" → "DNS"
3. Modifica i record DNS:

**Per dominio principale (example.com):**
```
Type: A
Name: @
Value: 75.2.60.5
TTL: 600
```

**Per www (www.example.com):**
```
Type: CNAME
Name: www
Value: random-name.netlify.app
TTL: 600
```

#### Attivazione HTTPS
1. Torna su Netlify → Domain settings
2. Clicca "Verify DNS configuration"
3. Attendi propagazione DNS (2-24 ore)
4. Netlify attiverà automaticamente SSL/HTTPS

---

## 🧪 FASE 4: TEST E VALIDAZIONE (ORE 9-11)

### Test Backend

#### Test API Endpoints
```bash
# Test health check
curl https://your-backend-url.railway.app/health

# Test payment intent creation (sostituisci con dati reali)
curl -X POST https://your-backend-url.railway.app/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{
    "ticketType": "standard",
    "price": 10,
    "customerInfo": {
      "name": "Test User",
      "email": "test@example.com"
    }
  }'
```

#### Test Database Connection
1. Vai su Supabase Dashboard → Table Editor
2. Verifica che la tabella `tickets` sia stata creata
3. Prova a inserire un record manualmente per test

### Test Frontend

#### Test Funzionalità
1. Apri il sito su `https://your-domain.com`
2. Testa responsive design su mobile/desktop
3. Prova il processo di acquisto con carte test Stripe:
   - **Carta successo:** `4242 4242 4242 4242`
   - **Carta fallimento:** `4000 0000 0000 0002`
   - **CVV:** qualsiasi 3 cifre
   - **Data:** qualsiasi data futura

#### Test Email
1. Completa un acquisto test
2. Verifica ricezione email di conferma
3. Controlla che il QR code sia presente e leggibile

### Test Integrazione Completa

#### Flusso Acquisto Completo
1. **Frontend:** Selezione biglietto → Form cliente → Pagamento
2. **Backend:** Creazione payment intent → Webhook → Generazione biglietto
3. **Database:** Salvataggio dati biglietto
4. **Email:** Invio automatico con QR code

#### Test Divanetti
1. Clicca "Contatta per Prenotazione"
2. Compila form richiesta
3. Verifica ricezione email su `giacomo.pencosavli@italyondemand.partners`

---

## 🔧 FASE 5: OTTIMIZZAZIONI (ORA 11)

### Performance Frontend

#### Compressione e Minificazione
1. Su Netlify → Site settings → Build & deploy
2. Attiva "Asset optimization":
   - Bundle CSS
   - Minify CSS
   - Minify JS
   - Compress images

#### Cache Headers
Crea file `_headers` nella root del progetto:
```
/*
  Cache-Control: public, max-age=31536000
  
/*.html
  Cache-Control: public, max-age=0, must-revalidate

/*.css
  Cache-Control: public, max-age=31536000

/*.js
  Cache-Control: public, max-age=31536000
```

### Monitoring e Analytics

#### Google Analytics
1. Crea account Google Analytics
2. Aggiungi tracking code all'HTML:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

#### Uptime Monitoring
1. Registra account su [uptimerobot.com](https://uptimerobot.com) (gratuito)
2. Aggiungi monitor per:
   - Frontend: `https://your-domain.com`
   - Backend: `https://your-backend-url.railway.app/health`
3. Configura notifiche email per downtime

---

## 🚀 FASE 6: GO-LIVE (ORA 12)

### Switch a Produzione

#### Stripe Live Mode
1. Vai su Stripe Dashboard
2. Toggle da "Test mode" a "Live mode"
3. Copia le nuove chiavi live:
   - Publishable key: `pk_live_...`
   - Secret key: `sk_live_...`
4. Aggiorna variabili d'ambiente su Railway e nel frontend

#### Verifica Finale
1. **DNS:** Verifica che il dominio punti correttamente
2. **SSL:** Verifica certificato HTTPS valido
3. **Backend:** Test endpoint `/health`
4. **Database:** Verifica connessione
5. **Email:** Test invio email

### Test Acquisto Reale
1. Effettua un acquisto test con carta reale (importo minimo)
2. Verifica tutto il flusso end-to-end
3. Controlla ricezione email con QR code
4. Verifica salvataggio nel database

### Backup e Sicurezza

#### Backup Database
```sql
-- Esegui su Supabase per backup
SELECT * FROM tickets;
```

#### Monitoraggio Errori
1. Configura logging su Railway
2. Monitora dashboard Stripe per transazioni
3. Controlla email delivery su Resend

---

## 📊 DASHBOARD VENDITE SEMPLICE

### Endpoint Admin
Il backend include endpoint `/admin/tickets` per visualizzare vendite:

```bash
curl -H "Authorization: Bearer your-admin-token" \
  https://your-backend-url.railway.app/admin/tickets
```

### Visualizzazione Vendite
Crea file `admin.html` semplice:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Dashboard Vendite DJ Set</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #2d5016; color: white; }
    </style>
</head>
<body>
    <h1>Dashboard Vendite DJ Set</h1>
    <div id="stats"></div>
    <table id="ticketsTable">
        <thead>
            <tr>
                <th>Data</th>
                <th>Nome</th>
                <th>Email</th>
                <th>Tipo</th>
                <th>Prezzo</th>
            </tr>
        </thead>
        <tbody></tbody>
    </table>

    <script>
        const ADMIN_TOKEN = 'your-admin-token';
        const API_URL = 'https://your-backend-url.railway.app';

        async function loadTickets() {
            try {
                const response = await fetch(`${API_URL}/admin/tickets`, {
                    headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
                });
                const tickets = await response.json();
                
                displayStats(tickets);
                displayTickets(tickets);
            } catch (error) {
                console.error('Error loading tickets:', error);
            }
        }

        function displayStats(tickets) {
            const totalRevenue = tickets.reduce((sum, ticket) => sum + ticket.price, 0);
            const totalTickets = tickets.length;
            
            document.getElementById('stats').innerHTML = `
                <p><strong>Biglietti Venduti:</strong> ${totalTickets}</p>
                <p><strong>Ricavi Totali:</strong> €${totalRevenue}</p>
            `;
        }

        function displayTickets(tickets) {
            const tbody = document.querySelector('#ticketsTable tbody');
            tbody.innerHTML = tickets.map(ticket => `
                <tr>
                    <td>${new Date(ticket.created_at).toLocaleDateString('it-IT')}</td>
                    <td>${ticket.customer_name || 'N/A'}</td>
                    <td>${ticket.customer_email}</td>
                    <td>${ticket.type}</td>
                    <td>€${ticket.price}</td>
                </tr>
            `).join('');
        }

        loadTickets();
        setInterval(loadTickets, 30000); // Refresh ogni 30 secondi
    </script>
</body>
</html>
```

---

## 🔒 SICUREZZA E BEST PRACTICES

### Variabili d'Ambiente
- **Mai committare** file `.env` su Git
- Usa **token sicuri** per admin access
- **Rota periodicamente** le API keys

### Rate Limiting
Il backend include rate limiting (100 richieste/15 minuti per IP)

### Validazione Input
Tutti gli endpoint validano input per prevenire injection attacks

### HTTPS Only
- Frontend e backend devono usare **solo HTTPS**
- Stripe richiede HTTPS per pagamenti live

---

## 📞 SUPPORTO POST-DEPLOY

### Monitoraggio Continuo
- **Uptime:** UptimeRobot per availability
- **Errori:** Log Railway per backend errors
- **Pagamenti:** Dashboard Stripe per transazioni
- **Email:** Dashboard Resend per delivery

### Manutenzione
- **Backup database:** Settimanale
- **Update dipendenze:** Mensile
- **Monitoring logs:** Giornaliero durante evento

### Contatti Emergenza
- **Stripe Support:** [support.stripe.com](https://support.stripe.com)
- **Railway Support:** [help.railway.app](https://help.railway.app)
- **Netlify Support:** [support.netlify.com](https://support.netlify.com)

---

## ✅ CHECKLIST FINALE

### Pre-Launch
- [ ] Stripe in live mode
- [ ] DNS propagato correttamente
- [ ] HTTPS attivo e funzionante
- [ ] Backend health check OK
- [ ] Database connesso
- [ ] Email service configurato
- [ ] Test acquisto reale completato

### Post-Launch
- [ ] Monitoring attivo
- [ ] Backup configurato
- [ ] Dashboard admin accessibile
- [ ] Documentazione aggiornata
- [ ] Team informato su procedure

---

**🎉 RISULTATO: Landing page completamente funzionante con pagamenti reali, biglietti automatici e monitoraggio in 12 ore!**

