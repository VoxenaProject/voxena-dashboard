import { NextRequest, NextResponse } from "next/server";

// pdf-parse v1 — extraction de texte légère sans canvas
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

/**
 * POST /api/menu-import
 * Reçoit un PDF de menu, extrait le texte, et parse les catégories + articles.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || !file.name.endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Fichier PDF requis" },
        { status: 400 }
      );
    }

    // Extraire le texte du PDF
    const buffer = Buffer.from(await file.arrayBuffer());

    let text = "";
    try {
      const result = await pdfParse(buffer);
      text = result.text || "";
    } catch {
      return NextResponse.json(
        { error: "Impossible de lire ce PDF. Vérifiez qu'il n'est pas protégé." },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Aucun texte trouvé dans le PDF. Le fichier est peut-être un scan/image." },
        { status: 400 }
      );
    }

    const parsed = parseMenuText(text);

    return NextResponse.json({
      success: true,
      rawText: text.slice(0, 500),
      categories: parsed,
    });
  } catch (err) {
    console.error("[menu-import] Erreur:", err);
    return NextResponse.json(
      { error: "Erreur lors du traitement du PDF" },
      { status: 500 }
    );
  }
}

/**
 * Parse le texte brut d'un menu PDF en catégories et articles.
 */
function parseMenuText(
  text: string
): { name: string; items: { name: string; price: number; description: string }[] }[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const categories: {
    name: string;
    items: { name: string; price: number; description: string }[];
  }[] = [];

  let currentCategory: (typeof categories)[number] | null = null;

  const priceRegex = /(\d{1,3})[,.](\d{2})\s*€?|(\d{1,3})\s*€/;

  const categoryKeywords = [
    "entrée", "entree", "plat", "dessert", "boisson", "pizza", "pasta",
    "viande", "poisson", "salade", "soupe", "sandwich", "burger",
    "menu", "formule", "suggestion", "spécial", "special", "enfant",
    "apéritif", "aperitif", "vin", "bière", "biere", "cocktail",
    "accompagnement", "supplément", "supplement", "fromage",
  ];

  for (const line of lines) {
    const isUpperCase = line === line.toUpperCase() && line.length > 2 && !priceRegex.test(line);
    const isShortNoPriceWithKeyword =
      line.length < 40 &&
      !priceRegex.test(line) &&
      categoryKeywords.some((kw) => line.toLowerCase().includes(kw));
    const looksLikeCategory =
      isUpperCase ||
      isShortNoPriceWithKeyword ||
      (line.startsWith("—") || line.startsWith("–") || line.startsWith("***"));

    if (looksLikeCategory) {
      const cleanName = line
        .replace(/^[—–*#\-\s]+/, "")
        .replace(/[—–*#\-\s]+$/, "")
        .trim();

      if (cleanName.length > 1) {
        const formattedName =
          cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();
        currentCategory = { name: formattedName, items: [] };
        categories.push(currentCategory);
      }
      continue;
    }

    const priceMatch = line.match(priceRegex);
    if (priceMatch && currentCategory) {
      let price: number;
      if (priceMatch[3]) {
        price = parseInt(priceMatch[3]);
      } else {
        price = parseFloat(`${priceMatch[1]}.${priceMatch[2]}`);
      }

      const priceIndex = line.indexOf(priceMatch[0]);
      const beforePrice = line.slice(0, priceIndex).trim();

      let name = beforePrice;
      let description = "";

      const separatorMatch = beforePrice.match(/^(.+?)\s*[:\-–—]\s*(.+)$/);
      if (separatorMatch) {
        name = separatorMatch[1].trim();
        description = separatorMatch[2].trim();
      }

      name = name.replace(/^[\d.)\s]+/, "").replace(/[.\s]+$/, "").trim();

      if (name.length > 1) {
        currentCategory.items.push({ name, price, description });
      }
    } else if (currentCategory && !priceMatch && line.length > 5 && line.length < 100) {
      const lastItem = currentCategory.items[currentCategory.items.length - 1];
      if (lastItem && !lastItem.description) {
        lastItem.description = line;
      }
    }
  }

  return categories.filter((c) => c.items.length > 0);
}
