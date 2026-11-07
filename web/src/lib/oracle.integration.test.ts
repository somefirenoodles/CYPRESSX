import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../../backend/app";
import { withConnection } from "../../../backend/db/oracle";
import { processDueRecurrences } from "../../../backend/domain/recurrence-worker";

describe.skipIf(!process.env.DB_CONNECT_STRING)("Oracle-backed sandbox API", () => {
  it("registers users and enforces atomic sandbox payment, request, FX, split and merchant flows", async () => {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
    const payer = request.agent(app);
    const recipient = request.agent(app);
    const register = async (agent: typeof payer, username: string) => {
      const response = await agent.post("/api/auth/register").send({
        username,
        email: `${username}@example.test`,
        password: "sandbox-pass-123",
        confirmPassword: "sandbox-pass-123",
        firstName: username,
        lastName: "Test",
      }).expect(201);
      expect(response.body.user.id).toBeGreaterThan(0);
      return response.body.user.id as number;
    };

    const payerId = await register(payer, `payer${suffix}`);
    const recipientId = await register(recipient, `recipient${suffix}`);
    const balance = async (agent: typeof payer, currency: string) => {
      const response = await agent.get("/api/dashboard").expect(200);
      return response.body.accounts.find((account: { currency: string }) => account.currency === currency)?.balance ?? "0.00";
    };
    expect(await balance(payer, "USD")).toBe("2500.00");

    const paymentBody = { recipientId, amount: "20.00", currency: "USD", idempotencyKey: `payment-${suffix}` };
    const payment = await payer.post("/api/payments").send(paymentBody).expect(201);
    expect(payment.body.status).toBe("completed");
    const retry = await payer.post("/api/payments").send(paymentBody).expect(201);
    expect(retry.body.id).toBe(payment.body.id);
    expect(await balance(payer, "USD")).toBe("2480.00");
    expect(await balance(recipient, "USD")).toBe("2520.00");

    const rejected = await recipient.post("/api/payment-requests").send({ recipientId: payerId, amount: "5.00", currency: "USD", note: "No cobrar", idempotencyKey: `request-reject-${suffix}` }).expect(201);
    await payer.post(`/api/payment-requests/${rejected.body.id}/resolve`).send({ action: "reject" }).expect(200);
    expect(await balance(payer, "USD")).toBe("2480.00");
    expect(await balance(recipient, "USD")).toBe("2520.00");

    const accepted = await payer.post("/api/payment-requests").send({ recipientId, amount: "7.00", currency: "USD", note: "Pago compartido", idempotencyKey: `request-accept-${suffix}` }).expect(201);
    await recipient.post(`/api/payment-requests/${accepted.body.id}/resolve`).send({ action: "accept" }).expect(200);
    expect(await balance(payer, "USD")).toBe("2487.00");
    expect(await balance(recipient, "USD")).toBe("2513.00");

    const quote = await payer.post("/api/fx/quotes").send({ amount: "1.00", fromCurrency: "USD", toCurrency: "COP" }).expect(200);
    expect(quote.body.toAmount).toBe("4100.00");
    await payer.post("/api/payments").send({
      recipientId,
      amount: "1.00",
      currency: "USD",
      quoteId: quote.body.quoteId,
      idempotencyKey: `fx-${suffix}`,
    }).expect(201);
    expect(await balance(recipient, "COP")).toBe("4100.00");

    const split = await payer.post("/api/splits").send({ title: "Cena", total: "10.01", currency: "USD", participantIds: [recipientId], idempotencyKey: `split-${suffix}` }).expect(201);
    expect(split.body.participantCount).toBe(1);
    const requestList = await recipient.get("/api/dashboard").expect(200);
    const splitRequest = requestList.body.paymentRequests.find((item: { note: string }) => item.note === "División: Cena");
    expect(splitRequest.amount).toBe("10.01");
    await recipient.post(`/api/payment-requests/${splitRequest.id}/resolve`).send({ action: "accept" }).expect(200);

    const merchants = await payer.get("/api/merchants").expect(200);
    const domesticMerchant = merchants.body.merchants.find((item: { currency: string }) => item.currency === "USD");
    await payer.post("/api/merchant-payments").send({
      merchantId: domesticMerchant.id,
      amount: "3.25",
      currency: "USD",
      idempotencyKey: `merchant-${suffix}`,
    }).expect(201);

    const recurring = await payer.post("/api/recurrences").send({ recipientId, amount: "2.50", currency: "USD", frequency: "monthly", consent: true, idempotencyKey: `recurring-${suffix}` }).expect(201);
    await withConnection(async (connection) => {
      await connection.execute("UPDATE cx_recurrences SET next_run_at = SYSTIMESTAMP - INTERVAL '1' MINUTE WHERE id = :id", { id: recurring.body.recurrence.id });
      await connection.commit();
    });
    await processDueRecurrences();
    expect(await balance(payer, "USD")).toBe("2490.26");
    expect(await balance(recipient, "USD")).toBe("2505.49");
    await payer.patch(`/api/recurrences/${recurring.body.recurrence.id}`).send({ status: "paused" }).expect(200);

    const insufficient = await payer.post("/api/recurrences").send({ recipientId, amount: "999999.00", currency: "USD", frequency: "weekly", consent: true, idempotencyKey: `insufficient-${suffix}` }).expect(201);
    await withConnection(async (connection) => {
      await connection.execute("UPDATE cx_recurrences SET next_run_at = SYSTIMESTAMP - INTERVAL '1' MINUTE WHERE id = :id", { id: insufficient.body.recurrence.id });
      await connection.commit();
    });
    await processDueRecurrences();
    const schedules = await payer.get("/api/recurrences").expect(200);
    expect(schedules.body.recurrences.find((item: { id: number }) => item.id === insufficient.body.recurrence.id)).toMatchObject({ lastRunStatus: "failed", lastError: "Saldo insuficiente." });
    expect(await balance(payer, "USD")).toBe("2490.26");
  }, 30000);
});
