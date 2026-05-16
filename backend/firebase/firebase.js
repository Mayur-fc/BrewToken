const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
// ✅ REMOVED: const serviceAccount = require('./serviceAccount.json');

let db;

const isTestMode = process.env.TEST_MODE === 'true';

if (isTestMode) {
  console.log('⚠️  Using mock Firestore (development mode)');
  
  const mockStore = {};
  
  const mockDb = {
    collection: (name) => {
      if (!mockStore[name]) mockStore[name] = {};
      return {
        doc: (id) => ({
          get: async () => ({
            exists: !!mockStore[name][id],
            data: () => mockStore[name][id] || null,
            id
          }),
          set: async (data) => {
            mockStore[name][id] = data;
            return { id };
          },
          update: async (data) => {
            if (mockStore[name][id]) {
              mockStore[name][id] = { ...mockStore[name][id], ...data };
            }
            return { id };
          },
          delete: async () => {
            delete mockStore[name][id];
            return true;
          },
        }),
        add: async (data) => {
          const id = Date.now().toString();
          mockStore[name][id] = { ...data };
          return { id };
        },
        orderBy: () => ({
          get: async () => ({
            docs: Object.entries(mockStore[name] || {}).map(([id, data]) => ({ id, data: () => data }))
          }),
        }),
        where: () => ({
          get: async () => ({ docs: [] }),
        }),
        get: async () => ({
          docs: Object.entries(mockStore[name] || {}).map(([id, data]) => ({ id, data: () => data }))
        }),
      };
    },
  };
  db = mockDb;

} else {
  let serviceAccount; // ✅ Now this is the only declaration
  const envJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const envPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, 'serviceAccount.json');

  if (envJson) {
    try {
      serviceAccount = JSON.parse(envJson);
    } catch (error) {
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT JSON string');
    }
  } else if (fs.existsSync(envPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(envPath, 'utf8'));
  } else {
    throw new Error('Firebase service account not found.');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  db = admin.firestore();
  console.log('✅ Firebase connected successfully');
}

module.exports = { db };