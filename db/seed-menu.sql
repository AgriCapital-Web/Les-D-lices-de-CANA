-- Seed menu Les Délices de CANA
-- Six dishes for the current menu; images are real Wikimedia Commons photos.
BEGIN;

UPDATE public.dishes AS d
SET name=v.name, description=v.description, price=v.price, category=v.category, image_url=v.image_url, active=true, updated_at=now()
FROM (VALUES
 ('b674e585-c6e0-4cb9-8f0c-d199115abb5d'::uuid,'Foutou banane sauce graine','Foutou banane accompagné d’une généreuse sauce graine ivoirienne.',4500,'Plats','https://upload.wikimedia.org/wikipedia/commons/2/2b/Cuisine_Ivoirienne_Foutou_sauce_graine.jpg'),
 ('72336306-681d-4cba-9d5b-0399c205cd24'::uuid,'Foutou sauce gouagouassou','Foutou servi avec une sauce gouagouassou traditionnelle, relevée et généreuse.',4500,'Plats','https://upload.wikimedia.org/wikipedia/commons/7/76/Foutou_sauce_gouagouassou.JPG'),
 ('915c049d-20af-4f93-9c2b-56a59600d7c1'::uuid,'Foutou sauce aubergine','Foutou accompagné d’une sauce aubergine mijotée à la façon ivoirienne.',4000,'Plats','https://upload.wikimedia.org/wikipedia/commons/f/fd/Foutou_sauce_aubergine.jpg'),
 ('2f4546fd-4a03-400c-9bc9-fb2548bcfd67'::uuid,'Riz sauce arachide','Riz blanc accompagné d’une sauce arachide onctueuse et parfumée.',3500,'Plats','https://upload.wikimedia.org/wikipedia/commons/2/2e/Riz_avec_sauce_arachide.jpg'),
 ('6143eb80-9338-4722-ad5d-0da815faa1b1'::uuid,'Attiéké & soupe de poulet','Attiéké accompagné d’une soupe de poulet, servi bien chaud.',4000,'Spécialités','https://upload.wikimedia.org/wikipedia/commons/4/48/Attieke_kedjenou.jpg'),
 ('67f41909-9345-427c-946d-96a7b8aab6b2'::uuid,'Soupe de cabri','Soupe de cabri à l’ivoirienne, généreuse et servie bien chaude.',4000,'Spécialités','https://upload.wikimedia.org/wikipedia/commons/e/e4/Soupe_cabri.JPG')
) AS v(id,name,description,price,category,image_url) WHERE d.id=v.id;

DELETE FROM public.menu_items mi
USING public.menus m
WHERE mi.menu_id=m.id AND m.service_date=current_date;

INSERT INTO public.menu_items(menu_id,dish_id,name,description,price,image_url,category,position)
SELECT m.id,d.id,d.name,d.description,d.price,d.image_url,d.category,v.position
FROM public.menus m
JOIN (VALUES
 (1,'b674e585-c6e0-4cb9-8f0c-d199115abb5d'::uuid),
 (2,'72336306-681d-4cba-9d5b-0399c205cd24'::uuid),
 (3,'915c049d-20af-4f93-9c2b-56a59600d7c1'::uuid),
 (4,'2f4546fd-4a03-400c-9bc9-fb2548bcfd67'::uuid),
 (5,'6143eb80-9338-4722-ad5d-0da815faa1b1'::uuid),
 (6,'67f41909-9345-427c-946d-96a7b8aab6b2'::uuid)
) v(position,dish_id) ON true
JOIN public.dishes d ON d.id=v.dish_id
WHERE m.service_date=current_date;

COMMIT;
