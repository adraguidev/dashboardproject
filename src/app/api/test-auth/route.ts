import { NextRequest, NextResponse } from 'next/server'
import { stackServerApp } from '../../../stack'
import * as jose from 'jose'

const NEON_BASE_URL = 'https://app-delicate-river-89418359.dpl.myneon.app'

// Función para generar JWT dinámico para PostgREST basado en el usuario de Stack Auth
async function generatePostgRESTJWT(user: any) {
  const secret = process.env.POSTGREST_JWT_SECRET || 'npg_q5xR6NogtlHh'
  
  const payload = {
    sub: user.id,
    email: user.primaryEmail,
    role: 'bdmigra_owner',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hora de validez
  }

  const token = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(secret))

  return token
}

export async function GET(request: NextRequest) {
  console.log('\n🔬 === DIAGNÓSTICO DE AUTENTICACIÓN ===')
  
  const results: any = {
    timestamp: new Date().toISOString(),
    stackAuth: null,
    postgrest: {
      withAuth: null,
      withoutAuth: null,
      tableTests: {}
    }
  }
  
  try {
    // 1. Probar Stack Auth
    console.log('\n1️⃣ Probando Stack Auth...')
    try {
      const user = await stackServerApp.getUser()
      if (user) {
        results.stackAuth = {
          status: 'success',
          user: {
            id: user.id,
            email: user.primaryEmail,
            displayName: user.displayName
          }
        }
        console.log('✅ Stack Auth: Usuario autenticado -', user.displayName || user.primaryEmail)
        
        // 2. Generar JWT para PostgREST
        console.log('\n2️⃣ Generando JWT para PostgREST...')
        const jwtToken = await generatePostgRESTJWT(user)
        console.log('✅ JWT generado exitosamente')
        
        // 3. Probar PostgREST con JWT
        console.log('\n3️⃣ Probando PostgREST con JWT...')
        try {
          const authResponse = await fetch(`${NEON_BASE_URL}/evaluadores_ccm?select=count`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${jwtToken}`
            },
            signal: AbortSignal.timeout(5000)
          })
          
          if (authResponse.ok) {
            const authData = await authResponse.json()
            results.postgrest.withAuth = {
              status: 'success',
              data: authData,
              statusCode: authResponse.status
            }
            console.log('✅ PostgREST con JWT: Éxito -', authData)
          } else {
            const errorText = await authResponse.text()
            results.postgrest.withAuth = {
              status: 'error',
              error: errorText,
              statusCode: authResponse.status
            }
            console.log('❌ PostgREST con JWT: Error', authResponse.status, errorText)
          }
        } catch (postgrestError) {
          results.postgrest.withAuth = {
            status: 'error',
            error: postgrestError instanceof Error ? postgrestError.message : 'Error desconocido'
          }
          console.log('❌ PostgREST con JWT: Excepción', postgrestError)
        }
        
      } else {
        results.stackAuth = {
          status: 'error',
          error: 'No hay usuario autenticado'
        }
        console.log('❌ Stack Auth: No hay usuario autenticado')
      }
    } catch (stackError) {
      results.stackAuth = {
        status: 'error',
        error: stackError instanceof Error ? stackError.message : 'Error desconocido'
      }
      console.log('❌ Stack Auth: Error', stackError)
    }
    
    // 4. Probar PostgREST sin autenticación
    console.log('\n4️⃣ Probando PostgREST sin autenticación...')
    try {
      const noAuthResponse = await fetch(`${NEON_BASE_URL}/evaluadores_ccm?select=count`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(5000)
      })
      
      if (noAuthResponse.ok) {
        const noAuthData = await noAuthResponse.json()
        results.postgrest.withoutAuth = {
          status: 'success',
          data: noAuthData,
          statusCode: noAuthResponse.status
        }
        console.log('✅ PostgREST sin auth: Éxito -', noAuthData)
      } else {
        const errorText = await noAuthResponse.text()
        results.postgrest.withoutAuth = {
          status: 'error',
          error: errorText,
          statusCode: noAuthResponse.status
        }
        console.log('❌ PostgREST sin auth: Error', noAuthResponse.status, errorText)
      }
    } catch (noAuthError) {
      results.postgrest.withoutAuth = {
        status: 'error',
        error: noAuthError instanceof Error ? noAuthError.message : 'Error desconocido'
      }
      console.log('❌ PostgREST sin auth: Excepción', noAuthError)
    }
    
    // 5. Probar acceso a diferentes tablas (solo si Stack Auth funciona)
    if (results.stackAuth?.status === 'success') {
      console.log('\n5️⃣ Probando acceso a diferentes tablas...')
      const user = await stackServerApp.getUser()
      const jwtToken = await generatePostgRESTJWT(user!)
      
      const tablesToTest = ['evaluadores_ccm', 'evaluadores_prr', 'table_ccm']
      
      for (const table of tablesToTest) {
        try {
          const tableResponse = await fetch(`${NEON_BASE_URL}/${table}?select=count`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Bearer ${jwtToken}`
            },
            signal: AbortSignal.timeout(3000)
          })
          
          if (tableResponse.ok) {
            const tableData = await tableResponse.json()
            results.postgrest.tableTests[table] = {
              status: 'success',
              data: tableData,
              statusCode: tableResponse.status
            }
            console.log(`✅ Tabla ${table}: Éxito -`, tableData)
          } else {
            const errorText = await tableResponse.text()
            results.postgrest.tableTests[table] = {
              status: 'error',
              error: errorText,
              statusCode: tableResponse.status
            }
            console.log(`❌ Tabla ${table}: Error ${tableResponse.status} -`, errorText)
          }
        } catch (tableError) {
          results.postgrest.tableTests[table] = {
            status: 'error',
            error: tableError instanceof Error ? tableError.message : 'Error desconocido'
          }
          console.log(`❌ Tabla ${table}: Excepción -`, tableError)
        }
      }
    }
    
    console.log('\n🔬 === FIN DEL DIAGNÓSTICO ===\n')
    
    return NextResponse.json({
      success: true,
      message: 'Diagnóstico de autenticación completado',
      results
    })
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error en diagnóstico de autenticación',
        details: error instanceof Error ? error.message : 'Error desconocido',
        results
      },
      { status: 500 }
    )
  }
} 