/**
 * XPR SimplePay DApp (v1.2 - Standalone)
 * Direct WebAuth Wallet Integration - NO SDK REQUIRED
 * Uses ESR (EOSIO Signing Request) Protocol
 */

// XPR Network Configuration
const CONFIG = {
    chainId: '384da888112027f0321850a169f737c33e53b388aad48b5adace4bab97f437e0',
    rpcEndpoint: 'https://xpr.greymass.com',
    explorerUrl: 'https://explorer.xprnetwork.org/transaction/',
    tokenContract: 'eosio.token',
    tokenSymbol: 'XPR',
    tokenPrecision: 4,
    webAuthUrl: 'proton://request'
};

// Proton SDK Link instance
let protonLink = null;
let protonSession = null;

/**
 * Initialize on page load
 */
async function initialize() {
    console.log('=== XPR SimplePay DApp (v1.3.0 - Proper WebAuth) ===');
    console.log('Initializing Proton Web SDK...');
    
    try {
        // Wait for ProtonWebSDK to load
        let attempts = 0;
        while (typeof ProtonWebSDK === 'undefined' && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (typeof ProtonWebSDK === 'undefined') {
            throw new Error('ProtonWebSDK not loaded. Please add SDK script to HTML.');
        }
        
        console.log('ProtonWebSDK loaded successfully');
        
        // Initialize Proton Link
        protonLink = new ProtonWebSDK.Link({
            endpoints: [CONFIG.rpcEndpoint],
            chainId: CONFIG.chainId,
            restoreSession: true
        });
        
        console.log('Proton Link initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize Proton SDK:', error);
        console.log('⚠️ Add this to your HTML: <script src="https://cdn.jsdelivr.net/npm/@proton/web-sdk@latest/dist/index.js"></script>');
    }
    
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
    
    // Restore previous session
    await restoreSession();
    
    console.log('✅ Ready to connect via WebAuth!');
}

/**
 * Connect wallet using Proton Web SDK (PROPER WebAuth)
 */
async function connectWallet() {
    const connectBtn = document.getElementById('connectBtn');
    connectBtn.disabled = true;
    connectBtn.innerHTML = '<span class="loading"></span> Opening WebAuth...';

    try {
        if (!protonLink) {
            throw new Error('Proton SDK not initialized. Please refresh the page.');
        }
        
        console.log('Attempting WebAuth login...');
        showStatus('Opening WebAuth wallet...', 'pending');
        
        // Connect using Proton ConnectWallet - opens wallet selector then WebAuth
        const { session } = await protonLink.connect();
        
        if (!session) {
            throw new Error('Failed to get session from WebAuth');
        }
        
        protonSession = session;
        const account = session.auth.actor.toString();
        const permission = session.auth.permission.toString();
        
        console.log('✅ WebAuth authentication successful!');
        console.log('Account:', account);
        console.log('Permission:', permission);
        
        // Update UI
        updateWalletUI(true, account, permission);
        await loadAccountBalance(account);
        showStatus('Connected via WebAuth successfully!', 'success');

    } catch (error) {
        console.error('WebAuth connection failed:', error);
        
        // Check for user cancellation
        if (error.message && error.message.includes('User cancelled')) {
            console.log('User cancelled connection');
            showStatus('Connection cancelled', 'error');
        } else {
            showStatus('Failed to connect: ' + error.message, 'error');
        }
        
        updateWalletUI(false);
    } finally {
        connectBtn.disabled = false;
        connectBtn.textContent = 'Connect Wallet';
    }
}

/**
 * Restore previous session
 */
async function restoreSession() {
    if (!protonLink) {
        console.log('Proton Link not initialized yet');
        return;
    }
    
    try {
        console.log('Attempting to restore session...');
        
        // Try to restore session
        const { session } = await protonLink.restoreSession();
        
        if (session) {
            protonSession = session;
            const account = session.auth.actor.toString();
            const permission = session.auth.permission.toString();
            
            console.log('✅ Session restored for:', account);
            updateWalletUI(true, account, permission);
            await loadAccountBalance(account);
        } else {
            console.log('No previous session found');
        }
    } catch (error) {
        console.log('No session to restore:', error.message);
    }
}

/**
 * Disconnect wallet
 */
async function disconnectWallet() {
    try {
        if (protonLink && protonSession) {
            await protonLink.disconnect();
            console.log('Session removed');
        }
        
        protonSession = null;
        updateWalletUI(false);
        showStatus('Wallet disconnected', 'success');
        
    } catch (error) {
        console.error('Error disconnecting:', error);
        // Still clear UI even if error
        protonSession = null;
        updateWalletUI(false);
    }
}

/**
 * Update wallet UI
 */
function updateWalletUI(connected, account = '', permission = 'active') {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const walletStatus = document.getElementById('walletStatus');
    const accountInfo = document.getElementById('accountInfo');
    const connectBtn = document.getElementById('connectBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');
    const paymentForm = document.getElementById('paymentForm');

    if (connected && account) {
        statusDot.classList.add('connected');
        statusText.textContent = 'Connected';
        walletStatus.classList.add('connected');
        accountInfo.classList.remove('hidden');
        connectBtn.classList.add('hidden');
        disconnectBtn.classList.remove('hidden');
        paymentForm.classList.remove('hidden');
        
        document.getElementById('accountName').textContent = `${account}@${permission}`;
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
async function loadAccountBalance(account) {
    if (!account) return;

    try {
        console.log('Fetching balance for:', account);
        
        const response = await fetch(CONFIG.rpcEndpoint + '/v1/chain/get_currency_balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: CONFIG.tokenContract,
                account: account,
                symbol: CONFIG.tokenSymbol
            })
        });

        const balances = await response.json();
        const balance = balances.length > 0 ? balances[0] : '0.0000 XPR';
        
        console.log('Balance:', balance);
        document.getElementById('accountBalance').textContent = `Balance: ${balance}`;
        
    } catch (error) {
        console.error('Error loading balance:', error);
        document.getElementById('accountBalance').textContent = 'Balance: Unable to load';
    }
}

/**
 * Set amount in input
 */
function setAmount(amount) {
    document.getElementById('amount').value = amount.toFixed(4);
}

/**
 * Send payment - Uses Proton SDK session to sign transaction
 */
async function sendPayment(event) {
    event.preventDefault();
    
    if (!protonSession) {
        showStatus('Please connect your wallet first', 'error');
        return;
    }

    const account = protonSession.auth.actor.toString();
    const recipient = document.getElementById('recipient').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);
    const memo = document.getElementById('memo').value.trim();
    
    // Validate inputs
    if (!recipient || !/^[a-z12345.]{1,12}$/.test(recipient)) {
        showStatus('Invalid recipient account name', 'error');
        return;
    }
    
    if (!amount || amount <= 0) {
        showStatus('Please enter a valid amount', 'error');
        return;
    }

    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span class="loading"></span> Sending...';
    
    showStatus('Opening WebAuth to sign transaction...', 'pending');

    try {
        const formattedAmount = amount.toFixed(CONFIG.tokenPrecision) + ' ' + CONFIG.tokenSymbol;
        
        console.log('Creating transaction:', {
            from: account,
            to: recipient,
            amount: formattedAmount,
            memo: memo || 'XPR Payment'
        });
        
        // Create transaction action
        const action = {
            account: CONFIG.tokenContract,
            name: 'transfer',
            authorization: [{
                actor: account,
                permission: protonSession.auth.permission.toString()
            }],
            data: {
                from: account,
                to: recipient,
                quantity: formattedAmount,
                memo: memo || 'XPR Payment'
            }
        };

        console.log('Signing transaction with WebAuth...');
        
        // Execute transaction using Proton SDK session - THIS OPENS WEBAUTH FOR SIGNING
        const result = await protonSession.transact(
            { actions: [action] },
            { broadcast: true }
        );
        
        console.log('Transaction successful!', result);
        
        const txId = result.processed.id;
        const explorerLink = CONFIG.explorerUrl + txId;
        
        showStatus(
            `✅ Payment sent successfully!<br>` +
            `<a href="${explorerLink}" target="_blank" style="color: #667eea; text-decoration: underline;">View transaction</a>`,
            'success'
        );
        
        // Reset form
        document.getElementById('recipient').value = '';
        document.getElementById('amount').value = '';
        document.getElementById('memo').value = '';
        
        // Reload balance
        await loadAccountBalance(account);
        
    } catch (error) {
        console.error('Transaction error:', error);
        showStatus('Transaction failed: ' + error.message, 'error');
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
    
    if (type === 'success' || type === 'error') {
        setTimeout(() => {
            statusDiv.classList.add('hidden');
        }, 10000);
    }
}

/**
 * Set amount in form
 */
function setAmount(amount) {
    const amountInput = document.getElementById('amount');
    if (amountInput) {
        amountInput.value = amount.toFixed(4);
    }
}

/**
 * Initialize on page load
 */
async function initialize() {
    console.log('=== XPR SimplePay DApp (v1.3.0 - Proper WebAuth) ===');
    console.log('Waiting for Proton Web SDK to load...');
    
    try {
        // Wait for ProtonWebSDK to load (with longer timeout)
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds
        
        while (typeof ProtonWebSDK === 'undefined' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
            
            if (attempts % 10 === 0) {
                console.log(`Still waiting for SDK... (${attempts/10} seconds)`);
            }
        }
        
        if (typeof ProtonWebSDK === 'undefined') {
            throw new Error('ProtonWebSDK failed to load after 10 seconds');
        }
        
        console.log('✅ ProtonWebSDK loaded successfully');
        console.log('SDK available:', typeof ProtonWebSDK);
        console.log('SDK keys:', Object.keys(ProtonWebSDK));
        
        // Initialize Proton Link with correct parameters
        console.log('Initializing Proton Link...');
        
        // Use ConnectWallet for browser-based connections
        const { ConnectWallet } = ProtonWebSDK;
        
        if (!ConnectWallet) {
            throw new Error('ConnectWallet not found in SDK');
        }
        
        protonLink = new ConnectWallet({
            linkOptions: {
                endpoints: [CONFIG.rpcEndpoint],
                chainId: CONFIG.chainId,
                restoreSession: true
            },
            transportOptions: {
                requestAccount: 'xpr-simplepay'
            },
            selectorOptions: {
                appName: 'XPR SimplePay',
                appLogo: '',
                customStyleOptions: {
                    modalBackgroundColor: '#F4F7FA',
                    logoBackgroundColor: 'white',
                    isLogoRound: true,
                    optionBackgroundColor: 'white',
                    optionFontColor: 'black',
                    primaryFontColor: 'black',
                    secondaryFontColor: '#6B727F',
                    linkColor: '#752EEB'
                }
            }
        });
        
        console.log('✅ Proton ConnectWallet initialized successfully');
        
    } catch (error) {
        console.error('❌ Failed to initialize Proton SDK:', error);
        console.error('Make sure the SDK script is loaded in HTML');
        
        // Show error to user
        showStatus('Failed to load Proton SDK. Please refresh the page or check console for errors.', 'error');
        return; // Don't continue if SDK failed
    }
    
    // Set up event listeners
    console.log('Setting up event listeners...');
    
    const connectBtn = document.getElementById('connectBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');
    const paymentForm = document.getElementById('paymentFormElement');
    
    if (connectBtn) connectBtn.addEventListener('click', connectWallet);
    if (disconnectBtn) disconnectBtn.addEventListener('click', disconnectWallet);
    if (paymentForm) paymentForm.addEventListener('submit', sendPayment);
    
    // Amount suggestion buttons
    document.querySelectorAll('.amount-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = parseFloat(btn.getAttribute('data-amount'));
            setAmount(amount);
        });
    });
    
    // Restore previous session
    console.log('Attempting to restore session...');
    await restoreSession();
    
    console.log('✅ Initialization complete! Ready to connect via WebAuth!');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    // DOM already loaded, initialize immediately
    initialize();
}
