import { neon } from "@neondatabase/serverless";
import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";
import { stackServerApp } from "@/stack";

// Esquema simple para nuestras tablas existentes
export const schema = {
  // Definiremos el esquema según nuestras tablas reales
};

export async function fetchWithDrizzle<T>(
  callback: (
    db: NeonHttpDatabase<typeof schema>,
    { userId }: { userId: string },
  ) => Promise<T>,
) {
  const user = await stackServerApp.getUser();

  if (!user || !user.id) {
    throw new Error("No userId - usuario no autenticado");
  }

  const db = drizzle(neon(process.env.DATABASE_URL!), {
    schema,
  });

  return callback(db, { userId: user.id });
}

// Función para conexión directa sin schema específico
export async function getDrizzleDB() {
  const user = await stackServerApp.getUser();

  if (!user || !user.id) {
    throw new Error("No userId - usuario no autenticado");
  }

  return {
    db: drizzle(neon(process.env.DATABASE_URL!)),
    userId: user.id,
    userEmail: user.primaryEmail
  };
} 