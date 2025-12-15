const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// In-memory 'database'
const orders = [];
let nextOrderId = 1;

// Helper to simulate DB latency
const simulateLatency = (ms = 100) => new Promise(resolve => setTimeout(resolve, ms));

// GET /api/orders
app.get('/api/orders', async (req, res) => {
  await simulateLatency(Math.random() * 200 + 50); // 50-250ms latency
  console.log(`[Backend] GET /api/orders - ${orders.length} orders found`);
  res.json({
    data: orders,
    meta: { count: orders.length, timestamp: new Date() }
  });
});

// POST /api/orders
app.post('/api/orders', async (req, res) => {
  await simulateLatency(Math.random() * 300 + 100); // 100-400ms latency
  
  const { item, amount } = req.body;
  
  if (!item || !amount) {
    return res.status(400).json({ error: 'Item and amount required' });
  }

  const newOrder = {
    id: nextOrderId++,
    item,
    amount,
    status: 'pending',
    createdAt: new Date()
  };
  
  orders.push(newOrder);
  console.log(`[Backend] POST /api/orders - Created Order #${newOrder.id}`);
  
  res.status(201).json(newOrder);
});

// GET /api/payments/:orderId
app.get('/api/payments/:orderId', async (req, res) => {
  await simulateLatency(100);
  
  const { orderId } = req.params;
  const order = orders.find(o => o.id == orderId);
  
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Simulate outputting payment status
  res.json({
    orderId: order.id,
    status: 'paid',
    transactionId: `tx_${Date.now()}_${order.id}`,
    amount: order.amount
  });
});

// Catch-all
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found on Backend Service' });
});

app.listen(PORT, () => {
  console.log(`Backend Service running on port ${PORT}`);
});
