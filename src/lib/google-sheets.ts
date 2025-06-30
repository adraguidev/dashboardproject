import { google } from 'googleapis'
import { logError, logInfo } from './logger'

// Define el alcance de los permisos. Solo necesitamos leer las hojas de cálculo.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']

/**
 * Obtiene un cliente autenticado de la API de Google Sheets.
 * Utiliza las credenciales de la variable de entorno.
 */
async function getAuthenticatedClient() {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (!credentialsJson) {
    logError('La variable de entorno GOOGLE_APPLICATION_CREDENTIALS_JSON no está configurada.')
    throw new Error('Credenciales de Google no configuradas.')
  }

  try {
    const credentials = JSON.parse(credentialsJson)

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key.replace(/\\n/g, '\n'), // Reemplaza los escapes \\n por saltos de línea reales
      },
      scopes: SCOPES,
    })

    const client = await auth.getClient()
    return google.sheets({ version: 'v4', auth: client as any })
  } catch (error) {
    logError('Error al autenticar con Google Sheets API:', error)
    throw new Error('Fallo en la autenticación con Google Sheets.')
  }
}

/**
 * Obtiene los datos de una hoja de cálculo de Google.
 * @param spreadsheetId - El ID de la hoja de cálculo.
 * @param range - El rango de celdas a obtener (ej. 'Hoja1!A1:D50').
 * @returns Una promesa que se resuelve en un array de arrays con los datos.
 */
export async function getSheetData(spreadsheetId: string, range: string): Promise<any[][]> {
  logInfo(`Solicitando datos de Google Sheet. ID: ${spreadsheetId}, Rango: ${range}`)
  try {
    const sheets = await getAuthenticatedClient()
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    })

    const rows = response.data.values
    if (!rows || rows.length === 0) {
      logInfo('No se encontraron datos en la hoja de cálculo para el rango especificado.')
      return []
    }
    
    logInfo(`Datos obtenidos exitosamente de Google Sheet. ${rows.length} filas recuperadas.`)
    return rows
  } catch (error) {
    logError(`Error al obtener datos de Google Sheet (ID: ${spreadsheetId}):`, error)
    // Lanza el error para que sea manejado por la capa superior (la ruta de la API)
    throw new Error('No se pudieron obtener los datos de Google Sheets.')
  }
} 