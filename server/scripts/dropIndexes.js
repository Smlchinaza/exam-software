const mongoose = require('mongoose');
require('dotenv').config();

async function dropIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collections = await db.collections();
    
    for (let collection of collections) {
      const indexes = await collection.indexes();
      console.log(`Collection ${collection.collectionName} has indexes:`, indexes);
      
      // Drop all indexes except _id
      for (let index of indexes) {
        if (index.name !== '_id_') {
          await collection.dropIndex(index.name);
          console.log(`Dropped index ${index.name} from ${collection.collectionName}`);
        }
      }
    }

    console.log('Successfully dropped all indexes');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

dropIndexes(); 