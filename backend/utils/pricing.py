import re
from database.db import db_manager

def calculate_pages_from_range(page_range_str, total_pages_in_doc):
    """
    Parses page ranges like 'all', '1-5', '1, 3, 5-8'
    Returns the count of valid distinct pages to print.
    """
    if not page_range_str or page_range_str.strip().lower() in ('all', ''):
        return max(1, total_pages_in_doc)

    selected_pages = set()
    cleaned = page_range_str.replace(' ', '')
    parts = cleaned.split(',')

    for part in parts:
        if '-' in part:
            sub = part.split('-')
            if len(sub) == 2 and sub[0].isdigit() and sub[1].isdigit():
                start = max(1, int(sub[0]))
                end = min(total_pages_in_doc, int(sub[1]))
                if start <= end:
                    selected_pages.update(range(start, end + 1))
        elif part.isdigit():
            p = int(part)
            if 1 <= p <= total_pages_in_doc:
                selected_pages.add(p)

    return len(selected_pages) if selected_pages else max(1, total_pages_in_doc)

def get_pricing_map():
    """
    Loads latest pricing rules from database
    """
    rows = db_manager.query_all("SELECT category, unit_price FROM printing_prices")
    pricing = {}
    for r in rows:
        pricing[r['category']] = float(r['unit_price'])
    return pricing

def compute_order_cost(setting, total_pages_in_doc):
    """
    Given setting dictionary and document total pages,
    returns itemized cost breakdown and total price.
    """
    prices = get_pricing_map()

    color_mode = setting.get('color_mode', 'bw') # 'bw' or 'color'
    sides = setting.get('sides', 'single') # 'single' or 'double'
    copies = max(1, int(setting.get('copies', 1)))
    paper_size = setting.get('paper_size', 'A4') # 'A4' or 'A3'
    paper_type = setting.get('paper_type', 'standard') # 'standard', 'premium', 'glossy'
    binding_type = setting.get('binding_type', 'none') # 'none', 'staple', 'spiral', 'hardbound'
    page_range = setting.get('page_range', 'all')

    pages_to_print = calculate_pages_from_range(page_range, total_pages_in_doc)

    # Base price per page depending on color & duplex
    if color_mode == 'color':
        base_rate = prices.get('color_double' if sides == 'double' else 'color_single', 8.0)
    else:
        base_rate = prices.get('bw_double' if sides == 'double' else 'bw_single', 2.0)

    # Paper size multiplier
    size_mult = prices.get('a3_multiplier', 2.0) if paper_size == 'A3' else 1.0
    adjusted_page_rate = round(base_rate * size_mult, 2)

    # Paper type surcharge (per sheet)
    # If duplex, 2 pages = 1 sheet
    sheets_per_copy = (pages_to_print + 1) // 2 if sides == 'double' else pages_to_print
    total_sheets = sheets_per_copy * copies

    paper_surcharge_unit = 0.0
    if paper_type == 'premium':
        paper_surcharge_unit = prices.get('paper_premium', 2.0)
    elif paper_type == 'glossy':
        paper_surcharge_unit = prices.get('paper_glossy', 5.0)

    total_paper_surcharge = round(paper_surcharge_unit * total_sheets, 2)

    # Binding cost (per copy)
    binding_unit = 0.0
    if binding_type == 'staple':
        binding_unit = prices.get('bind_staple', 5.0)
    elif binding_type == 'spiral':
        binding_unit = prices.get('bind_spiral', 30.0)
    elif binding_type == 'hardbound':
        binding_unit = prices.get('bind_hardbound', 150.0)

    total_binding_price = round(binding_unit * copies, 2)

    # Total print cost
    total_pages_billed = pages_to_print * copies
    print_subtotal = round(adjusted_page_rate * total_pages_billed, 2)
    total_price = round(print_subtotal + total_paper_surcharge + total_binding_price, 2)

    return {
        "pages_to_print": pages_to_print,
        "total_pages_billed": total_pages_billed,
        "sheets_count": total_sheets,
        "base_price_per_page": adjusted_page_rate,
        "color_surcharge": round((adjusted_page_rate - (prices.get('bw_single', 2.0) * size_mult)), 2) if color_mode == 'color' else 0.0,
        "paper_surcharge": total_paper_surcharge,
        "binding_price": total_binding_price,
        "total_price": total_price,
        "copies": copies,
        "color_mode": color_mode,
        "sides": sides,
        "paper_size": paper_size,
        "paper_type": paper_type,
        "binding_type": binding_type
    }
