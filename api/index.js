import express from 'express';
import cors from 'cors';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());

// Raw body needed for webhook signature verification
app.use('/api/razorpay/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
});

// Idempotency store — prevents duplicate ticket generation for same Razorpay order
const processedOrders = new Set();

// ─── CREATE ORDER ─────────────────────────────────────────────────────────────
app.post('/api/razorpay/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, bookingRef } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const options = {
      amount: Math.round(amount * 100), // paise
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: {
        bookingRef: bookingRef || '',
        source: 'deuce_adventure_park'
      }
    };

    const order = await razorpay.orders.create(options);
    if (!order) return res.status(500).json({ message: 'Could not create order' });

    res.json(order);
  } catch (error) {
    console.error('[create-order]', error);
    res.status(500).json({ message: 'Order creation failed', error: String(error) });
  }
});

// ─── VERIFY PAYMENT (frontend callback) ──────────────────────────────────────
app.post('/api/razorpay/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing payment parameters' });
    }

    // Idempotency: return success immediately for already-processed orders
    if (processedOrders.has(razorpay_order_id)) {
      return res.status(200).json({ message: 'Payment already verified', alreadyProcessed: true });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', secret)
      .update(sign)
      .digest('hex');

    if (razorpay_signature === expectedSign) {
      processedOrders.add(razorpay_order_id);
      return res.status(200).json({
        message: 'Payment verified successfully',
        razorpay_order_id,
        razorpay_payment_id
      });
    } else {
      // Allow mock verification when secret is not configured (dev/demo mode)
      if (!secret || secret === 'placeholder_secret') {
        console.warn('[verify] Skipping strict verification – RAZORPAY_KEY_SECRET not configured');
        processedOrders.add(razorpay_order_id);
        return res.status(200).json({
          message: 'Payment verified (demo mode)',
          razorpay_order_id,
          razorpay_payment_id
        });
      }
      return res.status(400).json({ message: 'Invalid payment signature' });
    }
  } catch (error) {
    console.error('[verify]', error);
    res.status(500).json({ message: 'Verification failed' });
  }
});

// ─── WEBHOOK (Razorpay server-to-server events) ───────────────────────────────
app.post('/api/razorpay/webhook', (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    const signature = req.headers['x-razorpay-signature'];

    if (webhookSecret && signature) {
      const expectedSig = crypto
        .createHmac('sha256', webhookSecret)
        .update(req.body) // raw buffer
        .digest('hex');

      if (signature !== expectedSig) {
        console.warn('[webhook] Signature mismatch – possible spoofed request');
        return res.status(400).json({ status: 'invalid_signature' });
      }
    }

    const event = JSON.parse(req.body.toString());
    console.log('[webhook] Event received:', event.event);

    switch (event.event) {
      case 'payment.captured': {
        const orderId = event.payload?.payment?.entity?.order_id;
        const paymentId = event.payload?.payment?.entity?.id;
        if (orderId) processedOrders.add(orderId);
        console.log(`[webhook] Payment captured – order: ${orderId}, payment: ${paymentId}`);
        break;
      }
      case 'payment.failed': {
        const orderId = event.payload?.payment?.entity?.order_id;
        console.log(`[webhook] Payment failed – order: ${orderId}`);
        break;
      }
      default:
        console.log(`[webhook] Unhandled event: ${event.event}`);
    }

    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('[webhook]', error);
    res.status(500).json({ message: 'Webhook processing error' });
  }
});

// ─── COUNTER UPI ID (read from env, no secret exposed) ───────────────────────
app.get('/api/config/upi-id', (req, res) => {
  res.json({
    upiId: process.env.COUNTER_UPI_ID || '',
    businessName: process.env.BUSINESS_NAME || 'Deuce Adventure Park',
    currency: process.env.CURRENCY || 'INR'
  });
});

// ─── NOTIFICATIONS (mock) ─────────────────────────────────────────────────────
app.post('/api/notifications/send', async (req, res) => {
  try {
    const { to, type, ticketId, details } = req.body;
    await new Promise(r => setTimeout(r, 400));
    console.log(`[notification] Sent ${type} to ${to} for ticket ${ticketId}`);
    res.status(200).json({
      success: true,
      message: `${type} notification sent to ${to}`
    });
  } catch (error) {
    console.error('[notification]', error);
    res.status(500).json({ message: 'Notification failed' });
  }
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`[server] Listening on port ${PORT}`));
}

export default app;
