#!/usr/bin/env python3
"""
Copies the Mock.shop demo catalog into your dev store through the Admin GraphQL API,
using this app's credentials via `shopify app execute`.

  python3 scripts/import-catalog.py products [--only "Hoodie"]   # create products
  python3 scripts/import-catalog.py collections                  # create collections
  python3 scripts/import-catalog.py publish                      # publish to sales channels

Created IDs are saved to scripts/.catalog-state.json so steps can be re-run safely.
"""
import json
import math
import os
import subprocess
import sys
import tempfile
import urllib.request

STORE = "piyush-dev-store.myshopify.com"
APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE_FILE = os.path.join(APP_DIR, "scripts", ".catalog-state.json")
CAD_TO_INR = 60  # rough rate; prices are rounded to "x,x99" retail style

COLLECTIONS = {
    "Men": "Heavyweight fits and kicks, cut for the city.",
    "Women": "Crewnecks, tees and leggings built to move.",
    "Unisex": "One size story. Everyone wears it.",
    "Shoes": "Sneakers, runners and slides from the current drop.",
    "Tops": "Hoodies, crews, puffers and tees.",
    "Bottoms": "Sweats, shorts and leggings.",
    "Accessories": "Bags, shades and the finishing touches.",
    "Featured": "The pieces everyone is hunting this drop.",
}

# Products with no collections on Mock.shop, and duplicates to skip.
EXTRA_COLLECTIONS = {"Beanie": ["Unisex", "Accessories"]}

MOCK_QUERY = """
{
  products(first: 50) {
    nodes {
      id title descriptionHtml productType tags
      options { name optionValues { name } }
      images(first: 10) { nodes { url altText } }
      variants(first: 100) {
        nodes { price { amount } selectedOptions { name value } image { url } }
      }
      collections(first: 10) { nodes { title } }
    }
  }
}
"""


def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            return json.load(f)
    return {"products": {}, "collections": {}}


def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


def mock_catalog():
    req = urllib.request.Request(
        "https://mock.shop/api",
        data=json.dumps({"query": MOCK_QUERY}).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as res:
        products = json.load(res)["data"]["products"]["nodes"]
    seen, unique = set(), []
    for p in products:
        if p["title"] in seen:  # Mock.shop lists "Hoodie" twice
            continue
        seen.add(p["title"])
        unique.append(p)
    return unique


def inr(cad):
    return str(math.ceil(float(cad) * CAD_TO_INR / 100) * 100 - 1)


def admin(query, variables=None):
    """Run an Admin API operation as this app; returns the `data` object."""
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as vf:
        json.dump(variables or {}, vf)
    try:
        out = subprocess.run(
            ["shopify", "app", "execute", "--no-input", "-j", "-s", STORE,
             "--path", APP_DIR, "-q", query, "--variable-file", vf.name],
            capture_output=True, text=True, timeout=180,
        )
    finally:
        os.unlink(vf.name)
    # Output = one-line JSON progress events, then the result: pretty-printed JSON
    # on success, or a one-line {"error": ...} on failure.
    lines = out.stdout.splitlines()
    starts = [i for i, l in enumerate(lines) if l == "{"]
    if starts:
        result = json.loads("\n".join(lines[starts[-1]:]))
    else:
        events = [l for l in lines if l.startswith("{")]
        result = json.loads(events[-1]) if events else {"error": out.stderr[-800:]}
    if "error" in result or result.get("errors"):
        raise RuntimeError(json.dumps(result.get("error") or result.get("errors"), indent=1))
    return result.get("data", result)


PRODUCT_SET = """
mutation ImportProduct($input: ProductSetInput!) {
  productSet(input: $input, synchronous: true) {
    product { id handle title variantsCount { count } media(first: 1) { nodes { id } } }
    userErrors { field message }
  }
}
"""


def product_input(p):
    files, seen_urls = [], set()
    for img in p["images"]["nodes"]:
        if img["url"] not in seen_urls:
            seen_urls.add(img["url"])
            files.append({"originalSource": img["url"], "contentType": "IMAGE",
                          "alt": img["altText"] or p["title"]})
    variants = []
    for v in p["variants"]["nodes"]:
        variant = {
            "optionValues": [{"optionName": o["name"], "name": o["value"]}
                             for o in v["selectedOptions"]],
            "price": inr(v["price"]["amount"]),
            "inventoryItem": {"tracked": False},
        }
        if v["image"] and v["image"]["url"] in seen_urls:
            variant["file"] = {"originalSource": v["image"]["url"], "contentType": "IMAGE"}
        variants.append(variant)
    return {
        "title": p["title"],
        "descriptionHtml": p["descriptionHtml"],
        "vendor": "HYPEFORGE",
        "productType": p["productType"] or "Apparel",
        "tags": p["tags"] + ["hypeforge-drop-07"],
        "status": "ACTIVE",
        "productOptions": [
            {"name": o["name"], "position": i + 1,
             "values": [{"name": val["name"]} for val in o["optionValues"]]}
            for i, o in enumerate(p["options"])
        ],
        "variants": variants,
        "files": files,
    }


def import_products(only=None):
    state = load_state()
    for p in mock_catalog():
        if only and p["title"] != only:
            continue
        if p["title"] in state["products"]:
            print(f"skip   {p['title']} (already imported)")
            continue
        data = admin(PRODUCT_SET, {"input": product_input(p)})["productSet"]
        if data["userErrors"]:
            print(f"ERROR  {p['title']}: {data['userErrors']}")
            continue
        prod = data["product"]
        cols = [c["title"] for c in p["collections"]["nodes"]] or EXTRA_COLLECTIONS.get(p["title"], [])
        state["products"][p["title"]] = {"id": prod["id"], "handle": prod["handle"], "collections": cols}
        save_state(state)
        print(f"ok     {p['title']:28} {prod['variantsCount']['count']:>3} variants  -> /products/{prod['handle']}")


COLLECTION_CREATE = """
mutation ImportCollection($input: CollectionInput!) {
  collectionCreate(input: $input) {
    collection { id handle title productsCount { count } }
    userErrors { field message }
  }
}
"""


def import_collections():
    state = load_state()
    catalog = {p["title"]: p for p in mock_catalog()}
    for title, blurb in COLLECTIONS.items():
        if title in state["collections"]:
            print(f"skip   {title} (already created)")
            continue
        members = [name for name, info in state["products"].items() if title in info["collections"]]
        cover = next((catalog[m]["images"]["nodes"][0]["url"] for m in members
                      if catalog.get(m, {}).get("images", {}).get("nodes")), None)
        payload = {"title": title, "descriptionHtml": f"<p>{blurb}</p>",
                   "products": [state["products"][m]["id"] for m in members]}
        if cover:
            payload["image"] = {"src": cover, "altText": f"{title} collection"}
        data = admin(COLLECTION_CREATE, {"input": payload})["collectionCreate"]
        if data["userErrors"]:
            print(f"ERROR  {title}: {data['userErrors']}")
            continue
        col = data["collection"]
        state["collections"][title] = {"id": col["id"], "handle": col["handle"]}
        save_state(state)
        print(f"ok     {title:12} {len(members):>2} products -> /collections/{col['handle']}")


PUBLISH = """
mutation Publish($id: ID!, $input: [PublicationInput!]!) {
  publishablePublish(id: $id, input: $input) { userErrors { field message } }
}
"""


def publish():
    state = load_state()
    pubs = admin("{ publications(first: 20) { nodes { id name } } }")["publications"]["nodes"]
    print("channels:", ", ".join(p["name"] for p in pubs))
    targets = [{"publicationId": p["id"]} for p in pubs]
    items = list(state["products"].items()) + list(state["collections"].items())
    for name, info in items:
        errors = admin(PUBLISH, {"id": info["id"], "input": targets})["publishablePublish"]["userErrors"]
        print(f"{'ERROR ' if errors else 'ok    '} {name} {errors or ''}")


if __name__ == "__main__":
    step = sys.argv[1] if len(sys.argv) > 1 else ""
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
    {"products": lambda: import_products(only), "collections": import_collections,
     "publish": publish}.get(step, lambda: print(__doc__))()
