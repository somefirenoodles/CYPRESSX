const session = { authenticated: true, user: { id: 7, username: "ana", firstName: "Ana", lastName: "Prueba" } };
const dashboard = {
  balance: "2500.00",
  currency: "USD",
  accounts: [{ currency: "USD", balance: "2500.00" }],
  transactions: [],
  paymentRequests: [],
  users: [],
  transactionCount: 0,
};

describe("CypressX sandbox UI", () => {
  it("[CP-WEB-01] logs in and shows sandbox state without contacting a bank", () => {
    cy.intercept("GET", "/api/session", { statusCode: 200, body: { authenticated: false } });
    cy.intercept("POST", "/api/auth/login", { statusCode: 200, body: session }).as("login");
    cy.intercept("GET", "/api/dashboard", { statusCode: 200, body: dashboard });
    cy.visit("/");
    cy.get("input[autocomplete=username]").type("ana");
    cy.get("input[autocomplete=current-password]").type("password123");
    cy.contains("button", "Iniciar sesión").click();
    cy.wait("@login");
    cy.contains("h1", "Resumen").should("be.visible");
    cy.contains("Sandbox activo").should("be.visible");
    cy.contains("USD 2,500.00").should("be.visible");
  });

  it("[CP-WEB-02] requests a sandbox quote before posting an international P2P payment", () => {
    cy.intercept("GET", "/api/session", { statusCode: 200, body: session });
    cy.intercept("GET", "/api/dashboard", { statusCode: 200, body: dashboard });
    cy.intercept("POST", "/api/fx/quotes", {
      statusCode: 200,
      body: { quoteId: "f4e8b48e-bd2f-4b57-8355-4754ed5a4d4b", fromAmount: "10.00", fromCurrency: "USD", toAmount: "41000.00", toCurrency: "COP", rate: "4100.00000000", expiresAt: new Date(Date.now() + 600000).toISOString(), source: "tasa fija de demostración" },
    }).as("quote");
    cy.intercept("POST", "/api/payments", {
      statusCode: 201,
      body: { id: 104, status: "completed", message: "Operación completada en el sandbox; no se movió dinero real." },
    }).as("payment");
    cy.visit("/");
    cy.contains("button", "Enviar dinero").click();
    cy.get("input[type=number]").first().type("42");
    cy.get('input[inputmode="decimal"]').type("10.00");
    cy.get("select").eq(1).select("COP");
    cy.contains("button", "Revisar pago").click();
    cy.wait("@quote").its("request.body").should("include", { amount: "10.00", fromCurrency: "USD", toCurrency: "COP" });
    cy.contains("Confirma los importes").should("be.visible");
    cy.contains("button", "Confirmar pago").click();
    cy.wait("@payment").its("request.body").should("include", { recipientId: 42, currency: "USD", quoteId: "f4e8b48e-bd2f-4b57-8355-4754ed5a4d4b" });
  });
});
