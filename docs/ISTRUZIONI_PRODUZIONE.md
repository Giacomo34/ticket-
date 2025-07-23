# Landing Page DJ Set - Istruzioni per la Produzione

## 📋 Cosa Serve per Far Funzionare Perfettamente la Landing Page

### 1. **Hosting e Dominio**
- **Hosting web** (consigliato: Netlify, Vercel, o hosting tradizionale con HTTPS)
- **Dominio personalizzato** (es. `djset.italyondemand.partners` o `evento.islabonita.it`)
- **Certificato SSL** (HTTPS obbligatorio per Apple Pay e wallet)

### 2. **Sistema di Pagamento Reale**
Attualmente la landing page simula i pagamenti. Per renderla funzionale serve:

#### **Stripe (Consigliato)**
- Account Stripe Business
- Chiavi API (Publishable Key e Secret Key)
- Configurazione Apple Pay su Stripe
- Webhook per conferme pagamento

#### **PayPal (Alternativa)**
- Account PayPal Business
- API credentials
- Configurazione PayPal Express Checkout

### 3. **Integrazione Wallet Reale**

#### **Apple Wallet**
- **Apple Developer Account** ($99/anno)
- **Merchant ID** registrato su Apple
- **Pass Type ID** per i biglietti
- **Certificati di firma** (.p12 files)
- Server per generare file `.pkpass`

#### **Google Wallet**
- **Google Cloud Console** account
- **Google Pay API** abilitata
- **Service Account** con credenziali JSON
- Configurazione Google Wallet API

### 4. **Backend per Gestione Biglietti**
Serve un backend per:
- Generare ID biglietti unici
- Salvare acquisti nel database
- Generare file wallet (.pkpass per iOS, JWT per Google)
- Inviare email di conferma
- Gestire check-in all'evento

#### **Tecnologie Consigliate:**
- **Node.js + Express** o **Python + Flask**
- **Database:** PostgreSQL o MongoDB
- **Email:** SendGrid o Mailgun
- **Storage:** AWS S3 per file wallet

### 5. **Configurazioni Necessarie**

#### **File da Modificare:**
1. **script.js** - Sostituire le simulazioni con chiamate API reali
2. **Aggiungere variabili d'ambiente** per chiavi API
3. **Configurare CORS** per domini di produzione

#### **Variabili d'Ambiente Necessarie:**
```env
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
APPLE_TEAM_ID=...
APPLE_PASS_TYPE_ID=...
GOOGLE_WALLET_ISSUER_ID=...
DATABASE_URL=...
EMAIL_API_KEY=...
```

### 6. **Funzionalità da Implementare**

#### **Immediate (Critiche):**
- [ ] Integrazione pagamenti reali (Stripe/PayPal)
- [ ] Generazione biglietti con QR code unici
- [ ] Email di conferma automatiche
- [ ] Database per tracking vendite

#### **Entro 1 Settimana:**
- [ ] Integrazione Apple Wallet completa
- [ ] Integrazione Google Wallet
- [ ] Sistema di check-in per l'evento
- [ ] Dashboard admin per monitoraggio vendite

#### **Opzionali (Miglioramenti):**
- [ ] Analytics (Google Analytics/Facebook Pixel)
- [ ] Sistema di sconti/codici promozionali
- [ ] Integrazione social media
- [ ] Sistema di reminder automatici

### 7. **Test Prima del Lancio**

#### **Test Tecnici:**
- [ ] Pagamenti in modalità test (Stripe Test Mode)
- [ ] Generazione wallet su dispositivi reali
- [ ] Test responsive su tutti i dispositivi
- [ ] Test velocità caricamento (PageSpeed Insights)
- [ ] Test sicurezza SSL

#### **Test Funzionali:**
- [ ] Processo acquisto completo
- [ ] Ricezione email di conferma
- [ ] Aggiunta biglietti ai wallet
- [ ] Funzionalità contatti per divanetti

### 8. **Costi Stimati**

#### **Setup Iniziale:**
- Apple Developer Account: €99/anno
- Hosting premium: €10-50/mese
- Dominio: €10-20/anno
- Stripe fees: 2.9% + €0.25 per transazione

#### **Mensili:**
- Hosting: €10-50/mese
- Database: €5-20/mese
- Email service: €10-30/mese
- Backup e monitoring: €5-15/mese

### 9. **Timeline Implementazione**

#### **Fase 1 (1-2 giorni):**
- Setup hosting e dominio
- Configurazione Stripe test
- Deploy landing page

#### **Fase 2 (3-5 giorni):**
- Implementazione backend
- Integrazione pagamenti reali
- Sistema email

#### **Fase 3 (5-7 giorni):**
- Integrazione wallet
- Test completi
- Go-live

### 10. **Supporto Tecnico Necessario**

Per implementare tutto serve:
- **Sviluppatore Full-Stack** (Node.js/Python + Frontend)
- **Conoscenza API** (Stripe, Apple/Google Wallet)
- **DevOps** per deploy e monitoring
- **Tempo stimato:** 40-60 ore di sviluppo

---

## 🚀 Prossimi Passi Immediati

1. **Decidere il provider di pagamento** (Stripe consigliato)
2. **Registrare Apple Developer Account** se si vuole Apple Wallet
3. **Scegliere hosting e dominio**
4. **Pianificare sviluppo backend**

## 📞 Supporto

Per implementazione completa, contattare:
- **Email:** giacomo.pencosavli@italyondemand.partners
- **Telefono:** +39 339 747 0384

---

*Documento creato il 23/07/2025 - Landing Page DJ Set Isla Bonita*

