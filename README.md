<p align="center">
  <!-- Se utilizan dos SVG para que el logotipo se muestre correctamente
    en GitHub. El resultado puede variar en otros visores de Markdown. -->
  <img alt="Logotipo de Cypress Real World App" src="./src/svgs/rwa-logo-light.svg#gh-dark-mode-only" />
  <img alt="Logotipo de Cypress Real World App" src="./src/svgs/rwa-logo.svg#gh-light-mode-only" />
</p>

<p align="center">
  <a href="https://cypress.io">
    <img width="140" alt="Logotipo de Cypress" src="./src/svgs/built-by-cypress.svg" />
    </a>
</p>

<p align="center">
   <a href="https://cloud.cypress.io/projects/7s5okt/runs">
    <img src="https://img.shields.io/endpoint?url=https://cloud.cypress.io/badge/detailed/7s5okt/develop&style=flat&logo=cypress" />
  </a>

  <a href="https://codecov.io/gh/cypress-io/cypress-realworld-app">
    <img src="https://codecov.io/gh/cypress-io/cypress-realworld-app/branch/develop/graph/badge.svg" />
  </a>

  <a href="https://percy.io/cypress-io/cypress-realworld-app">
    <img src="https://percy.io/static/images/percy-badge.svg" />
  </a>

   <a href="#colaboradores-">
    <img src="https://img.shields.io/badge/all_contributors-6-green.svg?style=flat" />
  </a>
</p>

<p align="center">
Aplicación de pagos que demuestra el uso de métodos, patrones y flujos de trabajo de pruebas con <a href="https://cypress.io">Cypress</a> en un entorno <strong>realista</strong>.
</p>

<p align="center">
  <img style='width: 70%' alt="Interfaz de Cypress Real World App" src="./public/img/rwa-readme-screenshot.png" />
</p>

> 💬 **Nota de los mantenedores**
>
> Esta aplicación se ofrece exclusivamente con fines educativos y demostrativos. Su estructura y configuración se asemejan a las de una aplicación real, pero no constituye un sistema de producción completo. Puede utilizarse para aprender, experimentar y practicar pruebas de aplicaciones con Cypress.
>
> ¡Felices pruebas!

Esta versión conserva el código del [proyecto original de Cypress](https://github.com/cypress-io/cypress-realworld-app) y adapta su documentación al español con fines académicos.

---

## Características

🛠 Construida con [React][reactjs], [XState][xstate], [Express][express], [lowdb][lowdb], [Material-UI][material-ui] y [TypeScript][typescript]
⚡️ Sin dependencias de un servidor de base de datos
🚀 Aplicación *full stack* [Express][express]/[React][reactjs] con funciones y pruebas realistas
👮‍♂️ Autenticación local
🔥 Inicialización de datos integrada con las pruebas de extremo a extremo
💻 CI/CD + [Cypress Cloud][cypresscloud]

## Primeros pasos

Cypress Real World App (RWA) es una aplicación *full stack* Express/React respaldada por una base de datos JSON local administrada con [lowdb].

La aplicación incluye [datos de ejemplo](./data/database.json) en `data/database.json`, con lo necesario para utilizarla y ejecutar las pruebas desde el primer momento.

> 🚩 **Nota**
>
> Es posible iniciar sesión con cualquiera de los [usuarios de ejemplo](./data/database.json#L2). La contraseña predeterminada para todos ellos es `s3cret`.
> Para consultar la lista de usuarios de desarrollo, ejecute `yarn list:dev:users`.

### Requisitos previos

Este proyecto requiere [Node.js](https://nodejs.org/en/). Consulte el archivo [.node-version](./.node-version) para conocer la versión exacta.

También se requiere [Yarn Classic](https://classic.yarnpkg.com/). Después de instalar [Node.js](https://nodejs.org/en/), ejecute el siguiente comando para instalar globalmente el módulo npm [yarn](https://www.npmjs.com/package/yarn), versión 1:

```shell
npm install yarn@1 -g
```

Si la función experimental [Corepack](https://nodejs.org/dist/latest/docs/api/corepack.html) de Node.js está habilitada, omita el comando `npm install yarn@1 -g`.
El proyecto RWA ya configura `Corepack` para utilizar Yarn Classic, versión 1.

#### Yarn moderno

**Este proyecto no es compatible con [Yarn moderno](https://yarnpkg.com/) (versión 2 o posterior).**

### Instalación

Para clonar el repositorio e instalar las dependencias, ejecute:

```shell
git clone https://github.com/somefirenoodles/CYPRESSX
cd cypress-realworld-app
yarn
```

#### En equipos Mac con procesadores de la serie M, agregue `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` al inicio del comando.

```shell
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true yarn install
```

### Ejecutar la aplicación

```shell
yarn dev
```

> 🚩 **Nota**
>
> De forma predeterminada, la aplicación utiliza el puerto `3000` para el *frontend* y el puerto `3001` para la API. Verifique que ningún otro servicio esté utilizando esos puertos.
> Para cambiar los puertos, modifique las variables `PORT` y `VITE_BACKEND_PORT` del archivo `.env`.
> No confirme en Git los cambios de puertos realizados en `.env`, porque los entornos de integración continua esperan los valores predeterminados.

### Iniciar Cypress

```shell
yarn cypress:open
```

> 🚩 **Nota**
>
> Si modifica los puertos predeterminados, también debe actualizar localmente el archivo `cypress.config.ts`.
> Las propiedades que requieren cambios son `e2e.baseUrl`, `expose.apiUrl` y `expose.codeCoverage.url`.
> El puerto de `e2e.baseUrl` corresponde a `PORT` en `.env`. Los puertos de `expose.apiUrl` y `expose.codeCoverage.url` corresponden a `VITE_BACKEND_PORT`.
> Por ejemplo, si establece `PORT` en `13000` y `VITE_BACKEND_PORT` en `13001`, `cypress.config.ts` debe contener una configuración similar a esta:
>
> ```js
> {
>   expose: {
>     apiUrl: "http://localhost:13001",
>     codeCoverage: {
>       url: "http://localhost:13001/__coverage__"
>     },
>   },
>   e2e: {
>     baseUrl: "http://localhost:13000"
>   }
> }
> ```
>
> No confirme en Git este cambio de `cypress.config.ts`, porque los entornos de integración continua esperan los puertos predeterminados.

## Casos de uso

El repositorio incluye una [especificación de ocho casos de uso](./CASOS_DE_USO.md), con actores, precondiciones, postcondiciones, flujos principales, alternativas y trazabilidad hacia las pruebas automatizadas.

## Pruebas

| Tipo      | Ubicación                                |
| --------- | ---------------------------------------- |
| API       | [cypress/tests/api](./cypress/tests/api) |
| Interfaz  | [cypress/tests/ui](./cypress/tests/ui)   |
| Componente | [src/(junto al componente)](./src)      |
| Unitaria  | [`src/__tests__`](./src/__tests__)       |

## Base de datos

- La base de datos JSON local está en [data/database.json](./data/database.json) y se administra con [lowdb].

- La base de datos se [reinicializa](./data/database-seed.json) cada vez que la aplicación se inicia mediante `yarn dev`. También se reinicializa entre las [pruebas de extremo a extremo de Cypress](./cypress/tests).

- Las actualizaciones realizadas desde el *frontend* React se envían al servidor [Express][express] y son procesadas por las [utilidades de base de datos](backend/database.ts).

- Para generar una base de datos nueva, ejecute `yarn db:seed`.

- El proyecto incluye una [semilla vacía](./data/empty-seed.json) y el comando `yarn start:empty` para ejecutar la aplicación sin datos.

## Comandos NPM adicionales

| Comando        | Descripción                                                                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| dev            | Inicia el *backend* en modo de observación y el *frontend*.                                                                                                                       |
| dev:coverage   | Inicia el *backend* en modo de observación y el *frontend* con instrumentación de cobertura.                                                                                      |
| dev:auth0      | Inicia el *backend* y el *frontend* con [autenticación Auth0](#auth0). [Consultar guía](http://on.cypress.io/auth0).                                                              |
| dev:okta       | Inicia el *backend* y el *frontend* con [autenticación Okta](#okta). [Consultar guía](http://on.cypress.io/okta).                                                                 |
| dev:cognito    | Inicia el *backend* y el *frontend* con [autenticación Cognito](#amazon-cognito). [Consultar guía](http://on.cypress.io/amazon-cognito).                                          |
| dev:google     | Inicia el *backend* y el *frontend* con [autenticación Google](#google). [Consultar guía](https://docs.cypress.io/guides/testing-strategies/google-authentication.html).           |
| start          | Inicia el *backend* y el *frontend*.                                                                                                                                              |
| types          | Valida los tipos.                                                                                                                                                                 |
| db:seed        | Genera nuevas semillas de base de datos para los archivos JSON de `/data`.                                                                                                        |
| start:empty    | Inicia el *backend*, el *frontend* y Cypress con una base de datos vacía.                                                                                                          |
| tsnode         | Comando `ts-node` personalizado para evitar las restricciones de `react-scripts`.                                                                                                 |
| list:dev:users | Muestra el identificador y el nombre de usuario de las cuentas de desarrollo.                                                                                                     |

Consulte [package.json](./package.json) para ver la lista completa de comandos.

## Informe de cobertura de código

Cypress Real World App utiliza el complemento [@cypress/code-coverage](https://github.com/cypress-io/code-coverage) para generar informes de cobertura del *frontend* y el *backend*.

Para generar el informe:

1. Inicie el servidor de desarrollo con cobertura mediante `yarn dev:coverage`.
2. Ejecute `yarn cypress:run --env coverage=true` y espere a que finalicen las pruebas.
3. Abra el informe generado en `coverage/index.html`.

## Proveedores de autenticación externos

La aplicación admite autenticación mediante proveedores externos para demostrar este tipo de inicio de sesión.

Cada proveedor posee un punto de entrada independiente. Para utilizarlo, reemplace el archivo **index.tsx** actual por el archivo correspondiente. Se admiten los siguientes proveedores:

- [Auth0](#auth0) (index.auth0.tsx)
- [Okta](#okta) (index.okta.tsx)
- [Amazon Cognito](#amazon-cognito) (index.cognito.tsx)
- [Google](#google) (index.google.tsx)

### Auth0

Las pruebas de [Auth0](https://auth0.com/) utilizan los comandos [`cy.session`](https://docs.cypress.io/api/commands/session) y [`cy.origin`](https://docs.cypress.io/api/commands/origin).

Se requiere una cuenta Auth0 y un *tenant* configurado para una aplicación de página única (SPA). Las variables de entorno de Auth0 deben declararse en [.env](./.env). Consulte la [configuración de una aplicación Auth0](http://on.cypress.io/auth0#Auth0-Application-Setup) y la [configuración de credenciales Auth0 en Cypress](http://on.cypress.io/auth0#Setting-Auth0-app-credentials-in-Cypress).

Para iniciar la aplicación con Auth0, reemplace **src/index.tsx** por **src/index.auth0.tsx**, ejecute `yarn dev:auth0` y abra Cypress mediante `yarn cypress:open`.

En esta configuración solo aprobará la [especificación de Auth0](./cypress/tests/ui-auth-providers/auth0.spec.ts); las demás fallarán. El usuario de prueba debe autorizar previamente la aplicación Auth0.

### Okta

La [guía de adaptación de RWA](http://on.cypress.io/okta) explica cómo utilizar [Okta][okta] y describe el comando de autenticación programática empleado en las pruebas de Cypress.

Se requiere una cuenta de [Okta][okta] y una [aplicación configurada como SPA][oktacreateapp]. Las variables de entorno de Okta deben declararse en [.env](./.env).

Para iniciar la aplicación con Okta, reemplace **src/index.tsx** por **src/index.okta.tsx**, ejecute `yarn dev:okta` y abra Cypress mediante `yarn cypress:open`.

En esta configuración **solo aprobará** la [especificación de Okta](./cypress/tests/ui-auth-providers/okta.spec.ts); las demás fallarán.

### Amazon Cognito

La [guía de adaptación de RWA](http://on.cypress.io/amazon-cognito) explica cómo utilizar [Amazon Cognito][cognito] como solución de autenticación y describe el comando programático empleado en las pruebas de Cypress.

Se requiere una cuenta de [Amazon Cognito][cognito]. La [CLI de AWS Amplify][awsamplify] proporciona las variables de entorno de Cognito.

- Se requiere un grupo de usuarios; esta configuración no utiliza grupos de identidades.
  - El grupo de usuarios debe tener configurado un dominio de interfaz alojada que:
    - admita `http://localhost:3000/` como URL de retorno y cierre de sesión;
    - admita el tipo de concesión implícita de OAuth;
    - admita los siguientes alcances de OpenID Connect:
      - aws.cognito.signin.user.admin
      - email
      - openid
  - El grupo debe tener configurado un cliente de aplicación con:
    - el flujo `ALLOW_USER_PASSWORD_AUTH` habilitado únicamente para la variante de inicio de sesión programático;
    - el flujo `ALLOW_USER_SRP_AUTH` para la variante basada en `cy.origin()`, que no requiere `ALLOW_USER_PASSWORD_AUTH`.
  - Debe existir un usuario que corresponda a las variables de entorno `AWS_COGNITO`, con estado de confirmación `Confirmed`. Si su estado es `Force Reset Password`, inicie sesión una vez en `http://localhost:3000` mientras se ejecuta `yarn dev:cognito` para restablecer la contraseña.

La configuración de las pruebas se distribuye entre los siguientes archivos:

- `.env` contiene `VITE_AUTH_TOKEN_NAME` y variables cuyo nombre comienza por `AWS_COGNITO`. No confirme secretos en Git.
- `scripts/mock-aws-exports.js` y `scripts/mock-aws-exports-es5.js` deben contener los mismos datos; solo difieren sus declaraciones de exportación. Pueden editarse manualmente o generarse mediante la CLI de Amplify.
- `cypress.config.ts` contiene `cognito_programmatic_login`, que controla la variante de la prueba.

Para iniciar la aplicación con Cognito, reemplace **src/index.tsx** por **src/index.cognito.tsx**, ejecute `yarn dev:cognito` y abra Cypress mediante `yarn cypress:open`. Puede ser necesario ejecutar `yarn dev` previamente.

En esta configuración **solo aprobará** la [especificación de Cognito](./cypress/tests/ui-auth-providers/cognito.spec.ts); las demás fallarán.

### Google

La [guía de adaptación de RWA](https://docs.cypress.io/guides/testing-strategies/google-authentication.html) explica cómo utilizar [Google][google] como solución de autenticación y describe el comando programático empleado en las pruebas de Cypress.

Se requiere una cuenta de [Google][google]. Las variables de entorno de Google deben declararse en [.env](./.env).

Para iniciar la aplicación con Google, reemplace **src/index.tsx** por **src/index.google.tsx**, ejecute `yarn dev:google` y abra Cypress mediante `yarn cypress:open`.

Al ejecutar `yarn dev:google`, **solo aprobará** la [especificación de Google](./cypress/tests/ui-auth-providers/google.spec.ts); las demás fallarán.

## Licencia

[![license](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/cypress-io/cypress/blob/master/LICENSE)

Este proyecto se distribuye conforme a los términos de la [licencia MIT](/LICENSE).

[reactjs]: https://reactjs.org
[xstate]: https://xstate.js.org
[express]: https://expressjs.com
[lowdb]: https://github.com/typicode/lowdb
[typescript]: https://typescriptlang.org
[cypresscloud]: https://cloud.cypress.io/projects/7s5okt/runs
[material-ui]: https://material-ui.com
[okta]: https://okta.com
[auth0]: https://auth0.com
[oktacreateapp]: https://developer.okta.com/docs/guides/sign-into-spa/react/create-okta-application/
[cognito]: https://aws.amazon.com/cognito
[awsamplify]: https://amplify.aws
[google]: https://google.com

## Colaboradores ✨

Agradecemos a las siguientes personas ([guía de emojis](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="http://www.kevinold.com"><img src="https://avatars0.githubusercontent.com/u/21967?v=4" width="100px;" alt=""/><br /><sub><b>Kevin Old</b></sub></a></td>
    <td align="center"><a href="https://twitter.com/amirrustam"><img src="https://avatars0.githubusercontent.com/u/334337?v=4" width="100px;" alt=""/><br /><sub><b>Amir Rustamzadeh</b></sub></a></td>
    <td align="center"><a href="https://twitter.com/be_mann"><img src="https://avatars2.githubusercontent.com/u/1268976?v=4" width="100px;" alt=""/><br /><sub><b>Brian Mann</b></sub></a></td>
    <td align="center"><a href="https://glebbahmutov.com/"><img src="https://avatars1.githubusercontent.com/u/2212006?v=4" width="100px;" alt=""/><br /><sub><b>Gleb Bahmutov</b></sub></a></td>
    <td align="center"><a href="http://www.bencodezen.io"><img src="https://avatars0.githubusercontent.com/u/4836334?v=4" width="100px;" alt=""/><br /><sub><b>Ben Hong</b></sub></a></td>
    <td align="center"><a href="https://github.com/davidkpiano"><img src="https://avatars2.githubusercontent.com/u/1093738?v=4" width="100px;" alt=""/><br /><sub><b>David Khourshid</b></sub></a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

Este proyecto sigue la especificación [all-contributors](https://github.com/all-contributors/all-contributors). Se aceptan contribuciones de cualquier tipo.
