const replacements: readonly [string, string][] = [
  ["Pago sandbox completado", "Pago completado"],
  ["Pago sandbox recibido", "Pago recibido"],
  ["Pago sandbox", "Pago"],
  ["Solicitud sandbox", "Solicitud de pago"],
  ["Recarga sandbox", "Recarga de saldo"],
  ["Recepción externa simulada", "Recepción externa"],
  ["Recepción simulada; no se movió dinero real.", "Recepción registrada correctamente."],
  ["Fondos ficticios añadidos al sandbox; no se movió dinero real.", "Recarga completada."],
  ["Operación completada en el sandbox; no se movió dinero real.", "Operación completada."],
  ["Recarga de fondos ficticios", "Recarga de saldo"],
  ["Fondos iniciales de demostración", "Saldo inicial"],
  ["Fondos ficticios añadidos", "Fondos añadidos"],
  [" ficticios añadidos.", " añadidos."],
  [" Fondos ficticios.", ""],
  [" No se movió dinero real.", ""],
  ["Operación completada en el sandbox;", "Operación completada"],
  [" en el sandbox", ""],
  ["Saldo sandbox insuficiente", "Saldo insuficiente"],
];

export function sanitizeUserVisibleCopy(value: string): string {
  let result = value;
  for (const [before, after] of replacements) result = result.replaceAll(before, after);
  return result.replace(/\s+([.,;])/g, "$1").replace(/\s{2,}/g, " ").trim();
}
