-- ===========================================================================
-- FULFILLMENT QUERIES
-- SQL queries for the e-commerce fulfillment system
-- ===========================================================================

-- ===========================================================================
-- DRIVER QUERIES
-- ===========================================================================

-- name: CreateDriver :one
INSERT INTO drivers (
    employee_id, first_name, last_name, phone, email, 
    vehicle_type, vehicle_plate, is_active, max_daily_assignments
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
)
RETURNING *;

-- name: GetDriver :one
SELECT * FROM drivers WHERE id = $1 LIMIT 1;

-- name: GetDriverByEmployeeID :one
SELECT * FROM drivers WHERE employee_id = $1 LIMIT 1;

-- name: ListDrivers :many
SELECT 
    d.*,
    (SELECT COUNT(*) FROM driver_assignments da 
     WHERE da.driver_id = d.id AND da.status IN ('assigned', 'picked_up', 'in_progress')
    ) as active_assignments,
    (SELECT COUNT(*) FROM driver_assignments da 
     WHERE da.driver_id = d.id AND da.status = 'completed' 
     AND DATE(da.completed_at) = CURRENT_DATE
    ) as completed_today
FROM drivers d
ORDER BY d.created_at DESC
LIMIT $1 OFFSET $2;

-- name: ListActiveDrivers :many
SELECT * FROM drivers 
WHERE is_active = true 
ORDER BY current_workload ASC, created_at DESC;

-- name: GetActiveDriversByWorkload :many
SELECT * FROM drivers 
WHERE is_active = true 
  AND current_workload < max_daily_assignments
ORDER BY current_workload ASC
LIMIT $1;

-- name: UpdateDriver :one
UPDATE drivers SET
    first_name = $2,
    last_name = $3,
    phone = $4,
    email = $5,
    vehicle_type = $6,
    vehicle_plate = $7,
    is_active = $8,
    max_daily_assignments = $9,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: DeactivateDriver :exec
UPDATE drivers SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1;

-- name: IncrementDriverWorkload :exec
UPDATE drivers 
SET current_workload = current_workload + 1, updated_at = CURRENT_TIMESTAMP 
WHERE id = $1;

-- name: DecrementDriverWorkload :exec
UPDATE drivers 
SET current_workload = GREATEST(current_workload - 1, 0), updated_at = CURRENT_TIMESTAMP 
WHERE id = $1;

-- name: ResetAllDriverWorkloads :exec
UPDATE drivers SET current_workload = 0, updated_at = CURRENT_TIMESTAMP;

-- name: GetDriverWorkloadStats :one
SELECT 
    d.id,
    d.first_name,
    d.last_name,
    d.current_workload,
    d.max_daily_assignments,
    (SELECT COUNT(*) FROM driver_assignments da 
     WHERE da.driver_id = d.id AND da.status IN ('assigned', 'picked_up', 'in_progress')
    ) as pending_count,
    (SELECT COUNT(*) FROM driver_assignments da 
     WHERE da.driver_id = d.id AND da.status = 'completed' 
     AND DATE(da.completed_at) = CURRENT_DATE
    ) as completed_today,
    (SELECT COUNT(*) FROM driver_assignments da 
     WHERE da.driver_id = d.id AND da.assignment_type = 'delivery'
     AND da.status = 'completed'
    ) as total_deliveries,
    (SELECT COUNT(*) FROM driver_assignments da 
     WHERE da.driver_id = d.id AND da.assignment_type = 'return_pickup'
     AND da.status = 'completed'
    ) as total_pickups
FROM drivers d
WHERE d.id = $1;

-- ===========================================================================
-- FULFILLMENT ORDER QUERIES
-- ===========================================================================

-- name: CreateFulfillmentOrder :one
INSERT INTO fulfillment_orders (
    order_id, tracking_number, fulfillment_status, 
    delivery_address, delivery_phone, delivery_notes, notes
) VALUES (
    $1, generate_tracking_number(), $2, $3, $4, $5, $6
)
RETURNING *;

-- name: CreateFulfillmentOrderWithTracking :one
INSERT INTO fulfillment_orders (
    order_id, tracking_number, fulfillment_status, 
    delivery_address, delivery_phone, delivery_notes, notes
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
)
RETURNING *;

-- name: GetFulfillmentOrder :one
SELECT 
    fo.*,
    o.order_number,
    o.total_amount,
    o.payment_method,
    o.status as order_status,
    c.first_name as customer_first_name,
    c.last_name as customer_last_name,
    c.email as customer_email,
    c.phone as customer_phone,
    d.first_name as driver_first_name,
    d.last_name as driver_last_name,
    d.phone as driver_phone,
    d.vehicle_type,
    d.vehicle_plate,
    picker.first_name as picker_first_name,
    picker.last_name as picker_last_name,
    packer.first_name as packer_first_name,
    packer.last_name as packer_last_name
FROM fulfillment_orders fo
JOIN orders o ON fo.order_id = o.id
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN drivers d ON fo.driver_id = d.id
LEFT JOIN admin_users picker ON fo.picker_id = picker.id
LEFT JOIN admin_users packer ON fo.packer_id = packer.id
WHERE fo.id = $1
LIMIT 1;

-- name: GetFulfillmentOrderByOrderID :one
SELECT 
    fo.*,
    o.order_number,
    o.total_amount,
    o.status as order_status
FROM fulfillment_orders fo
JOIN orders o ON fo.order_id = o.id
WHERE fo.order_id = $1
LIMIT 1;

-- name: GetFulfillmentOrderByTracking :one
SELECT 
    fo.*,
    o.order_number,
    o.total_amount,
    o.payment_method,
    o.status as order_status,
    c.first_name as customer_first_name,
    c.last_name as customer_last_name,
    c.phone as customer_phone,
    d.first_name as driver_first_name,
    d.last_name as driver_last_name,
    d.phone as driver_phone
FROM fulfillment_orders fo
JOIN orders o ON fo.order_id = o.id
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN drivers d ON fo.driver_id = d.id
WHERE fo.tracking_number = $1
LIMIT 1;

-- name: ListFulfillmentOrders :many
SELECT 
    fo.*,
    o.order_number,
    o.total_amount,
    o.status as order_status,
    c.first_name as customer_first_name,
    c.last_name as customer_last_name,
    d.first_name as driver_first_name,
    d.last_name as driver_last_name
FROM fulfillment_orders fo
JOIN orders o ON fo.order_id = o.id
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN drivers d ON fo.driver_id = d.id
ORDER BY fo.created_at DESC
LIMIT $1 OFFSET $2;

-- name: ListFulfillmentOrdersByStatus :many
SELECT 
    fo.*,
    o.order_number,
    o.total_amount,
    c.first_name as customer_first_name,
    c.last_name as customer_last_name
FROM fulfillment_orders fo
JOIN orders o ON fo.order_id = o.id
LEFT JOIN customers c ON o.customer_id = c.id
WHERE fo.fulfillment_status = $1
ORDER BY fo.created_at ASC
LIMIT $2 OFFSET $3;

-- name: ListOrdersPendingPicking :many
SELECT 
    fo.*,
    o.order_number,
    o.total_amount,
    o.created_at as order_created_at,
    c.first_name as customer_first_name,
    c.last_name as customer_last_name,
    (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = fo.order_id) as item_count
FROM fulfillment_orders fo
JOIN orders o ON fo.order_id = o.id
LEFT JOIN customers c ON o.customer_id = c.id
WHERE fo.fulfillment_status = 'placed'
ORDER BY fo.created_at ASC
LIMIT $1 OFFSET $2;

-- name: ListOrdersPendingPacking :many
SELECT 
    fo.*,
    o.order_number,
    o.total_amount,
    c.first_name as customer_first_name,
    c.last_name as customer_last_name,
    (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = fo.order_id) as item_count
FROM fulfillment_orders fo
JOIN orders o ON fo.order_id = o.id
LEFT JOIN customers c ON o.customer_id = c.id
WHERE fo.fulfillment_status = 'picked'
ORDER BY fo.picked_at ASC
LIMIT $1 OFFSET $2;

-- name: UpdateFulfillmentStatus :one
UPDATE fulfillment_orders SET
    fulfillment_status = $2,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: UpdateFulfillmentPicker :one
UPDATE fulfillment_orders SET
    picker_id = $2,
    fulfillment_status = 'picking',
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: CompletePicking :one
UPDATE fulfillment_orders SET
    fulfillment_status = 'picked',
    picked_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: UpdateFulfillmentPacker :one
UPDATE fulfillment_orders SET
    packer_id = $2,
    fulfillment_status = 'packing',
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: CompletePacking :one
UPDATE fulfillment_orders SET
    fulfillment_status = 'packed',
    packed_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: AssignDriver :one
UPDATE fulfillment_orders SET
    driver_id = $2,
    fulfillment_status = 'awaiting_pickup',
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: MarkShipped :one
UPDATE fulfillment_orders SET
    fulfillment_status = 'in_transit',
    shipped_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: MarkDelivered :one
UPDATE fulfillment_orders SET
    fulfillment_status = 'delivered',
    delivered_at = CURRENT_TIMESTAMP,
    signature_url = $2,
    delivery_photo_url = $3,
    notes = COALESCE(notes || E'\n', '') || $4,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: MarkReturnRequested :one
UPDATE fulfillment_orders SET
    fulfillment_status = 'return_requested',
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- ===========================================================================
-- FULFILLMENT SCANS QUERIES
-- ===========================================================================

-- name: CreateFulfillmentScan :one
INSERT INTO fulfillment_scans (
    fulfillment_order_id, order_item_id, sku, scanned_by, scan_type, quantity_scanned
) VALUES (
    $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: GetFulfillmentScans :many
SELECT 
    fs.*,
    au.first_name as scanned_by_first_name,
    au.last_name as scanned_by_last_name
FROM fulfillment_scans fs
JOIN admin_users au ON fs.scanned_by = au.id
WHERE fs.fulfillment_order_id = $1
ORDER BY fs.scanned_at DESC;

-- name: GetScansByType :many
SELECT 
    fs.*,
    au.first_name as scanned_by_first_name,
    au.last_name as scanned_by_last_name
FROM fulfillment_scans fs
JOIN admin_users au ON fs.scanned_by = au.id
WHERE fs.fulfillment_order_id = $1 AND fs.scan_type = $2
ORDER BY fs.scanned_at DESC;

-- name: GetItemScanCount :one
SELECT 
    COALESCE(SUM(quantity_scanned), 0)::integer as total_scanned
FROM fulfillment_scans 
WHERE fulfillment_order_id = $1 
  AND order_item_id = $2 
  AND scan_type = $3;

-- name: GetOrderItemsWithScanStatus :many
SELECT 
    oi.id,
    oi.order_id,
    oi.variant_id,
    oi.quantity,
    oi.unit_price,
    oi.subtotal,
    pv.sku,
    p.title as product_name,
    CONCAT_WS(' / ', pv.size, pv.color)::text as variant_name,
    COALESCE(pv.image, p.thumbnail) as image_url,
    COALESCE(pick_scans.picked_qty, 0)::integer as picked_quantity,
    COALESCE(pack_scans.packed_qty, 0)::integer as packed_quantity,
    pick_scans.picked_at,
    pack_scans.packed_at
FROM order_items oi
LEFT JOIN product_variants pv ON oi.variant_id = pv.id
LEFT JOIN products p ON pv.product_id = p.id
LEFT JOIN LATERAL (
    SELECT SUM(quantity_scanned) as picked_qty, MAX(scanned_at) as picked_at
    FROM fulfillment_scans fs
    JOIN fulfillment_orders fo ON fs.fulfillment_order_id = fo.id
    WHERE fo.order_id = oi.order_id 
      AND fs.order_item_id = oi.id 
      AND fs.scan_type = 'pick'
) pick_scans ON true
LEFT JOIN LATERAL (
    SELECT SUM(quantity_scanned) as packed_qty, MAX(scanned_at) as packed_at
    FROM fulfillment_scans fs
    JOIN fulfillment_orders fo ON fs.fulfillment_order_id = fo.id
    WHERE fo.order_id = oi.order_id 
      AND fs.order_item_id = oi.id 
      AND fs.scan_type = 'pack'
) pack_scans ON true
WHERE oi.order_id = $1
ORDER BY oi.id;

-- ===========================================================================
-- DRIVER ASSIGNMENTS QUERIES
-- ===========================================================================

-- name: CreateDriverAssignment :one
INSERT INTO driver_assignments (
    driver_id, fulfillment_order_id, assignment_type, notes
) VALUES (
    $1, $2, $3, $4
)
RETURNING *;

-- name: GetDriverAssignment :one
SELECT 
    da.*,
    d.first_name as driver_first_name,
    d.last_name as driver_last_name,
    d.phone as driver_phone,
    d.vehicle_type,
    d.vehicle_plate,
    fo.tracking_number,
    fo.fulfillment_status,
    fo.delivery_address,
    fo.delivery_phone,
    o.order_number,
    o.total_amount
FROM driver_assignments da
JOIN drivers d ON da.driver_id = d.id
JOIN fulfillment_orders fo ON da.fulfillment_order_id = fo.id
JOIN orders o ON fo.order_id = o.id
WHERE da.id = $1
LIMIT 1;

-- name: ListDriverAssignments :many
SELECT 
    da.*,
    d.first_name as driver_first_name,
    d.last_name as driver_last_name,
    fo.tracking_number,
    fo.fulfillment_status,
    o.order_number
FROM driver_assignments da
JOIN drivers d ON da.driver_id = d.id
JOIN fulfillment_orders fo ON da.fulfillment_order_id = fo.id
JOIN orders o ON fo.order_id = o.id
WHERE da.driver_id = $1
ORDER BY da.assigned_at DESC
LIMIT $2 OFFSET $3;

-- name: ListActiveDriverAssignments :many
SELECT 
    da.*,
    fo.tracking_number,
    fo.fulfillment_status,
    fo.delivery_address,
    fo.delivery_phone,
    fo.delivery_notes,
    o.order_number,
    o.total_amount,
    c.first_name as customer_first_name,
    c.last_name as customer_last_name,
    c.phone as customer_phone
FROM driver_assignments da
JOIN fulfillment_orders fo ON da.fulfillment_order_id = fo.id
JOIN orders o ON fo.order_id = o.id
LEFT JOIN customers c ON o.customer_id = c.id
WHERE da.driver_id = $1 
  AND da.status IN ('assigned', 'picked_up', 'in_progress')
ORDER BY da.assigned_at ASC;

-- name: UpdateDriverAssignmentStatus :one
UPDATE driver_assignments SET
    status = $2,
    notes = COALESCE(notes || E'\n', '') || COALESCE($3, '')
WHERE id = $1
RETURNING *;

-- name: MarkAssignmentPickedUp :one
UPDATE driver_assignments SET
    status = 'picked_up',
    picked_up_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: CompleteDriverAssignment :one
UPDATE driver_assignments SET
    status = 'completed',
    completed_at = CURRENT_TIMESTAMP,
    notes = COALESCE(notes || E'\n', '') || COALESCE($2, '')
WHERE id = $1
RETURNING *;

-- name: FailDriverAssignment :one
UPDATE driver_assignments SET
    status = 'failed',
    completed_at = CURRENT_TIMESTAMP,
    failure_reason = $2,
    notes = COALESCE(notes || E'\n', '') || COALESCE($3, '')
WHERE id = $1
RETURNING *;

-- ===========================================================================
-- ORDER STATUS HISTORY QUERIES
-- ===========================================================================

-- name: CreateStatusHistory :one
INSERT INTO order_status_history (
    fulfillment_order_id, previous_status, new_status, 
    changed_by_admin, changed_by_driver, change_source, notes, metadata
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
)
RETURNING *;

-- name: GetStatusHistory :many
SELECT 
    osh.*,
    admin.first_name as admin_first_name,
    admin.last_name as admin_last_name,
    driver.first_name as driver_first_name,
    driver.last_name as driver_last_name
FROM order_status_history osh
LEFT JOIN admin_users admin ON osh.changed_by_admin = admin.id
LEFT JOIN drivers driver ON osh.changed_by_driver = driver.id
WHERE osh.fulfillment_order_id = $1
ORDER BY osh.created_at DESC;

-- ===========================================================================
-- RETURN REQUESTS QUERIES
-- ===========================================================================

-- name: CreateReturnRequest :one
INSERT INTO return_requests (
    fulfillment_order_id, reason, reason_category, description,
    pickup_address, pickup_phone, refund_amount, restock_items
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
)
RETURNING *;

-- name: GetReturnRequest :one
SELECT 
    rr.*,
    fo.tracking_number,
    fo.order_id,
    o.order_number,
    o.total_amount,
    c.first_name as customer_first_name,
    c.last_name as customer_last_name,
    c.email as customer_email,
    c.phone as customer_phone,
    d.first_name as driver_first_name,
    d.last_name as driver_last_name,
    d.phone as driver_phone
FROM return_requests rr
JOIN fulfillment_orders fo ON rr.fulfillment_order_id = fo.id
JOIN orders o ON fo.order_id = o.id
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN drivers d ON rr.pickup_driver_id = d.id
WHERE rr.id = $1
LIMIT 1;

-- name: ListReturnRequests :many
SELECT 
    rr.*,
    fo.tracking_number,
    o.order_number,
    c.first_name as customer_first_name,
    c.last_name as customer_last_name,
    d.first_name as driver_first_name,
    d.last_name as driver_last_name
FROM return_requests rr
JOIN fulfillment_orders fo ON rr.fulfillment_order_id = fo.id
JOIN orders o ON fo.order_id = o.id
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN drivers d ON rr.pickup_driver_id = d.id
ORDER BY rr.created_at DESC
LIMIT $1 OFFSET $2;

-- name: ListPendingReturnRequests :many
SELECT 
    rr.*,
    fo.tracking_number,
    o.order_number,
    c.first_name as customer_first_name,
    c.last_name as customer_last_name
FROM return_requests rr
JOIN fulfillment_orders fo ON rr.fulfillment_order_id = fo.id
JOIN orders o ON fo.order_id = o.id
LEFT JOIN customers c ON o.customer_id = c.id
WHERE rr.status IN ('requested', 'approved', 'pickup_scheduled')
ORDER BY rr.created_at ASC
LIMIT $1 OFFSET $2;

-- name: UpdateReturnStatus :one
UPDATE return_requests SET
    status = $2,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: ApproveReturn :one
UPDATE return_requests SET
    status = 'approved',
    approved_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: AssignReturnPickupDriver :one
UPDATE return_requests SET
    pickup_driver_id = $2,
    status = 'pickup_assigned',
    pickup_scheduled_at = $3,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: MarkReturnPickedUp :one
UPDATE return_requests SET
    status = 'picked_up',
    picked_up_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: MarkReturnReceived :one
UPDATE return_requests SET
    status = 'received',
    received_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: CompleteReturn :one
UPDATE return_requests SET
    status = 'completed',
    processed_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: CreateReturnItem :one
INSERT INTO return_items (
    return_request_id, order_item_id, quantity, condition, inspection_notes
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;

-- name: GetReturnItems :many
SELECT 
    ri.*,
    oi.variant_id,
    oi.unit_price,
    pv.sku,
    p.title as product_name,
    CONCAT_WS(' / ', pv.size, pv.color)::text as variant_name,
    COALESCE(pv.image, p.thumbnail) as image_url
FROM return_items ri
JOIN order_items oi ON ri.order_item_id = oi.id
LEFT JOIN product_variants pv ON oi.variant_id = pv.id
LEFT JOIN products p ON pv.product_id = p.id
WHERE ri.return_request_id = $1;

-- ===========================================================================
-- FULFILLMENT NOTIFICATIONS QUERIES
-- ===========================================================================

-- name: CreateFulfillmentNotification :one
INSERT INTO fulfillment_notifications (
    type, title, message, reference_type, reference_id, priority
) VALUES (
    $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: ListUnreadNotifications :many
SELECT * FROM fulfillment_notifications
WHERE is_read = false
ORDER BY 
    CASE priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'normal' THEN 3 
        WHEN 'low' THEN 4 
    END,
    created_at DESC
LIMIT $1 OFFSET $2;

-- name: MarkNotificationRead :one
UPDATE fulfillment_notifications SET
    is_read = true,
    read_by = $2,
    read_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- name: MarkAllNotificationsRead :exec
UPDATE fulfillment_notifications SET
    is_read = true,
    read_by = $1,
    read_at = CURRENT_TIMESTAMP
WHERE is_read = false;

-- ===========================================================================
-- FULFILLMENT STATS QUERIES
-- ===========================================================================

-- name: GetFulfillmentStats :one
SELECT 
    (SELECT COUNT(*) FROM fulfillment_orders WHERE fulfillment_status = 'placed') as pending_orders,
    (SELECT COUNT(*) FROM fulfillment_orders WHERE fulfillment_status IN ('picking', 'picked')) as in_picking,
    (SELECT COUNT(*) FROM fulfillment_orders WHERE fulfillment_status IN ('packing', 'packed')) as in_packing,
    (SELECT COUNT(*) FROM fulfillment_orders WHERE fulfillment_status IN ('awaiting_pickup', 'in_transit')) as in_transit,
    (SELECT COUNT(*) FROM fulfillment_orders WHERE fulfillment_status = 'delivered' AND DATE(delivered_at) = CURRENT_DATE) as delivered_today,
    (SELECT COUNT(*) FROM return_requests WHERE status IN ('requested', 'approved')) as pending_returns,
    (SELECT COUNT(*) FROM drivers WHERE is_active = true) as active_drivers,
    (SELECT COUNT(*) FROM driver_assignments WHERE status IN ('assigned', 'picked_up', 'in_progress')) as active_assignments;

-- name: GetDailyFulfillmentStats :many
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_orders,
    COUNT(*) FILTER (WHERE fulfillment_status = 'delivered') as delivered,
    COUNT(*) FILTER (WHERE fulfillment_status = 'cancelled') as cancelled,
    COUNT(*) FILTER (WHERE fulfillment_status = 'failed') as failed
FROM fulfillment_orders
WHERE created_at >= $1 AND created_at <= $2
GROUP BY DATE(created_at)
ORDER BY date DESC;
