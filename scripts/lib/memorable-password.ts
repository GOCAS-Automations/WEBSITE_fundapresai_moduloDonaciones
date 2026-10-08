/**
 * Contraseña FÁCIL de escribir en un celular, pero segura: tres palabras
 * comunes en español, sin tildes ni eñes, separadas por guiones, y dos
 * dígitos al final. Ejemplo del formato: «palabra-palabra-palabra-42».
 *
 * Seguridad: con ~670 palabras y 90 números (10–99) son ~35 bits al azar
 * (crypto.getRandomValues, sin sesgo). Supabase Auth limita los intentos de
 * entrada por IP y guarda la contraseña con bcrypt, así que adivinarla por
 * fuerza bruta no es práctico; para más seguridad, la persona puede cambiarla
 * en «Mi cuenta». Cumple las reglas del panel (10+ caracteres, letras y números).
 */
import { newPasswordSchema } from "../../lib/admin/password";

const WORDS_TEXT = `
perro gato vaca toro caballo burro oveja cabra cerdo conejo pato gallo gallina pollo loro paloma tigre oso lobo
zorro ciervo venado mono jirafa cebra camello ballena tortuga rana sapo pulpo cangrejo abeja hormiga mariposa
grillo caracol ardilla castor foca gaviota puma jaguar alce koala panda nutria erizo gacela llama alpaca pavo
canario gorila iguana lagarto morsa oruga pantera sardina trucha
manzana pera uva banano mango fresa cereza naranja papaya guayaba mora coco kiwi durazno ciruela tomate papa
yuca arroz frijol lenteja pan queso leche huevo miel sopa arepa tamal empanada galleta torta flan chocolate sal
aceite harina yogur avena cebolla ajo zanahoria lechuga pepino pimiento calabaza mazorca
lulo pitaya granadilla mandarina toronja almendra nuez avellana canela vainilla menta perejil cilantro
sol luna estrella cielo nube lluvia viento nieve rayo trueno monte colina valle lago mar playa arena piedra roca
tierra campo bosque selva prado pradera isla costa ola cascada fuente laguna desierto cueva hoja rama tronco
semilla flor rosa clavel girasol lirio margarita palma pino roble cedro sauce helecho musgo hierba trigo cebada
brisa niebla granizo marea arroyo charco orilla pantano llanura meseta sendero vereda cumbre
casa puerta ventana techo pared piso mesa silla cama espejo reloj radio libro cuaderno papel tijera regla
carpeta mochila maleta caja bolsa canasta taza plato vaso cuchara tenedor cuchillo olla horno nevera escoba
toalla peine cepillo vela llave candado cortina alfombra almohada cobija manta banco balde botella frasco
jarra tetera bandeja mantel servilleta florero cuadro marco estante gaveta perchero sombrilla paraguas
camisa falda vestido zapato bota sombrero gorra bufanda guante abrigo chaqueta media pijama corbata bolso
anillo collar pulsera arete bolsillo poncho ruana sandalia chancla delantal overol
rojo azul verde amarillo blanco negro gris morado rosado dorado plateado celeste lila violeta turquesa
guitarra piano flauta tambor arpa trompeta canto baile pintura dibujo color pincel lienzo poema cuento novela
teatro cine foto maraca tiple bandola cumbia bambuco pasillo vals tango salsa merengue bolero ronda copla
ciudad pueblo barrio calle plaza parque iglesia escuela colegio tienda mercado puente camino torre castillo
museo granja finca huerta patio terraza cocina sala comedor bodega taller oficina estadio cancha piscina
biblioteca hospital teatro capilla molino establo corral ermita
carro bus tren barco bicicleta moto taxi metro cohete globo velero canoa lancha balsa patineta triciclo
lunes martes jueves viernes domingo enero febrero marzo abril mayo junio julio agosto octubre noviembre
diciembre tarde noche aurora alba siesta verano invierno primavera semana fecha hora minuto segundo
alegre feliz bonito grande fuerte suave dulce sereno tranquilo amable noble claro limpio fresco tibio
brillante sencillo humilde valiente sabio sano nuevo lindo puro firme leal fiel atento cordial gentil
generoso sincero paciente honesto contento animado curioso juicioso prudente
mano brazo pierna rodilla codo hombro cabeza cara ojo nariz boca oreja diente dedo pelo frente mejilla
amigo abuelo abuela nieto vecino maestro alumno doctor bombero cartero pintor panadero cocinero jardinero
piloto marinero granjero pastor viajero poeta artista escritor lector vecina amiga maestra
pelota cometa trompo juguete regalo tesoro mapa faro ancla barca remo red cuerda nudo rueda motor tambo
cofre corona espada escudo bandera medalla trofeo diploma carta sobre sello moneda billete tarjeta boleto
paz amor esperanza bondad verdad gracia calma fuerza suerte salud vida luz alma idea deseo meta logro
abrazo sonrisa risa saludo visita fiesta paseo viaje juego canto cuento charla receta postre almuerzo cena
desayuno merienda bocado refresco jugo limonada agua hielo vapor humo fuego chispa llama brasa
madera hierro cobre plata oro bronce vidrio barro arcilla ladrillo cemento cal yeso tiza lana seda
hilo aguja botones tela cinta lazo nudo encaje bordado tejido manga cuello solapa
norte sur este oeste centro borde lado punta base cima fondo arriba abajo cerca lejos dentro fuera
uno dos tres cuatro cinco seis siete ocho nueve diez once doce veinte treinta cien mil
lapicero borrador sacapuntas pegante cartulina pupitre tablero recreo tarea examen clase curso grado nota
semestre lectura escritura suma resta letra palabra frase portada
fruta verdura carne pescado pollo salchicha arepa pandebono natilla arequipe panela
tinto chicha masato avena colada mazamorra sancocho ajiaco tamal lechona changua calentado
caminar correr saltar nadar cantar bailar pintar leer escribir jugar
`;

/** Lista sin repetidos y solo con letras a–z (ni tildes ni eñes). */
export const WORDS: readonly string[] = [...new Set(WORDS_TEXT.split(/\s+/).filter((w) => /^[a-z]{3,10}$/.test(w)))];

/** Índice uniforme en [0, n) sin sesgo de módulo (muestreo por rechazo). */
function randomIndex(n: number): number {
  const limit = Math.floor(0x1_0000_0000 / n) * n;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % n;
  }
}

/** Bits de entropía del formato (para documentarlo, nunca la contraseña). */
export function memorableEntropyBits(): number {
  return 3 * Math.log2(WORDS.length) + Math.log2(90);
}

/** «palabra-palabra-palabra-42»: tres palabras distintas y un número del 10 al 99. */
export function generateMemorablePassword(): string {
  if (WORDS.length < 500) throw new Error(`La lista de palabras es muy corta (${WORDS.length}).`);
  const picked = new Set<string>();
  while (picked.size < 3) picked.add(WORDS[randomIndex(WORDS.length)]);
  const password = `${[...picked].join("-")}-${10 + randomIndex(90)}`;
  if (!newPasswordSchema.safeParse(password).success) throw new Error("La contraseña generada no cumple las reglas del panel.");
  return password;
}
