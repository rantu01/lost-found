import dns from 'node:dns'
import { MongoClient } from 'mongodb'

try {
  dns.setServers(['8.8.8.8', '1.1.1.1'])
} catch (dnsError) {
  console.warn('Failed to set public DNS servers, falling back to system defaults:', dnsError.message)
}

const uri = process.env.MONGODB_URI

let client
let clientPromise = null

if (!uri) {
  console.warn('MONGODB_URI not set. Database access disabled; API routes will return empty results.')
} else {
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri)
      global._mongoClientPromise = client.connect()
    }
    clientPromise = global._mongoClientPromise
  } else {
    client = new MongoClient(uri)
    clientPromise = client.connect()
  }
}

export default clientPromise
