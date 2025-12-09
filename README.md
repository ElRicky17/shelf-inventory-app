# Tiendi — Inventario para Góndolas (Prototipo)

Tiendi es un prototipo de aplicación móvil (React Native + Expo) diseñado para ayudar a pequeñas tiendas a gestionar inventarios en góndolas y puntos de venta. Esta versión es una prueba de concepto que permite escanear productos, ver información básica y ajustar cantidades antes de integrarlo con un sistema POS completo.

## Objetivo

- Resolver la gestión rápida de inventario en tienda (registro y ajuste de existencias).
- Funcionar como MVP para demostrar la viabilidad y ahorrar costos frente a contratar una integración completa con proveedores de POS.

## Características principales (prototipo)

- Escaneo / búsqueda de productos.
- Modal de producto con información (precio, existencia, proveedor, unidad).
- Ajuste de cantidades y registro local temporal.
- Interfaz orientada a uso en dispositivos Android (APK de prueba disponible).

## Tecnologías

- Frontend: React Native + Expo
- Enrutamiento de app: Expo Router (file-based routing)
- Lenguaje: TypeScript
- Estructura de código: carpeta `app/` contiene las pantallas y rutas

## Estructura del repositorio (relevante)

- `app/` — código fuente de la aplicación (pantallas, componentes)
- `assets/` — iconos y recursos estáticos
- `android/` — configuración nativa y gradle (builds Android)
- `package.json`, `tsconfig.json`, `eas.json` — configuración de proyecto

---

## Instalación y ejecución (desarrollo)

1. Clona el repositorio y entra en la carpeta:

```powershell
git clone <repo_url>
cd Tiendi
```

2. Instala dependencias:

```powershell
npm install
```

3. Inicia el servidor de desarrollo de Expo:

```powershell
npx expo start
```

4. Para probar en Android emulador o dispositivo físico puedes usar las opciones que muestra `expo start` (Dev build / emulator / Expo Go limitado). Para generar un APK de prueba se recomienda usar EAS Build o Android Studio con `gradlew`.

## Build (APK) — nota rápida

- Para builds reproducibles en producción usa `eas build --platform android` (recomendado). Requiere configurar `eas.json` y credenciales.
- Alternativa local: abrir `android/` en Android Studio y construir un APK.

## Consideraciones técnicas importantes

- El modal de producto (`app/(tienda)/(Gondola)/suplir-productos.tsx`) tuvo problemas de comportamiento en builds Android nativos — especialmente con el manejo del teclado y la barra de navegación. Si vas a producir builds, revisa las secciones de UI/Keyboard y prueba en dispositivos reales.


