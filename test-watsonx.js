import { WatsonXAI } from '@ibm-cloud/watsonx-ai';
import 'dotenv/config';

const watsonxAI = new WatsonXAI({
  version: '2024-05-31',
  serviceUrl: process.env.WATSONX_URL,
  authenticator: {
    apikey: process.env.WATSONX_API_KEY,
  },
});

console.log('WatsonXAI methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(watsonxAI)));
