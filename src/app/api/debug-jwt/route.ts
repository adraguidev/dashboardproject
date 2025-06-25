import { NextRequest, NextResponse } from 'next/server'
import { stackServerApp } from '../../../stack'
import * as jose from 'jose'

const NEON_BASE_URL = 'https://app-delicate-river-89418359.dpl.myneon.app'

// Diferentes secrets a probar basados en la documentación de PostgREST
const POSSIBLE_SECRETS = [
  'npg_q5xR6NogtlHh', // Contraseña bdmigra_owner actual
  'reallyreallyreallyreallyverysafe', // Secret común de PostgREST
  'npg_Onr4h3tNeZBL', // Contraseña anterior admin_bd
  'ufsm-dashboard-secret-key-2024', // NEXTAUTH_SECRET
]

// Diferentes roles a probar
const POSSIBLE_ROLES = [
  'bdmigra_owner',
  'authenticator', 
  'authenticated',
  'web_anon',
  'anon',
  'postgres'
]

// Función para generar JWT con secret y rol específicos
async function generateJWT(secret: string, role: string, user: any) {
  const payload = {
    sub: user.id,
    email: user.primaryEmail,
    role: role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hora
  }

  try {
    const token = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(secret))
    
    return { token, payload, error: null }
  } catch (error) {
    return { 
      token: null, 
      payload, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

// Función para probar un JWT específico
async function testJWT(token: string, secret: string, role: string) {
  try {
    const response = await fetch(`${NEON_BASE_URL}/evaluadores_ccm?select=count`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      signal: AbortSignal.timeout(5000)
    })
    
    const result = {
      secret,
      role,
      status: response.status,
      success: response.ok,
      data: null as any,
      error: null as string | null
    }
    
    if (response.ok) {
      result.data = await response.json()
    } else {
      result.error = await response.text()
    }
    
    return result
  } catch (error) {
    return {
      secret,
      role,
      status: 0,
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Error de conexión'
    }
  }
}

export async function GET(request: NextRequest) {
  console.log('\n🔬 === DIAGNÓSTICO ESPECÍFICO DE JWT ===')
  
  const results: any = {
    timestamp: new Date().toISOString(),
    stackAuth: null,
    jwtTests: [],
    summary: {
      totalTests: 0,
      successfulTests: 0,
      failedTests: 0,
      workingCombinations: []
    }
  }
  
  try {
    // 1. Verificar Stack Auth
    console.log('\n1️⃣ Verificando Stack Auth...')
    const user = await stackServerApp.getUser()
    
    if (!user) {
      results.stackAuth = {
        status: 'error',
        error: 'No hay usuario autenticado'
      }
      console.log('❌ No hay usuario autenticado con Stack Auth')
      
      return NextResponse.json({
        success: false,
        message: 'Debes iniciar sesión primero',
        results
      }, { status: 401 })
    }
    
    results.stackAuth = {
      status: 'success',
      user: {
        id: user.id,
        email: user.primaryEmail,
        displayName: user.displayName
      }
    }
    console.log('✅ Usuario autenticado:', user.displayName || user.primaryEmail)
    
    // 2. Probar todas las combinaciones de secret + rol
    console.log('\n2️⃣ Probando combinaciones de secret y rol...')
    
    for (const secret of POSSIBLE_SECRETS) {
      for (const role of POSSIBLE_ROLES) {
        console.log(`🧪 Probando secret: ${secret.substring(0, 8)}... con rol: ${role}`)
        
        // Generar JWT
        const jwtResult = await generateJWT(secret, role, user)
        
        if (jwtResult.error) {
          console.log(`❌ Error generando JWT: ${jwtResult.error}`)
          results.jwtTests.push({
            secret: secret.substring(0, 8) + '...',
            role,
            jwtGeneration: 'error',
            jwtError: jwtResult.error,
            postgrestTest: null
          })
          continue
        }
        
        // Probar JWT con PostgREST
        const testResult = await testJWT(jwtResult.token!, secret, role)
        
        console.log(`${testResult.success ? '✅' : '❌'} ${secret.substring(0, 8)}.../${role}: ${testResult.status} - ${testResult.success ? 'ÉXITO' : testResult.error}`)
        
        results.jwtTests.push({
          secret: secret.substring(0, 8) + '...',
          fullSecret: secret, // Solo para debugging
          role,
          jwtGeneration: 'success',
          jwtPayload: jwtResult.payload,
          postgrestTest: testResult
        })
        
        results.summary.totalTests++
        
        if (testResult.success) {
          results.summary.successfulTests++
          results.summary.workingCombinations.push({
            secret: secret.substring(0, 8) + '...',
            role,
            fullSecret: secret
          })
          console.log(`🎉 COMBINACIÓN EXITOSA: ${secret.substring(0, 8)}.../${role}`)
        } else {
          results.summary.failedTests++
        }
      }
    }
    
    // 3. Análisis de resultados
    console.log('\n3️⃣ Análisis de resultados...')
    console.log(`📊 Total de pruebas: ${results.summary.totalTests}`)
    console.log(`✅ Exitosas: ${results.summary.successfulTests}`)
    console.log(`❌ Fallidas: ${results.summary.failedTests}`)
    
    if (results.summary.successfulTests > 0) {
      console.log('\n🎯 COMBINACIONES QUE FUNCIONAN:')
      results.summary.workingCombinations.forEach((combo: any) => {
        console.log(`   - Secret: ${combo.secret}, Rol: ${combo.role}`)
      })
    } else {
      console.log('\n😞 No se encontraron combinaciones exitosas')
    }
    
    console.log('\n🔬 === FIN DEL DIAGNÓSTICO JWT ===\n')
    
    return NextResponse.json({
      success: true,
      message: `Diagnóstico JWT completado. ${results.summary.successfulTests} de ${results.summary.totalTests} combinaciones funcionaron.`,
      results
    })
    
  } catch (error) {
    console.error('❌ Error en diagnóstico JWT:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error en diagnóstico JWT',
        details: error instanceof Error ? error.message : 'Error desconocido',
        results
      },
      { status: 500 }
    )
  }
} 