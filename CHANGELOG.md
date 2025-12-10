# XPR SimplePay DApp (v1.1) - Changelog

## Latest Update - December 2025 (Proton WebSDK Edition)

### 🎯 Major Enhancement: Full Proton Web SDK v4 Integration

**Added QR Code Support & Auto-Detection**
- Switched from basic WebAuth Link to full Proton Web SDK v4
- Auto-detects if WebAuth wallet is installed
- Shows QR code for mobile wallet scanning when WebAuth not detected
- Beautiful wallet selector modal with custom branding
- Automatic session management and restoration

**What This Means:**
- Desktop users without WebAuth can now use QR codes
- Mobile users can connect via Proton mobile app
- Better UX with automatic wallet detection
- Professional wallet selector interface

**Files Updated for Proton Web SDK v4:**
- index.html (updated SDK CDN to unpkg v4.3.0)
- xpr-payment.js (ProtonWebSDK.Link implementation)
- xpr-payment-integration.js (ProtonWebSDK.Link implementation)

---

## Fixed Version - December 2025

### Critical Bug Fixes

#### 1. "connectWallet is not defined" Error
**Problem:** HTML onclick attributes tried to call functions before JavaScript loaded.

**Solution:**
- Removed all `onclick` attributes from HTML
- Implemented proper event listeners in JavaScript
- Added `DOMContentLoaded` event handler to ensure DOM is ready

#### 2. "Cannot read properties of null (reading 'login')" Error
**Problem:** Incorrect SDK initialization and API usage.

**Solutions:**
- Changed to use ProtonWebSDK.Link class from Proton Web SDK v4
- Fixed initialization:
  ```javascript
  // BEFORE (incorrect):
  connector = new ConnectWallet({...});
  const { session } = await connector.connect();
  
  // AFTER (correct - v4 API):
  link = new ProtonWebSDK.Link({
      endpoints: [rpcEndpoint],
      chainId: chainId,
      restoreSession: true
  });
  const identity = await link.login('app-name');
  session = identity.session;
  ```
- Fixed transaction format: `{ action }` (singular, not actions array)
- Added proper SDK loading with retry logic (waits up to 5 seconds)
- Correct CDN: `https://unpkg.com/@proton/web-sdk@4.3.0/dist/browser.js`

### Files Updated

1. **index.html**
   - Removed all `onclick` attributes
   - Uses `id` attributes for event listener attachment
   - Changed form button to use `data-amount` attributes

2. **xpr-payment.js**
   - Complete rewrite with correct WebAuth SDK implementation
   - Proper variable names (`link` instead of `webAuthWallet`)
   - Fixed transaction structure
   - Better error handling and logging
   - Event listener-based interaction

3. **xpr-payment-integration.js**
   - Applied same fixes as xpr-payment.js
   - Updated to use `link` variable
   - Fixed transaction format to use `actions` array
   - Consistent session management

4. **examples.html**
   - No changes needed (uses integration script)

5. **README.md**
   - No changes needed (documentation still accurate)

### Technical Details

#### ProtonWebSDK v4 Initialization
```javascript
// Wait for SDK to load
let attempts = 0;
while (typeof ProtonWebSDK === 'undefined' && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
}

// Initialize ProtonWebSDK.Link (v4)
link = new ProtonWebSDK.Link({
    endpoints: ['https://xpr.greymass.com'],
    chainId: '384da888112027f0321850a169f737c33e53b388aad48b5adace4bab97f437e0',
    restoreSession: true
});
```

#### Transaction Format
```javascript
// Correct format (actions is an array)
const actions = [{
    account: 'eosio.token',
    name: 'transfer',
    authorization: [session.auth],
    data: {
        from: session.auth.actor.toString(),
        to: recipient,
        quantity: formattedAmount,
        memo: memo
    }
}];

const result = await session.transact({ actions });
```

#### Session Management (v4 API)
```javascript
// Connect
const identity = await link.login('xpr-simplepay');
session = identity.session;

// Restore
const identity = await link.restoreSession('xpr-simplepay');
session = identity.session;

// Disconnect
await link.removeSession('xpr-simplepay', session.auth);
```

### Testing Checklist

- [x] WebAuth SDK loads successfully
- [x] Connect button works without errors
- [x] Wallet connection opens WebAuth interface
- [x] Account name displays after connection
- [x] Balance loads correctly
- [x] Payment form appears after connection
- [x] Amount suggestion buttons work
- [x] Transaction sends successfully
- [x] Transaction link appears
- [x] Session persists across page reloads
- [x] Disconnect works properly
- [x] Error messages display correctly

### Browser Console Logs

When working correctly, you should see:
```
=== XPR SimplePay DApp (v1.1) ===
Initializing...
ProtonWebSDK loaded successfully
Proton Link initialized successfully
✅ Ready to connect wallet!
```

After clicking Connect:
```
Attempting to connect wallet...
Connected successfully!
Account: youraccount
Permission: active
Fetching balance for: youraccount
Balance: 1000.0000 XPR
```

### Known Limitations

1. Proton WebSDK must be loaded from CDN (requires internet connection)
2. User must have Proton WebAuth wallet installed/configured (or use QR code)
3. Only works on XPR Mainnet (can be changed in CONFIG)

### Support

If you encounter issues:
1. Check browser console for detailed error messages
2. Ensure you're connected to the internet
3. Verify you have a Proton WebAuth wallet
4. Try refreshing the page
5. Clear browser cache and localStorage

---

**Version:** 1.1  
**Date:** December 2025  
**Status:** Production Ready ✅
