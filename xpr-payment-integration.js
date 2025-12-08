/**
 * XPR SimplePay DApp (v1.1)
 * Integration Script for Website Embedding
 * Drop-in solution for any website to accept XPR payments
 * 
 * Usage:
 * <script src="xpr-payment-integration.js"></script>
 * <script>
 *   XPRPayment.init({
 *     recipient: 'your.account',
 *     amount: 10.00,
 *     memo: 'Payment for services',
 *     onSuccess: (txId) => console.log('Payment successful:', txId),
 *     onError: (error) => console.error('Payment failed:', error)
 *   });
 * </script>
 */

(function(window) {
    'use strict';

    const XPRPayment = {
        config: {
            chainId: '384da888112027f0321850a169f737c33e53b388aad48b5adace4bab97f437e0',
            rpcEndpoint: 'https://xpr.greymass.com',
            explorerUrl: 'https://explorer.xprnetwork.org/transaction/',
            tokenContract: 'eosio.token',
            tokenSymbol: 'XPR',
            tokenPrecision: 4
        },

        wallet: null,
        session: null,
        callbacks: {},

        /**
         * Initialize the payment system
         */
        async init(options = {}) {
            this.callbacks = {
                onSuccess: options.onSuccess || function() {},
                onError: options.onError || function() {},
                onConnect: options.onConnect || function() {},
                onDisconnect: options.onDisconnect || function() {}
            };

            // Load WebAuth if not already loaded
            if (typeof WebAuth === 'undefined') {
                await this.loadWebAuthSDK();
            }

            // Initialize WebAuth
            const { Link } = WebAuth;
            this.wallet = new Link({
                chains: [{
                    chainId: this.config.chainId,
                    nodeUrl: this.config.rpcEndpoint
                }],
                transport: WebAuth.LinkTransport.browser(),
                scheme: 'webauth'
            });

            // Try to restore session
            await this.restoreSession();

            return this;
        },

        /**
         * Load WebAuth SDK dynamically
         */
        loadWebAuthSDK() {
            return new Promise((resolve, reject) => {
                if (typeof WebAuth !== 'undefined') {
                    resolve();
                    return;
                }

                const script = document.createElement('script');
                script.src = 'https://unpkg.com/@proton/web-sdk@latest/dist/index.js';
                script.onload = resolve;
                script.onerror = () => reject(new Error('Failed to load WebAuth SDK'));
                document.head.appendChild(script);
            });
        },

        /**
         * Connect wallet
         */
        async connect() {
            try {
                const identity = await this.wallet.login('xpr-payment-integration');
                this.session = identity.session;

                if (this.session) {
                    localStorage.setItem('xpr_session', JSON.stringify({
                        actor: this.session.auth.actor.toString(),
                        permission: this.session.auth.permission.toString()
                    }));

                    this.callbacks.onConnect({
                        account: this.session.auth.actor.toString(),
                        permission: this.session.auth.permission.toString()
                    });

                    return {
                        success: true,
                        account: this.session.auth.actor.toString()
                    };
                }
            } catch (error) {
                this.callbacks.onError(error);
                return {
                    success: false,
                    error: error.message
                };
            }
        },

        /**
         * Disconnect wallet
         */
        async disconnect() {
            try {
                if (this.wallet && this.session) {
                    await this.wallet.removeSession('xpr-payment-integration', this.session.auth);
                }

                this.session = null;
                localStorage.removeItem('xpr_session');
                this.callbacks.onDisconnect();

                return { success: true };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        },

        /**
         * Restore previous session
         */
        async restoreSession() {
            try {
                const savedSession = localStorage.getItem('xpr_session');
                if (savedSession && this.wallet) {
                    const identity = await this.wallet.restoreSession('xpr-payment-integration');

                    if (identity && identity.session) {
                        this.session = identity.session;
                        this.callbacks.onConnect({
                            account: this.session.auth.actor.toString(),
                            permission: this.session.auth.permission.toString()
                        });
                        return true;
                    }
                }
            } catch (error) {
                localStorage.removeItem('xpr_session');
            }
            return false;
        },

        /**
         * Check if wallet is connected
         */
        isConnected() {
            return this.session !== null;
        },

        /**
         * Get connected account
         */
        getAccount() {
            return this.session ? this.session.auth.actor.toString() : null;
        },

        /**
         * Get account balance
         */
        async getBalance(account) {
            try {
                const accountName = account || this.getAccount();
                if (!accountName) {
                    throw new Error('No account specified');
                }

                const response = await fetch(this.config.rpcEndpoint + '/v1/chain/get_currency_balance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code: this.config.tokenContract,
                        account: accountName,
                        symbol: this.config.tokenSymbol
                    })
                });

                const balances = await response.json();
                return balances.length > 0 ? balances[0] : '0.0000 XPR';
            } catch (error) {
                console.error('Error fetching balance:', error);
                return null;
            }
        },

        /**
         * Send payment
         */
        async sendPayment(recipient, amount, memo = '') {
            try {
                if (!this.session) {
                    throw new Error('Wallet not connected. Please connect first.');
                }

                // Validate inputs
                if (!recipient || !/^[a-z1-5.]{1,12}$/.test(recipient)) {
                    throw new Error('Invalid recipient account name');
                }

                if (!amount || amount <= 0) {
                    throw new Error('Invalid amount');
                }

                // Format amount
                const formattedAmount = parseFloat(amount).toFixed(this.config.tokenPrecision) + ' ' + this.config.tokenSymbol;

                // Create transaction action
                const action = {
                    account: this.config.tokenContract,
                    name: 'transfer',
                    authorization: [this.session.auth],
                    data: {
                        from: this.session.auth.actor.toString(),
                        to: recipient,
                        quantity: formattedAmount,
                        memo: memo || 'XPR Payment'
                    }
                };

                // Execute transaction
                const result = await this.session.transact({ action });
                const txId = result.processed.id;

                this.callbacks.onSuccess({
                    transactionId: txId,
                    explorerUrl: this.config.explorerUrl + txId,
                    from: this.session.auth.actor.toString(),
                    to: recipient,
                    amount: formattedAmount,
                    memo: memo
                });

                return {
                    success: true,
                    transactionId: txId,
                    explorerUrl: this.config.explorerUrl + txId
                };

            } catch (error) {
                this.callbacks.onError(error);
                return {
                    success: false,
                    error: error.message || 'Transaction failed'
                };
            }
        },

        /**
         * Create payment button
         */
        createPaymentButton(options) {
            const button = document.createElement('button');
            button.textContent = options.text || 'Pay with XPR';
            button.className = options.className || 'xpr-payment-button';

            // Apply default styles if no custom class
            if (!options.className) {
                Object.assign(button.style, {
                    padding: '12px 24px',
                    backgroundColor: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                });

                button.onmouseover = () => {
                    button.style.backgroundColor = '#5568d3';
                    button.style.transform = 'translateY(-2px)';
                };
                button.onmouseout = () => {
                    button.style.backgroundColor = '#667eea';
                    button.style.transform = 'translateY(0)';
                };
            }

            button.onclick = async () => {
                button.disabled = true;
                button.textContent = 'Processing...';

                try {
                    // Connect if not already connected
                    if (!this.isConnected()) {
                        const connectResult = await this.connect();
                        if (!connectResult.success) {
                            throw new Error('Failed to connect wallet');
                        }
                    }

                    // Send payment
                    await this.sendPayment(
                        options.recipient,
                        options.amount,
                        options.memo
                    );

                } catch (error) {
                    console.error('Payment error:', error);
                } finally {
                    button.disabled = false;
                    button.textContent = options.text || 'Pay with XPR';
                }
            };

            return button;
        },

        /**
         * Show payment modal
         */
        showPaymentModal(options) {
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            `;

            // Create modal content
            const modal = document.createElement('div');
            modal.style.cssText = `
                background: white;
                padding: 30px;
                border-radius: 12px;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            `;

            modal.innerHTML = `
                <h2 style="margin: 0 0 20px 0; color: #333;">XPR Payment</h2>
                <div style="margin-bottom: 15px;">
                    <strong>Recipient:</strong> ${options.recipient}
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Amount:</strong> ${options.amount} XPR
                </div>
                ${options.memo ? `<div style="margin-bottom: 15px;"><strong>Memo:</strong> ${options.memo}</div>` : ''}
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button id="xpr-confirm-btn" style="flex: 1; padding: 12px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Confirm Payment
                    </button>
                    <button id="xpr-cancel-btn" style="flex: 1; padding: 12px; background: #e5e7eb; color: #333; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Cancel
                    </button>
                </div>
                <div id="xpr-status" style="margin-top: 15px; padding: 10px; border-radius: 8px; display: none;"></div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            // Handle confirm
            document.getElementById('xpr-confirm-btn').onclick = async () => {
                const confirmBtn = document.getElementById('xpr-confirm-btn');
                const statusDiv = document.getElementById('xpr-status');

                confirmBtn.disabled = true;
                confirmBtn.textContent = 'Processing...';

                try {
                    if (!this.isConnected()) {
                        await this.connect();
                    }

                    const result = await this.sendPayment(
                        options.recipient,
                        options.amount,
                        options.memo
                    );

                    if (result.success) {
                        statusDiv.style.display = 'block';
                        statusDiv.style.background = '#ecfdf5';
                        statusDiv.style.color = '#065f46';
                        statusDiv.innerHTML = `Payment successful! <a href="${result.explorerUrl}" target="_blank" style="color: #059669;">View Transaction</a>`;

                        setTimeout(() => {
                            document.body.removeChild(overlay);
                        }, 3000);
                    }
                } catch (error) {
                    statusDiv.style.display = 'block';
                    statusDiv.style.background = '#fef2f2';
                    statusDiv.style.color = '#991b1b';
                    statusDiv.textContent = 'Payment failed: ' + error.message;

                    confirmBtn.disabled = false;
                    confirmBtn.textContent = 'Confirm Payment';
                }
            };

            // Handle cancel
            document.getElementById('xpr-cancel-btn').onclick = () => {
                document.body.removeChild(overlay);
            };

            // Close on overlay click
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    document.body.removeChild(overlay);
                }
            };
        }
    };

    // Export to window
    window.XPRPayment = XPRPayment;

})(window);
