# XPR SimplePay DApp (v1.1)

A complete payment solution for the XPR Network (Proton blockchain) with WebAuth wallet integration. This allows users to send XPR tokens securely through their WebAuth wallet.

## Features

✅ **WebAuth Wallet Integration** - Connect to Proton's WebAuth wallet  
✅ **Send Any Amount** - Send custom amounts of XPR tokens  
✅ **Session Persistence** - Automatically restore wallet connections  
✅ **Real-time Balance** - Display user's XPR balance  
✅ **Transaction Links** - View transactions on the XPR block explorer  
✅ **Easy Integration** - Drop-in JavaScript solution for any website  
✅ **Responsive Design** - Works on desktop and mobile devices  
✅ **Error Handling** - Comprehensive error messages and validation  

## Quick Start

### Option 1: Standalone Payment Page

Simply open `index.html` in your browser or deploy it to your web server.

```bash
# Using a simple HTTP server
python3 -m http.server 8000
# Then open http://localhost:8000
```

### Option 2: Integration Script

Add the integration script to any website:

```html
<!-- Add this to your HTML -->
<script src="xpr-payment-integration.js"></script>

<script>
  // Initialize the payment system
  XPRPayment.init({
    onSuccess: (result) => {
      console.log('Payment successful!', result.transactionId);
      alert('Payment received! Transaction: ' + result.transactionId);
    },
    onError: (error) => {
      console.error('Payment failed:', error);
      alert('Payment failed: ' + error.message);
    },
    onConnect: (account) => {
      console.log('Wallet connected:', account);
    },
    onDisconnect: () => {
      console.log('Wallet disconnected');
    }
  });
</script>
```

## Integration Examples

### Example 1: Simple Payment Button

```html
<!DOCTYPE html>
<html>
<head>
  <title>Buy Product - XPR Payment</title>
</head>
<body>
  <h1>Premium Widget - 10 XPR</h1>
  <div id="payment-button"></div>

  <script src="xpr-payment-integration.js"></script>
  <script>
    XPRPayment.init({
      onSuccess: (result) => {
        alert('Payment successful! Your product will be delivered shortly.');
        console.log('Transaction ID:', result.transactionId);
        // Here you would verify the payment on your backend
      }
    }).then(payment => {
      // Create and add payment button
      const button = payment.createPaymentButton({
        text: 'Pay 10 XPR',
        recipient: 'yourstore',  // Your XPR account
        amount: 10,
        memo: 'Premium Widget Purchase'
      });
      
      document.getElementById('payment-button').appendChild(button);
    });
  </script>
</body>
</html>
```

### Example 2: Payment Modal

```html
<button onclick="showPayment()">Checkout with XPR</button>

<script src="xpr-payment-integration.js"></script>
<script>
  let xprPayment;

  XPRPayment.init().then(payment => {
    xprPayment = payment;
  });

  function showPayment() {
    xprPayment.showPaymentModal({
      recipient: 'merchantacc',
      amount: 25.5,
      memo: 'Order #12345'
    });
  }
</script>
```

### Example 3: Manual Payment Flow

```javascript
// Initialize
await XPRPayment.init();

// Connect wallet
const connectResult = await XPRPayment.connect();
if (connectResult.success) {
  console.log('Connected:', connectResult.account);
  
  // Get balance
  const balance = await XPRPayment.getBalance();
  console.log('Balance:', balance);
  
  // Send payment
  const paymentResult = await XPRPayment.sendPayment(
    'recipient123',  // Recipient account
    50.0,            // Amount in XPR
    'Payment for services' // Memo
  );
  
  if (paymentResult.success) {
    console.log('Transaction ID:', paymentResult.transactionId);
    console.log('View on explorer:', paymentResult.explorerUrl);
  }
  
  // Disconnect when done
  await XPRPayment.disconnect();
}
```

### Example 4: E-commerce Integration

```html
<!DOCTYPE html>
<html>
<head>
  <title>Checkout</title>
</head>
<body>
  <div class="cart">
    <h2>Shopping Cart</h2>
    <div id="cart-items"></div>
    <div id="total"></div>
    <button onclick="checkout()">Pay with XPR</button>
  </div>

  <script src="xpr-payment-integration.js"></script>
  <script>
    const cart = [
      { name: 'Product A', price: 5.0 },
      { name: 'Product B', price: 10.0 },
      { name: 'Product C', price: 15.0 }
    ];

    const total = cart.reduce((sum, item) => sum + item.price, 0);

    // Display cart
    document.getElementById('cart-items').innerHTML = cart
      .map(item => `<div>${item.name}: ${item.price} XPR</div>`)
      .join('');
    document.getElementById('total').innerHTML = `<strong>Total: ${total} XPR</strong>`;

    // Initialize payment
    let xprPayment;
    XPRPayment.init({
      onSuccess: async (result) => {
        // Verify payment on your backend
        const response = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transactionId: result.transactionId,
            amount: total,
            from: result.from,
            items: cart
          })
        });
        
        if (response.ok) {
          window.location.href = '/success?tx=' + result.transactionId;
        }
      }
    }).then(payment => {
      xprPayment = payment;
    });

    async function checkout() {
      if (!xprPayment.isConnected()) {
        await xprPayment.connect();
      }
      
      const result = await xprPayment.sendPayment(
        'yourstore',
        total,
        'Order #' + Date.now()
      );
      
      if (!result.success) {
        alert('Payment failed: ' + result.error);
      }
    }
  </script>
</body>
</html>
```

## API Reference

### XPRPayment.init(options)

Initialize the payment system.

**Parameters:**
- `options.onSuccess(result)` - Called when payment succeeds
- `options.onError(error)` - Called when payment fails
- `options.onConnect(account)` - Called when wallet connects
- `options.onDisconnect()` - Called when wallet disconnects

**Returns:** Promise that resolves to the XPRPayment instance

### XPRPayment.connect()

Connect to WebAuth wallet.

**Returns:** `{ success: boolean, account?: string, error?: string }`

### XPRPayment.disconnect()

Disconnect the wallet.

**Returns:** `{ success: boolean, error?: string }`

### XPRPayment.isConnected()

Check if wallet is connected.

**Returns:** `boolean`

### XPRPayment.getAccount()

Get the connected account name.

**Returns:** `string | null`

### XPRPayment.getBalance(account?)

Get XPR balance for an account.

**Parameters:**
- `account` (optional) - Account name, defaults to connected account

**Returns:** `Promise<string>` - Balance string like "100.0000 XPR"

### XPRPayment.sendPayment(recipient, amount, memo)

Send XPR tokens.

**Parameters:**
- `recipient` - Recipient account name (12 chars, lowercase, 1-5, dots)
- `amount` - Amount to send (number)
- `memo` - Transaction memo (optional, max 256 chars)

**Returns:** `Promise<{ success: boolean, transactionId?: string, explorerUrl?: string, error?: string }>`

### XPRPayment.createPaymentButton(options)

Create a payment button element.

**Parameters:**
- `options.recipient` - Recipient account name
- `options.amount` - Amount in XPR
- `options.memo` - Transaction memo (optional)
- `options.text` - Button text (default: "Pay with XPR")
- `options.className` - Custom CSS class (optional)

**Returns:** `HTMLButtonElement`

### XPRPayment.showPaymentModal(options)

Show a payment confirmation modal.

**Parameters:**
- `options.recipient` - Recipient account name
- `options.amount` - Amount in XPR
- `options.memo` - Transaction memo (optional)

## Configuration

The payment system uses these default settings for XPR Mainnet:

```javascript
{
  chainId: '384da888112027f0321850a169f737c33e53b388aad48b5adace4bab97f437e0',
  rpcEndpoint: 'https://xpr.greymass.com',
  explorerUrl: 'https://explorer.xprnetwork.org/transaction/',
  tokenContract: 'eosio.token',
  tokenSymbol: 'XPR',
  tokenPrecision: 4
}
```

## Security Best Practices

1. **Verify Payments Server-Side**: Always verify transactions on your backend before delivering goods/services
2. **Use HTTPS**: Deploy your payment page over HTTPS
3. **Validate Amounts**: Check that received amounts match expected amounts
4. **Check Transaction Status**: Verify transaction was included in a block
5. **Rate Limiting**: Implement rate limiting on payment endpoints

## Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### "Failed to load WebAuth SDK"
Make sure you have internet connection. The SDK loads from CDN.

### "Wallet not connected"
User needs to click "Connect WebAuth Wallet" before sending payments.

### "Invalid recipient account name"
XPR account names must be:
- 1-12 characters
- Lowercase letters (a-z)
- Numbers 1-5
- Dots (.)

### "Transaction failed"
Common causes:
- Insufficient balance
- Invalid account name
- Network connectivity issues
- User rejected transaction

## Files Included

- `index.html` - Standalone payment page
- `xpr-payment.js` - Main payment logic
- `xpr-payment-integration.js` - Easy integration script
- `README.md` - This documentation

## Testing

For testing, you can use the XPR Testnet:

```javascript
// Modify config in the JavaScript files:
CONFIG.chainId = 'testnet-chain-id';
CONFIG.rpcEndpoint = 'https://testnet.xprnetwork.org';
```

Get testnet tokens from the XPR faucet.

## Support

- XPR Network Documentation: https://docs.xprnetwork.org
- WebAuth Documentation: https://docs.webauth.com
- Block Explorer: https://explorer.xprnetwork.org

## License

MIT License - Free to use for personal and commercial projects.

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

---

**XPR SimplePay DApp (v1.1)** - Built for the XPR Network 🚀
