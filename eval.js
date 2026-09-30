/* ==========================================================
   eval.js — grading and syllabus per subject (content in Spanish).
   parts: [name, %] · minimum: text shown under the calculator
   grading.scale: "10" (percentages) or "points" (each part worth %/10 points)
   grading.min / min2: {item: index in parts, value: minimum grade, text}
   syllabus: [week or block, content]
   ========================================================== */
const GRADING={
ed:{
 grading:{scale:"10", min:{item:2, value:4, text:"un 4 sobre 10 en el examen final"}},
 parts:[["Parcial 1",25],["Parcial 2",25],["Examen final",50]],
 minimum:"<b>2 sobre 5 en el examen final</b> (un 4 sobre 10) para que los parciales sumen. Sin continua la nota sería el 60 % del examen: un 8,3 para aprobar, que no es realista.",
 rules:[
  "<strong>Parcial 1</strong> — bloque 1, ítems 1 a 5: modelado orientado a objetos, diseño y análisis de algoritmos, ordenación, búsqueda y recursividad. Presencial y escrito, máximo 2,5 puntos.",
  "<strong>Parcial 2</strong> — bloque 2, ítem 6: estructuras lineales y análisis de algoritmos. Máximo 2,5 puntos.",
  "<strong>Final</strong> — en papel, todo el temario, con peso especial en árboles, grafos y complejidad en notación Big O.",
  "<strong>Extraordinaria</strong> — lo más favorable entre el 100 % del examen y 50/50 con los parciales, esta última solo con un 4 o más.",
  "<strong>Material</strong> — Goodrich, Tamassia y Goldwasser, <em>Data Structures and Algorithms in Python</em>. OCW de la asignatura, curso 311. Todo en Python; lleva portátil a clase."],
 syllabus:[["1","Jue 10 sep y vie 11 sep · Presentación. Bloque 1, ítem 1: modelado orientado a objetos"],["2","Jue 17 sep · Ítem 2: diseño de algoritmos. Vie 18 sep · Ítem 3: análisis de algoritmos"],["3","Jue 24 y vie 25 sep · Ítem 4: algoritmos de búsqueda y ordenación"],["4","Jue 1 y vie 2 oct · Ítem 5: algoritmos recursivos"],["5","<b>Lun 5 oct (extra, 4.0.E06, 12:30–14:00)</b> · Simulacro de examen y autoevaluación, con José Daniel García Sánchez. Jue 8 oct · colas"],["6","<b>Jue 15 oct · Primer examen parcial (bloque 1, ítems 1–5)</b>. Vie 16 oct · listas enlazadas"],["7","<b>Lun 19 oct (extra, 2.3.C04)</b> · listas enlazadas. Jue 22 oct · diccionarios y tablas. Vie 23 oct · resolución del examen y co-evaluación"],["8","Jue 29 oct · Bloque 3, ítem 7: árboles binarios. Vie 30 oct · árboles binarios de búsqueda"],["9","Jue 5 y vie 6 nov · Árboles binarios de búsqueda"],["10","<b>Jue 12 nov · Segundo examen parcial (bloque 2, ítem 6), 9:00–10:30, aula 2.3.C01</b>. Vie 13 nov · árboles binarios de búsqueda"],["11","<b>Lun 16 nov (extra, 2.3.D05)</b> · Árboles AVL. Jue 19 nov · árboles B. Vie 20 nov · resolución del examen y co-evaluación"],["12","Jue 26 y vie 27 nov · Grafos: implementaciones"],["13","<b>Lun 30 nov (extra, 2.3.C04)</b> y jue 3 dic · Grafos: recorridos. Vie 4 dic · camino mínimo"],["14","Jue 10 dic · Camino mínimo. Vie 11 dic · resolución de exámenes de cursos anteriores"]]},
talf:{
 grading:{scale:"10", min:{item:1, value:4, text:"un 4 sobre 10 en el examen final"}},
 parts:[["Evaluación continua",50],["Examen final",50]],
 minimum:"<b>Un 4 sobre 10 en el examen final y un 5 de nota final.</b> Sin ese 4 la continua no suma. Si dejas alguna actividad sin completar, la nota pasa a ser el examen por 0,6.",
 rules:[
  "<strong>EC1 (6 nov)</strong> — temas 2, 3 y 4 más JFLAP 1.",
  "<strong>EC2 (11 dic)</strong> — temas 5, 6 y 7 más JFLAP 2, 3 y 4.",
  "<strong>Novedad del curso</strong> — los JFLAP ya no se puntúan aparte: se evalúan dentro de los exámenes.",
  "<strong>Final</strong> — test que vale el 25 % y tres problemas que valen el 75 %. En los problemas puedes llevar dos hojas por las dos caras con resúmenes tuyos.",
  "<strong>IA generativa prohibida</strong> — usarla en cualquier prueba evaluable supone suspender la asignatura.",
  "<strong>JFLAP</strong> — cuatro sesiones obligatorias en parejas: 2 oct, 5 nov, 27 nov y 10 dic."],
 syllabus:[["1","Tema 1: introducción. Tema 2: teoría de autómatas"],["2","Tema 3: autómatas finitos. Ejercicios, hojas 1 y 2"],["3","Tema 3. Ejercicios hojas 2 y 3. Sesión extra el jueves 24"],["4","Tema 4: lenguajes y gramáticas. JFLAP 1"],["5","Tema 4. Ejercicios de diseño, hoja 3"],["6","Tema 4. Ejercicios de lenguajes y gramáticas, hoja 1"],["7","Tema 4. Ejercicios de FNG y FNC, hoja 2"],["8","Tema 5: lenguajes regulares. Ejercicios hoja 2"],["9","Tema 5. JFLAP 2 el jueves, EC1 el viernes"],["10","Ejercicios de FNG. Tema 6: autómatas a pila"],["11","Tema 6.2 e inicio del tema 7. Ejercicios de autómatas a pila"],["12","Tema 7: máquina de Turing. JFLAP 3"],["13","Tema 7. Ejercicios de máquina de Turing"],["14","Repaso. JFLAP 4 el jueves, EC2 el viernes"]]},
is:{
 grading:{scale:"10", min:{item:3, value:5, text:"un 5 sobre 10 en el examen final"}},
 parts:[["Parcial I",15],["Parcial II",15],["Ejercicios en clase",20],["Examen final",50]],
 minimum:"<b>Un 5 sobre 10 en el examen final.</b> Es el mínimo más exigente de las siete: aquí la continua no te salva un examen flojo.",
 rules:[
  "<strong>Jueves 8 de octubre (semana 5)</strong> — parcial I (SE1) de teoría, 15 %: bloque I, ingeniería de requisitos. Fecha fija.",
  "<strong>Jueves 3 de diciembre (semana 13)</strong> — parcial II (SE1) de teoría, 15 %: bloques II y III, modelado conceptual y arquitectónico. Fecha fija.",
  "<strong>Ejercicios individuales en clase (SE4)</strong> — 20 %, hasta 10 a lo largo del curso (pueden ser menos), repartidos a partes iguales. Media hora al final de una sesión, a mano, en papel, sin compañeros ni IA. Nunca en semana de examen. La nota se cierra en la semana 14.",
  "<strong>Final (SE2)</strong> — 50 %, miércoles 20 de enero de 10:00 a 14:00: preguntas teóricas y ejercicios de aplicación de todo el curso.",
  "<strong>Novedad del curso</strong> — el esquema de evaluación cambia respecto a años anteriores: ya no hay trabajo individual.",
  "<strong>Contacto</strong> — coordinación: Eduardo Cibrián (ecibrian@inf.uc3m.es), para dudas entre grupos o del cronograma común."],
 syllabus:[["Bloque I","Ingeniería de requisitos. 1. Introducción. 2. Obtención, descripción y gestión. 3. Propiedades, atributos y organización. 4. Tipos de requisitos"],["Bloque II","Modelado conceptual con UML. 5. Introducción. 6. Clases y objetos. 7. Asociaciones. 8. Jerarquías"],["Bloque III","Modelado arquitectónico con UML. 9. Introducción. 10. Componentes. 11. Interfaces. 12. Diseño por contratos"]]},
ec:{
 grading:{scale:"10", min:{item:2, value:5, text:"un 5 sobre 10 en el examen final"}, min2:{item:1, value:4, text:"un 4 de media en prácticas"}},
 parts:[["Parciales",30],["Prácticas y labs",30],["Examen final",40]],
 minimum:"Dos a la vez: <b>un 5 sobre 10 en el examen final</b> y <b>una media de 4 o más en el conjunto de las prácticas</b>. Fallar cualquiera de los dos suspende.",
 rules:[
  "El examen final, en ordinaria y en extraordinaria, mezcla conceptos teóricos y prácticos.",
  "El parcial cae en la segunda sesión de la semana 9: jueves 5 de noviembre a las 17:15, justo después de JFLAP 2.",
  "<strong>Herramientas</strong> — WepSIM, simulador de procesador elemental (wepsim.github.io), y CREATOR para RISC-V (creatorsim.github.io).",
  "<strong>Material</strong> — García, Expósito, García y Carretero, <em>Problemas resueltos de Estructura de Computadores</em>, Paraninfo."],
 syllabus:[["1","Presentación y repaso de representación de la información"],["2","Coma flotante y fundamentos de ensamblador"],["3","Bifurcaciones y estructuras de control — laboratorio 1"],["4","Acceso a memoria, datos e instrucciones de coma flotante"],["5","Formato de instrucciones e introducción a llamadas a funciones"],["6","Llamadas a funciones y ejercicios"],["7","Organización de un procesador elemental — laboratorio 2 y práctica 1"],["8","Ejecución de instrucciones — laboratorio 3"],["9","Unidad de control — examen parcial"],["10","Unidad de control, interrupciones y arranque"],["11","Sistemas de memoria e introducción a la caché — laboratorio 4"],["12","Memoria caché e introducción a la memoria virtual"],["13","Memoria virtual y ejercicios — práctica 2"],["14","Entrada y salida"]]},
eco:{
 grading:{scale:"10", min:{item:2, value:3, text:"un 3 sobre 10 en el examen final"}},
 parts:[["Evaluaciones en clase",24],["Tests online",16],["Examen final",60]],
 minimum:"<b>Un 3 sobre 10 en el examen final.</b> No presentarse a cualquier ejercicio de continua cuenta como un cero.",
 rules:[
  "La continua pesa un 40 %: las evaluaciones en clase son el 60 % de esa nota y los tests online el 40 %. En nota final, cada evaluación en clase vale un 12 % y cada test un 8 %.",
  "<strong>Sin calculadora</strong> — los exámenes de esta asignatura se hacen sin ella.",
  "<strong>Tres magistrales caen en lunes festivo</strong> (12 de octubre, 2 de noviembre y 7 de diciembre) y se recuperan <em>online un viernes</em>. Las fechas están sin confirmar.",
  "<strong>Evaluaciones en clase</strong> (semanas 5 y 11) — un ejercicio del estilo de las listas de problemas más una pregunta de comprensión. Se espera sentado con folios en blanco y bolígrafo. Quien llega tarde no se presenta. Se califica de A a E: 100, 75, 50, 25 y 0.",
  "<strong>Tests online</strong> (semanas 8 y 14) — diez preguntas, intentos ilimitados de 8 min 30, cuenta el mejor. Abren el lunes a las 9:00 y cierran el sábado a las 14:00 en punto.",
  "<strong>Fórmula</strong> — nota = (X − 25) / 60 sobre 100, donde X es el porcentaje de aciertos. El 25 % es un cero y el 85 % ya es un 100. En blanco y mal cuentan igual: responde todo.",
  "<strong>Extraordinaria</strong> — lo más favorable entre 40/60 con el mínimo de 3 o el 100 % del examen."],
 syllabus:[["1","Revolución capitalista, tecnología, población y crecimiento. Trampa maltusiana, isocostes, destrucción creativa (CORE 1 y 2)"],["2","Escasez, trabajo y elección. Frontera de posibilidades, curvas de indiferencia, RMS = RMT (CORE 3)"],["3","Estrategia y cooperación. Teoría de juegos, dilema del prisionero, Nash, Pareto (CORE 4)"],["4","Propietarios, directivos y empresas. Contratos incompletos, rentas del empleo, disciplina laboral (CORE 6)"],["5","La empresa y sus clientes. Costes, demanda, elasticidad, isobeneficios, pérdida irrecuperable (CORE 7)"],["6","Oferta y demanda: mercados competitivos. Equilibrio, excedentes, impuestos (CORE 8)"],["7","Mercados, eficiencia y política pública. Externalidades, bienes públicos, información asimétrica (CORE 12)"],["8","Mercado de trabajo. Fijación de salarios y precios, desempleo involuntario, sindicatos (CORE 9)"],["9","Bancos, dinero y crédito. Ahorro, inversión, balance, política del banco central (CORE 10)"],["10","Fluctuaciones y desempleo. Ciclos, ley de Okun, medición del PIB (CORE 13)"],["11","Desempleo y política fiscal. Demanda agregada, multiplicador, deuda pública (CORE 14)"],["12","Inflación y política monetaria. Curva de Phillips, canales de transmisión (CORE 15)"],["13","Progreso técnico, instituciones y nivel de vida. Curva de Beveridge (CORE 16)"],["14","Desigualdad. Curva de Lorenz, Gini, redistribución y predistribución (CORE 19)"]]},
dcp:{
 grading:{scale:"points", min:{item:3, value:3, text:"un 3 sobre 6 en el examen teórico"}},
 parts:[["Participación",10],["Cuestionario",10],["Caso final",20],["Examen teórico",60]],
 minimum:"Hay que <b>aprobar la teoría por separado: mínimo 3 sobre 6 en el test</b>. La nota se cuenta sobre 10 puntos, no en porcentajes.",
 rules:[
  "<strong>Participación</strong> — intervenciones, exposiciones y trabajos encomendados durante las catorce semanas. Hasta 1 punto.",
  "<strong>Cuestionario</strong> — miércoles 4 de noviembre (fecha definitiva), tipo test sobre lo cubierto hasta entonces. Hasta 1 punto.",
  "<strong>Caso de recapitulación</strong> — miércoles 9 de diciembre (fecha definitiva), con los textos legales delante. Hasta 2 puntos.",
  "<strong>Examen teórico</strong> — tipo test, de 0 a 6 puntos.",
  "<strong>Extraordinaria</strong> — test de 0 a 6 más caso de 0 a 4. Si has aprobado la continua puedes no hacer el caso y se suma tu nota de continua.",
  "Las magistrales acaban el 30 de noviembre; las prácticas siguen hasta el 9 de diciembre. Dos talleres de redacción de contratos, semanas 3 y 10."],
 syllabus:[["1","Temas 1 y 2: personas, capacidad jurídica y de obrar. Práctica: caso sobre capacidad"],["2","Representación voluntaria y legal. Práctica: personas jurídicas y representación"],["3","Tema 3: el contrato. Práctica: taller de redacción"],["4","Tema 4: interpretación, eficacia e ineficacia. Práctica: ineficacia contractual"],["5","Tema 5: teoría general de las obligaciones. Práctica: régimen general"],["6","Tema 6: cumplimiento. Práctica: caso sobre pago"],["7","Tema 7: extinción y modificación. Práctica: caso correspondiente"],["8","Tema 8: incumplimiento. Práctica: cuestionario de continua"],["9","Tema 8 continuación. Práctica: caso sobre incumplimiento"],["10","Tema 9: compraventa, donación y arrendamiento. Práctica: taller II"],["11","Tema 10: otros contratos. Práctica: tipos contractuales"],["12","Tema 11: responsabilidad extracontractual. Práctica: caso correspondiente"],["13","Temas 12 y 13: derechos reales. Práctica: dominio y Registro de la Propiedad"],["14","Temas 14 y 15: familia y sucesiones. Práctica: caso final"]]},
est:{
 grading:{scale:"10", min:{item:3, value:4, text:"un 4 sobre 10 en el examen final"}},
 parts:[["Parcial 1",17.5],["Parcial 2",17.5],["Clase",5],["Examen final",60]],
 minimum:"<b>Un 4 sobre 10 en el examen final.</b> Sin esa nota no se aprueba, por mucho que sumen los parciales.",
 rules:[
  "<strong>Parciales</strong> — se hacen <em>en la clase reducida</em>, es decir en tu sesión de prácticas del lunes, en las <strong>semanas 7 y 12</strong>. Parcial 1: temas 1 y 2. Parcial 2: temas 3 y 4, total o parcialmente.",
  "<strong>Actividades en clase</strong> — 5 %. Las concretan los profesores de teoría y de prácticas de cada grupo, así que pregunta a Regina Kaiser y a Carmen Montero cuáles son las tuyas.",
  "<strong>Hay formulario oficial para los exámenes</strong> con intervalos de confianza, contrastes, regresión simple y múltiple y tablas ANOVA. No hace falta memorizar fórmulas, sí saber elegir la correcta.",
  "<strong>Convocatoria extraordinaria</strong> — lo más favorable entre 60/40 con la continua o el 100 % del examen, manteniendo el mínimo de 4.",
  "<strong>Estructura del curso</strong> — 14 clases teórico-prácticas y 14 sesiones de ejercicios, más dos laboratorios con ordenador opcionales.",
  "<strong>Requisito previo</strong> — la guía presupone Estadística I.",
  "<strong>Bibliografía</strong> — no hay lectura obligatoria: las transparencias y los ejercicios bastan. Como apoyo, Newbold, Peña (<em>Regresión y análisis de experimentos</em>), Triola y Ross."],
 syllabus:[["Tema 1","Inferencia sobre una población: estimadores puntuales, estimación de media y varianza, distribución de la media en el muestreo e intervalos de confianza (varianza conocida y desconocida, muestras grandes, t de Student, varianza)"],["Tema 2","Contraste de hipótesis: hipótesis nula y alternativa, los dos tipos de error, potencia, p-valor y pasos generales de un contraste"],["Tema 3","Comparaciones entre dos poblaciones: muestras independientes, inferencia sobre medias en muestras pequeñas y grandes, comparación de varianzas y distribución F"],["Tema 4","Regresión lineal simple: especificación del modelo, mínimos cuadrados, inferencia sobre pendiente y varianza, estimación de la respuesta promedio y predicción"],["Tema 5","Diagnóstico y regresión múltiple: análisis de residuos, descomposición ADEVA, transformaciones para linealizar, forma matricial e introducción a la regresión múltiple"]]}
};
