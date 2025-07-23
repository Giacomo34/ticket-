# 🔧 Setup Repository Git - DJ Set Landing Page

## 📋 COMANDI PER INIZIALIZZARE IL REPOSITORY

### 1. Inizializzazione Repository Locale

```bash
# Naviga nella directory del progetto
cd dj-event-landing

# Inizializza repository Git
git init

# Aggiungi tutti i file al staging
git add .

# Primo commit
git commit -m "Initial commit: DJ Set landing page with backend"

# Imposta branch principale
git branch -M main
```

### 2. Creazione Repository su GitHub

1. **Vai su [github.com](https://github.com)**
2. **Clicca "New repository"**
3. **Nome repository:** `djset-landing-page`
4. **Descrizione:** `Landing page per evento DJ Set - Isla Bonita Punta Ala`
5. **Visibilità:** Private (consigliato per progetto commerciale)
6. **NON inizializzare** con README, .gitignore o license (già presenti)
7. **Clicca "Create repository"**

### 3. Collegamento Repository Remoto

```bash
# Aggiungi origin remoto (sostituisci 'yourusername' con il tuo username GitHub)
git remote add origin https://github.com/yourusername/djset-landing-page.git

# Push del codice su GitHub
git push -u origin main
```

### 4. Verifica Setup

```bash
# Verifica status repository
git status

# Verifica remote configurato
git remote -v

# Verifica branch
git branch
```

---

## 📁 STRUTTURA REPOSITORY

```
djset-landing-page/
├── .gitignore                 # File da ignorare in Git
├── .env.example              # Template variabili ambiente (ROOT)
├── package.json              # Configurazione progetto principale
├── netlify.toml              # Configurazione deploy Netlify
├── railway.json              # Configurazione deploy Railway
├── README.md                 # Documentazione principale
├── GIT_SETUP.md             # Questo file
├── PIANO_12_ORE.md          # Timeline implementazione
├── DEPLOYMENT_GUIDE.md      # Guida deploy completa
├── RIEPILOGO_FINALE.md      # Riepilogo progetto
├── ISTRUZIONI_PRODUZIONE.md # Requisiti produzione
│
├── frontend/                 # File frontend
│   ├── index.html           # Pagina principale
│   ├── styles.css           # Stili CSS
│   ├── script.js            # JavaScript demo
│   └── script-production.js # JavaScript produzione
│
├── backend/                  # File backend
│   ├── package.json         # Dipendenze backend
│   ├── server.js            # Server principale
│   └── .env.example         # Template env backend
│
└── docs/                     # Documentazione aggiuntiva
    ├── api-documentation.md
    └── deployment-checklist.md
```

---

## 🔄 WORKFLOW SVILUPPO

### Modifiche al Codice

```bash
# Verifica modifiche
git status

# Aggiungi file modificati
git add .

# Commit con messaggio descrittivo
git commit -m "Descrizione delle modifiche"

# Push su GitHub
git push origin main
```

### Branch per Funzionalità

```bash
# Crea nuovo branch per feature
git checkout -b feature/nome-funzionalita

# Lavora sulla feature...
# Commit delle modifiche
git add .
git commit -m "Implementa nuova funzionalità"

# Push del branch
git push origin feature/nome-funzionalita

# Merge su main (dopo test)
git checkout main
git merge feature/nome-funzionalita
git push origin main

# Elimina branch feature
git branch -d feature/nome-funzionalita
git push origin --delete feature/nome-funzionalita
```

---

## 🚀 DEPLOY AUTOMATICO

### Netlify (Frontend)

1. **Collega repository GitHub a Netlify**
2. **Build settings:**
   - Build command: `echo "Static site"`
   - Publish directory: `/`
3. **Deploy automatico** ad ogni push su `main`

### Railway (Backend)

1. **Collega repository GitHub a Railway**
2. **Root directory:** `/backend`
3. **Deploy automatico** ad ogni push su `main`

---

## 🔒 SICUREZZA

### File Sensibili

**MAI committare questi file:**
- `.env` (variabili ambiente reali)
- `node_modules/` (dipendenze)
- File con password o API keys
- Certificati SSL privati

### Variabili d'Ambiente

**Usa sempre `.env.example` per template:**
```bash
# Copia template
cp .env.example .env

# Modifica con valori reali
nano .env

# .env è già in .gitignore
```

---

## 📊 MONITORAGGIO

### Commit Significativi

```bash
# Setup iniziale
git commit -m "Initial setup: project structure and configuration"

# Frontend
git commit -m "Frontend: implement responsive design and Stripe integration"

# Backend
git commit -m "Backend: add payment processing and email notifications"

# Deploy
git commit -m "Deploy: configure Netlify and Railway deployment"

# Bug fix
git commit -m "Fix: resolve payment form validation issue"

# Feature
git commit -m "Feature: add admin dashboard for ticket management"
```

### Tag per Versioni

```bash
# Crea tag per versione
git tag -a v1.0.0 -m "Version 1.0.0: Initial production release"

# Push tag
git push origin v1.0.0

# Lista tag
git tag -l
```

---

## 🆘 COMANDI UTILI

### Reset e Cleanup

```bash
# Annulla modifiche non committate
git checkout -- .

# Reset all'ultimo commit
git reset --hard HEAD

# Pulisci file non tracciati
git clean -fd

# Visualizza log commit
git log --oneline -10
```

### Backup

```bash
# Crea backup locale
git bundle create backup.bundle --all

# Ripristina da backup
git clone backup.bundle restored-repo
```

---

## ✅ CHECKLIST SETUP GIT

- [ ] Repository inizializzato localmente
- [ ] .gitignore configurato correttamente
- [ ] Repository GitHub creato
- [ ] Remote origin configurato
- [ ] Primo commit effettuato
- [ ] Push su GitHub completato
- [ ] Netlify collegato per frontend
- [ ] Railway collegato per backend
- [ ] Deploy automatico testato
- [ ] Variabili ambiente configurate
- [ ] Documentazione aggiornata

---

**🎯 Risultato: Repository Git completo e pronto per sviluppo collaborativo e deploy automatico!**

