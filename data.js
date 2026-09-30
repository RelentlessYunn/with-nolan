/* ==========================================================
   data.js — everything the site shows. Content stays in Spanish (it comes
   from UC3M); keys are English. See README.md for how to add things.
   ========================================================== */

/* Subjects. term: 1 or 2 · campus: "GET" (Getafe) or "LEG" (Leganés)
   color: subject colour · tint: translucent version for backgrounds */
const SUBJECTS={
 ed:{name:"Estructura de Datos", short:"ED", term:1, color:"#FF6B5E", tint:"rgba(255,107,94,.15)", ects:6, dept:"Informática", group:"1081", campus:"LEG"},
 talf:{name:"Tª Autómatas y Leng. Formales", short:"TALF", term:1, color:"#FFA640", tint:"rgba(255,166,64,.15)", ects:6, dept:"Informática", group:"82", campus:"LEG"},
 is:{name:"Ingeniería del Software", short:"IS", term:1, color:"#5AA9FF", tint:"rgba(90,169,255,.15)", ects:6, dept:"Informática", group:"82", campus:"LEG"},
 ec:{name:"Estructura de Computadores", short:"EC", term:1, color:"#3FD9A4", tint:"rgba(63,217,164,.15)", ects:6, dept:"Informática", group:"82", campus:"LEG"},
 eco:{name:"Principios de Economía", short:"ECO", term:1, color:"#A987FF", tint:"rgba(169,135,255,.15)", ects:6, dept:"Economía", group:"801", campus:"GET"},
 dcp:{name:"Int. Dcho. Civil Patrimonial", short:"DCP", term:1, color:"#F06BD4", tint:"rgba(240,107,212,.15)", ects:6, dept:"Derecho Privado", group:"801", campus:"GET"},
 est:{name:"Estadística II", short:"EST", term:1, color:"#3FCCE8", tint:"rgba(63,204,232,.15)", ects:6, dept:"Estadística", group:"801", campus:"GET"}
};

/* Timetable. day: 0 Monday … 4 Friday · start/end: minutes from midnight (540 = 9:00)
   Weekly classes have from/to; one-off classes have dates (and, if the room changes, rooms: one per date).
   Layout (half width), clashes and hatching are computed automatically. */
const CLASSES=[
 {subject:"est", day:0, start:540, end:630, kind:"prácticas", room:"Aula 5.1.04", when:"7 sep – 30 nov", group:"801", from:"2026-09-07", to:"2026-11-30"},
 {subject:"dcp", day:0, start:645, end:735, kind:"magistral", room:"Aula 10.2.1", when:"7 sep – 30 nov", group:"76 y 801", from:"2026-09-07", to:"2026-11-30"},
 {subject:"eco", day:0, start:750, end:840, kind:"magistral", room:"Aula 10.2.1", when:"7 sep – 7 dic", group:"27, 76 y 801", from:"2026-09-07", to:"2026-12-07"},
 {subject:"ed", day:0, start:750, end:840, kind:"clase extra", room:"Aulas varias", when:"5 y 19 oct · 16 y 30 nov", group:"1081", dates:["2026-10-05","2026-10-19","2026-11-16","2026-11-30"], rooms:["Aula 4.0.E06","Aula 2.3.C04","Aula 2.3.D05","Aula 2.3.C04"]},
 {subject:"talf", day:1, start:540, end:630, kind:"teoría", room:"Aula 2.3.B05", when:"8 sep – 1 dic", group:"82", from:"2026-09-08", to:"2026-12-01"},
 {subject:"is", day:1, start:645, end:735, kind:"teoría", room:"Aula 4.0.E04", when:"8 sep – 1 dic", group:"82", from:"2026-09-08", to:"2026-12-01"},
 {subject:"est", day:2, start:540, end:630, kind:"magistral", room:"Aula 10.2.1", when:"9 sep – 9 dic", group:"78 y 801", from:"2026-09-09", to:"2026-12-09"},
 {subject:"eco", day:2, start:645, end:735, kind:"prácticas", room:"Aula 10.1.6", when:"9 sep – 9 dic", group:"801", from:"2026-09-09", to:"2026-12-09"},
 {subject:"dcp", day:2, start:750, end:840, kind:"prácticas", room:"Aula 6.1.02", when:"9 sep – 9 dic", group:"801", from:"2026-09-09", to:"2026-12-09"},
 {subject:"ec", day:2, start:930, end:1020, kind:"teoría", room:"Aula 2.3.A01", when:"9 sep – 9 dic", group:"82", from:"2026-09-09", to:"2026-12-09"},
 {subject:"ed", day:3, start:540, end:630, kind:"teoría", room:"Aula 2.3.C01", when:"10 sep – 10 dic", group:"1081", from:"2026-09-10", to:"2026-12-10"},
 {subject:"is", day:3, start:645, end:735, kind:"teoría", room:"Aula 2.3.D01", when:"10 sep – 10 dic", group:"82", from:"2026-09-10", to:"2026-12-10"},
 {subject:"talf", day:3, start:930, end:1020, kind:"prácticas", room:"1.0.F03 · INF 7.0.J02", when:"24 sep · 5 nov · 10 dic", group:"82", dates:["2026-09-24","2026-11-05","2026-12-10"]},
 {subject:"ec", day:3, start:840, end:930, kind:"laboratorio", room:"INF 7.0.J04 · INF 7.0.J05", when:"24 sep · 22 y 29 oct · 19 nov", group:"82", dates:["2026-09-24","2026-10-22","2026-10-29","2026-11-19"]},
 {subject:"ec", day:3, start:1035, end:1125, kind:"teoría", room:"Aula 2.3.D03", when:"10 sep – 10 dic", group:"82", from:"2026-09-10", to:"2026-12-10"},
 {subject:"ed", day:4, start:540, end:630, kind:"teoría", room:"Aula INF 2.2.C.04 DUAL", when:"11 sep – 11 dic", group:"1081", from:"2026-09-11", to:"2026-12-11"},
 {subject:"talf", day:4, start:645, end:735, kind:"teoría", room:"Aula 2.3.C03", when:"11 sep – 11 dic", group:"82", from:"2026-09-11", to:"2026-12-11"},
 {subject:"talf", day:4, start:750, end:840, kind:"prácticas", room:"Aula 4.0.E04", when:"solo 13 nov", group:"82", dates:["2026-11-13"]},
 {subject:"is", day:4, start:750, end:840, kind:"prácticas", room:"Aula 4.1.E06", when:"2, 16 y 30 oct · 20 nov", group:"82", dates:["2026-10-02","2026-10-16","2026-10-30","2026-11-20"]}
];

/* Faculty. role: "theory" (Leganés: theory and exercises) · "lecture" / "lab" (Getafe)
   · "lecture+lab" · "assistant" · "" · coord: true for the coordinator (one per subject) */
const FACULTY=[
 {subject:"ed", name:"Isabel Segura Bedmar", role:"theory", coord:false, email:"isegura@inf.uc3m.es", office:"2.2.B05 · Sabatini, Leganés", note:""},
 {subject:"ed", name:"José Daniel García Sánchez", role:"", coord:false, email:"", office:"", note:"Imparte la clase extra del lunes 5 de octubre (simulacro de examen), aula 4.0.E06."},
 {subject:"ed", name:"Israel González Carrasco", role:"", coord:true, email:"igcarras@inf.uc3m.es", office:"2.2.B13 · Sabatini, Leganés", note:"Tutorías por cita previa por correo. En el asunto: nombre completo, curso, asignatura y número de grupo (81)."},
 {subject:"talf", name:"Araceli Sanchis de Miguel", role:"theory", coord:true, email:"masm@inf.uc3m.es", office:"2.1.B11 · Sabatini, Leganés", note:"Pregúntale por las fechas de JFLAP 3 y de la EC2, que siguen sin cuadrar."},
 {subject:"is", name:"José María Álvarez Rodríguez", role:"theory", coord:false, email:"joalvare@inf.uc3m.es", office:"2.1.B07 · Sabatini, Leganés", note:""},
 {subject:"is", name:"Jesús Poza", role:"theory", coord:false, email:"jepozac@inf.uc3m.es", office:"2.1.B18 · Sabatini, Leganés", note:"Aparece como profesor en las diapositivas de la semana 1. Tutorías: pendientes."},
 {subject:"is", name:"Eduardo Cibrián Sánchez", role:"", coord:true, email:"ecibrian@inf.uc3m.es", office:"2.1.B18 · Sabatini, Leganés", note:"Coordinación: dudas entre grupos e incidencias con el cronograma común."},
 {subject:"ec", name:"Alejandro Calderón Mateos", role:"theory", coord:false, email:"acaldero@inf.uc3m.es", office:"2.2.B17 · Sabatini, Leganés", note:"Autor de WepSIM, el simulador que vais a usar."},
 {subject:"ec", name:"Félix García Carballeira", role:"", coord:true, email:"fgcarbal@inf.uc3m.es", office:"2.2.B19 · Sabatini, Leganés", note:""},
 {subject:"eco", name:"Javier Sánchez Bachiller", role:"lecture", coord:false, email:"javiersb@eco.uc3m.es", office:"", note:""},
 {subject:"eco", name:"Martha Moya Laos", role:"lab", coord:false, email:"mamoyal@eco.uc3m.es", office:"", note:""},
 {subject:"eco", name:"Ángel Hernando Veciana", role:"", coord:true, email:"angel.hernando@uc3m.es", office:"15.1.63 · López Aranguren, Getafe", note:""},
 {subject:"dcp", name:"Sergio Del Bosque Gómez", role:"lecture+lab", coord:false, email:"sdelbosq@der-pr.uc3m.es", office:"", note:""},
 {subject:"dcp", name:"Yolanda Bergel Sainz de Baranda", role:"", coord:true, email:"ybergel@der-pr.uc3m.es", office:"15.2.77 · López Aranguren, Getafe", note:""},
 {subject:"est", name:"Regina Kaiser Remiro", role:"lecture", coord:true, email:"kaiser@est-econ.uc3m.es", office:"10.1.17 · Campomanes, Getafe", note:""},
 {subject:"est", name:"Carmen Vanessa Montero Contreras", role:"lab", coord:false, email:"carmonte@est-econ.uc3m.es", office:"", note:""},
 {subject:"est", name:"Sandra Benítez Peña", role:"", coord:false, email:"sbenitez@est-econ.uc3m.es", office:"", note:"Figura como coordinadora del curso de magistral en Aula Global. La coordinación de la asignatura es de Regina Kaiser, según la guía docente oficial."}
];

/* Graded dates. type: "ex" exam · "en" submission · "cl" class/lab · "cf" clash
   Optional: time, room, format, syllabus, online:1, until:"YYYY-MM-DD" (multi-day window),
   noDay:1 (day unknown: park it on that week's Saturday; label = custom text). */
const EVENTS=[
 {subject:"talf", date:"2026-09-24", what:"Sesión de ejercicios, aula 1.0.F03, 15:30", weight:"clase", type:"cl"},
 {subject:"ec", date:"2026-09-24", what:"Laboratorio 1", weight:"laboratorio", type:"cl", time:"14:00–15:30", room:"INF 7.0.J04 y 7.0.J05"},
 {subject:"talf", date:"2026-10-02", what:"JFLAP 1 · autómatas finitos, temas 2 y 3", weight:"obligatorio", type:"en", time:"10:45–12:15", room:"INF 7.0.J04", format:"Práctica en parejas, con entrega"},
 {subject:"is", date:"2026-10-02", what:"Práctica en aula", weight:"clase", type:"cl", time:"12:30–14:00", room:"Aula 4.1.E06"},
 {subject:"ed", date:"2026-10-05", what:"Clase extra del 1081: simulacro de examen y autoevaluación antes del primer parcial, con José Daniel García Sánchez — choca con Economía", weight:"conflicto", type:"cf", time:"12:30–14:00", room:"Aula 4.0.E06"},
 {subject:"eco", date:"2026-10-07", what:"Evaluación en clase 1. La haces con otro grupo, no en tu sesión habitual", weight:"12 % final", type:"ex", time:"09:00–10:30", room:"Aula 6.1.02", format:"Escrito en clase, folios en blanco y bolígrafo, sin calculadora", syllabus:"Hasta teoría de juegos: CORE 1 a 4 (semanas 1 a 3 del temario)"},
 {subject:"is", date:"2026-10-08", what:"Examen parcial I (SE1), en la clase de teoría del jueves", weight:"15 %", type:"ex", time:"10:45–12:15", room:"Aula 2.3.D01", format:"Presencial, de teoría. Fecha fija", syllabus:"Bloque I: ingeniería de requisitos"},
 {subject:"ed", date:"2026-10-15", what:"Primer parcial: bloque 1, ítems 1 a 5. En el horario y aula de los jueves", weight:"25 %", type:"ex", time:"09:00–10:30", room:"Aula 2.3.C01", format:"Presencial y escrito"},
 {subject:"is", date:"2026-10-16", what:"Práctica en aula", weight:"clase", type:"cl", time:"12:30–14:00", room:"Aula 4.1.E06"},
 {subject:"ec", date:"2026-10-22", what:"Laboratorio 2 y entrega de la Práctica 1", weight:"entrega", type:"en", time:"14:00–15:30", room:"INF 7.0.J04 y 7.0.J05"},
 {subject:"eco", date:"2026-10-16", noDay:1, label:"viernes por confirmar", online:1, what:"Recuperación online de la magistral del lunes 12 de octubre, festivo", weight:"clase", type:"cl", time:"Por confirmar", format:"Online, en sustitución de la clase perdida"},
 {subject:"eco", date:"2026-11-06", noDay:1, label:"viernes por confirmar", online:1, what:"Recuperación online de la magistral del lunes 2 de noviembre, festivo", weight:"clase", type:"cl", time:"Por confirmar", format:"Online, en sustitución de la clase perdida"},
 {subject:"eco", date:"2026-12-11", noDay:1, label:"viernes por confirmar", online:1, what:"Recuperación online de la magistral del lunes 7 de diciembre, festivo", weight:"clase", type:"cl", time:"Por confirmar", format:"Online, en sustitución de la clase perdida"},
 {subject:"eco", date:"2026-10-26", until:"2026-10-31", online:1, what:"Test online 1 en Aula Global", weight:"8 % final", type:"ex", time:"Abre lunes 9:00, cierra sábado 14:00", format:"10 preguntas, intentos ilimitados de 8 min 30, cuenta el mejor"},
 {subject:"dcp", date:"2026-11-04", what:"Cuestionario de autoevaluación tipo test. Fecha definitiva", weight:"1 pto / 10", type:"ex", time:"12:30–14:00", room:"Aula 6.1.02", format:"Tipo test"},
 {subject:"ec", date:"2026-10-29", what:"Laboratorio 3", weight:"laboratorio", type:"cl", time:"14:00–15:30", room:"INF 7.0.J04 y 7.0.J05"},
 {subject:"is", date:"2026-10-30", what:"Práctica en aula", weight:"clase", type:"cl", time:"12:30–14:00", room:"Aula 4.1.E06"},
 {subject:"talf", date:"2026-11-05", what:"JFLAP 2 · gramáticas, tema 4", weight:"obligatorio", type:"en", time:"15:30–17:00", room:"INF 7.0.J02", format:"Práctica en parejas, con entrega"},
 {subject:"ec", date:"2026-11-05", what:"Examen parcial", weight:"parte del 30 %", type:"ex", time:"17:15–18:45", room:"Aula 2.3.D03", format:"Presencial, teoría y práctica"},
 {subject:"talf", date:"2026-11-06", what:"EC1: temas 2, 3 y 4 más JFLAP 1", weight:"25 % aprox.", type:"ex", time:"10:45–12:15", room:"Aula 2.3.C03", format:"Presencial y escrito"},
 {subject:"ed", date:"2026-11-12", what:"Segundo parcial: bloque 2, ítem 6. En el horario y aula de los jueves", weight:"25 %", type:"ex", time:"09:00–10:30", room:"Aula 2.3.C01", format:"Presencial y escrito"},
 {subject:"talf", date:"2026-11-13", what:"Sesión de ejercicios, aula 4.0.E04, 12:30", weight:"clase", type:"cl"},
 {subject:"eco", date:"2026-11-18", what:"Evaluación en clase 2", weight:"12 % final", type:"ex", time:"10:45–12:15", room:"Aula 10.1.6", format:"Escrito en clase, folios en blanco y bolígrafo"},
 {subject:"ec", date:"2026-11-19", what:"Laboratorio 4", weight:"laboratorio", type:"cl", time:"14:00–15:30", room:"INF 7.0.J04 y 7.0.J05"},
 {subject:"is", date:"2026-11-20", what:"Práctica en aula", weight:"clase", type:"cl", time:"12:30–14:00", room:"Aula 4.1.E06"},
 {subject:"est", date:"2026-10-19", what:"Primer parcial: temas 1 y 2. En la clase reducida (prácticas del lunes)", weight:"17,5 %", type:"ex", time:"09:00–10:30", room:"Aula 5.1.04", format:"Presencial, con formulario oficial"},
 {subject:"est", date:"2026-11-23", what:"Segundo parcial: temas 3 y 4. En la clase reducida (prácticas del lunes)", weight:"17,5 %", type:"ex", time:"09:00–10:30", room:"Aula 5.1.04", format:"Presencial, con formulario oficial"},
 {subject:"talf", date:"2026-11-27", what:"JFLAP 3 · autómatas a pila, tema 6", weight:"obligatorio", type:"en", time:"10:45–12:15", room:"INF 7.0.J04", format:"Práctica en parejas, con entrega"},
 {subject:"ed", date:"2026-11-30", what:"Sesión extra del 1081, 12:30, aula 2.3.C04 — choca con Economía", weight:"conflicto", type:"cf"},
 {subject:"is", date:"2026-12-03", what:"Examen parcial II (SE1), en la clase de teoría del jueves", weight:"15 %", type:"ex", time:"10:45–12:15", room:"Aula 2.3.D01", format:"Presencial, de teoría. Fecha fija", syllabus:"Bloques II y III: modelado conceptual y modelado arquitectónico"},
 {subject:"ec", date:"2026-12-05", noDay:1, what:"Entrega de la Práctica 2", weight:"entrega", type:"en"},
 {subject:"eco", date:"2026-12-12", noDay:1, online:1, what:"Test online 2 en Aula Global. El lunes 7 es festivo, así que la ventana puede moverse", weight:"8 % final", type:"ex", time:"Abre lunes 9:00, cierra sábado 14:00", format:"10 preguntas, intentos ilimitados de 8 min 30, cuenta el mejor"},
 {subject:"dcp", date:"2026-12-09", what:"Caso práctico final de recapitulación, en clase. Fecha definitiva", weight:"2 ptos / 10", type:"ex", time:"12:30–14:00", room:"Aula 6.1.02", format:"Caso práctico con los textos legales delante"},
 {subject:"talf", date:"2026-12-10", what:"JFLAP 4 · máquinas de Turing", weight:"obligatorio", type:"en", time:"15:30–17:00", room:"INF 7.0.J02", format:"Práctica en parejas, con entrega"},
 {subject:"is", date:"2026-12-12", noDay:1, label:"cierre de SE4", what:"Se cierra la nota de los ejercicios individuales en clase (SE4). No hay ejercicio en semanas de examen", weight:"20 %", type:"en"},
 {subject:"talf", date:"2026-12-11", what:"EC2: temas 5, 6 y 7 más JFLAP 2, 3 y 4", weight:"25 % aprox.", type:"ex", time:"10:45–12:15", format:"Presencial y escrito"},
 /* finals, 1st ordinary sitting (personal exam timetable, 30 Sep 2026). All in Leganés; the room comes later */
 {subject:"eco", date:"2027-01-11", what:"Examen final, convocatoria ordinaria", weight:"60 %", type:"ex", time:"09:00–12:00", room:"Leganés · aula por publicar", format:"Mínimo un 3 sobre 10, sin calculadora"},
 {subject:"dcp", date:"2027-01-12", what:"Examen final teórico, convocatoria ordinaria", weight:"6 ptos / 10", type:"ex", time:"09:00–12:00", room:"Leganés · aula por publicar", format:"Tipo test. Mínimo un 3 sobre 6"},
 {subject:"talf", date:"2027-01-14", what:"Examen final, convocatoria ordinaria", weight:"50 %", type:"ex", time:"10:00–14:00", room:"Leganés · aula por publicar", format:"Test (25 %) y tres problemas (75 %). Mínimo un 4"},
 {subject:"est", date:"2027-01-18", what:"Examen final, convocatoria ordinaria", weight:"60 %", type:"ex", time:"18:00–21:00", room:"Leganés · aula por publicar", format:"Con formulario oficial. Mínimo un 4"},
 {subject:"is", date:"2027-01-20", what:"Examen final (SE2), convocatoria ordinaria", weight:"50 %", type:"ex", time:"10:00–14:00", room:"Leganés · aula por publicar", format:"Teoría y ejercicios de aplicación. Mínimo un 5", syllabus:"Todo el curso: bloques I, II y III"},
 {subject:"ec", date:"2027-01-22", what:"Examen final, convocatoria ordinaria", weight:"40 %", type:"ex", time:"16:00–20:00", room:"Leganés · aula por publicar", format:"Teoría y práctica. Mínimo un 5"},
 {subject:"ed", date:"2027-01-25", what:"Examen final, convocatoria ordinaria", weight:"50 %", type:"ex", time:"10:00–14:00", room:"Leganés · aula por publicar", format:"En papel, todo el temario. Mínimo un 4"}
];

/* Terms. Weeks are computed from these dates. */
const TERMS=[
 {n:1, start:"2026-09-07", end:"2026-12-11"},
 {n:2, start:"2027-01-26", end:"2027-05-07"}
];

/* Tasks not tied to any subject: [title, detail] */
const GENERAL_TASKS=[
 ["Preguntar por las cuatro prácticas de los lunes","Si son obligatorias o evaluables, el 1081 no te sirve tal cual."],
 ["Mirar las aulas de los finales","Los días y horas ya están (del 11 al 25 de enero, todos en Leganés). Las aulas se publican más cerca de la fecha."],
 ["Decidir cómo pasarle las notas a Claude","Claude no puede leer la nube (JSONBin). De momento: Notas → Copiar notas y pegarlas en el chat."]
];

/* Official academic calendar 2026/27 (v9, 3 Jun 2026). from/to inclusive.
   periods.type: "classes" · "exams" · "break" · holidays.campus only when it affects one campus: "leg" or "get" */
const CALENDAR={
 year:{from:"2026-09-01", to:"2027-06-30"},
 periods:[
  {from:"2026-09-07", to:"2026-12-11", type:"classes", label:"Clases · 1.º cuatrimestre"},
  {from:"2026-12-14", to:"2026-12-15", type:"exams", label:"Recuperación y anticipados"},
  {from:"2026-12-16", to:"2026-12-22", type:"exams", label:"Exámenes ordinarios 1.º cuat."},
  {from:"2026-12-23", to:"2027-01-08", type:"break", label:"Navidad"},
  {from:"2027-01-11", to:"2027-01-25", type:"exams", label:"Exámenes ordinarios 1.º cuat."},
  {from:"2027-01-26", to:"2027-05-07", type:"classes", label:"Clases · 2.º cuatrimestre"},
  {from:"2027-03-22", to:"2027-03-29", type:"break", label:"Semana Santa"},
  {from:"2027-05-10", to:"2027-05-10", type:"break", label:"Día no lectivo"},
  {from:"2027-05-11", to:"2027-05-28", type:"exams", label:"Exámenes ordinarios 2.º cuat."},
  {from:"2027-06-14", to:"2027-06-30", type:"exams", label:"Exámenes extraordinarios"}
 ],
 holidays:[
  {date:"2026-10-09", campus:"leg"},
  {date:"2026-10-12"},
  {date:"2026-11-02"},
  {date:"2026-12-07"},
  {date:"2026-12-08"},
  {date:"2026-12-25"},
  {date:"2027-01-01"},
  {date:"2027-01-06"},
  {date:"2027-03-25"},
  {date:"2027-03-26"},
  {date:"2027-05-01"},
  {date:"2027-05-06", campus:"get"},
  {date:"2027-05-17", campus:"get"}
 ],
 marks:[
  {date:"2026-09-07", label:"Empiezan las clases"},
  {date:"2026-12-11", label:"Acaban las clases"},
  {date:"2027-01-26", label:"Empiezan las clases"},
  {date:"2027-05-07", label:"Acaban las clases"}
 ]
};

/* Advice per week, written by hand: ADVICE[term][week] = [texts].
   Advice only: that week's dates are added automatically from EVENTS. */
const ADVICE={
 1:{
  1:["Semana de arranque. Baja de Aula Global la guía docente de las siete asignaturas y comprueba cuáles te faltan.","Estadística II es la única de la que no tienes nada: ni evaluación, ni porcentajes, ni calendario. Empieza por ahí."],
  2:["Es la semana del cambio de grupo de Estructura de Datos. Manda el correo a Israel González Carrasco y guarda su respuesta.","Hasta que Aula Global refleje el 1081 sigues matriculado en el 1082: si cae alguna entrega, pregunta dónde se sube.","Busca pareja para los JFLAP de TALF. La primera sesión es el 2 de octubre y es obligatoria."],
  3:["Jueves 24 cargado: laboratorio 1 de Estructura de Computadores a las 14:00 en INF 7.0.J04 y 7.0.J05, y justo después sesión de TALF a las 15:30 en el aula 1.0.F03.","Instala WepSIM antes del laboratorio para no perder la sesión montando el entorno."],
  4:["JFLAP 1 el viernes: asistencia obligatoria y entrega en parejas, sobre los temas 2 y 3.","El jueves 8 de la semana que viene es el parcial I de Ingeniería del Software (bloque I, requisitos), en la teoría del jueves, aula 2.3.D01. Repasa esta semana."],
  5:["En Economía se entra con folios en blanco y bolígrafo, y quien llega tarde no se presenta. Sal con margen desde casa.","Semana cargada: lunes 5, clase extra del 1081 con simulacro de examen (12:30, aula 4.0.E06, choca con Economía); miércoles 7, evaluación en clase de Economía hasta teoría de juegos; jueves 8, parcial I de Ingeniería del Software."],
  6:["Primer parcial de Estructura de Datos el jueves 15 en el aula 2.3.C01: bloque 1, ítems 1 a 5. Vale 2,5 puntos.","Entra modelado orientado a objetos, diseño y análisis de algoritmos, ordenación, búsqueda y recursividad."],
  7:["Entrega de la práctica 1 de Estructura de Computadores junto con el laboratorio 2.","El viernes 23 se resuelve el parcial de Estructura de Datos en clase. Ve con el examen mirado: es la mejor pista de cómo pregunta."],
  8:["El test de Economía abre el lunes a las 9:00 y cierra el sábado a las 14:00 en punto, con intentos ilimitados y cuenta el mejor. Hazlo pronto y repítelo, no lo dejes para el sábado.","Recuerda la fórmula: acertar el 25 % es un cero y el 85 % ya es un 100. En blanco y mal puntúan igual, así que responde todo."],
  9:["La peor semana del cuatrimestre. El jueves encadenas JFLAP 2 a las 15:30 y el parcial de Estructura de Computadores a las 17:15, sin hueco entre medias.","El viernes cae la EC1 de TALF: temas 2, 3 y 4 más JFLAP 1.","Llega con todo preparado desde el miércoles. Esta semana no se improvisa."],
  10:["Del segundo parcial de Estructura de Datos entra el bloque 2, ítem 6: estructuras lineales.","El segundo parcial de Estructura de Datos es el jueves 12, en el horario y aula de siempre (9:00, 2.3.C01)."],
  11:["El lunes 16 vuelve a haber sesión extra del 1081 a la hora de la magistral de Economía: decide a cuál vas y avisa si hace falta."],
  12:["El segundo parcial de Estadística II abre la semana el lunes: repasa los temas 3 y 4 el fin de semana, con el formulario oficial.","El resto de la semana úsalo para repasar los bloques II y III de Ingeniería del Software (parcial II el jueves 3 de diciembre) y para empezar árboles y grafos de cara al final."],
  13:["Jueves 3: parcial II de Ingeniería del Software, bloques II y III, en la teoría del jueves (2.3.D01). La entrega de la práctica 2 de Estructura de Computadores aún no tiene día: pregúntalo en clase.","Última sesión extra del 1081 el lunes 30, con el mismo choque de siempre."],
  14:["Cuatro cosas en cinco días: test online 2 de Economía, caso final de Derecho Civil el miércoles 9, JFLAP 4 y EC2 de TALF.","Las clases acaban el viernes 11. Tus finales: Economía 11 ene, Derecho 12, TALF 14, Estadística 18, Ingeniería del Software 20, Estructura de Computadores 22 y Estructura de Datos 25."]
 },
 2:{

 }
};

/* Tasks per subject: [title, detail]. Ticks are tied to the title. */
const TASKS={
 ed:[],
 talf:[],
 is:[["Repasar cada tema justo después de clase","Hay hasta 10 ejercicios individuales en clase (SE4, 20 %), a mano, sin avisar la semana, sobre lo que se acaba de explicar."]],
 ec:[["Instalar WepSIM y CREATOR antes del laboratorio 1","El jueves 24 a las 14:00 en INF 7.0.J04. Llega con el entorno montado."]],
 eco:[["Confirmar los viernes de recuperación","Tres magistrales caen en lunes festivo (12 oct, 2 nov y 7 dic) y se recuperan online un viernes. Pregunta las fechas."]],
 dcp:[],
 est:[]
};

/* Nolan's own plans, shown in his month calendar (#nolan) next to the exams.
   One line each: date "YYYY-MM-DD" and what; optional until (last day, for several days),
   time, place, note, color. Example:
   {date:"2026-10-12", what:"Cena con la familia", time:"21:00", place:"Casa", color:"#FFA640"}, */
const PERSONAL=[
];
