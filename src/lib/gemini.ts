// Cliente Gemini 1.5 Flash
// Requiere instalar la dependencia:
// pnpm add @google/generative-ai

import { GoogleGenerativeAI } from '@google/generative-ai'

let gemini: GoogleGenerativeAI | null = null

export function getGemini() {
  if (gemini) return gemini
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no definido')
  }
  gemini = new GoogleGenerativeAI(apiKey)
  return gemini
} 