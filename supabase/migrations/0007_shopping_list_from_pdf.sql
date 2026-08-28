-- 0007 — lista consolidada do PDF lista_compras_casamento
-- Faixas viram o teto (ex.: 200–205 → 205). Itens sem qtd fixa: needed_qty = 0.

alter table public.shopping_items
  add column if not exists category text not null default 'Outros';

alter table public.shopping_items
  add column if not exists notes text;

delete from public.shopping_contributions;
delete from public.shopping_items;

insert into public.shopping_items
  (name, unit, needed_qty, purchased_qty, display_order, category, notes)
values
  -- 1. Leites
  ('Leite condensado', 'un', 216, 0, 10, 'Leites, laticínios e derivados', '114 docinhos/trufas + 78 sobremesas + 24 brownies'),
  ('Creme de leite', 'un', 205, 0, 20, 'Leites, laticínios e derivados', '200 a 205 latas/caixas'),
  ('Manteiga ou margarina', 'kg', 15.5, 0, 30, 'Leites, laticínios e derivados', '15 a 15,5 kg'),
  ('Leite em pó', 'kg', 4, 0, 40, 'Leites, laticínios e derivados', null),
  ('Leite em pó (pacotes grandes)', 'un', 2, 0, 50, 'Leites, laticínios e derivados', null),
  ('Leite integral', 'L', 25, 0, 60, 'Leites, laticínios e derivados', '20 a 25 litros'),
  ('Cream cheese', 'un', 6, 0, 70, 'Leites, laticínios e derivados', '4 a 6 potes'),

  -- 2. Ovos
  ('Ovos frescos', 'un', 146, 0, 80, 'Ovos', '141 a 146 unidades'),

  -- 3. Chocolates
  ('Chocolate ao leite', 'kg', 1.5, 0, 90, 'Chocolates, coberturas e cacau', null),
  ('Chocolate meio amargo', 'kg', 4, 0, 100, 'Chocolates, coberturas e cacau', null),
  ('Chocolate blend', 'kg', 3, 0, 110, 'Chocolates, coberturas e cacau', null),
  ('Chocolate branco', 'kg', 8, 0, 120, 'Chocolates, coberturas e cacau', null),
  ('Chocolate em barra/cobertura (sobremesas)', 'kg', 2.5, 0, 130, 'Chocolates, coberturas e cacau', '2 a 2,5 kg'),
  ('Cacau em pó 50% (docinhos)', 'kg', 2, 0, 140, 'Chocolates, coberturas e cacau', null),
  ('Cacau 70%', 'kg', 1, 0, 150, 'Chocolates, coberturas e cacau', null),
  ('Cacau/chocolate em pó 50% (sobremesas)', 'kg', 1.5, 0, 160, 'Chocolates, coberturas e cacau', '1 a 1,5 kg'),
  ('Chocolate em pó (brownies)', 'kg', 4, 0, 170, 'Chocolates, coberturas e cacau', null),
  ('Achocolatado (docinhos)', 'kg', 0.7, 0, 180, 'Chocolates, coberturas e cacau', '700 g'),
  ('Achocolatado (brownies)', 'kg', 5.6, 0, 190, 'Chocolates, coberturas e cacau', null),

  -- 4. Farinhas / mercearia
  ('Açúcar (brownies + cristal)', 'kg', 10, 0, 200, 'Farinhas, açúcares e mercearia', 'Pelo menos 10 kg (8 kg brownies + 2 kg cristal + sobremesas)'),
  ('Farinha de trigo', 'kg', 6, 0, 210, 'Farinhas, açúcares e mercearia', null),
  ('Amido de milho', 'un', 2, 0, 220, 'Farinhas, açúcares e mercearia', 'caixas'),
  ('Fermento químico em pó', 'un', 2, 0, 230, 'Farinhas, açúcares e mercearia', null),
  ('Biscoito Oreo', 'un', 6, 0, 240, 'Farinhas, açúcares e mercearia', 'pacotes'),
  ('Biscoito Maisena ou pão de ló', 'un', 2, 0, 250, 'Farinhas, açúcares e mercearia', 'pacotes'),

  -- 5. Doces / recheios
  ('Nutella', 'kg', 6, 0, 260, 'Doces, recheios, castanhas e confeitos', null),
  ('Nutella (potes)', 'un', 8, 0, 270, 'Doces, recheios, castanhas e confeitos', '6 a 8 potes'),
  ('Doce de leite', 'g', 500, 0, 280, 'Doces, recheios, castanhas e confeitos', null),
  ('Goiabada', 'un', 1, 0, 290, 'Doces, recheios, castanhas e confeitos', 'pote'),
  ('Pasta de pistache', 'kg', 1, 0, 300, 'Doces, recheios, castanhas e confeitos', null),
  ('Açúcar cristal / confeito (Surpresa de Uva)', 'kg', 1, 0, 310, 'Doces, recheios, castanhas e confeitos', null),
  ('Crocante de amendoim', 'un', 0, 0, 320, 'Doces, recheios, castanhas e confeitos', 'A definir'),
  ('Amendoim triturado', 'un', 0, 0, 330, 'Doces, recheios, castanhas e confeitos', 'A definir'),
  ('Granulados diversos', 'un', 0, 0, 340, 'Doces, recheios, castanhas e confeitos', 'A definir'),
  ('Canela em pó', 'un', 0, 0, 350, 'Doces, recheios, castanhas e confeitos', 'A definir'),

  -- 6. Frutas / especiais
  ('Uvas frescas', 'kg', 2, 0, 360, 'Frutas frescas e insumos especiais', '+ quantidade para Surpresa de Uva'),
  ('Morangos frescos', 'un', 6, 0, 370, 'Frutas frescas e insumos especiais', 'caixinhas'),
  ('Morango em calda / saborizante', 'kg', 2, 0, 380, 'Frutas frescas e insumos especiais', null),
  ('Limões', 'kg', 1, 0, 390, 'Frutas frescas e insumos especiais', null),
  ('Limões (unidades)', 'un', 10, 0, 400, 'Frutas frescas e insumos especiais', '8 a 10 unidades'),
  ('Abacaxi', 'un', 2, 0, 410, 'Frutas frescas e insumos especiais', 'grandes + quantidade para trufas'),
  ('Cerejas (frescas / calda)', 'un', 0, 0, 420, 'Frutas frescas e insumos especiais', 'A definir'),
  ('Essência de baunilha', 'un', 2, 0, 430, 'Frutas frescas e insumos especiais', '+ quantidade para Crème Brûlée'),
  ('Corante vermelho em gel', 'un', 2, 0, 440, 'Frutas frescas e insumos especiais', '+ quantidade para Red Velvet'),
  ('Gelatina incolor / suco em pó morango', 'un', 0, 0, 450, 'Frutas frescas e insumos especiais', 'Quantidade para os mousses');
