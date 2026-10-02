import { config } from '../config/env.js';
import { getDbPool } from '../config/database.js';

export class AiAssistantService {
  static async ask({ query, userRole }) {
    if (!config.ai.apiKey) {
      return {
        hasAiKey: false,
        message: 'AI Assistant features are optional. To enable Gemini AI library intelligence, configure the GEMINI_API_KEY environment variable in .env. The deterministic core library system functions independently without external API keys.',
      };
    }

    try {
      // Deterministically fetch relevant metadata context from MySQL
      const pool = getDbPool();
      const [popularBooks] = await pool.query(`
        SELECT b.title, b.author, c.name as category, COUNT(l.id) as circulation_count
        FROM books b
        LEFT JOIN categories c ON c.id = b.category_id
        LEFT JOIN book_copies cp ON cp.book_id = b.id
        LEFT JOIN loans l ON l.copy_id = cp.id
        GROUP BY b.id, b.title, b.author, c.name
        ORDER BY circulation_count DESC LIMIT 10
      `);

      const [librarySettings] = await pool.query('SELECT library_name, default_loan_days, default_daily_fine_rate, default_grace_period_days FROM library_settings WHERE id = 1');

      const systemPrompt = `You are the AI Assistant for ${librarySettings[0]?.library_name || 'LibraFlow Library'}.
User role: ${userRole}.
Library Policies:
- Default Loan Period: ${librarySettings[0]?.default_loan_days || 14} days
- Grace Period: ${librarySettings[0]?.default_grace_period_days || 2} days
- Daily Fine Rate: ₹${librarySettings[0]?.default_daily_fine_rate || 5.00} per day
Popular Titles in Catalog: ${JSON.stringify(popularBooks)}

Guidelines:
1. Explain library policies and recommend books strictly from catalog metadata.
2. Never invent book availability or calculate fines.
3. Be professional, friendly, and concise.`;

      // Call Gemini REST API
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.ai.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nUser Question: ${query}` }]
            }
          ]
        })
      });

      const data = await response.json();
      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return {
          hasAiKey: true,
          answer: data.candidates[0].content.parts[0].text,
        };
      } else {
        return {
          hasAiKey: true,
          answer: 'AI Assistant received an unexpected response structure.',
          raw: data,
        };
      }
    } catch (err) {
      return {
        hasAiKey: true,
        error: `AI Service Error: ${err.message}`,
      };
    }
  }
}
