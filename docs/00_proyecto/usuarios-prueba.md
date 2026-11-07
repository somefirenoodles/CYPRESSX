# Datos de prueba: usuarios

**ID:** DP-USR-01  
**Propósito:** disponer de dos cuentas locales para verificar inicio de sesión, consulta de usuarios y operaciones P2P entre titulares distintos.

## Cuentas

| Usuario | Nombre | Correo | Contraseña local de prueba | Saldo USD al crear la cuenta |
|---|---|---|---|---:|
| `ana.prueba` | Ana Prueba | `ana.prueba@example.test` | `PruebaLocal-2026-A` | USD 2,500.00 |
| `bruno.prueba` | Bruno Prueba | `bruno.prueba@example.test` | `PruebaLocal-2026-B` | USD 2,500.00 |

Estas cuentas y contraseñas se reservan para desarrollo y pruebas locales; no deben reutilizarse fuera de ese entorno. La aplicación procesa las contraseñas con bcrypt y Oracle almacena el hash.

## Preparación en la aplicación

1. Asegúrate de que Oracle esté iniciado y que el esquema ya se haya preparado con `pnpm db:setup`.
2. Abre `http://localhost:3000` y registra cada cuenta con los datos de la tabla. La aplicación crea automáticamente una cuenta USD y el movimiento de saldo inicial de USD 2,500.00.
3. Cierra sesión e inicia con cada usuario para verificar ambas cuentas.
4. Desde Ana, realiza un P2P a Bruno; luego inicia sesión como Bruno y verifica el abono.

El registro se hace desde la API para que la contraseña se convierta en hash y se creen correctamente la cuenta, el movimiento inicial y el asiento correspondiente. No insertar contraseñas directamente en `cx_users`.

## Estado de carga

`pnpm db:seed` carga comercios iniciales, pero **no crea usuarios**. Por tanto, las cuentas de esta ficha se registran manualmente siguiendo el procedimiento anterior; todavía no existe un seed automático de usuarios de prueba.

La carga futura de estos mismos usuarios a Oracle debe ser idempotente y reutilizar el mismo mecanismo de hash y creación de cuenta/saldo que el registro. Debe evitar duplicar el saldo inicial cuando se vuelva a ejecutar. Esta ficha documenta los datos y el procedimiento manual, no afirma que estén cargados en la base actual.

## Limpieza

Para reiniciar el entorno de prueba, usa una base local desechable y el procedimiento de reinicialización documentado por el proyecto. No borres usuarios de una base compartida: operaciones, solicitudes y asientos pueden referenciarlos.
