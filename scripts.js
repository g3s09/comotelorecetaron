const CATALOG_KEY = "ctlr-catalog-v2";
const TOKEN_KEY = "ctlr-admin-token";
const SELECTION_KEY = "ctlr-selection";
const ORDER_CONTACT_KEY = "ctlr-order-contact";
const REFRESH_MS = 12000;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const isHttp = () => /^https?:$/.test(window.location.protocol);

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const slugify = (value = "item") =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || `item-${Date.now()}`;

const emptyCatalog = () => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  products: [],
  drinks: [],
  team: []
});

const choice = (label, description = "", pricing = {}) => ({
  id: pricing.id || slugify(label),
  label,
  description,
  price: Number.isFinite(pricing.price) ? pricing.price : null,
  priceDelta: Number.isFinite(pricing.priceDelta) ? pricing.priceDelta : 0
});

const choiceDescription = (optionId, label) => {
  const normalized = slugify(label);
  const descriptions = {
    "con-todo-verdura-y-cebolla": "Se sirve con verdura y cebolla, recién preparada para tu orden.",
    "con-todo-cebolla-cilantro-y-rabano": "Incluye cebolla, cilantro y rábano para acompañar.",
    "solo-cebolla": "Se prepara únicamente con cebolla.",
    "solo-cilantro": "Se prepara únicamente con cilantro.",
    "con-hielos": "Servida con hielo para mantenerla bien fría.",
    "sin-hielos": "Servida sin hielo.",
    "poco-hielo": "Servida con una cantidad ligera de hielo.",
    medio: "Centro tibio, jugoso y sellado a la brasa.",
    "3-4": "Cocción intermedia, con menos jugo y buen sellado.",
    "bien-asado": "Cocción completa y firme, bien sellada al carbón.",
    bbq: "Salsa BBQ dulce y ahumada, aplicada al final de la brasa.",
    "mango-habanero": "Dulce, frutal y con picor de habanero.",
    chiltepin: "Picor seco y aromático de chiltepín.",
    "a-la-diabla": "Salsa intensa y picosita de la casa.",
    adobado: "Adobo de la casa cocinado al carbón.",
    "con-picante": "Se conserva el toque picante propio de la preparación.",
    "sin-picante": "Se prepara sin ingredientes picantes.",
    "con-guacamole": "Incluye guacamole fresco de la casa.",
    "sin-guacamole": "Se sirve sin guacamole."
  };
  if (descriptions[normalized]) return descriptions[normalized];
  if (optionId === "guarnicion") return "Acompaña tu platillo con esta guarnición.";
  if (optionId === "salsa") return "Elige la salsa con la que terminaremos tu preparación.";
  return "Tu elección se preparará especialmente para esta orden.";
};

const normalizeChoice = (rawChoice, optionId = "opcion") => {
  if (rawChoice && typeof rawChoice === "object") {
    const label = String(rawChoice.label || rawChoice.name || "").trim();
    return {
      id: rawChoice.id || slugify(label),
      label,
      description: String(rawChoice.description || choiceDescription(optionId, label)).trim(),
      price: rawChoice.price != null && rawChoice.price !== "" && Number.isFinite(Number(rawChoice.price)) ? Number(rawChoice.price) : null,
      priceDelta: Number.isFinite(Number(rawChoice.priceDelta)) && rawChoice.priceDelta !== "" ? Number(rawChoice.priceDelta) : 0
    };
  }
  const label = String(rawChoice || "").trim();
  return choice(label, choiceDescription(optionId, label));
};

const toppings = [
  choice("Con todo: cebolla y cilantro", "Se sirve con cebolla y cilantro como acompañamiento."),
  choice("Solo cebolla", "Se prepara únicamente con cebolla."),
  choice("Solo cilantro", "Se prepara únicamente con cilantro."),
  choice("Natural", "Se sirve sin cebolla ni cilantro.")
];
const birriaToppings = [
  choice("Con todo: cebolla, cilantro y rábano", "Incluye los acompañamientos tradicionales de la birria."),
  choice("Solo cebolla", "Se prepara únicamente con cebolla."),
  choice("Solo cilantro", "Se prepara únicamente con cilantro."),
  choice("Natural", "Se sirve sin cebolla, cilantro ni rábano.")
];
const iceOptions = [
  choice("Con hielos", "Servida con hielo para mantenerla bien fría."),
  choice("Sin hielos", "Servida sin hielo."),
  choice("Poco hielo", "Servida con una cantidad ligera de hielo.")
];
const cutOptions = [
  { id: "termino", label: "Término", type: "single", choices: [choice("Medio", "Centro tibio, jugoso y sellado a la brasa."), choice("3/4", "Cocción intermedia, con menos jugo y buen sellado."), choice("Bien asado", "Cocción completa y firme, bien sellada al carbón.")] },
  { id: "guarnicion", label: "Guarnición", type: "single", choices: [choice("Verdura al grill", "Verduras marcadas al grill."), choice("Elotes a la mantequilla", "Elote caliente con mantequilla."), choice("Papas gajo", "Papas sazonadas estilo gajo."), choice("Papas a la francesa", "Papas crujientes recién hechas."), choice("Queso especial", "Porción de queso especial de la casa."), choice("Frijoles charros", "Frijoles charros caldosos de la casa.")] }
];

const entryIds = new Set(["frijoles-charros", "sopa-azteca", "sopa-hongos", "sopa-queso"]);
const tacoPresentationById = {
  "taco-asada": [30, 85],
  "taco-campechano": [30, 85],
  "taco-pastor": [28, 60],
  "taco-longaniza": [25, 70],
  "taco-pechuga": [28, 85],
  "taco-chorizo-argentino": [30, 85],
  "taco-arrachera": [53, 130]
};
const tacoDisplayNameById = {
  "taco-asada": "Asada",
  "taco-campechano": "Campechano",
  "taco-pastor": "Pastor",
  "taco-longaniza": "Longaniza",
  "taco-pechuga": "Pechuga",
  "taco-chorizo-argentino": "Chorizo argentino",
  "taco-arrachera": "Arrachera"
};
const burgerExtras = [
  choice("Carne doble", "Agrega una carne al carbón extra a tu hamburguesa.", { priceDelta: 60 }),
  choice("Piña asada", "Piña asada al carbón como extra.", { priceDelta: 20 }),
  choice("Queso manchego", "Porción extra de queso manchego.", { priceDelta: 20 }),
  choice("Costra de queso", "Costra extra de queso gratinado.", { priceDelta: 20 }),
  choice("Costra de asada", "Costra extra de carne asada.", { priceDelta: 20 }),
  choice("Cambiar a arrachera", "Sustituye la carne clásica por arrachera.", { priceDelta: 60 })
];
const specialtyEsquiteIds = new Set(["joya-parrilla", "arrachera-patron", "cazuela-ribeye", "macarrones-queso"]);
const standardBeerChoices = [
  choice("Victoria", "Cerveza Victoria para acompañar tu orden.", { price: 35 }),
  choice("Lager", "Cerveza Lager bien fría.", { price: 35 }),
  choice("Corona", "Cerveza Corona bien fría.", { price: 35 }),
  choice("Pacífico", "Cerveza Pacífico bien fría.", { price: 35 })
];
const premiumBeerChoices = [
  choice("Negra Modelo", "Cerveza Negra Modelo bien fría.", { price: 40 }),
  choice("Modelo Especial", "Cerveza Modelo Especial bien fría.", { price: 40 })
];
const beerPreparations = [
  choice("Tarro frío", "Tarro frío sin cargo adicional.", { priceDelta: 0 }),
  choice("Tarro chelado", "Tarro preparado con borde chelado.", { priceDelta: 20 }),
  choice("Michelado", "Preparación michelada de la casa.", { priceDelta: 25 }),
  choice("Clamato", "Preparación con clamato.", { priceDelta: 35 })
];

const enrichMenuItem = (item) => {
  const id = item.id || "";
  const category = item.category || "";
  const replaceOptions = (options) => ({ ...item, options });
  const pricedPresentation = (single, order) => ({ id: "presentacion", label: "Presentación", type: "single", choices: [choice(single.label, single.description, { price: single.price }), choice(order.label, order.description, { price: order.price })] });

  if (id === "agua-jamaica") return { ...item, available: false };

  if (["agua-fresca-dia", "agua-horchata", "naranjada", "limonada"].includes(id)) {
    const prices = {
      "agua-fresca-dia": [35, 65],
      "agua-horchata": [35, 85],
      naranjada: [50, 165],
      limonada: [50, 165]
    }[id];
    return { ...replaceOptions([
      pricedPresentation({ label: "Vaso", price: prices[0], description: "Porción individual para acompañar tu comida." }, { label: "Jarra", price: prices[1], description: "Presentación para compartir en la mesa." }),
      { id: "hielos", label: "Hielos", type: "single", choices: iceOptions }
    ]), description: id === "agua-fresca-dia" ? "Agua fresca del día de jamaica, disponible por vaso o por jarra." : item.description };
  }

  if (["clericot", "jarra-clericot"].includes(id)) {
    return replaceOptions([
      pricedPresentation({ label: "Copa individual", price: 90, description: "Copa individual de clericot." }, { label: "Jarra para compartir", price: 210, description: "Jarra de clericot para compartir." })
    ]);
  }

  if (["margarita", "cantarito"].includes(id)) {
    const options = [{ id: "alcohol", label: "¿Con alcohol?", type: "single", choices: [choice("Con alcohol", "Preparación tradicional con su destilado."), choice("Sin alcohol", "Versión sin destilado; confirma disponibilidad con el restaurante.")] }];
    if (id === "cantarito") options.push({ id: "hielos", label: "Hielos", type: "single", choices: iceOptions });
    return replaceOptions(options);
  }

  if (category === "Esquites") {
    const options = [];
    if (id === "esquites-tradicionales") {
      options.push({
        id: "preparacion",
        label: "Elige tu preparación",
        type: "single",
        choices: [
          choice("Clásico", "Granos de elote con mantequilla, mayonesa, tocino, queso y chile en polvo.", { price: 70 }),
          choice("Con longaniza", "Esquites tradicionales con longaniza al carbón.", { price: 85 }),
          choice("Con pastor", "Esquites tradicionales con carne al pastor.", { price: 85 }),
          choice("Con asada o campechano", "Esquites tradicionales con carne asada o campechano.", { price: 100 }),
          choice("Con birria", "Esquites tradicionales con birria de la casa.", { price: 140 }),
          choice("Con chistorra", "Esquites tradicionales con chistorra.", { price: 140 })
        ]
      });
    }
    options.push({
      id: "extra-tuetano",
      label: "Extra para tus esquites",
      type: "multiple",
      choices: [choice("Agrega un tuétano", "Tuétano asado para acompañar únicamente tus esquites.", { priceDelta: 70 })]
    });
    if (specialtyEsquiteIds.has(id)) {
      options.push({
        id: "extra-arrachera",
        label: "Extra de la casa",
        type: "multiple",
        choices: [choice("Agrega arrachera", "Porción extra de arrachera cocinada al carbón.", { priceDelta: 60 })]
      });
    }
    return replaceOptions(options);
  }

  if (category === "Para Festejar") {
    if (id === "cerveza") {
      return {
        ...replaceOptions([
          { id: "cerveza", label: "Elige tu cerveza", type: "single", choices: standardBeerChoices },
          { id: "preparacion", label: "Elige tu preparación", type: "single", choices: beerPreparations }
        ]),
        name: "Cervezas",
        description: "Elige Victoria, Lager, Corona o Pacífico y cómo quieres tu tarro."
      };
    }
    if (id === "negra-modelo-especial") {
      return {
        ...replaceOptions([
          { id: "cerveza", label: "Elige tu cerveza", type: "single", choices: premiumBeerChoices },
          { id: "preparacion", label: "Elige tu preparación", type: "single", choices: beerPreparations }
        ]),
        name: "Negra Modelo o Modelo Especial",
        description: "Elige Negra Modelo o Modelo Especial y cómo quieres tu tarro."
      };
    }
  }

  if (id === "costra") {
    return replaceOptions([
      { id: "proteina", label: "Elige tu proteína", type: "single", choices: [choice("Asada", "Costra de queso con carne asada.", { price: 75 }), choice("Pastor", "Costra de queso con carne al pastor.", { price: 70 }), choice("Campechana", "Costra de queso con carne campechana.", { price: 80 }), choice("Longaniza", "Costra de queso con longaniza.", { price: 70 }), choice("Arrachera", "Costra de queso con arrachera.", { price: 120 })] },
      { id: "complementos", label: "¿Cómo la quieres?", type: "single", choices: toppings }
    ]);
  }

  if (id === "mulita") {
    return replaceOptions([
      { id: "proteina", label: "Elige tu proteína", type: "single", choices: [choice("Asada", "Mulita de asada entre dos costras de queso.", { price: 90 }), choice("Pastor", "Mulita de pastor entre dos costras de queso.", { price: 85 }), choice("Campechana", "Mulita campechana entre dos costras de queso.", { price: 95 }), choice("Longaniza", "Mulita de longaniza entre dos costras de queso.", { price: 85 }), choice("Arrachera", "Mulita de arrachera entre dos costras de queso.", { price: 135 })] },
      { id: "complementos", label: "¿Cómo la quieres?", type: "single", choices: toppings }
    ]);
  }

  if (id === "volcan") {
    return replaceOptions([
      { id: "presentacion", label: "Elige tu volcán", type: "single", choices: [choice("Asada · individual", "Volcán de asada por pieza.", { price: 25 }), choice("Asada · orden", "Orden de volcanes de asada.", { price: 120 }), choice("Campechana · individual", "Volcán campechano por pieza.", { price: 28 }), choice("Campechana · orden", "Orden de volcanes campechanos.", { price: 120 }), choice("Pastor · individual", "Volcán de pastor por pieza.", { price: 23 }), choice("Pastor · orden", "Orden de volcanes de pastor.", { price: 100 }), choice("Lanchitas · individual", "Volcán lanchitas por pieza.", { price: 28 }), choice("Lanchitas · orden", "Orden de volcanes lanchitas.", { price: 120 })] },
      { id: "complementos", label: "¿Cómo los quieres?", type: "single", choices: toppings }
    ]);
  }

  if (id === "tlayoyo-ranchero") {
    return replaceOptions([
      { id: "proteina", label: "Elige proteína para tu orden de 3", type: "single", choices: [choice("Asada", "Orden de 3 tlayoyos rancheros con asada.", { price: 85 }), choice("Pastor", "Orden de 3 tlayoyos rancheros con pastor.", { price: 70 }), choice("Campechano", "Orden de 3 tlayoyos rancheros con campechano.", { price: 75 }), choice("Arrachera", "Orden de 3 tlayoyos rancheros con arrachera.", { price: 140 })] },
      { id: "salsa", label: "Salsa", type: "single", choices: [choice("Salsa roja", "Salsa roja de la casa."), choice("Salsa verde", "Salsa verde de la casa.")] },
      { id: "lacteos", label: "Queso y crema", type: "single", choices: [choice("Queso y crema", "Se termina con queso fresco y crema."), choice("Solo crema", "Se termina únicamente con crema."), choice("Solo queso", "Se termina únicamente con queso fresco.")] }
    ]);
  }

  if (id === "tostada") {
    return replaceOptions([
      { id: "proteina", label: "Elige tu proteína", type: "single", choices: [choice("Asada", "Tostada con asada.", { price: 70 }), choice("Campechana", "Tostada con campechano.", { price: 75 }), choice("Pastor", "Tostada con pastor.", { price: 65 }), choice("Longaniza", "Tostada con longaniza.", { price: 65 }), choice("Arrachera", "Tostada con arrachera.", { price: 115 })] },
      { id: "complementos", label: "¿Cómo la quieres?", type: "single", choices: toppings }
    ]);
  }

  if (category === "Queso Fundido") {
    return replaceOptions([{
      id: "proteina", label: "Preparación de queso fundido", type: "single", choices: [
        choice("Natural", "Queso fundido servido en sartén de hierro fundido.", { price: 90 }),
        choice("Con asada", "Queso fundido con carne asada.", { price: 110 }),
        choice("Campechana", "Queso fundido con preparación campechana.", { price: 115 }),
        choice("Longaniza", "Queso fundido con longaniza.", { price: 100 }),
        choice("Pastor", "Queso fundido con carne al pastor.", { price: 105 }),
        choice("Arrachera", "Queso fundido con arrachera.", { price: 165 }),
        choice("Chistorra", "Queso fundido con chistorra.", { price: 165 })
      ]
    }, {
      id: "tortilla", label: "Tortilla para acompañar", type: "single", choices: [
        choice("Tortilla de maíz", "Acompañado con tortilla de maíz."),
        choice("Tortilla de harina", "Acompañado con tortilla de harina.")
      ]
    }]);
  }

  if (id === "tutano") {
    return replaceOptions([{
      id: "presentacion", label: "Elige tu presentación", type: "single", choices: [
        choice("Individual · en su hueso", "Médula asada en su hueso.", { price: 100 }),
        choice("Individual · con asada", "Médula asada en su hueso con asada.", { price: 120 }),
        choice("Individual · con arrachera", "Médula asada en su hueso con arrachera.", { price: 150 }),
        choice("Orden de 3 · en su hueso", "Tres tuétanos asados para compartir.", { price: 240 }),
        choice("Orden de 3 · con asada", "Tres tuétanos con carne asada.", { price: 280 }),
        choice("Orden de 3 · con arrachera", "Tres tuétanos con arrachera.", { price: 320 })
      ]
    }]);
  }

  if (id === "costillas-asadas") {
    return replaceOptions([{ id: "salsa", label: "Salsa para tus costillas", type: "single", choices: [choice("BBQ", "Salsa BBQ dulce y ahumada."), choice("Mango habanero", "Dulce, frutal y con picor de habanero."), choice("Chiltepin", "Picor seco y aromático de chiltepín."), choice("A la diabla", "Salsa intensa y picosita de la casa.")] }]);
  }

  if (category === "Molcajetes") {
    const mixed = id === "molcajete-mixto";
    return {
      ...replaceOptions([{
        id: "salsa", label: "Salsa", type: "single", choices: [
          choice("Salsa roja", "Salsa roja de la casa para acompañar el molcajete."),
          choice("Salsa verde", "Salsa verde de la casa para acompañar el molcajete.")
        ]
      }]),
      description: mixed
        ? "Molcajete mixto acompañado de arrachera, lomo adobado, pechuga y sirloin; incluye cebollas asadas, nopal y queso."
        : "Molcajete de arrachera con cebollas asadas, nopal y queso; elige salsa roja o verde."
    };
  }

  if (id === "pollo-carbon" || id === "alitas") {
    return replaceOptions([
      { id: "salsa", label: "Salsa", type: "single", choices: [choice("Adobado", "Adobo de la casa cocinado al carbón."), choice("BBQ", "Salsa BBQ dulce y ahumada."), choice("Mango habanero", "Dulce, frutal y con picor de habanero."), choice("Chiltepin", "Picor seco y aromático de chiltepín."), choice("A la diabla", "Salsa intensa y picosita de la casa.")] },
      ...(id === "pollo-carbon" ? [cutOptions[1]] : [])
    ]);
  }

  if (category === "Hamburguesas" && id.startsWith("extra-")) return { ...item, available: false };

  if (category === "Hamburguesas") {
    return replaceOptions([
      { id: "guacamole", label: "Guacamole", type: "single", choices: [choice("Con guacamole", "Guacamole de la casa; su preparación lleva picante."), choice("Sin guacamole", "Se sirve sin guacamole.")] },
      { id: "extras", label: "Extras para tu hamburguesa", type: "multiple", choices: burgerExtras }
    ]);
  }

  if (id === "papas-cambray") {
    return replaceOptions([
      { id: "preparacion", label: "¿Cómo quieres tus papas?", type: "single", choices: [choice("Con chiltepín", "Papas cambray con chiltepín."), choice("Al parmesano", "Papas cambray con queso parmesano."), choice("A la mantequilla", "Papas cambray salteadas a la mantequilla.")] }
    ]);
  }

  if (id === "gramaje-asada-campechano") {
    return replaceOptions([
      { id: "carne", label: "Elige tu carne", type: "single", choices: [choice("Asada", "Carne asada al carbón."), choice("Campechano", "Preparación campechana al carbón.")] },
      { id: "gramaje", label: "Elige la cantidad", type: "single", choices: [choice("1 kg", "Porción para compartir.", { price: 450 }), choice("1/2 kg", "Porción de 500 gramos.", { price: 250 }), choice("1/4 kg", "Porción de 250 gramos.", { price: 170 })] }
    ]);
  }

  if (id === "gramaje-pastor") return replaceOptions([{ id: "gramaje", label: "Elige la cantidad", type: "single", choices: [choice("1 kg", "Porción para compartir.", { price: 360 }), choice("1/2 kg", "Porción de 500 gramos.", { price: 200 }), choice("1/4 kg", "Porción de 250 gramos.", { price: 140 })] }]);

  if (id === "gramaje-arrachera") {
    return replaceOptions([
      { id: "gramaje", label: "Elige la cantidad", type: "single", choices: [choice("1 kg", "Porción para compartir.", { price: 645 }), choice("1/2 kg", "Porción de 500 gramos.", { price: 345 }), choice("1/4 kg", "Porción de 250 gramos.", { price: 195 })] },
      { id: "termino", label: "Término de la arrachera", type: "single", choices: cutOptions[0].choices }
    ]);
  }

  if (["birria", "quesabirrias"].includes(id)) {
    const isQuesabirria = id === "quesabirrias";
    return replaceOptions([
      { id: "presentacion", label: "Elige tu presentación", type: "single", choices: [choice("Individual", isQuesabirria ? "Quesabirria por pieza; puedes agregar las que quieras." : "Taco de birria por pieza; puedes agregar los que quieras.", { price: 46 }), choice("Orden de 3", isQuesabirria ? "Orden de 3 quesabirrias." : "Orden de 3 tacos de birria.", { price: isQuesabirria ? 140 : 125 })] },
      { id: "complementos", label: "¿Cómo los quieres?", type: "single", choices: birriaToppings }
    ]);
  }

  if (category === "Birria") return replaceOptions([]);

  if (["orden-asada", "orden-campechano", "orden-pastor"].includes(id)) return { ...item, available: false };

  if (/^(taco-|orden-|costra-|volcan-|tostada-|especialidad-|roast-beef|aguja-nortena)/.test(id)) {
    const isBirria = category === "Birria" || /birria/.test(id);
    const priceMatch = String(item.price || "").match(/Orden\s*\$(\d+)\s*\/\s*c\/u\s*\$(\d+)/i);
    const tacoPrice = tacoPresentationById[id];
    const presentation = tacoPrice
      ? [pricedPresentation({ label: "Individual", price: tacoPrice[0], description: "Taco por pieza." }, { label: "Orden", price: tacoPrice[1], description: "Orden completa de tacos." })]
      : priceMatch
      ? [pricedPresentation({ label: "Individual", price: Number(priceMatch[2]), description: "Preparación por pieza." }, { label: "Orden", price: Number(priceMatch[1]), description: "Presentación completa de la carta." })]
      : [];
    const tacoCheesePrice = ["taco-asada", "taco-pastor"].includes(id) ? 60 : 50;
    const cheeseOptions = tacoPrice
      ? [{ id: "queso", label: "Queso", type: "single", choices: [choice("Sin queso", "Se sirve sin queso extra."), choice("Queso para un taco", "Queso extra para una pieza.", { priceDelta: 12 }), choice("Queso para la orden", "Queso extra para toda la orden.", { priceDelta: tacoCheesePrice })] }]
      : [];
    return {
      ...replaceOptions([...presentation, { id: "complementos", label: "Complementos", type: "single", choices: isBirria ? birriaToppings : toppings }, ...cheeseOptions]),
      name: tacoDisplayNameById[id] || item.name
    };
  }

  if (category === "Cortes" && /rib|pica|new-york|filete|arrachera-corte|tomahawk/i.test(id)) return replaceOptions(cutOptions);

  if (["coca-cola", "boing"].includes(id)) {
    return replaceOptions([{ id: "temperatura", label: "¿Cómo la quieres?", type: "single", choices: [choice("Al tiempo", "Bebida servida a temperatura ambiente."), choice("Fría", "Bebida servida fría.")] }]);
  }

  if (id === "malteadas") {
    return replaceOptions([{ id: "sabor", label: "Elige tu sabor", type: "single", choices: [choice("Fresa", "Malteada de fresa."), choice("Chocolate", "Malteada de chocolate.")] }]);
  }

  if (id === "jamaica-caliente") {
    return replaceOptions([{ id: "azucar", label: "Azúcar", type: "single", choices: [choice("Con azúcar", "Jamaica caliente endulzada."), choice("Sin azúcar", "Jamaica caliente sin azúcar.")] }]);
  }

  if (["paloma", "mojito"].includes(id)) return replaceOptions([{ id: "hielos", label: "Hielos", type: "single", choices: iceOptions }]);

  if (category === "Bebidas Frias" || category === "Mocktails" || /cocteler[ií]a de la casa/i.test(category) || category === "Internacional") return replaceOptions([]);

  return item;
};

const normalizeArray = (items = [], type = "products") =>
  Array.isArray(items)
    ? items.map((item) => {
        const base = {
          id: item.id || slugify(item.name),
          name: item.name || "",
          description: item.description || "",
          image: item.image || "",
          available: Boolean(item.available),
          options: Array.isArray(item.options)
            ? item.options.map((option) => ({
                id: option.id || slugify(option.label || "opcion"),
                label: option.label || "",
                type: option.type || "single",
                choices: Array.isArray(option.choices) ? option.choices.filter(Boolean).map((choiceItem) => normalizeChoice(choiceItem, option.id || slugify(option.label || "opcion"))) : []
              }))
            : []
        };

        if (type === "team") {
          return {
            ...base,
            role: item.role || "",
            instagram: item.instagram || "",
            facebook: item.facebook || ""
          };
        }

        return {
          ...base,
          price: item.price || "",
          category: item.category || "",
          tags: Array.isArray(item.tags) ? item.tags.filter(Boolean) : [],
          details: Array.isArray(item.details) ? item.details.filter(Boolean) : []
        };
      })
    : [];

const completeMenu = typeof window !== "undefined" && window.CTLR_COMPLETE_MENU ? window.CTLR_COMPLETE_MENU : {};
const breakfastMenu = typeof window !== "undefined" && window.CTLR_BREAKFAST_MENU ? window.CTLR_BREAKFAST_MENU : {};
const retiredBaseProductIds = new Set([
  "tutano-extra", "tutano-hueso", "tutano-asada", "tutano-arrachera",
  "costra-asada", "costra-campechana", "costra-pastor", "costra-longaniza", "costra-arrachera",
  "mulita-asada", "mulita-campechana", "mulita-pastor", "mulita-longaniza", "mulita-arrachera",
  "volcan-asada", "volcan-campechana", "volcan-pastor", "volcan-lanchitas",
  "tayoyo-asada", "tayoyo-pastor", "tayoyo-campechano", "tayoyo-arrachera",
  "tostada-asada", "tostada-campechana", "tostada-pastor", "tostada-longaniza", "tostada-arrachera",
  "orden-birria", "taco-birria", "orden-quesabirrias", "taco-quesabirria",
  "queso-fundido-natural", "queso-fundido-asada", "queso-fundido-campechana", "queso-fundido-longaniza", "queso-fundido-pastor", "queso-fundido-arrachera", "queso-fundido-chistorra",
  "asada-gramaje-1kg", "asada-gramaje-500", "asada-gramaje-250", "pastor-gramaje-1kg", "pastor-gramaje-500", "pastor-gramaje-250", "arrachera-gramaje-1kg", "arrachera-gramaje-500", "arrachera-gramaje-250",
  "tarro-helado", "tarro-michelado", "tarro-clamato"
]);
const canonicalBaseProductIds = new Set(["joya-parrilla", "arrachera-patron", "cazuela-ribeye", "macarrones-queso"]);

const mergeCatalogItems = (items = [], type = "products") => {
  const extras = [
    ...(Array.isArray(completeMenu[type]) ? completeMenu[type] : []),
    ...(Array.isArray(breakfastMenu[type]) ? breakfastMenu[type] : [])
  ];
  const merged = new Map();
  normalizeArray(extras, type).forEach((item) => merged.set(item.id, item));
  normalizeArray(items, type).forEach((item) => {
    if (retiredBaseProductIds.has(item.id)) return;
    if (type === "products" && canonicalBaseProductIds.has(item.id) && item.category === "Especialidades" && merged.has(item.id)) return;
    merged.set(item.id, item);
  });
  return Array.from(merged.values()).map(enrichMenuItem);
};

const normalizeCatalog = (catalog = {}) => ({
  version: 1,
  updatedAt: catalog.updatedAt || new Date().toISOString(),
  products: mergeCatalogItems(catalog.products, "products"),
  drinks: mergeCatalogItems(catalog.drinks, "drinks"),
  team: normalizeArray(catalog.team, "team")
});

const getStoredCatalog = () => {
  try {
    const stored = window.localStorage.getItem(CATALOG_KEY);
    return stored ? normalizeCatalog(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
};

const storeCatalog = (catalog) => {
  window.localStorage.setItem(CATALOG_KEY, JSON.stringify(normalizeCatalog(catalog)));
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(payload.error || "No se pudo completar la solicitud.");
  return payload;
};

const loadCatalog = async () => {
  try {
    if (isHttp()) {
      let catalog;
      try {
        catalog = normalizeCatalog(await fetchJson(`/api/catalog?ts=${Date.now()}`));
      } catch {
        catalog = normalizeCatalog(await fetchJson(`data/catalog.json?ts=${Date.now()}`));
      }
      storeCatalog(catalog);
      return catalog;
    }

    const seeded = normalizeCatalog(await fetchJson("data/catalog.json"));
    storeCatalog(seeded);
    return seeded;
  } catch {
    return getStoredCatalog() || emptyCatalog();
  }
};

const saveCatalog = async (catalog, token) => {
  const nextCatalog = normalizeCatalog({ ...catalog, updatedAt: new Date().toISOString() });

  if (isHttp()) {
    const saved = normalizeCatalog(
      await fetchJson("/api/catalog", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token
        },
        body: JSON.stringify(nextCatalog)
      })
    );
    storeCatalog(saved);
    return saved;
  }

  storeCatalog(nextCatalog);
  return nextCatalog;
};

const getVisibleItems = (items = []) => items.filter((item) => item.available);

const imgSrc = (item) => {
  const image = item.image || "";
  if (image && !/^assets\/menu-/.test(image)) return image;
  const drinkCategories = ["Bebidas Frias", "Bebidas Calientes", "Para Festejar", "Mocktails", "Postres", "Coctelería de la Casa", "Cocteleria de la Casa", "Internacional"];
  if (item.category === "Hamburguesas") return "assets/momento-hamburguesa.png";
  return drinkCategories.includes(item.category) ? "assets/momento-bebidas.png" : "assets/momento-brasa.png";
};

const hasOptions = (item) => Array.isArray(item.options) && item.options.some((option) => option.choices.length);

const tagMarkup = (tags = []) =>
  tags.length
    ? `<div class="tag-row">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>`
    : "";

const signatureCategories = new Set(["Cortes", "Entradas", "Esquites", "Hamburguesas", "Birria"]);
const isSignatureItem = (item) => signatureCategories.has(item.category) || /^tutano(?:-|$)/.test(item.id || "");

const productCardMarkup = (item, extraClass = "") => `
  <article class="catalog-card ${extraClass}" data-reveal>
    <figure>
      <img src="${escapeHtml(imgSrc(item))}" alt="${escapeHtml(item.name)}" loading="lazy">
    </figure>
    <div class="catalog-card-body">
      <div class="card-meta">
        <span>${escapeHtml(item.category || "Especial")}</span>
        <strong>${escapeHtml(item.price)}</strong>
      </div>
      ${isSignatureItem(item) ? '<span class="specialty-badge"><i aria-hidden="true">✦</i>Nuestra especialidad</span>' : ""}
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.description)}</p>
      ${tagMarkup(item.tags)}
      ${
        hasOptions(item)
          ? `<p class="option-hint">Personaliza: ${escapeHtml(item.options.map((option) => option.label).join(" · "))}</p>`
          : ""
      }
      <button class="card-add" type="button" data-add-item data-item-id="${escapeHtml(item.id)}" data-item-name="${escapeHtml(item.name)}" data-item-price="${escapeHtml(item.price)}" data-item-category="${escapeHtml(item.category || "Especial")}">${hasOptions(item) ? "Personalizar" : "Agregar a mi selección"} <span aria-hidden="true">+</span></button>
    </div>
  </article>
`;

const emptyMarkup = (message) => `
  <div class="empty-state" data-reveal>
    <p>${escapeHtml(message)}</p>
  </div>
`;

let menuIndex = 0;
let menuItems = [];
let menuTimer;
let lastCatalogHash = "";
let allOrderItems = [];
let breakfastOrderItems = [];
let revealObserver;
let activeOrderCategory = "Esquites";
let activeMenuCategory = "Esquites";
let activeBreakfastCategory = "Desayunos tradicionales";
let modalItem = null;
let modalEditingKey = "";

const breakfastCategoryOrder = ["Desayunos tradicionales", "Dulce comienzo", "Frescura por la mañana", "Bebidas desayuno", "Jugos", "Licuados", "Smoothies"];
const isBreakfastItem = (item = {}) => /^desayuno-/.test(String(item.id || "")) || breakfastCategoryOrder.includes(String(item.category || ""));
const menuServiceFor = (item = {}) => (isBreakfastItem(item) || item.service === "breakfast" ? "breakfast" : "evening");
const serviceLabel = (service) => (service === "breakfast" ? "Desayunos" : "Carbón y Brasas");

const restaurantClock = (date = new Date()) => {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Monterrey",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date);
    const value = (type) => parts.find((part) => part.type === type)?.value || "";
    return { minutes: Number(value("hour")) * 60 + Number(value("minute")), weekday: value("weekday") };
  } catch {
    return { minutes: date.getHours() * 60 + date.getMinutes(), weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()] };
  }
};

const serviceAvailability = (service, clock = restaurantClock()) => {
  const { minutes, weekday } = clock;
  const suggestedService = service === "breakfast" ? "evening" : "breakfast";
  const closedMessage = "Nuestro servicio opera de 8:30 AM a 11:00 PM. Te esperamos cuando iniciemos nuevamente.";

  if (minutes < 510 || minutes > 1380) {
    return { available: false, title: "En este momento estamos cerrados.", message: closedMessage, suggestedService: "" };
  }
  if (weekday === "Tue" && minutes < 840) {
    return {
      available: false,
      title: "Los martes reanudamos a las 2:00 PM.",
      message: "De 8:30 AM a 2:00 PM permanecemos cerrados para preparar el servicio. Gracias por ayudarnos a brindarte una mejor atención.",
      suggestedService: ""
    };
  }
  if (service === "evening" && minutes < 900) {
    return {
      available: false,
      title: "La brasa se enciende a las 3:00 PM.",
      message: "Las preparaciones al carbón están disponibles a partir de las 3:00 PM, como marca nuestro horario. Esto nos permite brindarte una mejor atención con nuestro personal.",
      suggestedService
    };
  }
  if (service === "breakfast" && minutes >= 900) {
    return {
      available: false,
      title: "El horario de desayunos terminó.",
      message: "Los desayunos se sirven de 8:30 AM a 3:00 PM. A esta hora ya está disponible nuestra carta al carbón.",
      suggestedService
    };
  }
  return { available: true, title: "", message: "", suggestedService: "" };
};

const closeServiceHoursNotice = () => {
  const notice = $("[data-service-hours-notice]");
  if (!notice) return;
  notice.hidden = true;
  notice.setAttribute("aria-hidden", "true");
  document.body.classList.remove("service-hours-open");
};

const showServiceHoursNotice = (availability) => {
  const notice = $("[data-service-hours-notice]");
  if (!notice) return;
  const title = $("[data-service-hours-title]", notice);
  const message = $("[data-service-hours-message]", notice);
  const preview = $("[data-service-hours-preview]", notice);
  const link = $("[data-service-hours-link]", notice);
  const requestedService = availability.requestedService || "evening";
  const suggestedService = availability.suggestedService;
  if (title) title.textContent = availability.title;
  if (message) message.textContent = availability.message;
  if (preview) {
    preview.href = requestedService === "breakfast" ? "#desayunos" : "#menu";
    preview.innerHTML = 'Visualizar carta <span aria-hidden="true">→</span>';
    preview.setAttribute("aria-label", requestedService === "breakfast" ? "Visualizar carta de desayunos" : "Visualizar carta al carbón");
  }
  if (link) {
    link.hidden = !suggestedService;
    link.href = suggestedService === "breakfast" ? "#desayunos" : "#menu";
    link.innerHTML = suggestedService === "breakfast"
      ? 'Ver carta de desayunos <span aria-hidden="true">→</span>'
      : 'Ver carta al carbón <span aria-hidden="true">→</span>';
  }
  notice.hidden = false;
  notice.setAttribute("aria-hidden", "false");
  document.body.classList.add("service-hours-open");
  window.setTimeout(() => $("[data-close-service-hours]", notice)?.focus(), 60);
};

const requestServiceAccess = (service) => {
  if (document.body?.dataset.page !== "home") return true;
  const availability = serviceAvailability(service);
  if (availability.available) return true;
  showServiceHoursNotice({ ...availability, requestedService: service });
  return false;
};

const playBreakfastSunrise = () => {
  const sunrise = $("[data-breakfast-sunrise]");
  if (!sunrise || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  window.clearTimeout(playBreakfastSunrise.timer);
  sunrise.classList.remove("is-playing");
  window.requestAnimationFrame(() => sunrise.classList.add("is-playing"));
  playBreakfastSunrise.timer = window.setTimeout(() => sunrise.classList.remove("is-playing"), 1480);
};

const categoryRules = {
  Todos: () => true,
  Entradas: (item) => entryIds.has(item.id),
  "Para botanear": (item) => item.category === "Entradas" && !entryIds.has(item.id),
  Esquites: (item) => item.category === "Esquites",
  Tradicionales: (item) => item.category === "Tradicionales",
  Birria: (item) => item.category === "Birria",
  "Queso fundido": (item) => item.category === "Queso Fundido",
  "Tuétanos": (item) => /^tutano(?:-|$)/.test(item.id),
  Cortes: (item) => item.category === "Cortes" && !/^tutano(?:-|$)/.test(item.id),
  Molcajetes: (item) => item.category === "Molcajetes",
  Gramaje: (item) => item.category === "Gramaje",
  Tacos: (item) => item.category === "Tacos",
  Hamburguesas: (item) => item.category === "Hamburguesas",
  "Bebidas frías": (item) => item.category === "Bebidas Frias",
  "Bebidas calientes": (item) => item.category === "Bebidas Calientes",
  "Para festejar": (item) => item.category === "Para Festejar",
  Mocktails: (item) => item.category === "Mocktails",
  Postres: (item) => item.category === "Postres",
  "Coctelería de la casa": (item) => /cocteler[ií]a de la casa/i.test(item.category || ""),
  Internacional: (item) => item.category === "Internacional"
};

const categoryCopy = {
  Todos: ["Carta completa", "Explora todas las opciones disponibles."],
  Entradas: ["Entradas", "Frijoles charros, sopa azteca, sopa de hongos y sopa de queso."],
  "Para botanear": ["Para botanear", "Papas, alitas, aros, chiles y antojos para compartir."],
  Esquites: ["Esquites y especialidades", "Esquites de la casa y platillos especiales, con extras para personalizar."],
  Tradicionales: ["Los tradicionales", "Costras, mulitas, volcanes, tlayoyos y tostadas."],
  Birria: ["Birria de la casa", "Consome, tacos y sabores de coccion lenta."],
  "Queso fundido": ["Queso fundido", "Elige natural o la proteína exacta de la carta."],
  "Tuétanos": ["Tuétanos", "Médula asada; cada preparación conserva sólo su proteína correspondiente."],
  Cortes: ["Cortes al carbón", "Elige el término y guarnición para tu corte."],
  Molcajetes: ["Molcajetes", "Elige salsa roja o verde; el mixto lleva arrachera, lomo adobado, pechuga y sirloin."],
  Gramaje: ["Carne por gramaje", "Elige la porción perfecta para compartir."],
  Tacos: ["Tacos", "Personaliza tus tacos con los complementos de tu preferencia."],
  Hamburguesas: ["Hamburguesas al carbon", "Guacamole de la casa con picante o sin guacamole, con extras dentro de cada hamburguesa."],
  "Bebidas frías": ["Bebidas frías", "Aguas frescas, refrescos y malteadas, servidas como las prefieres."],
  "Bebidas calientes": ["Bebidas calientes", "Café, té y sabores para una sobremesa cálida."],
  "Para festejar": ["Para festejar", "Cervezas y tarros preparados para brindar."],
  Mocktails: ["Mocktails", "Cocteles sin alcohol, frescos y preparados al momento."],
  Postres: ["Postres", "El final dulce para cerrar la experiencia."],
  "Coctelería de la casa": ["Coctelería de la casa", "Recetas de la casa para acompañar el fuego."],
  Internacional: ["Internacional", "Clásicos preparados con el carácter de la casa."]
};

const matchesCategory = (item, category) => (categoryRules[category] || categoryRules.Todos)(item);

const updateOrderFilterControls = () => {
  $$('[data-order-filter]').forEach((button) => {
    button.classList.toggle("is-active", button.dataset.orderFilter === activeOrderCategory);
  });
};

const updateMenuBook = (category) => {
  const book = $('[data-menu-book]');
  if (!book) return;
  const tab = $$('[data-menu-tab]', book).find((item) => item.dataset.menuFilter === category);
  const tabs = $$('[data-menu-tab]', book);
  tabs.forEach((item) => {
    const active = item === tab;
    item.classList.toggle("is-active", active);
    item.setAttribute("aria-selected", String(active));
  });
  const menuViews = {
    Todos: { image: "assets/menu-especialidades.png", title: "Carta completa", note: "Todo el sabor de Como Te Lo Recetaron: cocina al carbón, antojitos, bebidas y postres." },
    Birria: { image: "assets/menu-especialidades.png", title: "Birria de la casa", note: "Consomé, tacos y quesabirrias preparados a tu gusto." },
    Tacos: { image: "assets/menu-antojitos.png", title: "Antojitos y tacos", note: "Tacos y órdenes con los complementos que tú eliges." },
    Esquites: { image: "assets/menu-especialidades.png", title: "Esquites y especialidades", note: "Esquites de la casa y platillos especiales, con extras para personalizar." },
    Bebidas: { image: "assets/menu-bebidas.png", title: "Bebidas, postres y para festejar", note: "Aguas frescas, bebidas calientes, cervezas, mocktails y postres." },
    Cocteleria: { image: "assets/menu-cocteleria.png", title: "Coctelería de la casa", note: "Cocteles de la casa, internacionales y mocktails para acompañar el fuego." }
  };
  const view = tab
    ? { image: tab.dataset.menuImage, title: tab.dataset.menuTitle, note: tab.dataset.menuNote }
    : menuViews[category] || menuViews.Todos;

  const image = $('[data-menu-book-image]', book);
  const title = $('[data-menu-book-title]', book);
  const note = $('[data-menu-book-note]', book);
  if (image && image.getAttribute("src") !== view.image) {
    image.classList.add("is-switching");
    window.setTimeout(() => {
      image.src = view.image || image.src;
      image.alt = "Carta de " + (view.title || "Como Te Lo Recetaron");
      image.classList.remove("is-switching");
    }, 120);
  }
  if (title) title.textContent = view.title || "Carta de la casa";
  if (note) note.textContent = view.note || "Consulta nuestra seleccion de temporada.";
};

const renderFeaturedMenu = () => {
  const grid = $('[data-products-grid]');
  const copy = categoryCopy[activeMenuCategory] || categoryCopy.Todos;
  const kicker = $('[data-featured-menu-kicker]');
  const title = $('[data-featured-menu-title]');
  const count = $('[data-category-result-count]');
  const visible = allOrderItems.filter((item) => matchesCategory(item, activeMenuCategory));

  if (kicker) kicker.textContent = copy[0];
  if (title) title.textContent = copy[1];
  if (count) count.textContent = `${visible.length} ${visible.length === 1 ? "opción disponible" : "opciones disponibles"}`;
  if (grid) {
    grid.innerHTML = visible.length
      ? visible.map((item) => productCardMarkup(item, item.kind === "drink" ? "drink-card" : "")).join("")
      : emptyMarkup("No hay opciones disponibles en esta seccion por ahora.");
  }
  revealOnScroll();
};

const selectMenuCategory = (category) => {
  activeMenuCategory = category;
  activeOrderCategory = category;
  updateMenuBook(category);
  updateOrderFilterControls();
  renderFeaturedMenu();
  renderOrderGrid();
  const menuPanel = $("#menu");
  if (menuPanel) menuPanel.scrollTo({ top: 0, behavior: "smooth" });
};

const breakfastCategoryCopy = {
  "Desayunos tradicionales": ["Los tradicionales", "Chilaquiles, enfrijoladas, birria, molletes, enmoladas, antojitos, huevos y tortas."],
  "Dulce comienzo": ["Dulce comienzo", "Waffles y hotcakes para comenzar la mañana sin prisas."],
  "Frescura por la mañana": ["Frescura por la mañana", "Ensaladas completas, frescas y llenas de color."],
  "Bebidas desayuno": ["Bebidas", "Café, pan, aguas frescas y jarras para compartir."],
  Jugos: ["Jugos", "Jugos recién exprimidos y especialidades de la mañana."],
  Licuados: ["Licuados", "Fruta natural y el topping que prefieras."],
  Smoothies: ["Smoothies", "Bebidas frutales frías, suaves y refrescantes."],
  Todos: ["Carta de desayunos", "Todo el menú de la mañana, disponible de 8:30 AM a 3:00 PM."]
};

const updateBreakfastFilterControls = () => {
  $$('[data-breakfast-filter]').forEach((button) => {
    button.classList.toggle("is-active", button.dataset.breakfastFilter === activeBreakfastCategory);
  });
};

const renderBreakfastMenu = () => {
  const grid = $('[data-breakfast-grid]');
  const copy = breakfastCategoryCopy[activeBreakfastCategory] || breakfastCategoryCopy.Todos;
  const kicker = $('[data-breakfast-menu-kicker]');
  const title = $('[data-breakfast-menu-title]');
  const count = $('[data-breakfast-result-count]');
  const visible = activeBreakfastCategory === "Todos"
    ? breakfastOrderItems
    : breakfastOrderItems.filter((item) => item.category === activeBreakfastCategory);

  if (kicker) kicker.textContent = copy[0];
  if (title) title.textContent = copy[1];
  if (count) count.textContent = `${visible.length} ${visible.length === 1 ? "opción disponible" : "opciones disponibles"}`;
  if (grid) {
    grid.innerHTML = visible.length
      ? visible.map((item) => productCardMarkup(item, item.kind === "drink" ? "drink-card" : "")).join("")
      : emptyMarkup("No hay opciones de desayunos en esta sección por ahora.");
  }
  revealOnScroll();
};

const selectBreakfastCategory = (category) => {
  activeBreakfastCategory = category;
  updateBreakfastFilterControls();
  renderBreakfastMenu();
};

const renderMechanism = () => {
  const stack = $("[data-mechanism-stack]");
  if (!stack) return;

  if (!menuItems.length) {
    stack.innerHTML = emptyMarkup("El menu estara disponible pronto.");
    return;
  }

  const visibleCards = Math.min(menuItems.length, 4);
  stack.innerHTML = Array.from({ length: visibleCards }, (_, depth) => {
    const item = menuItems[(menuIndex + depth) % menuItems.length];
    return `
      <article class="mechanism-card" style="--depth: ${depth}" data-depth="${depth}">
        <figure>
          <img src="${escapeHtml(imgSrc(item))}" alt="${escapeHtml(item.name)}" loading="${depth === 0 ? "eager" : "lazy"}">
        </figure>
        <div class="mechanism-copy">
          <div class="card-meta">
            <span>${escapeHtml(item.category || "Especial")}</span>
            <strong>${escapeHtml(item.price)}</strong>
          </div>
          <h3>${escapeHtml(item.name)}</h3>
          <p>${escapeHtml(item.description)}</p>
          ${tagMarkup(item.tags)}
        </div>
      </article>
    `;
  }).join("");
};

const moveMechanism = (direction) => {
  if (!menuItems.length) return;
  menuIndex = (menuIndex + direction + menuItems.length) % menuItems.length;
  renderMechanism();
};

const initMechanismControls = () => {
  $("[data-menu-prev]")?.addEventListener("click", () => moveMechanism(-1));
  $("[data-menu-next]")?.addEventListener("click", () => moveMechanism(1));
};


const initMenuBook = () => {
  const book = $('[data-menu-book]');
  if (!book) return;
  $$('[data-menu-tab]', book).forEach((tab) => {
    tab.addEventListener("click", () => selectMenuCategory(tab.dataset.menuFilter || "Todos"));
  });
};

const getSelection = () => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(SELECTION_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
};

const saveSelection = (items) => {
  window.localStorage.setItem(SELECTION_KEY, JSON.stringify(items));
  if (!items.length) window.localStorage.removeItem(ORDER_CONTACT_KEY);
};

const initOrderScrollCue = () => {
  const cue = $("[data-order-scroll-cue]");
  if (!cue) return;

  cue.addEventListener("click", (event) => {
    if (!requestServiceAccess("evening")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (!window.matchMedia("(max-width: 820px)").matches) return;
    const panel = $("#menu");
    const orderMenu = $("#ordenar-carta");
    if (!panel || !orderMenu) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    orderMenu.classList.add("is-visible");
    $$('[data-reveal]', orderMenu).forEach((item) => item.classList.add("is-visible"));
    // En móvil primero se muestran el título y los filtros: así el cliente puede
    // cambiar de sección antes de llegar a la primera tarjeta del catálogo.
    const orderTop = orderMenu.getBoundingClientRect().top - panel.getBoundingClientRect().top + panel.scrollTop;
    panel.scrollTo({ top: Math.max(0, orderTop - 92), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, { capture: true });
};

const selectionCount = (items) => items.reduce((total, item) => total + Number(item.qty || 1), 0);
const selectionService = (items = getSelection()) => (items.length ? menuServiceFor(items[0]) : "");

const moneyAmount = (value) => {
  const match = String(value || "").replace(/,/g, "").match(/\$\s*(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
};

const moneyLabel = (value) => Number.isFinite(value) ? `$${Math.round(value).toLocaleString("es-MX")}` : "Precio por confirmar";

const itemBasePrice = (item) => moneyAmount(item.price);

const getChosenOptions = (item, formData) =>
  item.options
    .flatMap((option) => {
      if (option.type === "multiple") {
        return formData
          .getAll(option.id)
          .map((selectedId) => option.choices.find((choiceItem) => choiceItem.id === String(selectedId)))
          .filter(Boolean)
          .map((selectedChoice) => ({ option, selectedChoice }));
      }
      const selectedId = String(formData.get(option.id) || "");
      const selectedChoice = option.choices.find((choiceItem) => choiceItem.id === selectedId) || option.choices[0];
      return selectedChoice ? [{ option, selectedChoice }] : [];
    })
    .filter(Boolean);

const selectedUnitPrice = (item, chosenOptions = []) => {
  let amount = itemBasePrice(item);
  chosenOptions.forEach(({ selectedChoice }) => {
    if (Number.isFinite(selectedChoice.price)) amount = selectedChoice.price;
    if (Number.isFinite(selectedChoice.priceDelta) && Number.isFinite(amount)) amount += selectedChoice.priceDelta;
  });
  return amount;
};

const optionSummary = (item) => {
  const parts = [];
  if (Array.isArray(item.options)) parts.push(...item.options.filter(Boolean));
  if (item.notes) parts.push(`Nota: ${item.notes}`);
  return parts.join(" / ");
};

const selectionKeyFor = (item) =>
  [menuServiceFor(item), item.id, ...(item.options || []), item.notes || ""].join("|").toLowerCase();

const addSelectionItem = (item) => {
  if (!requestServiceAccess(menuServiceFor(item))) return false;
  let items = getSelection();
  const incomingService = menuServiceFor(item);
  if (items.some((entry) => menuServiceFor(entry) !== incomingService)) {
    items = [];
    showToast(`Iniciamos una selección de ${serviceLabel(incomingService)} para no mezclar las dos cartas.`);
  }
  const key = selectionKeyFor(item);
  const quantity = Math.max(1, Math.min(20, Number(item.qty) || 1));
  const existing = items.find((entry) => selectionKeyFor(entry) === key);
  if (existing) existing.qty += quantity;
  else items.push({ ...item, qty: quantity });
  saveSelection(items);
  renderSelection();
  return true;
};

const renderSelection = () => {
  const items = getSelection();
  $$('[data-cart-count]').forEach((node) => {
    node.textContent = String(selectionCount(items));
  });

  const list = $('[data-cart-items]');
  const empty = $('[data-cart-empty]');
  const totalNode = $('[data-cart-total]');
  const summary = $('[data-cart-summary]');
  const serviceNode = $('[data-cart-service]');
  const orderButton = $('[data-send-selection]');
  if (!list) return;

  const total = items.reduce((sum, item) => {
    const value = Number.isFinite(Number(item.unitPrice)) ? Number(item.unitPrice) : moneyAmount(item.price);
    return Number.isFinite(value) ? sum + value * Number(item.qty || 1) : sum;
  }, 0);
  if (totalNode) totalNode.textContent = total ? moneyLabel(total) : "A confirmar";
  if (summary) {
    const count = selectionCount(items);
    summary.textContent = count
      ? `${count} ${count === 1 ? "platillo" : "platillos"} · ${total ? moneyLabel(total) : "total por confirmar"}`
      : "Tu selección está lista para personalizar.";
  }
  if (serviceNode) {
    const service = selectionService(items);
    serviceNode.textContent = service ? serviceLabel(service) : "";
    serviceNode.hidden = !service;
  }
  if (orderButton) orderButton.disabled = !items.length;

  list.innerHTML = items.length
    ? items
        .map(
          (item) => `
            <article class="cart-item">
              <div><span>${escapeHtml(item.category || "Especial")}</span><h3>${escapeHtml(item.name)}</h3><small>${escapeHtml(item.price || "")}</small>${optionSummary(item) ? `<p>${escapeHtml(optionSummary(item))}</p>` : ""}</div>
              <div class="cart-item-actions"><b>x${item.qty}</b><button class="cart-item-edit" type="button" data-edit-selection="${escapeHtml(selectionKeyFor(item))}" aria-label="Editar ${escapeHtml(item.name)}">Editar</button><button type="button" data-remove-selection="${escapeHtml(selectionKeyFor(item))}" aria-label="Quitar ${escapeHtml(item.name)}">−</button></div>
            </article>
          `
        )
        .join("")
    : `<div class="cart-empty-visual"><span>✦</span><p>Tu selección está vacía.</p></div>`;

  if (empty) empty.hidden = Boolean(items.length);
  syncReservationSelectionNotice();
};

const openCart = () => {
  const drawer = $('[data-cart-drawer]');
  if (!drawer) return;
  renderSelection();
  drawer.hidden = false;
  drawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("cart-open");
};

const closeCart = () => {
  const drawer = $('[data-cart-drawer]');
  if (!drawer) return;
  drawer.hidden = true;
  drawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("cart-open");
};

const continueChoosing = () => {
  const service = selectionService() || "evening";
  if (!requestServiceAccess(service)) return;
  closeCart();
  const menu = service === "breakfast" ? $("#desayunos") : $("#menu");
  const rail = document.body.dataset.page === "home" ? $("main") : null;
  if (menu && rail) rail.scrollTo({ left: menu.offsetLeft, behavior: "smooth" });
  else menu?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const selectionTotal = (items = getSelection()) =>
  items.reduce((sum, item) => sum + (Number.isFinite(Number(item.unitPrice)) ? Number(item.unitPrice) * Number(item.qty || 1) : 0), 0);

const syncReservationSelectionNotice = () => {
  const note = $("[data-order-reservation-note]");
  const summary = $("[data-order-reservation-summary]");
  const items = getSelection();
  if (!note) return;

  if (!items.length) {
    note.hidden = true;
    window.localStorage.removeItem(ORDER_CONTACT_KEY);
    return;
  }

  const count = selectionCount(items);
  const total = selectionTotal(items);
  if (summary) {
    summary.textContent = `${count} ${count === 1 ? "platillo sigue guardado" : "platillos siguen guardados"}${total ? ` · ${moneyLabel(total)}` : ""}.`;
  }
  note.hidden = false;
};

const closeCheckout = () => {
  const modal = $("[data-checkout-modal]");
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("checkout-open");
};

const updateCheckoutMode = (mode = "") => {
  const form = $("[data-checkout-form]");
  if (!form) return;
  const delivery = $("[data-checkout-delivery]", form);
  const pickup = $("[data-checkout-pickup]", form);
  const dineIn = $("[data-checkout-local]", form);
  const submit = $("[data-checkout-submit]", form);
  const name = form.elements.customerName;
  const phone = form.elements.phone;
  const address = form.elements.address;
  const hasChoice = Boolean(mode);
  $$('[data-checkout-dependent]', form).forEach((section) => {
    section.hidden = !hasChoice;
  });
  if (delivery) delivery.hidden = mode !== "delivery";
  if (pickup) pickup.hidden = mode !== "pickup";
  if (dineIn) dineIn.hidden = mode !== "dine-in";
  if (submit) submit.hidden = !hasChoice || mode === "dine-in";
  if (name) name.required = mode === "delivery" || mode === "pickup";
  if (phone) phone.required = mode === "delivery" || mode === "pickup";
  if (address) address.required = mode === "delivery";
  updatePaymentMethod(form.elements.paymentMethod?.value || "");
};

const updatePaymentMethod = (method = "") => {
  const form = $("[data-checkout-form]");
  if (!form) return;
  const cashPayment = $("[data-checkout-cash-payment]", form);
  const transferNote = $("[data-checkout-transfer-note]", form);
  const payment = form.elements.payment;
  const isCash = method === "Efectivo";
  const isTransfer = method === "Transferencia";
  if (cashPayment) cashPayment.hidden = !isCash;
  if (transferNote) transferNote.hidden = !isTransfer;
  if (payment && !isCash) payment.value = "";
};

const openCheckout = () => {
  const items = getSelection();
  if (!items.length) {
    showToast("Agrega al menos un platillo antes de continuar.");
    return;
  }
  if (!requestServiceAccess(selectionService(items))) return;
  const modal = $("[data-checkout-modal]");
  const form = $("[data-checkout-form]");
  if (!modal || !form) return;
  form.reset();
  const total = selectionTotal(items);
  const totalNode = $("[data-checkout-total]", modal);
  if (totalNode) totalNode.textContent = total ? moneyLabel(total) : "A confirmar";
  updateCheckoutMode("");
  closeCart();
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("checkout-open");
  window.setTimeout(() => (form.querySelector('input[name="fulfillment"]') || form.elements.customerName)?.focus(), 80);
};

const checkoutMessage = (items, total, details) => {
  const deliveryLabels = { delivery: "A domicilio", pickup: "Pasar por mi pedido" };
  const lines = [
    `Hola, quiero hacer este pedido de ${serviceLabel(selectionService(items))}:`,
    ...items.flatMap((item) => [
      `• ${item.qty} x ${item.name} (${item.price})`,
      optionSummary(item) ? `  ${optionSummary(item)}` : ""
    ]).filter(Boolean),
    total ? `Total estimado: ${moneyLabel(total)}` : "",
    "",
    `Cómo lo recibo: ${deliveryLabels[details.fulfillment] || "Por confirmar"}`,
    `A nombre de: ${details.name}`,
    `Teléfono: ${details.phone}`,
    details.fulfillment === "delivery" ? `Dirección: ${details.address || "Ubicación por confirmar"}` : "",
    details.fulfillment === "delivery" && details.location ? `Ubicación: ${details.location}` : "",
    details.fulfillment === "delivery" && details.reference ? `Referencia: ${details.reference}` : "",
    details.fulfillment === "delivery" && details.paymentMethod ? `Forma de pago: ${details.paymentMethod}` : "",
    details.fulfillment === "delivery" && details.paymentMethod === "Transferencia" ? "Solicito los datos de transferencia por este WhatsApp para realizar el pago." : "",
    details.fulfillment === "delivery" && details.paymentMethod === "Efectivo" && details.payment ? `Pago en efectivo con: ${details.payment}` : "",
    details.fulfillment === "pickup" ? "Entiendo que el tiempo estimado es de 10 a 15 minutos y espero su confirmación." : "",
    "",
    "¿Me confirman disponibilidad y el tiempo final de preparación?"
  ].filter(Boolean);
  return lines.join("\n");
};

const moveSelectionToReservation = (form) => {
  const data = new FormData(form);
  const pending = {
    name: String(data.get("customerName") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    createdAt: new Date().toISOString()
  };
  window.localStorage.setItem(ORDER_CONTACT_KEY, JSON.stringify(pending));
  closeCheckout();
  closeCart();
  const reservation = $("#reserva");
  const rail = document.body.dataset.page === "home" ? $("main") : null;
  if (reservation && rail) rail.scrollTo({ left: reservation.offsetLeft, behavior: "smooth" });
  else reservation?.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => {
    const reservationForm = $("[data-reservation-form]");
    if (reservationForm?.elements.name && !reservationForm.elements.name.value) reservationForm.elements.name.value = pending.name;
    if (reservationForm?.elements.phone && !reservationForm.elements.phone.value) reservationForm.elements.phone.value = pending.phone;
    syncReservationSelectionNotice();
    reservationForm?.elements.date?.focus();
  }, 520);
};

const shareCheckoutLocation = (button) => {
  const form = $("[data-checkout-form]");
  if (!form || !navigator.geolocation) {
    showToast("Tu navegador no puede compartir la ubicación. Escribe la dirección, por favor.");
    return;
  }
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Obteniendo ubicación...";
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const location = `https://maps.google.com/?q=${coords.latitude.toFixed(6)},${coords.longitude.toFixed(6)}`;
      form.elements.location.value = location;
      if (!form.elements.address.value.trim()) form.elements.address.value = "Ubicación compartida desde el teléfono.";
      button.disabled = false;
      button.textContent = "Ubicación agregada ✓";
      showToast("Ubicación agregada a tu pedido.");
    },
    () => {
      button.disabled = false;
      button.textContent = originalText;
      showToast("No pudimos obtener tu ubicación. Puedes escribir la dirección.");
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 }
  );
};

const closeItemModal = () => {
  const modal = $("[data-item-modal]");
  const form = $("[data-item-modal-form]");
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("item-modal-open");
  modalItem = null;
  modalEditingKey = "";
  form?.reset();
};

const openItemModal = (item, editingItem = null) => {
  if (!requestServiceAccess(menuServiceFor(item))) return;
  const modal = $("[data-item-modal]");
  const form = $("[data-item-modal-form]");
  if (!modal || !form) return;
  const options = $("[data-item-modal-options]", modal);
  if (!options) return;

  modalItem = item;
  modalEditingKey = editingItem ? selectionKeyFor(editingItem) : "";
  const chosenBeforeEditing = new Set(editingItem?.options || []);
  const optionWasPicked = (option, choiceItem) => chosenBeforeEditing.has(`${option.label}: ${choiceItem.label}`);
  $("[data-item-modal-category]", modal).textContent = item.category || "Menu";
  $("[data-item-modal-title]", modal).textContent = item.name || "";
  $("[data-item-modal-description]", modal).textContent = item.description || "";
  $("[data-item-modal-price]", modal).textContent = item.price || "Precio por confirmar";
  options.innerHTML = item.options
    .map(
      (option) => `
        <fieldset class="custom-option">
          <legend>${escapeHtml(option.label)}</legend>
          <p class="custom-option-prompt">Elige una opcion para preparar tu orden.</p>
          <div class="custom-option-choices">
          ${option.choices
            .map(
              (choiceItem, index) => {
                const checked = option.type === "multiple"
                  ? optionWasPicked(option, choiceItem)
                  : optionWasPicked(option, choiceItem) || (!option.choices.some((choice) => optionWasPicked(option, choice)) && index === 0);
                return `
                <label class="custom-option-choice">
                  <input type="${option.type === "multiple" ? "checkbox" : "radio"}" name="${escapeHtml(option.id)}" value="${escapeHtml(choiceItem.id)}" ${checked ? "checked" : ""}>
                  <span class="choice-check" aria-hidden="true"></span>
                  <span class="choice-copy"><b>${escapeHtml(choiceItem.label)}</b><small>${escapeHtml(choiceItem.description || "")}</small></span>
                  ${Number.isFinite(choiceItem.price) ? `<em>${escapeHtml(moneyLabel(choiceItem.price))}</em>` : Number.isFinite(choiceItem.priceDelta) && choiceItem.priceDelta ? `<em>+${escapeHtml(moneyLabel(choiceItem.priceDelta))}</em>` : ""}
                </label>
              `;
              }
            )
            .join("")}
          </div>
        </fieldset>
      `
    )
    .join("") || `<p class="item-modal-simple-note">Este producto no requiere una preparacion obligatoria. Si quieres, deja una nota para cocina antes de agregarlo.</p>`;

  if (form.elements.notes) form.elements.notes.value = editingItem?.notes || "";
  if (form.elements.quantity) form.elements.quantity.value = String(editingItem?.qty || 1);

  const updatePricePreview = () => {
    const amount = selectedUnitPrice(item, getChosenOptions(item, new FormData(form)));
    $("[data-item-modal-price]", modal).textContent = Number.isFinite(amount) ? `${moneyLabel(amount)} · precio de tu seleccion` : item.price || "Precio por confirmar";
  };
  form.onchange = updatePricePreview;
  updatePricePreview();

  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("item-modal-open");
};

const initSelection = () => {
  renderSelection();

  document.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-item]");
    const removeButton = event.target.closest("[data-remove-selection]");
    const editButton = event.target.closest("[data-edit-selection]");

    if (editButton) {
      const selectedItem = getSelection().find((item) => selectionKeyFor(item) === editButton.dataset.editSelection);
      const catalogItem = selectedItem && [...allOrderItems, ...breakfastOrderItems].find((item) => item.id === selectedItem.id && menuServiceFor(item) === menuServiceFor(selectedItem));
      if (selectedItem && catalogItem) openItemModal(catalogItem, selectedItem);
      else showToast("Este elemento ya no está disponible para editar.");
      return;
    }

    if (addButton) {
      const id = addButton.dataset.itemId;
      const catalogItem = [...allOrderItems, ...breakfastOrderItems].find((item) => item.id === id);
      if (catalogItem) {
        openItemModal(catalogItem);
        return;
      }
      const added = addSelectionItem({
        id,
        name: addButton.dataset.itemName,
        price: addButton.dataset.itemPrice,
        category: addButton.dataset.itemCategory,
        service: "evening",
        options: [],
        notes: ""
      });
      if (!added) return;
      addButton.classList.add("is-added");
      addButton.innerHTML = "Agregado · sumar otro <span aria-hidden=\"true\">+</span>";
      window.setTimeout(() => addButton.classList.remove("is-added"), 900);
    }

    if (removeButton) {
      const items = getSelection().flatMap((item) => {
        if (selectionKeyFor(item) !== removeButton.dataset.removeSelection) return [item];
        if (item.qty > 1) return [{ ...item, qty: item.qty - 1 }];
        return [];
      });
      saveSelection(items);
      renderSelection();
    }
  });

  $$('[data-open-cart]').forEach((button) => button.addEventListener("click", openCart));
  $$('[data-close-cart]').forEach((button) => button.addEventListener("click", closeCart));
  $('[data-continue-choosing]')?.addEventListener("click", continueChoosing);
  $$('[data-close-checkout]').forEach((button) => button.addEventListener("click", closeCheckout));
  $$('[data-close-item-modal]').forEach((button) => button.addEventListener("click", closeItemModal));
  $('[data-item-modal-form]')?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!modalItem) return;
    if (!requestServiceAccess(menuServiceFor(modalItem))) return;
    const data = new FormData(event.currentTarget);
    const chosenOptions = getChosenOptions(modalItem, data);
    const selectedOptions = chosenOptions.map(({ option, selectedChoice }) => `${option.label}: ${selectedChoice.label}`);
    const unitPrice = selectedUnitPrice(modalItem, chosenOptions);
    if (modalEditingKey) {
      saveSelection(getSelection().filter((item) => selectionKeyFor(item) !== modalEditingKey));
    }
    const added = addSelectionItem({
      id: modalItem.id,
      name: modalItem.name,
      price: Number.isFinite(unitPrice) ? moneyLabel(unitPrice) : modalItem.price,
      unitPrice,
      category: modalItem.category,
      service: menuServiceFor(modalItem),
      options: selectedOptions,
      notes: String(data.get("notes") || "").trim(),
      qty: Math.max(1, Math.min(20, Number(data.get("quantity")) || 1))
    });
    if (added) {
      closeItemModal();
      openCart();
    }
  });
  $('[data-clear-selection]')?.addEventListener("click", () => {
    saveSelection([]);
    renderSelection();
  });
  $('[data-send-selection]')?.addEventListener("click", openCheckout);
  $('[data-checkout-form]')?.addEventListener("change", (event) => {
    if (event.target.name === "fulfillment") updateCheckoutMode(event.target.value);
    if (event.target.name === "paymentMethod") updatePaymentMethod(event.target.value);
  });
  $('[data-share-location]')?.addEventListener("click", (event) => shareCheckoutLocation(event.currentTarget));
  $('[data-go-to-reservation]')?.addEventListener("click", () => moveSelectionToReservation($("[data-checkout-form]")));
  $('[data-checkout-form]')?.addEventListener("submit", (event) => {
    event.preventDefault();
    const items = getSelection();
    if (!items.length) {
      showToast("Agrega al menos un platillo antes de continuar.");
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    const fulfillment = String(data.get("fulfillment") || "");
    if (!fulfillment) {
      showToast("Elige cómo deseas recibir tu pedido.");
      return;
    }
    if (fulfillment === "dine-in") {
      moveSelectionToReservation(form);
      return;
    }
    const name = String(data.get("customerName") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const address = String(data.get("address") || "").trim();
    const location = String(data.get("location") || "").trim();
    if (!name || !phone || (fulfillment === "delivery" && !address && !location)) {
      showToast(fulfillment === "delivery" ? "Completa nombre, teléfono y dirección o ubicación." : "Completa tu nombre y teléfono para confirmar el pedido.");
      return;
    }
    const details = {
      fulfillment,
      name,
      phone,
      address,
      location,
      reference: String(data.get("reference") || "").trim(),
      paymentMethod: String(data.get("paymentMethod") || "").trim(),
      payment: String(data.get("payment") || "").trim()
    };
    const message = checkoutMessage(items, selectionTotal(items), details);
    window.open(`https://wa.me/528181681933?text=${encodeURIComponent(message)}`, "_blank", "noopener");
    closeCheckout();
    showToast("Abrimos WhatsApp con todos los detalles de tu pedido.");
  });
};

const reservationServiceForTime = (timeValue = "") => (timeValue && timeValue < "15:00" ? "breakfast" : "evening");

const syncReservationService = (timeValue = "") => {
  const note = $('[data-reservation-service-note]');
  const link = $('[data-reservation-service-link]');
  if (!note || !link) return;
  if (!timeValue) {
    note.textContent = "Elige una hora y te mostraremos la carta correspondiente.";
    link.hidden = true;
    return;
  }
  const service = reservationServiceForTime(timeValue);
  const breakfast = service === "breakfast";
  note.innerHTML = `<b>${breakfast ? "Desayunos" : "Carbón y Brasas"}</b> · ${breakfast ? "Tu horario es antes de las 3:00 PM; corresponde a la carta de la mañana." : "Tu horario es a partir de las 3:00 PM; corresponde a la carta al carbón."}`;
  link.href = breakfast ? "#desayunos" : "#menu";
  link.textContent = breakfast ? "Ver carta de desayunos" : "Ver carta al carbón";
  link.hidden = false;
};

const initReservation = () => {
  const form = $('[data-reservation-form]');
  if (!form) return;
  syncReservationSelectionNotice();
  try {
    const pending = JSON.parse(window.localStorage.getItem(ORDER_CONTACT_KEY) || "null");
    if (pending && typeof pending === "object") {
      if (form.elements.name && !form.elements.name.value) form.elements.name.value = String(pending.name || "");
      if (form.elements.phone && !form.elements.phone.value) form.elements.phone.value = String(pending.phone || "");
    }
  } catch {
    window.localStorage.removeItem(ORDER_CONTACT_KEY);
  }
  const dateInput = form.elements.date;
  if (dateInput) dateInput.min = new Date().toISOString().slice(0, 10);
  const timeInput = form.elements.time;
  syncReservationService(timeInput?.value || "");
  timeInput?.addEventListener("change", () => syncReservationService(timeInput.value));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const dateValue = String(data.get("date") || "");
    const timeValue = String(data.get("time") || "");
    const selectedDate = dateValue ? new Date(`${dateValue}T12:00:00`) : null;
    const isTuesday = selectedDate?.getDay() === 2;
    const reservationService = reservationServiceForTime(timeValue);

    if (isTuesday && timeValue && timeValue < "14:00") {
      window.alert("Los martes abrimos nuevamente a partir de las 2:00 PM. Elige un horario posterior, por favor.");
      return;
    }

    const reservation = {
      name: String(data.get("name") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      date: dateValue,
      time: timeValue,
      people: String(data.get("people") || "").trim(),
      area: String(data.get("area") || "").trim(),
      note: String(data.get("note") || "").trim()
    };
    const savedSelection = getSelection();
    const savedService = selectionService(savedSelection);
    if (savedSelection.length && savedService !== reservationService) {
      showToast(`Tu selección es de ${serviceLabel(savedService)}. Ajusta la hora o elige platillos de la carta correspondiente.`);
      return;
    }
    const includesSavedSelection = savedSelection.length > 0;
    const savedSelectionTotal = selectionTotal(savedSelection);
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.dataset.originalText = submitButton.textContent;
      submitButton.textContent = "Guardando solicitud...";
    }

    try {
      const saved = await fetchJson("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reservation)
      });
      if (saved.ok) showToast("Solicitud guardada. Te abriremos WhatsApp para confirmarla.");
    } catch (error) {
      window.localStorage.setItem("ctlr-last-reservation", JSON.stringify({ ...reservation, createdAt: new Date().toISOString() }));
      showToast("Prepararemos el mensaje por WhatsApp para confirmar tu reserva.");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = submitButton.dataset.originalText || "Solicitar por WhatsApp";
      }
    }

    const message = [
      "Hola, quiero reservar una mesa.",
      `Nombre: ${reservation.name}`,
      `WhatsApp: ${reservation.phone}`,
      `Fecha: ${reservation.date}`,
      `Hora: ${reservation.time}`,
      `Servicio: ${serviceLabel(reservationService)}`,
      `Personas: ${reservation.people}`,
      `Area preferida: ${reservation.area}`,
      reservation.note ? `Nota: ${reservation.note}` : "",
      savedSelection.length ? "Selección para consumir en el local:" : "",
      ...savedSelection.flatMap((item) => [
        savedSelection.length ? `• ${item.qty} x ${item.name} (${item.price})` : "",
        optionSummary(item) ? `  ${optionSummary(item)}` : ""
      ]),
      savedSelectionTotal ? `Total estimado de selección: ${moneyLabel(savedSelectionTotal)}` : ""
    ]
      .filter(Boolean)
      .join("\n");
    window.open(`https://wa.me/528181681933?text=${encodeURIComponent(message)}`, "_blank", "noopener");
    if (includesSavedSelection) window.localStorage.removeItem(ORDER_CONTACT_KEY);
  });
};


const renderOrderGrid = () => {
  const grid = $("[data-order-grid]");
  if (!grid) return;
  const visible = allOrderItems.filter((item) => matchesCategory(item, activeOrderCategory));
  grid.innerHTML = visible.length
    ? visible.map((item) => productCardMarkup(item, item.kind === "drink" ? "drink-card" : "")).join("")
    : emptyMarkup("No hay productos en esta categoria por ahora.");
  revealOnScroll();
};

const initOrderFilters = () => {
  $$('[data-order-filter]').forEach((button) => {
    button.addEventListener("click", () => selectMenuCategory(button.dataset.orderFilter || "Todos"));
  });
};

const initBreakfastFilters = () => {
  $$('[data-breakfast-filter]').forEach((button) => {
    button.addEventListener("click", () => selectBreakfastCategory(button.dataset.breakfastFilter || "Todos"));
  });
};

const renderPublicCatalog = (catalog) => {
  const products = getVisibleItems(catalog.products);
  const drinks = getVisibleItems(catalog.drinks);
  const team = getVisibleItems(catalog.team);

  const eveningProducts = products.filter((item) => !isBreakfastItem(item));
  const eveningDrinks = drinks.filter((item) => !isBreakfastItem(item));
  const breakfastProducts = products.filter(isBreakfastItem);
  const breakfastDrinks = drinks.filter(isBreakfastItem);

  menuItems = eveningProducts;
  allOrderItems = [
    ...eveningProducts.map((item) => ({ ...item, kind: "food", service: "evening" })),
    ...eveningDrinks.map((item) => ({ ...item, kind: "drink", service: "evening" }))
  ];
  breakfastOrderItems = [
    ...breakfastProducts.map((item) => ({ ...item, kind: "food", service: "breakfast" })),
    ...breakfastDrinks.map((item) => ({ ...item, kind: "drink", service: "breakfast" }))
  ];
  if (menuIndex >= menuItems.length) menuIndex = 0;
  renderMechanism();

  selectMenuCategory(activeMenuCategory);
  selectBreakfastCategory(activeBreakfastCategory);

  const drinksGrid = $("[data-drinks-grid]");
  if (drinksGrid) {
    drinksGrid.innerHTML = drinks.length
      ? drinks.map((item) => productCardMarkup(item, "drink-card")).join("")
      : emptyMarkup("No hay bebidas disponibles por ahora.");
  }

  renderOrderGrid();

  const teamGrid = $("[data-team-grid]");
  if (teamGrid) {
    teamGrid.innerHTML = team.length
      ? team
          .map(
            (member) => `
              <article class="team-card" data-reveal>
                <figure>
                  <img src="${escapeHtml(imgSrc(member))}" alt="${escapeHtml(member.name)}" loading="lazy">
                </figure>
                <div>
                  <span>${escapeHtml(member.role || "Equipo")}</span>
                  <h3>${escapeHtml(member.name)}</h3>
                  <p>${escapeHtml(member.description)}</p>
                  <div class="member-socials">
                    ${
                      member.facebook
                        ? `<a href="${escapeHtml(member.facebook)}" target="_blank" rel="noopener" aria-label="Facebook de ${escapeHtml(member.name)}">f</a>`
                        : ""
                    }
                    ${
                      member.instagram
                        ? `<a href="${escapeHtml(member.instagram)}" target="_blank" rel="noopener" aria-label="Instagram de ${escapeHtml(member.name)}">ig</a>`
                        : ""
                    }
                  </div>
                </div>
              </article>
            `
          )
          .join("")
      : emptyMarkup("El equipo estara disponible pronto.");
  }

  revealOnScroll();
};

const refreshPublicCatalog = async () => {
  const catalog = await loadCatalog();
  const hash = JSON.stringify(catalog);
  if (hash === lastCatalogHash) return;
  lastCatalogHash = hash;
  renderPublicCatalog(catalog);
};


const initHeader = () => {
  const header = $("[data-header]");
  const toggle = $("[data-nav-toggle]");
  const nav = $("[data-nav]");
  let frameId = 0;

  const updateHeader = () => {
    frameId = 0;
    header?.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  const scheduleHeaderUpdate = () => {
    if (!frameId) frameId = window.requestAnimationFrame(updateHeader);
  };

  document.addEventListener("scroll", scheduleHeaderUpdate, { capture: true, passive: true });
  updateHeader();

  toggle?.addEventListener("click", () => {
    const open = !document.body.classList.contains("nav-open");
    document.body.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });

  nav?.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      document.body.classList.remove("nav-open");
      toggle?.setAttribute("aria-expanded", "false");
    }
  });
};


const initWelcome = () => {
  const intro = $("[data-welcome-intro]");
  if (!intro) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dismiss = () => {
    if (intro.classList.contains("is-leaving")) return;
    intro.classList.add("is-leaving");
    window.setTimeout(() => intro.remove(), reducedMotion ? 80 : 560);
  };

  window.setTimeout(dismiss, reducedMotion ? 180 : 1650);
  intro.addEventListener("click", dismiss, { once: true });
  window.addEventListener("keydown", dismiss, { once: true });
};

const initServiceHoursNotice = () => {
  const notice = $("[data-service-hours-notice]");
  if (!notice) return;
  $$('[data-close-service-hours]', notice).forEach((button) => button.addEventListener("click", closeServiceHoursNotice));
  $("[data-service-hours-link]", notice)?.addEventListener("click", closeServiceHoursNotice);
  $("[data-service-hours-preview]", notice)?.addEventListener("click", closeServiceHoursNotice);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !notice.hidden) closeServiceHoursNotice();
  });
};

const initHorizontalRail = () => {
  const rail = document.body.dataset.page === "home" ? $("main") : null;
  if (!rail) return;

  rail.setAttribute("tabindex", "0");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const panels = Array.from(rail.children).filter((panel) => panel instanceof HTMLElement);
  const dial = $("[data-rail-dial]");
  const current = $("[data-rail-current]");
  const total = $("[data-rail-total]");
  const previousButton = $("[data-rail-prev]");
  const nextButton = $("[data-rail-next]");
  let lockedUntil = 0;
  let settleTimer;
  let railFrameId = 0;
  const navLinks = $$('[data-nav] a[href^="#"]');
  const panelLinks = $$('main a[href^="#"], [data-nav] a[href^="#"], .brand-lockup[href^="#"], [data-service-hours-link], [data-service-hours-preview]');

  if (total) total.textContent = String(panels.length).padStart(2, "0");

  const currentIndex = () => {
    const center = rail.scrollLeft + rail.clientWidth / 2;
    return panels.reduce(
      (best, panel, index) => (Math.abs(panel.offsetLeft + panel.offsetWidth / 2 - center) < Math.abs(panels[best].offsetLeft + panels[best].offsetWidth / 2 - center) ? index : best),
      0
    );
  };

  const updateDial = () => {
    const index = currentIndex();
    if (current) current.textContent = String(index + 1).padStart(2, "0");
    if (dial) dial.style.setProperty("--rail-progress", String((index + 1) / Math.max(panels.length, 1)));
    if (previousButton) previousButton.disabled = index <= 0;
    if (nextButton) nextButton.disabled = index >= panels.length - 1;
  };

  const goToPanel = (index, { guardService = false, sunrise = false } = {}) => {
    const next = panels[Math.max(0, Math.min(index, panels.length - 1))];
    if (!next) return;
    const nextService = next.id === "desayunos" ? "breakfast" : next.id === "menu" ? "evening" : "";
    if (guardService && nextService && !requestServiceAccess(nextService)) return;
    if (sunrise && next.id === "desayunos") playBreakfastSunrise();
    const start = rail.scrollLeft;
    const destination = next.offsetLeft;
    const distance = destination - start;
    if (Math.abs(distance) < 1) {
      updateDial();
      return;
    }

    window.cancelAnimationFrame(railFrameId);
    if (prefersReducedMotion) {
      rail.scrollLeft = destination;
      updateDial();
      return;
    }

    const compactScreen = window.matchMedia("(max-width: 820px)").matches;
    const duration = Math.min(Math.max(compactScreen ? 840 : 700, Math.abs(distance) * 0.72), compactScreen ? 1120 : 900);
    const startedAt = performance.now();
    lockedUntil = Date.now() + duration + 140;

    const step = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      rail.scrollLeft = start + distance * eased;
      if (progress < 1) railFrameId = window.requestAnimationFrame(step);
      else {
        railFrameId = 0;
        lockedUntil = Date.now() + 90;
        updateDial();
      }
    };
    railFrameId = window.requestAnimationFrame(step);
  };

  panelLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = $(link.getAttribute("href"));
      if (!target) return;
      event.preventDefault();
      const index = panels.indexOf(target);
      if (index >= 0) goToPanel(index, { guardService: !link.matches("[data-service-hours-preview]"), sunrise: target.id === "desayunos" });
      else target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    });
  });

  previousButton?.addEventListener("click", () => goToPanel(currentIndex() - 1, { guardService: true, sunrise: panels[currentIndex() - 1]?.id === "desayunos" }));
  nextButton?.addEventListener("click", () => goToPanel(currentIndex() + 1, { guardService: true, sunrise: panels[currentIndex() + 1]?.id === "desayunos" }));

  rail.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key) || event.target.closest("input, textarea, select, [contenteditable=\"true\"]")) return;
    event.preventDefault();
    const targetIndex = currentIndex() + (event.key === "ArrowRight" ? 1 : -1);
    goToPanel(targetIndex, { guardService: true, sunrise: panels[targetIndex]?.id === "desayunos" });
  });

  rail.addEventListener("scroll", () => {
    updateDial();
    if (railFrameId) return;
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
      if (!railFrameId && Date.now() >= lockedUntil) goToPanel(currentIndex());
    }, 240);
  }, { passive: true });

  updateDial();
  if (!("IntersectionObserver" in window)) return;
  const navigablePanels = panels.filter((panel) => panel.id);
  const observer = new IntersectionObserver(
    (entries) => {
      const active = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!active) return;
      navLinks.forEach((link) => {
        const current = link.getAttribute("href") === "#" + active.target.id;
        link.classList.toggle("is-current", current);
        if (current) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
    },
    { root: rail, threshold: 0.6 }
  );
  navigablePanels.forEach((panel) => observer.observe(panel));
};


const revealOnScroll = () => {
  const revealItems = $$("[data-reveal]");

  if (!("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -40px" }
    );
  }

  revealItems.forEach((item) => {
    if (!item.classList.contains("is-visible")) revealObserver.observe(item);
  });
};

const initPublic = async () => {
  initHeader();
  initWelcome();
  initOrderScrollCue();
  initServiceHoursNotice();
  initHorizontalRail();
  initMechanismControls();
  initMenuBook();
  initSelection();
  initReservation();
  initOrderFilters();
  initBreakfastFilters();
  await refreshPublicCatalog();
  menuTimer = window.setInterval(() => {
    if (!document.hidden) moveMechanism(1);
  }, 5200);
  window.setInterval(refreshPublicCatalog, REFRESH_MS);
  window.addEventListener("storage", (event) => {
    if (event.key === CATALOG_KEY) refreshPublicCatalog();
    if (event.key === SELECTION_KEY) renderSelection();
  });
};

const showToast = (message) => {
  const toast = $(".toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-active");
  window.setTimeout(() => toast.classList.remove("is-active"), 2600);
};

const getToken = () => window.sessionStorage.getItem(TOKEN_KEY) || "";
const setToken = (token) => window.sessionStorage.setItem(TOKEN_KEY, token);
const clearToken = () => window.sessionStorage.removeItem(TOKEN_KEY);

const checkAdminToken = async (token) => {
  if (!isHttp()) return Boolean(token);
  await fetchJson("/api/admin-check", {
    method: "POST",
    headers: { "X-Admin-Token": token }
  });
  return true;
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const uploadImage = async (file, token) => {
  if (!file) return "";
  const dataUrl = await fileToDataUrl(file);

  if (!isHttp()) return dataUrl;

  const payload = await fetchJson("/api/upload-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": token
    },
    body: JSON.stringify({ filename: file.name, dataUrl })
  });
  return payload.url;
};

const adminState = {
  catalog: emptyCatalog(),
  activePanel: "products"
};

const getCollection = (type) => adminState.catalog[type] || [];

const setCollection = (type, items) => {
  adminState.catalog = normalizeCatalog({
    ...adminState.catalog,
    [type]: items,
    updatedAt: new Date().toISOString()
  });
};

const parseTags = (value) =>
  String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

const parseOptions = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return [];
  const options = JSON.parse(raw);
  if (!Array.isArray(options)) throw new Error("Las preparaciones deben ser una lista JSON válida.");
  return options;
};

const serializeAdminForm = async (form, type) => {
  const formData = new FormData(form);
  const file = formData.get("imageFile");
  const uploadedImage = file && file.size ? await uploadImage(file, getToken()) : "";
  const base = {
    id: formData.get("id") || slugify(formData.get("name")),
    name: String(formData.get("name") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    image: uploadedImage || String(formData.get("image") || "").trim(),
    available: formData.get("available") === "on"
  };

  if (type === "team") {
    return {
      ...base,
      role: String(formData.get("role") || "").trim(),
      facebook: String(formData.get("facebook") || "").trim(),
      instagram: String(formData.get("instagram") || "").trim()
    };
  }

  return {
    ...base,
    price: String(formData.get("price") || "").trim(),
    category: String(formData.get("category") || "").trim(),
    tags: parseTags(formData.get("tags")),
    options: parseOptions(formData.get("options"))
  };
};

const resetAdminForm = (type) => {
  const form = $(`[data-admin-form="${type}"]`);
  if (!form) return;
  form.reset();
  form.elements.id.value = "";
  if (form.elements.available) form.elements.available.checked = true;
  $(`[data-admin-panel="${type}"] .admin-panel-heading h2`).textContent =
    type === "team" ? "Integrantes" : type === "drinks" ? "Bebidas" : "Productos";
};

const fillAdminForm = (type, item) => {
  const form = $(`[data-admin-form="${type}"]`);
  if (!form) return;
  form.elements.id.value = item.id;
  form.elements.name.value = item.name || "";
  form.elements.description.value = item.description || "";
  form.elements.image.value = item.image || "";
  form.elements.available.checked = Boolean(item.available);

  if (type === "team") {
    form.elements.role.value = item.role || "";
    form.elements.facebook.value = item.facebook || "";
    form.elements.instagram.value = item.instagram || "";
  } else {
    form.elements.price.value = item.price || "";
    form.elements.category.value = item.category || "";
    form.elements.tags.value = (item.tags || []).join(", ");
    form.elements.options.value = item.options?.length ? JSON.stringify(item.options, null, 2) : "";
  }

  form.scrollIntoView({ behavior: "smooth", block: "center" });
};

const renderAdminList = (type) => {
  const list = $(`[data-admin-list="${type}"]`);
  if (!list) return;

  const items = getCollection(type);
  if (!items.length) {
    list.innerHTML = emptyMarkup("No hay elementos en esta seccion.");
    return;
  }

  list.innerHTML = items
    .map(
      (item) => `
        <article class="admin-item">
          <img src="${escapeHtml(imgSrc(item))}" alt="${escapeHtml(item.name)}" loading="lazy">
          <div>
            <span class="${item.available ? "status-on" : "status-off"}">${item.available ? "Disponible" : "Oculto"}</span>
            <h3>${escapeHtml(item.name)}</h3>
            <p>${escapeHtml(type === "team" ? item.role : `${item.category || "Sin categoria"} / ${item.price || "Sin precio"}`)}</p>
          </div>
          <div class="admin-item-actions">
            <button class="btn btn-secondary" type="button" data-edit-item="${escapeHtml(item.id)}" data-type="${type}">Editar</button>
            <button class="btn btn-quiet" type="button" data-delete-item="${escapeHtml(item.id)}" data-type="${type}">Eliminar</button>
          </div>
        </article>
      `
    )
    .join("");
};

const renderAdmin = () => {
  ["products", "drinks", "team"].forEach(renderAdminList);
};

const persistAdminCatalog = async (message = "Cambios guardados.") => {
  adminState.catalog = await saveCatalog(adminState.catalog, getToken());
  renderAdmin();
  showToast(message);
};

const switchAdminPanel = (panel) => {
  adminState.activePanel = panel;
  $$(".admin-tab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.adminTab === panel));
  $$(".admin-panel").forEach((node) => node.classList.toggle("is-active", node.dataset.adminPanel === panel));
};

const bindAdminEvents = () => {
  $$(".admin-tab").forEach((button) => {
    button.addEventListener("click", () => switchAdminPanel(button.dataset.adminTab));
  });

  $$("[data-reset-form]").forEach((button) => {
    button.addEventListener("click", () => resetAdminForm(button.dataset.resetForm));
  });

  $$("[data-admin-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const type = form.dataset.adminForm;
      try {
        const item = await serializeAdminForm(form, type);
        const items = getCollection(type);
        const index = items.findIndex((entry) => entry.id === item.id);
        const nextItems = index >= 0 ? items.map((entry) => (entry.id === item.id ? item : entry)) : [item, ...items];
        setCollection(type, nextItems);
        await persistAdminCatalog(index >= 0 ? "Elemento actualizado." : "Elemento creado.");
        resetAdminForm(type);
      } catch (error) {
        showToast(error.message || "No se pudo guardar.");
      }
    });
  });

  document.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-item]");
    const deleteButton = event.target.closest("[data-delete-item]");

    if (editButton) {
      const type = editButton.dataset.type;
      const item = getCollection(type).find((entry) => entry.id === editButton.dataset.editItem);
      if (item) fillAdminForm(type, item);
    }

    if (deleteButton) {
      const type = deleteButton.dataset.type;
      const item = getCollection(type).find((entry) => entry.id === deleteButton.dataset.deleteItem);
      if (!item || !window.confirm(`Eliminar "${item.name}"?`)) return;
      setCollection(
        type,
        getCollection(type).filter((entry) => entry.id !== item.id)
      );
      try {
        await persistAdminCatalog("Elemento eliminado.");
      } catch (error) {
        showToast(error.message || "No se pudo eliminar.");
      }
    }
  });

  $("[data-export-catalog]")?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(adminState.catalog, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `catalogo-ctlr-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });

  $("[data-import-catalog]")?.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      adminState.catalog = normalizeCatalog(JSON.parse(text));
      await persistAdminCatalog("Catalogo importado.");
    } catch (error) {
      showToast(error.message || "No se pudo importar.");
    }
    event.target.value = "";
  });

  $("[data-refresh-catalog]")?.addEventListener("click", async () => {
    adminState.catalog = await loadCatalog();
    renderAdmin();
    showToast("Datos recargados.");
  });

  $("[data-admin-logout]")?.addEventListener("click", () => {
    clearToken();
    window.location.reload();
  });
};

const showAdminApp = async () => {
  $("[data-admin-login]")?.setAttribute("hidden", "");
  $("[data-admin-app]")?.removeAttribute("hidden");
  adminState.catalog = await loadCatalog();
  renderAdmin();
};

const initAdmin = async () => {
  bindAdminEvents();
  const storedToken = getToken();
  if (storedToken) {
    try {
      await checkAdminToken(storedToken);
      await showAdminApp();
      return;
    } catch {
      clearToken();
    }
  }

  const form = $("[data-admin-auth]");
  const message = $("[data-admin-auth-message]");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = String(new FormData(form).get("token") || "").trim();
    try {
      await checkAdminToken(token);
      setToken(token);
      await showAdminApp();
    } catch (error) {
      if (message) message.textContent = error.message || "Clave incorrecta.";
    }
  });
};

document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("is-ready");

  if (document.body.dataset.page === "admin") {
    initAdmin();
    return;
  }

  initPublic();
});
