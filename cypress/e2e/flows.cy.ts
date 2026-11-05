/// <reference types="cypress" />

// Pruebas de UI de flujos nuevos. Todas las respuestas de API se interceptan:
// estos casos NO acreditan integración real con el backend ni con la base de datos.

type SplitParticipant = {
  userId: number
  amount: string
  isOwner: boolean
}

type TransactionRow = {
  id: number
  kind: string
  description: string
  type: string
  status: string
  amount: string
  currency: string
  counterparty: string
  createdAt: string
}

const ALERT_SELECTOR =
  '[role="alert"], .alert, .alert-danger, .alert-error, [data-testid="alert"]'

const assertAlert = (message: string) => {
  cy.contains(ALERT_SELECTOR, message, { timeout: 10000 }).should('be.visible')
}

const dismissAlertIfPossible = () => {
  cy.get('body').then(($body) => {
    const close = $body.find(
      '[role="alert"] button, .alert button, [data-testid="alert"] button',
    )
    if (close.length > 0) {
      cy.wrap(close.first()).click()
    }
  })
}

describe('Flujos de UI con API interceptada', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/session', {
      statusCode: 200,
      body: {
        authenticated: true,
        user: {
          id: 7,
          username: 'ana',
          firstName: 'Ana',
          lastName: 'Prueba',
        },
      },
    }).as('session')

    cy.intercept('GET', '**/api/dashboard', {
      statusCode: 200,
      body: {
        balance: '2500.00',
        currency: 'USD',
        accounts: [{ currency: 'USD', balance: '2500.00' }],
        transactions: [],
        paymentRequests: [],
        users: [],
        transactionCount: 0,
      },
    }).as('dashboard')

    cy.visit('/')
    cy.wait(['@session', '@dashboard'])
  })

  it('[CP-WEB-03] previsualiza la división y reintenta con la misma idempotencyKey', () => {
    const participants: SplitParticipant[] = [
      { userId: 7, amount: '3.34', isOwner: true },
      { userId: 2, amount: '3.33', isOwner: false },
      { userId: 3, amount: '3.33', isOwner: false },
    ]

    cy.intercept('POST', /\/api\/splits\/preview$/, {
      statusCode: 200,
      body: { total: '10.00', currency: 'USD', participants },
    }).as('previewSplit')

    let createCalls = 0
    cy.intercept('POST', /\/api\/splits$/, (req) => {
      createCalls += 1
      if (createCalls === 1) {
        req.reply({ statusCode: 503, body: { message: 'Reintenta' } })
        return
      }
      req.reply({
        statusCode: 201,
        body: { id: 11, message: 'División creada' },
      })
    }).as('createSplit')

    cy.contains('button', 'Dividir gasto').click()

    cy.get('#split-title').type('Cena').should('have.value', 'Cena')
    cy.get('#split-total').type('10.00').should('have.value', '10.00')
    cy.get('#split-manual').type('2,3')
    cy.get('#split-manual').then(($el) => {
      const raw =
        typeof $el.val() === 'string' ? ($el.val() as string) : $el.text()
      expect(raw).to.contain('2,3')
    })

    cy.contains('button', 'Revisar reparto').click()

    cy.wait('@previewSplit').then(({ request, response }) => {
      const body = request.body as {
        total: unknown
        includeOwner: unknown
        participants: SplitParticipant[]
        participantIds: number[]
      }

      // total viaja como cadena y el dueño (userId 7) va incluido por defecto.
      expect(body.total).to.be.a('string')
      expect(body.total).to.eq('10.00')
      expect(body.includeOwner).to.eq(true)
      expect(body.participantIds).to.deep.eq([2, 3])
      const result = response?.body.participants as SplitParticipant[]
      expect(result.map((p) => p.userId)).to.deep.eq([7, 2, 3])
      expect(result.map((p) => p.amount)).to.deep.eq([
        '3.34',
        '3.33',
        '3.33',
      ])
      expect(result.filter((p) => p.isOwner)).to.have.length(1)
    })

    // Antes de confirmar no debe existir ningún POST de creación.
    cy.get('@createSplit.all').should('have.length', 0)

    // Previsualización renderizada con los importes calculados.
    cy.contains('3.34').should('be.visible')
    cy.contains('3.33').should('be.visible')
    cy.contains('button', 'Confirmar reparto').should('be.visible')

    // Primer intento: 503 y aviso de reintento.
    cy.contains('button', 'Confirmar reparto').click()
    assertAlert('Reintenta')
    dismissAlertIfPossible()

    // Reintento: 201, misma clave de idempotencia que el primer envío.
    cy.contains('button', 'Confirmar reparto').click()
    cy.contains('[role="status"]', 'División creada').should('be.visible')

    cy.get('@createSplit.all')
      .should('have.length', 2)
      .then((interceptions) => {
        const first = interceptions[0].request.body as {
          idempotencyKey?: unknown
        }
        const second = interceptions[1].request.body as {
          idempotencyKey?: unknown
        }

        expect(first.idempotencyKey).to.be.a('string')
        expect(first.idempotencyKey).to.not.eq('')
        expect(second.idempotencyKey).to.eq(first.idempotencyKey)
      })
  })

  it('[CP-WEB-04] filtra, pagina y abre el detalle de una transacción', () => {
    const firstPageTransaction: TransactionRow = {
      id: 1,
      kind: 'operation',
      description: 'Primer pago',
      type: 'sent',
      status: 'completed',
      amount: '1.00',
      currency: 'USD',
      counterparty: 'Luis',
      createdAt: '2026-11-04T12:00:00Z',
    }

    const secondPageTransaction: TransactionRow = {
      id: 2,
      kind: 'operation',
      description: 'Segundo pago',
      type: 'sent',
      status: 'completed',
      amount: '1.00',
      currency: 'USD',
      counterparty: 'Luis',
      createdAt: '2026-11-04T13:00:00Z',
    }

    const listQueries: Array<Record<string, unknown>> = []

    cy.intercept('GET', /\/api\/transactions(\?.*)?$/, (req) => {
      listQueries.push({ ...req.query })

      if (req.query.cursor) {
        req.reply({
          statusCode: 200,
          body: { transactions: [secondPageTransaction], nextCursor: null },
        })
        return
      }

      req.reply({
        statusCode: 200,
        body: { transactions: [firstPageTransaction], nextCursor: 'cursor-demo' },
      })
    }).as('transactions')

    cy.intercept('GET', /\/api\/transactions\/1(\?.*)?$/, {
      statusCode: 200,
      body: { transaction: firstPageTransaction },
    }).as('transactionDetail')

    cy.contains('button', 'Actividad').click()

    // Primera página: una sola fila y cursor disponible.
    cy.wait('@transactions').then(({ request }) => {
      expect(request.query.cursor).to.be.undefined
    })
    cy.get('table tbody tr')
      .should('have.length', 1)
      .and('contain.text', 'Primer pago')

    cy.contains('button', 'Cargar más').click()

    cy.get('@transactions.all')
      .should('have.length', 2)
      .then((interceptions) => {
        expect(interceptions[1].request.query.cursor).to.eq('cursor-demo')
      })

    // Dos filas: la nueva y la anterior, sin duplicar el id 1.
    cy.get('table tbody tr').should('have.length', 2)
    cy.get('table tbody tr').filter(':contains("Primer pago")').should('have.length', 1)
    cy.get('table tbody tr')
      .last()
      .should('contain.text', 'Segundo pago')

    // Detalle de la primera fila.
    cy.get('table tbody tr')
      .first()
      .within(() => {
        cy.contains('button', 'Ver detalle').click()
      })

    cy.wait('@transactionDetail').then(({ request, response }) => {
      expect(request.query.kind).to.eq('operation')
      expect(response?.body?.transaction?.id).to.eq(1)
    })

    // Filtro por estado: vuelve a la primera página y envía status.
    cy.get('#history-status').select('completed')

    cy.get('@transactions.all')
      .should('have.length', 3)
      .then((interceptions) => {
        const filtered = interceptions[2].request
        expect(filtered.query.status).to.eq('completed')
        expect(filtered.query.cursor).to.be.undefined
      })

    cy.then(() => { expect(listQueries.length).to.be.at.least(2) })
  })

  it('[CP-WEB-05] muestra el error de alta de banco y la bandeja de notificaciones vacía', () => {
    cy.intercept('GET', /\/api\/contacts$/, {
      statusCode: 200,
      body: { contacts: [] },
    }).as('contacts')

    cy.intercept('GET', /\/api\/bank-accounts$/, {
      statusCode: 200,
      body: { accounts: [] },
    }).as('bankAccounts')

    cy.intercept('GET', /\/api\/notifications$/, {
      statusCode: 200,
      body: { notifications: [], unreadCount: 0 },
    }).as('notifications')

    cy.intercept('POST', /\/api\/bank-accounts$/, {
      statusCode: 400,
      body: { message: 'Datos inválidos' },
    }).as('createBankAccount')

    cy.contains('button', 'Cuenta y notificaciones').click()

    // Alta de banco con datos válidos en el formulario, rechazada por la API.
    cy.contains('button', 'Bancos').click()

    cy.get('#at-bank-name').clear().type('Banco demo')
    cy.get('#at-bank-account').clear().type('TEST-12345678')
    cy.get('#at-bank-routing').clear().type('123456789')

    cy.get('#at-panel-banks form button[type="submit"]').click()

    cy.wait('@createBankAccount').then(({ request }) => {
      const payload = JSON.stringify(request.body ?? {})
      expect(payload).to.contain('Banco demo')
      expect(payload).to.contain('TEST-12345678')
      expect(payload).to.contain('123456789')
    })

    assertAlert('Datos inválidos')

    // La bandeja de notificaciones llega vacía: no se pinta ningún elemento.
    cy.wait('@notifications').its('response.body.notifications').should('have.length', 0)

    cy.contains('button', 'Notificaciones').click()
    cy.get('#at-panel-notifications').should('contain.text', 'No')
    cy.get('body').then(($body) => {
      const items = $body.find(
        '[data-testid="notification-item"], .notification-item, #at-panel-notifications li, #at-notifications li',
      )
      expect(items.length).to.eq(0)
    })
  })
})
