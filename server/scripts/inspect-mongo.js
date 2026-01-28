#!/usr/bin/env node
"use strict";
const { MongoClient } = require('mongodb');

(async () => {
  const mongoUri = process.argv[2] || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Usage: node inspect-mongo.js <mongo_uri>');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);
  await client.connect();

  try {
    const db = client.db();
    const colls = await db.listCollections().toArray();
    console.log('Collections found:', colls.map(c => c.name).join(', '));

    for (const c of colls) {
      const count = await db.collection(c.name).countDocuments();
      console.log(`\n${c.name}: ${count} documents`);
      if (count > 0) {
        const sample = await db.collection(c.name).findOne();
        console.log('Sample:', JSON.stringify(sample, null, 2).slice(0, 400));
      }
    }
  } finally {
    await client.close();
  }
})();
