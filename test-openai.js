import OpenAI from 'openai';
import 'dotenv/config';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function test() {
  try {
    const models = await openai.models.list();
    console.log('✅ OpenAI connection successful!');
    console.log('Available models:', models.data.slice(0, 3).map(m => m.id));
  } catch (error) {
    console.error('❌ OpenAI connection failed:', error.message);
  }
}

test();
