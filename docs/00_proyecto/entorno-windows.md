# Entorno oficial: Windows nativo

## Objetivo

Definir una configuración reproducible para instalar, ejecutar y probar Superpay sin depender de WSL, Bash o un contenedor.

## Requisitos

- Windows 10 u 11 de 64 bits.
- PowerShell 5.1 o PowerShell 7+.
- Git para Windows.
- Node.js según `.node-version`.
- Yarn Classic 1.22.22.

## Instalación

```powershell
git clone https://github.com/somefirenoodles/CYPRESSX.git
cd CYPRESSX
git checkout develop
npm install -g yarn@1.22.22
yarn install
```

## Ejecución local

```powershell
yarn dev
```

Valores predeterminados:

- Frontend: `http://localhost:3000`
- API: `http://localhost:3001`

## Preparación de datos

```powershell
yarn db:seed:dev
```

La base activa está en `data/database.json`. La semilla reproducible está en `data/database-seed.json`.

## Pruebas

Interfaz de Cypress:

```powershell
yarn cypress:open
```

Ejecución headless:

```powershell
yarn cypress:run
```

Pruebas unitarias:

```powershell
yarn test:unit:ci
```

Validación de tipos:

```powershell
yarn types
```

Build:

```powershell
yarn build
```

## Incompatibilidades heredadas identificadas

La línea base heredada contiene scripts escritos para shell Unix. En particular:

- `list:dev:users` utiliza `cat` y pipes de shell.
- `build:aws-exports-es5` utiliza `mv`.

Estos comandos no forman parte del camino mínimo para ejecutar `yarn dev`, pero deben sustituirse por implementaciones multiplataforma antes de considerar completada la preparación técnica P0.

Mientras se realiza esa sustitución, no deben usarse como evidencia de compatibilidad con Windows.

## Criterios de salida de P0

La preparación técnica se considera aprobada cuando, desde un clon limpio en Windows nativo, se pueda demostrar:

1. instalación de dependencias sin intervención manual no documentada;
2. `yarn types` exitoso;
3. `yarn build` exitoso;
4. `yarn dev` operativo en los puertos documentados;
5. ejecución local de pruebas sin requerir Cypress Cloud o Percy;
6. scripts necesarios compatibles con PowerShell/cmd;
7. dependencias importadas declaradas directamente;
8. ausencia de workflows operativos heredados que modifiquen repositorios externos;
9. referencias operativas del repositorio apuntando a Superpay/CYPRESSX;
10. licencia y atribución original preservadas.

## Evidencia requerida

Cada comprobación debe registrar como mínimo:

- commit evaluado;
- versión de Windows;
- versión de Node;
- versión de Yarn;
- comando ejecutado;
- código de salida;
- fecha de ejecución;
- archivo o captura de evidencia cuando corresponda.
