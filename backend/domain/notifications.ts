import oracledb from "oracledb";

export type NotifyInput = {
  userId: number;
  eventKey: string;
  title: string;
  message: string;
  referenceType?: string | null;
  referenceId?: number | null;
};

/**
 * Inserta una notificación idempotente por usuario y clave de evento.
 * No abre ni confirma transacciones: debe invocarse dentro de withTransaction.
 * Si la clave ya existe para el mismo destinatario (ORA-00001), se ignora de
 * forma controlada y se devuelve false.
 */
export async function notify(connection: oracledb.Connection, input: NotifyInput): Promise<boolean> {
  const eventKey = input.eventKey.trim().slice(0, 80);
  if (!eventKey) throw new Error("La notificación requiere una clave de evento.");

  try {
    await connection.execute(
      `INSERT INTO cx_notifications(recipient_id, event_key, title, message, reference_type, reference_id)
       VALUES (:userId, :eventKey, :title, :message, :referenceType, :referenceId)`,
      {
        userId: input.userId,
        eventKey,
        title: input.title.slice(0, 120),
        message: input.message.slice(0, 500),
        referenceType: input.referenceType?.slice(0, 32) ?? null,
        referenceId: input.referenceId ?? null,
      }
    );
    return true;
  } catch (error) {
    if ((error as { errorNum?: number }).errorNum === 1) return false;
    throw error;
  }
}
