/** Arrondissement d'un code postal de Paris, Lyon ou Marseille (« 8e arrondissement »), sinon null. */
export function arrondissement(code: string): string | null {
  const arr = (n: number) => (n === 1 ? "1er" : `${n}e`) + " arrondissement";
  if (code === "75116") return arr(16);
  if (/^750\d\d$/.test(code) && Number(code.slice(3)) >= 1 && Number(code.slice(3)) <= 20) return arr(Number(code.slice(3)));
  if (/^6900[1-9]$/.test(code)) return arr(Number(code.slice(4)));
  if (/^130(0[1-9]|1[0-6])$/.test(code)) return arr(Number(code.slice(3)));
  return null;
}

/** « 8e arrondissement (75008) » pour Paris, Lyon et Marseille ; sinon le code postal seul. */
export function postalLabel(code: string) {
  const a = arrondissement(code);
  return a ? `${a} (${code})` : code;
}
