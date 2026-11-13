/** Départements français (code officiel → nom), pour les pages locales des annuaires. */
export const DEPARTEMENTS: Record<string, string> = {
  "01": "Ain", "02": "Aisne", "03": "Allier", "04": "Alpes-de-Haute-Provence", "05": "Hautes-Alpes", "06": "Alpes-Maritimes",
  "07": "Ardèche", "08": "Ardennes", "09": "Ariège", "10": "Aube", "11": "Aude", "12": "Aveyron", "13": "Bouches-du-Rhône",
  "14": "Calvados", "15": "Cantal", "16": "Charente", "17": "Charente-Maritime", "18": "Cher", "19": "Corrèze", "2A": "Corse-du-Sud",
  "2B": "Haute-Corse", "21": "Côte-d'Or", "22": "Côtes-d'Armor", "23": "Creuse", "24": "Dordogne", "25": "Doubs", "26": "Drôme",
  "27": "Eure", "28": "Eure-et-Loir", "29": "Finistère", "30": "Gard", "31": "Haute-Garonne", "32": "Gers", "33": "Gironde",
  "34": "Hérault", "35": "Ille-et-Vilaine", "36": "Indre", "37": "Indre-et-Loire", "38": "Isère", "39": "Jura", "40": "Landes",
  "41": "Loir-et-Cher", "42": "Loire", "43": "Haute-Loire", "44": "Loire-Atlantique", "45": "Loiret", "46": "Lot", "47": "Lot-et-Garonne",
  "48": "Lozère", "49": "Maine-et-Loire", "50": "Manche", "51": "Marne", "52": "Haute-Marne", "53": "Mayenne", "54": "Meurthe-et-Moselle",
  "55": "Meuse", "56": "Morbihan", "57": "Moselle", "58": "Nièvre", "59": "Nord", "60": "Oise", "61": "Orne", "62": "Pas-de-Calais",
  "63": "Puy-de-Dôme", "64": "Pyrénées-Atlantiques", "65": "Hautes-Pyrénées", "66": "Pyrénées-Orientales", "67": "Bas-Rhin",
  "68": "Haut-Rhin", "69": "Rhône", "70": "Haute-Saône", "71": "Saône-et-Loire", "72": "Sarthe", "73": "Savoie", "74": "Haute-Savoie",
  "75": "Paris", "76": "Seine-Maritime", "77": "Seine-et-Marne", "78": "Yvelines", "79": "Deux-Sèvres", "80": "Somme", "81": "Tarn",
  "82": "Tarn-et-Garonne", "83": "Var", "84": "Vaucluse", "85": "Vendée", "86": "Vienne", "87": "Haute-Vienne", "88": "Vosges",
  "89": "Yonne", "90": "Territoire de Belfort", "91": "Essonne", "92": "Hauts-de-Seine", "93": "Seine-Saint-Denis", "94": "Val-de-Marne",
  "95": "Val-d'Oise", "971": "Guadeloupe", "972": "Martinique", "973": "Guyane", "974": "La Réunion", "976": "Mayotte",
};

/** « dans le Rhône », « à Paris », « en Haute-Garonne »… : formulation simple et sûre (« dans le département X »). */
export const depLabel = (code: string) => (DEPARTEMENTS[code] ? `${DEPARTEMENTS[code]} (${code})` : code);

/** Nombre minimal de fiches publiées pour qu'une page locale d'annuaire soit indexable (contenu suffisant). */
export const MIN_INDEXABLE = 3;

/** Au-delà de cette part des fiches dans une seule ville, la page département répète la page ville (ex. Paris = 75). */
export const DOMINANT_CITY_SHARE = 0.8;

/**
 * Évite le contenu dupliqué entre une page département et la page de sa ville principale.
 * La page département n'est indexable que si elle apporte autre chose : au moins 2 villes indexables
 * et aucune ville ne concentre plus de 80 % de ses fiches. Sinon, elle renvoie (canonical) vers la ville principale.
 */
export function departmentIndexing(locations: { city_slug: string | null; department: string | null; providers: number }[], dep: string) {
  const inDep = locations.filter((l) => l.department === dep && l.city_slug);
  const total = inDep.reduce((n, l) => n + l.providers, 0);
  const main = [...inDep].sort((a, b) => b.providers - a.providers)[0];
  const indexableCities = inDep.filter((l) => l.providers >= MIN_INDEXABLE).length;
  const share = main && total ? main.providers / total : 1;
  const indexable = total >= MIN_INDEXABLE && indexableCities >= 2 && share < DOMINANT_CITY_SHARE;
  return { indexable, total, mainCity: main?.city_slug ?? null, mainCityIndexable: (main?.providers ?? 0) >= MIN_INDEXABLE, share };
}
