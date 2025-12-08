/**
 * XPR SimplePay DApp (v1.1)
 * WebAuth Wallet Integration for XPR Network
 * Supports sending XPR tokens through WebAuth wallet
 */

// WebAuth and XPR Network Configuration
const CONFIG = {
    chainId: '384da888112027f0321850a169f737c33e53b388aad48b5adace4bab97f437e0', // XPR Mainnet
    rpcEndpoint: 'https://xpr.greymass.com',
    explorerUrl: 'https://explorer.xprnetwork.org/transaction/',
    tokenContract: 'eosio.token',
    tokenSymbol: 'XPR',
    tokenPrecision: 4
};

// Global state
let webAuthWallet = null;
let session = null;
let isConnected = false;

/**
 * Initialize WebAuth Link
 */
async function initializeWebAuth() {
    try {
        // Wait for WebAuth to be available
        let attempts = 0;
        while (typeof WebAuth === 'undefined' && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (typeof WebAuth === 'undefined') {
            console.error('WebAuth SDK not loaded after waiting');
            showStatus('Error: WebAuth SDK not loaded. Please refresh the page.', 'error');
            return;
        }

        // Initialize WebAuth Link
        const { Link } = WebAuth;
        
        webAuthWallet = new Link({
            chains: [{
                chainId: CONFIG.chainId,
                nodeUrl: CONFIG.rpcEndpoint
            }],
            transport: WebAuth.LinkTransport.browser(),
            scheme: 'webauth'
        });

        console.log('WebAuth initialized successfully');
        
        // Try to restore previous session
        await restoreSession();
        
    } catch (error) {
        console.error('Error initializing WebAuth:', error);
        showStatus('Error initializing wallet. Please refresh the page.', 'error');
    }
}

/**
 * Connect to WebAuth Wallet
 */
async function connectWallet() {
    const connectBtn = document.getElementById('connectBtn');
    connectBtn.disabled = true;
    connectBtn.innerHTML = '<span class="loading"></span> Connecting...';

    try {
        if (!webAuthWallet) {
            await initializeWebAuth();
        }

        // Request login
        const identity = await webAuthWallet.login('xpr-payment-app');
        session = identity.session;
        
        if (session) {
            isConnected = true;
            updateWalletUI(true);
            await loadAccountBalance();
            showStatus('Wallet connected successfully!', 'success');
            
            // Save session to localStorage for persistence
            localStorage.setItem('webauth_session', JSON.stringify({
                actor: session.auth.actor.toString(),
                permission: session.auth.permission.toString()
            }));
        }

    } catch (error) {
        console.error('Connection error:', error);
        showStatus('Failed to connect wallet: ' + error.message, 'error');
        updateWalletUI(false);
    } finally {
        connectBtn.disabled = false;
        connectBtn.textContent = 'Connect WebAuth Wallet';
    }
}

/**
 * Restore previous session
 */
async function restoreSession() {
    try {
        const savedSession = localStorage.getItem('webauth_session');
        if (savedSession && webAuthWallet) {
            const sessionData = JSON.parse(savedSession);
            
            // Try to restore the session
            const identity = await webAuthWallet.restoreSession('xpr-payment-app');
            
            if (identity && identity.session) {
                session = identity.session;
                isConnected = true;
                updateWalletUI(true);
                await loadAccountBalance();
            }
        }
    } catch (error) {
        console.log('No previous session to restore');
        localStorage.removeItem('webauth_session');
    }
}

/**
 * Disconnect wallet
 */
async function disconnectWallet() {
    try {
        if (webAuthWallet && session) {
            await webAuthWallet.removeSession('xpr-payment-app', session.auth);
        }
        
        session = null;
        isConnected = false;
        localStorage.removeItem('webauth_session');
        
        updateWalletUI(false);
        showStatus('Wallet disconnected', 'success');
        
    } catch (error) {
        console.error('Disconnect error:', error);
    }
}

/**
 * Update wallet UI based on connection status
 */
function updateWalletUI(connected) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const walletStatus = document.getElementById('walletStatus');
    const accountInfo = document.getElementById('accountInfo');
    const connectBtn = document.getElementById('connectBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');
    const paymentForm = document.getElementById('paymentForm');

    if (connected && session) {
        statusDot.classList.add('connected');
        statusText.textContent = 'Connected';
        walletStatus.classList.add('connected');
        accountInfo.classList.remove('hidden');
        connectBtn.classList.add('hidden');
        disconnectBtn.classList.remove('hidden');
        paymentForm.classList.remove('hidden');
        
        document.getElementById('accountName').textContent = session.auth.actor.toString();
    } else {
        statusDot.classList.remove('connected');
        statusText.textContent = 'Not Connected';
        walletStatus.classList.remove('connected');
        accountInfo.classList.add('hidden');
        connectBtn.classList.remove('hidden');
        disconnectBtn.classList.add('hidden');
        paymentForm.classList.add('hidden');
        
        document.getElementById('accountName').textContent = '';
        document.getElementById('accountBalance').textContent = '';
    }
}

/**
 * Load account balance
 */
async function loadAccountBalance() {
    if (!session) return;

    try {
        const response = await fetch(CONFIG.rpcEndpoint + '/v1/chain/get_currency_balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: CONFIG.tokenContract,
                account: session.auth.actor.toString(),
                symbol: CONFIG.tokenSymbol
            })
        });

        const balances = await response.json();
        const balance = balances.length > 0 ? balances[0] : '0.0000 XPR';
        
        document.getElementById('accountBalance').textContent = `Balance: ${balance}`;
        
    } catch (error) {
        console.error('Error loading balance:', error);
        document.getElementById('accountBalance').textContent = 'Balance: Unable to load';
    }
}

/**
 * Set amount in the input field
 */
function setAmount(amount) {
    document.getElementById('amount').value = amount.toFixed(4);
}

/**
 * Send payment
 */
async function sendPayment(event) {
    event.preventDefault();
    
    if (!session || !isConnected) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }

    const recipient = document.getElementById('recipient').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);
    const memo = document.getElementById('memo').value.trim();
    
    // Validate inputs
    if (!recipient || !/^[a-z1-5.]{1,12}$/.test(recipient)) {
        showStatus('Invalid recipient account name', 'error');
        return;
    }
    
    if (!amount || amount <= 0) {
        showStatus('Please enter a valid amount', 'error');
        return;
    }

    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span class="loading"></span> Processing...';
    
    showStatus('Preparing transaction...', 'pending');

    try {
        // Format amount with proper precision
        const formattedAmount = amount.toFixed(CONFIG.tokenPrecision) + ' ' + CONFIG.tokenSymbol;
        
        // Create transaction action
        const action = {
            account: CONFIG.tokenContract,
            name: 'transfer',
            authorization: [session.auth],
            data: {
                from: session.auth.actor.toString(),
                to: recipient,
                quantity: formattedAmount,
                memo: memo || 'XPR Payment'
            }
        };

        // Execute transaction
        const result = await session.transact({ action });
        
        console.log('Transaction result:', result);
        
        // Show success message with transaction link
        const txId = result.processed.id;
        const explorerLink = CONFIG.explorerUrl + txId;
        
        showStatus(
            `Payment sent successfully! <br>
            <a href="${explorerLink}" target="_blank" class="tx-link">View Transaction</a>`,
            'success'
        );
        
        // Reload balance
        await loadAccountBalance();
        
        // Clear form
        document.getElementById('recipient').value = '';
        document.getElementById('amount').value = '';
        document.getElementById('memo').value = '';
        
    } catch (error) {
        console.error('Transaction error:', error);
        
        let errorMessage = 'Transaction failed: ';
        
        if (error.message) {
            errorMessage += error.message;
        } else if (error.error && error.error.details) {
            errorMessage += error.error.details[0].message;
        } else {
            errorMessage += 'Unknown error occurred';
        }
        
        showStatus(errorMessage, 'error');
        
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send Payment';
    }
}

/**
 * Show status message
 */
function showStatus(message, type) {
    const statusDiv = document.getElementById('transactionStatus');
    statusDiv.className = `transaction-status ${type}`;
    statusDiv.innerHTML = message;
    statusDiv.classList.remove('hidden');
    
    // Auto-hide success/error messages after 10 seconds
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            statusDiv.classList.add('hidden');
        }, 10000);
    }
}

/**
 * Initialize on page load - Set up event listeners
 */
window.addEventListener('DOMContentLoaded', async () => {
    console.log('XPR SimplePay DApp (v1.1) loading...');
    
    // Set up event listeners
    document.getElementById('connectBtn').addEventListener('click', connectWallet);
    document.getElementById('disconnectBtn').addEventListener('click', disconnectWallet);
    document.getElementById('paymentFormElement').addEventListener('submit', sendPayment);
    
    // Amount suggestion buttons
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = parseFloat(btn.getAttribute('data-amount'));
            setAmount(amount);
        });
    });
    
    // Initialize WebAuth
    await initializeWebAuth();
});
