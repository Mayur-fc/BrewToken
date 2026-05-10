const { db } = require('../firebase/firebase');
const ordersCollection = db.collection('orders');
const metaCollection = db.collection('meta');

async function getNextToken() {
  const tokenDoc = metaCollection.doc('tokenCounter');
  
  try {
    const doc = await tokenDoc.get();
    
    if (!doc.exists) {
      await tokenDoc.set({ next: 102 }); // start at 102, first token = 101
      return 'CAF101';
    }
    
    const next = doc.data().next || 101;
    await tokenDoc.update({ next: next + 1 });
    return `CAF${next}`;
    
  } catch (error) {
    // If Firestore token fails, fallback so order isn't lost
    console.error('Token generation error:', error);
    return `CAF${Date.now().toString().slice(-4)}`;
  }
}

exports.createOrder = async (req, res) => {
  try {
    // Validate incoming data
    if (!req.body.items || !req.body.total) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: items, total' 
      });
    }

    const token = await getNextToken();

    const order = {
      customer: req.body.customer || 'Guest Customer',
      items: req.body.items,
      total: req.body.total,
      payMethod: req.body.payMethod || 'UPI',
      paymentStatus: 'Verified',
      token,
      status: 'Payment Verified',
      statusIndex: 0,
      transactionId: 'TXN' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('Saving order to Firestore:', order); // ← watch terminal

    const docRef = await ordersCollection.add(order); // ✅ use ordersCollection consistently

    console.log('Order saved with ID:', docRef.id); // ← confirm save

    res.status(201).json({
      success: true,
      order: {
        id: docRef.id,
        ...order
      }
    });

  } catch (error) {
    console.error('CREATE ORDER ERROR:', error); // full error in terminal
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const snapshot = await ordersCollection.orderBy('createdAt', 'desc').get();
    const orders = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
    console.log(`Fetched ${orders.length} orders`); // watch terminal
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

exports.getOrderByToken = async (req, res) => {
  try {
    const token = req.params.token;
    console.log('Looking up token:', token);

    const snapshot = await ordersCollection
      .where('token', '==', token)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const doc = snapshot.docs[0];
    const order = { 
      id: doc.id,      // ✅ include document ID so frontend can call advanceOrder
      ...doc.data() 
    };

    res.json({ success: true, order });

  } catch (error) {
    console.error('GET ORDER BY TOKEN ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, statusIndex } = req.body;
    
    if (!status || statusIndex === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing status information' 
      });
    }
    
    const docRef = ordersCollection.doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }
    
    await docRef.update({ 
      status, 
      statusIndex, 
      updatedAt: new Date().toISOString() // ✅ consistent ISO string format
    });
    
    res.json({ success: true, message: 'Order status updated' });
    
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};