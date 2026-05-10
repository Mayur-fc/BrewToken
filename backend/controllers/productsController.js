const { db } = require('../firebase/firebase');

const productsCollection = db.collection('products');

exports.getProducts = async (req, res) => {
  try {
    const snapshot = await productsCollection.orderBy('name').get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, price, category, img, veg, available } = req.body;
    if (!name || !price || !category) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const newProduct = {
      name,
      price,
      category,
      img: img || '',
      veg: !!veg,
      available: available === undefined ? true : !!available,
      createdAt: new Date().toISOString(),
    };
    const docRef = await productsCollection.add(newProduct);
    res.status(201).json({ success: true, product: { id: docRef.id, ...newProduct } });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, category, img, veg, available } = req.body;
    const docRef = productsCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    await docRef.update({
      name,
      price,
      category,
      img,
      veg: !!veg,
      available: !!available,
      updatedAt: new Date().toISOString(),
    });
    res.json({ success: true, message: 'Product updated' });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = productsCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    await docRef.delete();
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
};

exports.toggleAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = productsCollection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const current = doc.data().available;
    await docRef.update({ available: !current, updatedAt: new Date().toISOString() });
    res.json({ success: true, available: !current });
  } catch (error) {
    console.error('Error toggling availability:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle availability' });
  }
};
