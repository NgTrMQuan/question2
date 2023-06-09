const express = require('express');
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3001;

const uri = 'mongodb://localhost:27017';
const dbName = 'food';
const collectionNames = {
  orders: 'orders',
  inventory: 'inventory',
  users: 'users',
};

app.use(express.json());

const client = new MongoClient(uri);

async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

async function importData() {
  try {
    const db = client.db(dbName);
    const ordersCollection = db.collection(collectionNames.orders);
    const inventoryCollection = db.collection(collectionNames.inventory);
    const usersCollection = db.collection(collectionNames.users);

    ordersCollection.insertMany([
      { "_id": 1, "item": "almonds", "price": 12, "quantity": 2 },
      { "_id": 2, "item": "pecans", "price": 20, "quantity": 1 },
      { "_id": 3, "item": "pecans", "price": 20, "quantity": 3 }
    ]);

    inventoryCollection.insertMany([
      { "_id": 1, "sku": "almonds", "description": "product 1", "instock": 120 },
      { "_id": 2, "sku": "bread", "description": "product 2", "instock": 80 },
      { "_id": 3, "sku": "cashews", "description": "product 3", "instock": 60 },
      { "_id": 4, "sku": "pecans", "description": "product 4", "instock": 70 }
    ]);

    await usersCollection.insertMany([
      { "username": "admin", "password": "MindX@2022" },
      { "username": "alice", "password": "MindX@2022" }
    ]);

    console.log('Data imported successfully');
  } catch (error) {
    console.error('Error importing data:', error);
  }
}
connectToDatabase().then(() => {
  importData();
});

// API endpoint to get all products in inventory
app.get('/products', async (req, res) => {
  try {
    const db = client.db(dbName);
    const collection = db.collection(collectionNames.inventory);

    const products = await collection.find().toArray();

    res.json(products);
  } catch (error) {
    console.error('Error retrieving products:', error);
    res.status(500).json({ error: 'Failed to retrieve products' });
  }
});

// API endpoint to get products with low quantity (less than 100)
app.get('/products/low-quantity', async (req, res) => {
  try {
    const db = client.db(dbName);
    const collection = db.collection(collectionNames.inventory);

    const products = await collection.find({ instock: { $lt: 100 } }).toArray();

    res.json(products);
  } catch (error) {
    console.error('Error retrieving products:', error);
    res.status(500).json({ error: 'Failed to retrieve products' });
  }
});

// API endpoint for user login and token generation
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const db = client.db(dbName);
    const collection = db.collection(collectionNames.users);

    const user = await collection.findOne({ username, password });

    if (!user) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const token = jwt.sign({ username }, 'secret-key');

    res.json({ token });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

function authenticateToken(req, res, next) {
  const token = req.headers['authorization'];

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  jwt.verify(token, 'secret-key', (err, decoded) => {
    if (err) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }

    req.user = decoded.username;
    next();
  });
}

// API endpoint to retrieve orders with product descriptions
app.get('/orders', authenticateToken, async (req, res) => {
  try {
    const db = client.db(dbName);
    const ordersCollection = db.collection(collectionNames.orders);
    const inventoryCollection = db.collection(collectionNames.inventory);

    const orders = await ordersCollection.find().toArray();

    // Retrieve product descriptions for each order
    const ordersWithDescriptions = await Promise.all(
      orders.map(async (order) => {
        const product = await inventoryCollection.findOne({ sku: order.item });
        return { ...order, description: product.description };
      })
    );

    res.json(ordersWithDescriptions);
  } catch (error) {
    console.error('Error retrieving orders:', error);
    res.status(500).json({ error: 'Failed to retrieve orders' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
