// Production version of script.js with real backend integration

// Configuration
const API_BASE_URL = 'https://ticket-production-f452.up.railway.app'; // Replace with actual backend URL
const STRIPE_PUBLISHABLE_KEY = 'pk_live_...'; // Replace with actual Stripe publishable key

// Initialize Stripe
const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
let elements;
let cardElement;

// Global variables
let currentTicket = null;
const eventDetails = {
    name: "DJ Set - Isla Bonita",
    date: "24 Luglio 2025",
    time: "18:00 - 22:00",
    location: "Isla Bonita, Punta Ala",
    organizer: "ITALY ON DEMAND"
};

// DOM Elements
const modal = document.getElementById('walletModal');
const closeBtn = document.querySelector('.close');
const ticketDetailsDiv = document.getElementById('ticketDetails');

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    detectDevice();
    initializeStripe();
});

// Initialize Stripe Elements
function initializeStripe() {
    elements = stripe.elements();
    
    // Create card element
    cardElement = elements.create('card', {
        style: {
            base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                    color: '#aab7c4',
                },
            },
        },
    });
}

// Initialize event listeners
function initializeEventListeners() {
    // Close modal when clicking the X
    closeBtn.addEventListener('click', closeModal);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // Wallet buttons
    document.getElementById('addToAppleWallet').addEventListener('click', addToAppleWallet);
    document.getElementById('addToGoogleWallet').addEventListener('click', addToGoogleWallet);
    
    // Smooth scrolling for internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Detect device type for wallet prioritization
function detectDevice() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) {
        // Prioritize Apple Wallet on iOS devices
        const appleWalletBtn = document.getElementById('addToAppleWallet');
        const googleWalletBtn = document.getElementById('addToGoogleWallet');
        
        appleWalletBtn.style.order = '1';
        googleWalletBtn.style.order = '2';
        appleWalletBtn.classList.remove('btn-secondary');
        appleWalletBtn.classList.add('btn-primary');
        googleWalletBtn.classList.remove('btn-primary');
        googleWalletBtn.classList.add('btn-secondary');
    }
}

// Purchase ticket function
function purchaseTicket(ticketType, price) {
    // Validate ticket type
    if (ticketType === 'divanetti') {
        contactForReservation();
        return;
    }
    
    // Store current ticket info
    currentTicket = {
        type: ticketType,
        price: price,
        id: null, // Will be set after successful payment
        purchaseDate: new Date().toISOString()
    };
    
    // Show customer info form
    showCustomerInfoForm(ticketType, price);
}

// Show customer info form
function showCustomerInfoForm(ticketType, price) {
    const formOverlay = document.createElement('div');
    formOverlay.className = 'form-overlay';
    formOverlay.innerHTML = `
        <div class="form-modal">
            <h3>Informazioni Cliente</h3>
            <form id="customerForm">
                <div class="form-group">
                    <label for="customerName">Nome Completo *</label>
                    <input type="text" id="customerName" required>
                </div>
                <div class="form-group">
                    <label for="customerEmail">Email *</label>
                    <input type="email" id="customerEmail" required>
                </div>
                <div class="form-group">
                    <label for="customerPhone">Telefono</label>
                    <input type="tel" id="customerPhone">
                </div>
                <div class="form-group">
                    <label>Carta di Credito *</label>
                    <div id="card-element"></div>
                    <div id="card-errors" role="alert"></div>
                </div>
                <div class="form-actions">
                    <button type="button" onclick="cancelPurchase()" class="btn btn-secondary">Annulla</button>
                    <button type="submit" class="btn btn-primary">Paga €${price}</button>
                </div>
            </form>
        </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .form-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
            animation: fadeIn 0.3s ease;
        }
        
        .form-modal {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            animation: slideIn 0.3s ease;
        }
        
        .form-group {
            margin-bottom: 1rem;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: #2d5016;
        }
        
        .form-group input {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 1rem;
        }
        
        .form-group input:focus {
            outline: none;
            border-color: #2d5016;
        }
        
        #card-element {
            padding: 0.75rem;
            border: 2px solid #ddd;
            border-radius: 8px;
            background: white;
        }
        
        #card-errors {
            color: #dc3545;
            margin-top: 0.5rem;
            font-size: 0.875rem;
        }
        
        .form-actions {
            display: flex;
            gap: 1rem;
            margin-top: 2rem;
        }
        
        .form-actions .btn {
            flex: 1;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(formOverlay);
    
    // Mount Stripe card element
    setTimeout(() => {
        cardElement.mount('#card-element');
        
        // Handle real-time validation errors from the card Element
        cardElement.on('change', ({error}) => {
            const displayError = document.getElementById('card-errors');
            if (error) {
                displayError.textContent = error.message;
            } else {
                displayError.textContent = '';
            }
        });
        
        // Handle form submission
        document.getElementById('customerForm').addEventListener('submit', handleFormSubmit);
    }, 100);
}

// Handle form submission
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const name = document.getElementById('customerName').value;
    const email = document.getElementById('customerEmail').value;
    const phone = document.getElementById('customerPhone').value;
    
    if (!name || !email) {
        alert('Nome e email sono obbligatori');
        return;
    }
    
    // Disable submit button
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Elaborazione...';
    
    try {
        // Create payment intent
        const response = await fetch(`${API_BASE_URL}/create-payment-intent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ticketType: currentTicket.type,
                price: currentTicket.price,
                customerInfo: { name, email, phone }
            })
        });
        
        const { clientSecret } = await response.json();
        
        // Confirm payment
        const result = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: cardElement,
                billing_details: {
                    name: name,
                    email: email
                }
            }
        });
        
        if (result.error) {
            // Show error to customer
            document.getElementById('card-errors').textContent = result.error.message;
            submitBtn.disabled = false;
            submitBtn.textContent = `Paga €${currentTicket.price}`;
        } else {
            // Payment succeeded
            currentTicket.customerInfo = { name, email, phone };
            
            // Remove form overlay
            document.querySelector('.form-overlay').remove();
            
            // Show success message
            showPaymentSuccess();
        }
        
    } catch (error) {
        console.error('Error processing payment:', error);
        alert('Errore durante il pagamento. Riprova.');
        submitBtn.disabled = false;
        submitBtn.textContent = `Paga €${currentTicket.price}`;
    }
}

// Cancel purchase
function cancelPurchase() {
    const overlay = document.querySelector('.form-overlay');
    if (overlay) {
        overlay.remove();
    }
    currentTicket = null;
}

// Show payment success
function showPaymentSuccess() {
    const successOverlay = document.createElement('div');
    successOverlay.className = 'success-overlay';
    successOverlay.innerHTML = `
        <div class="success-modal">
            <div class="success-icon">✅</div>
            <h3>Pagamento Completato!</h3>
            <p>Il tuo biglietto è stato acquistato con successo.</p>
            <p>Riceverai una email di conferma con il QR code entro pochi minuti.</p>
            <button onclick="closeSuccessModal()" class="btn btn-primary">OK</button>
        </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        .success-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 3000;
            animation: fadeIn 0.3s ease;
        }
        
        .success-modal {
            background: white;
            padding: 3rem 2rem;
            border-radius: 12px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            animation: slideIn 0.3s ease;
        }
        
        .success-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
        
        .success-modal h3 {
            color: #2d5016;
            margin-bottom: 1rem;
        }
        
        .success-modal p {
            margin-bottom: 1rem;
            color: #666;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(successOverlay);
}

// Close success modal
function closeSuccessModal() {
    const overlay = document.querySelector('.success-overlay');
    if (overlay) {
        overlay.remove();
    }
    currentTicket = null;
}

// Contact for reservation (Divanetti)
function contactForReservation() {
    const contactModal = document.createElement('div');
    contactModal.className = 'contact-modal-overlay';
    contactModal.innerHTML = `
        <div class="contact-modal">
            <span class="close-contact" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h3>Prenotazione Divanetti</h3>
            <form id="divanettiForm">
                <div class="form-group">
                    <label for="divanettiName">Nome Completo *</label>
                    <input type="text" id="divanettiName" required>
                </div>
                <div class="form-group">
                    <label for="divanettiEmail">Email *</label>
                    <input type="email" id="divanettiEmail" required>
                </div>
                <div class="form-group">
                    <label for="divanettiPhone">Telefono</label>
                    <input type="tel" id="divanettiPhone">
                </div>
                <div class="form-group">
                    <label for="divanettiMessage">Messaggio (numero persone, richieste speciali)</label>
                    <textarea id="divanettiMessage" rows="3"></textarea>
                </div>
                <div class="contact-info">
                    <p><strong>Prezzo:</strong> €50 a persona</p>
                    <p><strong>Include:</strong> Tavolo riservato per tutta la serata</p>
                </div>
                <div class="form-actions">
                    <button type="button" onclick="this.closest('.contact-modal-overlay').remove()" class="btn btn-secondary">Annulla</button>
                    <button type="submit" class="btn btn-primary">Invia Richiesta</button>
                </div>
            </form>
        </div>
    `;
    
    const contactStyle = document.createElement('style');
    contactStyle.textContent = `
        .contact-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
            animation: fadeIn 0.3s ease;
        }
        
        .contact-modal {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
            animation: slideIn 0.3s ease;
        }
        
        .close-contact {
            position: absolute;
            right: 1rem;
            top: 1rem;
            font-size: 2rem;
            cursor: pointer;
            color: #6c757d;
        }
        
        .contact-info {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
        }
        
        textarea {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #ddd;
            border-radius: 8px;
            font-size: 1rem;
            font-family: inherit;
            resize: vertical;
        }
    `;
    
    document.head.appendChild(contactStyle);
    document.body.appendChild(contactModal);
    
    // Handle form submission
    document.getElementById('divanettiForm').addEventListener('submit', handleDivanettiSubmit);
}

// Handle divanetti form submission
async function handleDivanettiSubmit(event) {
    event.preventDefault();
    
    const name = document.getElementById('divanettiName').value;
    const email = document.getElementById('divanettiEmail').value;
    const phone = document.getElementById('divanettiPhone').value;
    const message = document.getElementById('divanettiMessage').value;
    
    if (!name || !email) {
        alert('Nome e email sono obbligatori');
        return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Invio...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/contact-divanetti`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, phone, message })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Richiesta inviata con successo! Ti contatteremo entro 24 ore.');
            document.querySelector('.contact-modal-overlay').remove();
        } else {
            alert('Errore durante l\'invio. Riprova o contattaci direttamente.');
        }
        
    } catch (error) {
        console.error('Error sending divanetti request:', error);
        alert('Errore durante l\'invio. Riprova o contattaci direttamente.');
    }
    
    submitBtn.disabled = false;
    submitBtn.textContent = 'Invia Richiesta';
}

// Wallet functions (placeholder - require additional implementation)
function addToAppleWallet() {
    alert('Funzionalità Apple Wallet in sviluppo. Il biglietto è disponibile via email.');
}

function addToGoogleWallet() {
    alert('Funzionalità Google Wallet in sviluppo. Il biglietto è disponibile via email.');
}

// Utility functions
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Add smooth scroll behavior
document.documentElement.style.scrollBehavior = 'smooth';

// Add entrance animations on scroll
function addScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    document.querySelectorAll('.offering-item, .ticket-card, .contact-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Initialize scroll animations when DOM is loaded
document.addEventListener('DOMContentLoaded', addScrollAnimations);

