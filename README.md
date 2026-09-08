# AASP

Aplicación académica de pagos utilizada como objeto de estudio para prácticas de **pruebas de software, mantenimiento y aseguramiento de la calidad**.

AASP parte del código abierto de Cypress Real World App y conserva la licencia y atribución correspondientes. Cypress continúa utilizándose como herramienta de pruebas; **RWA ya no constituye la identidad del proyecto académico**.

## Entorno oficial

- Windows nativo.
- PowerShell.
- Node.js 22.20.x.
- Yarn Classic 1.22.22.
- Frontend: `http://localhost:3000`.
- Backend: `http://localhost:3001`.

## Instalación

```powershell
git clone https://github.com/somefirenoodles/CYPRESSX.git
cd CYPRESSX
yarn install --frozen-lockfile
yarn dev
```

Para consultar los usuarios de desarrollo:

```powershell
yarn list:dev:users
```

La contraseña predeterminada de los usuarios de prueba es `s3cret`.

## Verificación

```powershell
yarn types
yarn test:unit:ci
yarn build
```

Para abrir Cypress:

```powershell
yarn cypress:open
```

## Documentación académica

La documentación versionada se encuentra en `docs/`.

Primera capa disponible:

- `docs/00_proyecto/README.md`: alcance y línea base.
- `docs/00_proyecto/entorno-windows.md`: procedimiento reproducible en Windows.
- `docs/01_requisitos/requisitos-transacciones.md`: requisitos del núcleo transaccional.
- `docs/01_requisitos/reglas-negocio-transacciones.md`: reglas de pagos y solicitudes.
- `docs/01_requisitos/casos-uso-transacciones.md`: casos de uso iniciales.
- `docs/03_mantenimiento/defectos-reservados.md`: defectos seleccionados para pruebas y mantenimiento.

## Alcance funcional inicial

La primera línea base documental cubre:

1. Envío de pagos.
2. Solicitudes de pago.
3. Resolución de solicitudes.
4. Actualización de saldos.
5. Notificaciones asociadas.

Los demás módulos se incorporarán por capas documentales posteriores.

## Defectos reservados

Algunos comportamientos incorrectos se mantienen deliberadamente para permitir ejercicios de reproducción, diseño de pruebas y mantenimiento correctivo. No deben corregirse sin una tarea explícita y evidencia reproducible. Consulte `docs/03_mantenimiento/defectos-reservados.md`.

## Atribución

AASP deriva de [Cypress Real World App](https://github.com/cypress-io/cypress-realworld-app), distribuido bajo licencia MIT. El archivo `LICENSE` conserva la información de licencia aplicable.
