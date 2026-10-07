-- =============================================================================
-- Fundapresai · Contenido inicial (seed)
--
-- Idempotente: si la fila ya existe NO la sobrescribe (on conflict do nothing),
-- así que volver a correrlo nunca borra lo que Angela edite en el panel.
--
-- Fuentes: Referencias/Campanas_donaronline.md (textos de Donar Online y de
-- colsai.edu.co/donaciones), manual de identidad y bio de Instagram.
-- Trato de usted, sin cifras ni promesas inventadas.
--
-- Las portadas (cover_image_url) las completa scripts/seed-images.ts.
--
-- Ajustes rápidos después de aplicar (SQL Editor de Supabase):
--   update public.campaigns set title  = 'Nuevo título' where slug = 'bonos-con-sentido';
--   update public.campaigns set status = 'hidden'       where slug = 'bonos-ser-amor-en-accion';
--   select public.set_featured_campaign((select id from public.campaigns where slug = '...'));
-- =============================================================================

-- -----------------------------------------------------------------------------
-- site_settings (fila única)
-- -----------------------------------------------------------------------------
insert into public.site_settings (id, hero, about, how_to_donate, help, contact, socials, seo, privacy_md)
values (
  1,

  -- hero
  jsonb_build_object(
    'eyebrow', 'Fundación Fundapresai',
    'title', '¿Se siente inspirado? Su aporte transformará vidas.',
    'subtitle', 'Somos una fundación sin ánimo de lucro que forma en valores humanos. Con su ayuda, niños y niñas del Colegio de Valores Humanos Sathya Sai de Funza reciben educación gratuita.',
    'image_url', null,
    'primary_cta_label', 'Donar ahora',
    'secondary_cta_label', 'Ver campañas'
  ),

  -- about
  jsonb_build_object(
    'title', 'Quiénes somos',
    'body_md', $md$**Fundapresai** es una fundación sin ánimo de lucro de alto impacto social. Su propósito es la formación en valores humanos, y lo lleva a la práctica en la educación, con su instituto y su colegio, y en las empresas, con una ruta de transformación empresarial.

Su obra principal es el **Colegio de Valores Humanos Sathya Sai de Funza**, una institución privada que ofrece educación gratuita con un modelo de educación integral enfocado en la formación del carácter.

Creemos que los problemas y las dificultades que enfrenta el país no son por falta de mentes brillantes, sino de corazones bondadosos. Nuestro objetivo es formar seres humanos con carácter y conciencia, para que puedan servir a la sociedad.

Las donaciones de estas campañas sostienen las becas de los estudiantes, el trabajo de los docentes y los proyectos del colegio.$md$,
    'image_url', null,
    'stats', jsonb_build_array(
      jsonb_build_object('value', '108', 'label', 'niños y niñas estudian gratis en el colegio'),
      jsonb_build_object('value', '85 %', 'label', 'de sus becas ya están cubiertas')
    )
  ),

  -- how_to_donate
  jsonb_build_object(
    'title', 'Donar es fácil: 3 pasos',
    'steps', jsonb_build_array(
      jsonb_build_object(
        'title', 'Elija una campaña',
        'text', 'Lea las campañas y escoja la que más le llegue al corazón.'
      ),
      jsonb_build_object(
        'title', 'Toque «Donar»',
        'text', 'El botón lo lleva a Donar Online, la plataforma segura donde recibimos las donaciones.'
      ),
      jsonb_build_object(
        'title', 'Complete su donación',
        'text', 'Pague con tarjeta de crédito, débito o PSE, una sola vez o cada mes.'
      )
    )
  ),

  -- help
  jsonb_build_object(
    'title', '¿Necesita ayuda para donar?',
    'text', 'Escríbanos por WhatsApp y con gusto lo acompañamos paso a paso. Si lo prefiere, también puede llamarnos.',
    'whatsapp_label', 'Escríbanos por WhatsApp'
  ),

  -- contact
  -- TODO contacto: datos provisionales (los publicados en Donar Online).
  -- Falta confirmar con Angela teléfono, WhatsApp, correo, dirección y horario oficiales.
  jsonb_build_object(
    'phone', '315 878 0973',
    'whatsapp', '320 878 4968',
    'email', null,
    'address', null,
    'city', 'Funza, Cundinamarca',
    'hours', null
  ),

  -- socials (Facebook del colegio confirmado por Cesar)
  jsonb_build_object(
    'facebook', 'https://www.facebook.com/colegiosaifunza/',
    'instagram', 'https://www.instagram.com/fundapresai/',
    'youtube', null,
    'website', 'https://colsai.edu.co/'
  ),

  -- seo
  jsonb_build_object(
    'title', 'Fundapresai · Donaciones para la educación en valores',
    'description', 'Apoye la educación gratuita de niños y niñas del Colegio de Valores Humanos Sathya Sai en Funza. Elija una campaña y done de forma segura en Donar Online.',
    'og_image_url', null
  ),

  -- privacy_md
  -- TODO privacidad: texto base, validar con la fundación.
  $md$Este sitio pertenece a la **Fundación Fundapresai**. Aquí le contamos, en palabras sencillas, cómo tratamos su información.

## Este sitio no recoge sus datos

Este sitio no tiene formularios, no le pide registrarse y no guarda datos personales ni datos de pago.

## Las donaciones se hacen en Donar Online

Cuando usted toca «Donar», pasa al sitio de Donar Online, la plataforma donde recibimos las donaciones. Allí se solicitan y procesan sus datos y su pago, bajo las políticas de privacidad y de seguridad de Donar Online. Le recomendamos leerlas antes de donar.

## Si nos escribe

Si nos comparte sus datos por WhatsApp, por teléfono o por correo (por ejemplo, para recibir un bono), los usamos solo para atender su solicitud, conforme a la Ley 1581 de 2012 de protección de datos personales.

## Cookies y estadísticas

Este sitio no usa cookies de publicidad ni de rastreo. Si en algún momento usamos estadísticas de visitas, serán anónimas: no permiten saber quién es usted.

## Preguntas

Si tiene preguntas sobre esta política, comuníquese con nosotros con los datos de contacto que aparecen al final de la página.$md$
)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- campaigns (orden de la landing = sort_order)
-- -----------------------------------------------------------------------------
insert into public.campaigns (
  slug, title, tag, summary, body_md, cover_image_alt, donation_url, donation_note,
  progress_percent, status, is_featured, sort_order
)
values

-- 1 · Unidos por su Educación (destacada) · Donar Online: juntos-por-nuestro-100
(
  'unidos-por-su-educacion',
  'Unidos por su Educación',
  'Becas',
  'Ayude a completar las becas de 108 niños y niñas del Colegio de Valores Humanos de Funza, para que sigan recibiendo educación gratuita basada en valores.',
  $md$## Juntos lograremos el 100 % de las becas

En el Colegio de Valores Humanos de Funza, **108 niños y niñas** reciben educación gratuita basada en valores. Gracias a muchas manos generosas, ya está cubierto el **85 %** de sus becas.

Hoy lo invitamos a ser parte del **15 %** que falta.

Con un aporte mensual desde **$120.000**, o el valor que usted desee, ayuda a que ningún niño se quede sin esta educación que transforma corazones, familias y comunidades.

## ¿Tiene preguntas?

Escríbanos por WhatsApp y con gusto le contamos más sobre esta campaña.$md$,
  'Manos de niños unidas, una sobre otra, en señal de trabajo en equipo.',
  'https://donaronline.org/colegio-de-valores-humanos-sathya-sai/juntos-por-nuestro-100',
  'Aporte mensual sugerido desde $120.000',
  85,
  'active',
  true,
  1
),

-- 2 · Bonos con Sentido · Donar Online: «Bonos con Propósito» (otros-aportes-que-expanden-valores)
(
  'bonos-con-sentido',
  'Bonos con Sentido',
  'Regalos que transforman vidas',
  'Regalos que celebran, acompañan y transforman: un bono de cumpleaños o de condolencias que se convierte en educación gratuita para niños y niñas.',
  $md$## Regalos que transforman vidas

Hay gestos que acompañan el alma. Hay palabras que reconfortan. Y hay regalos que trascienden.

Con los Bonos con Sentido usted puede honrar la vida de quienes ama, en momentos de despedida o de celebración, con un acto de amor profundo: apoyar la educación gratuita de niños y niñas en el Colegio de Valores Humanos Sathya Sai.

- **Bono de condolencias:** un homenaje lleno de luz y significado.
- **Bono de cumpleaños:** una forma especial de celebrar la vida.

Cada bono es una semilla que florece en educación, valores y transformación. Gracias por convertir su gesto en propósito.

## ¿Cómo recibe su bono?

1. Haga su donación en Donar Online.
2. Escríbanos por WhatsApp para darnos sus datos y el nombre de la persona a quien dedica el bono.
3. Le enviamos el bono digital para que lo comparta con quien ama.

## Si elige donar cada mes por PSE

El aporte mensual por PSE **no se debita automáticamente**. Cada mes le llegará un correo de Donar Online, a nombre de «Colegio de Valores Humanos Sathya Sai - DASAI», con un enlace personalizado para autorizar el pago de ese mes.

Revise su correo, incluida la carpeta de correo no deseado, **entre el día 1 y el 5 de cada mes**, y complete la donación desde ese enlace.$md$,
  'Ejemplos de los bonos digitales: uno de homenaje y otro de cumpleaños, decorados con flores.',
  'https://donaronline.org/colegio-de-valores-humanos-sathya-sai/otros-aportes-que-expanden-valores',
  'Aporte único o mensual, por el valor que usted elija',
  null,
  'active',
  false,
  2
),

-- 3 · Colegio de Valores Humanos · Donar Online: beca-estudiantes (sin portada propia)
(
  'beca-estudiantes',
  'Colegio de Valores Humanos',
  'Becas y docentes',
  'Apoye la educación gratuita de más de 100 niños y niñas en Funza: puede contribuir a una beca, patrocinar a un docente o apoyar proyectos del colegio.',
  $md$## Su generosidad transforma vidas

Con su aporte, más de 100 niños y niñas del Colegio de Valores Humanos Sathya Sai, en Funza, reciben una educación gratuita, amorosa y transformadora, basada en valores como la verdad, la paz, la rectitud, el amor y la no violencia.

## Usted puede unirse a este propósito

- Apoyando la educación gratuita de un niño o una niña.
- Patrocinando a uno de nuestros docentes.
- Aportando a proyectos especiales del colegio, como la huerta, el aula de música o los espacios que necesitan mantenimiento.

## Montos de referencia

En Donar Online encontrará montos sugeridos desde **$500.000**, que corresponden a media beca mensual de un estudiante, y también puede escribir otro monto. Puede donar una sola vez o cada mes.

Cada aporte es una semilla de futuro. Gracias por ser parte del cambio, por abrir su corazón y por caminar con nosotros por una educación con propósito.$md$,
  'Símbolo de Fundapresai: hojas en morado, azul y naranja alrededor de un círculo.',
  'https://donaronline.org/colegio-de-valores-humanos-sathya-sai/beca-estudiantes',
  'Montos sugeridos desde $500.000 (media beca mensual) u otro valor',
  null,
  'active',
  false,
  3
),

-- 4 · Bonos Ser Amor en Acción (Amor y Amistad, de temporada)
(
  'bonos-ser-amor-en-accion',
  'Bonos Ser Amor en Acción',
  'Amor y Amistad',
  'Celebre a alguien que ama con un bono personalizado. Su aporte transforma la educación de un niño. Este Amor y Amistad, regale con sentido.',
  $md$## Este Amor y Amistad, celebre diferente

Usted celebra a alguien que ama, y su aporte transforma la educación de un niño. Regale con sentido.

## ¿Cómo regalar un bono «Ser Amor en Acción»?

1. **Personalice su bono.** Escríbanos por WhatsApp y cuéntenos a quién quiere sorprender, su nombre y cuál es su lenguaje del amor.
2. **Elija su aporte.** Seleccione el valor que quiere aportar a la educación de nuestros niños y escoja si es una sola vez o mensual.
3. **Realice su aporte.** Complete el pago de forma segura en Donar Online.
4. **Nosotros creamos su bono.** Cuando se confirme su aporte, preparamos el bono personalizado para esa persona especial y se lo enviamos en formato digital para que pueda compartirlo.

## Los lenguajes del amor que puede elegir

- **Detalles significativos:** «Porque este detalle quiere decirte algo muy sencillo: pensé en ti».
- **Actos de servicio:** «Porque quererte también significa estar, acompañarte y hacer algo por ti».
- **Tiempo de calidad:** «Porque compartir mi tiempo contigo es una de mis formas favoritas de decirte que te quiero».
- **Cercanía:** «Porque a veces un abrazo dice todo lo que las palabras no alcanzan a expresar».
- **Palabras de afirmación:** «Porque quiero que nunca olvides lo importante y especial que eres para mí».$md$,
  'Flores de acuarela y el logo de Fundapresai sobre papel de textura crema.',
  'https://donaronline.org/colegio-de-valores-humanos-sathya-sai/bonos-ser-amor-en-accion',
  'Aporte único o mensual, por el valor que usted elija',
  null,
  'active',
  false,
  4
)

on conflict (slug) do nothing;
