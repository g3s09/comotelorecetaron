/* Carta de desayunos. Se mantiene separada de la carta al carbón y puede
   actualizarse desde el panel una vez que se guarde el catálogo. */
const CTLR_BREAKFAST_MENU = (() => {
  const image = {
    tradicionales: "assets/menu-entradas.png",
    dulce: "assets/momento-bebidas.png",
    frescura: "assets/momento-brasa.png",
    bebidas: "assets/menu-bebidas.png",
    jugos: "assets/momento-bebidas.png"
  };

  const choice = (label, description, price = null) => ({ label, description, ...(Number.isFinite(price) ? { price } : {}) });
  const item = (id, name, description, price, category, photo, options = [], tags = []) => ({
    id, name, description, price, category, image: image[photo], available: true, options, tags
  });
  const breakfastTag = ["Incluye fruta y café refill"];
  const proteinChoices = (prices, noun) => [
    choice("Clásicos", `${noun} en su preparación clásica.`, prices.clasicos),
    choice("Con birria", `${noun} con birria de brisket y costilla.`, prices.birria),
    choice("Con arrachera", `${noun} con arrachera a la plancha.`, prices.arrachera),
    choice("Con huevo al gusto", `${noun} con huevo preparado al gusto.`, prices.huevo),
    choice("Con pechuga al grill", `${noun} con pechuga marcada al grill.`, prices.pechuga)
  ];

  return {
    products: [
      item("desayuno-chilaquiles", "Chilaquiles", "Rojos o verdes, pídelos a tu gusto: crujientes o aguados.", "Desde $90", "Desayunos tradicionales", "tradicionales", [
        { id: "preparacion", label: "Elige tu preparación", type: "single", choices: [choice("Clásicos", "Chilaquiles de la casa.", 90), choice("Con arrachera", "Chilaquiles con arrachera.", 140), choice("Birriaquiles", "Chilaquiles con birria.", 140), choice("Con huevo al gusto", "Chilaquiles con huevo preparado al gusto.", 120), choice("Con pechuga al grill", "Chilaquiles con pechuga al grill.", 140)] },
        { id: "salsa", label: "Salsa", type: "single", choices: [choice("Salsa roja", "Salsa roja de la casa."), choice("Salsa verde", "Salsa verde de la casa.")] },
        { id: "textura", label: "Textura", type: "single", choices: [choice("Crujientes", "Se sirven conservando su textura crujiente."), choice("Aguados", "Se sirven bien bañados en salsa.")] }
      ], breakfastTag),
      item("desayuno-enfrijoladas", "Enfrijoladas", "Tres dobladitas de maíz rellenas de la proteína elegida, bañadas en salsa de frijol con crema, queso, cebollita, cilantro y aguacate.", "Desde $90", "Desayunos tradicionales", "tradicionales", [
        { id: "preparacion", label: "Elige tu preparación", type: "single", choices: [choice("Clásicas", "Enfrijoladas clásicas.", 90), choice("Con pechuga al grill", "Con pechuga marcada al grill.", 140), choice("Con arrachera", "Con arrachera a la plancha.", 140), choice("Con huevo", "Con huevo.", 120)] }
      ], breakfastTag),
      item("desayuno-birria", "Birria para desayunar", "Carne de brisket y costilla de res horneada a las brasas, servida como más se te antoje.", "Desde $60", "Desayunos tradicionales", "tradicionales", [
        { id: "presentacion", label: "Elige tu presentación", type: "single", choices: [choice("Quesabirrias", "Quesabirrias de birria.", 130), choice("Orden de birria", "Orden de birria de la casa.", 115), choice("Burrito", "Burrito de birria.", 135), choice("Consomé con carne", "Consomé servido con carne de birria.", 100), choice("Consomé", "Consomé tradicional.", 60)] }
      ], breakfastTag),
      item("desayuno-molletes", "Molletes especiales", "Tres crujientes mitades de pan con mantequilla de ajo y romero, frijoles refritos y queso manchego gratinado.", "Desde $110", "Desayunos tradicionales", "tradicionales", [
        { id: "preparacion", label: "Elige tu preparación", type: "single", choices: proteinChoices({ clasicos: 110, birria: 145, arrachera: 145, huevo: 125, pechuga: 145 }, "Molletes") }
      ], breakfastTag),
      item("desayuno-enmoladas", "Enmoladas", "Tres tortillas de maíz bañadas en mole serrano, con salsa de la casa roja o verde, guacamole, queso, cilantro y cebollita.", "Desde $90", "Desayunos tradicionales", "tradicionales", [
        { id: "preparacion", label: "Elige estilo y proteína", type: "single", choices: [
          choice("Suizas · clásicas", "Enmoladas suizas clásicas.", 110), choice("Suizas · con birria", "Enmoladas suizas con birria.", 135), choice("Suizas · con arrachera", "Enmoladas suizas con arrachera.", 145), choice("Suizas · con huevo al gusto", "Enmoladas suizas con huevo al gusto.", 125), choice("Suizas · con pechuga al grill", "Enmoladas suizas con pechuga al grill.", 145),
          choice("Clásicas · clásicas", "Enmoladas clásicas.", 90), choice("Clásicas · con birria", "Enmoladas clásicas con birria.", 120), choice("Clásicas · con arrachera", "Enmoladas clásicas con arrachera.", 130), choice("Clásicas · con huevo al gusto", "Enmoladas clásicas con huevo al gusto.", 110), choice("Clásicas · con pechuga al grill", "Enmoladas clásicas con pechuga al grill.", 130)
        ] },
        { id: "salsa", label: "Salsa de la casa", type: "single", choices: [choice("Salsa roja", "Salsa roja de la casa."), choice("Salsa verde", "Salsa verde de la casa.")] }
      ], breakfastTag),
      item("desayuno-antojitos", "Antojitos", "Tres gorditas (picaritas) o tlayoyos, con frijoles refritos, crema, queso y salsa roja o verde.", "Desde $90", "Desayunos tradicionales", "tradicionales", [
        { id: "antojito", label: "Elige tu antojito", type: "single", choices: [choice("Gorditas (picaritas)", "Tres gorditas de la casa."), choice("Tlayoyos", "Tres tlayoyos de la casa.")] },
        { id: "preparacion", label: "Elige tu preparación", type: "single", choices: proteinChoices({ clasicos: 90, birria: 125, arrachera: 125, huevo: 115, pechuga: 125 }, "Antojitos") },
        { id: "salsa", label: "Salsa", type: "single", choices: [choice("Salsa roja", "Salsa roja de la casa."), choice("Salsa verde", "Salsa verde de la casa.")] }
      ], breakfastTag),
      item("desayuno-huevos", "Huevos al gusto", "Huevos frescos con longaniza, tocino, jamón o a la mexicana; revueltos o estrellados, con frijoles refritos, aguacate y salsa de la casa.", "$90", "Desayunos tradicionales", "tradicionales", [
        { id: "acompanamiento", label: "Elige tu acompañamiento", type: "single", choices: [choice("Longaniza", "Huevos con longaniza."), choice("Tocino", "Huevos con tocino."), choice("Jamón", "Huevos con jamón."), choice("A la mexicana", "Huevos a la mexicana.")] },
        { id: "coccion", label: "¿Cómo prepararlos?", type: "single", choices: [choice("Revueltos", "Huevos revueltos."), choice("Estrellados", "Huevos estrellados.")] }
      ], breakfastTag),
      item("desayuno-tortas", "Tortas", "Pan dorado a la plancha con mantequilla de ajo y romero, queso manchego, mozzarella y aderezo gratinado.", "Desde $95", "Desayunos tradicionales", "tradicionales", [
        { id: "proteina", label: "Elige tu proteína", type: "single", choices: [choice("Birria", "Torta con birria.", 115), choice("Jamón serrano", "Torta con jamón serrano.", 140), choice("Pechuga al grill", "Torta con pechuga al grill.", 95)] }
      ], breakfastTag),

      item("desayuno-waffles-ctlr", "Waffles Como Te Lo Recetaron", "Waffle de vainilla con yogurt griego, dulce de temporada y miel.", "$70", "Dulce comienzo", "dulce", [], breakfastTag),
      item("desayuno-brunch-caramelo", "Brunch Caramelo", "Waffles con plátano, tocino crujiente, miel de maple y mantequilla.", "$70", "Dulce comienzo", "dulce", [], breakfastTag),
      item("desayuno-waffle-manzana", "Waffle Manzana Dorada", "Waffle dorado con manzana bañada en canela, mantequilla y miel.", "$75", "Dulce comienzo", "dulce", [], breakfastTag),
      item("desayuno-hotcakes", "Hotcakes", "Tres esponjosos hotcakes con miel pura de abeja, una generosa corona de mantequilla y una porción de fruta.", "$65", "Dulce comienzo", "dulce", [], breakfastTag),
      item("desayuno-hotcakes-nortenos", "Hotcakes norteños", "Tres hotcakes con tocino crujiente, huevo estrellado o frito suave y miel de abeja.", "$95", "Dulce comienzo", "dulce", [
        { id: "huevo", label: "Huevo", type: "single", choices: [choice("Estrellado", "Huevo estrellado."), choice("Frito suave", "Huevo frito suave.")] }
      ], breakfastTag),
      item("desayuno-hotcakes-choco", "Hotcakes Choco Caramelo", "Tres hotcakes con chocolate derretido, salsa de caramelo, miel de abeja y mantequilla.", "$80", "Dulce comienzo", "dulce", [], breakfastTag),

      item("desayuno-jardin-frutas", "Jardín de Frutas", "Base de lechuga italiana, pechuga al cilantro, manzana verde, uvas verdes, frutos rojos, nuez tostada, queso, arándano, vinagreta de miel, mostaza antigua y limón.", "$125", "Frescura por la mañana", "frescura", [], breakfastTag),
      item("desayuno-rojo-real", "Rojo Real", "Base de baby espinaca, queso de cabra, pechuga al grill, fresa, arándano, zarzamora, uvas pasas maceradas, crutones, almendras y vinagreta balsámica con reducción de vino tinto.", "$130", "Frescura por la mañana", "frescura", [], breakfastTag),
      item("desayuno-parrilla-tropical", "Parrilla Tropical", "Base de baby espinaca y arúgula, filete de res, piña asada, mango, guacamole artesanal, cacahuate tostado y vinagreta cremosa de aguacate.", "$135", "Frescura por la mañana", "frescura", [], breakfastTag),
      item("desayuno-mediterranea", "Mediterránea", "Base de arúgula, jamón serrano, queso de cabra, cherry, pepino, nuez, aceitunas, crutones y vinagreta balsámica con reducción de vino tinto.", "$135", "Frescura por la mañana", "frescura", [], breakfastTag),
      item("desayuno-verde-limon", "Verde Limón", "Baby espinaca y lechuga, pechuga al cilantro y limón, aguacate, cherry, pepino, quinoa, crutones, rábano y vinagreta de cilantro y limón.", "$130", "Frescura por la mañana", "frescura", [], breakfastTag),
      item("desayuno-serrana", "Serrana", "Arúgula y baby espinaca, jamón serrano, queso provolone, tomates cherry, aguacate, manzana verde, nuez, crutones y vinagreta de mostaza antigua y limón.", "$135", "Frescura por la mañana", "frescura", [], breakfastTag)
    ],
    drinks: [
      item("desayuno-cafe-americano", "Café americano", "Café americano recién preparado.", "$25", "Bebidas desayuno", "bebidas"),
      item("desayuno-cafe-olla", "Café de olla", "Café de olla de la casa.", "$25", "Bebidas desayuno", "bebidas"),
      item("desayuno-cafe-leche", "Café con leche", "Café con leche.", "$30", "Bebidas desayuno", "bebidas"),
      item("desayuno-te", "Té de sabores", "Té caliente de sabores.", "$25", "Bebidas desayuno", "bebidas"),
      item("desayuno-pan", "Pieza de pan", "Pieza de pan para acompañar.", "$10", "Bebidas desayuno", "bebidas"),
      item("desayuno-limonada-naranjada", "Limonada o Naranjada", "Bebida fresca de limón o naranja.", "$50", "Bebidas desayuno", "bebidas", [
        { id: "sabor", label: "Elige tu bebida", type: "single", choices: [choice("Limonada", "Limonada fresca."), choice("Naranjada", "Naranjada fresca.")] }
      ]),
      item("desayuno-jarra-limonada-naranjada", "Jarra de Limonada o Naranjada", "Jarra para compartir de limonada o naranjada.", "$165", "Bebidas desayuno", "bebidas", [
        { id: "sabor", label: "Elige tu bebida", type: "single", choices: [choice("Limonada", "Jarra de limonada."), choice("Naranjada", "Jarra de naranjada.")] }
      ], ["Para compartir"]),
      item("desayuno-horchata", "Horchata", "Agua de horchata.", "$35", "Bebidas desayuno", "bebidas"),
      item("desayuno-jamaica", "Jamaica", "Agua de jamaica.", "$30", "Bebidas desayuno", "bebidas"),
      item("desayuno-jarra-horchata", "Jarra de horchata", "Jarra de horchata para compartir.", "$75", "Bebidas desayuno", "bebidas", [], ["Para compartir"]),
      item("desayuno-jarra-jamaica", "Jarra de jamaica", "Jarra de jamaica para compartir.", "$65", "Bebidas desayuno", "bebidas", [], ["Para compartir"]),

      item("desayuno-jugo-clasico", "Jugo clásico", "Recién exprimido, una dosis de fibra y nutrientes para comenzar el día.", "$55", "Jugos", "jugos", [
        { id: "sabor", label: "Elige tu jugo", type: "single", choices: [choice("Naranja", "Jugo de naranja."), choice("Zanahoria", "Jugo de zanahoria."), choice("Betabel", "Jugo de betabel.")] }
      ]),
      item("desayuno-jugo-oasis", "Jugo Oasis", "Fresa, naranja y piña.", "$60", "Jugos", "jugos"),
      item("desayuno-jugo-verde", "Jugo Verde", "Naranja, nopal, apio, jengibre y piña.", "$60", "Jugos", "jugos"),
      item("desayuno-jugo-fresa", "Jugo Fresa", "Fresa, naranja, piña, hierbabuena y chía.", "$60", "Jugos", "jugos"),
      item("desayuno-licuado", "Licuados", "Licuados cremosos de fruta natural, preparados al momento con topping a elegir.", "$80", "Licuados", "jugos", [
        { id: "sabor", label: "Elige tu sabor", type: "single", choices: [choice("Chocolate con plátano", "Licuado de chocolate con plátano."), choice("Fresa", "Licuado de fresa."), choice("Papaya", "Licuado de papaya."), choice("Manzana", "Licuado de manzana.")] },
        { id: "topping", label: "Elige tu topping", type: "single", choices: [choice("Chía", "Con chía."), choice("Granola", "Con granola."), choice("Nuez", "Con nuez."), choice("Avena", "Con avena.")] }
      ]),
      item("desayuno-smoothie", "Smoothies", "Bebidas frutales licuadas al momento, frías, suaves y naturalmente refrescantes.", "$75", "Smoothies", "jugos", [
        { id: "sabor", label: "Elige tu sabor", type: "single", choices: [choice("Frutos rojos", "Smoothie de frutos rojos."), choice("Fresa", "Smoothie de fresa."), choice("Mango", "Smoothie de mango.")] }
      ])
    ]
  };
})();

if (typeof window !== "undefined") window.CTLR_BREAKFAST_MENU = CTLR_BREAKFAST_MENU;
if (typeof module !== "undefined" && module.exports) module.exports = CTLR_BREAKFAST_MENU;
