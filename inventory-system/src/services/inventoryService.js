import { query } from './db.js';

export async function addInventoryItem(data) {
  const { 
    barcode_id, card_name, set_name, condition, purchase_price, front_label_price, notes,
    game = 'pokemon', card_type = 'raw', cert_number = null, card_number = null, image_url = null
  } = data;
  const rows = await query(
    `INSERT INTO inventory (barcode_id, card_name, set_name, game, card_type, cert_number, card_number, condition, purchase_price, purchase_date, front_label_price, status, notes, image_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now(), $10, 'IN_STOCK', $11, $12)
     RETURNING *`,
    [barcode_id, card_name, set_name, game, card_type, cert_number, card_number, condition, purchase_price, front_label_price, notes, image_url]
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
  const { barcode_id, card_name, set_name, game, card_type, cert_number, card_number, condition, purchase_price, front_label_price, notes, image_url, grade, grade_qualifier } = data;
  const rows = await query(
    `UPDATE inventory SET 
      barcode_id = COALESCE($1, barcode_id),
      card_name = COALESCE($2, card_name),
      set_name = COALESCE($3, set_name),
      game = COALESCE($4, game),
      card_type = COALESCE($5, card_type),
      cert_number = COALESCE($6, cert_number),
      card_number = COALESCE($7, card_number),
      condition = COALESCE($8, condition),
      purchase_price = COALESCE($9, purchase_price),
      front_label_price = COALESCE($10, front_label_price),
      notes = COALESCE($11, notes),
      image_url = COALESCE($12, image_url),
      grade = COALESCE($13, grade),
      grade_qualifier = COALESCE($14, grade_qualifier)
    WHERE id = $15
    RETURNING *`,
    [barcode_id, card_name, set_name, game, card_type, cert_number, card_number, condition, purchase_price, front_label_price, notes, image_url, grade, grade_qualifier, id]
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