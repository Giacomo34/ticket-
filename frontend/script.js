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
});

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
    // Store current ticket info
    currentTicket = {
        type: ticketType,
        price: price,
        id: generateTicketId(),
        purchaseDate: new Date().toISOString()
    };
    
    // Simulate payment process
    showPaymentProcess(ticketType, price);
}

// Show payment process
function showPaymentProcess(ticketType, price) {
    // Create payment overlay
    const paymentOverlay = document.createElement('div');
    paymentOverlay.className = 'payment-overlay';
    paymentOverlay.innerHTML = `
        <div class="payment-modal">
            <h3>Acquisto Biglietto ${capitalizeFirst(ticketType)}</h3>
            <div class="payment-details">
                <p><strong>Prezzo:</strong> €${price}</p>
                <p><strong>Evento:</strong> ${eventDetails.name}</p>
                <p><strong>Data:</strong> ${eventDetails.date}</p>
            </div>
            <div class="payment-methods-selection">
                <h4>Seleziona metodo di pagamento:</h4>
                <button class="payment-btn" onclick="processPayment('credit-card')">
                    💳 Carta di Credito
                </button>
                <button class="payment-btn apple-pay" onclick="processPayment('apple-pay')">
                    📱 Apple Pay
                </button>
            </div>
            <button class="cancel-btn" onclick="cancelPayment()">Annulla</button>
        </div>
    `;
    
    // Add styles for payment overlay
    const style = document.createElement('style');
    style.textContent = `
        .payment-overlay {
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
        
        .payment-modal {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            animation: slideIn 0.3s ease;
        }
        
        .payment-details {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 8px;
            margin: 1rem 0;
        }
        
        .payment-methods-selection {
            margin: 2rem 0;
        }
        
        .payment-btn {
            display: block;
            width: 100%;
            padding: 1rem;
            margin: 0.5rem 0;
            border: 2px solid #2d5016;
            background: white;
            color: #2d5016;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        
        .payment-btn:hover {
            background: #2d5016;
            color: white;
        }
        
        .apple-pay {
            background: #000;
            color: white;
            border-color: #000;
        }
        
        .apple-pay:hover {
            background: #333;
        }
        
        .cancel-btn {
            background: #6c757d;
            color: white;
            border: none;
            padding: 0.75rem 2rem;
            border-radius: 8px;
            cursor: pointer;
            margin-top: 1rem;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(paymentOverlay);
}

// Process payment
function processPayment(method) {
    // Remove payment overlay
    const overlay = document.querySelector('.payment-overlay');
    if (overlay) {
        overlay.remove();
    }
    
    // Show loading
    showLoadingSpinner();
    
    // Simulate payment processing
    setTimeout(() => {
        hideLoadingSpinner();
        
        // Show success and wallet modal
        showTicketDetails();
        showModal();
        
        // Track purchase (in real implementation, this would be sent to analytics)
        trackPurchase(currentTicket, method);
        
    }, 2000);
}

// Cancel payment
function cancelPayment() {
    const overlay = document.querySelector('.payment-overlay');
    if (overlay) {
        overlay.remove();
    }
    currentTicket = null;
}

// Show loading spinner
function showLoadingSpinner() {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.innerHTML = `
        <div class="spinner-overlay">
            <div class="spinner"></div>
            <p>Elaborazione pagamento...</p>
        </div>
    `;
    
    const spinnerStyle = document.createElement('style');
    spinnerStyle.textContent = `
        .loading-spinner {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 3000;
        }
        
        .spinner-overlay {
            text-align: center;
            color: white;
        }
        
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #2d5016;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    
    document.head.appendChild(spinnerStyle);
    document.body.appendChild(spinner);
}

// Hide loading spinner
function hideLoadingSpinner() {
    const spinner = document.querySelector('.loading-spinner');
    if (spinner) {
        spinner.remove();
    }
}

// Generate unique ticket ID
function generateTicketId() {
    return 'TICKET-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Show ticket details in modal
function showTicketDetails() {
    if (!currentTicket) return;
    
    const ticketTypeNames = {
        'standard': 'Standard',
        'plus': 'Plus',
        'divanetti': 'Divanetti'
    };
    
    const ticketDescriptions = {
        'standard': 'Due Aperol Spritz inclusi',
        'plus': 'Due Aperol Spritz + Antipasti',
        'divanetti': 'Prenotazione tavolo riservato'
    };
    
    ticketDetailsDiv.innerHTML = `
        <div class="ticket-detail-item">
            <strong>ID Biglietto:</strong> ${currentTicket.id}
        </div>
        <div class="ticket-detail-item">
            <strong>Tipo:</strong> ${ticketTypeNames[currentTicket.type]}
        </div>
        <div class="ticket-detail-item">
            <strong>Descrizione:</strong> ${ticketDescriptions[currentTicket.type]}
        </div>
        <div class="ticket-detail-item">
            <strong>Prezzo:</strong> €${currentTicket.price}
        </div>
        <div class="ticket-detail-item">
            <strong>Evento:</strong> ${eventDetails.name}
        </div>
        <div class="ticket-detail-item">
            <strong>Data:</strong> ${eventDetails.date}
        </div>
        <div class="ticket-detail-item">
            <strong>Orario:</strong> ${eventDetails.time}
        </div>
        <div class="ticket-detail-item">
            <strong>Location:</strong> ${eventDetails.location}
        </div>
        <div class="ticket-detail-item">
            <strong>Data Acquisto:</strong> ${new Date(currentTicket.purchaseDate).toLocaleDateString('it-IT')}
        </div>
    `;
}

// Show modal
function showModal() {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Add to Apple Wallet
function addToAppleWallet() {
    if (!currentTicket) return;
    
    // In a real implementation, this would generate a .pkpass file
    // For demo purposes, we'll simulate the process
    
    if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
        // iOS device detected
        showWalletSuccess('Apple Wallet');
        
        // Simulate Apple Wallet integration
        setTimeout(() => {
            // This would normally trigger the actual wallet integration
            alert('Biglietto aggiunto ad Apple Wallet! (Simulazione)');
        }, 1000);
    } else {
        // Not an iOS device
        showWalletError('Apple Wallet non è disponibile su questo dispositivo.');
    }
}

// Add to Google Wallet
function addToGoogleWallet() {
    if (!currentTicket) return;
    
    // In a real implementation, this would use Google Wallet API
    // For demo purposes, we'll simulate the process
    
    showWalletSuccess('Google Wallet');
    
    // Simulate Google Wallet integration
    setTimeout(() => {
        // This would normally trigger the actual wallet integration
        alert('Biglietto aggiunto a Google Wallet! (Simulazione)');
    }, 1000);
}

// Show wallet success message
function showWalletSuccess(walletType) {
    const successMsg = document.createElement('div');
    successMsg.className = 'wallet-success';
    successMsg.innerHTML = `
        <div class="success-content">
            <div class="success-icon">✅</div>
            <p>Aggiungendo a ${walletType}...</p>
        </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        .wallet-success {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2d5016;
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            z-index: 4000;
            animation: slideInRight 0.3s ease;
        }
        
        .success-content {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .success-icon {
            font-size: 1.2rem;
        }
        
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(successMsg);
    
    // Remove after 3 seconds
    setTimeout(() => {
        successMsg.remove();
    }, 3000);
}

// Show wallet error message
function showWalletError(message) {
    const errorMsg = document.createElement('div');
    errorMsg.className = 'wallet-error';
    errorMsg.innerHTML = `
        <div class="error-content">
            <div class="error-icon">❌</div>
            <p>${message}</p>
        </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        .wallet-error {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            z-index: 4000;
            animation: slideInRight 0.3s ease;
        }
        
        .error-content {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .error-icon {
            font-size: 1.2rem;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(errorMsg);
    
    // Remove after 5 seconds
    setTimeout(() => {
        errorMsg.remove();
    }, 5000);
}

// Contact for reservation (Divanetti)
function contactForReservation() {
    const contactInfo = `
Contatta ITALY ON DEMAND per prenotare i divanetti:

📧 Email: giacomo.pencosavli@italyondemand.partners
📞 Telefono: +39 339 747 0384

Sede: Via Ponte Vetero 11, 20121 Milano

Prezzo: €50 a persona
    `;
    
    // Show contact modal
    const contactModal = document.createElement('div');
    contactModal.className = 'contact-modal-overlay';
    contactModal.innerHTML = `
        <div class="contact-modal">
            <span class="close-contact" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h3>Prenotazione Divanetti</h3>
            <div class="contact-info">
                <pre>${contactInfo}</pre>
            </div>
            <div class="contact-actions">
                <a href="mailto:giacomo.pencosavli@italyondemand.partners?subject=Prenotazione Divanetti - DJ Set 24 Luglio&body=Salve, vorrei prenotare dei divanetti per l'evento DJ Set del 24 luglio all'Isla Bonita. Grazie." 
                   class="btn btn-primary">Invia Email</a>
                <a href="tel:+393397470384" class="btn btn-secondary">Chiama Ora</a>
            </div>
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
            padding: 1.5rem;
            border-radius: 8px;
            margin: 1rem 0;
        }
        
        .contact-info pre {
            white-space: pre-line;
            font-family: inherit;
            margin: 0;
            line-height: 1.6;
        }
        
        .contact-actions {
            display: flex;
            gap: 1rem;
            margin-top: 2rem;
            flex-wrap: wrap;
        }
        
        .contact-actions .btn {
            flex: 1;
            min-width: auto;
            text-align: center;
        }
    `;
    
    document.head.appendChild(contactStyle);
    document.body.appendChild(contactModal);
}

// Track purchase (analytics)
function trackPurchase(ticket, paymentMethod) {
    // In a real implementation, this would send data to analytics services
    console.log('Purchase tracked:', {
        ticketId: ticket.id,
        ticketType: ticket.type,
        price: ticket.price,
        paymentMethod: paymentMethod,
        timestamp: ticket.purchaseDate,
        event: eventDetails.name
    });
}

// Utility function to capitalize first letter
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Add smooth scroll behavior for better UX
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

