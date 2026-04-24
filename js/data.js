// ============================================================
// PRODUTOS E CONFIGURAÇÕES PADRÃO — MERCEARIA MIRANDA
// Edite aqui os dados iniciais da loja
// ============================================================

const DEFAULT_PRODUCTS = [
  { id: 1,  name: "Alface Crespa",       price: 2.50,  category: "Hortifruti",      emoji: "🥬", unit: "un",      available: true, img: null },
  { id: 2,  name: "Tomate",              price: 5.90,  category: "Hortifruti",      emoji: "🍅", unit: "kg",      available: true, img: null },
  { id: 3,  name: "Banana Prata",        price: 4.50,  category: "Hortifruti",      emoji: "🍌", unit: "kg",      available: true, img: null },
  { id: 4,  name: "Cenoura",             price: 3.80,  category: "Hortifruti",      emoji: "🥕", unit: "kg",      available: true, img: null },
  { id: 5,  name: "Arroz Branco 5kg",    price: 22.90, category: "Grãos e cereais", emoji: "🍚", unit: "pacote",  available: true, img: null },
  { id: 6,  name: "Feijão Carioca 1kg",  price: 8.50,  category: "Grãos e cereais", emoji: "🫘", unit: "pacote",  available: true, img: null },
  { id: 7,  name: "Macarrão Espaguete",  price: 4.20,  category: "Grãos e cereais", emoji: "🍝", unit: "pacote",  available: true, img: null },
  { id: 8,  name: "Leite Integral 1L",   price: 5.50,  category: "Laticínios",      emoji: "🥛", unit: "caixa",   available: true, img: null },
  { id: 9,  name: "Queijo Mussarela",    price: 14.90, category: "Laticínios",      emoji: "🧀", unit: "kg",      available: true, img: null },
  { id: 10, name: "Iogurte Natural",     price: 3.80,  category: "Laticínios",      emoji: "🥗", unit: "un",      available: true, img: null },
  { id: 11, name: "Refrigerante 2L",     price: 7.50,  category: "Bebidas",         emoji: "🥤", unit: "garrafa", available: true, img: null },
  { id: 12, name: "Água Mineral 1,5L",   price: 2.90,  category: "Bebidas",         emoji: "💧", unit: "garrafa", available: true, img: null },
  { id: 13, name: "Suco de Laranja 1L",  price: 8.90,  category: "Bebidas",         emoji: "🍊", unit: "caixa",   available: true, img: null },
  { id: 14, name: "Frango Inteiro",      price: 18.90, category: "Carnes",          emoji: "🍗", unit: "kg",      available: true, img: null },
  { id: 15, name: "Carne Moída",         price: 29.90, category: "Carnes",          emoji: "🥩", unit: "kg",      available: true, img: null },
  { id: 16, name: "Pão Francês",         price: 0.80,  category: "Padaria",         emoji: "🍞", unit: "un",      available: true, img: null },
  { id: 17, name: "Pão de Forma",        price: 7.50,  category: "Padaria",         emoji: "🍞", unit: "pacote",  available: true, img: null },
  { id: 18, name: "Detergente",          price: 2.50,  category: "Limpeza",         emoji: "🧴", unit: "un",      available: true, img: null },
  { id: 19, name: "Sabão em Pó 1kg",     price: 12.90, category: "Limpeza",         emoji: "🧺", unit: "caixa",   available: true, img: null },
  { id: 20, name: "Azeite Extra Virgem", price: 24.90, category: "Outros",          emoji: "🫙", unit: "garrafa", available: true, img: null },
];

const DEFAULT_CONFIG = {
  name:      "Mercearia Miranda",
  whatsapp:  "553438142854" // <- altere: 55 + DDD + número (ex: 5534999990000)
};
