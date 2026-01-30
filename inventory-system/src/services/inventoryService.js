import { query } from './db.js';

export async function addInventoryItem(data) {
  const { 
    barcode_id, card_name, set_name, series = null, condition, purchase_price, front_label_price, notes,
    game = 'pokemon', card_type = 'raw', cert_number = null, card_number = null, image_url = null,
    tcg_product_id = null
  } = data;
  const rows = await query(
    `INSERT INTO inventory (barcode_id, card_name, set_name, series, game, card_type, cert_number, card_number, condition, purchase_price, purchase_date, front_label_price, status, notes, image_url, tcg_product_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now(), $11, 'IN_STOCK', $12, $13, $14)
     RETURNING *`,
    [barcode_id, card_name, set_name, series, game, card_type, cert_number, card_number, condition, purchase_price, front_label_price, notes, image_url, tcg_product_id]
  );
  return rows[0];
}

export async function getInventoryByBarcode(barcode) {
  const rows = await query(`SELECT * FROM inventory WHERE barcode_id=$1`, [barcode]);
  return rows[0];
}

export async function getAllInventory() {
  const rows = await query(`SELECT * FROM inventory WHERE status = 'IN_STOCK' ORDER BY id DESC`);
  return rows;
}

export async function markAsSold(id, salePrice) {
  await query(`UPDATE inventory SET status='SOLD', sale_price=$1, sale_date=now() WHERE id=$2`, [salePrice, id]);
}

export async function updateInventoryItem(id, data) {
  const { barcode_id, card_name, set_name, series, game, card_type, cert_number, card_number, condition, purchase_price, front_label_price, notes, image_url, grade, grade_qualifier, tcg_product_id } = data;
  const rows = await query(
    `UPDATE inventory SET 
      barcode_id = COALESCE($1, barcode_id),
      card_name = COALESCE($2, card_name),
      set_name = COALESCE($3, set_name),
      series = COALESCE($4, series),
      game = COALESCE($5, game),
      card_type = COALESCE($6, card_type),
      cert_number = COALESCE($7, cert_number),
      card_number = COALESCE($8, card_number),
      condition = COALESCE($9, condition),
      purchase_price = COALESCE($10, purchase_price),
      front_label_price = COALESCE($11, front_label_price),
      notes = COALESCE($12, notes),
      image_url = COALESCE($13, image_url),
      grade = COALESCE($14, grade),
      grade_qualifier = COALESCE($15, grade_qualifier),
      tcg_product_id = COALESCE($16, tcg_product_id)
    WHERE id = $17
    RETURNING *`,
    [barcode_id, card_name, set_name, series, game, card_type, cert_number, card_number, condition, purchase_price, front_label_price, notes, image_url, grade, grade_qualifier, tcg_product_id, id]
  );
  return rows[0];
}

export async function recordDirectSale(inventoryId, salePrice, paymentMethod) {
  // Update inventory status
  await query(
    `UPDATE inventory SET status='SOLD', sale_price=$1, sale_date=now() WHERE id=$2`,
    [salePrice, inventoryId]
  );

  // Record transaction
  await query(
    `INSERT INTO transactions (inventory_id, sale_price, fees, net_amount, sale_date, payment_method)
     VALUES ($1, $2, 0, $2, now(), $3)`,
    [inventoryId, salePrice, paymentMethod]
  );

  // Return updated item
  const rows = await query(`SELECT * FROM inventory WHERE id=$1`, [inventoryId]);
  return rows[0];
}