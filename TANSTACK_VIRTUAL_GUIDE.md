# Guía de Implementación: TanStack Virtual

Este documento explica qué es TanStack Virtual (antes React Virtual), sus ventajas y cómo implementarlo en una aplicación, especialmente en el contexto de este proyecto para optimizar la visualización de grandes listas de datos.

## ¿Qué es TanStack Virtual?

TanStack Virtual es una utilidad "headless UI" para virtualizar listas y tablas con una gran cantidad de elementos. "Headless" significa que no renderiza ningún componente, markup o estilo por sí misma. En su lugar, proporciona los "cerebros" (la lógica) para calcular qué elementos de una lista deberían ser visibles para el usuario en un momento dado, permitiendo al desarrollador tener el **100% del control sobre el renderizado, el markup y los estilos**.

Su principal objetivo es mejorar drásticamente el rendimiento al renderizar solo los elementos que caben en el viewport (la parte visible de la pantalla), en lugar de renderizar miles de filas a la vez.

## Ventajas Clave

1.  **Rendimiento Excepcional (60 FPS)**: Al renderizar únicamente los nodos del DOM que son visibles, se evita la sobrecarga del navegador al manejar miles de elementos. Esto es crucial para mantener una experiencia de usuario fluida (60 frames por segundo) en tablas o listas con miles o cientos de miles de filas, como las que se manejan en los reportes de `pendientes-report-table` o `produccion-report-table`.

2.  **Control Total sobre la UI (Headless)**: A diferencia de librerías de componentes como Material-UI o Ant Design, TanStack Virtual no impone ninguna estructura de HTML o CSS. Simplemente te da los datos (qué renderizar y dónde) y tú decides cómo se ve. Esto se integra perfectamente con `shadcn/ui` y `Tailwind CSS`, ya que no hay conflicto de estilos.

3.  **Ligero y Agnóstico al Framework**: Tiene un tamaño de paquete muy pequeño (entre 1-2kb) y, aunque aquí lo usamos con React, está diseñado para funcionar con cualquier framework (Vue, Svelte, Solid, etc.).

4.  **Soporte para Tamaños Dinámicos**: Puede manejar filas de altura variable, lo cual es útil si el contenido de las celdas puede cambiar de tamaño.

## ¿Cómo Funciona?

El concepto es simple pero poderoso:

1.  **Contenedor Scrollable**: Se define un elemento contenedor (un `div`, por ejemplo) con una altura fija y la propiedad `overflow: auto`. Este será el "viewport" de nuestra lista.

2.  **Contenedor Interno Gigante**: Dentro del contenedor scrollable, se crea otro `div` cuya altura es la **altura total estimada de todos los elementos de la lista si estuvieran renderizados**. Por ejemplo, si tienes 10,000 items y cada uno mide 35px, este `div` medirá 350,000px de alto. Esto crea una barra de scroll realista.

3.  **Renderizado de Items Visibles**: La librería calcula qué items deberían ser visibles basándose en la posición del scroll. Luego, te devuelve un array de "items virtuales".

4.  **Posicionamiento Absoluto**: Cada "item virtual" se renderiza como un `div` (o `tr` en una tabla) con `position: absolute`. Se utiliza la propiedad `transform: translateY(...)` para mover cada elemento a su posición vertical correcta dentro del contenedor gigante.

El resultado es que, aunque el usuario cree que se está desplazando por miles de filas, en realidad solo hay un puñado de elementos del DOM que se reciclan y se mueven por la pantalla.

## Implementación Básica en React

Aquí un ejemplo conceptual para una lista simple.

### 1. Instalación

```bash
pnpm add @tanstack/react-virtual
```

### 2. Uso del Hook `useVirtualizer`

```tsx
import * as React from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

function MiListaVirtual() {
  // Referencia al elemento que tendrá el scroll
  const parentRef = React.useRef(null)

  // Datos de ejemplo (pueden ser miles)
  const allItems = new Array(10000).fill(0).map((_, i) => `Item ${i}`)

  // El hook principal de la librería
  const rowVirtualizer = useVirtualizer({
    count: allItems.length, // Número total de items en la lista
    getScrollElement: () => parentRef.current, // Función que devuelve el elemento scrollable
    estimateSize: () => 35, // Altura estimada de cada fila en píxeles
    overscan: 5, // Renderiza 5 elementos extra arriba y abajo del viewport para un scroll más suave
  })

  return (
    // 1. El contenedor scrollable
    <div
      ref={parentRef}
      style={{
        height: `400px`,
        overflow: 'auto',
      }}
    >
      {/* 2. El contenedor interno gigante que define la altura total */}
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {/* 3. Mapeamos solo los items virtuales que nos da el hook */}
        {rowVirtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`, // <-- La magia está aquí
            }}
          >
            {allItems[virtualItem.index]}
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Integración con TanStack Table

La verdadera potencia en este proyecto se desbloquea al combinar `TanStack Table` con `TanStack Virtual`. Esto nos permite tener tablas de datos de alto rendimiento. La implementación es muy similar, pero se aplica al `<tbody>` de la tabla, y cada `<tr>` se posiciona de forma absoluta.

El `useVirtualizer` se configura con el número de filas de la tabla:

```tsx
const { rows } = table.getRowModel() // de useReactTable

const virtualizer = useVirtualizer({
  count: rows.length,
  // ...
})

// En el JSX:
// ...
<tbody>
  {virtualizer.getVirtualItems().map(virtualRow => {
    const row = rows[virtualRow.index]
    return (
      <tr
        key={row.id}
        style={{
          height: `${virtualRow.size}px`,
          transform: `translateY(${virtualRow.start - virtualRow.index * virtualRow.size}px)`,
        }}
      >
        {/* ... renderizar celdas ... */}
      </tr>
    )
  })}
</tbody>
// ...
```

Puedes ver un ejemplo oficial completo en la [documentación de TanStack Virtual para tablas](https://tanstack.com/virtual/latest/docs/framework/react/examples/table). 