import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// POST /api/seed — Nettoie puis injecte des données de démo
export async function POST() {
  const supabase = createServiceClient();

  // ── 0. Nettoyer les anciennes données ──
  await supabase.from("agent_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("order_events").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("menu_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("menus").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("restaurants").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // ── 1. Créer le restaurant ──
  const { data: restaurant, error: restoError } = await supabase
    .from("restaurants")
    .insert({
      name: "Chez Mario",
      phone: "+32 2 513 45 67",
      address: "Rue de la Loi 42, 1000 Bruxelles",
      whatsapp_phone: "+32 470 12 34 56",
      owner_name: "Mario Rossi",
      agent_id: "demo-agent-001",
      agent_status: "active",
    })
    .select()
    .single();

  if (restoError) {
    return NextResponse.json({ error: restoError.message }, { status: 500 });
  }

  const rid = restaurant.id;

  // ── 1b. Créer les comptes utilisateurs (admin + owner) ──
  // Supprimer les anciens profils
  await supabase.from("profiles").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // Créer un owner pour ce restaurant
  const { data: ownerAuth } = await supabase.auth.admin.createUser({
    email: "mario@chezmario.be",
    password: "demo1234",
    email_confirm: true,
  });

  if (ownerAuth?.user) {
    await supabase.from("profiles").insert({
      id: ownerAuth.user.id,
      email: "mario@chezmario.be",
      full_name: "Mario Rossi",
      role: "owner",
      restaurant_id: rid,
    });
  }

  // Créer un admin Voxena
  const { data: adminAuth } = await supabase.auth.admin.createUser({
    email: "admin@voxena.pro",
    password: "admin1234",
    email_confirm: true,
  });

  if (adminAuth?.user) {
    await supabase.from("profiles").insert({
      id: adminAuth.user.id,
      email: "admin@voxena.pro",
      full_name: "Dejvi Prifti",
      role: "admin",
      restaurant_id: null,
    });
  }

  // ── 2. Créer les catégories ──
  const categories = [
    { name: "Entrées", sort_order: 0 },
    { name: "Pizzas", sort_order: 1 },
    { name: "Plats principaux", sort_order: 2 },
    { name: "Desserts", sort_order: 3 },
    { name: "Boissons fraîches", sort_order: 4 },
    { name: "Offre du moment", sort_order: 5 },
  ];

  const { data: menus } = await supabase
    .from("menus")
    .insert(categories.map((c) => ({ ...c, restaurant_id: rid })))
    .select();

  if (!menus) {
    return NextResponse.json({ error: "Erreur création menus" }, { status: 500 });
  }

  const menuMap: Record<string, string> = {};
  for (const m of menus) {
    menuMap[m.name] = m.id;
  }

  // ── 3. Créer les articles ──
  const items = [
    // Entrées
    { menu: "Entrées", name: "Bruschetta classique", price: 8.5, description: "Pain grillé, tomates fraîches, basilic, huile d'olive" },
    { menu: "Entrées", name: "Carpaccio de bœuf", price: 12, description: "Bœuf tranché finement, roquette, parmesan, câpres" },
    { menu: "Entrées", name: "Soupe minestrone", price: 7, description: "Légumes de saison, haricots blancs, pâtes" },
    { menu: "Entrées", name: "Burrata crémeuse", price: 14, description: "Burrata des Pouilles, tomates cerises, pesto" },
    // Pizzas
    { menu: "Pizzas", name: "Margherita", price: 11, description: "Sauce tomate, mozzarella fior di latte, basilic frais" },
    { menu: "Pizzas", name: "Quattro Formaggi", price: 14, description: "Mozzarella, gorgonzola, parmesan, taleggio" },
    { menu: "Pizzas", name: "Diavola", price: 13, description: "Sauce tomate, mozzarella, salami piquant, piments" },
    { menu: "Pizzas", name: "Calzone Mario", price: 15, description: "Ricotta, jambon, champignons, mozzarella — Spécialité de la maison" },
    { menu: "Pizzas", name: "Végétarienne", price: 12.5, description: "Courgettes, aubergines, poivrons, olives, roquette" },
    // Plats principaux
    { menu: "Plats principaux", name: "Risotto aux cèpes", price: 18, description: "Riz carnaroli, cèpes frais, parmesan 24 mois" },
    { menu: "Plats principaux", name: "Osso buco milanaise", price: 22, description: "Jarret de veau braisé, gremolata, risotto safran" },
    { menu: "Plats principaux", name: "Pâtes carbonara", price: 14, description: "Spaghetti, guanciale, pecorino romano, œuf" },
    { menu: "Plats principaux", name: "Escalope milanaise", price: 17, description: "Escalope panée, roquette, tomates cerises, citron" },
    { menu: "Plats principaux", name: "Saumon grillé", price: 19, description: "Filet de saumon, légumes grillés, sauce au citron" },
    // Desserts
    { menu: "Desserts", name: "Tiramisu", price: 8, description: "Mascarpone, biscuits imbibés, cacao amer" },
    { menu: "Desserts", name: "Panna cotta", price: 7, description: "Crème vanille, coulis de fruits rouges" },
    { menu: "Desserts", name: "Affogato", price: 6, description: "Glace vanille noyée dans un espresso" },
    // Boissons fraîches
    { menu: "Boissons fraîches", name: "Coca-Cola", price: 3, description: "33cl" },
    { menu: "Boissons fraîches", name: "San Pellegrino", price: 3.5, description: "Eau pétillante 50cl" },
    { menu: "Boissons fraîches", name: "Limonade maison", price: 4, description: "Citrons frais, menthe, miel" },
    { menu: "Boissons fraîches", name: "Jus d'orange pressé", price: 4.5, description: "Oranges fraîches pressées à la commande" },
    // Offre du moment
    { menu: "Offre du moment", name: "Menu Duo — 2 pizzas + 2 boissons", price: 28, description: "Offre spéciale couple — Économisez 5€" },
    { menu: "Offre du moment", name: "Plat du jour", price: 13, description: "Demandez au serveur — change chaque jour" },
  ];

  await supabase.from("menu_items").insert(
    items.map((item, i) => ({
      menu_id: menuMap[item.menu],
      restaurant_id: rid,
      name: item.name,
      price: item.price,
      description: item.description,
      sort_order: i,
      is_available: true,
    }))
  );

  // ── 4. Créer des commandes (7 derniers jours) ──
  const now = new Date();
  const clients = [
    { name: "Ahmed B.", phone: "+32 470 11 22 33" },
    { name: "Sophie D.", phone: "+32 475 44 55 66" },
    { name: "Jean-Pierre M.", phone: "+32 479 77 88 99" },
    { name: "Fatima K.", phone: "+32 474 22 33 44" },
    { name: "Lucas V.", phone: "+32 478 55 66 77" },
    { name: "Maria G.", phone: "+32 476 88 99 00" },
    { name: "Thomas L.", phone: "+32 471 33 44 55" },
    { name: "Nadia R.", phone: "+32 473 66 77 88" },
  ];

  const statuses = ["nouvelle", "en_preparation", "prete", "recuperee", "livree"] as const;
  const orderTypes = ["emporter", "livraison"] as const;

  const orders = [];
  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    // 3 à 8 commandes par jour
    const count = 3 + Math.floor(Math.random() * 6);
    for (let j = 0; j < count; j++) {
      const d = new Date(now);
      d.setDate(d.getDate() - dayOffset);
      d.setHours(11 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));

      const client = clients[Math.floor(Math.random() * clients.length)];
      const orderItems = [];
      const numItems = 1 + Math.floor(Math.random() * 4);
      for (let k = 0; k < numItems; k++) {
        const item = items[Math.floor(Math.random() * items.length)];
        const qty = 1 + Math.floor(Math.random() * 2);
        orderItems.push({ name: item.name, quantity: qty, price: item.price });
      }

      const total = orderItems.reduce((s, i) => s + i.quantity * i.price, 0);
      const orderType = orderTypes[Math.floor(Math.random() * 2)];

      // Générer heure estimée (30-60 min après la commande)
      const estimateMin = 20 + Math.floor(Math.random() * 40);
      const estimateTime = new Date(d.getTime() + estimateMin * 60000);
      const estimateStr = `${estimateTime.getHours().toString().padStart(2, "0")}:${estimateTime.getMinutes().toString().padStart(2, "0")}`;

      // Adresses de livraison bruxelloises
      const addresses = [
        "Rue du Marché aux Herbes 12, 1000 Bruxelles",
        "Avenue Louise 180, 1050 Ixelles",
        "Chaussée de Waterloo 45, 1060 Saint-Gilles",
        "Rue Neuve 88, 1000 Bruxelles",
        "Place du Châtelain 3, 1050 Ixelles",
        "Boulevard Anspach 150, 1000 Bruxelles",
        "Rue Antoine Dansaert 67, 1000 Bruxelles",
      ];

      // Instructions spéciales aléatoires
      const instructions = [
        null, null, null, null, // La plupart sans instructions
        "Sans oignons s'il vous plaît",
        "Allergie aux noix — attention",
        "Sonner 2 fois au parlophone",
        "Extra sauce tomate",
        "Code porte : 4521",
        "Pizza bien cuite svp",
      ];

      // Les commandes anciennes sont terminées, les récentes ont des statuts variés
      let status: (typeof statuses)[number];
      if (dayOffset > 0) {
        status = Math.random() > 0.15 ? "recuperee" : "livree";
      } else {
        status = statuses[Math.floor(Math.random() * statuses.length)];
      }

      orders.push({
        restaurant_id: rid,
        customer_name: client.name,
        customer_phone: client.phone,
        items: orderItems,
        total_amount: total,
        order_type: orderType,
        status,
        created_at: d.toISOString(),
        pickup_time: orderType === "emporter" ? estimateStr : null,
        delivery_time_estimate: orderType === "livraison" ? estimateStr : null,
        delivery_address: orderType === "livraison"
          ? addresses[Math.floor(Math.random() * addresses.length)]
          : null,
        special_instructions: instructions[Math.floor(Math.random() * instructions.length)],
      });
    }
  }

  await supabase.from("orders").insert(orders);

  // ── 5. Créer quelques logs agent ──
  const logEvents = [
    { event_type: "server_tool_call", payload: { tool: "get_menu", success: true } },
    { event_type: "order_created", payload: { order_id: "demo", source: "voice_call" } },
    { event_type: "webhook_received", payload: { type: "post_call", has_transcript: true } },
    { event_type: "error", error_message: "Timeout lors de la récupération du menu", payload: { retry_count: 3 } },
    { event_type: "order_created", payload: { order_id: "demo-2", source: "voice_call" } },
    { event_type: "webhook_received", payload: { type: "post_call", has_transcript: true } },
  ];

  await supabase.from("agent_logs").insert(
    logEvents.map((log, i) => {
      const d = new Date(now);
      d.setHours(d.getHours() - i * 2);
      return {
        restaurant_id: rid,
        conversation_id: `conv-demo-${i}`,
        event_type: log.event_type,
        payload: log.payload,
        error_message: log.error_message || null,
        created_at: d.toISOString(),
      };
    })
  );

  return NextResponse.json({
    success: true,
    restaurant_id: rid,
    menus: menus.length,
    items: items.length,
    orders: orders.length,
    accounts: {
      owner: { email: "mario@chezmario.be", password: "demo1234" },
      admin: { email: "admin@voxena.pro", password: "admin1234" },
    },
  });
}
